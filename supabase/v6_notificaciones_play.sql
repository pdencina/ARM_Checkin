-- ============================================================
-- v6: Tabla de notificaciones Recepción → Play
-- ============================================================

create table if not exists notificaciones (
  id         uuid        default gen_random_uuid() primary key,
  nombre     text        not null,
  campus_id  uuid        references campuses(id),
  created_at timestamptz default now()
);

-- RLS básico: cualquier usuario autenticado puede insertar y leer
alter table notificaciones enable row level security;

create policy "Usuarios autenticados pueden insertar notificaciones"
  on notificaciones for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados pueden leer notificaciones"
  on notificaciones for select
  to authenticated
  using (true);

-- Habilitar Realtime en la tabla
alter publication supabase_realtime add table notificaciones;
