import { DIVISOES, ESCALA_LABEL } from "../constants";
import { addDays, agruparConsecutivos, diffDays, diasNoMes, fimMes, inicioMes, overlaps } from "../dates";
import type { DivisaoId, EventoInstitucional, ISODate } from "../types";
import { type Contexto } from "./disponibilidade";
import { coberturaPeriodo } from "./escalas";

export function limiteFerias(efetivo: number, pctMax: number): number {
  return Math.max(1, Math.floor(efetivo * pctMax));
}

/* ------------------------------------------------------------------ */
/* Carga de férias por divisão (pico de militares simultâneos)         */
/* ------------------------------------------------------------------ */

export interface CargaMes {
  mes: number;
  pico: number;
  excedido: boolean;
}

export interface CargaDivisao {
  divisao: DivisaoId;
  efetivo: number;
  limite: number;
  meses: CargaMes[];
}

/** Conta, dia a dia, quantos militares de cada divisão estão de férias no intervalo. */
function contagemDiariaFerias(ctx: Contexto, inicio: ISODate, fim: ISODate): Map<DivisaoId, number[]> {
  const n = diffDays(inicio, fim) + 1;
  const mapa = new Map<DivisaoId, number[]>();
  for (const m of ctx.militares) {
    const ferias = (ctx.porMilitar.get(m.id) ?? []).filter(
      (a) => a.categoria === "FERIAS" && overlaps(a.inicio, a.fim, inicio, fim),
    );
    if (!ferias.length) continue;
    const arr = mapa.get(m.divisao) ?? new Array<number>(n).fill(0);
    const marcados = new Set<number>();
    for (const f of ferias) {
      const ini = Math.max(0, diffDays(inicio, f.inicio));
      const end = Math.min(n - 1, diffDays(inicio, f.fim));
      for (let i = ini; i <= end; i++) marcados.add(i);
    }
    marcados.forEach((i) => arr[i]++);
    mapa.set(m.divisao, arr);
  }
  return mapa;
}

export function cargaFeriasAnual(ctx: Contexto, ano: number): CargaDivisao[] {
  const inicio = `${ano}-01-01`;
  const contagem = contagemDiariaFerias(ctx, inicio, `${ano}-12-31`);
  const pctMax = ctx.db.parametros.limiteFeriasDivisao;

  return DIVISOES.map((d) => {
    const efetivo = ctx.militares.filter((m) => m.divisao === d.id).length;
    const limite = limiteFerias(efetivo, pctMax);
    const arr = contagem.get(d.id);
    const meses: CargaMes[] = Array.from({ length: 12 }, (_, mes) => {
      if (!arr) return { mes, pico: 0, excedido: false };
      const a = diffDays(inicio, inicioMes(ano, mes));
      const b = diffDays(inicio, fimMes(ano, mes));
      const pico = Math.max(...arr.slice(a, b + 1));
      return { mes, pico, excedido: pico > limite };
    });
    return { divisao: d.id, efetivo, limite, meses };
  }).filter((d) => d.efetivo > 0);
}

/* ------------------------------------------------------------------ */
/* Meta mensal de férias por divisão (planejamento de calendário)     */
/* ------------------------------------------------------------------ */

export interface MetaMensalFerias {
  divisao: DivisaoId;
  efetivo: number;
  /** Total de dias de férias que a divisão deve distribuir no ano (30 dias × efetivo). */
  totalDiasAno: number;
  /**
   * Distribuição ideal: dias de férias por mês que cada divisão deve consumir
   * para evitar acúmulo no final do ano.
   * Considera dias úteis (exclui fins de semana) para cálculo proporcional.
   */
  metaPorMes: { mes: number; metaDias: number; diasUteisNoMes: number }[];
}

/** Conta dias úteis (seg–sex) em um mês. */
function diasUteisMes(ano: number, mes0: number): number {
  const n = diasNoMes(ano, mes0);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(ano, mes0, i + 1)).getUTCDay();
    if (d !== 0 && d !== 6) count++;
  }
  return count;
}

export function metaMensalFerias(ctx: Contexto, ano: number): MetaMensalFerias[] {
  const DIAS_FERIAS_ANUAIS = 30;
  const diasUteisTotais = Array.from({ length: 12 }, (_, m) => diasUteisMes(ano, m));
  const totalDiasUteis = diasUteisTotais.reduce((s, v) => s + v, 0);

  return DIVISOES.map((d) => {
    const efetivo = ctx.militares.filter((m) => m.divisao === d.id).length;
    if (!efetivo) return null;
    const totalDiasAno = efetivo * DIAS_FERIAS_ANUAIS;
    const metaPorMes = diasUteisTotais.map((du, mes) => ({
      mes,
      diasUteisNoMes: du,
      // Distribui proporcionalmente aos dias úteis do mês
      metaDias: Math.round((du / totalDiasUteis) * totalDiasAno),
    }));
    return { divisao: d.id, efetivo, totalDiasAno, metaPorMes };
  }).filter((x): x is MetaMensalFerias => x !== null);
}

/* ------------------------------------------------------------------ */
/* Conflitos                                                           */
/* ------------------------------------------------------------------ */

export type TipoConflito = "CONSELHO" | "PICO_DIVISAO" | "ESCALA";

export interface ConflitoFerias {
  id: string;
  tipo: TipoConflito;
  severidade: "alta" | "media";
  titulo: string;
  detalhe: string;
  inicio: ISODate;
  fim: ISODate;
  militarIds: string[];
}

const MAX_DIAS_ANALISE = 400;

export function conflitosConselho(
  ctx: Contexto,
  inicio: ISODate,
  fim: ISODate,
  somenteFerias = true,
): { evento: EventoInstitucional; militarId: string; afastamentoId: string; categoria: string }[] {
  const out: { evento: EventoInstitucional; militarId: string; afastamentoId: string; categoria: string }[] = [];
  const eventos = ctx.db.eventos.filter((e) => e.exigeConselho && overlaps(e.inicio, e.fim, inicio, fim));
  const membros = ctx.militares.filter((m) => m.membroConselho);
  for (const ev of eventos) {
    for (const m of membros) {
      for (const a of ctx.porMilitar.get(m.id) ?? []) {
        if (somenteFerias && a.categoria !== "FERIAS") continue;
        if (overlaps(a.inicio, a.fim, ev.inicio, ev.fim)) {
          out.push({ evento: ev, militarId: m.id, afastamentoId: a.id, categoria: a.categoria });
        }
      }
    }
  }
  return out;
}

export function conflitosFerias(ctx: Contexto, inicio: ISODate, fim: ISODate): ConflitoFerias[] {
  if (diffDays(inicio, fim) > MAX_DIAS_ANALISE) fim = addDays(inicio, MAX_DIAS_ANALISE);
  const out: ConflitoFerias[] = [];

  // 1) Conselho de Gestão
  for (const c of conflitosConselho(ctx, inicio, fim)) {
    const m = ctx.militarMap.get(c.militarId);
    out.push({
      id: `cons-${c.evento.id}-${c.militarId}`,
      tipo: "CONSELHO",
      severidade: "alta",
      titulo: `Férias coincidem com ${c.evento.titulo}`,
      detalhe: `${m ? `${m.posto} ${m.nomeGuerra}` : "Militar"} é membro do Conselho de Gestão.`,
      inicio: c.evento.inicio,
      fim: c.evento.fim,
      militarIds: [c.militarId],
    });
  }

  // 2) Pico de férias por divisão
  const pctMax = ctx.db.parametros.limiteFeriasDivisao;
  const contagem = contagemDiariaFerias(ctx, inicio, fim);
  for (const [div, arr] of contagem) {
    const efetivo = ctx.militares.filter((m) => m.divisao === div).length;
    const limite = limiteFerias(efetivo, pctMax);
    const dias = arr.map((v, i) => ({ v, d: addDays(inicio, i) })).filter((x) => x.v > limite);
    for (const t of agruparConsecutivos(dias.map((x) => x.d))) {
      const pico = Math.max(...dias.filter((x) => x.d >= t.inicio && x.d <= t.fim).map((x) => x.v));
      const sigla = DIVISOES.find((d) => d.id === div)?.sigla ?? div;
      out.push({
        id: `pico-${div}-${t.inicio}`,
        tipo: "PICO_DIVISAO",
        severidade: "media",
        titulo: `${sigla}: ${pico} militares de férias simultaneamente`,
        detalhe: `Limite da divisão: ${limite} de ${efetivo} (${Math.round(pctMax * 100)}%).`,
        inicio: t.inicio,
        fim: t.fim,
        militarIds: ctx.militares
          .filter(
            (m) =>
              m.divisao === div &&
              (ctx.porMilitar.get(m.id) ?? []).some(
                (a) => a.categoria === "FERIAS" && overlaps(a.inicio, a.fim, t.inicio, t.fim),
              ),
          )
          .map((m) => m.id),
      });
    }
  }

  // 3) Férias que contribuem para escala crítica
  for (const escala of ctx.db.escalas) {
    const criticos = coberturaPeriodo(ctx, escala, inicio, fim).filter(
      (c) => (c.status === "CRITICO" || c.status === "SEM_COBERTURA") && c.indisponiveis.some((i) => i.tipo === "FERIAS"),
    );
    for (const t of agruparConsecutivos(criticos.map((c) => c.data))) {
      const trecho = criticos.filter((c) => c.data >= t.inicio && c.data <= t.fim);
      const ids = new Set(trecho.flatMap((c) => c.indisponiveis.filter((i) => i.tipo === "FERIAS").map((i) => i.militarId)));
      const regimeMin = Math.min(...trecho.map((c) => c.regime));
      out.push({
        id: `esc-${escala.id}-${t.inicio}`,
        tipo: "ESCALA",
        severidade: "alta",
        titulo: `Escala de ${ESCALA_LABEL[escala.id]} crítica com militares de férias`,
        detalhe: regimeMin < 1 ? "Escala fica sem cobertura." : `Regime cai para ${regimeMin} por 1.`,
        inicio: t.inicio,
        fim: t.fim,
        militarIds: [...ids],
      });
    }
  }

  return out.sort((a, b) => (a.severidade === b.severidade ? a.inicio.localeCompare(b.inicio) : a.severidade === "alta" ? -1 : 1));
}
