import type { Afastamento, DivisaoId, Militar, Usuario } from "./types";

/**
 * Regras de autorização centralizadas (front-end).
 * Ao migrar para Supabase, espelhar estas regras nas políticas RLS.
 */

export const isAdmin = (u: Usuario | null) => u?.perfil === "ADMIN";
export const isLideranca = (u: Usuario | null) => u?.perfil === "LIDERANCA";

/** Pode lançar previsões em nome da divisão? */
export function podeLancarPara(u: Usuario | null, divisao: DivisaoId): boolean {
  if (!u) return false;
  if (u.perfil === "ADMIN") return true;
  return u.perfil === "DIVISAO" && u.divisao === divisao;
}

export function podeEditarLancamento(u: Usuario | null, a: Pick<Afastamento, "divisao">): boolean {
  return podeLancarPara(u, a.divisao);
}

/** Férias: Pessoal lança para todos; divisões lançam para seus próprios militares. */
export function podeEditarFerias(u: Usuario | null, militar?: Pick<Militar, "divisao">): boolean {
  if (!u) return false;
  if (u.perfil === "ADMIN") return true;
  return u.perfil === "DIVISAO" && (!militar || militar.divisao === u.divisao);
}

export const podeEditarMilitar = isAdmin;
export const podeConfigurarEscala = isAdmin;
export const podeGerenciarEventos = isAdmin;
export const podeAdministrarDados = isAdmin;

/** Divisões disponíveis no seletor de lançamento. */
export function divisoesPermitidas(u: Usuario | null, todas: DivisaoId[]): DivisaoId[] {
  if (!u) return [];
  if (u.perfil === "ADMIN") return todas;
  if (u.perfil === "DIVISAO" && u.divisao) return [u.divisao];
  return [];
}

export function rotaInicial(u: Usuario): string {
  if (u.perfil === "LIDERANCA") return "/comando";
  if (u.perfil === "DIVISAO") return "/lancamentos";
  return "/dashboard";
}
