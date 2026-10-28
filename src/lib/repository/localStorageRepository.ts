import { criarSeed, DB_VERSION } from "../seed";
import type { CollectionItem, CollectionKey, Database, Parametros } from "../types";
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
          this.cache = parsed;
          return parsed;
        }
        // Migração segura para DB_VERSION = 3: mescla pelo NIP e preserva afastamentos criados em testes
        console.info(`[SisPesCFT] Migrando base local da versão ${parsed.version} para ${DB_VERSION} (preservando dados pelo NIP)...`);
        const seed = criarSeed();
        const oldByNip = new Map((parsed.militares ?? []).map((m) => [m.nip, m]));
        const nipToNewId = new Map(seed.militares.map((m) => [m.nip, m.id]));
        const oldIdToNewId = new Map<string, string>();

        for (const oldM of parsed.militares ?? []) {
          const newId = nipToNewId.get(oldM.nip);
          if (newId) oldIdToNewId.set(oldM.id, newId);
        }

        const militaresMesclados = seed.militares.map((novoM) => {
          const antigo = oldByNip.get(novoM.nip);
          if (!antigo) return novoM;
          return {
            ...novoM,
            // Preserva restrições customizadas adicionadas pelo usuário se houver
            restricoes: antigo.restricoes?.length ? antigo.restricoes : novoM.restricoes,
            pontosEscala: antigo.pontosEscala ?? novoM.pontosEscala,
          };
        });

        // Preserva afastamentos customizados criados pelo usuário (IDs fora do seed padrão 'a001'..'a020')
        const afastamentosCustomizados = (parsed.afastamentos ?? [])
          .filter((a) => !/^a0\d\d$/.test(a.id))
          .map((a) => ({
            ...a,
            militarIds: a.militarIds.map((id) => oldIdToNewId.get(id) ?? id),
          }));

        const migrado: Database = {
          ...seed,
          militares: militaresMesclados,
          afastamentos: [...seed.afastamentos, ...afastamentosCustomizados],
          trocasServico: parsed.trocasServico?.length ? parsed.trocasServico : seed.trocasServico,
          updatedAt: new Date().toISOString(),
        };
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
