-- =====================================================================
-- CAPITANIA FLUVIAL DE TABATINGA (CFT) — MARINHA DO BRASIL
-- BANCO ÚNICO CFT: SisPesCFT + Capitania Itinerante EPM & STA
-- Execute este script no SQL Editor do Supabase (https://supabase.com)
-- =====================================================================

-- 1. CADASTRO MESTRE DO EFETIVO (public.militares)
alter table public.militares
  add column if not exists sispes_id text unique,
  add column if not exists divisao text,
  add column if not exists setor_codigo text,
  add column if not exists antiguidade int,
  add column if not exists situacao text default 'PRONTO',
  add column if not exists email_funcional text,
  add column if not exists email_pessoal text,
  add column if not exists sispes_dados jsonb not null default '{}'::jsonb,
  add column if not exists excluido_em timestamptz;

create index if not exists idx_militares_divisao on public.militares (divisao);
create index if not exists idx_militares_ativos on public.militares (nip) where excluido_em is null;
create index if not exists idx_militares_sispes_id on public.militares (sispes_id);

-- 2. LIMPEZA DE DADOS FICTÍCIOS DE DEMONSTRAÇÃO
delete from public.missao_cronograma
 where missao_id in (select id from public.missoes where codigo = 'MIS-2026-09-AMT-SAI');

delete from public.missao_militares
 where missao_id in (select id from public.missoes where codigo = 'MIS-2026-09-AMT-SAI');

delete from public.missoes
 where codigo = 'MIS-2026-09-AMT-SAI';

delete from public.missoes_itinerantes
 where codigo_missao = 'ITN-AMA-2026-01' or codigo_missao like '%AMT-SAI%';

-- 3. TABELAS EXCLUSIVAS DO SISPESCFT
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

create index if not exists sispes_afastamentos_periodo_idx
  on public.sispes_afastamentos (((data->>'inicio')), ((data->>'fim')));

create index if not exists sispes_afastamentos_divisao_idx
  on public.sispes_afastamentos (((data->>'divisao')));

create index if not exists sispes_trocas_servico_data_idx
  on public.sispes_trocas_servico (((data->>'dataServicoOriginal')));

-- 4. POLÍTICAS RLS (Row Level Security)
alter table public.militares enable row level security;
alter table public.sispes_afastamentos enable row level security;
alter table public.sispes_escalas enable row level security;
alter table public.sispes_eventos enable row level security;
alter table public.sispes_trocas_servico enable row level security;
alter table public.sispes_parametros enable row level security;

drop policy if exists "Permitir leitura e escrita de militares" on public.militares;
create policy "Permitir leitura e escrita de militares" on public.militares for all using (true) with check (true);

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

-- 5. SINCRONIZAÇÃO EM TEMPO REAL (Supabase Realtime)
do $$
begin
  begin alter publication supabase_realtime add table public.militares; exception when others then null; end;
  begin alter publication supabase_realtime add table public.missoes; exception when others then null; end;
  begin alter publication supabase_realtime add table public.missao_militares; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_afastamentos; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_escalas; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_eventos; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_trocas_servico; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_parametros; exception when others then null; end;
end $$;

-- 6. VIEWS UNIFICADAS PARA O SISTEMA ITINERANTE E SISPESCFT
create or replace view public.v_agenda_militar as
  select m.nip, m.nome_guerra, 'ITINERANTE'::text as origem, mi.codigo as referencia,
         mi.nome as titulo, mi.data_inicio as inicio, mi.data_fim as fim, mi.status
    from public.missao_militares mm
    join public.missoes mi on mi.id = mm.missao_id
    left join public.militares m on m.nip = mm.nip
   where mi.status <> 'CANCELADA'
  union all
  select m.nip, m.nome_guerra, 'SISPES'::text as origem, a.id as referencia,
         (a.data->>'titulo')::text as titulo,
         (a.data->>'inicio')::date as inicio,
         (a.data->>'fim')::date as fim,
         (a.data->>'status')::text as status
    from public.sispes_afastamentos a
    cross join lateral jsonb_array_elements_text(a.data->'militarIds') as mid(sispes_id)
    join public.militares m on (m.sispes_id = mid.sispes_id or m.nip = mid.sispes_id)
   where coalesce(a.data->>'status','') <> 'CANCELADO';

create or replace view public.v_missao_equipe as
  select mi.codigo, mi.nome, mi.data_inicio, mi.data_fim, mi.status,
         mm.nip, mm.funcao_comissao,
         coalesce(m.posto_grad, mm.posto_graduacao) as posto,
         coalesce(m.nome_guerra, mm.nome_guerra) as nome_guerra,
         (m.id is not null) as nip_cadastrado
    from public.missoes mi
    join public.missao_militares mm on mm.missao_id = mi.id
    left join public.militares m on m.nip = mm.nip;
