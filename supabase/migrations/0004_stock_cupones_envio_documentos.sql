-- =============================================================================
-- 0004 · Stock confiable, cupones, envío por región y datos de boleta/factura
--
--  1. Stock: las reservas de pedidos sin pagar vencen y devuelven el stock;
--     cancelar un pedido repone stock (y el cupón); las variantes controlan su
--     propio stock; límite de pedidos pendientes por email (anti-abuso).
--  2. Cupones (porcentaje o monto fijo) validados y canjeados en el servidor.
--  3. Envío: tarifa por región editable + umbral de envío gratis.
--  4. Documento tributario: la clienta elige boleta o factura; los datos de
--     factura (RUT validado) quedan en el pedido. La emisión ante el SII la
--     hace un proveedor externo; aquí solo se registra número y enlace.
-- Es repetible: usa "if not exists" y "create or replace".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configuración de la tienda (una sola fila) y tarifas de envío
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  free_shipping_min integer check (free_shipping_min is null or free_shipping_min >= 0),
  reservation_hours integer not null default 48 check (reservation_hours between 1 and 720),
  max_pending_orders_per_email integer not null default 3 check (max_pending_orders_per_email between 1 and 50)
);
insert into public.store_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.shipping_rates (
  region text primary key,
  price integer check (price is null or price >= 0),
  note text
);

-- price = null significa "se coordina por WhatsApp" (no se suma al total).
-- Santiago: Paket publica una tarifa fija de $3.500 en todo Santiago; se puede editar en /admin/envios.
insert into public.shipping_rates (region, price, note) values
  ('Arica y Parinacota', null, null),
  ('Tarapacá', null, null),
  ('Antofagasta', null, null),
  ('Atacama', null, null),
  ('Coquimbo', null, null),
  ('Valparaíso', null, null),
  ('Metropolitana de Santiago', 3500, 'Tarifa fija publicada por Paket para Santiago'),
  ('Libertador General Bernardo O''Higgins', null, null),
  ('Maule', null, null),
  ('Ñuble', null, null),
  ('Biobío', null, null),
  ('La Araucanía', null, null),
  ('Los Ríos', null, null),
  ('Los Lagos', null, null),
  ('Aysén del General Carlos Ibáñez del Campo', null, null),
  ('Magallanes y de la Antártica Chilena', null, null)
on conflict (region) do nothing;

-- ---------------------------------------------------------------------------
-- Cupones
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

-- ---------------------------------------------------------------------------
-- Columnas nuevas en pedidos y sus ítems
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists subtotal integer;
alter table public.orders add column if not exists discount integer not null default 0;
alter table public.orders add column if not exists shipping_cost integer not null default 0;
alter table public.orders add column if not exists shipping_pending boolean not null default false;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists stock_restored boolean not null default false;
alter table public.orders add column if not exists document_type text not null default 'boleta'
  check (document_type in ('boleta', 'factura'));
alter table public.orders add column if not exists billing jsonb;
alter table public.orders add column if not exists document_number text check (document_number is null or char_length(document_number) <= 40);
alter table public.orders add column if not exists document_url text check (document_url is null or char_length(document_url) <= 500);
alter table public.orders add column if not exists document_issued_at timestamptz;

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS de las tablas nuevas
-- ---------------------------------------------------------------------------
alter table public.store_settings enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.coupons enable row level security;

drop policy if exists "store_settings public read" on public.store_settings;
create policy "store_settings public read" on public.store_settings for select using (true);
drop policy if exists "store_settings admin write" on public.store_settings;
create policy "store_settings admin write" on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "shipping_rates public read" on public.shipping_rates;
create policy "shipping_rates public read" on public.shipping_rates for select using (true);
drop policy if exists "shipping_rates admin write" on public.shipping_rates;
create policy "shipping_rates admin write" on public.shipping_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Los cupones NO se leen desde el navegador público: se validan con quote_checkout().
drop policy if exists "coupons admin all" on public.coupons;
create policy "coupons admin all" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.store_settings, public.shipping_rates to anon, authenticated;
grant insert, update, delete on public.store_settings, public.shipping_rates to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

-- Valida un RUT chileno (dígito verificador, módulo 11).
create or replace function public.rut_valid(p text)
returns boolean
language plpgsql
immutable
as $$
declare
  r text := upper(regexp_replace(coalesce(p, ''), '[^0-9kK]', '', 'g'));
  body text;
  dv text;
  acc int := 0;
  mul int := 2;
  i int;
  rest int;
  expected text;
begin
  if length(r) < 2 then return false; end if;
  body := substr(r, 1, length(r) - 1);
  dv := substr(r, length(r));
  if body !~ '^[0-9]+$' then return false; end if;
  for i in reverse length(body)..1 loop
    acc := acc + substr(body, i, 1)::int * mul;
    mul := case when mul = 7 then 2 else mul + 1 end;
  end loop;
  rest := 11 - (acc % 11);
  expected := case rest when 11 then '0' when 10 then 'K' else rest::text end;
  return dv = expected;
end $$;

create or replace function public.clp_text(n integer)
returns text language sql immutable as $$
  select '$' || replace(to_char(n, 'FM999,999,999,999'), ',', '.');
$$;

-- Costo de envío de una región (jsonb: cost, pending, free). base = subtotal ya con descuento.
create or replace function public.shipping_for(p_region text, p_base integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.store_settings%rowtype;
  rate public.shipping_rates%rowtype;
begin
  select * into s from public.store_settings where id;
  select * into rate from public.shipping_rates where region = left(trim(coalesce(p_region, '')), 80);
  if s.free_shipping_min is not null and p_base >= s.free_shipping_min then
    return jsonb_build_object('cost', 0, 'pending', false, 'free', true);
  end if;
  if not found or rate.price is null then
    return jsonb_build_object('cost', 0, 'pending', true, 'free', false);
  end if;
  return jsonb_build_object('cost', rate.price, 'pending', false, 'free', false);
end $$;

-- ---------------------------------------------------------------------------
-- Vista previa para el checkout: cupón + envío + total (solo informativa;
-- create_order vuelve a calcularlo todo con precios de la base de datos).
-- ---------------------------------------------------------------------------
create or replace function public.quote_checkout(p_subtotal integer, p_region text, p_coupon text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.store_settings%rowtype;
  cp public.coupons%rowtype;
  v_code text := upper(nullif(trim(coalesce(p_coupon, '')), ''));
  v_sub int := greatest(coalesce(p_subtotal, 0), 0);
  v_discount int := 0;
  v_valid boolean := null;
  v_msg text := null;
  v_ship jsonb;
begin
  select * into s from public.store_settings where id;

  if v_code is not null then
    select * into cp from public.coupons where code = v_code;
    if not found or not cp.active
       or (cp.starts_at is not null and cp.starts_at > now())
       or (cp.expires_at is not null and cp.expires_at <= now())
       or (cp.max_uses is not null and cp.uses >= cp.max_uses) then
      v_valid := false;
      v_msg := 'Ese cupón no existe o ya no está disponible.';
    elsif v_sub < cp.min_subtotal then
      v_valid := false;
      v_msg := 'Este cupón requiere una compra mínima de ' || public.clp_text(cp.min_subtotal) || '.';
    else
      v_valid := true;
      v_discount := case cp.kind when 'percent' then (v_sub * cp.value) / 100 else least(cp.value, v_sub) end;
      v_msg := 'Cupón aplicado: −' || public.clp_text(v_discount) || '.';
    end if;
  end if;

  v_ship := public.shipping_for(p_region, v_sub - v_discount);

  return jsonb_build_object(
    'coupon_valid', v_valid,
    'coupon_message', v_msg,
    'discount', v_discount,
    'shipping', (v_ship ->> 'cost')::int,
    'shipping_pending', (v_ship ->> 'pending')::boolean,
    'free_shipping', (v_ship ->> 'free')::boolean,
    'free_shipping_min', s.free_shipping_min,
    'total', v_sub - v_discount + (v_ship ->> 'cost')::int
  );
end $$;

revoke all on function public.quote_checkout(integer, text, text) from public;
grant execute on function public.quote_checkout(integer, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reservas vencidas: pedidos pendientes SIN pago más viejos que
-- store_settings.reservation_hours se cancelan y devuelven su stock.
-- Se ejecuta de forma perezosa al crear un pedido (no requiere pg_cron).
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hours int;
  n int := 0;
  o record;
begin
  select reservation_hours into hours from public.store_settings where id;
  for o in
    select id from public.orders
    where status = 'pendiente' and payment_status = 'pendiente'
      and created_at < now() - make_interval(hours => hours)
    order by created_at
    limit 50
    for update skip locked
  loop
    update public.orders
      set status = 'cancelado',
          notes = concat_ws(E'\n', notes, '[auto] Reserva vencida: no se registró el pago a tiempo.')
      where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.release_expired_orders() from public;

-- ---------------------------------------------------------------------------
-- Cancelar repone stock (y el cupón); reabrir vuelve a descontarlo.
-- ---------------------------------------------------------------------------
create or replace function public.orders_sync_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  it record;
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' and not old.stock_restored then
    for it in select product_id, variant_id, quantity from public.order_items where order_id = new.id loop
      if it.product_id is not null then
        update public.products set stock = stock + it.quantity where id = it.product_id;
      end if;
      if it.variant_id is not null then
        update public.product_variants
          set stock = case when stock is null then null else stock + it.quantity end
          where id = it.variant_id;
      end if;
    end loop;
    if new.coupon_code is not null then
      update public.coupons set uses = greatest(uses - 1, 0) where code = new.coupon_code;
    end if;
    new.stock_restored := true;

  elsif old.status = 'cancelado' and new.status <> 'cancelado' and old.stock_restored then
    for it in select product_id, variant_id, quantity from public.order_items where order_id = new.id loop
      if it.product_id is not null then
        update public.products set stock = stock - it.quantity where id = it.product_id and stock >= it.quantity;
        if not found then raise exception 'insufficient stock to reopen order'; end if;
      end if;
      if it.variant_id is not null then
        update public.product_variants
          set stock = case when stock is null then null else stock - it.quantity end
          where id = it.variant_id and (stock is null or stock >= it.quantity);
        if not found then raise exception 'insufficient stock to reopen order'; end if;
      end if;
    end loop;
    if new.coupon_code is not null then
      update public.coupons set uses = uses + 1 where code = new.coupon_code;
    end if;
    new.stock_restored := false;
  end if;
  return new;
end $$;

drop trigger if exists orders_sync_stock on public.orders;
create trigger orders_sync_stock before update of status on public.orders
for each row execute function public.orders_sync_stock();

-- ---------------------------------------------------------------------------
-- create_order: única vía para crear pedidos. Ahora también:
-- libera reservas vencidas, limita pedidos pendientes por email, controla
-- stock de variantes, aplica cupón y envío, y registra boleta/factura.
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

  insert into public.customers (user_id, first_name, last_name, email, phone, address, comuna, region)
  values (
    auth.uid(),
    left(trim(c ->> 'first_name'), 80), left(trim(c ->> 'last_name'), 80),
    v_email, left(trim(c ->> 'phone'), 30),
    left(trim(c ->> 'address'), 200), left(trim(c ->> 'comuna'), 80), left(trim(c ->> 'region'), 80)
  )
  returning id into v_customer_id;

  insert into public.orders (customer_id, total, payment_method, notes, document_type, billing)
  values (
    v_customer_id, 0,
    left(coalesce(nullif(payload ->> 'payment_method', ''), 'whatsapp'), 30),
    left(nullif(trim(c ->> 'notes'), ''), 1000),
    v_doc, v_billing
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
    'shipping_cost', (v_ship ->> 'cost')::int, 'shipping_pending', (v_ship ->> 'pending')::boolean
  );
end $$;

revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Datos para el email de confirmación (misma función de 0002, con totales nuevos).
-- ---------------------------------------------------------------------------
create or replace function public.claim_order_email(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
begin
  update public.orders
    set confirmation_email_sent_at = now()
    where id = p_order_id
      and confirmation_email_sent_at is null
      and created_at > now() - interval '15 minutes'
    returning * into v_order;
  if not found then return null; end if;

  select * into v_customer from public.customers where id = v_order.customer_id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'total', v_order.total,
    'subtotal', coalesce(v_order.subtotal, v_order.total),
    'discount', v_order.discount,
    'shipping_cost', v_order.shipping_cost,
    'shipping_pending', v_order.shipping_pending,
    'coupon_code', v_order.coupon_code,
    'document_type', v_order.document_type,
    'billing', v_order.billing,
    'payment_method', v_order.payment_method,
    'notes', v_order.notes,
    'customer', jsonb_build_object(
      'first_name', v_customer.first_name, 'last_name', v_customer.last_name,
      'email', v_customer.email, 'phone', v_customer.phone,
      'address', v_customer.address, 'comuna', v_customer.comuna, 'region', v_customer.region
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.product_name, 'variant', i.variant_name,
        'quantity', i.quantity, 'unit_price', i.unit_price,
        'customized', i.customization_data is not null and jsonb_typeof(i.customization_data) = 'object'
      ))
      from public.order_items i where i.order_id = v_order.id
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.claim_order_email(uuid) from public;
grant execute on function public.claim_order_email(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seguimiento público: ahora también totales y documento (sin datos de contacto).
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
