"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  SETORES_CFT,
  SETOR_LISTA,
  GRADE_SEMANAL_ADESTRAMENTOS,
  MOTIVO_DISPENSA_LABEL,
  REGRAS_PONTUACAO_OI_02_06D,
} from "@/lib/constants";
import { fmt, diffDays, addDays } from "@/lib/dates";
import { alertasFeriasSemAntecedencia } from "@/lib/engine/regrasOI0206D";
import { uid, nomeMilitar, toCSV, downloadArquivo } from "@/lib/utils";
import { gerarFolhaPresencaDia, gerarDetalheDiarioOI0206D } from "@/lib/engine/escalas";
import { obterIncumbenciasAcumuladas } from "@/lib/engine/disponibilidade";
import { PostoChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { podePreencherPresenca, podeHomologarPresenca, podeConsultarPresenca } from "@/lib/permissions";
import { ModalPreenchimentoContramestre } from "@/components/sargenteante/ModalPreenchimentoContramestre";
import { ModalEditarPresencaMilitar } from "@/components/sargenteante/ModalEditarPresencaMilitar";
import { FichaAcompanhamentoModal } from "@/components/militar/FichaAcompanhamentoModal";
import {
  ShieldAlert,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Printer,
  Anchor,
  GraduationCap,
  Compass,
  Wrench,
  UserCheck,
  BellRing,
  Layers,
  Award,
  Plus,
  ArrowRightLeft,
  Trash2,
  Edit3,
  ShieldCheck,
  Check,
} from "lucide-react";
import type {
  Afastamento,
  AfastamentoCategoria,
  DivisaoId,
  Militar,
  SetorCodigo,
  FolhaPresencaDiaRegistro,
  ApontamentoPresencaMilitar,
} from "@/lib/types";

type AbaSargenteante = "alocacao360" | "folha4tempos" | "planosemanal" | "adestramentos";

export default function SargenteantePage() {
  const { db, ctx, hoje, salvar, remover, salvarParametros } = useDb();
  const { usuario } = useAuth();

  const [aba, setAba] = useState<AbaSargenteante>("alocacao360");
  const [dataRef, setDataRef] = useState<string>(hoje);
  const [busca, setBusca] = useState<string>("");
  const [filtroSetor, setFiltroSetor] = useState<SetorCodigo | "TODOS">("TODOS");
  const [filtroCodigo, setFiltroCodigo] = useState<string>("TODOS");
  const [militarParaFicha, setMilitarParaFicha] = useState<Militar | null>(null);

  // Modal de Alocação / Publicação no Plano Semanal com Substituto Obrigatório e suporte a ASD
  const [modalAlocAberto, setModalAlocAberto] = useState(false);
  const [militarAlvo, setMilitarAlvo] = useState<Militar | null>(null);
  const [formCategoria, setFormCategoria] = useState<AfastamentoCategoria>("MISSAO");
  const [formSubtipo, setFormSubtipo] = useState<string>("MISSÃO MUTIRUM III");
  const [formTitulo, setFormTitulo] = useState<string>("");
  const [formLocal, setFormLocal] = useState<string>("Tabatinga / Calha do Solimões");
  const [formInicio, setFormInicio] = useState<string>(dataRef);
  const [formFim, setFormFim] = useState<string>(addDays(dataRef, 7));
  const [formAsd, setFormAsd] = useState<boolean>(false);
  const [formSubstitutoId, setFormSubstitutoId] = useState<string>("m59");
  const [formDocRef, setFormDocRef] = useState<string>("Plano Semanal CFT");
  const [formHorarioT1, setFormHorarioT1] = useState<string>("X");
  const [formHorarioT2, setFormHorarioT2] = useState<string>("X");
  const [formHorarioT3, setFormHorarioT3] = useState<string>("X");
  const [formHorarioT4, setFormHorarioT4] = useState<string>("X");
  const [msgFeedback, setMsgFeedback] = useState<string>("");

  // Modal de Impedimento de Instrutor de Adestramento
  const [adestModal, setAdestModal] = useState<(typeof GRADE_SEMANAL_ADESTRAMENTOS)[number] | null>(null);
  const [adestSubstitutoId, setAdestSubstitutoId] = useState<string>("m15");
  const [adestMotivo, setAdestMotivo] = useState<string>("Missão inopinada / Serviço de escala");

  // Controle de Presença Diária — Contramestre & Sargenteante-Geral
  const [modalContramestreAberto, setModalContramestreAberto] = useState(false);
  const [militarParaEditarPresenca, setMilitarParaEditarPresenca] = useState<Militar | null>(null);

  const folhaSalva = db.parametros.folhasPresenca?.[dataRef];
  const isContramestre = podePreencherPresenca(usuario) || usuario?.perfil === "ADMIN";
  const isSargenteante = podeHomologarPresenca(usuario);

  const salvarFolhaContramestre = async (novaFolha: FolhaPresencaDiaRegistro) => {
    const folhasAtuais = db.parametros.folhasPresenca || {};
    await salvarParametros({
      ...db.parametros,
      folhasPresenca: {
        ...folhasAtuais,
        [dataRef]: novaFolha,
      },
    });
    setMsgFeedback("Presença diária registrada com sucesso pelo Contramestre!");
    setTimeout(() => setMsgFeedback(""), 4000);
  };

  const salvarApontamentoIndividual = async (
    militarId: string,
    apontamento: ApontamentoPresencaMilitar | null
  ) => {
    const folhasAtuais = { ...(db.parametros.folhasPresenca || {}) };
    const folhaAtual = folhasAtuais[dataRef] || {
      data: dataRef,
      statusFolha: isSargenteante ? "HOMOLOGADA_SARGENTEANTE" : "PREENCHIDA_CONTRAMESTRE",
      apontamentos: {},
    };

    const novosApontamentos = { ...(folhaAtual.apontamentos || {}) };
    if (apontamento) {
      novosApontamentos[militarId] = apontamento;
    } else {
      delete novosApontamentos[militarId];
    }

    const folhaAtualizada: FolhaPresencaDiaRegistro = {
      ...folhaAtual,
      apontamentos: novosApontamentos,
      ...(isSargenteante
        ? {
            homologadoPorNome: usuario?.nomeGuerra
              ? `${usuario.posto || ""} ${usuario.nomeGuerra}`
              : "SO SACRAMENTO (Sargenteante-Geral)",
            homologadoPorNip: usuario?.nip || "97.1057.91",
            homologadoEm: new Date().toISOString(),
          }
        : {}),
    };

    await salvarParametros({
      ...db.parametros,
      folhasPresenca: {
        ...folhasAtuais,
        [dataRef]: folhaAtualizada,
      },
    });

    setMsgFeedback("Apontamento de presença atualizado!");
    setTimeout(() => setMsgFeedback(""), 4000);
  };

  const homologarFolhaSargenteante = async () => {
    const folhasAtuais = { ...(db.parametros.folhasPresenca || {}) };
    const folhaAtual = folhasAtuais[dataRef] || {
      data: dataRef,
      statusFolha: "ABERTA",
      apontamentos: {},
    };

    const folhaHomologada: FolhaPresencaDiaRegistro = {
      ...folhaAtual,
      statusFolha: "HOMOLOGADA_SARGENTEANTE",
      homologadoPorNome: usuario?.nomeGuerra
        ? `${usuario.posto || ""} ${usuario.nomeGuerra}`
        : "SO SACRAMENTO (Sargenteante-Geral)",
      homologadoPorNip: usuario?.nip || "97.1057.91",
      homologadoEm: new Date().toISOString(),
    };

    await salvarParametros({
      ...db.parametros,
      folhasPresenca: {
        ...folhasAtuais,
        [dataRef]: folhaHomologada,
      },
    });

    setMsgFeedback("Folha diária oficialmente homologada pelo Sargenteante-Geral!");
    setTimeout(() => setMsgFeedback(""), 4000);
  };

  // Folha de 4 Tempos calculada com a precedência estrita de 4 níveis
  const folha = useMemo(() => gerarFolhaPresencaDia(ctx, dataRef), [ctx, dataRef]);
  const folhaMap = useMemo(() => new Map(folha.map((l) => [l.militarId, l])), [folha]);

  // Detalhe Diário de Serviço OI 02-06D
  const detalheDia = useMemo(() => gerarDetalheDiarioOI0206D(ctx, dataRef), [ctx, dataRef]);

  // Estatísticas rápidas do dia para o Sargenteante-Geral
  const kpis = useMemo(() => {
    let expediente = 0;
    let servico24h = 0;
    let ssvc = 0;
    let inOuFaina = 0;
    let ausentesXXXX = 0;
    let acumulandoPaiol = 0;

    for (const l of folha) {
      if (l.codigo === "PRESENTE") expediente++;
      else if (l.codigo === "SVÇ" || l.codigo === "MO") servico24h++;
      else if (l.codigo === "SSVÇ") ssvc++;
      else if (l.codigo === "IN" || l.codigo === "FAINA") inOuFaina++;
      else if (l.codigo === "X") ausentesXXXX++;
      if (l.incumbenciasAcumuladas.length > 0) acumulandoPaiol++;
    }
    return { expediente, servico24h, ssvc, inOuFaina, ausentesXXXX, acumulandoPaiol };
  }, [folha]);

  // Militares filtrados e ordenados por antiguidade (01 a 64)
  const militaresFiltrados = useMemo(() => {
    return [...ctx.militares]
      .sort((a, b) => (a.antiguidadeOrdem ?? 99) - (b.antiguidadeOrdem ?? 99))
      .filter((m) => {
        if (filtroSetor !== "TODOS" && m.setorCodigo !== filtroSetor && m.setorSecundario !== filtroSetor) {
          return false;
        }
        const linha = folhaMap.get(m.id);
        if (filtroCodigo !== "TODOS" && linha?.codigo !== filtroCodigo) {
          return false;
        }
        if (busca.trim()) {
          const t = busca.toLowerCase();
          const matchNome = m.nomeGuerra.toLowerCase().includes(t) || m.nomeCompleto.toLowerCase().includes(t);
          const matchNip = m.nip.includes(t);
          const matchSetor = (m.setorCodigo ?? "").toLowerCase().includes(t);
          const matchInc = (m.incumbencias ?? []).some((i) => i.toLowerCase().includes(t));
          const matchFunc = (m.funcaoPrincipal ?? m.funcao ?? "").toLowerCase().includes(t);
          if (!matchNome && !matchNip && !matchSetor && !matchInc && !matchFunc) return false;
        }
        return true;
      });
  }, [ctx.militares, filtroSetor, filtroCodigo, busca, folhaMap]);

  const notificar = (msg: string) => {
    setMsgFeedback(msg);
    setTimeout(() => setMsgFeedback(""), 4500);
  };

  // Ações de Alocação Rápida (1-Clique) para o Sargenteante-Geral
  const alocarUmClique = async (
    m: Militar,
    preset: "IN_DIARIA" | "AULA_EPM" | "FAINA_EPM" | "SSVC" | "MODAL_COMPLETO",
  ) => {
    if (preset === "MODAL_COMPLETO") {
      setMilitarAlvo(m);
      setFormCategoria("MISSAO");
      setFormSubtipo("MISSÃO MUTIRUM III");
      setFormTitulo(`Missão / Comissão — ${nomeMilitar(m)}`);
      setFormInicio(dataRef);
      setFormFim(addDays(dataRef, 7));
      setFormAsd(true);
      // Sugerir substituto do mesmo setor ou divisão
      const substSugerido =
        ctx.militares.find((x) => x.id !== m.id && x.setorCodigo === m.setorCodigo) ||
        ctx.militares.find((x) => x.id !== m.id && x.divisao === m.divisao) ||
        ctx.militares[0];
      setFormSubstitutoId(substSugerido?.id ?? "m59");
      setFormHorarioT1("X");
      setFormHorarioT2("X");
      setFormHorarioT3("X");
      setFormHorarioT4("X");
      setModalAlocAberto(true);
      return;
    }

    const agora = new Date().toISOString();
    const substPadrao =
      ctx.militares.find((x) => x.id !== m.id && x.setorCodigo === m.setorCodigo)?.id ||
      ctx.militares.find((x) => x.id !== m.id && x.divisao === m.divisao)?.id ||
      "m59";

    if (preset === "IN_DIARIA") {
      const novo: Afastamento = {
        id: uid("af"),
        categoria: "INSPECAO_NAVAL",
        divisao: "STA",
        subtipo: "INSPEÇÃO NAVAL",
        titulo: `Inspeção Naval Diária (06:30 às 16:00) — ${nomeMilitar(m)}`,
        local: "Rio Solimões / Javari",
        inicio: dataRef,
        fim: dataRef,
        militarIds: [m.id],
        status: "CONFIRMADO",
        impactaEscala: false,
        militarSubstitutoId: substPadrao,
        horarioEspecifico: { t1: "06:30", t2: "11:30", t3: "13:00", t4: "16:00" },
        criadoPor: usuario?.nome || "Sargenteante-Geral",
        createdAt: agora,
        updatedAt: agora,
      };
      await salvar("afastamentos", novo);
      notificar(`${nomeMilitar(m)} escalado em Inspeção Naval Diária (06:30 | 11:30 | 13:00 | 16:00) em ${fmt(dataRef)}.`);
    } else if (preset === "AULA_EPM") {
      const novo: Afastamento = {
        id: uid("af"),
        categoria: "CURSO",
        divisao: "EPM",
        subtipo: "INSTRUTOR – CFAQ-MFM T1-2026",
        titulo: `Ministrar aula em curso do EPM — ${nomeMilitar(m)}`,
        local: "Salas de Aula CF-11 (EPM)",
        inicio: dataRef,
        fim: dataRef,
        militarIds: [m.id],
        status: "CONFIRMADO",
        impactaEscala: true,
        militarSubstitutoId: substPadrao,
        horarioEspecifico: { t1: "X", t2: "X", t3: "X", t4: "X" },
        criadoPor: usuario?.nome || "Sargenteante-Geral",
        createdAt: agora,
        updatedAt: agora,
      };
      await salvar("afastamentos", novo);
      notificar(`${nomeMilitar(m)} alocado como Instrutor EPM (X X X X) em ${fmt(dataRef)}.`);
    } else if (preset === "FAINA_EPM") {
      const novo: Afastamento = {
        id: uid("af"),
        categoria: "OUTRO",
        divisao: m.divisao,
        subtipo: "FAXINA NO EPM",
        titulo: `09:00 às 09:40 – FAXINA NO EPM (${nomeMilitar(m)})`,
        local: "Divisão EPM (CF-10)",
        inicio: dataRef,
        fim: dataRef,
        militarIds: [m.id],
        status: "CONFIRMADO",
        impactaEscala: false,
        horarioEspecifico: { t1: "07:30", t2: "09:00–09:40", t3: "13:15", t4: "16:30" },
        criadoPor: usuario?.nome || "Sargenteante-Geral",
        createdAt: agora,
        updatedAt: agora,
      };
      await salvar("afastamentos", novo);
      notificar(`${nomeMilitar(m)} alocado em faina de apoio (09:00 às 09:40 – FAXINA NO EPM).`);
    } else if (preset === "SSVC") {
      const novo: Afastamento = {
        id: uid("af"),
        categoria: "DISPENSA",
        divisao: m.divisao,
        subtipo: "SSVÇ – Saindo de Serviço",
        titulo: `CONTRAMESTRE / QUARTO SAINDO DE SVÇ`,
        inicio: dataRef,
        fim: dataRef,
        militarIds: [m.id],
        status: "CONFIRMADO",
        impactaEscala: false,
        horarioEspecifico: { t1: "SSVÇ", t2: "X", t3: "X", t4: "X" },
        criadoPor: usuario?.nome || "Sargenteante-Geral",
        createdAt: agora,
        updatedAt: agora,
      };
      await salvar("afastamentos", novo);
      notificar(`${nomeMilitar(m)} marcado como SSVÇ (Saindo de Serviço) em ${fmt(dataRef)}.`);
    }
  };

  // Salvar alocação completa pelo Modal (Plano Semanal + Substituto Obrigatório + ASD)
  const handleSalvarModalAlocacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!militarAlvo) return;
    const agora = new Date().toISOString();
    const divisaoMap: DivisaoId = militarAlvo.divisao;
    const novo: Afastamento = {
      id: uid("af"),
      categoria: formCategoria,
      divisao: divisaoMap,
      subtipo: formSubtipo.trim() || "Missão / Ausência",
      titulo: formTitulo.trim() || `${formSubtipo} — ${nomeMilitar(militarAlvo)}`,
      local: formLocal.trim() || undefined,
      inicio: formInicio,
      fim: formAsd ? addDays(formInicio, 90) : formFim,
      terminoAsd: formAsd,
      militarIds: [militarAlvo.id],
      militarSubstitutoId: formSubstitutoId,
      documentoReferencia: formDocRef.trim() || undefined,
      status: "CONFIRMADO",
      impactaEscala: formCategoria !== "OUTRO",
      horarioEspecifico: {
        t1: formHorarioT1,
        t2: formHorarioT2,
        t3: formHorarioT3,
        t4: formHorarioT4,
      },
      criadoPor: usuario?.nome || "Sargenteante-Geral (CF-31)",
      createdAt: agora,
      updatedAt: agora,
    };

    await salvar("afastamentos", novo);
    setModalAlocAberto(false);
    const subst = ctx.militarMap.get(formSubstitutoId);
    notificar(
      `Publicado no Plano Semanal: ${nomeMilitar(militarAlvo)} (${formAsd ? `${fmt(formInicio)} A ASD` : `${fmt(formInicio)} a ${fmt(formFim)}`}) · Substituto: ${nomeMilitar(subst)}.`,
    );
  };

  // Alternar Banner de Regresso Geral
  const toggleRegressoGeral = async () => {
    await salvarParametros({
      ...db.parametros,
      regressoGeralAtivo: !db.parametros.regressoGeralAtivo,
      regressoGeralTexto: db.parametros.regressoGeralTexto || "REGRESSO GERAL 07:00 ATÉ SEXTA-FEIRA",
    });
  };

  // Exportar Folha de Presença 4 Tempos em CSV
  const exportarFolhaCSV = () => {
    const linhas = militaresFiltrados.map((m) => {
      const l = folhaMap.get(m.id)!;
      return {
        Antiguidade: String(m.antiguidadeOrdem ?? ""),
        NIP: m.nip,
        Posto_Grad: m.posto,
        Especialidade: m.especialidade ?? "",
        Nome_Guerra: m.nomeGuerra,
        Setor_CFT: m.setorCodigo ?? m.divisao,
        Tempo_1_Entrada: l.tempo1,
        Tempo_2_Saida_Almoco: l.tempo2,
        Tempo_3_Retorno_Almoco: l.tempo3,
        Tempo_4_Saida_Expediente: l.tempo4,
        Status_Observacao: l.statusObservacao,
        Acumulando_Incumbencia: l.incumbenciasAcumuladas
          .map((i) => `${i.incumbencia} (de ${i.titularNome})`)
          .join(" | "),
      };
    });
    downloadArquivo(`Folha_Presenca_4Tempos_${dataRef}.csv`, toCSV(linhas), "text/csv");
  };

  // Ausências ativas ou futuras para a tabela 2.2 / 2.3 do Plano Semanal
  const ausenciasPlanoSemanal = useMemo(() => {
    return db.afastamentos
      .filter((a) => a.status !== "CANCELADO" && (a.terminoAsd || a.fim >= dataRef))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [db.afastamentos, dataRef]);

  // Alertas de férias sem aviso mínimo de 8 dias (OI 02-06D)
  const alertasFerias8Dias = useMemo(
    () => alertasFeriasSemAntecedencia(ausenciasPlanoSemanal, hoje),
    [ausenciasPlanoSemanal, hoje],
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional da Central do Sargenteante-Geral */}
      <div className="p-5 rounded-2xl glass border border-sky-500/30 bg-gradient-to-r from-[#071226] via-[#0b1730] to-[#071226]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
                CF-31 • SO-MOR / Sargenteante-Geral / Detalhista
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-500/15 text-sky-300 border border-sky-400/30">
                OI 02-06D • 64 Militares Mapeados
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1.5">
              Central de Comando e Alocação do Sargenteante-Geral
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Visão 360º da tripulação por setor (CF-01 a CF-42), Folha Diária de Presença (4 Tempos), Plano Semanal (c/ Substituto & ASD) e Adestramentos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300">Data Operacional:</span>
              <input
                type="date"
                value={dataRef}
                onChange={(e) => setDataRef(e.target.value)}
                className="bg-transparent text-xs font-mono text-white focus:outline-none"
              />
              {dataRef !== hoje && (
                <button
                  onClick={() => setDataRef(hoje)}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold"
                >
                  Hoje
                </button>
              )}
            </div>

            <button
              onClick={toggleRegressoGeral}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                db.parametros.regressoGeralAtivo
                  ? "bg-rose-600/25 border-rose-400/60 text-rose-200 shadow-lg shadow-rose-950/50"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400/50"
              }`}
              title="Ativa/desativa alerta de Regresso Geral às 07:00 na Folha de Presença"
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              <span>{db.parametros.regressoGeralAtivo ? "Regresso Geral: ATIVO (07h)" : "Ativar Regresso Geral"}</span>
            </button>
          </div>
        </div>

        {/* Banner de Regresso Geral se ativo */}
        {db.parametros.regressoGeralAtivo && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-between gap-3 text-rose-200 text-xs font-bold">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-rose-300 animate-bounce" />
              <span>ROTINA ESPECIAL ATIVA: {db.parametros.regressoGeralTexto || "REGRESSO GERAL 07:00 ATÉ SEXTA-FEIRA"}</span>
            </div>
            <span className="text-[11px] font-normal text-rose-300">
              1º Tempo ajustado para 07:00 e dispensa SSVÇ suspensa até ordem em contrário.
            </span>
          </div>
        )}

        {/* Feedback Toast */}
        {msgFeedback && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center gap-2 text-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{msgFeedback}</span>
          </div>
        )}

        {/* KPIs Operacionais do Dia */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">Expediente Normal</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{kpis.expediente}</div>
            <div className="text-[10px] text-slate-500 font-mono">07:30 às 16:30</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">Em Serviço (24h / MO)</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5">{kpis.servico24h}</div>
            <div className="text-[10px] text-slate-500 font-mono">OSE, CTR, SECOM, VG, MO</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">Saindo de Svç (SSVÇ)</div>
            <div className="text-xl font-bold text-teal-300 mt-0.5">{kpis.ssvc}</div>
            <div className="text-[10px] text-slate-500 font-mono">SSVÇ | X | X | X</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">IN Diária / Faina</div>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">{kpis.inOuFaina}</div>
            <div className="text-[10px] text-slate-500 font-mono">06:30 às 16:00 / Apoio</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400">Destaque / Ausente (XXXX)</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{kpis.ausentesXXXX}</div>
            <div className="text-[10px] text-slate-500 font-mono">Mutirum, EPM, Férias, LTS</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
            <div className="text-[11px] text-amber-300 font-semibold">Acumulando Paiol</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{kpis.acumulandoPaiol}</div>
            <div className="text-[10px] text-amber-300/80 font-mono">Substitutos Ativos</div>
          </div>
        </div>
      </div>

      {/* Navegação das 4 Abas Operacionais do Sargenteante */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setAba("alocacao360")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            aba === "alocacao360"
              ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow"
              : "bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. Visão 360º & Escalação 1-Clique (CF-01 a CF-42)</span>
        </button>

        <button
          onClick={() => setAba("folha4tempos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            aba === "folha4tempos"
              ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow"
              : "bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. Folha Diária de Presença e Regresso (4 Tempos)</span>
        </button>

        <button
          onClick={() => setAba("planosemanal")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            aba === "planosemanal"
              ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow"
              : "bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>3. Plano Semanal: Ausências, ASD & Substitutos ({ausenciasPlanoSemanal.length})</span>
        </button>

        <button
          onClick={() => setAba("adestramentos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            aba === "adestramentos"
              ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow"
              : "bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>4. Grade de Adestramentos, TFM & OS Instrutores EPM</span>
        </button>
      </div>

      {/* Barra de Filtros Comum para Abas 1 e 2 */}
      {(aba === "alocacao360" || aba === "folha4tempos") && (
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome de guerra, NIP, setor (ex: CF-20), função ou paiol/incumbência (ex: Paiol do Mestre, Sala DOC)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroSetor}
              onChange={(e) => setFiltroSetor(e.target.value as SetorCodigo | "TODOS")}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            >
              <option value="TODOS">Todos os Setores (CF-01 a CF-42)</option>
              {SETOR_LISTA.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.codigo} — {s.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroCodigo}
              onChange={(e) => setFiltroCodigo(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            >
              <option value="TODOS">Todas as Situações (4 Tempos)</option>
              <option value="PRESENTE">Expediente Normal (07:30–16:30)</option>
              <option value="SVÇ">Em Serviço 24h (OSE/CTR/VG/SECOM)</option>
              <option value="MO">Motorista de Serviço (06:50–18:20)</option>
              <option value="SSVÇ">Saindo de Serviço (SSVÇ)</option>
              <option value="IN">Inspeção Naval Diária (06:30–16:00)</option>
              <option value="FAINA">Faina / Apoio (Ex: Faxina EPM)</option>
              <option value="X">Ausência Integral (X X X X)</option>
            </select>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 1: VISÃO 360º & ALOCAÇÃO 1-CLIQUE POR MILITAR                     */}
      {/* ===================================================================== */}
      {aba === "alocacao360" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {militaresFiltrados.map((m) => {
            const l = folhaMap.get(m.id)!;
            const setorInfo = m.setorCodigo ? SETORES_CFT[m.setorCodigo] : undefined;
            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition flex flex-col justify-between gap-3"
              >
                <div>
                  {/* Topo do Card: Antiguidade, Posto, Nome, NIP e Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex items-center gap-2 flex-wrap cursor-pointer group"
                      onClick={() => setMilitarParaFicha(m)}
                      title="Clique para abrir a Ficha de Acompanhamento Individual"
                    >
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        #{String(m.antiguidadeOrdem ?? 0).padStart(2, "0")}
                      </span>
                      <PostoChip posto={m.posto} />
                      <span className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition">
                        {m.especialidade ? `(${m.especialidade}) ` : ""}
                        {m.nomeGuerra}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{m.nip}</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[10px] font-bold group-hover:bg-sky-500 group-hover:text-navy-950 transition">
                        📄 Ficha
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        l.codigo === "PRESENTE"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : l.codigo === "SSVÇ"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-400/40"
                            : l.codigo === "SVÇ" || l.codigo === "MO"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                              : l.codigo === "IN" || l.codigo === "FAINA"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                      }`}
                    >
                      {l.tempo1} | {l.tempo2} | {l.tempo3} | {l.tempo4}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-1">{m.nomeCompleto}</div>

                  {/* Setor Oficial CF-XX + Função + Incumbências/Paióis */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {m.setorCodigo && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/30"
                        title={setorInfo?.atividadesResumo}
                      >
                        {m.setorCodigo} {setorInfo ? `• ${setorInfo.nome}` : ""}
                      </span>
                    )}
                    {m.setorSecundario && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        2º Setor: {m.setorSecundario}
                      </span>
                    )}
                    {m.instrutorEpm && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                        🎓 OS Instrutor EPM ({(m.areasInstrutoria ?? ["CFAQ"]).join(", ")})
                      </span>
                    )}
                    {m.dispensaEscala && m.dispensaEscala !== "NENHUMA" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-300 border border-amber-500/30">
                        Dispensa OI 02-06D: {MOTIVO_DISPENSA_LABEL[m.dispensaEscala]}
                      </span>
                    )}
                  </div>

                  {/* Paióis e Compartimentos Titulares */}
                  {(m.incumbencias?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Incumbências/Paióis:
                      </span>
                      {m.incumbencias!.map((inc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-800/90 text-slate-200 border border-slate-700"
                        >
                          🗝️ {inc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* TRAVA DE PAIOL ÓRFÃO: Badge de "Acumulando Incumbência" como Substituto */}
                  {l.incumbenciasAcumuladas.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-400/50 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>ACUMULANDO INCUMBÊNCIA (Militar Substituto no Plano Semanal):</span>
                      </div>
                      {l.incumbenciasAcumuladas.map((inc, i) => (
                        <div key={i} className="text-[11px] text-amber-100 pl-5">
                          • <strong>{inc.incumbencia}</strong> — cobrindo <em>{inc.titularNome}</em> ({inc.motivo})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status atual na Folha de 4 Tempos */}
                  <div className="mt-2 text-[11px] text-slate-300 font-mono bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                    <span>Status do Dia: {l.statusObservacao}</span>
                    <span className="text-[10px] text-slate-400">
                      Pts Escala: N {m.pontosEscala?.normal ?? 0} | D {m.pontosEscala?.domingoFeriado ?? 0}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação Rápida do Sargenteante-Geral */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => alocarUmClique(m, "IN_DIARIA")}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition"
                    title="Escalar em Inspeção Naval Diária (06:30 | 11:30 | 13:00 | 16:00)"
                  >
                    🚤 IN Diária
                  </button>
                  <button
                    onClick={() => alocarUmClique(m, "AULA_EPM")}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition"
                    title="Escalar para ministrar aula em curso do EPM (X X X X)"
                  >
                    🎓 Aula EPM
                  </button>
                  <button
                    onClick={() => alocarUmClique(m, "FAINA_EPM")}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    title="Alocar em faina temporária (09:00 às 09:40 – FAXINA NO EPM)"
                  >
                    🧹 Faina EPM
                  </button>
                  <button
                    onClick={() => alocarUmClique(m, "SSVC")}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition"
                    title="Marcar como Saindo de Serviço (SSVÇ | X | X | X)"
                  >
                    🛡️ SSVÇ
                  </button>
                  <button
                    type="button"
                    onClick={() => setMilitarParaFicha(m)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-navy-950 hover:bg-sky-950/80 text-sky-300 border border-sky-500/40 transition flex items-center gap-1 cursor-pointer"
                    title="Visualizar e editar a Ficha Individual de Acompanhamento (com Histórico)"
                  >
                    <span>📄 Ficha</span>
                  </button>
                  <button
                    onClick={() => alocarUmClique(m, "MODAL_COMPLETO")}
                    className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Missão / Ausência + Substituto</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: FOLHA DIÁRIA DE PRESENÇA E REGRESSO (4 TEMPOS)                 */}
      {/* ===================================================================== */}
      {aba === "folha4tempos" && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Folha Diária de Presença e Regresso — 4 Tempos ({fmt(dataRef)})
              </h2>
              <p className="text-xs text-slate-400">
                Ordem estrita de precedência: 1º Ausência Total (XXXX) → 2º Entrando de Serviço → 3º Saindo de Serviço (SSVÇ) → 4º IN / Faina → 5º Expediente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão de Preenchimento da Chamada pelo Contramestre */}
              <button
                type="button"
                onClick={() => setModalContramestreAberto(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
                title="Abrir Chamada Matinal / Registro de Presença Diária pelo Contramestre"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Chamada Contramestre</span>
              </button>

              {/* Botão de Homologação pelo Sargenteante-Geral */}
              {isSargenteante && folhaSalva?.statusFolha !== "HOMOLOGADA_SARGENTEANTE" && (
                <button
                  type="button"
                  onClick={homologarFolhaSargenteante}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
                  title="Homologar oficialmente a Folha Diária de Presença do Sargenteante-Geral"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Homologar Folha</span>
                </button>
              )}

              {/* Status da Folha para Imediato e Tripulantes */}
              {folhaSalva?.statusFolha === "HOMOLOGADA_SARGENTEANTE" ? (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Homologada: {folhaSalva.homologadoPorNome || "Sargenteante"}</span>
                </div>
              ) : folhaSalva?.statusFolha === "PREENCHIDA_CONTRAMESTRE" ? (
                <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preenchida: {folhaSalva.preenchidoPorNome || "Contramestre"}</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Folha Aberta (Pendente Chamada)</span>
                </div>
              )}

              <button
                onClick={exportarFolhaCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-xs font-bold text-sky-300 flex items-center gap-1.5 border border-sky-400/40"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Folha</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Posto / Nome de Guerra</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3 text-center">1º Tempo (Entrada)</th>
                  <th className="py-2.5 px-3 text-center">2º Tempo (Saída Alm.)</th>
                  <th className="py-2.5 px-3 text-center">3º Tempo (Regresso)</th>
                  <th className="py-2.5 px-3 text-center">4º Tempo (Saída Exp.)</th>
                  <th className="py-2.5 px-3">Status / Observação & Acúmulo de Incumbência</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {militaresFiltrados.map((m) => {
                  const l = folhaMap.get(m.id)!;
                  const isXXXX = l.codigo === "X";
                  const isSSVC = l.codigo === "SSVÇ";
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {String(m.antiguidadeOrdem ?? 0).padStart(2, "0")}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <PostoChip posto={m.posto} />
                          <div>
                            <div className="font-bold text-slate-100">
                              {m.especialidade ? `${m.especialidade} ` : ""}
                              {m.nomeGuerra}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{m.nip}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-sky-300 font-semibold">
                        {m.setorCodigo ?? m.divisao}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-mono font-bold ${
                          isSSVC
                            ? "text-teal-300 bg-teal-950/30"
                            : isXXXX
                              ? "text-amber-400 bg-amber-950/20"
                              : "text-slate-200"
                        }`}
                      >
                        {l.tempo1}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-mono font-bold ${
                          isXXXX || isSSVC ? "text-amber-400/80 bg-amber-950/15" : "text-slate-200"
                        }`}
                      >
                        {l.tempo2}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-mono font-bold ${
                          isXXXX || isSSVC ? "text-amber-400/80 bg-amber-950/15" : "text-slate-200"
                        }`}
                      >
                        {l.tempo3}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-mono font-bold ${
                          isXXXX || isSSVC ? "text-amber-400/80 bg-amber-950/15" : "text-slate-200"
                        }`}
                      >
                        {l.tempo4}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-200">{l.statusObservacao}</div>
                        {l.incumbenciasAcumuladas.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {l.incumbenciasAcumuladas.map((inc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40"
                              >
                                ⚠️ Acumulando: {inc.incumbencia} (de {inc.titularNome})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: PLANO SEMANAL — TABELA 2.2 / 2.3 AUSÊNCIAS, ASD & SUBSTITUTOS  */}
      {/* ===================================================================== */}
      {aba === "planosemanal" && (
        <div className="space-y-4">
          {alertasFerias8Dias.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-xs text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  Regra de Antecedência de Férias (Mínimo 8 dias para fechamento do Detalhe de Serviço):
                </div>
                <p className="mt-0.5 text-amber-100/90">
                  Existem {alertasFerias8Dias.length} lançamento(s) de férias iniciando em menos de 8 dias. Verifique se os militares substitutos já assumiram a transferência de incumbências/paióis.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Item 2.2 / 2.3 do Plano Semanal — Ausência de Militares e Substituições Obrigatórias
                </h2>
                <p className="text-xs text-slate-400">
                  Toda ausência exige Militar/Função, Motivo, Período (suporte a ASD — Até Segunda Determinação) e Militar Substituto.
                </p>
              </div>
              <button
                onClick={() => alocarUmClique(ctx.militares[7] || ctx.militares[0], "MODAL_COMPLETO")}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Ausência / Missão no Plano Semanal</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Militar Ausente / Setor & Incumbências</th>
                    <th className="py-2.5 px-4">Motivo / Comissão</th>
                    <th className="py-2.5 px-4">Período (Suporte ASD)</th>
                    <th className="py-2.5 px-4">Militar Substituto Designado (Trava de Paiol)</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {ausenciasPlanoSemanal.map((af) => {
                    const subst = af.militarSubstitutoId ? ctx.militarMap.get(af.militarSubstitutoId) : undefined;
                    return (
                      <tr key={af.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="space-y-1.5">
                            {af.militarIds.map((mid) => {
                              const m = ctx.militarMap.get(mid);
                              if (!m) return null;
                              return (
                                <div key={mid}>
                                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                    <PostoChip posto={m.posto} />
                                    <span>{m.especialidade ? `(${m.especialidade}) ` : ""}{m.nomeGuerra}</span>
                                    <span className="text-[10px] font-mono text-sky-400">[{m.setorCodigo ?? m.divisao}]</span>
                                  </div>
                                  {(m.incumbencias?.length ?? 0) > 0 && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Paiol/Incumbência: {m.incumbencias!.join(", ")}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-amber-300">{af.subtipo || af.categoria}</div>
                          <div className="text-slate-300 text-[11px]">{af.titulo}</div>
                          {af.documentoReferencia && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Ref: {af.documentoReferencia}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {af.terminoAsd ? (
                            <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40 font-bold">
                              {fmt(af.inicio)} A ASD
                            </span>
                          ) : (
                            <span className="text-slate-200">
                              {fmt(af.inicio)} a {fmt(af.fim)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {subst ? (
                            <div>
                              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{nomeMilitar(subst)} ({subst.setorCodigo ?? subst.divisao})</span>
                              </div>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                                Acumulando Incumbência no período
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[11px]">
                              ⚠️ SEM SUBSTITUTO DESIGNADO
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {af.somenteLeitura ? (
                            <span className="text-[10px] text-sky-400 font-mono" title="Missão gerenciada pelo Sistema Itinerante">
                              🔗 Itinerante
                            </span>
                          ) : (
                            <button
                              onClick={() => remover("afastamentos", af.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition"
                              title="Encerrar / Remover publicação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 4: GRADE FIXA DE ADESTRAMENTOS, TFM & OS DE INSTRUTORES EPM       */}
      {/* ===================================================================== */}
      {aba === "adestramentos" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Coluna 1: Grade Fixa Semanal de Adestramentos e TFM */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Grade Fixa Semanal de Adestramentos e TFM da Tripulação</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Regra de Impedimento: Se o instrutor escalado estiver impossibilitado, deve acionar um substituto e registrar a alteração junto ao 2ºTen (AA) Azevedo, 1ºSG-MT Nepomuceno ou 3ºSG-MA José Thomáz.
              </p>
            </div>

            <div className="space-y-3">
              {GRADE_SEMANAL_ADESTRAMENTOS.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        {item.diasLabel} • {item.horario}
                      </span>
                      <span className="text-[11px] font-mono text-amber-300 font-semibold">
                        Titular: {item.instrutorTitular}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-100 mt-2">{item.atividade}</h3>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Coordenação de Alterações: {item.coordenacao.join(" • ")}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setAdestModal(item)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 transition"
                    >
                      Registrar Impedimento / Acionar Substituto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Banco de Instrutores Eventuais do EPM (OS Anual CF-10 / CF-11) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                <span>OS de Instrutores Eventuais do EPM & Adestramento Interno</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Militares qualificados para ministrar aulas nos cursos aquaviários (CFAQ-MFM, CCCAM) e adestramentos técnicos da OM.
              </p>
            </div>

            <div className="space-y-2.5">
              {ctx.militares
                .filter((m) => m.instrutorEpm)
                .map((m) => {
                  const l = folhaMap.get(m.id)!;
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <PostoChip posto={m.posto} />
                          <span className="font-bold text-xs text-slate-100">
                            {m.especialidade ? `(${m.especialidade}) ` : ""}{m.nomeGuerra}
                          </span>
                          <span className="text-[10px] font-mono text-sky-400">[{m.setorCodigo}]</span>
                        </div>
                        <div className="text-[11px] text-purple-300 mt-1">
                          Áreas habilitadas: {(m.areasInstrutoria ?? ["CFAQ"]).join(" • ")}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Situação hoje: {l.statusObservacao}
                        </div>
                      </div>
                      <button
                        onClick={() => alocarUmClique(m, "AULA_EPM")}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 shrink-0"
                      >
                        Escalar em Aula Hoje
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PUBLICAR AUSÊNCIA / MISSÃO COM SUBSTITUTO OBRIGATÓRIO & ASD    */}
      {/* ===================================================================== */}
      <Modal
        aberto={modalAlocAberto}
        onFechar={() => setModalAlocAberto(false)}
        titulo="Publicar Ausência / Missão no Plano Semanal (OI 02-06D)"
      >
        <form onSubmit={handleSalvarModalAlocacao} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Militar Titular (Ausente / Destacado)</label>
            <select
              value={militarAlvo?.id ?? ""}
              onChange={(e) => setMilitarAlvo(ctx.militarMap.get(e.target.value) ?? null)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
            >
              {ctx.militares.map((m) => (
                <option key={m.id} value={m.id}>
                  #{String(m.antiguidadeOrdem ?? 0).padStart(2, "0")} — {nomeMilitar(m)} [{m.setorCodigo}] {(m.incumbencias?.length ?? 0) > 0 ? `(Paiol: ${m.incumbencias!.join(", ")})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
              <select
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value as AfastamentoCategoria)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="MISSAO">Missão / Comissão Operativa (Mutirum / BRACOLPER)</option>
                <option value="INSPECAO_NAVAL">Inspeção Naval (IN Longa Duração / Diária)</option>
                <option value="CURSO">Curso / Ministrar Aula no EPM</option>
                <option value="FERIAS">Férias Regulamentares (Aviso mín. 8 dias)</option>
                <option value="LICENCA">Licença Médica (LTS / LTSPF)</option>
                <option value="DISPENSA">Instalação / Dispensa / SSVÇ</option>
                <option value="OUTRO">Faina / Apoio Interno (Ex: Faxina EPM)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Código / Motivo no Plano Semanal</label>
              <input
                type="text"
                value={formSubtipo}
                onChange={(e) => setFormSubtipo(e.target.value)}
                placeholder="Ex: MISSÃO MUTIRUM III, IN, LTSPF, INSTRUTOR CFAQ"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Descrição Detalhada</label>
            <input
              type="text"
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              placeholder="Ex: Missão Mutirum III — Calha do Rio Solimões"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Data de Início</label>
              <input
                type="date"
                value={formInicio}
                onChange={(e) => setFormInicio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Data de Término</label>
              <input
                type="date"
                value={formFim}
                disabled={formAsd}
                onChange={(e) => setFormFim(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono disabled:opacity-40"
                required={!formAsd}
              />
            </div>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={formAsd}
                onChange={(e) => setFormAsd(e.target.checked)}
                className="rounded"
              />
              <span>Término ASD (Até 2ª Determinação)</span>
            </label>
          </div>

          {/* Seleção Obrigatória do Militar Substituto (Trava de Paiol/Incumbência) */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-2">
            <label className="block text-amber-300 font-bold">
              Militar Substituto Obrigatório (Item 2.2 / 2.3 do Plano Semanal — Trava de Paiol/Função)
            </label>
            {militarAlvo && (militarAlvo.incumbencias?.length ?? 0) > 0 && (
              <div className="text-[11px] text-amber-200">
                O substituto passará a exibir o alerta de <strong>&ldquo;Acumulando Incumbência&rdquo;</strong> para:{" "}
                <span className="underline">{militarAlvo.incumbencias!.join(", ")}</span>.
              </div>
            )}
            <select
              value={formSubstitutoId}
              onChange={(e) => setFormSubstitutoId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-slate-100 font-semibold"
              required
            >
              {ctx.militares
                .filter((x) => x.id !== militarAlvo?.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {nomeMilitar(x)} [{x.setorCodigo ?? x.divisao}] — {x.funcao ?? x.funcaoPrincipal}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalAlocAberto(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              Confirmar e Publicar no Plano Semanal
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL: IMPEDIMENTO DE INSTRUTOR DE ADESTRAMENTO                       */}
      {/* ===================================================================== */}
      <Modal
        aberto={Boolean(adestModal)}
        onFechar={() => setAdestModal(null)}
        titulo="Substituição de Instrutor de Adestramento / TFM"
      >
        {adestModal && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-bold text-slate-100">{adestModal.atividade}</div>
              <div className="text-slate-400 mt-0.5">
                Horário: {adestModal.diasLabel} às {adestModal.horario} • Titular: {adestModal.instrutorTitular}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Instrutor Substituto Acionado</label>
              <select
                value={adestSubstitutoId}
                onChange={(e) => setAdestSubstitutoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
              >
                {ctx.militares.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nomeMilitar(m)} [{m.setorCodigo}] {m.instrutorEpm ? "• (Habilitado OS Instrutor)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Motivo da Alteração</label>
              <input
                type="text"
                value={adestMotivo}
                onChange={(e) => setAdestMotivo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
              />
            </div>

            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-200 text-[11px]">
              A alteração será registrada formalmente junto à coordenação de adestramento:{" "}
              <strong>{adestModal.coordenacao.join(", ")}</strong>.
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdestModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const sub = ctx.militarMap.get(adestSubstitutoId);
                  notificar(
                    `Substituição de adestramento (${adestModal.atividade}) registrada com ${nomeMilitar(sub)} e comunicada a ${adestModal.coordenacao.join(", ")}.`,
                  );
                  setAdestModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
              >
                Confirmar Substituto
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Ficha Individual de Acompanhamento do Militar (com Histórico) */}
      <FichaAcompanhamentoModal
        militar={militarParaFicha}
        aberto={!!militarParaFicha}
        onFechar={() => setMilitarParaFicha(null)}
        onMilitarAtualizado={setMilitarParaFicha}
      />
    </div>
  );
}
