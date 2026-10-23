"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { hojeISO } from "@/lib/dates";
import { criarContexto, type Contexto } from "@/lib/engine/disponibilidade";
import { applyRemove, applyUpsert, createRepository, type DataRepository } from "@/lib/repository";
import { criarSeed } from "@/lib/seed";
import type { CollectionItem, CollectionKey, Database, Parametros } from "@/lib/types";

interface DataState {
  db: Database | null;
  ctx: Contexto | null;
  carregando: boolean;
  erro: string | null;
  backend: DataRepository["backend"] | null;
  hoje: string;
  salvar: <K extends CollectionKey>(key: K, item: CollectionItem<K>) => Promise<void>;
  remover: (key: CollectionKey, id: string) => Promise<void>;
  salvarParametros: (p: Parametros) => Promise<void>;
  substituirTudo: (db: Database) => Promise<void>;
  restaurarDemo: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<DataRepository | null>(null);
  const [db, setDb] = useState<Database | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [hoje, setHoje] = useState(() => hojeISO());

  const recarregar = useCallback(async () => {
    if (!repoRef.current) return;
    try {
      setDb(await repoRef.current.load());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let ativo = true;
    (async () => {
      try {
        const repo = await createRepository();
        if (!ativo) return;
        repoRef.current = repo;
        setDb(await repo.load());
        unsub = repo.subscribe(() => void recarregar());
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    // Atualiza "hoje" na virada do dia (sistemas que ficam abertos no Quarto de Hora / CIC).
    const timer = setInterval(() => setHoje(hojeISO()), 60_000);
    return () => {
      ativo = false;
      unsub?.();
      clearInterval(timer);
    };
  }, [recarregar]);

  /** Atualização otimista + persistência; em caso de falha, recarrega a base real. */
  const executar = useCallback(
    async (otimista: (d: Database) => Database, persistir: (r: DataRepository) => Promise<void>) => {
      const repo = repoRef.current;
      if (!repo) throw new Error("Repositório não inicializado");
      setDb((prev) => (prev ? otimista(prev) : prev));
      try {
        await persistir(repo);
      } catch (e) {
        await recarregar();
        throw e;
      }
    },
    [recarregar],
  );

  const salvar = useCallback(
    <K extends CollectionKey>(key: K, item: CollectionItem<K>) =>
      executar((d) => applyUpsert(d, key, item), (r) => r.upsert(key, item)),
    [executar],
  );

  const remover = useCallback(
    (key: CollectionKey, id: string) => executar((d) => applyRemove(d, key, id), (r) => r.remove(key, id)),
    [executar],
  );

  const salvarParametros = useCallback(
    (p: Parametros) => executar((d) => ({ ...d, parametros: p }), (r) => r.saveParametros(p)),
    [executar],
  );

  const substituirTudo = useCallback(
    (novo: Database) => executar(() => novo, (r) => r.replaceAll(novo)),
    [executar],
  );

  const restaurarDemo = useCallback(() => substituirTudo(criarSeed()), [substituirTudo]);

  const ctx = useMemo(() => (db ? criarContexto(db) : null), [db]);

  const value = useMemo<DataState>(
    () => ({
      db,
      ctx,
      carregando,
      erro,
      backend: repoRef.current?.backend ?? null,
      hoje,
      salvar,
      remover,
      salvarParametros,
      substituirTudo,
      restaurarDemo,
    }),
    [db, ctx, carregando, erro, hoje, salvar, remover, salvarParametros, substituirTudo, restaurarDemo],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const c = useContext(DataContext);
  if (!c) throw new Error("useData deve ser usado dentro de <DataProvider>");
  return c;
}

/** Versão para telas internas: garante base carregada (o AppShell só renderiza após o carregamento). */
export function useDb() {
  const d = useData();
  if (!d.db || !d.ctx) throw new Error("Base de dados ainda não carregada");
  return { ...d, db: d.db, ctx: d.ctx };
}
