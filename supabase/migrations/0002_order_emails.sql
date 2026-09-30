-- ---------------------------------------------------------------------------
-- Email de confirmación de pedido (Resend).
-- claim_order_email: entrega los datos del pedido UNA sola vez y solo durante
-- los primeros 15 minutos, para que /api/order-email no pueda usarse para
-- reenviar correos ni leer pedidos ajenos.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists confirmation_email_sent_at timestamptz;

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
