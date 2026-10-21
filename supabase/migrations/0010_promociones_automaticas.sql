-- =============================================================================
-- 0010 · Promociones automáticas
--
--  * Liquidación por bajo stock: cuando un producto queda con pocas unidades, su precio
--    baja solo (porcentaje y umbral configurables) y vuelve a la normalidad al reponer.
--  * Campaña por fecha especial: los productos elegidos tienen precio especial (o solo
--    se destacan, si el porcentaje es 0) entre dos fechas.
--  * promo_info(producto): devuelve la promoción vigente (o null). La tienda la lee como
--    columna calculada y create_order cobra con promo_unit_price(): el precio que se ve
--    es el que se cobra.
-- Todo se ajusta en /admin/promociones. Requiere 0007. Es repetible.
-- Si vuelves a ejecutar 0004, 0006 o 0007, ejecuta 0010 después (reemplaza create_order).
-- =============================================================================

create table if not exists public.promo_settings (
  id boolean primary key default true check (id),
  low_stock_enabled boolean not null default false,
  low_stock_threshold integer not null default 3 check (low_stock_threshold between 1 and 50),
  low_stock_percent integer not null default 15 check (low_stock_percent between 1 and 70),
  low_stock_skip_custom boolean not null default false,
  season_enabled boolean not null default false,
  season_name text check (season_name is null or length(season_name) <= 60),
  season_percent integer not null default 10 check (season_percent between 0 and 70),
  season_starts_at timestamptz,
  season_ends_at timestamptz,
  season_product_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (season_ends_at is null or season_starts_at is null or season_ends_at > season_starts_at)
);
insert into public.promo_settings (id) values (true) on conflict (id) do nothing;

alter table public.promo_settings enable row level security;
-- La configuración no es secreta: la tienda la usa para mostrar la campaña vigente.
drop policy if exists "promo settings public read" on public.promo_settings;
create policy "promo settings public read" on public.promo_settings for select to anon, authenticated using (true);
drop policy if exists "promo settings admin write" on public.promo_settings;
create policy "promo settings admin write" on public.promo_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.promo_settings to anon, authenticated;
grant update on public.promo_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Promoción vigente de un producto (null si no tiene). Gana el mayor descuento.
-- ---------------------------------------------------------------------------
create or replace function public.promo_info(p public.products)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (select * from public.promo_settings where id),
  c as (
    select 'temporada'::text as kind, s.season_percent as pct, coalesce(nullif(trim(s.season_name), ''), 'Campaña especial') as label, s.season_ends_at as ends_at
      from s
     where s.season_enabled and p.active and p.stock > 0
       and p.id = any (s.season_product_ids)
       and (s.season_starts_at is null or s.season_starts_at <= now())
       and (s.season_ends_at is null or s.season_ends_at > now())
    union all
    select 'stock', s.low_stock_percent, 'Últimas unidades', null::timestamptz
      from s
     where s.low_stock_enabled and p.active and p.stock > 0 and p.stock <= s.low_stock_threshold
       and not (s.low_stock_skip_custom and p.customizable)
  )
  select jsonb_build_object(
           'kind', kind, 'percent', pct, 'label', label, 'ends_at', ends_at,
           'price', greatest(1, (p.price * (100 - pct)) / 100)
         )
    from c
   order by pct desc, kind
   limit 1;
$$;

create or replace function public.promo_unit_price(p public.products)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public.promo_info(p) ->> 'price')::integer, p.price);
$$;

grant execute on function public.promo_info(public.products) to anon, authenticated;
revoke all on function public.promo_unit_price(public.products) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.promo_settings to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- create_order cobra con el precio promocional (mismo cálculo que ve la tienda)
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

    unit := public.promo_unit_price(p);
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
