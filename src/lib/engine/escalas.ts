import { addDays, diffDays, diasNoMes, eachDay, inicioMes, isFimDeSemana, diaSemana, DIAS_SEMANA_CURTOS } from "../dates";
import { porAntiguidade } from "../utils";
import {
  HORARIOS_PADRAO_4_TEMPOS,
  MOTIVO_DISPENSA_LABEL,
  REGRAS_PONTUACAO_OI_02_06D,
} from "../constants";
import type {
  DetalheEmergenciaDia,
  EscalaConfig,
  EscalaTipo,
  ISODate,
  ItemEscalaDia,
  LegendaOficialCapitania,
  LinhaFolhaPresenca,
  Militar,
  Posto,
  StatusCobertura,
} from "../types";
import {
  indisponibilidadeEscala,
  afastamentosNoDia,
  obterIncumbenciasAcumuladas,
  type Contexto,
  type Indisponibilidade,
} from "./disponibilidade";
import { avaliarReintegracaoDispensados } from "./regrasOI0206D";

/* ------------------------------------------------------------------ */
/* Classificação                                                       */
/* ------------------------------------------------------------------ */

const SEVERIDADE: Record<StatusCobertura, number> = { OK: 0, ATENCAO: 1, CRITICO: 2, SEM_COBERTURA: 3 };

export function severidade(s: StatusCobertura): number {
  return SEVERIDADE[s];
}

export function piorStatus(lista: StatusCobertura[]): StatusCobertura {
  return lista.reduce<StatusCobertura>((pior, s) => (SEVERIDADE[s] > SEVERIDADE[pior] ? s : pior), "OK");
}

/**
 * Regime "N por 1" = N folgas para cada serviço.
 * - SEM_COBERTURA: não há gente suficiente nem para 1 por 1 (sem folga)
 * - CRÍTICO: abaixo do limite de segurança (ex.: limite 2 ⇒ "1 por 1" é crítico)
 * - ATENÇÃO: abaixo do alvo
 */
export function classificar(regime: number, escala: EscalaConfig): StatusCobertura {
  if (regime < 1) return "SEM_COBERTURA";
  if (regime < escala.limiteSeguranca) return "CRITICO";
  if (regime < escala.regimeAlvo) return "ATENCAO";
  return "OK";
}

/** Quantos militares (ou equipes) são necessários para manter um regime. */
export function necessarioParaRegime(escala: EscalaConfig, regime: number): number {
  return escala.modo === "EQUIPES" ? regime + 1 : (regime + 1) * escala.postosPorDia;
}

/* ------------------------------------------------------------------ */
/* Efetivo da escala                                                   */
/* ------------------------------------------------------------------ */

/** Militares que concorrem à escala (ativos). Para escalas por equipe, são os membros das equipes. */
export function efetivoEscala(ctx: Contexto, escala: EscalaConfig): Militar[] {
  if (escala.modo === "EQUIPES") {
    const ids = new Set((escala.equipes ?? []).flatMap((e) => e.membros));
    return ctx.militares.filter((m) => ids.has(m.id)).sort(porAntiguidade);
  }
  return ctx.militares.filter((m) => m.escalas.includes(escala.id)).sort(porAntiguidade);
}

/* ------------------------------------------------------------------ */
/* Cobertura diária                                                    */
/* ------------------------------------------------------------------ */

export interface CoberturaDia {
  data: ISODate;
  escalaId: EscalaConfig["id"];
  status: StatusCobertura;
  regime: number;
  efetivo: number;
  aptos: number;
  indisponiveis: Indisponibilidade[];
  /** EQUIPES: ids das equipes em condições de guarnecer. */
  equipesAptas?: string[];
}

export function coberturaDia(ctx: Contexto, escala: EscalaConfig, data: ISODate, efetivo?: Militar[]): CoberturaDia {
  const pool = efetivo ?? efetivoEscala(ctx, escala);
  const indisponiveis: Indisponibilidade[] = [];
  const aptosIds = new Set<string>();

  for (const m of pool) {
    const ind = indisponibilidadeEscala(ctx, m, escala, data);
    if (ind) indisponiveis.push(ind);
    else aptosIds.add(m.id);
  }

  let regime: number;
  let equipesAptas: string[] | undefined;

  if (escala.modo === "EQUIPES") {
    const minimo = escala.tamanhoMinimoEquipe ?? 1;
    equipesAptas = (escala.equipes ?? [])
      .filter((e) => e.membros.filter((id) => aptosIds.has(id)).length >= minimo)
      .map((e) => e.id);
    regime = equipesAptas.length - 1;
  } else {
    regime = Math.floor(aptosIds.size / Math.max(1, escala.postosPorDia)) - 1;
  }

  return {
    data,
    escalaId: escala.id,
    status: classificar(regime, escala),
    regime,
    efetivo: pool.length,
    aptos: aptosIds.size,
    indisponiveis,
    equipesAptas,
  };
}

export function coberturaPeriodo(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): CoberturaDia[] {
  const pool = efetivoEscala(ctx, escala);
  return eachDay(inicio, fim).map((d) => coberturaDia(ctx, escala, d, pool));
}

/* ------------------------------------------------------------------ */
/* Geração otimizada da escala (Motor OI 02-06D: Pontos + Modernidade) */
/* ------------------------------------------------------------------ */

export interface ServicoDia {
  data: ISODate;
  militarIds: string[];
  retemId?: string;
  /** Postos não guarnecidos por falta de pessoal apto. */
  lacunas: number;
  /** Escala vermelha (sábado/domingo). */
  vermelha: boolean;
  equipeId?: string;
  /** EQUIPES: equipe da vez estava indisponível e foi substituída. */
  substituicao?: boolean;
  /** Indica se houve troca de serviço autorizada pelo CF-02 (Papeleta OI 02-06D). */
  trocaAutorizada?: boolean;
  cobertura: CoberturaDia;
}

const AQUECIMENTO_DIAS = 21;

/**
 * Data-base padrão da simulação das escalas individuais. Toda previsão é simulada a partir
 * desta data fixa, de modo que o serviço de um dia seja SEMPRE o mesmo, independentemente da
 * janela consultada (Grade Mensal, Lista de 14 dias, Folha de 4 Tempos ou Detalhe Diário).
 */
export const DATA_BASE_ESCALAS_PADRAO: ISODate = "2026-01-01";

/** Cache por contexto (recriado a cada alteração do banco) e por configuração de escala. */
const cacheSimulacao = new WeakMap<Contexto, WeakMap<EscalaConfig, { inicioSim: ISODate; fim: ISODate; dias: ServicoDia[] }>>();

/**
 * Gera a previsão de serviço aplicando as regras da OI 02-06D:
 * - Filtro "2 para 1" (evita escalar quem tirou serviço em D-1 ou D-2 se houver alternativa);
 * - Pontuação diferenciada: Rotina Normal (1,0) vs Rotina de Domingo/Feriado (1,5);
 * - Desempate por MODERNIDADE (`b.antiguidadeOrdem - a.antiguidadeOrdem`: mais moderno é escalado antes do mais antigo);
 * - Aplica Papeletas de Troca de Serviço (`AUTORIZADO_CF02`).
 */
export function gerarEscala(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): ServicoDia[] {
  return escala.modo === "EQUIPES"
    ? gerarEscalaEquipes(ctx, escala, inicio, fim)
    : gerarEscalaIndividual(ctx, escala, inicio, fim);
}

function gerarEscalaIndividual(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): ServicoDia[] {
  const base = ctx.db.parametros.dataBaseEscalas ?? DATA_BASE_ESCALAS_PADRAO;
  // Antes da data-base não há histórico estável: usa aquecimento de 21 dias.
  const inicioSim = base <= inicio ? base : addDays(inicio, -AQUECIMENTO_DIAS);

  let porEscala = cacheSimulacao.get(ctx);
  if (!porEscala) {
    porEscala = new WeakMap();
    cacheSimulacao.set(ctx, porEscala);
  }
  let entrada = porEscala.get(escala);
  if (!entrada || entrada.inicioSim !== inicioSim || entrada.fim < fim) {
    entrada = { inicioSim, fim, dias: simularEscalaIndividual(ctx, escala, inicioSim, fim) };
    porEscala.set(escala, entrada);
  }
  return entrada.dias.filter((s) => s.data >= inicio && s.data <= fim);
}

function simularEscalaIndividual(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): ServicoDia[] {
  const pool = efetivoEscala(ctx, escala);
  const ultimo = new Map<string, ISODate>();
  const ptsDom = new Map<string, number>();
  const ptsNorm = new Map<string, number>();

  for (const m of pool) {
    ptsNorm.set(m.id, m.pontosEscala?.normal ?? 0);
    ptsDom.set(m.id, m.pontosEscala?.domingoFeriado ?? 0);
  }

  const trocas = (ctx.db.trocasServico ?? []).filter(
    (t) => t.posto === escala.id && t.statusAprovacaoAjudante === "AUTORIZADO_CF02",
  );

  const out: ServicoDia[] = [];

  for (const data of eachDay(inicio, fim)) {
    const cobertura = coberturaDia(ctx, escala, data, pool);
    const indisp = new Set(cobertura.indisponiveis.map((i) => i.militarId));
    const vermelha = isFimDeSemana(data);
    const d1 = addDays(data, -1);
    const d2 = addDays(data, -2);

    const candidatos = pool
      .filter((m) => !indisp.has(m.id))
      .sort((a, b) => {
        // 1º Filtro 2 para 1 (evita quem tirou serviço em D-1 ou D-2)
        const aRecente = ultimo.get(a.id) === d1 ? 2 : ultimo.get(a.id) === d2 ? 1 : 0;
        const bRecente = ultimo.get(b.id) === d1 ? 2 : ultimo.get(b.id) === d2 ? 1 : 0;
        if (aRecente !== bRecente) return aRecente - bRecente;

        // 2º Menor pontuação acumulada na respectiva rotina (Domingo/Vermelha vs Normal/Preta)
        const pa = vermelha ? (ptsDom.get(a.id) ?? 0) : (ptsNorm.get(a.id) ?? 0);
        const pb = vermelha ? (ptsDom.get(b.id) ?? 0) : (ptsNorm.get(b.id) ?? 0);
        if (Math.abs(pa - pb) > 0.01) return pa - pb;

        // 3º Maior tempo de folga desde o último serviço
        const folgaA = ultimo.has(a.id) ? diffDays(ultimo.get(a.id)!, data) : 999;
        const folgaB = ultimo.has(b.id) ? diffDays(ultimo.get(b.id)!, data) : 999;
        if (folgaA !== folgaB) return folgaB - folgaA;

        // 4º Critério de Desempate OI 02-06D: MAIS MODERNO antes do mais antigo
        const modA = a.antiguidadeOrdem ?? 99;
        const modB = b.antiguidadeOrdem ?? 99;
        return modB - modA;
      });

    let escalados = candidatos.slice(0, escala.postosPorDia).map((m) => m.id);
    const retemId = candidatos[escala.postosPorDia]?.id;
    let trocaAutorizada = false;

    // Verificar Papeleta de Troca de Serviço autorizada pelo Ajudante (CF-02)
    for (const tr of trocas) {
      if (tr.dataServicoOriginal === data && !indisp.has(tr.militarSubstitutoId)) {
        const idx = escalados.indexOf(tr.militarSolicitanteId);
        if (idx >= 0) {
          escalados = escalados.map((id, i) => (i === idx ? tr.militarSubstitutoId : id));
          trocaAutorizada = true;
        } else if (escalados.length > 0 && !escalados.includes(tr.militarSubstitutoId)) {
          escalados[0] = tr.militarSubstitutoId;
          trocaAutorizada = true;
        }
      }
    }

    for (const id of escalados) {
      ultimo.set(id, data);
      if (vermelha) {
        ptsDom.set(id, (ptsDom.get(id) ?? 0) + REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO.TITULAR);
      } else {
        ptsNorm.set(id, (ptsNorm.get(id) ?? 0) + REGRAS_PONTUACAO_OI_02_06D.NORMAL.TITULAR);
      }
    }
    // Retém também pontua (OI 02-06D): 0,25 em rotina normal / 0,5 em domingo/feriado
    if (retemId && !escalados.includes(retemId)) {
      if (vermelha) {
        ptsDom.set(retemId, (ptsDom.get(retemId) ?? 0) + REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO.RETEM);
      } else {
        ptsNorm.set(retemId, (ptsNorm.get(retemId) ?? 0) + REGRAS_PONTUACAO_OI_02_06D.NORMAL.RETEM);
      }
    }

    if (data >= inicio) {
      out.push({
        data,
        militarIds: escalados,
        retemId,
        lacunas: Math.max(0, escala.postosPorDia - escalados.length),
        vermelha,
        trocaAutorizada,
        cobertura,
      });
    }
  }
  return out;
}

function gerarEscalaEquipes(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): ServicoDia[] {
  const pool = efetivoEscala(ctx, escala);
  const equipes = escala.equipes ?? [];
  const turno = Math.max(1, escala.duracaoTurnoDias ?? 7);
  const base = escala.dataBaseRotacao ?? inicio;
  const n = equipes.length;

  return eachDay(inicio, fim).map((data) => {
    const cobertura = coberturaDia(ctx, escala, data, pool);
    const vermelha = isFimDeSemana(data);
    if (!n) return { data, militarIds: [], lacunas: 1, vermelha, cobertura };

    const indisp = new Set(cobertura.indisponiveis.map((i) => i.militarId));
    const slot = (((Math.floor(diffDays(base, data) / turno)) % n) + n) % n;
    const aptas = new Set(cobertura.equipesAptas ?? []);

    let idx = slot;
    for (let i = 0; i < n; i++) {
      if (aptas.has(equipes[(slot + i) % n].id)) {
        idx = (slot + i) % n;
        break;
      }
    }
    const equipe = equipes[idx];
    const emCondicoes = aptas.has(equipe.id);
    return {
      data,
      equipeId: equipe.id,
      militarIds: emCondicoes ? equipe.membros.filter((id) => !indisp.has(id)) : [],
      lacunas: emCondicoes ? 0 : 1,
      substituicao: emCondicoes && idx !== slot,
      vermelha,
      cobertura,
    };
  });
}

/** Contagem de serviços e pontos acumulados por militar no período gerado. */
export function contagemServicos(
  servicos: ServicoDia[],
): Map<string, { pretos: number; vermelhos: number; pontos: number }> {
  const mapa = new Map<string, { pretos: number; vermelhos: number; pontos: number }>();
  for (const s of servicos) {
    for (const id of s.militarIds) {
      const c = mapa.get(id) ?? { pretos: 0, vermelhos: 0, pontos: 0 };
      if (s.vermelha) {
        c.vermelhos++;
        c.pontos = Number((c.pontos + REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO.TITULAR).toFixed(2));
      } else {
        c.pretos++;
        c.pontos = Number((c.pontos + REGRAS_PONTUACAO_OI_02_06D.NORMAL.TITULAR).toFixed(2));
      }
      mapa.set(id, c);
    }
  }
  return mapa;
}

/* ================================================================== */
/* GRADE MENSAL PADRÃO SOMOR + LEGENDA OFICIAL DA CAPITANIA           */
/* ================================================================== */

export type SiglaCelula =
  | "OSE"
  | "SECOM"
  | "CTR"
  | "CB-AUX"
  | "MO"
  | "IN"
  | "VG"
  | "IDENT"
  | "OF SERV"
  | "SSVÇ"
  | "Di"
  | "AUSENTE"
  | null;

export const SOMOR_COR: Record<Exclude<SiglaCelula, null>, string> = {
  OSE: "#0284c7",     // azul celeste
  SECOM: "#0d9488",   // teal
  CTR: "#6b7280",     // cinza
  "CB-AUX": "#4f46e5",// indigo
  MO: "#2563eb",      // azul
  IN: "#db2777",      // rosa/magenta
  VG: "#374151",      // cinza escuro
  IDENT: "#7c3aed",   // violeta
  "OF SERV": "#4b5563",
  SSVÇ: "#065f46",    // verde escuro folga pós-serviço
  Di: "#475569",      // slate dispensado
  AUSENTE: "#92400e", // âmbar escuro
};

/** Cor de texto da coluna do militar na grade: Roxo = COM ESPRAC/SRAK; Laranja = SEM. */
export function corHabilitacaoIN(m: Militar, data: ISODate): "habilitado" | "sem_habilitacao" {
  const semHabilitacao = m.restricoes.some(
    (r) => (r.tipo === "SEM_ESPRAC" || r.tipo === "SEM_SRAK") && r.inicio <= data && (!r.fim || data <= r.fim),
  );
  return semHabilitacao ? "sem_habilitacao" : "habilitado";
}

const POSTOS_PRACAS: Posto[] = ["CB", "MN"];

export interface CelulaSOMOR {
  sigla: SiglaCelula;
  /** Legenda Oficial da Capitania (X, O, Fe/C, D, Fo, Li, Nº, Di). */
  legendaOficial: LegendaOficialCapitania | null;
  /** Texto da ausência (subtipo do afastamento). */
  textoAusencia?: string;
  /** Categoria original do afastamento para tooltip. */
  categoriaAusencia?: string;
  /** Alerta 0×0: estava de folga após serviço e foi alocado em IN no mesmo dia. */
  alerta0x0?: boolean;
  /** Cabo atuando como volante (substituto). */
  caboVolante?: boolean;
}

export interface LinhaGradeSOMOR {
  militar: Militar;
  habilitacaoIN: "habilitado" | "sem_habilitacao";
  celulas: CelulaSOMOR[];
}

export function gerarGradeSOMOR(
  ctx: Contexto,
  escalaId: EscalaConfig["id"] | "TODAS",
  ano: number,
  mes0: number,
  permitirCaboVolante = false,
): {
  linhas: LinhaGradeSOMOR[];
  cabecalhos: { data: ISODate; diaSemCurto: string; numDia: number; fds: boolean }[];
  alertas0x0: { militarId: string; data: ISODate }[];
  alertasINSemHabilitacao: { data: ISODate; apenasSemHabilitacao: number }[];
} {
  const inicioMesISO = inicioMes(ano, mes0);
  const totalDias = diasNoMes(ano, mes0);
  const dias: ISODate[] = Array.from({ length: totalDias }, (_, i) => addDays(inicioMesISO, i));

  const cabecalhos = dias.map((d) => {
    const ds = diaSemana(d);
    return { data: d, diaSemCurto: DIAS_SEMANA_CURTOS[ds], numDia: Number(d.slice(8, 10)), fds: ds === 0 || ds === 6 };
  });

  const alertas0x0: { militarId: string; data: ISODate }[] = [];
  const alertasINSemHabilitacao: { data: ISODate; apenasSemHabilitacao: number }[] = [];

  // ─────────────────────────────────────────────────────────────────
  // CASO 1: VISÃO CONCOMITANTE GERAL (TODAS AS ESCALAS SIMULTÂNEAS)
  // ─────────────────────────────────────────────────────────────────
  if (escalaId === "TODAS") {
    const pool = ctx.militares.filter((m) => m.ativo).sort(porAntiguidade);
    const todasEscalas = ctx.db.escalas;

    const servicosPorEscala = new Map<EscalaTipo, Map<ISODate, ServicoDia>>();
    for (const esc of todasEscalas) {
      const servs = gerarEscala(ctx, esc, addDays(inicioMesISO, -1), dias[dias.length - 1]);
      servicosPorEscala.set(esc.id, new Map(servs.map((s) => [s.data, s])));
    }

    const ordemPostos: EscalaTipo[] = [
      "OSE",
      "CONTRAMESTRE",
      "SUPERVISOR_SECOM",
      "CABO_AUXILIAR",
      "MOTORISTA",
      "INSPECAO_NAVAL",
      "VIGIA",
      "IDENTIFICADOR",
    ];

    const linhas: LinhaGradeSOMOR[] = pool.map((m) => {
      const habilitacaoIN = corHabilitacaoIN(m, inicioMesISO);
      const celulas: CelulaSOMOR[] = dias.map((data) => {
        const ontem = addDays(data, -1);

        // 1) Verificar afastamentos ativos
        const afs = afastamentosNoDia(ctx, m.id, data).filter((a) => a.status !== "CANCELADO");
        if (afs.length > 0) {
          const af = afs[0];
          let leg: LegendaOficialCapitania = "D";
          if (af.categoria === "FERIAS" || af.categoria === "CURSO") leg = "Fe/C";
          else if (af.categoria === "LICENCA") leg = "Li";
          else if (af.categoria === "INSPECAO_NAVAL") leg = "O";
          else if (af.categoria === "MISSAO") leg = "D";
          return {
            sigla: "AUSENTE",
            legendaOficial: leg,
            textoAusencia: af.subtipo || af.titulo,
            categoriaAusencia: af.categoria,
          };
        }

        // 2) Verificar serviço em qualquer posto na data
        for (const posto of ordemPostos) {
          const servHoje = servicosPorEscala.get(posto)?.get(data);
          if (servHoje?.militarIds.includes(m.id)) {
            const ehQuarto = posto === "VIGIA" || posto === "CABO_AUXILIAR" || posto === "IDENTIFICADOR";
            const ehOp = posto === "INSPECAO_NAVAL";
            return {
              sigla: siglaPorEscala(posto),
              legendaOficial: ehOp ? "O" : ehQuarto ? "Nº" : "X",
            };
          }
        }

        // 3) Verificar se saiu de serviço 24h ontem (SSVÇ)
        let estavaDeServico24hOntem = false;
        for (const posto of ordemPostos) {
          if (posto === "MOTORISTA") continue;
          const servOntem = servicosPorEscala.get(posto)?.get(ontem);
          if (servOntem?.militarIds.includes(m.id)) {
            estavaDeServico24hOntem = true;
            break;
          }
        }
        if (estavaDeServico24hOntem) {
          return { sigla: "SSVÇ", legendaOficial: "Fo" };
        }

        // 4) Dispensado da Escala (OI 02-06D)
        if (m.dispensaEscala && m.dispensaEscala !== "NENHUMA" && m.dispensaEscala !== "RESTRICAO_MEDICA_PARCIAL") {
          return { sigla: "Di", legendaOficial: "Di", textoAusencia: MOTIVO_DISPENSA_LABEL[m.dispensaEscala] };
        }

        return { sigla: null, legendaOficial: null };
      });

      return { militar: m, habilitacaoIN, celulas };
    });

    return { linhas, cabecalhos, alertas0x0, alertasINSemHabilitacao };
  }

  // ─────────────────────────────────────────────────────────────────
  // CASO 2: VISÃO DE ESCALA INDIVIDUAL ESPECÍFICA
  // ─────────────────────────────────────────────────────────────────
  const escala = ctx.db.escalas.find((e) => e.id === escalaId);
  if (!escala) return { linhas: [], cabecalhos, alertas0x0: [], alertasINSemHabilitacao: [] };

  const pool = efetivoEscala(ctx, escala);

  // Gerar desde D-1 para identificar quem está SSVÇ no dia 1 do mês
  const servicos = gerarEscala(ctx, escala, addDays(inicioMesISO, -1), dias[dias.length - 1]);
  const servicoMap = new Map(servicos.map((s) => [s.data, s]));

  const escalaIN = ctx.db.escalas.find((e) => e.id === "INSPECAO_NAVAL");
  const servicosIN = escalaIN ? gerarEscala(ctx, escalaIN, inicioMesISO, dias[dias.length - 1]) : [];
  const inMap = new Map(servicosIN.map((s) => [s.data, s]));

  const cabos = pool.filter((m) => POSTOS_PRACAS.includes(m.posto) && m.posto === "CB");

  for (const s of servicosIN) {
    const escaladosIN = s.militarIds;
    const semHab = escaladosIN.filter((id) => {
      const m = ctx.militarMap.get(id);
      return m && corHabilitacaoIN(m, s.data) === "sem_habilitacao";
    }).length;
    const habilitados = escaladosIN.length - semHab;
    if (habilitados < 2) {
      alertasINSemHabilitacao.push({ data: s.data, apenasSemHabilitacao: semHab });
    }
  }

  const linhas: LinhaGradeSOMOR[] = pool.map((m) => {
    const habilitacaoIN = corHabilitacaoIN(m, inicioMesISO);
    const celulas: CelulaSOMOR[] = dias.map((data) => {
      const ontem = addDays(data, -1);
      const servOntem = servicoMap.get(ontem);
      const estavaDeServicoOntem = servOntem?.militarIds.includes(m.id) ?? false;

      // 1) Verificar afastamentos ativos
      const afs = afastamentosNoDia(ctx, m.id, data).filter((a) => a.status !== "CANCELADO");
      if (afs.length > 0) {
        const af = afs[0];
        let leg: LegendaOficialCapitania = "D";
        if (af.categoria === "FERIAS" || af.categoria === "CURSO") leg = "Fe/C";
        else if (af.categoria === "LICENCA") leg = "Li";
        else if (af.categoria === "INSPECAO_NAVAL") leg = "O";
        else if (af.categoria === "MISSAO") leg = "D";
        return {
          sigla: "AUSENTE",
          legendaOficial: leg,
          textoAusencia: af.subtipo || af.titulo,
          categoriaAusencia: af.categoria,
        };
      }

      // 2) Verificar escala IN
      const servIN = inMap.get(data);
      if (servIN?.militarIds.includes(m.id)) {
        if (estavaDeServicoOntem) {
          alertas0x0.push({ militarId: m.id, data });
        }
        return { sigla: "IN", legendaOficial: "O", alerta0x0: estavaDeServicoOntem };
      }

      // 3) Verificar serviço da escala atual
      const servico = servicoMap.get(data);
      if (servico?.militarIds.includes(m.id)) {
        const ehQuarto = escalaId === "VIGIA" || escalaId === "CABO_AUXILIAR";
        return {
          sigla: siglaPorEscala(escalaId),
          legendaOficial: ehQuarto ? "Nº" : "X",
        };
      }

      // 4) Cabo Volante: CB cobre MN em 1×1
      if (permitirCaboVolante && m.posto === "CB") {
        const servMN = servicoMap.get(data);
        if (servMN && servMN.lacunas > 0 && cabos.some((c) => c.id === m.id)) {
          return { sigla: siglaPorEscala(escalaId), legendaOficial: "Nº", caboVolante: true };
        }
      }

      // 5) Saindo de Serviço (SSVÇ / Folga Fo)
      if (estavaDeServicoOntem) {
        return { sigla: "SSVÇ", legendaOficial: "Fo" };
      }

      // 6) Dispensado da Escala (OI 02-06D)
      if (m.dispensaEscala && m.dispensaEscala !== "NENHUMA" && m.dispensaEscala !== "RESTRICAO_MEDICA_PARCIAL") {
        return { sigla: "Di", legendaOficial: "Di", textoAusencia: MOTIVO_DISPENSA_LABEL[m.dispensaEscala] };
      }

      return { sigla: null, legendaOficial: null };
    });

    return { militar: m, habilitacaoIN, celulas };
  });

  return { linhas, cabecalhos, alertas0x0, alertasINSemHabilitacao };
}

function siglaPorEscala(id: EscalaTipo): SiglaCelula {
  const map: Record<EscalaTipo, SiglaCelula> = {
    OSE: "OSE",
    SUPERVISOR_SECOM: "SECOM",
    CONTRAMESTRE: "CTR",
    CABO_AUXILIAR: "CB-AUX",
    MOTORISTA: "MO",
    VIGIA: "VG",
    IDENTIFICADOR: "IDENT",
    INSPECAO_NAVAL: "IN",
  };
  return map[id] ?? "CTR";
}

/* ================================================================== */
/* DETALHE DIÁRIO DE SERVIÇO OI 02-06D + GRUPO CAV & REAÇÃO           */
/* ================================================================== */

export interface ResultadoDetalheDiarioOI0206D {
  data: ISODate;
  ehDomingoOuFeriado: boolean;
  itens: ItemEscalaDia[];
  detalheEmergencia: DetalheEmergenciaDia;
  alertasSegurancaEscala: string[];
}

export function gerarDetalheDiarioOI0206D(ctx: Contexto, data: ISODate): ResultadoDetalheDiarioOI0206D {
  const ehDomingoOuFeriado = isFimDeSemana(data);
  const postosOrdem: EscalaTipo[] = [
    "OSE",
    "CONTRAMESTRE",
    "SUPERVISOR_SECOM",
    "CABO_AUXILIAR",
    "MOTORISTA",
    "VIGIA",
    "IDENTIFICADOR",
  ];

  const itens: ItemEscalaDia[] = [];
  const alertasSegurancaEscala: string[] = [];

  const pontosTitular = ehDomingoOuFeriado
    ? REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO.TITULAR
    : REGRAS_PONTUACAO_OI_02_06D.NORMAL.TITULAR;

  const pontosRetem = ehDomingoOuFeriado
    ? REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO.RETEM
    : REGRAS_PONTUACAO_OI_02_06D.NORMAL.RETEM;

  for (const posto of postosOrdem) {
    const cfg = ctx.db.escalas.find((e) => e.id === posto);
    if (!cfg) continue;
    const servicos = gerarEscala(ctx, cfg, data, data);
    const servDia = servicos[0];
    const titularId = servDia?.militarIds[0] ?? "";
    const retemId = servDia?.retemId;

    const alertaReint = avaliarReintegracaoDispensados(ctx, cfg, data);
    if (alertaReint) alertasSegurancaEscala.push(alertaReint.mensagem);

    if (titularId) {
      itens.push({
        posto,
        militarTitularId: titularId,
        militarRetemId: retemId,
        pontosCreditadosTitular: pontosTitular,
        pontosCreditadosRetem: retemId ? pontosRetem : 0,
      });
    } else {
      alertasSegurancaEscala.push(`CRÍTICO: Posto ${cfg.nome} sem titular habilitado em ${data}.`);
    }
  }

  const buscarTitular = (p: EscalaTipo) =>
    itens.find((i) => i.posto === p)?.militarTitularId ?? "";

  const detalheEmergencia: DetalheEmergenciaDia = {
    grupoCav: {
      encarregadoId: buscarTitular("CONTRAMESTRE") || buscarTitular("OSE"),
      desligadorEletricoId: buscarTitular("SUPERVISOR_SECOM"),
      bombeiro1Id: buscarTitular("CABO_AUXILIAR"),
      bombeiro2Id: buscarTitular("MOTORISTA"),
      isolamentoPrimeirosSocorrosId: buscarTitular("IDENTIFICADOR"),
    },
    grupoReacao: {
      comandanteId: buscarTitular("OSE"),
      pontoSensivelEscoteriaId: buscarTitular("CONTRAMESTRE"),
      pontoSensivelCp01Id: buscarTitular("VIGIA"),
      pontoSensivelFrenteGapId: buscarTitular("CABO_AUXILIAR"),
      pontoSensivelAlojamentosId: buscarTitular("IDENTIFICADOR"),
    },
    checklistOperacional: {
      vistoriaHorariaLanchas: true,
      escutaCanal16Vhf: true,
      conferenciaArmamentoMunicao: true,
    },
  };

  return {
    data,
    ehDomingoOuFeriado,
    itens,
    detalheEmergencia,
    alertasSegurancaEscala,
  };
}

/* ================================================================== */
/* FOLHA DIÁRIA DE PRESENÇA E REGRESSO (4 TEMPOS)                     */
/* Precedência estrita de 4 níveis (Análise Técnica Gemini):          */
/* 1º Afastamento Total (Férias, LTS, LTSPF, Mutirum, Aula EPM) -> XXXX*/
/* 2º Entrando de Serviço 24h no dia ou Motorista de Serviço          */
/* 3º Saindo de Serviço 24h (escalado em D-1) -> SSVÇ | X | X | X     */
/* 4º Alocação Operacional Diária (IN 06:30–16:00 ou Faina parcial)   */
/* ================================================================== */

export function gerarFolhaPresencaDia(ctx: Contexto, data: ISODate): LinhaFolhaPresenca[] {
  const ontem = addDays(data, -1);
  const regressoGeralAtivo = ctx.db.parametros.regressoGeralAtivo ?? false;
  const folhaSalva = ctx.db.parametros.folhasPresenca?.[data];
  const apontamentos = folhaSalva?.apontamentos;

  // Mapear quem está entrando de serviço hoje (D) e quem entrou ontem (D-1)
  const entrandoHoje = new Map<string, EscalaTipo>();
  const saindoHoje = new Map<string, EscalaTipo>();

  for (const esc of ctx.db.escalas) {
    if (esc.id === "INSPECAO_NAVAL") continue;
    const servs = gerarEscala(ctx, esc, ontem, data);
    const sOntem = servs.find((s) => s.data === ontem);
    const sHoje = servs.find((s) => s.data === data);

    for (const mid of sOntem?.militarIds ?? []) {
      saindoHoje.set(mid, esc.id);
    }
    for (const mid of sHoje?.militarIds ?? []) {
      entrandoHoje.set(mid, esc.id);
    }
  }

  return ctx.militares.map((m): LinhaFolhaPresenca => {
    const incumbenciasAcumuladas = obterIncumbenciasAcumuladas(ctx, m.id, data).map((inc) => ({
      titularNome: inc.titularNome,
      incumbencia: inc.incumbencia,
      motivo: inc.motivo,
    }));

    // ── APONTAMENTO MANUAL DO CONTRAMESTRE / SARGENTEANTE-GERAL ──
    const ap = apontamentos?.[m.id];
    if (ap) {
      if (ap.status === "FALTA") {
        return {
          militarId: m.id,
          data,
          tempo1: "FALTA",
          tempo2: "FALTA",
          tempo3: "FALTA",
          tempo4: "FALTA",
          statusObservacao: `FALTA NÃO JUSTIFICADA${ap.observacao ? ` — ${ap.observacao}` : ""}`,
          codigo: "FALTA",
          prioridadeAplicada: 1,
          bloqueadoPorEscalaOuAusencia: true,
          incumbenciasAcumuladas,
          apontamentoManual: ap,
        };
      }
      if (ap.status === "ATRASO") {
        const t1 = ap.tempo1 || "ATRASO";
        return {
          militarId: m.id,
          data,
          tempo1: t1,
          tempo2: ap.tempo2 || "11:30",
          tempo3: ap.tempo3 || "13:15",
          tempo4: ap.tempo4 || "16:30",
          statusObservacao: `ATRASO NA ENTRADA (${t1})${ap.observacao ? ` — ${ap.observacao}` : ""}`,
          codigo: "ATRASO",
          prioridadeAplicada: 5,
          bloqueadoPorEscalaOuAusencia: false,
          incumbenciasAcumuladas,
          apontamentoManual: ap,
        };
      }
      if (ap.status === "DISPENSA") {
        return {
          militarId: m.id,
          data,
          tempo1: "DISP",
          tempo2: "DISP",
          tempo3: "DISP",
          tempo4: "DISP",
          statusObservacao: `DISPENSADO${ap.observacao ? ` — ${ap.observacao}` : ""}`,
          codigo: "DISPENSA",
          prioridadeAplicada: 1,
          bloqueadoPorEscalaOuAusencia: true,
          incumbenciasAcumuladas,
          apontamentoManual: ap,
        };
      }
      if (ap.status === "FAINA_EXTERNA") {
        return {
          militarId: m.id,
          data,
          tempo1: "FAINA",
          tempo2: "FAINA",
          tempo3: "FAINA",
          tempo4: "FAINA",
          statusObservacao: `FAINA EXTERNA${ap.observacao ? ` — ${ap.observacao}` : ""}`,
          codigo: "FAINA",
          prioridadeAplicada: 4,
          bloqueadoPorEscalaOuAusencia: false,
          incumbenciasAcumuladas,
          apontamentoManual: ap,
        };
      }
      if (ap.status === "PRESENTE") {
        const hExp = HORARIOS_PADRAO_4_TEMPOS.EXPEDIENTE_NORMAL;
        return {
          militarId: m.id,
          data,
          tempo1: ap.tempo1 || (regressoGeralAtivo ? "07:00" : hExp.t1),
          tempo2: ap.tempo2 || hExp.t2,
          tempo3: ap.tempo3 || hExp.t3,
          tempo4: ap.tempo4 || hExp.t4,
          statusObservacao: ap.observacao || `EXPEDIENTE NORMAL (${m.setorCodigo ?? m.divisao})`,
          codigo: "PRESENTE",
          prioridadeAplicada: 5,
          bloqueadoPorEscalaOuAusencia: false,
          incumbenciasAcumuladas,
          apontamentoManual: ap,
        };
      }
    }

    const afs = afastamentosNoDia(ctx, m.id, data).filter((a) => a.status !== "CANCELADO");

    // ── NÍVEL 1: Afastamento Total (Férias, LTS, LTSPF, Missão Externa, Aula EPM, Instalação) ──
    const afTotal = afs.find(
      (a) =>
        a.categoria === "FERIAS" ||
        a.categoria === "LICENCA" ||
        a.categoria === "MISSAO" ||
        a.categoria === "CURSO" ||
        a.categoria === "DISPENSA" ||
        (a.categoria === "INSPECAO_NAVAL" && !a.horarioEspecifico && a.inicio < a.fim),
    );

    if (afTotal) {
      // Caso especial: lançou manualmente SSVÇ como dispensa
      if (afTotal.subtipo.includes("SSVÇ")) {
        return {
          militarId: m.id,
          data,
          tempo1: "SSVÇ",
          tempo2: "X",
          tempo3: "X",
          tempo4: "X",
          statusObservacao: afTotal.titulo.toUpperCase(),
          codigo: "SSVÇ",
          prioridadeAplicada: 3,
          bloqueadoPorEscalaOuAusencia: true,
          incumbenciasAcumuladas,
        };
      }
      return {
        militarId: m.id,
        data,
        tempo1: "X",
        tempo2: "X",
        tempo3: "X",
        tempo4: "X",
        statusObservacao: (afTotal.subtipo || afTotal.titulo).toUpperCase(),
        codigo: "X",
        prioridadeAplicada: 1,
        bloqueadoPorEscalaOuAusencia: true,
        incumbenciasAcumuladas,
      };
    }

    // ── NÍVEL 2: Entrando de Serviço 24h hoje ou Motorista de Serviço ──
    const postoHoje = entrandoHoje.get(m.id);
    if (postoHoje) {
      if (postoHoje === "MOTORISTA") {
        const h = HORARIOS_PADRAO_4_TEMPOS.MOTORISTA_SERVICO;
        return {
          militarId: m.id,
          data,
          tempo1: h.t1,
          tempo2: h.t2,
          tempo3: h.t3,
          tempo4: h.t4,
          statusObservacao: "MOTORISTA DE SERVIÇO",
          codigo: "MO",
          prioridadeAplicada: 2,
          bloqueadoPorEscalaOuAusencia: true,
          incumbenciasAcumuladas,
        };
      }
      const h = HORARIOS_PADRAO_4_TEMPOS.SERVICO_ESTADO;
      return {
        militarId: m.id,
        data,
        tempo1: h.t1,
        tempo2: h.t2,
        tempo3: h.t3,
        tempo4: h.t4,
        statusObservacao: `ENTRANDO DE SERVIÇO (${postoHoje})`,
        codigo: "SVÇ",
        prioridadeAplicada: 2,
        bloqueadoPorEscalaOuAusencia: true,
        incumbenciasAcumuladas,
      };
    }

    // ── NÍVEL 3: Saindo de Serviço 24h (escalado em D-1) ──
    const postoOntem = saindoHoje.get(m.id);
    if (postoOntem && postoOntem !== "MOTORISTA" && !regressoGeralAtivo) {
      const h = HORARIOS_PADRAO_4_TEMPOS.SAINDO_SERVICO;
      return {
        militarId: m.id,
        data,
        tempo1: h.t1,
        tempo2: h.t2,
        tempo3: h.t3,
        tempo4: h.t4,
        statusObservacao: `${postoOntem} SAINDO DE SVÇ`,
        codigo: "SSVÇ",
        prioridadeAplicada: 3,
        bloqueadoPorEscalaOuAusencia: true,
        incumbenciasAcumuladas,
      };
    }

    // ── NÍVEL 4: Alocação Operacional Diária (Inspeção Naval Diária ou Faina / Apoio) ──
    const afDiario = afs[0];
    if (afDiario) {
      if (afDiario.categoria === "INSPECAO_NAVAL") {
        const h = afDiario.horarioEspecifico ?? HORARIOS_PADRAO_4_TEMPOS.INSPECAO_NAVAL;
        return {
          militarId: m.id,
          data,
          tempo1: h.t1,
          tempo2: h.t2,
          tempo3: h.t3,
          tempo4: h.t4,
          statusObservacao: "INSPEÇÃO NAVAL",
          codigo: "IN",
          prioridadeAplicada: 4,
          bloqueadoPorEscalaOuAusencia: false,
          incumbenciasAcumuladas,
        };
      }
      const h = afDiario.horarioEspecifico ?? HORARIOS_PADRAO_4_TEMPOS.EXPEDIENTE_NORMAL;
      return {
        militarId: m.id,
        data,
        tempo1: h.t1,
        tempo2: h.t2,
        tempo3: h.t3,
        tempo4: h.t4,
        statusObservacao: afDiario.titulo.toUpperCase(),
        codigo: "FAINA",
        prioridadeAplicada: 4,
        bloqueadoPorEscalaOuAusencia: false,
        incumbenciasAcumuladas,
      };
    }

    // ── NÍVEL 5: Expediente Normal de Bordo ──
    const h = HORARIOS_PADRAO_4_TEMPOS.EXPEDIENTE_NORMAL;
    return {
      militarId: m.id,
      data,
      tempo1: regressoGeralAtivo ? "07:00" : h.t1,
      tempo2: h.t2,
      tempo3: h.t3,
      tempo4: h.t4,
      statusObservacao: m.setorCodigo === "CF-09" && m.funcao?.includes("Supervisor")
        ? "EXPEDIENTE / SUPERVISOR DA SECOM"
        : `EXPEDIENTE NORMAL (${m.setorCodigo ?? m.divisao})`,
      codigo: "PRESENTE",
      prioridadeAplicada: 5,
      bloqueadoPorEscalaOuAusencia: false,
      incumbenciasAcumuladas,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Simulador de impacto de efetivo para o Painel do Comando           */
/* ------------------------------------------------------------------ */

export interface SimulacaoEfetivo {
  escalaId: EscalaConfig["id"];
  escalaNome: string;
  regimeAtual: number;
  regimeSimulado: number;
  statusAtual: StatusCobertura;
  statusSimulado: StatusCobertura;
  deltaAptos: number;
}

export function simularImpactoEfetivo(
  ctx: Contexto,
  data: ISODate,
  escalaId: EscalaConfig["id"],
  nAfastarAdicional: number,
): SimulacaoEfetivo {
  const escala = ctx.db.escalas.find((e) => e.id === escalaId)!;
  const pool = efetivoEscala(ctx, escala);
  const cobAtual = coberturaDia(ctx, escala, data, pool);

  const aptosAtuais = pool.filter((m) => !cobAtual.indisponiveis.some((i) => i.militarId === m.id));
  const poolSim = pool.filter((m) => !aptosAtuais.slice(0, nAfastarAdicional).some((a) => a.id === m.id));
  const cobSim = coberturaDia(ctx, escala, data, poolSim);

  return {
    escalaId,
    escalaNome: escala.nome,
    regimeAtual: cobAtual.regime,
    regimeSimulado: cobSim.regime,
    statusAtual: cobAtual.status,
    statusSimulado: cobSim.status,
    deltaAptos: cobSim.aptos - cobAtual.aptos,
  };
}
