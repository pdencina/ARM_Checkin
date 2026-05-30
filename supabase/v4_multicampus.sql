-- ============================================================
-- ARM Kids & Tweens — v4: Multi-campus
-- Ejecutar en Supabase → SQL Editor DESPUÉS de v3.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Tabla de campus
-- ----------------------------------------------------------------
create table if not exists campuses (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  pais       text not null default 'Chile',
  ciudad     text,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed: los 7 campus de ARM Global
insert into campuses (nombre, pais, ciudad) values
  ('ARM Santiago',     'Chile',     'Santiago'),
  ('ARM Puente Alto',  'Chile',     'Puente Alto'),
  ('ARM Punta Arenas', 'Chile',     'Punta Arenas'),
  ('ARM Concepción',   'Chile',     'Concepción'),
  ('ARM Montevideo',   'Uruguay',   'Montevideo'),
  ('ARM Maracaibo',    'Venezuela', 'Maracaibo'),
  ('ARM La Plata',     'Argentina', 'La Plata')
on conflict (nombre) do nothing;

-- ----------------------------------------------------------------
-- 2. Agregar campus_id a tablas existentes
-- ----------------------------------------------------------------
alter table profiles
  add column if not exists campus_id uuid references campuses(id) on delete set null;

alter table services
  add column if not exists campus_id uuid references campuses(id) on delete set null;

alter table volunteers
  add column if not exists campus_id uuid references campuses(id) on delete set null;

alter table checkins
  add column if not exists campus_id uuid references campuses(id) on delete set null;

-- ----------------------------------------------------------------
-- 3. Trigger: checkins heredan campus_id del servicio
-- ----------------------------------------------------------------
create or replace function set_checkin_campus()
returns trigger language plpgsql security definer as $$
begin
  select campus_id into new.campus_id
  from services where id = new.service_id;
  return new;
end;
$$;

drop trigger if exists trg_checkin_campus on checkins;
create trigger trg_checkin_campus
  before insert on checkins
  for each row execute function set_checkin_campus();

-- Trigger: nuevos servicios/voluntarios heredan campus del usuario si no se especifica
create or replace function set_record_campus()
returns trigger language plpgsql security definer as $$
begin
  if new.campus_id is null then
    select campus_id into new.campus_id
    from profiles where id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_service_campus on services;
create trigger trg_service_campus
  before insert on services
  for each row execute function set_record_campus();

drop trigger if exists trg_volunteer_campus on volunteers;
create trigger trg_volunteer_campus
  before insert on volunteers
  for each row execute function set_record_campus();

-- ----------------------------------------------------------------
-- 4. Migrar datos existentes al campus por defecto (ARM Santiago)
-- ----------------------------------------------------------------
do $$
declare v_campus_id uuid;
begin
  select id into v_campus_id from campuses where nombre = 'ARM Santiago';
  -- Profiles sin campus → Santiago
  update profiles set campus_id = v_campus_id where campus_id is null;
  -- Services sin campus_id → intentar mapear del texto, si no → Santiago
  update services s set campus_id = c.id
    from campuses c
    where s.campus_id is null and lower(s.campus) = lower(c.nombre);
  update services set campus_id = v_campus_id where campus_id is null;
  -- Volunteers sin campus → Santiago
  update volunteers set campus_id = v_campus_id where campus_id is null;
  -- Checkins sin campus → heredar de su servicio
  update checkins ci set campus_id = s.campus_id
    from services s
    where ci.campus_id is null and ci.service_id = s.id;
end $$;

-- ----------------------------------------------------------------
-- 5. Rol super_admin
-- ----------------------------------------------------------------
insert into roles (slug, nombre, es_admin) values
  ('super_admin', 'Super Admin', true)
on conflict (slug) do nothing;

-- Permisos del admin de campus (igual que lider pero con gestión de usuarios y campus)
insert into role_permissions (rol, modulo, ver, gestionar) values
  ('admin','dashboard',   true, true),
  ('admin','checkin',     true, true),
  ('admin','checkout',    true, true),
  ('admin','familias',    true, true),
  ('admin','voluntarios', true, true),
  ('admin','reportes',    true, true),
  ('admin','servicios',   true, true),
  ('admin','usuarios',    true, true),
  ('admin','campuses',    false, false),
  ('admin','panoramica',  false, false),
  ('lider','campuses',    false, false),
  ('lider','panoramica',  false, false),
  ('retiro','campuses',   false, false),
  ('retiro','panoramica', false, false)
on conflict (rol, modulo) do nothing;

-- ----------------------------------------------------------------
-- 6. Funciones helper multi-campus
-- ----------------------------------------------------------------
create or replace function is_super_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and rol = 'super_admin' and activo = true
  );
$$;

create or replace function user_campus_id()
returns uuid language sql security definer stable
set search_path = public as $$
  select campus_id from profiles where id = auth.uid();
$$;

-- Sobreescribir is_admin para incluir super_admin y admin de campus
create or replace function is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from profiles p
    join roles r on r.slug = p.rol
    where p.id = auth.uid() and p.activo = true and r.es_admin = true
  );
$$;

-- can() actualizado: super_admin siempre puede todo
create or replace function can(p_modulo text, p_gestionar boolean default false)
returns boolean language sql security definer stable
set search_path = public as $$
  select is_super_admin() or is_admin() or exists (
    select 1 from profiles p
    join role_permissions rp on rp.rol = p.rol
    where p.id = auth.uid() and p.activo = true
      and rp.modulo = p_modulo
      and rp.ver = true
      and (p_gestionar = false or rp.gestionar = true)
  );
$$;

-- ----------------------------------------------------------------
-- 7. RLS: campuses
-- ----------------------------------------------------------------
alter table campuses enable row level security;

drop policy if exists campuses_select on campuses;
create policy campuses_select on campuses for select to authenticated using (true);

drop policy if exists campuses_write on campuses;
create policy campuses_write on campuses for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- ----------------------------------------------------------------
-- 8. RLS actualizado: filtro por campus
-- Familias/niños son GLOBALES (cualquier campus puede usarlos).
-- Servicios, checkins y voluntarios son por campus.
-- ----------------------------------------------------------------

-- Profiles: propio, o del mismo campus si es admin, o super_admin
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or is_super_admin()
    or (is_admin() and campus_id = user_campus_id())
  );

drop policy if exists profiles_write on profiles;
create policy profiles_write on profiles for all to authenticated
  using (is_super_admin() or (is_admin() and campus_id = user_campus_id()))
  with check (is_super_admin() or (is_admin() and campus_id = user_campus_id()));

-- Services: solo del propio campus (o super_admin ve todo)
drop policy if exists staff_all_services on services;
drop policy if exists services_select on services;
create policy services_select on services for select to authenticated
  using (is_super_admin() or campus_id = user_campus_id() or can('checkin') or can('dashboard'));

drop policy if exists services_write on services;
create policy services_write on services for all to authenticated
  using (is_super_admin() or (can('servicios', true) and campus_id = user_campus_id()))
  with check (is_super_admin() or can('servicios', true));

-- Checkins: los del propio campus
drop policy if exists staff_all_checkins on checkins;
drop policy if exists checkins_select on checkins;
create policy checkins_select on checkins for select to authenticated
  using (is_super_admin() or campus_id = user_campus_id() or campus_id is null);

drop policy if exists checkins_insert on checkins;
create policy checkins_insert on checkins for insert to authenticated
  with check (can('checkin', true));

drop policy if exists checkins_update on checkins;
create policy checkins_update on checkins for update to authenticated
  using (is_super_admin() or (can('checkout', true) and (campus_id = user_campus_id() or campus_id is null)));

-- Volunteers: por campus
drop policy if exists vol_select on volunteers;
create policy vol_select on volunteers for select to authenticated
  using (is_super_admin() or campus_id = user_campus_id());

drop policy if exists vol_write on volunteers;
create policy vol_write on volunteers for all to authenticated
  using (is_super_admin() or (can('voluntarios', true) and campus_id = user_campus_id()))
  with check (is_super_admin() or can('voluntarios', true));

-- Service volunteers: heredan restricción del servicio
drop policy if exists sv_select on service_volunteers;
create policy sv_select on service_volunteers for select to authenticated
  using (
    is_super_admin() or
    exists (select 1 from services s where s.id = service_volunteers.service_id
            and (s.campus_id = user_campus_id() or is_super_admin()))
  );

drop policy if exists sv_write on service_volunteers;
create policy sv_write on service_volunteers for all to authenticated
  using (
    is_super_admin() or
    (can('voluntarios', true) and
     exists (select 1 from services s where s.id = service_volunteers.service_id
             and s.campus_id = user_campus_id()))
  )
  with check (is_super_admin() or can('voluntarios', true));

-- Familias/niños siguen siendo globales (cualquier campus puede ver/crear)
-- guardians, children, guardian_children, authorized_pickups: sin cambio en RLS
