import type { ISODate } from "./types";

/**
 * Utilitários de data baseados em strings ISO "YYYY-MM-DD".
 * Internamente usa Date em UTC para que a aritmética não sofra com fuso/horário de verão.
 */

const MS_DIA = 86_400_000;

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** Data de hoje no fuso local do navegador (America/Manaus em Tabatinga). */
export function hojeISO(): ISODate {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: ISODate, n: number): ISODate {
  return toISO(new Date(parseISO(iso).getTime() + n * MS_DIA));
}

/** Diferença em dias (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / MS_DIA);
}

/** Duração inclusiva em dias. */
export function duracaoDias(inicio: ISODate, fim: ISODate): number {
  return diffDays(inicio, fim) + 1;
}

export function eachDay(inicio: ISODate, fim: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const n = diffDays(inicio, fim);
  for (let i = 0; i <= n; i++) out.push(addDays(inicio, i));
  return out;
}

/** Intervalos fechados [aIni,aFim] e [bIni,bFim] se sobrepõem? (comparação lexicográfica ISO é segura) */
export function overlaps(aIni: ISODate, aFim: ISODate, bIni: ISODate, bFim: ISODate): boolean {
  return aIni <= bFim && bIni <= aFim;
}

export function within(date: ISODate, inicio: ISODate, fim?: ISODate | null): boolean {
  return date >= inicio && (!fim || date <= fim);
}

export function inicioMes(ano: number, mes0: number): ISODate {
  return `${ano}-${String(mes0 + 1).padStart(2, "0")}-01`;
}

export function fimMes(ano: number, mes0: number): ISODate {
  return toISO(new Date(Date.UTC(ano, mes0 + 1, 0)));
}

export function diasNoMes(ano: number, mes0: number): number {
  return new Date(Date.UTC(ano, mes0 + 1, 0)).getUTCDate();
}

/** 0 = domingo ... 6 = sábado */
export function diaSemana(iso: ISODate): number {
  return parseISO(iso).getUTCDay();
}

export function isFimDeSemana(iso: ISODate): boolean {
  const d = diaSemana(iso);
  return d === 0 || d === 6;
}

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const DIAS_SEMANA_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** 23/10/2026 */
export function fmt(iso?: ISODate | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** 23/10 */
export function fmtCurto(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** 23 Out */
export function fmtDiaMes(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${d} ${MESES_CURTOS[Number(m) - 1]}`;
}

export function fmtPeriodo(inicio: ISODate, fim: ISODate): string {
  if (inicio === fim) return fmt(inicio);
  return `${fmtCurto(inicio)} a ${fmt(fim)}`;
}

/** Agrupa datas consecutivas em intervalos. Entrada deve estar ordenada. */
export function agruparConsecutivos(datas: ISODate[]): { inicio: ISODate; fim: ISODate }[] {
  const out: { inicio: ISODate; fim: ISODate }[] = [];
  for (const d of datas) {
    const last = out[out.length - 1];
    if (last && diffDays(last.fim, d) === 1) last.fim = d;
    else out.push({ inicio: d, fim: d });
  }
  return out;
}
