-- ============================================================
-- v7: Tabla de suscripciones Push para pantalla Play
-- ============================================================

create table if not exists push_subscriptions (
  id         uuid        default gen_random_uuid() primary key,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz default now()
);

-- RLS: acceso abierto (las pantallas no tienen login)
alter table push_subscriptions enable row level security;

create policy "Cualquiera puede insertar suscripciones push"
  on push_subscriptions for insert
  to anon, authenticated
  with check (true);

create policy "Cualquiera puede leer suscripciones push"
  on push_subscriptions for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede eliminar suscripciones push"
  on push_subscriptions for delete
  to anon, authenticated
  using (true);
