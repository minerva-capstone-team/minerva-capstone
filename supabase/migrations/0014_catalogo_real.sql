-- Catálogo real de Minerva (lista enviada por el equipo).
-- Tres secciones: Sublimación, Papelería y Estampado textil y corporativo.
-- Estampado textil se cotiza por WhatsApp (sin precios), por eso no tiene productos con carrito.
-- Es repetible: se puede ejecutar más de una vez.

-- 0) Columna del menú desplegable (por si la migración 0013 no se ejecutó)
alter table public.categories add column if not exists show_in_menu boolean not null default true;

-- 1) Categorías
update public.categories
   set name = 'Estampado textil y corporativo',
       description = 'Poleras, polerones, buzos, indumentaria deportiva y uniformes corporativos.'
 where slug = 'estampados-textil';
update public.categories
   set description = 'Tazones, mugs, botellas, cojines y más, personalizados por sublimación.'
 where slug = 'sublimacion';
update public.categories
   set description = 'Calendarios, cuadernos, agendas, tarjetas, fotografías y más.'
 where slug = 'papeleria';

-- 2) Productos de ejemplo anteriores: se borran los que no tienen pedidos ni cupones asociados;
--    los demás se desactivan para no perder el historial.
delete from public.products p
 where p.slug in ('taza-personalizada-dia-del-papa', 'taza-magica-con-foto', 'taza-lettering-con-nombre', 'cuaderno-personalizado-a5', 'agenda-2027-con-tu-nombre', 'set-de-stickers-personalizados', 'stickers-para-emprendedores', 'tote-bag-estampada', 'botella-de-aluminio-personalizada', 'kit-de-cumpleanos-personalizado', 'invitaciones-impresas', 'lamina-ilustrada-flores-de-chile')
   and not exists (select 1 from public.order_items oi where oi.product_id = p.id)
   and not exists (select 1 from public.coupons c where c.product_id = p.id);
update public.products set active = false
 where slug in ('taza-personalizada-dia-del-papa', 'taza-magica-con-foto', 'taza-lettering-con-nombre', 'cuaderno-personalizado-a5', 'agenda-2027-con-tu-nombre', 'set-de-stickers-personalizados', 'stickers-para-emprendedores', 'tote-bag-estampada', 'botella-de-aluminio-personalizada', 'kit-de-cumpleanos-personalizado', 'invitaciones-impresas', 'lamina-ilustrada-flores-de-chile');

-- 3) Categorías que ya no se usan
delete from public.categories where slug in ('regalos-personalizados', 'stickers', 'eventos', 'disenos-especiales');

-- 4) Productos reales (stock alto: se fabrican a pedido)
insert into public.products (name, slug, description, price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art, created_at)
select v.name, v.slug, v.description, v.price, c.id, 999, v.featured, v.customizable, null, v.days, v.preview, v.art, now() - (v.ord * interval '1 minute')
from (values
  ('Tazón Blanco', 'tazon-blanco', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 3500, 'sublimacion', false, true, 3, 'mug', 'mug', 0),
  ('Tazón Mágico', 'tazon-magico', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 5000, 'sublimacion', true, true, 3, 'mug', 'mug-magic', 1),
  ('Mug Térmico', 'mug-termico', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 8500, 'sublimacion', true, true, 3, 'mug', 'mug-name', 2),
  ('Mug base corcho', 'mug-base-corcho', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 7500, 'sublimacion', false, true, 3, 'mug', 'mug', 3),
  ('Vaso cervecero', 'vaso-cervecero', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 10000, 'sublimacion', false, true, 3, 'generic', 'bottle', 4),
  ('Estuche metálico', 'estuche-metalico', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 5500, 'sublimacion', false, true, 3, 'generic', 'print', 5),
  ('Botella Acero inox. 750cc', 'botella-acero-inox-750cc', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 8500, 'sublimacion', true, true, 3, 'generic', 'bottle', 6),
  ('Mouse Pad 24x22 cm', 'mouse-pad-24x22-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 3500, 'sublimacion', false, true, 3, 'generic', 'print', 7),
  ('Reloj led', 'reloj-led', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 8000, 'sublimacion', false, true, 3, 'generic', 'print', 8),
  ('Cuadro tipo piedra 19x14 cm', 'cuadro-tipo-piedra-19x14-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 12000, 'sublimacion', false, true, 3, 'generic', 'print', 9),
  ('Placa Mascotas', 'placa-mascotas', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 4000, 'sublimacion', false, true, 3, 'generic', 'print', 10),
  ('Cojín 30x30 personalizado', 'cojin-30x30-personalizado', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 5500, 'sublimacion', true, true, 3, 'tote', 'tote', 11),
  ('Saco dulcero 20x25 cm (docena)', 'saco-dulcero-20x25-cm-docena', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos. Precio por docena.', 18000, 'sublimacion', false, true, 3, 'tote', 'party', 12),
  ('Tote Bag 30x40 cm', 'tote-bag-30x40-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 8500, 'sublimacion', false, true, 3, 'tote', 'tote', 13),
  ('Calendario polaroid 10x14 cm', 'calendario-polaroid-10x14-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 10000, 'papeleria', true, true, 4, 'generic', 'print', 14),
  ('Calendario pared mensual A4', 'calendario-pared-mensual-a4', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 10000, 'papeleria', false, true, 4, 'generic', 'print', 15),
  ('Calendario A4 bimensual', 'calendario-a4-bimensual', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 2500, 'papeleria', false, true, 4, 'generic', 'print', 16),
  ('Mini calendario imantado 7x12 cm (100 unid)', 'mini-calendario-imantado-7x12-cm-100-unid', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos. Precio por 100 unidades.', 30000, 'papeleria', false, true, 4, 'generic', 'print', 17),
  ('Fotografías 10x14 cm (100 unid)', 'fotografias-10x14-cm-100-unid', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos. Precio por 100 unidades.', 10000, 'papeleria', false, true, 4, 'generic', 'print', 18),
  ('Fotografías 13x18 cm (100 unid)', 'fotografias-13x18-cm-100-unid', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos. Precio por 100 unidades.', 17000, 'papeleria', false, true, 4, 'generic', 'print', 19),
  ('Bolsa dulcera papel 14x21 cm (10 unidades)', 'bolsa-dulcera-papel-14x21-cm-10-unidades', 'Escríbenos por WhatsApp para ver las opciones y temáticas disponibles. Precio por 10 unidades.', 10000, 'papeleria', false, false, 4, 'generic', 'party', 20),
  ('Flyer 10x14 cm (100 unid)', 'flyer-10x14-cm-100-unid', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos. Precio por 100 unidades.', 8000, 'papeleria', false, true, 4, 'generic', 'cards', 21),
  ('Cien citas juntos', 'cien-citas-juntos', 'Escríbenos por WhatsApp para ver las opciones y temáticas disponibles.', 13000, 'papeleria', false, false, 4, 'generic', 'cards', 22),
  ('Planners (sin fechar, varias temáticas)', 'planners-sin-fechar-varias-tematicas', 'Escríbenos por WhatsApp para ver las opciones y temáticas disponibles. Varias temáticas.', 15000, 'papeleria', false, false, 4, 'notebook', 'agenda', 23),
  ('Agenda (fechada, varias temáticas)', 'agenda-fechada-varias-tematicas', 'Escríbenos por WhatsApp para ver las opciones y temáticas disponibles. Varias temáticas.', 15000, 'papeleria', false, false, 4, 'notebook', 'agenda', 24),
  ('Álbum 15x21 + láminas (varias temáticas)', 'album-15x21-laminas-varias-tematicas', 'Escríbenos por WhatsApp para ver las opciones y temáticas disponibles. Varias temáticas.', 15000, 'papeleria', false, false, 4, 'notebook', 'notebook', 25),
  ('Etiquetas escolares (pack)', 'etiquetas-escolares-pack', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 7000, 'papeleria', false, true, 4, 'generic', 'stickers', 26),
  ('Cuadernos de apuntes 15x21 cm', 'cuadernos-de-apuntes-15x21-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 10000, 'papeleria', true, true, 4, 'notebook', 'notebook', 27),
  ('Cuadernos de apuntes 18x25 cm', 'cuadernos-de-apuntes-18x25-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 15000, 'papeleria', false, true, 4, 'notebook', 'notebook', 28),
  ('Horario escolar A4 imantado', 'horario-escolar-a4-imantado', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 3500, 'papeleria', false, true, 4, 'generic', 'print', 29),
  ('Tarjetas de presentación 9x5,5 cm', 'tarjetas-de-presentacion-9x5-5-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 8000, 'papeleria', false, true, 4, 'generic', 'cards', 30),
  ('Croquera 15x21 cm', 'croquera-15x21-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 6500, 'papeleria', false, true, 4, 'notebook', 'notebook', 31),
  ('Croquera 18x25 cm', 'croquera-18x25-cm', 'Lo personalizamos con tu diseño, nombre o foto. Cuéntanos tu idea y la preparamos.', 8500, 'papeleria', false, true, 4, 'notebook', 'notebook', 32)
) as v(name, slug, description, price, cat, featured, customizable, days, preview, art, ord)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- 5) Orden y menú
update public.categories set position = 1, show_in_menu = true where slug = 'sublimacion';
update public.categories set position = 2, show_in_menu = true where slug = 'papeleria';
update public.categories set position = 3, show_in_menu = true where slug = 'estampados-textil';
