-- Esquema PostgreSQL (compatible con Supabase) para la versión con inicio de sesión.
-- Cada fila lleva user_id: así cada persona solo ve lo suyo (Row Level Security).
-- Los nombres de columnas siguen los campos que ya usa la app (movements, securities, theses...).

create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users on delete cascade,   -- el inicio de sesión lo da Supabase Auth
  name text, display_currency text default 'MXN', fx numeric default 18,
  fmp_key_enc text, av_key_enc text,                              -- guárdalas cifradas, nunca en claro
  settings jsonb not null default '{}'                            -- topes, mezcla objetivo, semáforo
);

create table securities (
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null, name text, sector text, type text default 'stock',
  price numeric, price_updated timestamptz,
  primary key (user_id, ticker)
);

create table movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  type text not null check (type in ('compra','venta','dividendo','deposito','retiro')),
  ticker text, qty numeric default 0, price numeric default 0, fees numeric default 0,
  amount numeric default 0, currency text default 'USD', fx numeric,
  affects_cash boolean default true, reason text, sell_rules text,
  created_at timestamptz default now()
);
create index on movements (user_id, date);

create table theses (
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null, name text, status text, sector text,
  target_pct numeric, conviction text,
  q1 text, q2 text, q3 text, q4 text,
  filters jsonb default '[]',                                     -- 15 valores true/false/null
  prior_score int, sell_rules text, watch text, buy_plan text, notes text,
  primary key (user_id, ticker)
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null, pct numeric, n int, shares jsonb, conditions jsonb, done jsonb
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null, date date not null, "when" text, note text, confirmed boolean default true
);

create table journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null, ticker text, text text not null
);

create table guide_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  position int, title text, body text
);

-- Row Level Security: cada usuario solo accede a sus filas
do $$
declare t text;
begin
  foreach t in array array['securities','movements','theses','plans','reports','journal','guide_sections'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "dueño" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table profiles enable row level security;
create policy "dueño" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
