"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useDb } from "@/store/DataProvider";
import { resumoEfetivo } from "@/lib/engine/disponibilidade";
import { coberturaPeriodo } from "@/lib/engine/escalas";
import { gerarAlertas, type Alerta } from "@/lib/engine/alertas";
import { ESCALA_LABEL, DIVISAO_MAP } from "@/lib/constants";
import { fmtDiaMes, fmt, addDays } from "@/lib/dates";
import { CoberturaBadge, DivisaoBadge, PostoChip, StatusLancamentoBadge } from "@/components/ui/Badge";
import {
  Users,
  ShieldCheck,
  Compass,
  GraduationCap,
  Palmtree,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Activity,
  CalendarCheck,
  PlusCircle,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import type { DivisaoId, StatusPresenca } from "@/lib/types";

export default function DashboardPage() {
  const { db, ctx, hoje } = useDb();
  const [dataSelecionada, setDataSelecionada] = useState<string>(hoje);
  const [filtroDivisao, setFiltroDivisao] = useState<DivisaoId | "TODAS">("TODAS");
  const [filtroStatus, setFiltroStatus] = useState<StatusPresenca | "TODOS">("TODOS");
  const [busca, setBusca] = useState("");

  // Cálculo de resumo na data selecionada
  const resumo = useMemo(
    () => resumoEfetivo(ctx, dataSelecionada),
    [ctx, dataSelecionada]
  );

  // Alertas consolidados no horizonte parametrizado (ex: 45 dias)
  const alertas = useMemo(
    () => gerarAlertas(ctx, hoje, db.parametros.horizonteAlertasDias),
    [ctx, hoje, db.parametros.horizonteAlertasDias]
  );

  // Status de cobertura das 4 escalas para hoje e próximos 7 dias
  const escalasStatus = useMemo(() => {
    return db.escalas.map((escala) => {
      const coberturas = coberturaPeriodo(ctx, escala, hoje, addDays(hoje, 7));
      const hojeCob = coberturas[0];
      const criticos = coberturas.filter(
        (c) => c.status === "CRITICO" || c.status === "SEM_COBERTURA"
      ).length;
      return {
        escala,
        hojeCob,
        criticosProximosDias: criticos,
      };
    });
  }, [db.escalas, ctx, hoje]);

  // Lista de militares filtrados para o quadro detalhado de presença do dia
  const militaresFiltrados = useMemo(() => {
    return ctx.militares.filter((m) => {
      if (filtroDivisao !== "TODAS" && m.divisao !== filtroDivisao) return false;
      const presencaInfo = resumo.afastados.find((a) => a.militar.id === m.id);
      const statusAtual: StatusPresenca = presencaInfo
        ? presencaInfo.status
        : "DISPONIVEL";
      if (filtroStatus !== "TODOS" && statusAtual !== filtroStatus) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchNome = m.nomeCompleto.toLowerCase().includes(termo);
        const matchGuerra = m.nomeGuerra.toLowerCase().includes(termo);
        const matchNip = m.nip.includes(termo);
        if (!matchNome && !matchGuerra && !matchNip) return false;
      }
      return true;
    });
  }, [ctx.militares, filtroDivisao, filtroStatus, busca, resumo.afastados]);

  return (
    <div className="space-y-6">
      {/* Top Banner de Boas-vindas & Seleção da Data de Análise */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <Compass className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Dashboard Central de Pessoal
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Capitania Fluvial de Tabatinga • Visão unificada de efetivo, missões, cursos e escalas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gold-400" />
            <span>Data Base:</span>
          </label>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="input text-xs py-1.5 px-3 w-auto font-mono bg-navy-900 border-slate-700"
          />
          {dataSelecionada !== hoje && (
            <button
              onClick={() => setDataSelecionada(hoje)}
              className="text-[11px] px-2 py-1 rounded-lg bg-navy-800 text-gold-400 hover:bg-navy-700 font-medium"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Grid de KPIs Institucionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Efetivo */}
        <div className="card p-4 sm:p-5 card-hover">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Efetivo Total
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-slate-100">
              {resumo.total}
            </span>
            <span className="text-xs text-slate-400">militares ativos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>CFT Tabatinga</span>
          </div>
        </div>

        {/* Militares Disponíveis */}
        <div className="card p-4 sm:p-5 card-hover border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Disponíveis
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-400">
              {resumo.disponiveis}
            </span>
            <span className="text-xs text-emerald-400/80 font-mono">
              ({Math.round((resumo.disponiveis / (resumo.total || 1)) * 100)}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Expediente e escalas regulares
          </div>
        </div>

        {/* Em Missão / Cursos / IN */}
        <div className="card p-4 sm:p-5 card-hover border-cyan-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Missão / Cursos
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-cyan-300">
              {resumo.emMissao}
            </span>
            <span className="text-xs text-cyan-400/80 font-mono">
              ({Math.round((resumo.emMissao / (resumo.total || 1)) * 100)}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>STA: {resumo.missao.STA}</span> •
            <span>EPM: {resumo.missao.EPM}</span> •
            <span>IN: {resumo.missao.INSPECAO_NAVAL}</span>
          </div>
        </div>

        {/* Férias / Afastamentos */}
        <div className="card p-4 sm:p-5 card-hover border-amber-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Férias / Licença
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Palmtree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-amber-300">
              {resumo.ferias + resumo.licencas}
            </span>
            <span className="text-xs text-amber-400/80 font-mono">
              ({Math.round(((resumo.ferias + resumo.licencas) / (resumo.total || 1)) * 100)}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Férias: {resumo.ferias} • Licenças: {resumo.licencas}
          </div>
        </div>
      </div>

      {/* Seção 2: Indicador de Suficiência das Escalas & Painel de Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Cobertura das Escalas (2 colunas em telas grandes) */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-gold-400" />
              <h2 className="text-base font-bold text-slate-100">
                Suficiência das Escalas de Serviço
              </h2>
            </div>
            <Link
              href="/escalas"
              className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 font-semibold"
            >
              <span>Ver grade completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {escalasStatus.map(({ escala, hojeCob, criticosProximosDias }) => {
              const regimeTxt =
                hojeCob.regime < 1
                  ? "Sem Cobertura"
                  : `${hojeCob.regime} por 1`;
              return (
                <div
                  key={escala.id}
                  className="p-4 rounded-xl bg-navy-900/80 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        {escala.nome}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Alvo: {escala.regimeAlvo} por 1 • Mínimo: {escala.limiteSeguranca} por 1
                      </div>
                    </div>
                    <CoberturaBadge status={hojeCob.status} size="sm" />
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        Regime Hoje
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-100">
                        {regimeTxt}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        Aptos / Total
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-200">
                        <span className="text-emerald-400">{hojeCob.aptos}</span> / {hojeCob.efetivo}
                      </div>
                    </div>
                  </div>

                  {criticosProximosDias > 0 && (
                    <div className="mt-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{criticosProximosDias} dia(s) crítico(s) nos próximos 7 dias</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas Críticos do Horizonte */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-100">
                Alertas da Capitania
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-navy-800 text-slate-300 border border-slate-700">
              {alertas.length} no horizonte
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {alertas.length === 0 ? (
              <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800 text-center text-xs text-slate-400">
                Nenhum gargalo de escala ou conflito detectado no horizonte.
              </div>
            ) : (
              alertas.slice(0, 6).map((alerta) => (
                <Link
                  key={alerta.id}
                  href={alerta.href || "#"}
                  className={`block p-3 rounded-xl border transition ${
                    alerta.nivel === "critico"
                      ? "bg-rose-950/30 border-rose-800/40 hover:border-rose-600/60 text-rose-200"
                      : alerta.nivel === "atencao"
                      ? "bg-amber-950/30 border-amber-800/40 hover:border-amber-600/60 text-amber-200"
                      : "bg-navy-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold leading-tight">
                      {alerta.titulo}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        alerta.nivel === "critico"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {alerta.nivel}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-1 leading-normal">
                    {alerta.detalhe}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Seção 3: Quadro Diário do Efetivo da Capitania */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gold-400" />
              <span>Quadro de Efetivo do Dia ({fmtDiaMes(dataSelecionada)})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Situação detalhada de cada militar da Capitania na data selecionada.
            </p>
          </div>

          <Link
            href="/lancamentos"
            className="px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto transition shadow-md shadow-gold-900/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </Link>
        </div>

        {/* Filtros da Tabela */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-navy-900/80 border border-slate-800">
          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome ou NIP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input text-xs pl-8 py-2"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>

          {/* Divisão */}
          <select
            value={filtroDivisao}
            onChange={(e) => setFiltroDivisao(e.target.value as any)}
            className="input text-xs py-2 bg-navy-900"
          >
            <option value="TODAS">Todas as Divisões</option>
            {Object.values(DIVISAO_MAP).map((d) => (
              <option key={d.id} value={d.id}>
                {d.sigla} — {d.nome}
              </option>
            ))}
          </select>

          {/* Situação */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="input text-xs py-2 bg-navy-900"
          >
            <option value="TODOS">Todas as Situações</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="MISSAO">Em Missão</option>
            <option value="CURSO">Em Curso</option>
            <option value="INSPECAO_NAVAL">Inspeção Naval</option>
            <option value="FERIAS">Férias</option>
            <option value="LICENCA">Licença</option>
            <option value="DISPENSA">Dispensa</option>
          </select>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Militar</th>
                <th className="py-3 px-3">NIP</th>
                <th className="py-3 px-3">Divisão</th>
                <th className="py-3 px-3">Situação Atual</th>
                <th className="py-3 px-3">Escalas</th>
                <th className="py-3 px-3">Restrições</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {militaresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Nenhum militar encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                militaresFiltrados.map((m) => {
                  const afastadoInfo = resumo.afastados.find(
                    (a) => a.militar.id === m.id
                  );
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-navy-900/50 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <PostoChip posto={m.posto} />
                          <span className="font-bold text-slate-100">
                            {m.nomeGuerra}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {m.nomeCompleto}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {m.nip}
                      </td>
                      <td className="py-2.5 px-3">
                        <DivisaoBadge divisao={m.divisao} />
                      </td>
                      <td className="py-2.5 px-3">
                        {afastadoInfo ? (
                          <div>
                            <span className="font-bold text-cyan-300">
                              {afastadoInfo.afastamento.titulo}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {fmt(afastadoInfo.afastamento.inicio)} até{" "}
                              {fmt(afastadoInfo.afastamento.fim)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Disponível
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {m.escalas.length > 0 ? (
                            m.escalas.map((esc) => (
                              <span
                                key={esc}
                                className="px-1.5 py-0.5 rounded bg-navy-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                              >
                                {ESCALA_LABEL[esc]}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {m.restricoes.length > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40 text-[10px] font-semibold">
                            {m.restricoes.map((r) => r.tipo).join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Nenhuma</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
