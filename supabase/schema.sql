-- ============================================================
-- ARM Kids & Tweens Check-In  —  Esquema Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- TUTORES (padres / apoderados)
-- ----------------------------------------------------------------
create table if not exists guardians (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  apellido    text not null,
  telefono    text,
  email       text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- NIÑOS
-- ----------------------------------------------------------------
create table if not exists children (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  apellido         text not null,
  fecha_nacimiento date,
  ministerio       text not null check (ministerio in ('kids','tweens')),
  alergias         text,          -- visible/destacado en la etiqueta si existe
  notas_medicas    text,
  foto_url         text,
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- RELACIÓN TUTOR <-> NIÑO  (muchos a muchos)
-- ----------------------------------------------------------------
create table if not exists guardian_children (
  guardian_id  uuid not null references guardians(id) on delete cascade,
  child_id     uuid not null references children(id)  on delete cascade,
  parentesco   text,                          -- 'madre','padre','abuela'...
  es_principal boolean not null default false,
  primary key (guardian_id, child_id)
);

-- ----------------------------------------------------------------
-- SERVICIOS / CULTOS
-- ----------------------------------------------------------------
create table if not exists services (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,                   -- 'Culto Domingo AM'
  fecha      date not null,
  hora       time,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- CHECK-INS  (el corazón: enlaza niño + tutor + código de seguridad)
-- ----------------------------------------------------------------
create table if not exists checkins (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references children(id),
  service_id           uuid not null references services(id),
  checkin_guardian_id  uuid not null references guardians(id),  -- quién lo dejó
  checkout_guardian_id uuid references guardians(id),           -- quién lo retiró
  codigo_seguridad     text not null,
  estado               text not null default 'checked_in'
                         check (estado in ('checked_in','checked_out')),
  checkin_at           timestamptz not null default now(),
  checkout_at          timestamptz,
  checkin_by           uuid references auth.users(id),          -- staff que operó
  checkout_by          uuid references auth.users(id)
);

-- El código es único SOLO entre los niños presentes del mismo servicio.
-- Tras el check-out se puede reutilizar.
create unique index if not exists uq_codigo_activo
  on checkins (service_id, codigo_seguridad)
  where estado = 'checked_in';

create index if not exists idx_checkins_child   on checkins (child_id);
create index if not exists idx_checkins_service on checkins (service_id);
create index if not exists idx_checkins_estado  on checkins (estado);

-- ----------------------------------------------------------------
-- GENERADOR DE CÓDIGO  (alfabeto sin caracteres ambiguos 0/O, 1/I/L)
-- ----------------------------------------------------------------
create or replace function generate_security_code(len int default 4)
returns text
language plpgsql
as $$
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

-- ----------------------------------------------------------------
-- CHECK-IN ATÓMICO: genera un código libre y crea la sesión.
-- Llamar vía RPC:  supabase.rpc('do_checkin', {...})
-- ----------------------------------------------------------------
create or replace function do_checkin(
  p_child_id    uuid,
  p_service_id  uuid,
  p_guardian_id uuid
)
returns checkins
language plpgsql
as $$
declare
  v_code text;
  v_row  checkins;
  v_try  int := 0;
begin
  loop
    v_try := v_try + 1;
    v_code := generate_security_code(4);
    begin
      insert into checkins (child_id, service_id, checkin_guardian_id,
                            codigo_seguridad, checkin_by)
      values (p_child_id, p_service_id, p_guardian_id, v_code, auth.uid())
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_try >= 20 then
        raise exception 'No se pudo generar un código único tras % intentos', v_try;
      end if;
      -- colisión con un niño presente: reintenta con otro código
    end;
  end loop;
end;
$$;

-- ----------------------------------------------------------------
-- CHECK-OUT con verificación de código.
-- Falla si el código no coincide o el niño ya fue retirado.
-- ----------------------------------------------------------------
create or replace function do_checkout(
  p_checkin_id  uuid,
  p_codigo      text,
  p_guardian_id uuid
)
returns checkins
language plpgsql
as $$
declare
  v_row checkins;
begin
  update checkins
     set estado               = 'checked_out',
         checkout_at          = now(),
         checkout_guardian_id = p_guardian_id,
         checkout_by          = auth.uid()
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

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Herramienta interna: cualquier staff autenticado puede operar.
-- (Luego puedes restringir por rol, como en ARM Merch.)
-- ----------------------------------------------------------------
alter table guardians         enable row level security;
alter table children          enable row level security;
alter table guardian_children enable row level security;
alter table services          enable row level security;
alter table checkins          enable row level security;

drop policy if exists staff_all_guardians on guardians;
create policy staff_all_guardians on guardians
  for all to authenticated using (true) with check (true);

drop policy if exists staff_all_children on children;
create policy staff_all_children on children
  for all to authenticated using (true) with check (true);

drop policy if exists staff_all_guardian_children on guardian_children;
create policy staff_all_guardian_children on guardian_children
  for all to authenticated using (true) with check (true);

drop policy if exists staff_all_services on services;
create policy staff_all_services on services
  for all to authenticated using (true) with check (true);

drop policy if exists staff_all_checkins on checkins;
create policy staff_all_checkins on checkins
  for all to authenticated using (true) with check (true);
