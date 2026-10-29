import type { SupabaseClient } from "@supabase/supabase-js";
import { criarSeed, DB_VERSION } from "../seed";
import type {
  Afastamento,
  CollectionItem,
  CollectionKey,
  Database,
  Militar,
  Parametros,
} from "../types";
import type { DataRepository } from "./types";
import {
  linhaParaMilitar,
  militarParaLinha,
  type MilitarSupabaseRow,
} from "./militaresMapper";
import {
  missoesParaAfastamentos,
  type MissaoMilitarSupabaseRow,
  type MissaoSupabaseRow,
} from "./missoesMapper";

/**
 * Persistência multiusuário unificada via Supabase (PostgreSQL + Realtime).
 *
 * Arquitetura de Banco Único CFT:
 * - `militares`: Cadastro mestre do efetivo compartilhado com o Sistema Itinerante (chave natural NIP).
 * - `missoes` e `missao_militares`: Missões do EPM/STA geradas no Itinerante e refletidas como afastamentos no SisPes.
 * - `sispes_*`: Coleções exclusivas do SisPesCFT (afastamentos locais, escalas, eventos, trocas e parâmetros).
 */
const TABELAS_SISPES = {
  afastamentos: "sispes_afastamentos",
  escalas: "sispes_escalas",
  eventos: "sispes_eventos",
  trocasServico: "sispes_trocas_servico",
} as const;

const TABELA_PARAMETROS = "sispes_parametros";
const TABELA_MILITARES = "militares";
const TABELA_MISSOES = "missoes";
const TABELA_MISSAO_MILITARES = "missao_militares";

export class SupabaseRepository implements DataRepository {
  readonly backend = "supabase" as const;

  constructor(private client: SupabaseClient) {}

  async load(): Promise<Database> {
    // 1. Carrega o efetivo mestre compartilhado
    const resMilitares = await this.client
      .from(TABELA_MILITARES)
      .select("*")
      .is("excluido_em", null);

    if (resMilitares.error) {
      const err = resMilitares.error;
      if (
        err.message.includes("does not exist") ||
        err.code === "42P01" ||
        err.message.includes("relation") ||
        err.message.includes("sispes_")
      ) {
        throw new Error(
          `As tabelas do SisPesCFT ainda não foram criadas no Supabase. Execute o script 'supabase/migrations/001_banco_unico_cft.sql' no SQL Editor.`
        );
      }
      throw new Error(`Supabase (militares): ${err.message}`);
    }

    // 2. Carrega as coleções exclusivas do SisPesCFT
    const chavesSispes = Object.keys(TABELAS_SISPES) as (keyof typeof TABELAS_SISPES)[];
    const resultsSispes = await Promise.all(
      chavesSispes.map((c) => this.client.from(TABELAS_SISPES[c]).select("data")),
    );

    const erroSispes = resultsSispes.find((r) => r.error)?.error;
    if (erroSispes) {
      if (
        erroSispes.message.includes("does not exist") ||
        erroSispes.code === "42P01" ||
        erroSispes.message.includes("relation")
      ) {
        throw new Error(
          `Tabelas 'sispes_*' pendentes no Supabase. Execute 'supabase/migrations/001_banco_unico_cft.sql' no SQL Editor.`
        );
      }
      throw new Error(`Supabase: ${erroSispes.message}`);
    }

    // 3. Carrega parâmetros
    const resParams = await this.client
      .from(TABELA_PARAMETROS)
      .select("data")
      .eq("id", "default")
      .maybeSingle();

    if (
      resParams.error &&
      (resParams.error.code === "42P01" || resParams.error.message.includes("does not exist"))
    ) {
      throw new Error(
        `Tabela 'sispes_parametros' pendente no Supabase. Execute 'supabase/migrations/001_banco_unico_cft.sql'.`
      );
    }

    // 4. Carrega missões operacionais do Sistema Itinerante (tolerante a falha)
    let missoesRows: MissaoSupabaseRow[] = [];
    let missaoMilitaresRows: MissaoMilitarSupabaseRow[] = [];
    try {
      const [resMis, resMmils] = await Promise.all([
        this.client.from(TABELA_MISSOES).select("*").neq("status", "CANCELADA"),
        this.client.from(TABELA_MISSAO_MILITARES).select("*"),
      ]);
      if (!resMis.error && Array.isArray(resMis.data)) {
        missoesRows = resMis.data as MissaoSupabaseRow[];
      }
      if (!resMmils.error && Array.isArray(resMmils.data)) {
        missaoMilitaresRows = resMmils.data as MissaoMilitarSupabaseRow[];
      }
    } catch (e) {
      console.warn("[SisPesCFT] Aviso ao ler missões do Itinerante:", e);
    }

    // Converte militares relacionais para o modelo interno
    const militaresDb: Militar[] = ((resMilitares.data ?? []) as MilitarSupabaseRow[]).map(
      linhaParaMilitar,
    );

    // Converte as coleções JSONB do SisPesCFT
    const [afastamentosData, escalasData, eventosData, trocasServicoData] = resultsSispes.map(
      (r) => (r.data ?? []).map((row) => row.data),
    );

    const afastamentosProprios = (afastamentosData ?? []) as Afastamento[];
    const escalas = (escalasData ?? []) as Database["escalas"];
    const eventos = (eventosData ?? []) as Database["eventos"];
    const trocasServico = (trocasServicoData ?? []) as Database["trocasServico"];

    // Carga inicial se o banco estiver vazio
    if (!militaresDb.length && !escalas.length) {
      const seed = criarSeed();
      await this.replaceAll(seed);
      return seed;
    }

    // Mescla missões operacionais do Itinerante como afastamentos virtuais
    const afastamentosItinerante = missoesParaAfastamentos(
      missoesRows,
      missaoMilitaresRows,
      militaresDb,
    );

    // Evita duplicatas se algum afastamento com mesmo id já estiver salvo
    const idsExistentes = new Set(afastamentosProprios.map((a) => a.id));
    const afastamentosCompletos = [
      ...afastamentosProprios,
      ...afastamentosItinerante.filter((a) => !idsExistentes.has(a.id)),
    ];

    return {
      version: DB_VERSION,
      militares: militaresDb,
      afastamentos: afastamentosCompletos,
      escalas: escalas ?? [],
      eventos: eventos ?? [],
      trocasServico: trocasServico ?? [],
      parametros: (resParams.data?.data as Parametros) ?? criarSeed().parametros,
      updatedAt: new Date().toISOString(),
    };
  }

  async upsert<K extends CollectionKey>(key: K, item: CollectionItem<K>): Promise<void> {
    if (key === "militares") {
      const m = item as unknown as Militar;
      const linha = militarParaLinha(m);
      const { error } = await this.client
        .from(TABELA_MILITARES)
        .upsert(linha, { onConflict: "nip" });
      if (error) throw new Error(`Falha ao salvar militar: ${error.message}`);
      return;
    }

    if (key === "afastamentos") {
      const af = item as unknown as Afastamento;
      if (af.somenteLeitura || af.origem === "ITINERANTE" || af.id.startsWith("itn:")) {
        throw new Error(
          "Este lançamento de missão pertence ao Sistema da Capitania Itinerante e deve ser editado por lá."
        );
      }
      const { error } = await this.client
        .from(TABELAS_SISPES.afastamentos)
        .upsert({ id: af.id, data: af, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return;
    }

    const tabela = TABELAS_SISPES[key as keyof typeof TABELAS_SISPES];
    if (tabela) {
      const { error } = await this.client
        .from(tabela)
        .upsert({ id: item.id, data: item, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    }
  }

  async remove(key: CollectionKey, id: string): Promise<void> {
    if (key === "militares") {
      // Exclusão lógica no cadastro mestre para preservar integridade histórica no Itinerante
      const { error } = await this.client
        .from(TABELA_MILITARES)
        .update({
          excluido_em: new Date().toISOString(),
          ativo: 0,
        })
        .or(`sispes_id.eq.${id},nip.eq.${id}`);
      if (error) throw new Error(`Falha ao remover militar: ${error.message}`);
      return;
    }

    if (key === "afastamentos") {
      if (id.startsWith("itn:")) {
        throw new Error(
          "Missões do Sistema Itinerante devem ser canceladas no próprio sistema de origem."
        );
      }
      const { error } = await this.client
        .from(TABELAS_SISPES.afastamentos)
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }

    const tabela = TABELAS_SISPES[key as keyof typeof TABELAS_SISPES];
    if (tabela) {
      const { error } = await this.client.from(tabela).delete().eq("id", id);
      if (error) throw new Error(error.message);
    }
  }

  async saveParametros(p: Parametros): Promise<void> {
    const { error } = await this.client
      .from(TABELA_PARAMETROS)
      .upsert({ id: "default", data: p, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  async replaceAll(db: Database): Promise<void> {
    const now = new Date().toISOString();

    // 1. Militares: Upsert de cada militar por NIP (sem drop da tabela compartilhada!)
    for (const m of db.militares ?? []) {
      const linha = militarParaLinha(m);
      const { error } = await this.client
        .from(TABELA_MILITARES)
        .upsert(linha, { onConflict: "nip" });
      if (error) {
        console.warn(`[SisPesCFT] Upsert militar ${m.nip}:`, error.message);
      }
    }

    // 2. Coleções exclusivas SisPesCFT: limpa e reescreve
    const chavesSispes = Object.keys(TABELAS_SISPES) as (keyof typeof TABELAS_SISPES)[];
    for (const c of chavesSispes) {
      const tabela = TABELAS_SISPES[c];
      const del = await this.client.from(tabela).delete().neq("id", "");
      if (del.error) throw new Error(del.error.message);

      let items = (db[c] ?? []) as Array<{ id: string }>;
      // Afastamentos virtuais de missões externas não devem ser persistidos em sispes_afastamentos
      if (c === "afastamentos") {
        items = (items as Afastamento[]).filter((a) => !a.id.startsWith("itn:"));
      }

      const rows = items.map((item) => ({ id: item.id, data: item, updated_at: now }));
      if (rows.length) {
        const ins = await this.client.from(tabela).insert(rows);
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

    const channel = this.client.channel("sispescft-db-sync");

    // Escuta alterações no cadastro de militares
    channel.on("postgres_changes", { event: "*", schema: "public", table: TABELA_MILITARES }, debounced);

    // Escuta alterações nas missões operacionais do Sistema Itinerante
    channel.on("postgres_changes", { event: "*", schema: "public", table: TABELA_MISSOES }, debounced);
    channel.on("postgres_changes", { event: "*", schema: "public", table: TABELA_MISSAO_MILITARES }, debounced);

    // Escuta alterações nas tabelas exclusivas do SisPesCFT
    for (const t of [...Object.values(TABELAS_SISPES), TABELA_PARAMETROS]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, debounced);
    }

    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void this.client.removeChannel(channel);
    };
  }
}
