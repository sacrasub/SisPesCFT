import type { DataRepository } from "./types";
import { LocalStorageRepository } from "./localStorageRepository";

export type { DataRepository } from "./types";
export { applyRemove, applyUpsert } from "./types";

/**
 * Fábrica do repositório conforme NEXT_PUBLIC_DATA_BACKEND.
 * O SDK do Supabase só é carregado (import dinâmico) quando necessário.
 */
export async function createRepository(): Promise<DataRepository> {
  const backend = process.env.NEXT_PUBLIC_DATA_BACKEND ?? "local";

  if (backend === "supabase") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error("[SisPesCFT] Supabase selecionado, mas URL/chave ausentes. Usando LocalStorage.");
      return new LocalStorageRepository();
    }
    const [{ createClient }, { SupabaseRepository }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("./supabaseRepository"),
    ]);
    return new SupabaseRepository(createClient(url, key));
  }

  return new LocalStorageRepository();
}
