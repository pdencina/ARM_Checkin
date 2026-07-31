-- ============================================================
-- v12: Multi-sede para Play & Group
-- ============================================================

-- Agregar sede a notificaciones
alter table notificaciones
  add column if not exists sede text default 'puente-alto';

-- Agregar sede a horarios_ninos
alter table horarios_ninos
  add column if not exists sede text default 'puente-alto';

-- Agregar sede a ausencias
alter table ausencias
  add column if not exists sede text default 'puente-alto';

-- Agregar sede a push_subscriptions
alter table push_subscriptions
  add column if not exists sede text default 'puente-alto';

-- Índice para filtrar por sede
create index if not exists idx_notificaciones_sede on notificaciones (sede, created_at desc);
create index if not exists idx_horarios_sede on horarios_ninos (sede);

-- Actualizar los datos existentes a Puente Alto
update horarios_ninos set sede = 'puente-alto' where sede is null;
update notificaciones set sede = 'puente-alto' where sede is null;
