import { POSTO_ORDEM } from "./constants";
import type { Militar } from "./types";

/** Concatena classes condicionalmente (substituto leve de clsx). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix = "id"): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** "3SG SILVA" */
export function nomeMilitar(m: Pick<Militar, "posto" | "nomeGuerra"> | undefined): string {
  if (!m) return "Militar removido";
  return `${m.posto} ${m.nomeGuerra}`;
}

/** Ordena por antiguidade (posto) e depois por nome de guerra. */
export function porAntiguidade(a: Militar, b: Militar): number {
  return POSTO_ORDEM[a.posto] - POSTO_ORDEM[b.posto] || a.nomeGuerra.localeCompare(b.nomeGuerra, "pt-BR");
}

export function pct(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

/** "3 por 1" — regime de escala a partir do nº de folgas. */
export function fmtRegime(folgas: number): string {
  if (folgas < 1) return "Sem cobertura";
  return `${folgas} por 1`;
}

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function downloadArquivo(nome: string, conteudo: string, mime = "application/json"): void {
  const blob = new Blob([conteudo], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(linhas: Array<Record<string, string | number>>): string {
  if (!linhas.length) return "";
  const cols = Object.keys(linhas[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  // BOM para o Excel reconhecer UTF-8 e ";" como separador padrão pt-BR
  return "\uFEFF" + [cols.map(esc).join(";"), ...linhas.map((l) => cols.map((c) => esc(l[c] ?? "")).join(";"))].join("\r\n");
}
