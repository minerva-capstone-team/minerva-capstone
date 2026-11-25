-- Vista previa según la forma del producto: redondo (chapitas, placas), rectangular
-- (cuadros, fotos, calendarios, tarjetas) y botella/vaso. Es repetible.
alter table public.products drop constraint if exists products_preview_kind_check;
alter table public.products add constraint products_preview_kind_check
  check (preview_kind in ('mug', 'notebook', 'tote', 'generic', 'round', 'rect', 'bottle'));

update public.products set preview_kind = 'round'
 where name ilike '%chapita%' or name ilike '%placa%' or name ilike '%pin %' or name ilike '%botón%';
update public.products set preview_kind = 'rect'
 where name ilike '%cuadro%' or name ilike '%fotograf%' or name ilike '%calendario%' or name ilike '%flyer%'
    or name ilike '%tarjeta%' or name ilike '%mouse%' or name ilike '%horario%' or name ilike '%imán%';
update public.products set preview_kind = 'bottle'
 where name ilike '%botella%' or name ilike '%vaso%' or name ilike '%termo%';
