-- ---------------------------------------------------------------------------
-- Seguimiento de pedidos (página pública /seguimiento) + código de Paket.
--
-- Los números de pedido son correlativos (MIN-1001, MIN-1002…), así que NO se
-- pueden consultar solo con el número: track_order exige número + email de la
-- compra y devuelve únicamente lo necesario para mostrar el estado (sin
-- teléfono, dirección ni imágenes de personalización).
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists tracking_code text
  check (tracking_code is null or char_length(tracking_code) <= 60);

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
