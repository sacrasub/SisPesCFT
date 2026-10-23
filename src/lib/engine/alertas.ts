import { ESCALA_LABEL, RESTRICAO_META } from "../constants";
import { addDays, agruparConsecutivos, fmtPeriodo, overlaps, within } from "../dates";
import { nomeMilitar } from "../utils";
import type { ISODate, StatusCobertura } from "../types";
import type { Contexto } from "./disponibilidade";
import { coberturaPeriodo } from "./escalas";
import { conflitosFerias } from "./ferias";
import { gerarGradeSOMOR } from "./escalas";

export type NivelAlerta = "critico" | "atencao" | "info";

export interface Alerta {
  id: string;
  nivel: NivelAlerta;
  categoria: "ESCALA" | "FERIAS" | "DUPLICIDADE" | "RESTRICAO" | "CONSELHO" | "0X0" | "IN_SEM_HAB";
  titulo: string;
  detalhe: string;
  inicio?: ISODate;
  fim?: ISODate;
  href?: string;
}

const PESO: Record<NivelAlerta, number> = { critico: 0, atencao: 1, info: 2 };

/** Consolida todos os alertas do horizonte informado, do mais grave ao mais leve. */
export function gerarAlertas(ctx: Contexto, hoje: ISODate, horizonte: number): Alerta[] {
  const fim = addDays(hoje, horizonte);
  const out: Alerta[] = [];

  // 1) Escalas abaixo do alvo / críticas
  for (const escala of ctx.db.escalas) {
    const dias = coberturaPeriodo(ctx, escala, hoje, fim);
    const grupos: Array<{ status: StatusCobertura[]; nivel: NivelAlerta }> = [
      { status: ["CRITICO", "SEM_COBERTURA"], nivel: "critico" },
      { status: ["ATENCAO"], nivel: "atencao" },
    ];
    for (const g of grupos) {
      const sel = dias.filter((d) => g.status.includes(d.status));
      for (const t of agruparConsecutivos(sel.map((d) => d.data))) {
        const trecho = sel.filter((d) => d.data >= t.inicio && d.data <= t.fim);
        const regimeMin = Math.min(...trecho.map((d) => d.regime));
        const semCobertura = trecho.some((d) => d.status === "SEM_COBERTURA");
        out.push({
          id: `esc-${escala.id}-${t.inicio}-${g.nivel}`,
          nivel: g.nivel,
          categoria: "ESCALA",
          titulo: `${ESCALA_LABEL[escala.id]}: ${semCobertura ? "sem cobertura" : `regime ${regimeMin} por 1`}`,
          detalhe: `${fmtPeriodo(t.inicio, t.fim)} · alvo ${escala.regimeAlvo} por 1 · mínimo aceitável ${escala.limiteSeguranca} por 1`,
          inicio: t.inicio,
          fim: t.fim,
          href: `/escalas?e=${escala.id}&d=${t.inicio}`,
        });
      }
    }
  }

  // 2) Férias (conselho, pico de divisão, férias agravando escalas)
  for (const c of conflitosFerias(ctx, hoje, fim)) {
    if (c.tipo === "ESCALA") continue; // já coberto pelos alertas de escala
    out.push({
      id: `fer-${c.id}`,
      nivel: c.severidade === "alta" ? "critico" : "atencao",
      categoria: c.tipo === "CONSELHO" ? "CONSELHO" : "FERIAS",
      titulo: c.titulo,
      detalhe: `${fmtPeriodo(c.inicio, c.fim)} · ${c.detalhe}`,
      inicio: c.inicio,
      fim: c.fim,
      href: "/ferias",
    });
  }

  // 3) Militar lançado em dois afastamentos simultâneos (por divisões diferentes, normalmente)
  for (const m of ctx.militares) {
    const lista = (ctx.porMilitar.get(m.id) ?? []).filter((a) => overlaps(a.inicio, a.fim, hoje, fim));
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i];
        const b = lista[j];
        if (!overlaps(a.inicio, a.fim, b.inicio, b.fim)) continue;
        const ini = a.inicio > b.inicio ? a.inicio : b.inicio;
        const end = a.fim < b.fim ? a.fim : b.fim;
        out.push({
          id: `dup-${m.id}-${a.id}-${b.id}`,
          nivel: "atencao",
          categoria: "DUPLICIDADE",
          titulo: `${nomeMilitar(m)} lançado em dois eventos simultâneos`,
          detalhe: `${a.titulo} × ${b.titulo} · ${fmtPeriodo(ini, end)}`,
          inicio: ini,
          fim: end,
          href: "/lancamentos",
        });
      }
    }
  }

  // 4) Restrições que se encerram no horizonte (militar retorna às escalas)
  for (const m of ctx.militares) {
    for (const r of m.restricoes) {
      if (r.fim && within(r.fim, hoje, fim)) {
        out.push({
          id: `res-${m.id}-${r.id}`,
          nivel: "info",
          categoria: "RESTRICAO",
          titulo: `${nomeMilitar(m)}: ${RESTRICAO_META[r.tipo].label} encerra em ${fmtPeriodo(r.fim, r.fim)}`,
          detalhe: "Militar retorna às escalas após o término da restrição.",
          inicio: r.fim,
          fim: r.fim,
          href: "/efetivo",
        });
      }
    }
  }

  // 5) Detector 0×0: militar escalado em CTR/MO que perde a folga por ser alocado em IN
  for (const escala of ctx.db.escalas.filter((e) => e.id === "CONTRAMESTRE" || e.id === "MOTORISTA")) {
    const [ano, mes0] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1];
    const { alertas0x0 } = gerarGradeSOMOR(ctx, escala.id, ano, mes0);
    for (const alerta of alertas0x0) {
      const m = ctx.militarMap.get(alerta.militarId);
      out.push({
        id: `0x0-${alerta.militarId}-${alerta.data}`,
        nivel: "critico",
        categoria: "0X0",
        titulo: `Regime 0×0 detectado: ${m ? nomeMilitar(m) : alerta.militarId}`,
        detalhe: `${alerta.data} · Militar escalado em IN no dia imediatamente após serviço de ${ESCALA_LABEL[escala.id]}, perdendo a folga real.`,
        inicio: alerta.data,
        fim: alerta.data,
        href: `/escalas?e=${escala.id}&d=${alerta.data}`,
      });
    }
  }

  // 6) Equipe IN sem militares suficientes com habilitação ESPRAC/SRAK (mínimo 2 por saída)
  const escalaIN = ctx.db.escalas.find((e) => e.id === "INSPECAO_NAVAL");
  if (escalaIN) {
    const [ano, mes0] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1];
    const { alertasINSemHabilitacao } = gerarGradeSOMOR(ctx, "INSPECAO_NAVAL", ano, mes0);
    for (const alerta of alertasINSemHabilitacao) {
      out.push({
        id: `in-hab-${alerta.data}`,
        nivel: "critico",
        categoria: "IN_SEM_HAB",
        titulo: `Equipe IN: menos de 2 militares habilitados (ESPRAC/SRAK) em ${alerta.data}`,
        detalhe: `Apenas ${2 - alerta.apenasSemHabilitacao < 1 ? 0 : 2 - alerta.apenasSemHabilitacao} habilitados escalados. Mínimo exigido: 2 com ESPRAC/SRAK para assinar relatório de Inspeção Naval.`,
        inicio: alerta.data,
        fim: alerta.data,
        href: `/escalas?e=INSPECAO_NAVAL&d=${alerta.data}`,
      });
    }
  }

  return out.sort((a, b) => PESO[a.nivel] - PESO[b.nivel] || (a.inicio ?? "").localeCompare(b.inicio ?? ""));
}
