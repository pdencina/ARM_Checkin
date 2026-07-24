-- ============================================================
-- v6: Tabla de notificaciones Recepción → Play
-- ============================================================

create table if not exists notificaciones (
  id            uuid        default gen_random_uuid() primary key,
  nombre        text        not null,
  campus_id     uuid        references campuses(id),
  confirmado_at timestamptz default null,
  created_at    timestamptz default now()
);

-- RLS: permitir acceso a anon y authenticated (las pantallas de fundación no tienen login)
alter table notificaciones enable row level security;

create policy "Cualquiera puede insertar notificaciones"
  on notificaciones for insert
  to anon, authenticated
  with check (true);

create policy "Cualquiera puede leer notificaciones"
  on notificaciones for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede actualizar notificaciones"
  on notificaciones for update
  to anon, authenticated
  using (true)
  with check (true);

-- Habilitar Realtime en la tabla (INSERT y UPDATE)
alter publication supabase_realtime add table notificaciones;
