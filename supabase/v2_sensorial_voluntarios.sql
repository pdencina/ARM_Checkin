-- ============================================================
-- ARM Kids & Tweens — v2: Salita Sensorial + Voluntarios
-- Ejecutar en Supabase → SQL Editor DESPUÉS de roles.sql.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Agregar ministerio 'sensorial' al constraint de children
-- ----------------------------------------------------------------
alter table children drop constraint if exists children_ministerio_check;
alter table children
  add constraint children_ministerio_check
  check (ministerio in ('kids','tweens','sensorial'));

-- ----------------------------------------------------------------
-- 2. Voluntarios (directorio de servidores)
-- ----------------------------------------------------------------
create table if not exists volunteers (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  apellido   text not null,
  telefono   text,
  email      text,
  areas      text[] not null default '{}',
  notas      text,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. Asignación de voluntarios por servicio
-- ----------------------------------------------------------------
create table if not exists service_volunteers (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references services(id) on delete cascade,
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  ministerio   text not null check (ministerio in ('kids','tweens','sensorial')),
  rol          text not null default 'servidor' check (rol in ('lider','servidor')),
  estado       text not null default 'pendiente'
               check (estado in ('pendiente','confirmado','ausente')),
  created_at   timestamptz not null default now(),
  unique (service_id, volunteer_id, ministerio)
);

create index if not exists idx_sv_service   on service_volunteers(service_id);
create index if not exists idx_sv_volunteer on service_volunteers(volunteer_id);

-- ----------------------------------------------------------------
-- 4. RLS para tablas nuevas
-- ----------------------------------------------------------------
alter table volunteers         enable row level security;
alter table service_volunteers enable row level security;

drop policy if exists vol_select on volunteers;
create policy vol_select on volunteers for select to authenticated
  using (can('voluntarios'));
drop policy if exists vol_write on volunteers;
create policy vol_write on volunteers for all to authenticated
  using (can('voluntarios', true)) with check (can('voluntarios', true));

drop policy if exists sv_select on service_volunteers;
create policy sv_select on service_volunteers for select to authenticated
  using (can('voluntarios'));
drop policy if exists sv_write on service_volunteers;
create policy sv_write on service_volunteers for all to authenticated
  using (can('voluntarios', true)) with check (can('voluntarios', true));

-- ----------------------------------------------------------------
-- 5. Agregar módulo 'voluntarios' a los roles existentes
-- ----------------------------------------------------------------
insert into role_permissions (rol, modulo, ver, gestionar) values
  ('lider',  'voluntarios', true,  true),
  ('retiro', 'voluntarios', false, false)
on conflict (rol, modulo) do nothing;
