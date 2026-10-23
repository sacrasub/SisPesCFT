"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  ESCALA_LABEL,
  COBERTURA_META,
  RESTRICAO_META,
} from "@/lib/constants";
import {
  addDays,
  fmt,
  fmtDiaMes,
  fmtPeriodo,
  isFimDeSemana,
  diaSemana,
  DIAS_SEMANA_CURTOS,
  MESES,
  inicioMes,
} from "@/lib/dates";
import { nomeMilitar, fmtRegime } from "@/lib/utils";
import {
  gerarEscala,
  coberturaPeriodo,
  efetivoEscala,
  contagemServicos,
  gerarGradeSOMOR,
  corHabilitacaoIN,
  SOMOR_COR,
} from "@/lib/engine/escalas";
import { indisponibilidadeEscala } from "@/lib/engine/disponibilidade";
import { CoberturaBadge, PostoChip, RestricaoBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  CalendarCheck,
  Calendar,
  AlertTriangle,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
  TableProperties,
  Zap,
} from "lucide-react";
import type { EscalaTipo, ISODate, Militar } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de modo de visualização
// ─────────────────────────────────────────────────────────────────────────────
type ModoViz = "lista" | "somor";

export default function EscalasPage() {
  const { db, ctx, hoje, salvar } = useDb();
  const { usuario } = useAuth();

  // Escala ativa
  const [escalaId, setEscalaId] = useState<EscalaTipo>("CONTRAMESTRE");
  // Modo de visualização
  const [modoViz, setModoViz] = useState<ModoViz>("lista");
  // Período de visualização (modo lista): janela de 14 ou 30 dias
  const [inicioPeriodo, setInicioPeriodo] = useState<ISODate>(hoje);
  const [diasJanela, setDiasJanela] = useState<number>(14);
  // Mês/Ano da Grade SOMOR
  const anoHoje = Number(hoje.slice(0, 4));
  const mes0Hoje = Number(hoje.slice(5, 7)) - 1;
  const [mesSOMOR, setMesSOMOR] = useState<number>(mes0Hoje);
  const [anoSOMOR, setAnoSOMOR] = useState<number>(anoHoje);
  const [caboVolante, setCaboVolante] = useState(false);

  // Modal de Detalhes do Dia
  const [diaSelecionado, setDiaSelecionado] = useState<ISODate | null>(null);

  // Escala selecionada
  const escala = useMemo(
    () => db.escalas.find((e) => e.id === escalaId) || db.escalas[0],
    [db.escalas, escalaId]
  );

  const fimPeriodo = useMemo(
    () => addDays(inicioPeriodo, diasJanela - 1),
    [inicioPeriodo, diasJanela]
  );

  // Previsão gerada pelo motor justo (modo lista)
  const escalaGerada = useMemo(() => {
    return gerarEscala(ctx, escala, inicioPeriodo, fimPeriodo);
  }, [ctx, escala, inicioPeriodo, fimPeriodo]);

  // Efetivo total da escala
  const pool = useMemo(() => efetivoEscala(ctx, escala), [ctx, escala]);

  // Contagem de serviços
  const contagem = useMemo(() => contagemServicos(escalaGerada), [escalaGerada]);

  // Dias críticos
  const diasCriticos = useMemo(
    () =>
      escalaGerada.filter(
        (s) =>
          s.cobertura.status === "CRITICO" ||
          s.cobertura.status === "SEM_COBERTURA"
      ),
    [escalaGerada]
  );

  // Grade SOMOR
  const gradeSOMOR = useMemo(() => {
    if (modoViz !== "somor") return null;
    return gerarGradeSOMOR(ctx, escalaId, anoSOMOR, mesSOMOR, caboVolante);
  }, [ctx, escalaId, anoSOMOR, mesSOMOR, caboVolante, modoViz]);

  // Navegar período (modo lista)
  const navegar = (deltaDias: number) => {
    setInicioPeriodo(addDays(inicioPeriodo, deltaDias));
  };

  // Navegar mês SOMOR
  const navegarMesSOMOR = (delta: number) => {
    let m = mesSOMOR + delta;
    let a = anoSOMOR;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMesSOMOR(m);
    setAnoSOMOR(a);
  };

  // Detalhes do dia selecionado
  const detalhesDia = useMemo(() => {
    if (!diaSelecionado) return null;
    return escalaGerada.find((s) => s.data === diaSelecionado);
  }, [escalaGerada, diaSelecionado]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <CalendarCheck className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Gestão e Otimização de Escalas de Serviço
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Contramestre (24h), Motoristas, Vigias e Equipes Rotativas de Inspeção Naval.
          </p>
        </div>

        {/* Seletor de Escalas em Abas */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-slate-800 overflow-x-auto max-w-full">
          {db.escalas.map((e) => {
            const ativa = e.id === escalaId;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEscalaId(e.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  ativa
                    ? "bg-gold-500 text-navy-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-navy-800"
                }`}
              >
                {ESCALA_LABEL[e.id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seletor de Modo de Visualização */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setModoViz("lista")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
            modoViz === "lista"
              ? "bg-gold-500/20 border-gold-500/50 text-gold-300"
              : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Previsão Diária
        </button>
        <button
          onClick={() => setModoViz("somor")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
            modoViz === "somor"
              ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300"
              : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <TableProperties className="w-3.5 h-3.5" /> Grade Mensal (Padrão SOMOR)
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODO LISTA                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {modoViz === "lista" && (
        <>
          {/* Cartão Informativo da Escala & Alerta Crítico */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Info da Escala */}
            <div className="card p-4 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    {escala.nome}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-gold-400 border border-slate-700">
                    Modo: {escala.modo === "EQUIPES" ? "Equipes Rotativas" : "Individual"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{escala.descricao}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-300 font-mono flex-wrap">
                  <span>Alvo: {fmtRegime(escala.regimeAlvo)}</span> •
                  <span>Mínimo de Segurança: {fmtRegime(escala.limiteSeguranca)}</span> •
                  <span>Efetivo total: {pool.length} militares</span>
                </div>
              </div>

              {/* Seletor de Janela de Dias e Navegação */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => navegar(-diasJanela)}
                  className="p-2 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                  title="Período anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center px-2">
                  <div className="text-xs font-bold font-mono text-slate-100">
                    {fmtPeriodo(inicioPeriodo, fimPeriodo)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {diasJanela} dias de previsão
                  </div>
                </div>
                <button
                  onClick={() => navegar(diasJanela)}
                  className="p-2 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                  title="Próximo período"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInicioPeriodo(hoje)}
                  className="ml-1 text-[11px] px-2.5 py-1.5 rounded-xl bg-navy-800 text-gold-400 hover:bg-navy-700 font-semibold"
                >
                  Hoje
                </button>
              </div>
            </div>

            {/* Alerta de Dias Críticos */}
            <div
              className={`card p-4 flex flex-col justify-between ${
                diasCriticos.length > 0
                  ? "border-rose-500/40 bg-rose-950/20"
                  : "border-emerald-500/30 bg-emerald-950/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Segurança Operacional
                </span>
                {diasCriticos.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="my-2">
                <div
                  className={`text-2xl font-extrabold font-display ${
                    diasCriticos.length > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {diasCriticos.length > 0
                    ? `${diasCriticos.length} dia(s) crítico(s)`
                    : "Escala Segura"}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {diasCriticos.length > 0
                    ? "Regime abaixo do limite de segurança devido a missões ou férias simultâneas."
                    : "Todos os dias atendem aos limites institucionais de segurança."}
                </p>
              </div>
            </div>
          </div>

          {/* Grade Diária de Serviços Gerados */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Previsão Diária e Guarnição dos Postos
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/60" />
                  Escala Vermelha (Fim de Semana)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-navy-900 border border-slate-700" />
                  Escala Preta
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Status Cobertura</th>
                    <th className="py-3 px-3">Regime Efetivo</th>
                    <th className="py-3 px-3">Militar(es) Escalado(s)</th>
                    <th className="py-3 px-3">Aptos / Total</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {escalaGerada.map((item) => {
                    const fds = isFimDeSemana(item.data);
                    const diaSem = DIAS_SEMANA_CURTOS[diaSemana(item.data)];
                    const isHoje = item.data === hoje;

                    return (
                      <tr
                        key={item.data}
                        className={`transition-colors hover:bg-navy-900/60 ${
                          fds ? "bg-rose-950/10" : ""
                        } ${isHoje ? "ring-1 ring-gold-500/40 bg-gold-500/5" : ""}`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                fds
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-navy-800 text-slate-300"
                              }`}
                            >
                              {diaSem}
                            </span>
                            <span className="font-mono font-bold text-slate-100">
                              {fmtDiaMes(item.data)}
                            </span>
                            {isHoje && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-gold-500 text-navy-950">
                                Hoje
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <CoberturaBadge status={item.cobertura.status} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={`font-bold ${
                              item.cobertura.regime < escala.limiteSeguranca
                                ? "text-rose-400"
                                : "text-slate-100"
                            }`}
                          >
                            {fmtRegime(item.cobertura.regime)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.militarIds.length === 0 ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Posto Desguarnecido
                              </span>
                            ) : (
                              item.militarIds.map((mid) => {
                                const m = ctx.militarMap.get(mid);
                                return (
                                  <span
                                    key={mid}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-800 text-[11px] font-semibold text-slate-100 border border-slate-700 shadow-sm"
                                  >
                                    <PostoChip posto={m?.posto || "MN"} />
                                    <span>{m?.nomeGuerra || mid}</span>
                                  </span>
                                );
                              })
                            )}
                            {item.substituicao && (
                              <span className="text-[10px] text-amber-300 font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                                Substituição de Equipe
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          <span className="text-emerald-400 font-bold">
                            {item.cobertura.aptos}
                          </span>{" "}
                          / {item.cobertura.efetivo}
                          {item.cobertura.indisponiveis.length > 0 && (
                            <span className="text-rose-400 text-[10px] ml-1.5">
                              (-{item.cobertura.indisponiveis.length} ausentes)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDiaSelecionado(item.data)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-navy-800 text-gold-400 hover:bg-navy-700 font-medium transition"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estatísticas de Equidade dos Serviços */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Conferência de Equidade do Efetivo no Período
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Distribuição balanceada entre escala preta e vermelha (fins de semana).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pool.map((m) => {
                const c = contagem.get(m.id) || { pretos: 0, vermelhos: 0 };
                const total = c.pretos + c.vermelhos;

                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-navy-900/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <PostoChip posto={m.posto} />
                        <span className="font-bold text-xs text-slate-100">
                          {m.nomeGuerra}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {c.pretos} preta(s) •{" "}
                        <span className="text-rose-300 font-semibold">
                          {c.vermelhos} vermelha(s)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-gold-400">
                        {total}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">
                        Serviços
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODO GRADE SOMOR                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {modoViz === "somor" && gradeSOMOR && (
        <div className="space-y-4">
          {/* Header da Grade */}
          <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-fuchsia-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Grade Mensal — Padrão SOMOR
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {ESCALA_LABEL[escalaId]}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualização idêntica à planilha operacional da Capitania. Colunas e linha de nomes fixas ao rolar.
              </p>
            </div>
            {/* Navegação de mês */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigarMesSOMOR(-1)}
                className="p-2 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center min-w-[110px]">
                <div className="text-sm font-bold text-slate-100">{MESES[mesSOMOR]}</div>
                <div className="text-xs text-slate-400">{anoSOMOR}</div>
              </div>
              <button
                onClick={() => navegarMesSOMOR(1)}
                className="p-2 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Toggle Cabo Volante */}
              <button
                onClick={() => setCaboVolante(!caboVolante)}
                className={`ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  caboVolante
                    ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                    : "bg-navy-900 border-slate-700 text-slate-400"
                }`}
                title="Cabos atuam como volantes quando a escala de MN cai para 1×1"
              >
                <Zap className="w-3.5 h-3.5" /> Cabo Volante
              </button>
            </div>
          </div>

          {/* Alertas 0×0 e IN sem habilitação */}
          {(gradeSOMOR.alertas0x0.length > 0 || gradeSOMOR.alertasINSemHabilitacao.length > 0) && (
            <div className="space-y-2">
              {gradeSOMOR.alertas0x0.map((a) => {
                const m = ctx.militarMap.get(a.militarId);
                return (
                  <div key={`0x0-${a.militarId}-${a.data}`} className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-300">Regime 0×0 detectado: </span>
                      <span className="text-slate-200">{m ? nomeMilitar(m) : a.militarId}</span>
                      <span className="text-slate-400"> · {a.data} — Militar alocado em IN na folga imediata após serviço de {ESCALA_LABEL[escalaId]}.</span>
                    </div>
                  </div>
                );
              })}
              {gradeSOMOR.alertasINSemHabilitacao.map((a) => (
                <div key={`in-hab-${a.data}`} className="flex items-start gap-2 p-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/40 text-xs">
                  <ShieldAlert className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-fuchsia-300">Equipe IN sem habilitação suficiente: </span>
                    <span className="text-slate-200">{a.data}</span>
                    <span className="text-slate-400"> — Menos de 2 militares com ESPRAC/SRAK habilitados para assinar relatório.</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legenda */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            {[
              { sigla: "CTR", label: "Contramestre Serviço", bg: "#6b7280" },
              { sigla: "MO",  label: "Motorista",             bg: "#2563eb" },
              { sigla: "IN",  label: "Inspeção Naval",        bg: "#db2777" },
              { sigla: "VG",  label: "Vigia / Sentinela",     bg: "#374151" },
              { sigla: "OF SERV", label: "Oficial de Serviço", bg: "#4b5563" },
            ].map((l) => (
              <span key={l.sigla} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700 bg-navy-900">
                <span className="w-3 h-3 rounded" style={{ background: l.bg }} />
                <span className="font-bold text-slate-200">{l.sigla}</span>
                <span className="text-slate-400">— {l.label}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-600/40 bg-amber-950/30">
              <span className="w-3 h-3 rounded bg-amber-600" />
              <span className="font-bold text-amber-300">AUSENTE</span>
              <span className="text-slate-400">— Férias / Missão / Curso</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-violet-500/40 bg-violet-950/30">
              <span className="w-3 h-3 rounded bg-violet-500" />
              <span className="font-bold text-violet-300">Roxo</span>
              <span className="text-slate-400">— Com ESPRAC/SRAK</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-orange-500/40 bg-orange-950/30">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span className="font-bold text-orange-300">Laranja</span>
              <span className="text-slate-400">— Sem ESPRAC / Sem SRAK</span>
            </span>
          </div>

          {/* Tabela Grade SOMOR */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-auto max-h-[70vh]" style={{ maxWidth: "100%" }}>
              <table className="text-[11px] border-collapse min-w-max">
                {/* Cabeçalho fixo (sticky top) */}
                <thead>
                  <tr className="bg-navy-950 border-b border-slate-700">
                    {/* Coluna A — cabeçalho fixo esquerdo */}
                    <th
                      className="sticky left-0 z-20 bg-navy-950 text-left px-3 py-2.5 text-slate-300 font-bold whitespace-nowrap border-r border-slate-700 min-w-[200px]"
                    >
                      POSTO / GRAD — NOME
                    </th>
                    {/* Colunas de dias */}
                    {gradeSOMOR.cabecalhos.map((cab) => (
                      <th
                        key={cab.data}
                        className={`sticky top-0 z-10 px-2 py-2 text-center font-bold whitespace-nowrap border-r border-slate-800 min-w-[52px] ${
                          cab.fds
                            ? "bg-rose-950/60 text-rose-300"
                            : "bg-navy-900 text-slate-300"
                        }`}
                      >
                        <div>{cab.numDia}</div>
                        <div className="text-[9px] font-normal text-slate-400">{cab.diaSemCurto}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {gradeSOMOR.linhas.map((linha) => {
                    const hab = linha.habilitacaoIN;
                    const corNome = hab === "habilitado" ? "text-violet-300 font-bold" : "text-orange-400 font-bold";

                    return (
                      <tr key={linha.militar.id} className="border-b border-slate-800/60 hover:bg-navy-900/40 transition-colors">
                        {/* Coluna A — nome fixo à esquerda */}
                        <td
                          className={`sticky left-0 z-10 bg-navy-900 px-3 py-1.5 whitespace-nowrap border-r border-slate-700 ${corNome}`}
                          title={`${linha.militar.nomeCompleto} | ${hab === "habilitado" ? "Habilitado ESPRAC/SRAK" : "SEM ESPRAC / SEM SRAK"}`}
                        >
                          <span className="text-slate-400 font-normal">{linha.militar.posto}</span>{" "}
                          {linha.militar.nomeGuerra}
                          {hab === "sem_habilitacao" && (
                            <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              SEM ESPRAC
                            </span>
                          )}
                        </td>

                        {/* Células diárias */}
                        {linha.celulas.map((cel, i) => {
                          const cab = gradeSOMOR.cabecalhos[i];
                          if (cel.sigla === null) {
                            return (
                              <td
                                key={cab.data}
                                className={`px-1 py-1.5 text-center border-r border-slate-800/40 ${
                                  cab.fds ? "bg-rose-950/10" : ""
                                }`}
                              />
                            );
                          }
                          if (cel.sigla === "AUSENTE") {
                            return (
                              <td
                                key={cab.data}
                                className="px-1 py-1.5 text-center border-r border-slate-800/40"
                                title={cel.categoriaAusencia}
                              >
                                <span
                                  className="inline-block px-1 py-0.5 rounded text-[9px] font-bold text-amber-900 leading-tight"
                                  style={{ background: "#fbbf24", minWidth: 36 }}
                                >
                                  {(cel.textoAusencia ?? "AUS").slice(0, 8).toUpperCase()}
                                </span>
                              </td>
                            );
                          }
                          const bgColor = SOMOR_COR[cel.sigla] ?? "#374151";
                          return (
                            <td
                              key={cab.data}
                              className="px-1 py-1.5 text-center border-r border-slate-800/40 relative"
                              title={cel.alerta0x0 ? "⚠️ Regime 0×0: sem folga real!" : cel.caboVolante ? "Cabo Volante" : cel.sigla}
                            >
                              <span
                                className="inline-block px-1 py-0.5 rounded text-[9px] font-bold text-white leading-tight"
                                style={{ background: bgColor, minWidth: 36 }}
                              >
                                {cel.sigla}
                              </span>
                              {cel.alerta0x0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 border border-rose-300" title="0×0" />
                              )}
                              {cel.caboVolante && (
                                <span className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Volante" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Dia */}
      <Modal
        aberto={!!diaSelecionado}
        onFechar={() => setDiaSelecionado(null)}
        titulo={`Detalhes do Serviço — ${diaSelecionado ? fmt(diaSelecionado) : ""}`}
        subtitulo={`Escala de ${escala.nome} • Visualização de escalados e motivos de indisponibilidade.`}
        maxLargura="lg"
      >
        {detalhesDia && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">
                  Situação Operacional
                </div>
                <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
                  Regime {fmtRegime(detalhesDia.cobertura.regime)}
                </div>
              </div>
              <CoberturaBadge status={detalhesDia.cobertura.status} size="md" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Militares Escalados de Serviço ({detalhesDia.militarIds.length})
              </h4>
              <div className="space-y-1.5">
                {detalhesDia.militarIds.map((mid) => {
                  const m = ctx.militarMap.get(mid);
                  return (
                    <div
                      key={mid}
                      className="p-2.5 rounded-xl bg-navy-800/80 border border-gold-500/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <PostoChip posto={m?.posto || "MN"} />
                        <div>
                          <div className="font-bold text-xs text-slate-100">{m?.nomeGuerra}</div>
                          <div className="text-[10px] text-slate-400">
                            {m?.nomeCompleto} • NIP: {m?.nip}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Escalado
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Militares Indisponíveis ({detalhesDia.cobertura.indisponiveis.length})
              </h4>
              {detalhesDia.cobertura.indisponiveis.length === 0 ? (
                <div className="p-3 rounded-xl bg-navy-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  Nenhum militar do efetivo está indisponível nesta data.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {detalhesDia.cobertura.indisponiveis.map((ind, i) => {
                    const m = ctx.militarMap.get(ind.militarId);
                    return (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-navy-950 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <PostoChip posto={m?.posto || "MN"} />
                          <div>
                            <span className="font-bold text-slate-200">{m?.nomeGuerra}</span>
                            <div className="text-[11px] text-slate-400">{ind.motivo}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {ind.tipo}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Helper local para navegar mês SOMOR sem conflito de nome
function navigarMesSOMOR(_delta: number) { /* override via closure */ }
