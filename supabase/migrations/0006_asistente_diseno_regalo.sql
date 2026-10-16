-- =============================================================================
-- 0006 · Asistente (preguntas), aprobación de diseño y regalo con mensaje secreto
--
--  1. assistant_messages: preguntas que reciben los asistentes de Instagram y de
--     la web, para el panel "Lo que preguntan". Las escribe solo el servidor
--     (clave de servicio); el admin las lee. Se guardan 90 días.
--  2. design_proofs: la tienda sube una prueba del diseño personalizado y la
--     clienta la aprueba o pide cambios desde /seguimiento (número + email).
--  3. Regalo con mensaje secreto: create_order guarda el mensaje y un código;
--     open_gift() lo muestra en /regalo/[código] (tarjeta con QR).
-- Es repetible: usa "if not exists" y "create or replace".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Preguntas a los asistentes
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('instagram', 'web')),
  sender_hash text not null check (char_length(sender_hash) <= 64),
  question text not null check (char_length(question) <= 1000),
  reply text check (reply is null or char_length(reply) <= 2000),
  products text[] not null default '{}',
  fallback boolean not null default false,
  latency_ms integer
);
create index if not exists assistant_messages_created_idx on public.assistant_messages(created_at desc);

alter table public.assistant_messages enable row level security;
drop policy if exists "assistant_messages admin read" on public.assistant_messages;
create policy "assistant_messages admin read" on public.assistant_messages for select to authenticated using (public.is_admin());
drop policy if exists "assistant_messages admin delete" on public.assistant_messages;
create policy "assistant_messages admin delete" on public.assistant_messages for delete to authenticated using (public.is_admin());
grant select, delete on public.assistant_messages to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Aprobación de diseño
-- ---------------------------------------------------------------------------
create table if not exists public.design_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null default 1,
  image_url text not null check (char_length(image_url) <= 600),
  image_path text check (image_path is null or char_length(image_path) <= 300),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'cambios', 'reemplazado')),
  customer_comment text check (customer_comment is null or char_length(customer_comment) <= 1000),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists design_proofs_order_idx on public.design_proofs(order_id, version desc);

alter table public.design_proofs enable row level security;
drop policy if exists "design_proofs admin all" on public.design_proofs;
create policy "design_proofs admin all" on public.design_proofs for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.design_proofs to authenticated;

-- Numera las versiones y deja como "reemplazada" la prueba pendiente anterior.
create or replace function public.design_proofs_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.version := coalesce((select max(version) from public.design_proofs where order_id = new.order_id), 0) + 1;
  new.status := 'pendiente';
  new.customer_comment := null;
  new.responded_at := null;
  update public.design_proofs set status = 'reemplazado'
    where order_id = new.order_id and status = 'pendiente';
  return new;
end $$;

drop trigger if exists design_proofs_before_insert on public.design_proofs;
create trigger design_proofs_before_insert before insert on public.design_proofs
for each row execute function public.design_proofs_before_insert();

-- La clienta responde desde /seguimiento: exige número de pedido + email de la compra.
create or replace function public.respond_design_proof(p_order_number text, p_email text, p_proof_id uuid, p_approve boolean, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_comment text := left(nullif(trim(coalesce(p_comment, '')), ''), 1000);
  v_status text;
begin
  select o.id into v_order_id
    from public.orders o join public.customers c on c.id = o.customer_id
    where o.order_number = upper(trim(p_order_number)) and lower(c.email) = lower(trim(p_email));
  if not found then raise exception 'order not found'; end if;
  if not p_approve and v_comment is null then raise exception 'comment required'; end if;

  update public.design_proofs
    set status = case when p_approve then 'aprobado' else 'cambios' end,
        customer_comment = v_comment,
        responded_at = now()
    where id = p_proof_id and order_id = v_order_id and status = 'pendiente'
    returning status into v_status;
  if not found then raise exception 'proof not pending'; end if;
  return jsonb_build_object('status', v_status);
end $$;

revoke all on function public.respond_design_proof(text, text, uuid, boolean, text) from public;
grant execute on function public.respond_design_proof(text, text, uuid, boolean, text) to anon, authenticated;

-- Imágenes de las pruebas: lectura pública por URL (rutas aleatorias), escritura solo admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-proofs', 'design-proofs', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "design proofs admin insert" on storage.objects;
create policy "design proofs admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'design-proofs' and public.is_admin());
drop policy if exists "design proofs admin update" on storage.objects;
create policy "design proofs admin update" on storage.objects for update to authenticated
  using (bucket_id = 'design-proofs' and public.is_admin());
drop policy if exists "design proofs admin delete" on storage.objects;
create policy "design proofs admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'design-proofs' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Regalo con mensaje secreto
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists gift_message text check (gift_message is null or char_length(gift_message) <= 500);
alter table public.orders add column if not exists gift_from text check (gift_from is null or char_length(gift_from) <= 80);
alter table public.orders add column if not exists gift_code text unique;
alter table public.orders add column if not exists gift_opened_at timestamptz;

-- Muestra el mensaje a quien escanea el QR. Solo entrega lo que se escribió para el regalo
-- y el nombre de los productos (nunca datos de contacto ni precios).
create or replace function public.open_gift(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_first boolean;
begin
  select * into v_order from public.orders
    where gift_code = upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g'))
      and status <> 'cancelado';
  if not found then return null; end if;
  v_first := v_order.gift_opened_at is null;
  if v_first then
    update public.orders set gift_opened_at = now() where id = v_order.id;
  end if;
  return jsonb_build_object(
    'message', v_order.gift_message,
    'from', v_order.gift_from,
    'first_time', v_first,
    'items', coalesce((select jsonb_agg(i.product_name order by i.product_name) from public.order_items i where i.order_id = v_order.id), '[]'::jsonb)
  );
end $$;

revoke all on function public.open_gift(text) from public;
grant execute on function public.open_gift(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_order (misma función de 0004 + datos del regalo)
-- ---------------------------------------------------------------------------
create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := payload -> 'customer';
  item jsonb;
  s public.store_settings%rowtype;
  p public.products%rowtype;
  v public.product_variants%rowtype;
  cp public.coupons%rowtype;
  qty int;
  unit int;
  v_email text;
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_item_id uuid;
  v_subtotal int := 0;
  v_discount int := 0;
  v_code text;
  v_ship jsonb;
  v_doc text;
  v_billing jsonb := null;
  v_total int;
  v_gift_msg text;
  v_gift_from text;
  v_gift_code text;
begin
  perform public.release_expired_orders();
  select * into s from public.store_settings where id;

  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'empty order';
  end if;
  if jsonb_array_length(payload -> 'items') > 50 then
    raise exception 'too many items';
  end if;
  if coalesce(trim(c ->> 'email'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  v_email := lower(left(trim(c ->> 'email'), 160));

  if (
    select count(*) from public.orders o join public.customers cu on cu.id = o.customer_id
    where lower(cu.email) = v_email and o.status = 'pendiente' and o.payment_status = 'pendiente'
      and o.created_at > now() - interval '24 hours'
  ) >= s.max_pending_orders_per_email then
    raise exception 'too many pending orders';
  end if;

  v_doc := coalesce(nullif(payload ->> 'document_type', ''), 'boleta');
  if v_doc not in ('boleta', 'factura') then raise exception 'invalid document'; end if;
  if v_doc = 'factura' then
    v_billing := jsonb_build_object(
      'rut', left(trim(coalesce(payload -> 'billing' ->> 'rut', '')), 20),
      'razon_social', left(trim(coalesce(payload -> 'billing' ->> 'razon_social', '')), 120),
      'giro', left(trim(coalesce(payload -> 'billing' ->> 'giro', '')), 120),
      'direccion', left(trim(coalesce(payload -> 'billing' ->> 'direccion', '')), 200)
    );
    if not public.rut_valid(v_billing ->> 'rut')
       or coalesce(v_billing ->> 'razon_social', '') = ''
       or coalesce(v_billing ->> 'giro', '') = ''
       or coalesce(v_billing ->> 'direccion', '') = '' then
      raise exception 'invalid billing';
    end if;
  end if;

  v_gift_msg := left(nullif(trim(coalesce(payload -> 'gift' ->> 'message', '')), ''), 500);
  v_gift_from := left(nullif(trim(coalesce(payload -> 'gift' ->> 'from', '')), ''), 80);
  if v_gift_msg is not null then
    v_gift_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  else
    v_gift_from := null;
  end if;

  insert into public.customers (user_id, first_name, last_name, email, phone, address, comuna, region)
  values (
    auth.uid(),
    left(trim(c ->> 'first_name'), 80), left(trim(c ->> 'last_name'), 80),
    v_email, left(trim(c ->> 'phone'), 30),
    left(trim(c ->> 'address'), 200), left(trim(c ->> 'comuna'), 80), left(trim(c ->> 'region'), 80)
  )
  returning id into v_customer_id;

  insert into public.orders (customer_id, total, payment_method, notes, document_type, billing, gift_message, gift_from, gift_code)
  values (
    v_customer_id, 0,
    left(coalesce(nullif(payload ->> 'payment_method', ''), 'whatsapp'), 30),
    left(nullif(trim(c ->> 'notes'), ''), 1000),
    v_doc, v_billing, v_gift_msg, v_gift_from, v_gift_code
  )
  returning * into v_order;

  for item in select * from jsonb_array_elements(payload -> 'items') loop
    qty := greatest(1, least(99, (item ->> 'quantity')::int));

    select * into p from public.products
      where id = (item ->> 'product_id')::uuid and active
      for update;
    if not found then raise exception 'product unavailable'; end if;
    if p.stock < qty then raise exception 'insufficient stock for %', p.name; end if;

    unit := p.price;
    v := null;
    if nullif(item ->> 'variant_id', '') is not null then
      select * into v from public.product_variants
        where id = (item ->> 'variant_id')::uuid and product_id = p.id
        for update;
      if not found then raise exception 'product variant unavailable'; end if;
      if v.stock is not null and v.stock < qty then
        raise exception 'insufficient stock for % (%)', p.name, v.name;
      end if;
      unit := unit + v.price_delta;
    end if;

    update public.products set stock = stock - qty where id = p.id;
    if v.id is not null and v.stock is not null then
      update public.product_variants set stock = stock - qty where id = v.id;
    end if;

    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, customization_data)
    values (v_order.id, p.id, v.id, p.name, v.name, qty, unit, item -> 'customization')
    returning id into v_item_id;

    if jsonb_typeof(item -> 'customization') = 'object' then
      insert into public.customizations (order_item_id, text, name, image_path, data)
      values (
        v_item_id,
        left(item -> 'customization' ->> 'text', 200),
        left(item -> 'customization' ->> 'name', 80),
        left(item -> 'customization' ->> 'image_path', 300),
        item -> 'customization'
      );
    end if;

    v_subtotal := v_subtotal + unit * qty;
  end loop;

  v_code := upper(nullif(trim(coalesce(payload ->> 'coupon', '')), ''));
  if v_code is not null then
    select * into cp from public.coupons where code = v_code for update;
    if not found or not cp.active
       or (cp.starts_at is not null and cp.starts_at > now())
       or (cp.expires_at is not null and cp.expires_at <= now())
       or (cp.max_uses is not null and cp.uses >= cp.max_uses)
       or v_subtotal < cp.min_subtotal then
      raise exception 'coupon invalid';
    end if;
    v_discount := case cp.kind when 'percent' then (v_subtotal * cp.value) / 100 else least(cp.value, v_subtotal) end;
    update public.coupons set uses = uses + 1 where id = cp.id;
  end if;

  v_ship := public.shipping_for(c ->> 'region', v_subtotal - v_discount);
  v_total := v_subtotal - v_discount + (v_ship ->> 'cost')::int;

  update public.orders
    set subtotal = v_subtotal, discount = v_discount, shipping_cost = (v_ship ->> 'cost')::int,
        shipping_pending = (v_ship ->> 'pending')::boolean, coupon_code = v_code, total = v_total
    where id = v_order.id;

  return jsonb_build_object(
    'id', v_order.id, 'order_number', v_order.order_number, 'total', v_total,
    'subtotal', v_subtotal, 'discount', v_discount,
    'shipping_cost', (v_ship ->> 'cost')::int, 'shipping_pending', (v_ship ->> 'pending')::boolean,
    'gift_code', v_gift_code
  );
end $$;

revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- track_order (misma función de 0004 + prueba de diseño y marca de regalo)
-- ---------------------------------------------------------------------------
create or replace function public.track_order(p_order_number text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'created_at', o.created_at,
    'status', o.status,
    'payment_status', o.payment_status,
    'delivery_status', o.delivery_status,
    'tracking_code', o.tracking_code,
    'total', o.total,
    'subtotal', coalesce(o.subtotal, o.total),
    'discount', o.discount,
    'shipping_cost', o.shipping_cost,
    'shipping_pending', o.shipping_pending,
    'document_type', o.document_type,
    'document_number', o.document_number,
    'document_url', o.document_url,
    'gift', o.gift_code is not null,
    'proof', (
      select jsonb_build_object(
        'id', p.id, 'version', p.version, 'image_url', p.image_url, 'note', p.note,
        'status', p.status, 'customer_comment', p.customer_comment, 'created_at', p.created_at
      )
      from public.design_proofs p
      where p.order_id = o.id and p.status <> 'reemplazado'
      order by p.version desc limit 1
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.product_name, 'variant', i.variant_name, 'quantity', i.quantity
      ))
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.order_number = upper(trim(p_order_number))
    and lower(c.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
