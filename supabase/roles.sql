-- ============================================================
-- ARM Kids & Tweens — ROLES Y PERMISOS GRANULARES
-- Ejecutar en Supabase → SQL Editor DESPUÉS de schema.sql.
-- ============================================================

-- ----------------------------------------------------------------
-- PERFILES  (1 por usuario de auth.users, con su rol)
-- ----------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  email      text,
  rol        text not null default 'lider',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists roles (
  slug       text primary key,        -- 'admin','lider','retiro'
  nombre     text not null,
  es_admin   boolean not null default false,  -- los admin saltan toda restricción
  created_at timestamptz not null default now()
);

-- Vínculo profiles.rol -> roles.slug (necesario para que la app lea el rol).
-- Idempotente: no falla si ya existe.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_rol_fkey'
  ) then
    alter table profiles
      add constraint profiles_rol_fkey foreign key (rol) references roles(slug);
  end if;
end $$;

-- ----------------------------------------------------------------
-- MATRIZ DE PERMISOS (rol × módulo)
-- ----------------------------------------------------------------
create table if not exists role_permissions (
  rol        text not null references roles(slug) on delete cascade,
  modulo     text not null,           -- 'dashboard','checkin','checkout','familias','servicios','usuarios'
  ver        boolean not null default false,
  gestionar  boolean not null default false,
  primary key (rol, modulo)
);

-- ----------------------------------------------------------------
-- FUNCIONES HELPER (security definer → evitan recursión de RLS)
-- ----------------------------------------------------------------
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
  select is_admin() or exists (
    select 1 from profiles p
    join role_permissions rp on rp.rol = p.rol
    where p.id = auth.uid() and p.activo = true
      and rp.modulo = p_modulo
      and rp.ver = true
      and (p_gestionar = false or rp.gestionar = true)
  );
$$;

-- ----------------------------------------------------------------
-- TRIGGER: crear perfil automáticamente al registrar un usuario
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- SEED: roles base y su matriz de permisos por defecto
-- ----------------------------------------------------------------
insert into roles (slug, nombre, es_admin) values
  ('admin',  'Administrador', true),
  ('lider',  'Líder',         false),
  ('retiro', 'Solo retiro',   false)
on conflict (slug) do nothing;

-- (admin no necesita filas: salta todo vía is_admin)
insert into role_permissions (rol, modulo, ver, gestionar) values
  ('lider','dashboard', true,  false),
  ('lider','checkin',   true,  true),
  ('lider','checkout',  true,  true),
  ('lider','familias',  true,  true),
  ('lider','servicios', true,  true),
  ('lider','usuarios',  false, false),
  ('retiro','dashboard', true,  false),
  ('retiro','checkin',   false, false),
  ('retiro','checkout',  true,  true),
  ('retiro','familias',  false, false),
  ('retiro','servicios', false, false),
  ('retiro','usuarios',  false, false)
on conflict (rol, modulo) do nothing;

-- ----------------------------------------------------------------
-- BOOTSTRAP: dar perfil a los usuarios existentes y nombrar admin
-- ----------------------------------------------------------------
insert into profiles (id, email, rol)
select id, email, 'lider' from auth.users
on conflict (id) do nothing;

-- 👇 CAMBIA este email por el de TU cuenta de administrador:
update profiles set rol = 'admin' where email = 'admin@kids.cl';

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
alter table profiles         enable row level security;
alter table roles            enable row level security;
alter table role_permissions enable row level security;

-- profiles: cada quien ve el suyo; el admin ve/edita todos
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists profiles_write on profiles;
create policy profiles_write on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

-- roles y permisos: lectura para todos (para pintar la UI), escritura solo admin
drop policy if exists roles_select on roles;
create policy roles_select on roles for select to authenticated using (true);
drop policy if exists roles_write on roles;
create policy roles_write on roles for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists rp_select on role_permissions;
create policy rp_select on role_permissions for select to authenticated using (true);
drop policy if exists rp_write on role_permissions;
create policy rp_write on role_permissions for all to authenticated
  using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------
-- RLS de las tablas de dominio: reemplaza las políticas "todo a todos"
-- por políticas que respetan los permisos por módulo.
-- ----------------------------------------------------------------
-- GUARDIANS
drop policy if exists staff_all_guardians on guardians;
drop policy if exists guardians_select on guardians;
create policy guardians_select on guardians for select to authenticated
  using (can('familias') or can('checkin'));
drop policy if exists guardians_write on guardians;
create policy guardians_write on guardians for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- CHILDREN  (lectura amplia: se usan en varios módulos)
drop policy if exists staff_all_children on children;
drop policy if exists children_select on children;
create policy children_select on children for select to authenticated
  using (can('familias') or can('checkin') or can('checkout') or can('dashboard'));
drop policy if exists children_write on children;
create policy children_write on children for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- GUARDIAN_CHILDREN
drop policy if exists staff_all_guardian_children on guardian_children;
drop policy if exists gc_select on guardian_children;
create policy gc_select on guardian_children for select to authenticated
  using (can('familias') or can('checkin'));
drop policy if exists gc_write on guardian_children;
create policy gc_write on guardian_children for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- SERVICES
drop policy if exists staff_all_services on services;
drop policy if exists services_select on services;
create policy services_select on services for select to authenticated
  using (can('servicios') or can('checkin') or can('dashboard'));
drop policy if exists services_write on services;
create policy services_write on services for all to authenticated
  using (can('servicios', true)) with check (can('servicios', true));

-- CHECKINS
drop policy if exists staff_all_checkins on checkins;
drop policy if exists checkins_select on checkins;
create policy checkins_select on checkins for select to authenticated
  using (can('dashboard') or can('checkin') or can('checkout'));
drop policy if exists checkins_insert on checkins;
create policy checkins_insert on checkins for insert to authenticated
  with check (can('checkin', true));
drop policy if exists checkins_update on checkins;
create policy checkins_update on checkins for update to authenticated
  using (can('checkout', true)) with check (can('checkout', true));
