-- Datos iniciales: catálogo real de Minerva (precios en CLP).

insert into public.categories (name, slug, description, placeholder_art, position) values
  ('Sublimación', 'sublimacion', 'Tazones, mugs, botellas, cojines y más, personalizados por sublimación.', 'mug-dad', 1),
  ('Papelería', 'papeleria', 'Calendarios, cuadernos, agendas, tarjetas, fotografías y más.', 'notebook', 2),
  ('Estampado textil y corporativo', 'estampados-textil', 'Poleras, polerones, buzos, indumentaria deportiva y uniformes corporativos.', 'tote', 3)
on conflict (slug) do nothing;

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
