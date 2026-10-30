/**
 * SisPesCFT — Módulo de Segurança da Informação, Criptografia e LGPD Militar
 *
 * Implementa:
 * 1. Hashing criptográfico de senhas com salt usando Web Crypto API padrão W3C (SHA-256).
 * 2. Proteção anti-força bruta (Rate limiting com bloqueio progressivo por militar/IP).
 * 3. Mascaramento de dados pessoais sensíveis em conformidade com a LGPD (Lei 13.709/2018).
 */

import type { Usuario } from "./types";

const SALT_PREFIX = "cft_sec_v1_";
const KEY_RATE_LIMIT = "sispescft:sec:rate_limit";

// ============================================================================
// 1. CRIPTOGRAFIA DE SENHAS (SHA-256 COM SALT INDIVIDUAL)
// ============================================================================

/**
 * Gera o hash criptográfico SHA-256 com salt único derivado do militar (NIP/e-mail).
 * Nunca armazena senhas em texto puro.
 */
export async function gerarHashSenha(
  senha: string,
  identificador: string
): Promise<string> {
  const normId = identificador.toLowerCase().trim();
  const salt = `${SALT_PREFIX}${normId}`;
  const payload = `${salt}:::${senha.trim()}`;

  const subtle =
    globalThis.crypto?.subtle ||
    (typeof window !== "undefined" && (window as any).crypto?.subtle);

  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback seguro em ambientes SSR / Node.js
  const nodeCrypto = await import("crypto");
  return nodeCrypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Valida se a senha digitada confere com o hash salvo.
 */
export async function verificarHashSenha(
  senhaDigitada: string,
  identificador: string,
  hashArmazenado: string
): Promise<boolean> {
  if (!hashArmazenado) return false;
  const hashCalculado = await gerarHashSenha(senhaDigitada, identificador);
  return hashCalculado === hashArmazenado;
}

// ============================================================================
// 2. PROTEÇÃO ANTI-FORÇA BRUTA (RATE LIMITING PROGRESSIVO)
// ============================================================================

interface TentativaRegistro {
  falhas: number;
  bloqueadoAte: number; // timestamp em ms
}

function obterMapaRateLimit(): Record<string, TentativaRegistro> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_RATE_LIMIT);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function salvarMapaRateLimit(mapa: Record<string, TentativaRegistro>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_RATE_LIMIT, JSON.stringify(mapa));
  } catch {}
}

export interface StatusRateLimit {
  bloqueado: boolean;
  segundosRestantes: number;
  tentativasRestantes: number;
}

const LIMITE_TENTATIVAS = 5;

/**
 * Verifica se o identificador (NIP ou e-mail) está atualmente bloqueado por tentativas consecutivas.
 */
export function verificarBloqueioLogin(identificador: string): StatusRateLimit {
  const norm = identificador.toLowerCase().trim();
  const mapa = obterMapaRateLimit();
  const reg = mapa[norm];

  if (!reg) {
    return { bloqueado: false, segundosRestantes: 0, tentativasRestantes: LIMITE_TENTATIVAS };
  }

  const agora = Date.now();
  if (reg.bloqueadoAte && agora < reg.bloqueadoAte) {
    const segundosRestantes = Math.ceil((reg.bloqueadoAte - agora) / 1000);
    return { bloqueado: true, segundosRestantes, tentativasRestantes: 0 };
  }

  const tentativasUsadas = reg.falhas || 0;
  const tentativasRestantes = Math.max(0, LIMITE_TENTATIVAS - tentativasUsadas);
  return { bloqueado: false, segundosRestantes: 0, tentativasRestantes };
}

/**
 * Registra uma tentativa falha de senha e aplica bloqueio progressivo caso atinja o limite.
 */
export function registrarFalhaLogin(identificador: string): StatusRateLimit {
  const norm = identificador.toLowerCase().trim();
  const mapa = obterMapaRateLimit();
  const reg = mapa[norm] || { falhas: 0, bloqueadoAte: 0 };

  reg.falhas = (reg.falhas || 0) + 1;
  const agora = Date.now();

  // Bloqueios progressivos:
  // 5 falhas: 60s (1 minuto)
  // 8 falhas: 300s (5 minutos)
  // 10+ falhas: 900s (15 minutos)
  if (reg.falhas >= 10) {
    reg.bloqueadoAte = agora + 15 * 60 * 1000;
  } else if (reg.falhas >= 8) {
    reg.bloqueadoAte = agora + 5 * 60 * 1000;
  } else if (reg.falhas >= LIMITE_TENTATIVAS) {
    reg.bloqueadoAte = agora + 60 * 1000;
  }

  mapa[norm] = reg;
  salvarMapaRateLimit(mapa);

  return verificarBloqueioLogin(norm);
}

/**
 * Limpa o histórico de falhas após um login com sucesso.
 */
export function limparFalhasLogin(identificador: string): void {
  const norm = identificador.toLowerCase().trim();
  const mapa = obterMapaRateLimit();
  if (mapa[norm]) {
    delete mapa[norm];
    salvarMapaRateLimit(mapa);
  }
}

// ============================================================================
// 3. MASCARAMENTO E MINIMIZAÇÃO DE DADOS (LGPD MILITAR - LEI 13.709/2018)
// ============================================================================

/**
 * Mascara e-mails civis ou funcionais para proteger a privacidade.
 * Exemplo: `sacrasub@gmail.com` -> `sac***@gmail.com`
 */
export function mascararEmail(email?: string): string {
  if (!email || !email.includes("@")) return "—";
  const [user, domain] = email.split("@");
  if (user.length <= 3) {
    return `${user[0]}***@${domain}`;
  }
  return `${user.slice(0, 3)}***@${domain}`;
}

/**
 * Mascara números de telefone para exibição pública na OM.
 * Exemplo: `(97) 99123-4567` -> `(97) 9****-**67`
 */
export function mascararTelefone(telefone?: string): string {
  if (!telefone) return "—";
  const limpo = telefone.replace(/\s+/g, "");
  if (limpo.length < 8) return "******";
  const prefixo = limpo.slice(0, 5);
  const sufixo = limpo.slice(-2);
  return `${prefixo}****-**${sufixo}`;
}

/**
 * Verifica se o usuário atual possui permissão de segurança para visualizar dados sensíveis completos.
 * Permissão concedida para:
 * - Super Admin (SO Sacramento)
 * - Administradores (Imediato, Oficial Pessoal)
 * - O próprio militar visualizando sua própria ficha
 */
export function podeVisualizarDadosCompletos(
  usuarioAtual: Usuario | null,
  militarNipOuId: string
): boolean {
  if (!usuarioAtual) return false;
  if (usuarioAtual.roleCft === "super_admin" || usuarioAtual.perfil === "ADMIN") return true;
  if (usuarioAtual.id === militarNipOuId || usuarioAtual.nip === militarNipOuId) return true;
  return false;
}
