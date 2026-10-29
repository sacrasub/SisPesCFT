import { criarSeed, DB_VERSION } from "../seed";
import type { Database } from "../types";

/**
 * Migração segura da base local para DB_VERSION atual (4):
 * - recarrega os 64 militares do seed (novos campos v2.1) mesclando pelo NIP;
 * - preserva restrições, histórico, perfil e saldo de pontos dos militares já existentes;
 * - recarrega todos os afastamentos oficiais do seed (inclusive as missões PREPOM/2026 em Amaturá-AM);
 * - preserva afastamentos criados pelo usuário (IDs fora do padrão do seed 'a001'..'a099'),
 *   remapeando os IDs de militares antigos para os novos via NIP (inclusive o substituto);
 * - preserva as Papeletas de Troca já cadastradas (remapeando os IDs).
 */
export function migrarDatabase(parsed: Database, seed: Database = criarSeed()): Database {
  const oldByNip = new Map((parsed.militares ?? []).map((m) => [m.nip, m]));
  const nipToNewId = new Map(seed.militares.map((m) => [m.nip, m.id]));
  const oldIdToNewId = new Map<string, string>();

  for (const oldM of parsed.militares ?? []) {
    const newId = nipToNewId.get(oldM.nip);
    if (newId) oldIdToNewId.set(oldM.id, newId);
  }
  const remap = (id: string) => oldIdToNewId.get(id) ?? id;
  const remapOpt = (id?: string) => (id ? remap(id) : id);

  const militaresMesclados = seed.militares.map((novoM) => {
    const antigo = oldByNip.get(novoM.nip);
    if (!antigo) return novoM;
    return {
      ...novoM,
      // Preserva edições e personalizações feitas pelo usuário
      restricoes: antigo.restricoes?.length ? antigo.restricoes : novoM.restricoes,
      pontosEscala: antigo.pontosEscala ?? novoM.pontosEscala,
      historico: antigo.historico?.length ? antigo.historico : novoM.historico,
      roleAcesso: antigo.roleAcesso ?? novoM.roleAcesso,
      telefoneContato: antigo.telefoneContato ?? novoM.telefoneContato,
      emailPessoal: antigo.emailPessoal ?? novoM.emailPessoal,
      emailFuncional: antigo.emailFuncional ?? novoM.emailFuncional,
    };
  });

  const afastamentosCustomizados = (parsed.afastamentos ?? [])
    .filter((a) => !/^a0\d\d$/.test(a.id))
    .map((a) => ({
      ...a,
      militarIds: a.militarIds.map(remap),
      militarSubstitutoId: remapOpt(a.militarSubstitutoId),
    }));

  const trocasAntigas = (parsed.trocasServico ?? []).map((t) => ({
    ...t,
    militarSolicitanteId: remap(t.militarSolicitanteId),
    militarSubstitutoId: remap(t.militarSubstitutoId),
  }));

  return {
    ...seed,
    version: DB_VERSION,
    militares: militaresMesclados,
    afastamentos: [...seed.afastamentos, ...afastamentosCustomizados],
    parametros: { ...seed.parametros, ...(parsed.parametros ?? {}) },
    trocasServico: trocasAntigas.length ? trocasAntigas : seed.trocasServico,
    updatedAt: new Date().toISOString(),
  };
}

