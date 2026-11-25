-- Endurecimiento de seguridad. Es repetible.

-- Fotos de clientes: solo se aceptan rutas con el formato que usa la tienda
-- (carpeta aleatoria / número de línea [-original] . jpg|png|webp). Evita que se use el bucket
-- para subir cualquier archivo con cualquier nombre.
drop policy if exists "customer uploads insert" on storage.objects;
create policy "customer uploads insert" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'customer-uploads'
    and name ~ '^[0-9a-f-]{36}/[0-9]{1,3}(-original)?\.(jpg|png|webp)$'
  );

-- Datos del cliente: largo máximo razonable en cada campo
alter table public.profiles drop constraint if exists profiles_lengths;
alter table public.profiles add constraint profiles_lengths check (
  coalesce(length(first_name), 0) <= 80 and coalesce(length(last_name), 0) <= 80 and
  coalesce(length(phone), 0) <= 30 and coalesce(length(address), 0) <= 200 and
  coalesce(length(comuna), 0) <= 80 and coalesce(length(region), 0) <= 80
);
