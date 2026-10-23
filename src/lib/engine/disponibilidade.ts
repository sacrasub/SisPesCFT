import { PRIORIDADE_CATEGORIA, RESTRICAO_META, CATEGORIA_META } from "../constants";
import { within } from "../dates";
import type {
  Afastamento,
  AfastamentoCategoria,
  Database,
  DivisaoId,
  EscalaConfig,
  ISODate,
  Militar,
  Restricao,
  StatusPresenca,
} from "../types";

/**
 * Contexto pré-indexado para cálculos rápidos.
 * Criado uma vez por renderização (useMemo) e reutilizado por todos os motores.
 */
export interface Contexto {
  db: Database;
  militares: Militar[]; // apenas ativos
  militarMap: Map<string, Militar>;
  /** militarId -> afastamentos não cancelados */
  porMilitar: Map<string, Afastamento[]>;
}

export interface OpcoesContexto {
  /** Afastamentos adicionais (rascunho) para simulação de impacto. */
  extras?: Afastamento[];
  /** Ignora um afastamento existente (ex.: ao editar, para não contar duas vezes). */
  ignorarId?: string;
}

export function criarContexto(db: Database, opts: OpcoesContexto = {}): Contexto {
  const militares = db.militares.filter((m) => m.ativo);
  const militarMap = new Map(db.militares.map((m) => [m.id, m]));
  const porMilitar = new Map<string, Afastamento[]>();

  const lista = [...db.afastamentos.filter((a) => a.id !== opts.ignorarId), ...(opts.extras ?? [])];
  for (const a of lista) {
    if (a.status === "CANCELADO") continue;
    for (const mid of a.militarIds) {
      const arr = porMilitar.get(mid);
      if (arr) arr.push(a);
      else porMilitar.set(mid, [a]);
    }
  }
  return { db, militares, militarMap, porMilitar };
}

/* ------------------------------------------------------------------ */

export function afastamentosNoDia(ctx: Contexto, militarId: string, data: ISODate): Afastamento[] {
  return (ctx.porMilitar.get(militarId) ?? []).filter((a) => a.inicio <= data && data <= a.fim);
}

const prioridade = (c: AfastamentoCategoria) => PRIORIDADE_CATEGORIA.indexOf(c);

export interface Presenca {
  status: StatusPresenca;
  afastamento?: Afastamento;
}

/** Situação do militar no dia (para o quadro de efetivo). Considera todos os lançamentos não cancelados. */
export function presenca(ctx: Contexto, militarId: string, data: ISODate): Presenca {
  const lista = afastamentosNoDia(ctx, militarId, data);
  if (!lista.length) return { status: "DISPONIVEL" };
  const principal = [...lista].sort((a, b) => prioridade(a.categoria) - prioridade(b.categoria))[0];
  return { status: principal.categoria as StatusPresenca, afastamento: principal };
}

export function restricoesAtivas(m: Militar, data: ISODate): Restricao[] {
  return m.restricoes.filter((r) => within(data, r.inicio, r.fim));
}

export type MotivoTipo = "RESTRICAO" | AfastamentoCategoria;

export interface Indisponibilidade {
  militarId: string;
  tipo: MotivoTipo;
  motivo: string;
  afastamentoId?: string;
}

/**
 * Verifica se o militar pode concorrer à escala no dia.
 * Retorna null se apto, ou o motivo da indisponibilidade.
 */
export function indisponibilidadeEscala(
  ctx: Contexto,
  m: Militar,
  escala: EscalaConfig,
  data: ISODate,
): Indisponibilidade | null {
  const bloqueio = restricoesAtivas(m, data).find((r) => escala.restricoesBloqueantes.includes(r.tipo));
  if (bloqueio) {
    return {
      militarId: m.id,
      tipo: "RESTRICAO",
      motivo: RESTRICAO_META[bloqueio.tipo].label + (bloqueio.descricao ? ` – ${bloqueio.descricao}` : ""),
    };
  }
  const considerarPrevistos = ctx.db.parametros.considerarPrevistos;
  const af = afastamentosNoDia(ctx, m.id, data)
    .filter((a) => a.impactaEscala && (considerarPrevistos || a.status === "CONFIRMADO"))
    .sort((a, b) => prioridade(a.categoria) - prioridade(b.categoria))[0];
  if (af) {
    return {
      militarId: m.id,
      tipo: af.categoria,
      motivo: `${CATEGORIA_META[af.categoria].label}: ${af.titulo}`,
      afastamentoId: af.id,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Resumo de efetivo (Dashboard / Painel do Comando)                   */
/* ------------------------------------------------------------------ */

export interface ResumoEfetivo {
  total: number;
  disponiveis: number;
  emMissao: number;
  missao: { STA: number; EPM: number; CURSO: number; INSPECAO_NAVAL: number; OUTRAS: number };
  ferias: number;
  licencas: number;
  comRestricao: number;
  porStatus: Record<StatusPresenca, number>;
  porDivisao: { divisao: DivisaoId; total: number; disponiveis: number; afastados: number }[];
  afastados: { militar: Militar; status: StatusPresenca; afastamento: Afastamento }[];
}

export function resumoEfetivo(ctx: Contexto, data: ISODate): ResumoEfetivo {
  const porStatus: Record<StatusPresenca, number> = {
    DISPONIVEL: 0,
    MISSAO: 0,
    CURSO: 0,
    INSPECAO_NAVAL: 0,
    FERIAS: 0,
    LICENCA: 0,
    DISPENSA: 0,
    OUTRO: 0,
  };
  const missao = { STA: 0, EPM: 0, CURSO: 0, INSPECAO_NAVAL: 0, OUTRAS: 0 };
  const divMap = new Map<DivisaoId, { divisao: DivisaoId; total: number; disponiveis: number; afastados: number }>();
  const afastados: ResumoEfetivo["afastados"] = [];
  let comRestricao = 0;

  for (const m of ctx.militares) {
    const p = presenca(ctx, m.id, data);
    porStatus[p.status]++;
    if (restricoesAtivas(m, data).length) comRestricao++;

    const d = divMap.get(m.divisao) ?? { divisao: m.divisao, total: 0, disponiveis: 0, afastados: 0 };
    d.total++;
    if (p.status === "DISPONIVEL") d.disponiveis++;
    else d.afastados++;
    divMap.set(m.divisao, d);

    if (p.afastamento) {
      afastados.push({ militar: m, status: p.status, afastamento: p.afastamento });
      if (p.status === "MISSAO") {
        if (p.afastamento.divisao === "STA") missao.STA++;
        else if (p.afastamento.divisao === "EPM") missao.EPM++;
        else missao.OUTRAS++;
      } else if (p.status === "CURSO") missao.CURSO++;
      else if (p.status === "INSPECAO_NAVAL") missao.INSPECAO_NAVAL++;
    }
  }

  return {
    total: ctx.militares.length,
    disponiveis: porStatus.DISPONIVEL,
    emMissao: porStatus.MISSAO + porStatus.CURSO + porStatus.INSPECAO_NAVAL,
    missao,
    ferias: porStatus.FERIAS,
    licencas: porStatus.LICENCA + porStatus.DISPENSA,
    comRestricao,
    porStatus,
    porDivisao: [...divMap.values()].sort((a, b) => b.total - a.total),
    afastados,
  };
}
