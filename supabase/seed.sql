-- Datos iniciales (mismo catálogo demo del sitio). Precios referenciales.

insert into public.categories (name, slug, description, placeholder_art, position) values
  ('Sublimación', 'sublimacion', 'Tazones, tazas mágicas, mugs térmicos y más, estampados por sublimación.', 'mug-dad', 1),
  ('Papelería', 'papeleria', 'Cuadernos, agendas, stickers, tarjetas, imanes y calendarios.', 'notebook', 2),
  ('Estampados textil', 'estampados-textil', 'Poleras, polerones y uniformes estampados.', 'tote', 3),
  ('Regalos personalizados', 'regalos-personalizados', 'Detalles únicos para regalar.', 'tote', 4),
  ('Stickers', 'stickers', 'Stickers troquelados para todo.', 'stickers', 5),
  ('Eventos', 'eventos', 'Cumpleaños, baby showers y celebraciones.', 'party', 6),
  ('Diseños especiales', 'disenos-especiales', 'Láminas e ilustraciones de autor.', 'print', 7)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Taza personalizada Día del Papá', 'taza-personalizada-dia-del-papa', 'Taza cerámica de 11 oz estampada por sublimación, con colores que no se borran en el lavado. Agrega el nombre de papá, una frase o una foto y la preparamos con todo el cariño para que llegue lista para regalar.', 7990, 9490, (select id from public.categories where slug = 'sublimacion'), 24, true, true, 'mas-vendido', 3, 'mug', 'mug-dad'
on conflict (slug) do nothing;
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Blanca clásica', 0, 0 from public.products where slug = 'taza-personalizada-dia-del-papa'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'taza-personalizada-dia-del-papa' and pv.name = 'Blanca clásica');
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Interior de color', 1000, 1 from public.products where slug = 'taza-personalizada-dia-del-papa'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'taza-personalizada-dia-del-papa' and pv.name = 'Interior de color');
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Mágica (cambia con el calor)', 3000, 2 from public.products where slug = 'taza-personalizada-dia-del-papa'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'taza-personalizada-dia-del-papa' and pv.name = 'Mágica (cambia con el calor)');

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Taza mágica con foto', 'taza-magica-con-foto', 'Negra por fuera hasta que le sirves algo caliente: ahí aparece tu foto. Una sorpresa que se repite cada mañana.', 10990, null, (select id from public.categories where slug = 'sublimacion'), 12, true, true, 'nuevo', 4, 'mug', 'mug-magic'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Taza lettering con nombre', 'taza-lettering-con-nombre', 'Tu nombre en lettering hecho a mano, rodeado de detalles de color. Ideal para oficinas, profes y amigas.', 7990, null, (select id from public.categories where slug = 'sublimacion'), 30, false, true, 'personalizable', 3, 'mug', 'mug-name'
on conflict (slug) do nothing;
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Blanca clásica', 0, 0 from public.products where slug = 'taza-lettering-con-nombre'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'taza-lettering-con-nombre' and pv.name = 'Blanca clásica');
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Interior de color', 1000, 1 from public.products where slug = 'taza-lettering-con-nombre'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'taza-lettering-con-nombre' and pv.name = 'Interior de color');

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Cuaderno personalizado A5', 'cuaderno-personalizado-a5', 'Cuaderno A5 de 100 hojas con tapa dura estampada con tu nombre o diseño. Hojas de 80 g, perfectas para lápices de colores.', 8990, null, (select id from public.categories where slug = 'papeleria'), 18, true, true, 'personalizable', 4, 'notebook', 'notebook'
on conflict (slug) do nothing;
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Hojas lisas', 0, 0 from public.products where slug = 'cuaderno-personalizado-a5'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'cuaderno-personalizado-a5' and pv.name = 'Hojas lisas');
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Hojas con líneas', 0, 1 from public.products where slug = 'cuaderno-personalizado-a5'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'cuaderno-personalizado-a5' and pv.name = 'Hojas con líneas');
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Hojas punteadas', 500, 2 from public.products where slug = 'cuaderno-personalizado-a5'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'cuaderno-personalizado-a5' and pv.name = 'Hojas punteadas');

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Agenda 2027 con tu nombre', 'agenda-2027-con-tu-nombre', 'Agenda semanal 2027 con planificador mensual, stickers de regalo y portada personalizada.', 14990, 16990, (select id from public.categories where slug = 'papeleria'), 9, true, true, 'nuevo', 5, 'notebook', 'agenda'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Set de stickers personalizados (24 u.)', 'set-de-stickers-personalizados', '24 stickers troquelados en vinilo resistente al agua. Ideales para botellas, notebooks y cuadernos.', 4990, null, (select id from public.categories where slug = 'stickers'), 40, true, true, 'mas-vendido', 2, 'generic', 'stickers'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Stickers para emprendedores (100 u.)', 'stickers-para-emprendedores', 'Stickers con el logo de tu marca para sellar pedidos y packaging. Troquel redondo o a medida.', 12990, null, (select id from public.categories where slug = 'stickers'), 50, false, true, null, 4, 'generic', 'stickers-logo'
on conflict (slug) do nothing;
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Redondos 5 cm', 0, 0 from public.products where slug = 'stickers-para-emprendedores'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'stickers-para-emprendedores' and pv.name = 'Redondos 5 cm');
insert into public.product_variants (product_id, name, price_delta, position)
select id, 'Troquel a medida', 3000, 1 from public.products where slug = 'stickers-para-emprendedores'
  and not exists (select 1 from public.product_variants pv join public.products pp on pp.id = pv.product_id where pp.slug = 'stickers-para-emprendedores' and pv.name = 'Troquel a medida');

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Tote bag estampada', 'tote-bag-estampada', 'Bolso de tela 100% algodón con estampado a elección. Resistente, lavable y listo para acompañarte todos los días.', 9990, null, (select id from public.categories where slug = 'regalos-personalizados'), 15, true, true, 'personalizable', 4, 'tote', 'tote'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Botella de aluminio personalizada', 'botella-de-aluminio-personalizada', 'Botella de aluminio de 600 ml con tapa rosca, estampada con tu nombre o diseño.', 11990, null, (select id from public.categories where slug = 'regalos-personalizados'), 4, false, true, null, 4, 'generic', 'bottle'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Kit de cumpleaños personalizado', 'kit-de-cumpleanos-personalizado', 'Banderín, toppers para torta, stickers y tarjetas con el nombre y la temática del festejado.', 15990, null, (select id from public.categories where slug = 'eventos'), 10, true, true, 'nuevo', 6, 'generic', 'party'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Invitaciones impresas (20 u.)', 'invitaciones-impresas', '20 invitaciones impresas en papel premium de 300 g, con sobre incluido.', 9990, null, (select id from public.categories where slug = 'eventos'), 20, false, true, null, 5, 'generic', 'cards'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, compare_at_price, category_id, stock, featured, customizable, badge, preparation_days, preview_kind, placeholder_art)
select 'Lámina ilustrada Flores de Chile', 'lamina-ilustrada-flores-de-chile', 'Lámina A4 impresa en papel de algodón con ilustraciones de flores nativas. Edición limitada.', 6990, null, (select id from public.categories where slug = 'disenos-especiales'), 0, false, false, null, 2, 'generic', 'print'
on conflict (slug) do nothing;

