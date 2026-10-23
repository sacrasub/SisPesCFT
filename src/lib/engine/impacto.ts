import { agruparConsecutivos, diffDays, eachDay, overlaps } from "../dates";
import type { Afastamento, Database, DivisaoId, EscalaConfig, EventoInstitucional, ISODate, StatusCobertura } from "../types";
import { criarContexto } from "./disponibilidade";
import { coberturaDia, efetivoEscala, piorStatus, severidade } from "./escalas";
import { conflitosConselho, limiteFerias } from "./ferias";

/**
 * Simulação "what-if": compara o cenário atual com o cenário após salvar o lançamento,
 * apontando para a divisão o impacto real nas escalas antes de confirmar.
 */

export interface TrechoImpacto {
  inicio: ISODate;
  fim: ISODate;
  antes: StatusCobertura;
  depois: StatusCobertura;
  regimeMin: number;
}

export interface ImpactoEscala {
  escala: EscalaConfig;
  trechos: TrechoImpacto[];
  pior: StatusCobertura;
}

export interface ImpactoLancamento {
  nivel: "ok" | "atencao" | "critico";
  escalas: ImpactoEscala[];
  duplicidades: { militarId: string; afastamento: Afastamento }[];
  conselho: { militarId: string; evento: EventoInstitucional }[];
  picoFerias: { divisao: DivisaoId; inicio: ISODate; fim: ISODate; limite: number }[];
}

const MAX_DIAS = 370;

export function analisarImpacto(db: Database, rascunho: Afastamento, ignorarId?: string): ImpactoLancamento {
  const vazio: ImpactoLancamento = { nivel: "ok", escalas: [], duplicidades: [], conselho: [], picoFerias: [] };
  if (!rascunho.inicio || !rascunho.fim || rascunho.fim < rascunho.inicio || !rascunho.militarIds.length) return vazio;
  if (rascunho.status === "CANCELADO") return vazio;
  if (diffDays(rascunho.inicio, rascunho.fim) > MAX_DIAS) return vazio;

  // O rascunho sempre conta na simulação, independentemente do status.
  const simulado: Afastamento = { ...rascunho, id: rascunho.id || "__rascunho__", status: "CONFIRMADO" };
  const antes = criarContexto(db, { ignorarId });
  const depois = criarContexto(db, { ignorarId, extras: [simulado] });
  const dias = eachDay(rascunho.inicio, rascunho.fim);

  // 1) Escalas
  const escalas: ImpactoEscala[] = [];
  if (rascunho.impactaEscala) {
    for (const escala of db.escalas) {
      const poolA = efetivoEscala(antes, escala);
      if (!poolA.some((m) => rascunho.militarIds.includes(m.id))) continue;
      const poolD = efetivoEscala(depois, escala);

      const piora = dias
        .map((d) => ({ a: coberturaDia(antes, escala, d, poolA), b: coberturaDia(depois, escala, d, poolD) }))
        .filter(({ a, b }) => b.regime < a.regime && severidade(b.status) > severidade(a.status));

      if (!piora.length) continue;
      const trechos: TrechoImpacto[] = [];
      for (const t of agruparConsecutivos(piora.map((p) => p.b.data))) {
        const sub = piora.filter((p) => p.b.data >= t.inicio && p.b.data <= t.fim);
        trechos.push({
          ...t,
          antes: piorStatus(sub.map((p) => p.a.status)),
          depois: piorStatus(sub.map((p) => p.b.status)),
          regimeMin: Math.min(...sub.map((p) => p.b.regime)),
        });
      }
      escalas.push({ escala, trechos, pior: piorStatus(trechos.map((t) => t.depois)) });
    }
  }

  // 2) Militares já afastados no período
  const duplicidades: ImpactoLancamento["duplicidades"] = [];
  for (const mid of rascunho.militarIds) {
    for (const a of antes.porMilitar.get(mid) ?? []) {
      if (overlaps(a.inicio, a.fim, rascunho.inicio, rascunho.fim)) duplicidades.push({ militarId: mid, afastamento: a });
    }
  }

  // 3) Conselho de Gestão
  const conselho = conflitosConselho(depois, rascunho.inicio, rascunho.fim, false)
    .filter((c) => c.afastamentoId === simulado.id)
    .map((c) => ({ militarId: c.militarId, evento: c.evento }));

  // 4) Pico de férias na divisão
  const picoFerias: ImpactoLancamento["picoFerias"] = [];
  if (rascunho.categoria === "FERIAS") {
    const divisoes = new Set(
      rascunho.militarIds.map((id) => depois.militarMap.get(id)?.divisao).filter(Boolean) as DivisaoId[],
    );
    for (const div of divisoes) {
      const membros = depois.militares.filter((m) => m.divisao === div);
      const limite = limiteFerias(membros.length, db.parametros.limiteFeriasDivisao);
      const excedidos = dias.filter(
        (d) =>
          membros.filter((m) =>
            (depois.porMilitar.get(m.id) ?? []).some((a) => a.categoria === "FERIAS" && a.inicio <= d && d <= a.fim),
          ).length > limite,
      );
      for (const t of agruparConsecutivos(excedidos)) picoFerias.push({ divisao: div, ...t, limite });
    }
  }

  const critico = escalas.some((e) => severidade(e.pior) >= 2) || conselho.length > 0;
  const atencao = escalas.length > 0 || duplicidades.length > 0 || picoFerias.length > 0;
  return { nivel: critico ? "critico" : atencao ? "atencao" : "ok", escalas, duplicidades, conselho, picoFerias };
}
