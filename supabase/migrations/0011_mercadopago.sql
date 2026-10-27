-- =============================================================================
-- 0011 · Pagos con Mercado Pago
--
-- Guarda con qué y cuándo se pagó cada pedido. El webhook (/api/payments/mercadopago/webhook)
-- lo marca pagado con la clave de servicio, solo después de confirmar el pago en la API de
-- Mercado Pago. Es repetible.
-- =============================================================================
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_ref text;
alter table public.orders add column if not exists paid_at timestamptz;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select on public.orders, public.customers, public.store_settings to service_role;
    grant update (status, payment_status, payment_provider, payment_ref, paid_at) on public.orders to service_role;
  end if;
end $$;
