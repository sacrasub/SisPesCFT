import type { CollectionItem, CollectionKey, Database, Parametros } from "../types";

/**
 * Contrato de persistência. A UI depende apenas desta interface,
 * permitindo trocar LocalStorage por Supabase/Firebase sem alterar componentes.
 */
export interface DataRepository {
  readonly backend: "local" | "supabase";
  load(): Promise<Database>;
  upsert<K extends CollectionKey>(key: K, item: CollectionItem<K>): Promise<void>;
  remove(key: CollectionKey, id: string): Promise<void>;
  saveParametros(p: Parametros): Promise<void>;
  /** Substitui toda a base (importação de backup / restauração de demonstração). */
  replaceAll(db: Database): Promise<void>;
  /** Notifica alterações externas (outra aba, outro usuário). Retorna função de cancelamento. */
  subscribe(onChange: () => void): () => void;
}

export const COLLECTIONS: CollectionKey[] = [
  "militares",
  "afastamentos",
  "escalas",
  "eventos",
  "trocasServico",
];

/** Aplica um upsert de forma imutável (usado pela UI para atualização otimista). */
export function applyUpsert<K extends CollectionKey>(db: Database, key: K, item: CollectionItem<K>): Database {
  const lista = (db[key] ?? []) as CollectionItem<K>[];
  const idx = lista.findIndex((x) => x.id === item.id);
  const nova = idx >= 0 ? lista.map((x, i) => (i === idx ? item : x)) : [...lista, item];
  return { ...db, [key]: nova, updatedAt: new Date().toISOString() };
}

export function applyRemove(db: Database, key: CollectionKey, id: string): Database {
  const lista = (db[key] ?? []) as Array<{ id: string }>;
  return { ...db, [key]: lista.filter((x) => x.id !== id), updatedAt: new Date().toISOString() };
}
