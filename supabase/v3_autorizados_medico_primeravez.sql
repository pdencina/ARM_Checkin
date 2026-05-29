-- ============================================================
-- ARM Kids & Tweens — v3: Autorizados · Médico · Primera vez
-- Ejecutar en Supabase → SQL Editor DESPUÉS de v2.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Extender children con ficha médica completa
-- ----------------------------------------------------------------
alter table children
  add column if not exists condiciones              text,
  add column if not exists medicamentos             text,
  add column if not exists contacto_emergencia_nombre   text,
  add column if not exists contacto_emergencia_telefono text;

-- ----------------------------------------------------------------
-- 2. Autorizados de retiro (por niño)
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 3. Primera vez en checkins + quién retiró (texto libre)
-- ----------------------------------------------------------------
alter table checkins
  add column if not exists primera_vez    boolean not null default false,
  add column if not exists checkout_nombre text;

-- ----------------------------------------------------------------
-- 4. Campus en servicios (simple campo texto, sin FK extra)
-- ----------------------------------------------------------------
alter table services
  add column if not exists campus text not null default 'Principal';

-- ----------------------------------------------------------------
-- 5. Servicios recurrentes
-- ----------------------------------------------------------------
alter table services
  add column if not exists es_recurrente boolean not null default false,
  add column if not exists dia_semana    int,   -- 0=dom,1=lun...6=sab
  add column if not exists hora_default  time;

-- ----------------------------------------------------------------
-- 6. Actualizar do_checkin: detectar primera vez automáticamente
-- ----------------------------------------------------------------
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
  -- Detectar si es primera vez (ningún check-in previo para este niño)
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

-- ----------------------------------------------------------------
-- 7. Actualizar do_checkout: registrar nombre de quien retira
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 8. RLS para autorizados de retiro
-- ----------------------------------------------------------------
alter table authorized_pickups enable row level security;

drop policy if exists ap_select on authorized_pickups;
create policy ap_select on authorized_pickups for select to authenticated
  using (can('familias') or can('checkout') or can('checkin'));

drop policy if exists ap_write on authorized_pickups;
create policy ap_write on authorized_pickups for all to authenticated
  using (can('familias', true)) with check (can('familias', true));

-- ----------------------------------------------------------------
-- 9. Agregar módulo reportes a role_permissions
-- ----------------------------------------------------------------
insert into role_permissions (rol, modulo, ver, gestionar) values
  ('lider',  'reportes', true,  false),
  ('retiro', 'reportes', false, false)
on conflict (rol, modulo) do nothing;
