-- Productos "solo cotización": se muestran en la tienda pero no se pueden comprar
-- (precio a convenir; el cliente escribe por WhatsApp). Es repetible.
alter table public.products add column if not exists quote_only boolean not null default false;

-- Lo textil se cotiza siempre
update public.products p set quote_only = true
  from public.categories c
 where p.category_id = c.id and c.slug = 'estampados-textil';

-- Seguridad en el servidor: aunque alguien lo intente, no se pueden crear pedidos con estos productos.
create or replace function public.block_quote_only_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_id is not null and exists (select 1 from public.products where id = new.product_id and quote_only) then
    raise exception 'product requires quote';
  end if;
  return new;
end $$;

drop trigger if exists order_items_block_quote_only on public.order_items;
create trigger order_items_block_quote_only before insert on public.order_items
  for each row execute function public.block_quote_only_items();

-- URL de productos: al cambiar el slug en el panel se recuerda el anterior, para redirigir
-- los enlaces viejos (Instagram, WhatsApp, Google) a la URL nueva.
alter table public.products add column if not exists old_slugs text[] not null default '{}';

create or replace function public.remember_old_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is distinct from old.slug then
    new.old_slugs := array_append(array_remove(coalesce(new.old_slugs, '{}'), old.slug), old.slug);
    new.old_slugs := array_remove(new.old_slugs, new.slug);
  end if;
  return new;
end $$;

drop trigger if exists products_remember_old_slug on public.products;
create trigger products_remember_old_slug before update of slug on public.products
  for each row execute function public.remember_old_slug();
