-- ============================================================
-- ARM Check-in — v5: Sistema de llamado de retiro (Pickup Calls)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de v4/FULL_SETUP.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Tabla de llamados de retiro
-- ----------------------------------------------------------------
create table if not exists pickup_calls (
  id           uuid primary key default gen_random_uuid(),
  guardian_id  uuid not null references guardians(id),
  service_id   uuid not null references services(id),
  campus_id    uuid references campuses(id),
  estado       text not null default 'pendiente'
               check (estado in ('pendiente','en_camino','entregado','cancelado')),
  created_at   timestamptz not null default now(),
  atendido_at  timestamptz,
  atendido_by  uuid references auth.users(id)
);

create index if not exists idx_pc_service on pickup_calls(service_id);
create index if not exists idx_pc_guardian on pickup_calls(guardian_id);
create index if not exists idx_pc_estado on pickup_calls(estado);
create index if not exists idx_pc_created on pickup_calls(created_at desc);

-- ----------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------
alter table pickup_calls enable row level security;

-- Lectura: cualquier autenticado (voluntarios en pantalla)
create policy pc_select on pickup_calls for select to authenticated
  using (true);

-- Insert: autenticado o desde service role (punto de escaneo)
create policy pc_insert on pickup_calls for insert to authenticated
  with check (true);

-- Update: voluntarios que atienden
create policy pc_update on pickup_calls for update to authenticated
  using (can('checkout', true));

-- ----------------------------------------------------------------
-- 3. Habilitar Realtime en esta tabla
-- ----------------------------------------------------------------
alter publication supabase_realtime add table pickup_calls;

-- ----------------------------------------------------------------
-- 4. Función para crear un llamado (evita duplicados en el mismo servicio)
-- ----------------------------------------------------------------
create or replace function do_pickup_call(
  p_guardian_id uuid,
  p_service_id  uuid
)
returns pickup_calls language plpgsql security definer as $$
declare
  v_row pickup_calls;
  v_campus uuid;
begin
  -- Obtener campus del servicio
  select campus_id into v_campus from services where id = p_service_id;

  -- Si ya hay un llamado pendiente/en_camino para este guardian en este servicio, retornarlo
  select * into v_row from pickup_calls
    where guardian_id = p_guardian_id
      and service_id = p_service_id
      and estado in ('pendiente', 'en_camino');
  
  if v_row.id is not null then
    return v_row;
  end if;

  -- Crear nuevo llamado
  insert into pickup_calls (guardian_id, service_id, campus_id)
  values (p_guardian_id, p_service_id, v_campus)
  returning * into v_row;

  return v_row;
end;
$$;
