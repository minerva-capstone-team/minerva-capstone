-- Opción de entrega "Retiro en tienda" (gratis).
-- El checkout envía la región 'Retiro en tienda' cuando el cliente elige retirar en el taller:
-- el envío queda en $0 y no se coordina despacho. Para cualquier otra región se mantiene la tarifa.
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
  if lower(trim(coalesce(p_region, ''))) = 'retiro en tienda' then
    return jsonb_build_object('cost', 0, 'pending', false, 'free', true, 'pickup', true);
  end if;
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
