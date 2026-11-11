-- Permite elegir desde el panel qué categorías aparecen en el menú desplegable de Productos.
alter table public.categories add column if not exists show_in_menu boolean not null default true;

-- Menú inicial: solo las tres secciones del negocio
update public.categories set show_in_menu = true  where slug in ('sublimacion', 'papeleria', 'estampados-textil');
update public.categories set show_in_menu = false where slug in ('regalos-personalizados', 'stickers', 'eventos', 'disenos-especiales');
