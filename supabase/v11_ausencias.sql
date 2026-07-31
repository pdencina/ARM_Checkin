-- ============================================================
-- v11: Tabla de ausencias diarias
-- ============================================================

create table if not exists ausencias (
  id         uuid        default gen_random_uuid() primary key,
  nombre     text        not null,
  fecha      date        default current_date,
  created_at timestamptz default now(),
  unique(nombre, fecha)
);

alter table ausencias enable row level security;

create policy "Cualquiera puede gestionar ausencias"
  on ausencias for all
  to anon, authenticated
  using (true)
  with check (true);
