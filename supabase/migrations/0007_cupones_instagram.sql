-- =============================================================================
-- 0007 · Cupones personales y por producto (cuentas creadas desde Instagram)
--
--  * coupons.email: cupón personal, solo vale si el pedido usa ese correo.
--  * coupons.product_id: el descuento se calcula solo sobre ese producto.
--  * coupon_eval(): una sola regla para cotizar (quote_checkout) y cobrar (create_order).
--  * my_coupons(): cupones vigentes de la clienta con sesión iniciada (/cuenta y checkout).
--  * instagram_signups: consentimiento y cuenta creada desde un DM (1 por persona).
-- Requiere 0006. Es repetible. Si vuelves a ejecutar 0004 o 0006, ejecuta 0007 después.
-- =============================================================================

alter table public.coupons add column if not exists email text check (email is null or email = lower(email));
alter table public.coupons add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.coupons add column if not exists source text not null default 'admin' check (source in ('admin', 'instagram'));
create index if not exists coupons_email_idx on public.coupons (email) where email is not null;

-- ---------------------------------------------------------------------------
-- Regla única de validación
-- p_lines: [{"product_id": uuid, "amount": int}] (precio × cantidad de cada ítem)
-- ---------------------------------------------------------------------------
create or replace function public.coupon_eval(p_code text, p_lines jsonb, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cp public.coupons%rowtype;
  v_sub int := 0;
  v_base int := 0;
  v_discount int;
begin
  select coalesce(sum((l ->> 'amount')::int), 0) into v_sub from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l;
  select * into cp from public.coupons where code = upper(trim(p_code));
  if not found or not cp.active
     or (cp.starts_at is not null and cp.starts_at > now())
     or (cp.expires_at is not null and cp.expires_at <= now())
     or (cp.max_uses is not null and cp.uses >= cp.max_uses) then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'Ese cupón no existe o ya no está disponible.');
  end if;
  if cp.email is not null and cp.email <> lower(trim(coalesce(p_email, ''))) then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'Este cupón es personal: usa el mismo correo de tu cuenta.');
  end if;
  if v_sub < cp.min_subtotal then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'Este cupón requiere una compra mínima de ' || public.clp_text(cp.min_subtotal) || '.');
  end if;
  if cp.product_id is not null then
    select coalesce(sum((l ->> 'amount')::int), 0) into v_base
      from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l
      where nullif(l ->> 'product_id', '')::uuid = cp.product_id;
    if v_base = 0 then
      return jsonb_build_object('valid', false, 'discount', 0, 'message',
        'Este cupón es para ' || coalesce((select name from public.products where id = cp.product_id), 'otro producto') || '. Agrégalo al carro para usarlo.');
    end if;
  else
    v_base := v_sub;
  end if;
  v_discount := case cp.kind when 'percent' then (v_base * cp.value) / 100 else least(cp.value, v_base) end;
  return jsonb_build_object('valid', true, 'discount', v_discount, 'message', 'Cupón aplicado: −' || public.clp_text(v_discount) || '.');
end $$;

revoke all on function public.coupon_eval(text, jsonb, text) from public;

-- ---------------------------------------------------------------------------
-- quote_checkout ahora recibe las líneas del carro y el correo
-- ---------------------------------------------------------------------------
drop function if exists public.quote_checkout(integer, text, text);
create or replace function public.quote_checkout(p_subtotal integer, p_region text, p_coupon text default null, p_lines jsonb default null, p_email text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.store_settings%rowtype;
  v_code text := upper(nullif(trim(coalesce(p_coupon, '')), ''));
  v_sub int := greatest(coalesce(p_subtotal, 0), 0);
  v_lines jsonb := coalesce(p_lines, jsonb_build_array(jsonb_build_object('product_id', '', 'amount', greatest(coalesce(p_subtotal, 0), 0))));
  v_eval jsonb;
  v_discount int := 0;
  v_valid boolean := null;
  v_msg text := null;
  v_ship jsonb;
begin
  select * into s from public.store_settings where id;
  if v_code is not null then
    v_eval := public.coupon_eval(v_code, v_lines, p_email);
    v_valid := (v_eval ->> 'valid')::boolean;
    v_discount := (v_eval ->> 'discount')::int;
    v_msg := v_eval ->> 'message';
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

revoke all on function public.quote_checkout(integer, text, text, jsonb, text) from public;
grant execute on function public.quote_checkout(integer, text, text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Mis cupones (clienta con sesión)
-- ---------------------------------------------------------------------------
create or replace function public.my_coupons()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', c.code, 'kind', c.kind, 'value', c.value, 'min_subtotal', c.min_subtotal,
    'expires_at', c.expires_at, 'product_id', c.product_id,
    'product_name', p.name, 'product_slug', p.slug
  ) order by c.expires_at nulls last), '[]'::jsonb)
  from public.coupons c
  left join public.products p on p.id = c.product_id
  where c.email is not null
    and c.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and c.active
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.uses < c.max_uses);
$$;

revoke all on function public.my_coupons() from public;
grant execute on function public.my_coupons() to authenticated;

-- ---------------------------------------------------------------------------
-- Cuentas creadas desde Instagram (las escribe solo el servidor con la clave de servicio)
-- ---------------------------------------------------------------------------
create table if not exists public.instagram_signups (
  id uuid primary key default gen_random_uuid(),
  sender_hash text not null unique,
  email text not null check (email = lower(email) and length(email) <= 160),
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'pendiente' check (status in ('pendiente', 'creada')),
  coupon_code text,
  new_account boolean,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create unique index if not exists instagram_signups_email_done on public.instagram_signups (email) where status = 'creada';

alter table public.instagram_signups enable row level security;
drop policy if exists "instagram signups admin read" on public.instagram_signups;
create policy "instagram signups admin read" on public.instagram_signups for select to authenticated using (public.is_admin());
grant select on public.instagram_signups to authenticated;

-- ---------------------------------------------------------------------------
-- create_order usa coupon_eval (cupón personal y por producto)
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
  v_lines jsonb := '[]'::jsonb;
  v_eval jsonb;
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
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id', p.id, 'amount', unit * qty));
  end loop;

  v_code := upper(nullif(trim(coalesce(payload ->> 'coupon', '')), ''));
  if v_code is not null then
    perform 1 from public.coupons where code = v_code for update;
    v_eval := public.coupon_eval(v_code, v_lines, v_email);
    if not (v_eval ->> 'valid')::boolean then
      raise exception 'coupon invalid';
    end if;
    v_discount := (v_eval ->> 'discount')::int;
    update public.coupons set uses = uses + 1 where code = v_code;
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
