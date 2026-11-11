-- Reorganiza las categorías según el negocio real:
--   Sublimación (antes "Tazas"), Papelería y Estampados textil (nueva).
-- Es repetible: se puede ejecutar más de una vez sin duplicar datos.

update public.categories
   set name = 'Sublimación',
       slug = 'sublimacion',
       description = 'Tazones, tazas mágicas, mugs térmicos y más, estampados por sublimación.',
       image_url = '/fotos/02-taza-personalizada.webp'
 where slug = 'tazas';

update public.categories
   set description = 'Cuadernos, agendas, stickers, tarjetas, imanes y calendarios.',
       image_url = '/fotos/05-papeleria.webp'
 where slug = 'papeleria';

insert into public.categories (name, slug, description, placeholder_art, position)
values ('Estampados textil', 'estampados-textil', 'Poleras, polerones y uniformes estampados.', 'tote', 3)
on conflict (slug) do nothing;

-- Fotos ilustrativas de otras categorías (solo si todavía no tienen imagen)
update public.categories set image_url = '/fotos/08-regalo-envuelto.webp' where slug = 'regalos-personalizados' and image_url is null;
update public.categories set image_url = '/fotos/07-stickers.webp' where slug = 'stickers' and image_url is null;
update public.categories set image_url = '/fotos/12-eventos.webp' where slug = 'eventos' and image_url is null;

-- Orden: las tres secciones del negocio primero
update public.categories set position = 1 where slug = 'sublimacion';
update public.categories set position = 2 where slug = 'papeleria';
update public.categories set position = 3 where slug = 'estampados-textil';
update public.categories set position = 4 where slug = 'regalos-personalizados';
update public.categories set position = 5 where slug = 'stickers';
update public.categories set position = 6 where slug = 'eventos';
update public.categories set position = 7 where slug = 'disenos-especiales';
