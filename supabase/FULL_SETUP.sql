-- ============================================================
-- ARM CHECK-IN — SETUP COMPLETO (un solo script)
-- Copiar y pegar en Supabase → SQL Editor → Run
-- ============================================================

-- ████████████████████████████████████████████████████████████
-- PARTE 1: SCHEMA BASE
-- ████████████████████████████████████████████████████████████

create extension if not exists "pgcrypto";

-- TUTORES
create table if not exists guardians (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  apellido    text not null,
  telefono    text,
  email       text,
  created_at  timestamptz not null default now()
);

-- NIÑOS
create table if not exists children (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  apellido         text not null,
  fecha_nacimiento date,
  ministerio       text not null check (ministerio in ('kids','tweens','sensorial')),
  alergias         text,
  notas_medicas    text,
  condiciones      text,
  medicamentos     text,
  contacto_emergencia_nombre   text,
  contacto_emergencia_telefono text,
  foto_url         text,
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- RELACIÓN TUTOR <-> NIÑO
create table if not exists guardian_children (
  guardian_id  uuid not null references guardians(id) on delete cascade,
  child_id     uuid not null references children(id)  on delete cascade,
  parentesco   text,
  es_principal boolean not null default false,
  primary key (guardian_id, child_id)
);

-- CAMPUS
create table if not exists campuses (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  pais       text not null default 'Chile',
  ciudad     text,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- SERVICIOS
create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  fecha        date not null,
  hora         time,
  activo       boolean not null default true,
  campus       text not null default 'Principal',
  campus_id    uuid references campuses(id) on delete set null,
  es_recurrente boolean not null default false,
  dia_semana   int,
  hora_default time,
  created_at   timestamptz not null default now()
);

-- CHECK-INS
create table if not exists checkins (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references children(id),
  service_id           uuid not null references services(id),
  checkin_guardian_id  uuid not null references guardians(id),
  checkout_guardian_id uuid references guardians(id),
  codigo_seguridad     text not null,
  estado               text not null default 'checked_in'
                         check (estado in ('checked_in','checked_out')),
  checkin_at           timestamptz not null default now(),
  checkout_at          timestamptz,
  primera_vez          boolean not null default false,
  checkout_nombre      text,
  campus_id            uuid references campuses(id) on delete set null,
  checkin_by           uuid references auth.users(id),
  checkout_by          uuid references auth.users(id)
);

create unique index if not exists uq_codigo_activo
  on checkins (service_id, codigo_seguridad)
  where estado = 'checked_in';
create index if not exists idx_checkins_child   on checkins (child_id);
create index if not exists idx_checkins_service on checkins (service_id);
create index if not exists idx_checkins_estado  on checkins (estado);

-- VOLUNTARIOS
create table if not exists volunteers (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  apellido   text not null,
  telefono   text,
  email      text,
  areas      text[] not null default '{}',
  notas      text,
  activo     boolean not null default true,
  campus_id  uuid references campuses(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ASIGNACIÓN VOLUNTARIOS POR SERVICIO
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

-- AUTORIZADOS DE RETIRO
create table if not exists authorized_pickups (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  nombre      text not null,
  apellido    text not null,
  telefono    text,
  parentesco  text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ap_child on authorized_pickups(child_id);

-- ████████████████████████████████████████████████████████████
-- PARTE 2: ROLES Y PERFILES
-- ████████████████████████████████████████████████████████████

-- ROLES
create table if not exists roles (
  slug       text primary key,
  nombre     text not null,
  es_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- PERFILES
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  email      text,
  rol        text not null default 'lider',
  activo     boolean not null default true,
  campus_id  uuid references campuses(id) on delete set null,
  created_at timestamptz not null default now()
);

-- FK profiles.rol -> roles.slug
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_rol_fkey'
  ) then
    alter table profiles
      add constraint profiles_rol_fkey foreign key (rol) references roles(slug);
  end if;
end $$;

-- MATRIZ DE PERMISOS
create table if not exists role_permissions (
  rol        text not null references roles(slug) on delete cascade,
  modulo     text not null,
  ver        boolean not null default false,
  gestionar  boolean not null default false,
  primary key (rol, modulo)
);

-- ████████████████████████████████████████████████████████████
-- PARTE 3: FUNCIONES
-- ████████████████████████████████████████████████████████████

-- Generador de código seguro
create or replace function generate_security_code(len int default 4)
returns text language plpgsql as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  resultado text := '';
  i int;
begin
  for i in 1..len loop
    resultado := resultado ||
      substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
  end loop;
  return resultado;
end;
$$;

-- Helpers de permisos
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

create or replace function is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from profiles p
    join roles r on r.slug = p.rol
    where p.id = auth.uid() and p.activo = true and r.es_admin = true
  );
$$;

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

-- CHECK-IN atómico
create or replace function do_checkin(
  p_child_id    uuid,
  p_service_id  uuid,
  p_guardian_id uuid
)
returns checkins language plpgsql as $$
declare
  v_code     text;
  v_row      checkins;
  v_try      int := 0;
  v_primera  boolean;
begin
  select not exists(
    select 1 from checkins where child_id = p_child_id
  ) into v_primera;

  loop
    v_try := v_try + 1;
    v_code := generate_security_code(4);
    begin
      insert into checkins
        (child_id, service_id, checkin_guardian_id, codigo_seguridad, checkin_by, primera_vez)
      values
        (p_child_id, p_service_id, p_guardian_id, v_code, auth.uid(), v_primera)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_try >= 20 then
        raise exception 'No se pudo generar código único tras % intentos', v_try;
      end if;
    end;
  end loop;
end;
$$;

-- CHECK-OUT con verificación
create or replace function do_checkout(
  p_checkin_id     uuid,
  p_codigo         text,
  p_guardian_id    uuid,
  p_checkout_nombre text default null
)
returns checkins language plpgsql as $$
declare
  v_row checkins;
begin
  update checkins
     set estado               = 'checked_out',
         checkout_at          = now(),
         checkout_guardian_id = p_guardian_id,
         checkout_by          = auth.uid(),
         checkout_nombre      = coalesce(p_checkout_nombre, checkout_nombre)
   where id = p_checkin_id
     and estado = 'checked_in'
     and upper(codigo_seguridad) = upper(p_codigo)
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Código incorrecto o el niño ya fue retirado';
  end if;
  return v_row;
end;
$$;

-- ████████████████████████████████████████████████████████████
-- PARTE 4: TRIGGERS
-- ████████████████████████████████████████████████████████████

-- Crear perfil al registrar usuario
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles (id, email, rol)
  values (new.id, new.email, 'lider')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Checkins heredan campus del servicio
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

-- Servicios/voluntarios heredan campus del usuario
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

-- ████████████████████████████████████████████████████████████
-- PARTE 5: SEED DATA
-- ████████████████████████████████████████████████████████████

-- Roles
insert into roles (slug, nombre, es_admin) values
  ('super_admin', 'Super Admin',   true),
  ('admin',       'Administrador', true),
  ('lider',       'Líder',         false),
  ('servidor',    'Servidor',      false),
  ('retiro',      'Solo retiro',   false)
on conflict (slug) do nothing;

-- Permisos por rol
insert into role_permissions (rol, modulo, ver, gestionar) values
  ('lider','dashboard',   true,  false),
  ('lider','checkin',     true,  true),
  ('lider','checkout',    true,  true),
  ('lider','familias',    true,  true),
  ('lider','voluntarios', true,  true),
  ('lider','reportes',    true,  false),
  ('lider','servicios',   true,  true),
  ('lider','usuarios',    false, false),
  ('lider','campuses',    false, false),
  ('lider','panoramica',  false, false),
  ('servidor','dashboard', true,  false),
  ('servidor','checkin',   true,  true),
  ('servidor','checkout',  true,  true),
  ('servidor','familias',  true,  false),
  ('servidor','voluntarios', false, false),
  ('servidor','reportes',  false, false),
  ('servidor','servicios', false, false),
  ('servidor','usuarios',  false, false),
  ('servidor','campuses',  false, false),
  ('servidor','panoramica',false, false),
  ('retiro','dashboard',  true,  false),
  ('retiro','checkin',    false, false),
  ('retiro','checkout',   true,  true),
  ('retiro','familias',   false, false),
  ('retiro','voluntarios',false, false),
  ('retiro','reportes',   false, false),
  ('retiro','servicios',  false, false),
  ('retiro','usuarios',   false, false),
  ('retiro','campuses',   false, false),
  ('retiro','panoramica', false, false),
  ('admin','dashboard',   true,  true),
  ('admin','checkin',     true,  true),
  ('admin','checkout',    true,  true),
  ('admin','familias',    true,  true),
  ('admin','voluntarios', true,  true),
  ('admin','reportes',    true,  true),
  ('admin','servicios',   true,  true),
  ('admin','usuarios',    true,  true),
  ('admin','campuses',    false, false),
  ('admin','panoramica',  false, false)
on conflict (rol, modulo) do nothing;

-- Campus de ARM Global
insert into campuses (nombre, pais, ciudad) values
  ('ARM Santiago',     'Chile',     'Santiago'),
  ('ARM Puente Alto',  'Chile',     'Puente Alto'),
  ('ARM Punta Arenas', 'Chile',     'Punta Arenas'),
  ('ARM Concepción',   'Chile',     'Concepción'),
  ('ARM Montevideo',   'Uruguay',   'Montevideo'),
  ('ARM Maracaibo',    'Venezuela', 'Maracaibo'),
  ('ARM La Plata',     'Argentina', 'La Plata')
on conflict (nombre) do nothing;

-- ████████████████████████████████████████████████████████████
-- PARTE 6: ROW LEVEL SECURITY
-- ████████████████████████████████████████████████████████████

alter table guardians         enable row level security;
alter table children          enable row level security;
alter table guardian_children enable row level security;
alter table services          enable row level security;
alter table checkins          enable row level security;
alter table volunteers        enable row level security;
alter table service_volunteers enable row level security;
alter table authorized_pickups enable row level security;
alter table profiles          enable row level security;
alter table roles             enable row level security;
alter table role_permissions  enable row level security;
alter table campuses          enable row level security;

-- Campuses
create policy campuses_select on campuses for select to authenticated using (true);
create policy campuses_write on campuses for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- Profiles
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_super_admin() or (is_admin() and campus_id = user_campus_id()));
create policy profiles_write on profiles for all to authenticated
  using (is_super_admin() or (is_admin() and campus_id = user_campus_id()))
  with check (is_super_admin() or (is_admin() and campus_id = user_campus_id()));

-- Roles
create policy roles_select on roles for select to authenticated using (true);
create policy roles_write on roles for all to authenticated
  using (is_admin()) with check (is_admin());

-- Role permissions
create policy rp_select on role_permissions for select to authenticated using (true);
create policy rp_write on role_permissions for all to authenticated
  using (is_admin()) with check (is_admin());

-- Guardians (globales)
create policy guardians_select on guardians for select to authenticated
  using (can('familias') or can('checkin') or can('checkout'));
create policy guardians_write on guardians for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- Children (globales)
create policy children_select on children for select to authenticated
  using (can('familias') or can('checkin') or can('checkout') or can('dashboard'));
create policy children_write on children for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- Guardian_children
create policy gc_select on guardian_children for select to authenticated
  using (can('familias') or can('checkin'));
create policy gc_write on guardian_children for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- Services (por campus)
create policy services_select on services for select to authenticated
  using (is_super_admin() or campus_id = user_campus_id() or can('checkin') or can('dashboard'));
create policy services_write on services for all to authenticated
  using (is_super_admin() or (can('servicios', true) and campus_id = user_campus_id()))
  with check (is_super_admin() or can('servicios', true));

-- Checkins (por campus)
create policy checkins_select on checkins for select to authenticated
  using (is_super_admin() or campus_id = user_campus_id() or campus_id is null);
create policy checkins_insert on checkins for insert to authenticated
  with check (can('checkin', true));
create policy checkins_update on checkins for update to authenticated
  using (is_super_admin() or (can('checkout', true) and (campus_id = user_campus_id() or campus_id is null)));

-- Volunteers (por campus)
create policy vol_select on volunteers for select to authenticated
  using (is_super_admin() or campus_id = user_campus_id());
create policy vol_write on volunteers for all to authenticated
  using (is_super_admin() or (can('voluntarios', true) and campus_id = user_campus_id()))
  with check (is_super_admin() or can('voluntarios', true));

-- Service volunteers
create policy sv_select on service_volunteers for select to authenticated
  using (is_super_admin() or exists (
    select 1 from services s where s.id = service_volunteers.service_id
    and (s.campus_id = user_campus_id() or is_super_admin())
  ));
create policy sv_write on service_volunteers for all to authenticated
  using (is_super_admin() or (can('voluntarios', true) and exists (
    select 1 from services s where s.id = service_volunteers.service_id
    and s.campus_id = user_campus_id()
  )))
  with check (is_super_admin() or can('voluntarios', true));

-- Authorized pickups (globales)
create policy ap_select on authorized_pickups for select to authenticated
  using (can('familias') or can('checkout') or can('checkin'));
create policy ap_write on authorized_pickups for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- ████████████████████████████████████████████████████████████
-- PARTE 7: PRIMER USUARIO ADMIN
-- ████████████████████████████████████████████████████████████
-- 👇 Después de crear tu primer usuario en Supabase Auth,
-- ejecuta esto con TU email para hacerlo super admin:
--
-- UPDATE profiles SET rol = 'super_admin' WHERE email = 'TU_EMAIL_AQUÍ';
--
-- ============================================================
-- ¡LISTO! Tu base de datos ARM Check-in está lista.
-- ============================================================
