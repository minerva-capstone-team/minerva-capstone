-- Más formas de vista previa: polera/polerón/buzo, cojín, saco o bolsa y reloj.
-- Además ordena cada producto con la forma que le corresponde según su nombre. Es repetible.
alter table public.products drop constraint if exists products_preview_kind_check;
alter table public.products add constraint products_preview_kind_check
  check (preview_kind in ('mug', 'notebook', 'tote', 'generic', 'round', 'rect', 'bottle', 'shirt', 'pillow', 'bag', 'clock'));

update public.products set preview_kind = 'mug'
 where name ilike '%taz%' or name ilike '%mug%';
update public.products set preview_kind = 'bottle'
 where name ilike '%botella%' or name ilike '%vaso%' or name ilike '%termo%';
update public.products set preview_kind = 'round'
 where name ilike '%chapita%' or name ilike '%placa%' or name ilike '%pin %' or name ilike '%botón%';
update public.products set preview_kind = 'clock'
 where name ilike '%reloj%';
update public.products set preview_kind = 'pillow'
 where name ilike '%coj%n%';
update public.products set preview_kind = 'tote'
 where name ilike '%tote%';
update public.products set preview_kind = 'bag'
 where name ilike '%saco%' or name ilike '%bolsa%' or name ilike '%bolsita%';
update public.products set preview_kind = 'rect'
 where name ilike '%cuadro%' or name ilike '%fotograf%' or name ilike '%calendario%' or name ilike '%flyer%'
    or name ilike '%tarjeta%' or name ilike '%mouse%' or name ilike '%horario%' or name ilike '%imán%'
    or name ilike '%estuche%' or name ilike '%etiqueta%';
update public.products set preview_kind = 'notebook'
 where name ilike '%cuaderno%' or name ilike '%libreta%' or name ilike '%croquera%' or name ilike '%agenda%'
    or name ilike '%planner%' or name ilike '%álbum%' or name ilike '%album%' or name ilike '%cien citas%';
update public.products set preview_kind = 'shirt'
 where name ilike '%polera%' or name ilike '%poler%n%' or name ilike '%buzo%' or name ilike '%uniforme%'
    or name ilike '%textil%' or name ilike '%indumentaria%';
