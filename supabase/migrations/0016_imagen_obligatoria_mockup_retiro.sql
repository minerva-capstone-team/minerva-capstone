-- 1) Productos: imagen obligatoria del cliente y foto base para la vista previa
alter table public.products add column if not exists requires_image boolean not null default false;
alter table public.products add column if not exists mockup_url text;
update public.products set requires_image = true
 where slug in ('tazon-magico', 'cuadro-tipo-piedra-19x14-cm', 'placa-mascotas', 'fotografias-10x14-cm-100-unid', 'fotografias-13x18-cm-100-unid', 'calendario-polaroid-10x14-cm', 'mini-calendario-imantado-7x12-cm-100-unid');

-- 2) Retiro en tienda configurable desde el panel (Envíos)
alter table public.store_settings add column if not exists pickup_enabled boolean not null default true;
alter table public.store_settings add column if not exists pickup_address text not null default 'Rodolfo Jaramillo 2723, Padre Hurtado';
alter table public.store_settings add column if not exists pickup_note text;

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
  if lower(trim(coalesce(p_region, ''))) = 'retiro en tienda' and coalesce(s.pickup_enabled, true) then
    return jsonb_build_object('cost', 0, 'pending', false, 'free', true, 'pickup', true);
  end if;
  select * into rate from public.shipping_rates where region = left(trim(coalesce(p_region, '')), 80);
  if s.free_shipping_min is not null and p_base >= s.free_shipping_min then
    return jsonb_build_object('cost', 0, 'pending', false, 'free', true);
  end if;
  if not found or rate.price is null then
    return jsonb_build_object('cost', 0, 'pending', true, 'free', false);
  end if;
  return jsonb_build_object('cost', rate.price, 'pending', false, 'free', false);
end $$;

-- 3) El panel puede eliminar solicitudes de cuenta de Instagram
drop policy if exists "instagram signups admin delete" on public.instagram_signups;
create policy "instagram signups admin delete" on public.instagram_signups for delete to authenticated using (public.is_admin());
grant delete on public.instagram_signups to authenticated;
