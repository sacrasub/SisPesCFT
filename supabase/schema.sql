-- =====================================================================
-- SisPesCFT — Schema Supabase (Postgres)
-- Execute no SQL Editor do Supabase e defina NEXT_PUBLIC_DATA_BACKEND=supabase
-- =====================================================================

create table if not exists public.militares (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.afastamentos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.escalas (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.eventos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.parametros (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Índices úteis para consultas por período/divisão diretamente no banco
create index if not exists afastamentos_periodo_idx
  on public.afastamentos (((data->>'inicio')), ((data->>'fim')));
create index if not exists afastamentos_divisao_idx
  on public.afastamentos (((data->>'divisao')));
create index if not exists militares_divisao_idx
  on public.militares (((data->>'divisao')));

-- Realtime (sincronização entre usuários simultâneos)
alter publication supabase_realtime add table public.militares;
alter publication supabase_realtime add table public.afastamentos;
alter publication supabase_realtime add table public.escalas;
alter publication supabase_realtime add table public.eventos;
alter publication supabase_realtime add table public.parametros;

-- ---------------------------------------------------------------------
-- RLS — POLÍTICA PROVISÓRIA (desenvolvimento/homologação).
-- Em produção, habilite Supabase Auth e restrinja escrita por perfil/divisão,
-- por exemplo usando um claim "divisao" no JWT:
--   using ((auth.jwt() ->> 'perfil') = 'ADMIN'
--          or (data->>'divisao') = (auth.jwt() ->> 'divisao'))
-- ---------------------------------------------------------------------
alter table public.militares    enable row level security;
alter table public.afastamentos enable row level security;
alter table public.escalas      enable row level security;
alter table public.eventos      enable row level security;
alter table public.parametros   enable row level security;

create policy "acesso_dev_militares"    on public.militares    for all using (true) with check (true);
create policy "acesso_dev_afastamentos" on public.afastamentos for all using (true) with check (true);
create policy "acesso_dev_escalas"      on public.escalas      for all using (true) with check (true);
create policy "acesso_dev_eventos"      on public.eventos      for all using (true) with check (true);
create policy "acesso_dev_parametros"   on public.parametros   for all using (true) with check (true);
