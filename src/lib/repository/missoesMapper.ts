import type { Afastamento, Militar } from "../types";

export interface MissaoSupabaseRow {
  id: string; // uuid
  codigo: string;
  nome: string;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  origem: string;
  itinerario?: string[] | null;
  status: "PLANEJADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" | string;
  created_at?: string;
}

export interface MissaoMilitarSupabaseRow {
  id: string; // uuid
  missao_id: string; // uuid fk
  nip: string;
  posto_graduacao?: string;
  nome_guerra?: string;
  funcao_comissao?: string;
  uniforme_requerido?: string;
  created_at?: string;
}

/**
 * Converte as missões e equipes operacionais registradas no Sistema Itinerante (EPM & STA)
 * em Afastamentos virtuais de missão no SisPesCFT.
 *
 * Características:
 * - impactaEscala: true -> bloqueia os militares nas escalas durante o período da missão.
 * - somenteLeitura: true -> protege a missão contra edição acidental dentro do SisPesCFT.
 * - status: "CONFIRMADO" (se em andamento/concluída) ou "PREVISTO" (se planejada).
 * - Missões canceladas são desconsideradas.
 */
export function missoesParaAfastamentos(
  missoes: MissaoSupabaseRow[],
  equipe: MissaoMilitarSupabaseRow[],
  militares: Militar[],
): Afastamento[] {
  if (!missoes || !missoes.length) return [];

  // Indexa militares por NIP para vinculação rápida
  const militaresPorNip = new Map<string, Militar>();
  for (const m of militares) {
    if (m.nip) {
      militaresPorNip.set(m.nip, m);
      // Suporta também busca por NIP sem pontuação
      const limpo = m.nip.replace(/\D/g, "");
      if (limpo) militaresPorNip.set(limpo, m);
    }
  }

  // Agrupa os militares por ID de missão
  const equipePorMissao = new Map<string, MissaoMilitarSupabaseRow[]>();
  for (const membro of equipe ?? []) {
    const lista = equipePorMissao.get(membro.missao_id) ?? [];
    lista.push(membro);
    equipePorMissao.set(membro.missao_id, lista);
  }

  const afastamentos: Afastamento[] = [];

  for (const missao of missoes) {
    if (missao.status === "CANCELADA") continue;

    const membros = equipePorMissao.get(missao.id) ?? [];
    const militarIds: string[] = [];

    for (const membro of membros) {
      const nip = membro.nip;
      const nipLimpo = nip ? nip.replace(/\D/g, "") : "";
      const mil = militaresPorNip.get(nip) ?? militaresPorNip.get(nipLimpo);
      if (mil) {
        if (!militarIds.includes(mil.id)) {
          militarIds.push(mil.id);
        }
      }
    }

    // Se nenhum militar da missão estiver cadastrado no efetivo, ignora (ex: dados demo com NIPs inexistentes)
    if (militarIds.length === 0) continue;

    const statusAfastamento =
      missao.status === "EM_ANDAMENTO" || missao.status === "CONCLUIDA"
        ? "CONFIRMADO"
        : "PREVISTO";

    const itinerarioTexto = Array.isArray(missao.itinerario) && missao.itinerario.length > 0
      ? ` • Itinerário: ${missao.itinerario.join(" → ")}`
      : "";

    const agora = new Date().toISOString();

    afastamentos.push({
      id: `itn:${missao.id}`,
      categoria: "MISSAO",
      subtipo: "ITINERANCIA_STA_EPM",
      titulo: `${missao.nome} (${missao.codigo})`,
      local: `${missao.origem || "CFT"}${itinerarioTexto}`,
      inicio: missao.data_inicio,
      fim: missao.data_fim,
      militarIds,
      divisao: "OPERACOES",
      status: statusAfastamento,
      impactaEscala: true,
      observacoes: `Comissão originada no Sistema da Capitania Itinerante (${missao.codigo}).`,
      criadoPor: "Capitania Itinerante (Supabase)",
      createdAt: missao.created_at || agora,
      updatedAt: missao.created_at || agora,
      origem: "ITINERANTE",
      somenteLeitura: true,
      codigoMissaoExterna: missao.codigo,
    });
  }

  return afastamentos;
}
