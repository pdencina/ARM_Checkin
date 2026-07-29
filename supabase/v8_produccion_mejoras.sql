-- ============================================================
-- v8: Mejoras de producción para Play & Group
-- ============================================================

-- ─── 1. TTL: Limpieza automática de notificaciones > 7 días ───
-- Requiere extensión pg_cron (habilitada por defecto en Supabase)

-- Habilitar pg_cron si no está
create extension if not exists pg_cron;

-- Job: limpiar notificaciones de más de 7 días (corre a las 3am cada día)
select cron.schedule(
  'cleanup-notificaciones',
  '0 3 * * *',
  $$DELETE FROM public.notificaciones WHERE created_at < now() - interval '7 days'$$
);

-- ─── 2. Push subscriptions: agregar updated_at ───────────────

alter table push_subscriptions
  add column if not exists updated_at timestamptz default now();

-- Job: limpiar suscripciones que no se renuevan en 30 días (corre a las 3:05am)
select cron.schedule(
  'cleanup-push-subscriptions',
  '5 3 * * *',
  $$DELETE FROM public.push_subscriptions WHERE updated_at < now() - interval '30 days'$$
);

-- ─── 3. Índice para acelerar queries del día ─────────────────

create index if not exists idx_notificaciones_created_at
  on notificaciones (created_at desc);

create index if not exists idx_notificaciones_pendientes
  on notificaciones (confirmado_at) where confirmado_at is null;
