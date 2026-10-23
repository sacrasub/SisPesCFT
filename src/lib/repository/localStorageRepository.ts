import { criarSeed, DB_VERSION } from "../seed";
import type { CollectionItem, CollectionKey, Database, Parametros } from "../types";
import { applyRemove, applyUpsert, type DataRepository } from "./types";

const STORAGE_KEY = "sispescft:db:v1";

/**
 * Persistência em LocalStorage (JSON estruturado, versionado).
 * Sincroniza abas abertas no mesmo navegador via evento "storage".
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
          this.cache = parsed;
          return parsed;
        }
        // Ponto de extensão para migrações de schema futuras.
        console.warn(`[SisPesCFT] Versão de dados ${parsed.version} incompatível; recriando base de demonstração.`);
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
