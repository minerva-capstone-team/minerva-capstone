-- Detalle del pago de Mercado Pago visible en el panel: tipo (crédito, débito, saldo...),
-- marca de la tarjeta, cuotas, últimos 4 dígitos y monto cobrado. Es repetible.
alter table public.orders add column if not exists payment_type text;
alter table public.orders add column if not exists payment_brand text;
alter table public.orders add column if not exists payment_installments integer;
alter table public.orders add column if not exists payment_card_last4 text;
alter table public.orders add column if not exists payment_amount integer;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant update (payment_type, payment_brand, payment_installments, payment_card_last4, payment_amount) on public.orders to service_role;
  end if;
end $$;
