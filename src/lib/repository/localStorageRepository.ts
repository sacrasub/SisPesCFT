import { criarSeed, DB_VERSION } from "../seed";
import type { CollectionItem, CollectionKey, Database, Parametros } from "../types";
import { migrarDatabase } from "./migracao";
import { applyRemove, applyUpsert, type DataRepository } from "./types";

const STORAGE_KEY = "sispescft:db:v1";

/**
 * Persistência em LocalStorage (JSON estruturado, versionado).
 * Inclui migração inteligente para DB_VERSION = 3 preservando lançamentos de teste
 * e mesclando dados de militares pelo NIP.
 */
export class LocalStorageRepository implements DataRepository {
  readonly backend = "local" as const;
  private cache: Database | null = null;

  async load(): Promise<Database> {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Database;
        if (parsed.version === DB_VERSION) {
          // Garante merge preventivo por ID caso algum afastamento oficial do seed não esteja no localStorage
          const seed = criarSeed();
          const idsExistentes = new Set((parsed.afastamentos ?? []).map((a) => a.id));
          const novosOficiais = seed.afastamentos.filter((a) => !idsExistentes.has(a.id));
          if (novosOficiais.length > 0) {
            console.info(`[SisPesCFT] Injetando ${novosOficiais.length} novos afastamentos oficiais do seed na base v${DB_VERSION}...`);
            parsed.afastamentos = [...(parsed.afastamentos ?? []), ...novosOficiais];
            this.write(parsed);
          }
          this.cache = parsed;
          return parsed;
        }
        // Migração segura para DB_VERSION = 4: mescla pelo NIP e preserva afastamentos criados em testes
        console.info(`[SisPesCFT] Migrando base local da versão ${parsed.version} para ${DB_VERSION} (preservando dados pelo NIP e missões)...`);
        const migrado = migrarDatabase(parsed, criarSeed());
        this.write(migrado);
        return migrado;
      } catch {
        console.warn("[SisPesCFT] Base local corrompida; recriando base de demonstração.");
      }
    }
    const seed = criarSeed();
    this.write(seed);
    return seed;
  }

  async upsert<K extends CollectionKey>(key: K, item: CollectionItem<K>): Promise<void> {
    this.write(applyUpsert(await this.current(), key, item));
  }

  async remove(key: CollectionKey, id: string): Promise<void> {
    this.write(applyRemove(await this.current(), key, id));
  }

  async saveParametros(p: Parametros): Promise<void> {
    const db = await this.current();
    this.write({ ...db, parametros: p, updatedAt: new Date().toISOString() });
  }

  async replaceAll(db: Database): Promise<void> {
    this.write({ ...db, version: DB_VERSION, updatedAt: new Date().toISOString() });
  }

  subscribe(onChange: () => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        this.cache = null;
        onChange();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  private async current(): Promise<Database> {
    return this.cache ?? this.load();
  }

  private write(db: Database): void {
    this.cache = db;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}
