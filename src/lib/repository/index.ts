import type { DataRepository } from "./types";
import { LocalStorageRepository } from "./localStorageRepository";
import type { Database } from "../types";

export type { DataRepository } from "./types";
export { applyRemove, applyUpsert, COLLECTIONS } from "./types";

export const STORAGE_KEY_BACKEND = "SISPESCFT_DATA_BACKEND";
export const STORAGE_KEY_URL = "SISPESCFT_SUPABASE_URL";
export const STORAGE_KEY_KEY = "SISPESCFT_SUPABASE_KEY";

export interface BackendConfig {
  backend: "local" | "supabase";
  url?: string;
  key?: string;
  isEnvConfigured: boolean;
}

/**
 * Obtém as credenciais e o backend ativo atual, considerando tanto variáveis
 * de ambiente (Vercel/produção) quanto configurações salvas no navegador.
 */
export function obterConfiguracaoBackend(): BackendConfig {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envBackend = (process.env.NEXT_PUBLIC_DATA_BACKEND as "local" | "supabase" | undefined) ?? undefined;

  let localBackend: "local" | "supabase" | null = null;
  let localUrl: string | null = null;
  let localKey: string | null = null;

  if (typeof window !== "undefined") {
    localBackend = window.localStorage.getItem(STORAGE_KEY_BACKEND) as "local" | "supabase" | null;
    localUrl = window.localStorage.getItem(STORAGE_KEY_URL);
    localKey = window.localStorage.getItem(STORAGE_KEY_KEY);
  }

  const isEnvConfigured = !!(envUrl && envKey && envBackend === "supabase");
  const url = localUrl || envUrl || undefined;
  const key = localKey || envKey || undefined;
  const backend: "local" | "supabase" = localBackend || envBackend || (url && key ? "supabase" : "local");

  return {
    backend: backend === "supabase" && url && key ? "supabase" : "local",
    url,
    key,
    isEnvConfigured,
  };
}

/**
 * Salva a preferência de backend e credenciais no navegador.
 */
export function salvarConfiguracaoBackend(
  backend: "local" | "supabase",
  url?: string,
  key?: string,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_BACKEND, backend);
  if (url !== undefined) {
    if (url) window.localStorage.setItem(STORAGE_KEY_URL, url);
    else window.localStorage.removeItem(STORAGE_KEY_URL);
  }
  if (key !== undefined) {
    if (key) window.localStorage.setItem(STORAGE_KEY_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

/**
 * Testa a conectividade com o projeto Supabase e valida a existência do schema.
 */
export async function testarConexaoSupabase(
  url: string,
  key: string,
): Promise<{ ok: boolean; mensagem: string; tabelasEncontradas?: boolean }> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key);

    // 1. Testa a tabela compartilhada de militares
    const resMilitar = await client.from("militares").select("id, nip").limit(1);
    if (resMilitar.error) {
      return {
        ok: false,
        mensagem: `Erro na tabela 'militares' do Supabase: ${resMilitar.error.message}. Execute a migração do Banco Único CFT no SQL Editor.`,
        tabelasEncontradas: false,
      };
    }

    // 2. Testa as tabelas exclusivas do SisPesCFT
    const resParams = await client.from("sispes_parametros").select("id").limit(1);
    if (resParams.error) {
      if (
        resParams.error.message.includes("does not exist") ||
        resParams.error.code === "42P01" ||
        resParams.error.message.includes("relation")
      ) {
        return {
          ok: false,
          mensagem:
            "Conectado ao Supabase com sucesso, mas o schema do SisPesCFT ainda não foi criado. Execute o script '001_banco_unico_cft.sql' no SQL Editor do projeto.",
          tabelasEncontradas: false,
        };
      }
      return {
        ok: false,
        mensagem: `Erro de acesso no Supabase: ${resParams.error.message} (Código ${resParams.error.code || "N/A"})`,
        tabelasEncontradas: false,
      };
    }

    return {
      ok: true,
      mensagem: "Conexão com o Supabase CFT estabelecida com sucesso! Cadastro unificado e sincronização em tempo real ativos.",
      tabelasEncontradas: true,
    };
  } catch (err) {
    return {
      ok: false,
      mensagem: `Falha na conexão HTTP com o Supabase: ${(err as Error).message}`,
    };
  }
}

/**
 * Fábrica do repositório conforme configuração ativa (ambiente ou navegador).
 */
export async function createRepository(overrideConfig?: Partial<BackendConfig>): Promise<DataRepository> {
  const config = { ...obterConfiguracaoBackend(), ...overrideConfig };

  if (config.backend === "supabase") {
    const url = config.url;
    const key = config.key;

    if (!url || !key) {
      console.warn("[SisPesCFT] Supabase selecionado, mas URL ou chave ausentes. Usando LocalStorage.");
      return new LocalStorageRepository();
    }

    try {
      const [{ createClient }, { SupabaseRepository }] = await Promise.all([
        import("@supabase/supabase-js"),
        import("./supabaseRepository"),
      ]);
      return new SupabaseRepository(createClient(url, key));
    } catch (err) {
      console.error("[SisPesCFT] Falha ao carregar cliente Supabase:", err);
      return new LocalStorageRepository();
    }
  }

  return new LocalStorageRepository();
}
