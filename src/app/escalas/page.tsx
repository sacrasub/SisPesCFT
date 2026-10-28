"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  ESCALA_LABEL,
  LEGENDA_OFICIAL_CAPITANIA,
  REGRAS_PONTUACAO_OI_02_06D,
} from "@/lib/constants";
import {
  addDays,
  diffDays,
  fmt,
  fmtDiaMes,
  fmtPeriodo,
  isFimDeSemana,
  diaSemana,
  DIAS_SEMANA_CURTOS,
  MESES,
} from "@/lib/dates";
import { uid, nomeMilitar, fmtRegime } from "@/lib/utils";
import {
  gerarEscala,
  efetivoEscala,
  contagemServicos,
  gerarGradeSOMOR,
  gerarDetalheDiarioOI0206D,
  SOMOR_COR,
} from "@/lib/engine/escalas";
import { CoberturaBadge, PostoChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  CalendarCheck,
  AlertTriangle,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle,
  TableProperties,
  Zap,
  Shield,
  Flame,
  ArrowRightLeft,
  Plus,
  Check,
  X,
} from "lucide-react";
import type {
  EscalaTipo,
  ISODate,
  NivelHierarquiaTroca,
  PapeletaTrocaServico,
} from "@/lib/types";

type ModoViz = "somor" | "lista" | "detalhe_oi";
type ModoLegendaGrade = "SOMOR" | "OFICIAL_CAPITANIA";

export default function EscalasPage() {
  const { db, ctx, hoje, substituirTudo } = useDb();
  const { isAdmin } = useAuth();

  // Escala ativa
  const [escalaId, setEscalaId] = useState<EscalaTipo>("CONTRAMESTRE");
  // Modo de visualização (Padrão SOMOR como padrão operacional)
  const [modoViz, setModoViz] = useState<ModoViz>("somor");
  // Modo de legenda na grade mensal: Sigla SOMOR vs Legenda Oficial da Capitania (X, O, Fe/C, D, Fo, Li, Nº, Di)
  const [modoLegenda, setModoLegenda] = useState<ModoLegendaGrade>("SOMOR");

  // Período de visualização (modo lista): janela de 14 dias
  const [inicioPeriodo, setInicioPeriodo] = useState<ISODate>(hoje);
  const [diasJanela] = useState<number>(14);

  // Mês/Ano da Grade SOMOR
  const anoHoje = Number(hoje.slice(0, 4));
  const mes0Hoje = Number(hoje.slice(5, 7)) - 1;
  const [mesSOMOR, setMesSOMOR] = useState<number>(mes0Hoje);
  const [anoSOMOR, setAnoSOMOR] = useState<number>(anoHoje);
  const [caboVolante, setCaboVolante] = useState(false);

  // Data para o Detalhe Diário OI 02-06D (CAV, Reação, Pontos e Trocas)
  const [dataDetalhe, setDataDetalhe] = useState<ISODate>(hoje);

  // Modal de Detalhes do Dia (modo lista)
  const [diaSelecionado, setDiaSelecionado] = useState<ISODate | null>(null);

  // Modal de Nova Papeleta de Troca de Serviço (Anexo O - OI 02-06D)
  const [modalTrocaAberto, setModalTrocaAberto] = useState(false);
  const [trocaData, setTrocaData] = useState<ISODate>(addDays(hoje, 3));
  const [trocaPosto, setTrocaPosto] = useState<EscalaTipo>("CONTRAMESTRE");
  const [trocaSolicitanteId, setTrocaSolicitanteId] = useState<string>("m29");
  const [trocaSubstitutoId, setTrocaSubstitutoId] = useState<string>("m32");
  const [trocaNivel, setTrocaNivel] = useState<NivelHierarquiaTroca>(1);
  const [trocaMotivo, setTrocaMotivo] = useState<string>("");

  // Escala selecionada
  const escala = useMemo(
    () => db.escalas.find((e) => e.id === escalaId) || db.escalas[0],
    [db.escalas, escalaId],
  );

  const fimPeriodo = useMemo(
    () => addDays(inicioPeriodo, diasJanela - 1),
    [inicioPeriodo, diasJanela],
  );

  // Previsão gerada pelo motor OI 02-06D (modo lista)
  const escalaGerada = useMemo(() => {
    return gerarEscala(ctx, escala, inicioPeriodo, fimPeriodo);
  }, [ctx, escala, inicioPeriodo, fimPeriodo]);

  // Efetivo total da escala
  const pool = useMemo(() => efetivoEscala(ctx, escala), [ctx, escala]);

  // Contagem de serviços e pontos
  const contagem = useMemo(() => contagemServicos(escalaGerada), [escalaGerada]);

  // Dias críticos
  const diasCriticos = useMemo(
    () =>
      escalaGerada.filter(
        (s) =>
          s.cobertura.status === "CRITICO" ||
          s.cobertura.status === "SEM_COBERTURA",
      ),
    [escalaGerada],
  );

  // Grade SOMOR
  const gradeSOMOR = useMemo(() => {
    if (modoViz !== "somor") return null;
    return gerarGradeSOMOR(ctx, escalaId, anoSOMOR, mesSOMOR, caboVolante);
  }, [ctx, escalaId, anoSOMOR, mesSOMOR, caboVolante, modoViz]);

  // Detalhe Diário OI 02-06D (Grupo de CAV + Grupo de Reação)
  const detalheOI = useMemo(
    () => gerarDetalheDiarioOI0206D(ctx, dataDetalhe),
    [ctx, dataDetalhe],
  );

  // Navegar período (modo lista)
  const navegar = (deltaDias: number) => {
    setInicioPeriodo(addDays(inicioPeriodo, deltaDias));
  };

  // Navegar mês SOMOR
  const navegarMesSOMOR = (delta: number) => {
    let m = mesSOMOR + delta;
    let a = anoSOMOR;
    if (m < 0) {
      m = 11;
      a--;
    }
    if (m > 11) {
      m = 0;
      a++;
    }
    setMesSOMOR(m);
    setAnoSOMOR(a);
  };

  // Detalhes do dia selecionado
  const detalhesDia = useMemo(() => {
    if (!diaSelecionado) return null;
    return escalaGerada.find((s) => s.data === diaSelecionado);
  }, [escalaGerada, diaSelecionado]);

  // Registrar Nova Papeleta de Troca de Serviço (Anexo O - OI 02-06D)
  const handleCriarPapeletaTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    const diasAntecedencia = diffDays(hoje, trocaData);
    const cumpre48h = diasAntecedencia >= 2;
    const seq = String((db.trocasServico?.length ?? 0) + 15).padStart(3, "0");

    const nova: PapeletaTrocaServico = {
      id: uid("tr"),
      numeroSequencial: `${seq}/${anoHoje}`,
      dataServicoOriginal: trocaData,
      posto: trocaPosto,
      militarSolicitanteId: trocaSolicitanteId,
      militarSubstitutoId: trocaSubstitutoId,
      nivelHierarquia: trocaNivel,
      dataSolicitacao: hoje,
      cumpreAntecedencia48h: cumpre48h,
      motivoJustificativa: trocaMotivo.trim() || "Compromisso particular / Troca combinada (Anexo O - OI 02-06D)",
      statusAprovacaoAjudante: isAdmin ? "AUTORIZADO_CF02" : "PENDENTE_CF02",
    };

    await substituirTudo({
      ...db,
      trocasServico: [nova, ...(db.trocasServico ?? [])],
    });
    setModalTrocaAberto(false);
    setTrocaMotivo("");
  };

  const handleStatusPapeleta = async (
    id: string,
    status: PapeletaTrocaServico["statusAprovacaoAjudante"],
  ) => {
    const lista = (db.trocasServico ?? []).map((t) =>
      t.id === id ? { ...t, statusAprovacaoAjudante: status } : t,
    );
    await substituirTudo({ ...db, trocasServico: lista });
  };

  const fmtNomeId = (id?: string) => {
    if (!id) return "Não definido";
    const m = ctx.militarMap.get(id);
    return m ? `${m.posto} ${m.especialidade ? `(${m.especialidade}) ` : ""}${m.nomeGuerra}` : id;
  };

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
              Gestão e Otimização de Escalas de Serviço (OI 02-06D)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            OSE, Contramestre, Supervisor SECOM, Cabo Auxiliar, Motorista, Vigia, Identificador e Equipes de Inspeção Naval.
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModoViz("somor")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
              modoViz === "somor"
                ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 shadow-md shadow-fuchsia-950/30"
                : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" /> Grade Mensal (SOMOR / Oficial)
          </button>
          <button
            onClick={() => setModoViz("lista")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
              modoViz === "lista"
                ? "bg-gold-500/20 border-gold-500/50 text-gold-300"
                : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Previsão Diária & Pontos
          </button>
          <button
            onClick={() => setModoViz("detalhe_oi")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
              modoViz === "detalhe_oi"
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-md shadow-sky-950/30"
                : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Detalhe Diário OI 02-06D (CAV + Reação + Papeletas de Troca)
          </button>
        </div>

        <button
          onClick={() => setModalTrocaAberto(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Nova Papeleta de Troca (Anexo O - OI 02-06D)</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODO LISTA & PONTUAÇÃO OI 02-06D                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {modoViz === "lista" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="card p-4 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-100">{escala.nome}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-gold-400 border border-slate-700">
                    Modo: {escala.modo === "EQUIPES" ? "Equipes Rotativas" : "Individual por Pontos (OI 02-06D)"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{escala.descricao}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-300 font-mono flex-wrap">
                  <span>Alvo: {fmtRegime(escala.regimeAlvo)}</span> •
                  <span>Mínimo de Segurança: {fmtRegime(escala.limiteSeguranca)}</span> •
                  <span>Efetivo da escala: {pool.length} militares</span> •
                  <span className="text-sky-300">
                    Pesos OI 02-06D: Normal {REGRAS_PONTUACAO_OI_02_06D.NORMAL.TITULAR} pt | Dom/Fer {REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO.TITULAR} pt (Desempate: Mais Moderno)
                  </span>
                </div>
              </div>

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
                  <div className="text-[10px] text-slate-500">{diasJanela} dias de previsão</div>
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
                  {diasCriticos.length > 0 ? `${diasCriticos.length} dia(s) crítico(s)` : "Escala Segura"}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {diasCriticos.length > 0
                    ? "Alerta OI 02-06D: Avaliar reintegração temporária de dispensados mediante autorização do Capitão dos Portos."
                    : "Todos os dias atendem aos limites institucionais de segurança."}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Previsão Diária, Titular e Retém (Filtro 2×1 + Desempate por Modernidade)
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/60" />
                  Rotina Domingo/Feriado (1,5 pt)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-navy-900 border border-slate-700" />
                  Rotina Normal (1,0 pt)
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
                    <th className="py-3 px-3">Titular Escalado</th>
                    <th className="py-3 px-3">Retém do Dia</th>
                    <th className="py-3 px-3">Aptos / Total</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {escalaGerada.map((item) => {
                    const fds = isFimDeSemana(item.data);
                    const diaSem = DIAS_SEMANA_CURTOS[diaSemana(item.data)];
                    const isHoje = item.data === hoje;
                    const retemMilitar = item.retemId ? ctx.militarMap.get(item.retemId) : undefined;

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
                                fds ? "bg-rose-500/20 text-rose-300" : "bg-navy-800 text-slate-300"
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
                            {item.trocaAutorizada && (
                              <span className="text-[10px] text-sky-300 font-mono px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/30">
                                Troca CF-02 (OI 02-06D)
                              </span>
                            )}
                            {item.substituicao && (
                              <span className="text-[10px] text-amber-300 font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                                Substituição de Equipe
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {retemMilitar ? (
                            <span className="text-[11px] text-slate-300 font-mono">
                              {retemMilitar.posto} {retemMilitar.nomeGuerra}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          <span className="text-emerald-400 font-bold">{item.cobertura.aptos}</span> /{" "}
                          {item.cobertura.efetivo}
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

          {/* Estatísticas de Equidade e Pontuação OI 02-06D */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Conferência de Equidade e Pontuação Acumulada (OI 02-06D)
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Normal: 1,0 pt • Domingo/Feriado: 1,5 pt • Desempate: Mais moderno (# maior) escalado primeiro.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pool.map((m) => {
                const c = contagem.get(m.id) || { pretos: 0, vermelhos: 0, pontos: 0 };
                const total = c.pretos + c.vermelhos;

                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-navy-900/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500">
                          #{String(m.antiguidadeOrdem ?? 0).padStart(2, "0")}
                        </span>
                        <PostoChip posto={m.posto} />
                        <span className="font-bold text-xs text-slate-100">{m.nomeGuerra}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {c.pretos} N •{" "}
                        <span className="text-rose-300 font-semibold">{c.vermelhos} D</span> •{" "}
                        <span className="text-sky-300 font-mono">{c.pontos} pts</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-gold-400">{total}</div>
                      <div className="text-[9px] text-slate-500 uppercase">Serviços</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODO GRADE SOMOR / LEGENDA OFICIAL DA CAPITANIA                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {modoViz === "somor" && gradeSOMOR && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <TableProperties className="w-5 h-5 text-fuchsia-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Grade Mensal Consolidada — {modoLegenda === "SOMOR" ? "Padrão Operacional SOMOR" : "Legenda Oficial da Capitania (OI 02-06D)"}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {ESCALA_LABEL[escalaId]}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Alterne entre as siglas operacionais da planilha SOMOR (CTR, MO, VG, IN, SSVÇ) e a legenda normativa de Capitania (X, O, Fe/C, D, Fo, Li, Nº, Di).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Alternador Sigla SOMOR vs Legenda Oficial */}
              <div className="flex items-center p-1 rounded-xl bg-navy-950 border border-slate-800 text-xs">
                <button
                  onClick={() => setModoLegenda("SOMOR")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    modoLegenda === "SOMOR"
                      ? "bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Siglas SOMOR
                </button>
                <button
                  onClick={() => setModoLegenda("OFICIAL_CAPITANIA")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    modoLegenda === "OFICIAL_CAPITANIA"
                      ? "bg-sky-500/25 text-sky-200 border border-sky-400/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Legenda Oficial (X, O, Fe/C, Fo)
                </button>
              </div>

              <button
                onClick={() => navegarMesSOMOR(-1)}
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
                  <div
                    key={`0x0-${a.militarId}-${a.data}`}
                    className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-300">Regime 0×0 detectado: </span>
                      <span className="text-slate-200">{m ? nomeMilitar(m) : a.militarId}</span>
                      <span className="text-slate-400">
                        {" "}
                        · {a.data} — Militar alocado em IN na folga imediata após serviço de{" "}
                        {ESCALA_LABEL[escalaId]}.
                      </span>
                    </div>
                  </div>
                );
              })}
              {gradeSOMOR.alertasINSemHabilitacao.map((a) => (
                <div
                  key={`in-hab-${a.data}`}
                  className="flex items-start gap-2 p-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/40 text-xs"
                >
                  <ShieldAlert className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-fuchsia-300">
                      Equipe IN sem habilitação suficiente:{" "}
                    </span>
                    <span className="text-slate-200">{a.data}</span>
                    <span className="text-slate-400">
                      {" "}
                      — Menos de 2 militares com ESPRAC/SRAK habilitados para assinar relatório.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legenda Dinâmica conforme modo selecionado */}
          {modoLegenda === "SOMOR" ? (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {[
                { sigla: "OSE", label: "Oficial de Serviço", bg: "#0284c7" },
                { sigla: "CTR", label: "Contramestre Serviço", bg: "#6b7280" },
                { sigla: "SECOM", label: "Supervisor SECOM", bg: "#0d9488" },
                { sigla: "CB-AUX", label: "Cabo Auxiliar / Dia", bg: "#4f46e5" },
                { sigla: "MO", label: "Motorista", bg: "#2563eb" },
                { sigla: "IN", label: "Inspeção Naval", bg: "#db2777" },
                { sigla: "VG", label: "Vigia de Embarcações", bg: "#374151" },
                { sigla: "SSVÇ", label: "Saindo de Serviço (Folga)", bg: "#065f46" },
                { sigla: "Di", label: "Dispensado (OI 02-06D)", bg: "#475569" },
              ].map((l) => (
                <span
                  key={l.sigla}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700 bg-navy-900"
                >
                  <span className="w-3 h-3 rounded" style={{ background: l.bg }} />
                  <span className="font-bold text-slate-200">{l.sigla}</span>
                  <span className="text-slate-400">— {l.label}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-600/40 bg-amber-950/30">
                <span className="w-3 h-3 rounded bg-amber-600" />
                <span className="font-bold text-amber-300">AUSENTE</span>
                <span className="text-slate-400">— Férias / Missão / Curso / LTS</span>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {Object.entries(LEGENDA_OFICIAL_CAPITANIA).map(([cod, desc]) => (
                <span
                  key={cod}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/30 bg-navy-900"
                >
                  <span className="font-mono font-extrabold text-sky-300">{cod}</span>
                  <span className="text-slate-400">— {desc}</span>
                </span>
              ))}
            </div>
          )}

          {/* Tabela Grade SOMOR */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-auto max-h-[70vh]" style={{ maxWidth: "100%" }}>
              <table className="text-[11px] border-collapse min-w-max">
                <thead>
                  <tr className="bg-navy-950 border-b border-slate-700">
                    <th className="sticky left-0 z-20 bg-navy-950 text-left px-3 py-2.5 text-slate-300 font-bold whitespace-nowrap border-r border-slate-700 min-w-[220px]">
                      # • POSTO — NOME [SETOR]
                    </th>
                    {gradeSOMOR.cabecalhos.map((cab) => (
                      <th
                        key={cab.data}
                        className={`sticky top-0 z-10 px-2 py-2 text-center font-bold whitespace-nowrap border-r border-slate-800 min-w-[52px] ${
                          cab.fds ? "bg-rose-950/60 text-rose-300" : "bg-navy-900 text-slate-300"
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
                    const corNome =
                      hab === "habilitado" ? "text-violet-300 font-bold" : "text-orange-400 font-bold";

                    return (
                      <tr
                        key={linha.militar.id}
                        className="border-b border-slate-800/60 hover:bg-navy-900/40 transition-colors"
                      >
                        <td
                          className={`sticky left-0 z-10 bg-navy-900 px-3 py-1.5 whitespace-nowrap border-r border-slate-700 ${corNome}`}
                          title={`${linha.militar.nomeCompleto} | Setor: ${linha.militar.setorCodigo ?? linha.militar.divisao}`}
                        >
                          <span className="text-[10px] font-mono text-slate-500 mr-1">
                            #{String(linha.militar.antiguidadeOrdem ?? 0).padStart(2, "0")}
                          </span>
                          <span className="text-slate-400 font-normal">{linha.militar.posto}</span>{" "}
                          {linha.militar.nomeGuerra}
                          <span className="ml-1.5 text-[9px] font-mono text-sky-400 font-normal">
                            [{linha.militar.setorCodigo ?? linha.militar.divisao}]
                          </span>
                        </td>

                        {linha.celulas.map((cel, i) => {
                          const cab = gradeSOMOR.cabecalhos[i];
                          const textoExibido =
                            modoLegenda === "OFICIAL_CAPITANIA" ? cel.legendaOficial : cel.sigla;

                          if (!textoExibido) {
                            return (
                              <td
                                key={cab.data}
                                className={`px-1 py-1.5 text-center border-r border-slate-800/40 ${
                                  cab.fds ? "bg-rose-950/10" : ""
                                }`}
                              />
                            );
                          }
                          if (cel.sigla === "AUSENTE" && modoLegenda === "SOMOR") {
                            return (
                              <td
                                key={cab.data}
                                className="px-1 py-1.5 text-center border-r border-slate-800/40"
                                title={`${cel.categoriaAusencia}: ${cel.textoAusencia}`}
                              >
                                <span
                                  className="inline-block px-1 py-0.5 rounded text-[9px] font-bold text-amber-950 leading-tight"
                                  style={{ background: "#fbbf24", minWidth: 36 }}
                                >
                                  {(cel.textoAusencia ?? "AUS").slice(0, 8).toUpperCase()}
                                </span>
                              </td>
                            );
                          }
                          const bgColor =
                            cel.sigla && cel.sigla !== "AUSENTE"
                              ? SOMOR_COR[cel.sigla] ?? "#374151"
                              : "#d97706";
                          return (
                            <td
                              key={cab.data}
                              className="px-1 py-1.5 text-center border-r border-slate-800/40 relative"
                              title={
                                cel.alerta0x0
                                  ? "⚠️ Regime 0×0: sem folga real!"
                                  : cel.textoAusencia || String(textoExibido)
                              }
                            >
                              <span
                                className="inline-block px-1 py-0.5 rounded text-[9px] font-bold text-white leading-tight"
                                style={{ background: bgColor, minWidth: 36 }}
                              >
                                {textoExibido}
                              </span>
                              {cel.alerta0x0 && (
                                <span
                                  className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 border border-rose-300"
                                  title="0×0"
                                />
                              )}
                              {cel.caboVolante && (
                                <span
                                  className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full bg-amber-400"
                                  title="Volante"
                                />
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODO DETALHE DIÁRIO OI 02-06D: CAV + REAÇÃO + PAPELETAS DE TROCA   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {modoViz === "detalhe_oi" && (
        <div className="space-y-6">
          {/* Seletor de Data do Detalhe */}
          <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Detalhe de Serviço de Estado, Grupos de Emergência (CAV / Reação) & Trocas (OI 02-06D)
              </h2>
              <p className="text-xs text-slate-400">
                Vinculação cumulativa automática dos escalados do dia ao Grupo de Controle de Avarias e aos Pontos Sensíveis do Grupo de Reação.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Data do Detalhe:</span>
              <input
                type="date"
                value={dataDetalhe}
                onChange={(e) => setDataDetalhe(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-700 text-xs font-mono text-white"
              />
            </div>
          </div>

          {/* Alertas de Segurança / Reintegração de Dispensados */}
          {detalheOI.alertasSegurancaEscala.length > 0 && (
            <div className="space-y-2">
              {detalheOI.alertasSegurancaEscala.map((al, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs text-amber-200 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{al}</span>
                </div>
              ))}
            </div>
          )}

          {/* Grid: Guarnição dos Postos + Grupo CAV + Grupo Reação */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Guarnição do Serviço de Estado (Titular + Retém + Pontos) */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Guarnição do Serviço ({fmt(dataDetalhe)})</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  {detalheOI.ehDomingoOuFeriado ? "Rotina Domingo (1,5 pt)" : "Rotina Normal (1,0 pt)"}
                </span>
              </div>
              <div className="space-y-2">
                {detalheOI.itens.map((it) => (
                  <div
                    key={it.posto}
                    className="p-3 rounded-xl bg-navy-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gold-400">
                        {ESCALA_LABEL[it.posto]}
                      </div>
                      <div className="font-bold text-slate-100 mt-0.5">
                        Titular: {fmtNomeId(it.militarTitularId)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Retém: {fmtNomeId(it.militarRetemId)}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] text-sky-300">
                      <div>+{it.pontosCreditadosTitular} pt</div>
                      <div className="text-slate-500">Ret: +{it.pontosCreditadosRetem}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Grupo de Controle de Avarias (CAV) & Checklist de Lanchas/VHF */}
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Grupo de Controle de Avarias (CAV - OI 30-07D)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Funções cumulativas de emergência vinculadas ao Quarto de Serviço.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Encarregado / Líder Cena de Ação:</span>
                  <span className="font-bold text-slate-100">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoCav.encarregadoId)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Eletricista / Desligador Elétrico:</span>
                  <span className="font-bold text-slate-100">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoCav.desligadorEletricoId)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Turma de Ataque / Bombeiro 1:</span>
                  <span className="font-bold text-slate-100">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoCav.bombeiro1Id)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Contenção / Bombas de Esgoto:</span>
                  <span className="font-bold text-slate-100">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoCav.bombeiro2Id)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Isolamento e Primeiros Socorros:</span>
                  <span className="font-bold text-slate-100">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoCav.isolamentoPrimeirosSocorrosId)}
                  </span>
                </div>
              </div>

              {/* Checklist Operacional Obrigatório do Quarto */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
                <div className="font-bold text-emerald-300 uppercase text-[10px] tracking-wider">
                  Rotina Obrigatória do Contramestre e Cabo Auxiliar
                </div>
                <div className="flex items-start gap-2 text-slate-200 text-[11px]">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Vistoria Horária nas Lanchas Atracadas:</strong> Amarração, peiação, água nos porões, bombas de esgoto no automático, chaves de bateria desligadas e verificação de banda/ponta.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-slate-200 text-[11px]">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Escuta Permanente Canal 16 VHF:</strong> Divulgação de Avisos aos Navegantes de 6 em 6 horas e leitura diária de consumo de água e energia.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Grupo de Reação / Defesa de Pontos Sensíveis & Armamento */}
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Grupo de Reação & Pontos Sensíveis (SegOrg)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Distribuição de armamento (Pistola Taurus 9mm / Fuzil) e guarnição de pontos sensíveis.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                  <div className="text-[10px] text-rose-300 font-bold">
                    Comandante do Grupo de Reação (Pistola Taurus 9mm)
                  </div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoReacao.comandanteId)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                  <div className="text-[10px] text-rose-300 font-bold">
                    Ponto Sensível 1: Escoteria / Paiol de Armamento (Pistola 9mm / Fuzil)
                  </div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoReacao.pontoSensivelEscoteriaId)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                  <div className="text-[10px] text-rose-300 font-bold">
                    Ponto Sensível 2: Flutuante / Residência CP-01 (Fuzil)
                  </div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoReacao.pontoSensivelCp01Id)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                  <div className="text-[10px] text-rose-300 font-bold">
                    Ponto Sensível 3: Frente GAP / Prédio Atendimento ao Público (Fuzil)
                  </div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoReacao.pontoSensivelFrenteGapId)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                  <div className="text-[10px] text-rose-300 font-bold">
                    Ponto Sensível 4: Alojamentos e Pórtico Principal
                  </div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {fmtNomeId(detalheOI.detalheEmergencia.grupoReacao.pontoSensivelAlojamentosId)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Papeletas de Troca de Serviço (Anexo O da OI 02-06D) */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                  <span>Papeletas de Troca de Serviço e Comissão (Anexo O da OI nº 02-06D)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exige antecedência mínima de 48h, autorização do Ajudante (CF-02), registro na Seção de Pessoal (CF-31) e arquivamento na Inteligência (CF-04).
                </p>
              </div>
              <button
                onClick={() => setModalTrocaAberto(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Emitir Papeleta de Troca</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Nº Papeleta</th>
                    <th className="py-2.5 px-3">Data Svç / Posto</th>
                    <th className="py-2.5 px-3">Militar Solicitante</th>
                    <th className="py-2.5 px-3">Militar Substituto</th>
                    <th className="py-2.5 px-3">Hierarquia / 48h</th>
                    <th className="py-2.5 px-3">Despacho Ajudante (CF-02)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(db.trocasServico ?? []).map((tr) => (
                    <tr key={tr.id} className="hover:bg-navy-900/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                        {tr.numeroSequencial}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-100">
                          {fmt(tr.dataServicoOriginal)}
                        </div>
                        <div className="text-[10px] text-sky-300">{ESCALA_LABEL[tr.posto]}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {fmtNomeId(tr.militarSolicitanteId)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-300">
                        {fmtNomeId(tr.militarSubstitutoId)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-[11px] text-slate-300">
                          {tr.nivelHierarquia === 1 && "1º Intra-divisão"}
                          {tr.nivelHierarquia === 2 && "2º Extra-divisão"}
                          {tr.nivelHierarquia === 3 && "3º Com o Retém do dia"}
                          {tr.nivelHierarquia === 4 && "4º Avanço do Retém"}
                        </div>
                        <div
                          className={`text-[10px] font-mono ${
                            tr.cumpreAntecedencia48h ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {tr.cumpreAntecedencia48h ? "✓ Antecedência ≥ 48h" : "⚠ Menos de 48h"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tr.statusAprovacaoAjudante === "AUTORIZADO_CF02"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : tr.statusAprovacaoAjudante === "INDEFERIDO"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {tr.statusAprovacaoAjudante === "AUTORIZADO_CF02"
                              ? "AUTORIZADO CF-02"
                              : tr.statusAprovacaoAjudante === "INDEFERIDO"
                                ? "INDEFERIDO"
                                : "PENDENTE CF-02"}
                          </span>
                          {tr.statusAprovacaoAjudante !== "AUTORIZADO_CF02" && (
                            <button
                              onClick={() => handleStatusPapeleta(tr.id, "AUTORIZADO_CF02")}
                              className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                              title="Autorizar pelo Ajudante (CF-02)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {tr.statusAprovacaoAjudante !== "INDEFERIDO" && (
                            <button
                              onClick={() => handleStatusPapeleta(tr.id, "INDEFERIDO")}
                              className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
                              title="Indeferir"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Modal de Emissão de Papeleta de Troca de Serviço (Anexo O - OI 02-06D) */}
      <Modal
        aberto={modalTrocaAberto}
        onFechar={() => setModalTrocaAberto(false)}
        titulo="Emitir Papeleta de Troca de Serviço (Anexo O — OI nº 02-06D)"
        subtitulo="Formalização com antecedência mínima de 48h, respeitando a hierarquia de troca e autorização do Ajudante (CF-02)."
        maxLargura="lg"
      >
        <form onSubmit={handleCriarPapeletaTroca} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Data do Serviço</label>
              <input
                type="date"
                value={trocaData}
                onChange={(e) => setTrocaData(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Posto de Serviço</label>
              <select
                value={trocaPosto}
                onChange={(e) => setTrocaPosto(e.target.value as EscalaTipo)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
              >
                {db.escalas
                  .filter((e) => e.id !== "INSPECAO_NAVAL")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Militar Solicitante (Escalado)</label>
              <select
                value={trocaSolicitanteId}
                onChange={(e) => setTrocaSolicitanteId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
              >
                {ctx.militares.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nomeMilitar(m)} [{m.setorCodigo ?? m.divisao}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Militar Substituto (Assume o Serviço)</label>
              <select
                value={trocaSubstitutoId}
                onChange={(e) => setTrocaSubstitutoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
              >
                {ctx.militares
                  .filter((m) => m.id !== trocaSolicitanteId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {nomeMilitar(m)} [{m.setorCodigo ?? m.divisao}]
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Hierarquia de Troca Combinada (OI 02-06D)
            </label>
            <select
              value={trocaNivel}
              onChange={(e) => setTrocaNivel(Number(e.target.value) as NivelHierarquiaTroca)}
              className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
            >
              <option value={1}>1º Prioridade: Troca Intra-divisão (mesmo setor/divisão)</option>
              <option value={2}>2º Prioridade: Troca Extra-divisão (com anuência dos Encarregados)</option>
              <option value={3}>3º Prioridade: Troca com o Retém do próprio dia (compensação futura)</option>
              <option value={4}>4º Prioridade: Acionamento / Avanço do Retém da escala</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Justificativa na Papeleta</label>
            <input
              type="text"
              value={trocaMotivo}
              onChange={(e) => setTrocaMotivo(e.target.value)}
              placeholder="Ex: Apoio em missão EPM / Compromisso particular autorizado"
              className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalTrocaAberto(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold"
            >
              Registrar Papeleta (Anexo O)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
