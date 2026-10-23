import { addDays, diffDays, diasNoMes, eachDay, inicioMes, isFimDeSemana, diaSemana, DIAS_SEMANA_CURTOS } from "../dates";
import { porAntiguidade } from "../utils";
import type { EscalaConfig, ISODate, Militar, Posto, StatusCobertura } from "../types";
import { indisponibilidadeEscala, afastamentosNoDia, type Contexto, type Indisponibilidade } from "./disponibilidade";

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
/* Geração otimizada da escala (previsão)                              */
/* ------------------------------------------------------------------ */

export interface ServicoDia {
  data: ISODate;
  militarIds: string[];
  /** Postos não guarnecidos por falta de pessoal apto. */
  lacunas: number;
  /** Escala vermelha (sábado/domingo). */
  vermelha: boolean;
  equipeId?: string;
  /** EQUIPES: equipe da vez estava indisponível e foi substituída. */
  substituicao?: boolean;
  cobertura: CoberturaDia;
}

const AQUECIMENTO_DIAS = 21;

/**
 * Gera a previsão de serviço com distribuição equitativa:
 * - nunca escala o mesmo militar em dias consecutivos se houver alternativa;
 * - dias úteis (escala preta) priorizam quem está há mais tempo sem serviço;
 * - fins de semana (escala vermelha) priorizam quem tirou menos serviços vermelhos.
 * Um período de aquecimento anterior ao início equilibra a "conta" de serviços.
 */
export function gerarEscala(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): ServicoDia[] {
  return escala.modo === "EQUIPES" ? gerarEscalaEquipes(ctx, escala, inicio, fim) : gerarEscalaIndividual(ctx, escala, inicio, fim);
}

function gerarEscalaIndividual(ctx: Contexto, escala: EscalaConfig, inicio: ISODate, fim: ISODate): ServicoDia[] {
  const pool = efetivoEscala(ctx, escala);
  const ultimo = new Map<string, ISODate>();
  const vermelhos = new Map<string, number>();
  const pretos = new Map<string, number>();
  const ordem = new Map(pool.map((m, i) => [m.id, i]));
  const out: ServicoDia[] = [];

  for (const data of eachDay(addDays(inicio, -AQUECIMENTO_DIAS), fim)) {
    const cobertura = coberturaDia(ctx, escala, data, pool);
    const indisp = new Set(cobertura.indisponiveis.map((i) => i.militarId));
    const vermelha = isFimDeSemana(data);
    const ontem = addDays(data, -1);

    const candidatos = pool
      .filter((m) => !indisp.has(m.id))
      .sort((a, b) => {
        const aOntem = ultimo.get(a.id) === ontem ? 1 : 0;
        const bOntem = ultimo.get(b.id) === ontem ? 1 : 0;
        if (aOntem !== bOntem) return aOntem - bOntem;
        const folgaA = ultimo.has(a.id) ? diffDays(ultimo.get(a.id)!, data) : 999;
        const folgaB = ultimo.has(b.id) ? diffDays(ultimo.get(b.id)!, data) : 999;
        if (vermelha) {
          const dv = (vermelhos.get(a.id) ?? 0) - (vermelhos.get(b.id) ?? 0);
          if (dv) return dv;
          return folgaB - folgaA || ordem.get(b.id)! - ordem.get(a.id)!;
        }
        return folgaB - folgaA || (pretos.get(a.id) ?? 0) - (pretos.get(b.id) ?? 0) || ordem.get(b.id)! - ordem.get(a.id)!;
      });

    const escalados = candidatos.slice(0, escala.postosPorDia).map((m) => m.id);
    for (const id of escalados) {
      ultimo.set(id, data);
      const mapa = vermelha ? vermelhos : pretos;
      mapa.set(id, (mapa.get(id) ?? 0) + 1);
    }

    if (data >= inicio) {
      out.push({
        data,
        militarIds: escalados,
        lacunas: Math.max(0, escala.postosPorDia - escalados.length),
        vermelha,
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

    // Equipe da vez; se inapta, a próxima apta na sequência assume.
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

/** Contagem de serviços por militar no período gerado (para conferência de equidade). */
export function contagemServicos(servicos: ServicoDia[]): Map<string, { pretos: number; vermelhos: number }> {
  const mapa = new Map<string, { pretos: number; vermelhos: number }>();
  for (const s of servicos) {
    for (const id of s.militarIds) {
      const c = mapa.get(id) ?? { pretos: 0, vermelhos: 0 };
      if (s.vermelha) c.vermelhos++;
      else c.pretos++;
      mapa.set(id, c);
    }
  }
  return mapa;
}

/* ================================================================== */
/* GRADE MENSAL PADRÃO SOMOR                                          */
/* ================================================================== */

/** Sigla de serviço exibida na célula da grade SOMOR. */
export type SiglaCelula = "CTR" | "MO" | "IN" | "VG" | "OF SERV" | "AUSENTE" | null;

/** Código de cor de fundo da célula na grade SOMOR (tailwind inline-style hex). */
export const SOMOR_COR: Record<Exclude<SiglaCelula, null>, string> = {
  CTR:     "#6b7280", // cinza
  MO:      "#2563eb", // azul
  IN:      "#db2777", // rosa/magenta
  VG:      "#374151", // cinza escuro
  "OF SERV":"#4b5563",// cinza médio
  AUSENTE: "#92400e", // âmbar escuro (fundo amarelo real fica na UI via bg-amber-600)
};

/** Cor de texto da coluna do militar na grade: Roxo = COM ESPRAC/SRAK; Laranja = SEM. */
export function corHabilitacaoIN(m: Militar, data: ISODate): "habilitado" | "sem_habilitacao" {
  const semHabilitacao = m.restricoes.some(
    (r) => (r.tipo === "SEM_ESPRAC" || r.tipo === "SEM_SRAK") && r.inicio <= data && (!r.fim || data <= r.fim),
  );
  return semHabilitacao ? "sem_habilitacao" : "habilitado";
}

/** Postos de praças (Cabo e abaixo) para a regra de Cabo Volante. */
const POSTOS_PRACAS: Posto[] = ["CB", "MN"];

export interface CelulaSOMOR {
  sigla: SiglaCelula;
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
  /** Indicador de habilitação para Inspeção Naval na data de início do mês. */
  habilitacaoIN: "habilitado" | "sem_habilitacao";
  /** Uma célula por dia do mês. */
  celulas: CelulaSOMOR[];
}

/**
 * Gera a Grade Mensal Padrão SOMOR para uma escala específica.
 * @param ctx        Contexto indexado (disponibilidade)
 * @param escalaId   Tipo de escala alvo (ex.: "CONTRAMESTRE")
 * @param ano        Ano do mês
 * @param mes0       Mês base-0 (0 = janeiro)
 * @param permitirCaboVolante  Quando true, Cabos cobrem lacunas de Marinheiros em 1×1.
 */
export function gerarGradeSOMOR(
  ctx: Contexto,
  escalaId: EscalaConfig["id"],
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

  // Cabeçalhos (linha fixa topo)
  const cabecalhos = dias.map((d) => {
    const ds = diaSemana(d);
    return { data: d, diaSemCurto: DIAS_SEMANA_CURTOS[ds], numDia: Number(d.slice(8, 10)), fds: ds === 0 || ds === 6 };
  });

  // Obter efetivo da escala selecionada
  const escala = ctx.db.escalas.find((e) => e.id === escalaId);
  if (!escala) return { linhas: [], cabecalhos, alertas0x0: [], alertasINSemHabilitacao: [] };

  const pool = efetivoEscala(ctx, escala);

  // Gerar serviços do mês via motor justo
  const servicos = gerarEscala(ctx, escala, inicioMesISO, dias[dias.length - 1]);
  const servicoMap = new Map(servicos.map((s) => [s.data, s]));

  // Gerar serviços IN do mês (para detector 0×0)
  const escalaIN = ctx.db.escalas.find((e) => e.id === "INSPECAO_NAVAL");
  const servicosIN = escalaIN ? gerarEscala(ctx, escalaIN, inicioMesISO, dias[dias.length - 1]) : [];
  const inMap = new Map(servicosIN.map((s) => [s.data, s]));

  // Cabos para regra de Cabo Volante
  const cabos = pool.filter((m) => POSTOS_PRACAS.includes(m.posto) && m.posto === "CB");

  const alertas0x0: { militarId: string; data: ISODate }[] = [];
  const alertasINSemHabilitacao: { data: ISODate; apenasSemHabilitacao: number }[] = [];

  // ── Validação mínima IN: ao menos 2 habilitados por saída ──
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
      // 1) Verificar afastamentos ativos
      const afs = afastamentosNoDia(ctx, m.id, data).filter((a) => a.status !== "CANCELADO");
      if (afs.length > 0) {
        const af = afs[0];
        return {
          sigla: "AUSENTE",
          textoAusencia: af.subtipo || af.titulo,
          categoriaAusencia: af.categoria,
        };
      }

      // 2) Verificar escala IN
      const servIN = inMap.get(data);
      if (servIN?.militarIds.includes(m.id)) {
        // Detector 0×0: serviço anterior era CTR/MO e hoje seria folga, mas foi alocado em IN
        const ontem = addDays(data, -1);
        const servOntem = servicoMap.get(ontem);
        const estavaDe0x0 = servOntem?.militarIds.includes(m.id) ?? false;
        if (estavaDe0x0) {
          alertas0x0.push({ militarId: m.id, data });
        }
        return { sigla: "IN", alerta0x0: estavaDe0x0 };
      }

      // 3) Verificar serviço da escala atual
      const servico = servicoMap.get(data);
      if (servico?.militarIds.includes(m.id)) {
        const siglaPorEscala: Record<string, SiglaCelula> = {
          CONTRAMESTRE: "CTR",
          MOTORISTA:    "MO",
          VIGIA:        "VG",
          INSPECAO_NAVAL: "IN",
        };
        return { sigla: siglaPorEscala[escalaId] ?? "CTR" };
      }

      // 4) Cabo Volante: CB cobre MN em 1×1
      if (permitirCaboVolante && m.posto === "CB") {
        const servMN = servicoMap.get(data);
        if (servMN && servMN.lacunas > 0 && cabos.some((c) => c.id === m.id)) {
          return { sigla: siglaPorEscala(escalaId), caboVolante: true };
        }
      }

      return { sigla: null };
    });

    return { militar: m, habilitacaoIN, celulas };
  });

  return { linhas, cabecalhos, alertas0x0, alertasINSemHabilitacao };
}

/** Helper local para Cabo Volante sem poluir o escopo externo. */
function siglaPorEscala(id: string): SiglaCelula {
  const map: Record<string, SiglaCelula> = {
    CONTRAMESTRE: "CTR", MOTORISTA: "MO", VIGIA: "VG", INSPECAO_NAVAL: "IN",
  };
  return map[id] ?? "CTR";
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
  /** Diferença de militares aptos entre cenário atual e simulado. */
  deltaAptos: number;
}

/**
 * Simula o impacto de remover `nAfastados` militares adicionais de uma escala
 * na data informada (ex.: "3 Contramestres em missão vs. 2 + alarme CFTV").
 */
export function simularImpactoEfetivo(
  ctx: Contexto,
  data: ISODate,
  escalaId: EscalaConfig["id"],
  nAfastarAdicional: number,
): SimulacaoEfetivo {
  const escala = ctx.db.escalas.find((e) => e.id === escalaId)!;
  const pool = efetivoEscala(ctx, escala);
  const cobAtual = coberturaDia(ctx, escala, data, pool);

  // Simula removendo os primeiros N militares aptos da pool
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
