-- ============================================================
-- v10: Horarios esperados de niños para Play & Group
-- ============================================================

create table if not exists horarios_ninos (
  id             uuid    default gen_random_uuid() primary key,
  nombre         text    not null,
  hora_llegada   time    not null,           -- hora estimada de llegada
  hora_salida    time    default null,        -- hora estimada de retiro (null = variable)
  dias           text[]  default '{lun,mar,mie,jue,vie}', -- días que asiste
  jornada        text    default 'completa', -- 'am', 'pm', 'completa'
  notas          text    default null,
  activo         boolean default true,
  created_at     timestamptz default now()
);

-- RLS: acceso abierto para las pantallas de fundación
alter table horarios_ninos enable row level security;

create policy "Cualquiera puede leer horarios"
  on horarios_ninos for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede gestionar horarios"
  on horarios_ninos for all
  to anon, authenticated
  using (true)
  with check (true);

-- ─── Seed: datos iniciales de los niños ───────────────────

insert into horarios_ninos (nombre, hora_llegada, hora_salida, jornada, notas) values
  ('Paolo',    '08:00', '15:00', 'completa', 'Llega entre 8:00-8:15, sale 15:00-15:30'),
  ('Sarah',    '08:00', '17:00', 'completa', 'Llega entre 8:00-8:30, sale 17:00-17:30'),
  ('Grace',    '08:30', '16:00', 'completa', 'Llega entre 8:30-9:00, sale 16:00'),
  ('Isabella', '09:00', '13:00', 'am',       'Jornada AM fija, sale siempre a las 13:00'),
  ('Isaac',    '09:30', '17:30', 'completa', 'Llega entre 9:30-10:00, sale 17:30-18:00'),
  ('Amparo',   '09:30', '18:00', 'completa', 'Ingreso variable después de 9:30, retiro casi siempre 18:00');
