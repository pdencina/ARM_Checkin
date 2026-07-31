-- ============================================================
-- v9: Registrar quién confirma cada notificación
-- ============================================================

alter table notificaciones
  add column if not exists confirmado_por text default null;
