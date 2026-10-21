-- =============================================================================
-- 0008 · Aprobación de cuentas creadas desde Instagram
--
-- Ahora el bot NO crea la cuenta al instante: deja la solicitud en "por_aprobar" y
-- quien administra la acepta o la rechaza desde /admin/cuentas-instagram.
--   por_aprobar → creada (aceptada) | rechazada
-- Requiere 0007. Es repetible.
-- =============================================================================

alter table public.instagram_signups drop constraint if exists instagram_signups_status_check;
alter table public.instagram_signups
  add constraint instagram_signups_status_check check (status in ('pendiente', 'por_aprobar', 'creada', 'rechazada'));

alter table public.instagram_signups add column if not exists requested_at timestamptz;
alter table public.instagram_signups add column if not exists decided_at timestamptz;

create index if not exists instagram_signups_status_idx on public.instagram_signups (status, created_at desc);
