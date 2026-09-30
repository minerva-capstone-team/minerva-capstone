-- ---------------------------------------------------------------------------
-- Notificaciones push a la app del admin cuando entra un pedido nuevo.
--
-- Cada dispositivo del admin guarda su suscripción (RLS: solo la del propio
-- admin). Al crearse un pedido, /api/order-email llama a claim_order_push():
-- entrega las suscripciones UNA sola vez y solo durante 15 minutos, igual que
-- claim_order_email. Sin la clave privada VAPID (solo en el servidor) los datos
-- de una suscripción no permiten enviar notificaciones.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push own admin" on public.push_subscriptions;
create policy "push own admin" on public.push_subscriptions for all to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.orders add column if not exists push_sent_at timestamptz;

create or replace function public.claim_order_push(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_name text;
begin
  update public.orders
    set push_sent_at = now()
    where id = p_order_id
      and push_sent_at is null
      and created_at > now() - interval '15 minutes'
    returning * into v_order;
  if not found then return null; end if;

  select first_name || ' ' || last_name into v_name from public.customers where id = v_order.customer_id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'total', v_order.total,
    'customer', v_name,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
      from public.push_subscriptions
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.claim_order_push(uuid) from public;
grant execute on function public.claim_order_push(uuid) to anon, authenticated;

-- Limpieza de suscripciones muertas (el servicio push respondió 404/410).
create or replace function public.drop_push_endpoint(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.drop_push_endpoint(text) from public;
grant execute on function public.drop_push_endpoint(text) to anon, authenticated;
