import type { SupabaseClient } from "@supabase/supabase-js";
import { criarSeed, DB_VERSION } from "../seed";
import type { CollectionItem, CollectionKey, Database, Parametros } from "../types";
import { COLLECTIONS, type DataRepository } from "./types";

/**
 * Persistência multiusuário via Supabase (Postgres + Realtime).
 * Cada coleção é uma tabela com (id text PK, data jsonb, updated_at timestamptz).
 * Ver `supabase/schema.sql`.
 */
const TABELA: Record<CollectionKey, string> = {
  militares: "militares",
  afastamentos: "afastamentos",
  escalas: "escalas",
  eventos: "eventos",
};
const TABELA_PARAMETROS = "parametros";

export class SupabaseRepository implements DataRepository {
  readonly backend = "supabase" as const;

  constructor(private client: SupabaseClient) {}

  async load(): Promise<Database> {
    const results = await Promise.all(COLLECTIONS.map((c) => this.client.from(TABELA[c]).select("data")));
    const erro = results.find((r) => r.error)?.error;
    if (erro) throw new Error(`Supabase: ${erro.message}`);

    const params = await this.client.from(TABELA_PARAMETROS).select("data").eq("id", "default").maybeSingle();
    const [militares, afastamentos, escalas, eventos] = results.map((r) => (r.data ?? []).map((row) => row.data));

    // Base vazia: popula com a demonstração para facilitar a primeira implantação.
    if (!militares.length && !escalas.length) {
      const seed = criarSeed();
      await this.replaceAll(seed);
      return seed;
    }

    return {
      version: DB_VERSION,
      militares,
      afastamentos,
      escalas,
      eventos,
      parametros: (params.data?.data as Parametros) ?? criarSeed().parametros,
      updatedAt: new Date().toISOString(),
    };
  }

  async upsert<K extends CollectionKey>(key: K, item: CollectionItem<K>): Promise<void> {
    const { error } = await this.client
      .from(TABELA[key])
      .upsert({ id: item.id, data: item, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  async remove(key: CollectionKey, id: string): Promise<void> {
    const { error } = await this.client.from(TABELA[key]).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async saveParametros(p: Parametros): Promise<void> {
    const { error } = await this.client
      .from(TABELA_PARAMETROS)
      .upsert({ id: "default", data: p, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  async replaceAll(db: Database): Promise<void> {
    const now = new Date().toISOString();
    for (const c of COLLECTIONS) {
      const del = await this.client.from(TABELA[c]).delete().neq("id", "");
      if (del.error) throw new Error(del.error.message);
      const rows = (db[c] as Array<{ id: string }>).map((item) => ({ id: item.id, data: item, updated_at: now }));
      if (rows.length) {
        const ins = await this.client.from(TABELA[c]).insert(rows);
        if (ins.error) throw new Error(ins.error.message);
      }
    }
    await this.saveParametros(db.parametros);
  }

  subscribe(onChange: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 300);
    };
    const channel = this.client.channel("sispescft-db");
    for (const t of [...Object.values(TABELA), TABELA_PARAMETROS]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, debounced);
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void this.client.removeChannel(channel);
    };
  }
}
