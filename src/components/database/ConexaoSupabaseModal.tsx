"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useData } from "@/store/DataProvider";
import {
  obterConfiguracaoBackend,
  testarConexaoSupabase,
} from "@/lib/repository";
import {
  Database,
  Cloud,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  HardDrive,
  Radio,
  ExternalLink,
  Code2,
} from "lucide-react";

interface ConexaoSupabaseModalProps {
  aberto: boolean;
  onFechar: () => void;
}

const SQL_SCHEMA_CFT = `-- =====================================================================
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
create index if not exists sispes_afastamentos_periodo_idx on public.sispes_afastamentos (((data->>'inicio')), ((data->>'fim')));
create index if not exists sispes_afastamentos_divisao_idx on public.sispes_afastamentos (((data->>'divisao')));
create index if not exists sispes_militares_divisao_idx on public.sispes_militares (((data->>'divisao')));
create index if not exists sispes_militares_nip_idx on public.sispes_militares (((data->>'nip')));
create index if not exists sispes_trocas_servico_data_idx on public.sispes_trocas_servico (((data->>'dataServicoOriginal')));

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

-- Supabase Realtime (sincronização instantânea)
do $$
begin
  begin alter publication supabase_realtime add table public.sispes_militares; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_afastamentos; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_escalas; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_eventos; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_trocas_servico; exception when others then null; end;
  begin alter publication supabase_realtime add table public.sispes_parametros; exception when others then null; end;
end $$;`;

export function ConexaoSupabaseModal({ aberto, onFechar }: ConexaoSupabaseModalProps) {
  const { db, backend, conectarSupabase, desconectarSupabase, substituirTudo } = useData();

  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [migrarDados, setMigrarDados] = useState(true);
  const [testando, setTestando] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [exibirSql, setExibirSql] = useState(false);

  useEffect(() => {
    if (aberto) {
      const cfg = obterConfiguracaoBackend();
      setUrl(cfg.url || "");
      setAnonKey(cfg.key || "");
      setResultadoTeste(null);
    }
  }, [aberto]);

  const handleTestar = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setResultadoTeste({
        ok: false,
        mensagem: "Preencha a URL e a Anon Key do projeto Supabase para testar a conexão.",
      });
      return;
    }
    setTestando(true);
    setResultadoTeste(null);
    const res = await testarConexaoSupabase(url.trim(), anonKey.trim());
    setTestando(false);
    setResultadoTeste(res);
  };

  const handleConectar = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setResultadoTeste({
        ok: false,
        mensagem: "Informe a URL e a Anon Key antes de conectar.",
      });
      return;
    }
    setConectando(true);
    setResultadoTeste(null);

    // Testa primeiro para garantir
    const resTeste = await testarConexaoSupabase(url.trim(), anonKey.trim());
    if (!resTeste.ok) {
      setConectando(false);
      setResultadoTeste(resTeste);
      return;
    }

    const res = await conectarSupabase(url.trim(), anonKey.trim(), migrarDados);
    setConectando(false);
    if (res.ok) {
      setResultadoTeste({ ok: true, mensagem: res.mensagem });
      setTimeout(() => {
        onFechar();
      }, 1500);
    } else {
      setResultadoTeste({ ok: false, mensagem: res.mensagem });
    }
  };

  const handleDesconectar = async () => {
    await desconectarSupabase();
    setResultadoTeste({
      ok: true,
      mensagem: "Desconectado do Supabase. O sistema voltou a operar em Modo Local (LocalStorage).",
    });
  };

  const handleForcarUpload = async () => {
    if (!db || backend !== "supabase") return;
    setConectando(true);
    try {
      await substituirTudo(db);
      setResultadoTeste({
        ok: true,
        mensagem: "Base de dados local enviada com sucesso para o Supabase!",
      });
    } catch (e) {
      setResultadoTeste({
        ok: false,
        mensagem: `Erro ao enviar dados: ${(e as Error).message}`,
      });
    } finally {
      setConectando(false);
    }
  };

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_CFT);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Persistência em Nuvem (Supabase Postgres + Realtime)"
      maxLargura="xl"
    >
      <div className="space-y-5 text-sm">
        {/* Banner de Status Ativo */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            backend === "supabase"
              ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
              : "bg-slate-900/60 border-slate-700/80 text-slate-300"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              backend === "supabase"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {backend === "supabase" ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <HardDrive className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100">
                {backend === "supabase"
                  ? "Sincronização em Nuvem Ativa (Supabase)"
                  : "Modo Local Ativo (Navegador / LocalStorage)"}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  backend === "supabase"
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {backend === "supabase" ? "🟢 Realtime Conectado" : "Offline / Standalone"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {backend === "supabase"
                ? "Qualquer alteração em escalas, afastamentos ou papeletas de troca é transmitida instantaneamente a todos os computadores da CFT conectados ao mesmo projeto."
                : "Os dados ficam armazenados exclusivamente na memória deste navegador. Conecte ao Supabase para que o Sargenteante, Encarregados e Comando compartilhem a mesma escala."}
            </p>
          </div>
        </div>

        {/* Formulário de Configuração Supabase */}
        <div className="bg-navy-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Parâmetros de Conexão Supabase</span>
            </h3>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <span>Painel Supabase</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project URL (NEXT_PUBLIC_SUPABASE_URL)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://seu-projeto.supabase.co"
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Anon / Public API Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            {backend !== "supabase" && (
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={migrarDados}
                  onChange={(e) => setMigrarDados(e.target.checked)}
                  className="rounded border-slate-700 bg-navy-950 text-sky-500 focus:ring-sky-400 cursor-pointer w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  Enviar dados locais atuais para o Supabase (popula com os 64 militares, escalas e missões)
                </span>
              </label>
            )}
          </div>

          {/* Feedback de Teste / Conexão */}
          {resultadoTeste && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                resultadoTeste.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {resultadoTeste.ok ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{resultadoTeste.mensagem}</div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestar}
              disabled={testando || conectando}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testando ? "animate-spin text-sky-400" : ""}`} />
              <span>{testando ? "Testando Conexão..." : "Testar Conectividade"}</span>
            </button>

            <div className="flex items-center gap-2">
              {backend === "supabase" ? (
                <>
                  <button
                    type="button"
                    onClick={handleForcarUpload}
                    disabled={conectando}
                    className="px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 font-semibold text-xs transition flex items-center gap-1.5"
                    title="Forçar envio de todas as tabelas locais para a nuvem"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Sincronizar Tudo na Nuvem</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDesconectar}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs transition"
                  >
                    Desconectar Nuvem
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConectar}
                  disabled={conectando || testando}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{conectando ? "Conectando..." : "Conectar & Ativar Realtime"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Script SQL DDL e Guia de Implantação */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExibirSql(!exibirSql)}
              className="font-bold text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5"
            >
              <Code2 className="w-4 h-4" />
              <span>{exibirSql ? "Ocultar Schema SQL" : "Visualizar Script SQL DDL (supabase/schema.sql)"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarSql}
              className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
            >
              {copiado ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiado ? "Copiado!" : "Copiar SQL"}</span>
            </button>
          </div>

          {exibirSql && (
            <div className="relative">
              <pre className="p-3 rounded-xl bg-navy-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
                {SQL_SCHEMA_CFT}
              </pre>
            </div>
          )}

          <div className="text-[11px] text-slate-400 space-y-1">
            <p>
              <strong>Passo a passo rápido:</strong> 1. Abra o SQL Editor no Supabase; 2. Cole o script acima e clique em <em>Run</em>; 3. Copie a Project URL e a Anon Key em <em>Project Settings → API</em> e clique em <strong>Conectar & Ativar Realtime</strong>.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
