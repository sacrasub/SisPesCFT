-- =====================================================================
-- SisPesCFT v2.1 — Schema Supabase (PostgreSQL + Realtime)
-- Execute este script no SQL Editor do seu projeto Supabase (https://supabase.com).
-- Ele cria todas as tabelas, índices de busca rápida, políticas de segurança
-- e ativa o Supabase Realtime para sincronização simultânea entre estações da CFT.
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

create table if not exists public.trocas_servico (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.parametros (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Índices otimizados para consultas por período, divisão e NIP
create index if not exists afastamentos_periodo_idx
  on public.afastamentos (((data->>'inicio')), ((data->>'fim')));
create index if not exists afastamentos_divisao_idx
  on public.afastamentos (((data->>'divisao')));
create index if not exists militares_divisao_idx
  on public.militares (((data->>'divisao')));
create index if not exists militares_nip_idx
  on public.militares (((data->>'nip')));
create index if not exists trocas_servico_data_idx
  on public.trocas_servico (((data->>'dataServicoOriginal')));

-- Supabase Realtime (sincronização bidirecional instantânea entre postos/estações)
alter publication supabase_realtime add table public.militares;
alter publication supabase_realtime add table public.afastamentos;
alter publication supabase_realtime add table public.escalas;
alter publication supabase_realtime add table public.eventos;
alter publication supabase_realtime add table public.trocas_servico;
alter publication supabase_realtime add table public.parametros;

-- ---------------------------------------------------------------------
-- RLS (Row Level Security) — Políticas de Acesso
-- ---------------------------------------------------------------------
alter table public.militares      enable row level security;
alter table public.afastamentos   enable row level security;
alter table public.escalas        enable row level security;
alter table public.eventos        enable row level security;
alter table public.trocas_servico enable row level security;
alter table public.parametros     enable row level security;

-- Políticas de desenvolvimento / homologação aberta para rede interna CFT
create policy "acesso_militares"      on public.militares      for all using (true) with check (true);
create policy "acesso_afastamentos"   on public.afastamentos   for all using (true) with check (true);
create policy "acesso_escalas"        on public.escalas        for all using (true) with check (true);
create policy "acesso_eventos"        on public.eventos        for all using (true) with check (true);
create policy "acesso_trocas_servico" on public.trocas_servico for all using (true) with check (true);
create policy "acesso_parametros"     on public.parametros     for all using (true) with check (true);
