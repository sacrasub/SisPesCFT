"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { hojeISO } from "@/lib/dates";
import { criarContexto, type Contexto } from "@/lib/engine/disponibilidade";
import {
  applyRemove,
  applyUpsert,
  createRepository,
  salvarConfiguracaoBackend,
  type DataRepository,
} from "@/lib/repository";
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
  recarregar: () => Promise<void>;
  conectarSupabase: (
    url: string,
    key: string,
    migrarDadosLocais?: boolean,
  ) => Promise<{ ok: boolean; mensagem: string }>;
  desconectarSupabase: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<DataRepository | null>(null);
  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const [db, setDb] = useState<Database | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [backendAtivo, setBackendAtivo] = useState<DataRepository["backend"]>("local");
  const [hoje, setHoje] = useState(() => hojeISO());

  const recarregar = useCallback(async () => {
    if (!repoRef.current) return;
    try {
      const carregado = await repoRef.current.load();
      setDb(carregado);
      setBackendAtivo(repoRef.current.backend);
      setErro(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[SisPesCFT] Falha ao recarregar repositório:", msg);
      setErro(msg);
    }
  }, []);

  const inicializarRepo = useCallback(async (customRepo?: DataRepository) => {
    unsubRef.current?.();
    setCarregando(true);
    try {
      const repo = customRepo ?? (await createRepository());
      repoRef.current = repo;
      setBackendAtivo(repo.backend);
      const loaded = await repo.load();
      setDb(loaded);
      unsubRef.current = repo.subscribe(() => void recarregar());
      setErro(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[SisPesCFT] Falha ao carregar repositório principal:", msg);

      // Resiliência Militar: Fallback automático transparente para LocalStorage
      // Garante prontidão operacional ininterrupta mesmo se as tabelas na nuvem não existirem ou houver falha de rede.
      try {
        const { LocalStorageRepository } = await import("@/lib/repository/localStorageRepository");
        const fallbackRepo = new LocalStorageRepository();
        repoRef.current = fallbackRepo;
        setBackendAtivo("local");
        const localDb = await fallbackRepo.load();
        setDb(localDb);
        unsubRef.current = fallbackRepo.subscribe(() => void recarregar());

        if (
          msg.includes("relation") ||
          msg.includes("does not exist") ||
          msg.includes("42P01") ||
          msg.includes("militares")
        ) {
          setErro(
            "Supabase conectado, mas as tabelas ainda não foram criadas no banco. O SisPesCFT ativou o Modo Local para garantir a continuidade operacional. Execute o script 'supabase/schema.sql' no Supabase para ativar a nuvem."
          );
        } else {
          setErro(`Aviso Supabase: ${msg}. O SisPesCFT ativou o Modo Local para garantir a continuidade.`);
        }
      } catch (fallbackErr) {
        console.error("[SisPesCFT] Fallback local falhou, carregando seed em memória:", fallbackErr);
        const seed = criarSeed();
        setDb(seed);
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  }, [recarregar]);

  useEffect(() => {
    let ativo = true;
    void inicializarRepo();
    // Atualiza "hoje" na virada do dia (sistemas que ficam abertos no Quarto de Hora / CIC).
    const timer = setInterval(() => setHoje(hojeISO()), 60_000);
    return () => {
      ativo = false;
      unsubRef.current?.();
      clearInterval(timer);
    };
  }, [inicializarRepo]);

  const conectarSupabase = useCallback(
    async (url: string, key: string, migrarDadosLocais = false) => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const { SupabaseRepository } = await import("@/lib/repository/supabaseRepository");
        const client = createClient(url, key);
        const repo = new SupabaseRepository(client);

        if (migrarDadosLocais && db) {
          await repo.replaceAll(db);
        }

        salvarConfiguracaoBackend("supabase", url, key);
        await inicializarRepo(repo);
        return { ok: true, mensagem: "Conectado ao Supabase com sucesso! Sincronização em tempo real ativa." };
      } catch (err) {
        return { ok: false, mensagem: (err as Error).message };
      }
    },
    [db, inicializarRepo],
  );

  const desconectarSupabase = useCallback(async () => {
    salvarConfiguracaoBackend("local");
    await inicializarRepo();
  }, [inicializarRepo]);

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
      backend: backendAtivo,
      hoje,
      salvar,
      remover,
      salvarParametros,
      substituirTudo,
      restaurarDemo,
      recarregar,
      conectarSupabase,
      desconectarSupabase,
    }),
    [
      db,
      ctx,
      carregando,
      erro,
      backendAtivo,
      hoje,
      salvar,
      remover,
      salvarParametros,
      substituirTudo,
      restaurarDemo,
      recarregar,
      conectarSupabase,
      desconectarSupabase,
    ],
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
  if (!d.db || !d.ctx) {
    const fallbackSeed = criarSeed();
    const fallbackCtx = criarContexto(fallbackSeed);
    return { ...d, db: d.db ?? fallbackSeed, ctx: d.ctx ?? fallbackCtx };
  }
  return { ...d, db: d.db, ctx: d.ctx };
}
