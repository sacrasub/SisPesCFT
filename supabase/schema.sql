-- =====================================================================
-- SisPesCFT v2.1 — Schema Supabase (PostgreSQL + Realtime)
-- Execute este script no SQL Editor do Supabase (https://supabase.com)
-- Utiliza prefixo 'sispes_' para isolamento total, permitindo coexistir
-- com outros projetos da Capitania (ex.: cft-itinerante) no mesmo banco.
-- =====================================================================

create table if not exists public.sispes_militares (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sispes_afastamentos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sispes_escalas (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sispes_eventos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sispes_trocas_servico (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sispes_parametros (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Índices otimizados para consultas por período, divisão e NIP
create index if not exists sispes_afastamentos_periodo_idx
  on public.sispes_afastamentos (((data->>'inicio')), ((data->>'fim')));
create index if not exists sispes_afastamentos_divisao_idx
  on public.sispes_afastamentos (((data->>'divisao')));
create index if not exists sispes_militares_divisao_idx
  on public.sispes_militares (((data->>'divisao')));
create index if not exists sispes_militares_nip_idx
  on public.sispes_militares (((data->>'nip')));
create index if not exists sispes_trocas_servico_data_idx
  on public.sispes_trocas_servico (((data->>'dataServicoOriginal')));

-- RLS (Row Level Security)
alter table public.sispes_militares enable row level security;
alter table public.sispes_afastamentos enable row level security;
alter table public.sispes_escalas enable row level security;
alter table public.sispes_eventos enable row level security;
alter table public.sispes_trocas_servico enable row level security;
alter table public.sispes_parametros enable row level security;

-- Políticas de Acesso
drop policy if exists "acesso_sispes_militares" on public.sispes_militares;
create policy "acesso_sispes_militares" on public.sispes_militares for all using (true) with check (true);

drop policy if exists "acesso_sispes_afastamentos" on public.sispes_afastamentos;
create policy "acesso_sispes_afastamentos" on public.sispes_afastamentos for all using (true) with check (true);

drop policy if exists "acesso_sispes_escalas" on public.sispes_escalas;
create policy "acesso_sispes_escalas" on public.sispes_escalas for all using (true) with check (true);

drop policy if exists "acesso_sispes_eventos" on public.sispes_eventos;
create policy "acesso_sispes_eventos" on public.sispes_eventos for all using (true) with check (true);

drop policy if exists "acesso_sispes_trocas_servico" on public.sispes_trocas_servico;
create policy "acesso_sispes_trocas_servico" on public.sispes_trocas_servico for all using (true) with check (true);

drop policy if exists "acesso_sispes_parametros" on public.sispes_parametros;
create policy "acesso_sispes_parametros" on public.sispes_parametros for all using (true) with check (true);

-- Supabase Realtime (sincronização bidirecional instantânea entre postos da CFT)
do $$
begin
  begin alter publication supabase_realtime add table public.sispes_militares; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_afastamentos; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_escalas; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_eventos; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_trocas_servico; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_parametros; exception when others then null; end;
end $$;
