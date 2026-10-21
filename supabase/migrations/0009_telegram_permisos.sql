-- =============================================================================
-- 0009 · Permisos de lectura para el bot de Telegram (clave de servicio)
--
-- El bot responde /resumen, /pedidos, /cuentas y /stock leyendo estas tablas desde el
-- servidor con la clave de servicio. Es repetible y no toca datos.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select on public.orders, public.customers, public.order_items, public.products to service_role;
    grant select, update on public.instagram_signups to service_role;
  end if;
end $$;
