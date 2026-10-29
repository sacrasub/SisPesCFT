import type {
  Militar,
  Posto,
  DivisaoId,
  SetorCodigo,
  SituacaoMilitar,
  EscalaTipo,
  QualificacaoPostoServico,
  SaldoPontosEscala,
  Restricao,
  AreaInstrutoriaEpm,
  MotivoDispensaEscala,
  RegistroHistoricoMilitar,
} from "../types";

export interface MilitarSupabaseRow {
  id?: number;
  nip: string;
  posto_grad: string;
  especialidade?: string | null;
  nome_completo: string;
  nome_guerra: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  grupo?: string | null;
  area?: string | null;
  funcao?: string | null;
  ativo?: number | null;
  criado_em?: string;
  atualizado_em?: string;
  // Colunas estendidas para integração SisPesCFT
  sispes_id?: string | null;
  divisao?: string | null;
  setor_codigo?: string | null;
  antiguidade?: number | null;
  situacao?: string | null;
  email_funcional?: string | null;
  email_pessoal?: string | null;
  sispes_dados?: Record<string, unknown> | null;
  excluido_em?: string | null;
}

const POSTOS_VALIDOS: Set<string> = new Set([
  "CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "SC"
]);

/**
 * Normaliza variações de posto/graduação usadas em diferentes sistemas da Marinha:
 * Ex.: "3ºSG", "3°SG", "SO-CI", "1SG-MR", "2SG-MO", "CT(IM)" -> retorna Posto oficial do SisPesCFT.
 */
export function normalizarPosto(bruto: string | undefined | null): Posto {
  if (!bruto) return "MN";
  const limpo = bruto.trim().toUpperCase().replace(/[º°]/g, "");

  if (POSTOS_VALIDOS.has(limpo)) {
    return limpo as Posto;
  }

  // Prefixos comuns: "SO-CI" -> "SO", "1SG-MR" -> "1SG", "3SG-ES" -> "3SG"
  const partes = limpo.split(/[-/\s(]/);
  const prefixo = partes[0];
  if (POSTOS_VALIDOS.has(prefixo)) {
    return prefixo as Posto;
  }

  if (limpo.startsWith("3SG") || limpo.includes("TERCEIRO")) return "3SG";
  if (limpo.startsWith("2SG") || limpo.includes("SEGUNDO")) return "2SG";
  if (limpo.startsWith("1SG") || limpo.includes("PRIMEIRO")) return "1SG";
  if (limpo.startsWith("SO") || limpo.includes("SUBOFICIAL")) return "SO";
  if (limpo.startsWith("CB") || limpo.includes("CABO")) return "CB";
  if (limpo.startsWith("MN") || limpo.includes("MARINHEIRO")) return "MN";
  if (limpo.startsWith("CF") || limpo.includes("FRAGATA")) return "CF";
  if (limpo.startsWith("CC") || limpo.includes("CORVETA")) return "CC";
  if (limpo.startsWith("CT") || limpo.includes("TENENTE")) return "CT";
  if (limpo.startsWith("1T")) return "1T";
  if (limpo.startsWith("2T")) return "2T";
  if (limpo.startsWith("CMG")) return "CMG";

  return "MN";
}

/**
 * Converte um objeto Militar do SisPesCFT para uma linha de upsert no Supabase
 * compatível tanto com o Sistema Itinerante quanto com o SisPesCFT.
 */
export function militarParaLinha(m: Militar): MilitarSupabaseRow {
  const agora = new Date().toISOString();
  const sispesDados: Record<string, unknown> = {
    escalas: m.escalas ?? [],
    membroConselho: !!m.membroConselho,
    restricoes: m.restricoes ?? [],
    funcaoPrincipal: m.funcaoPrincipal ?? m.funcao ?? "",
    setorSecundario: m.setorSecundario,
    incumbencias: m.incumbencias ?? [],
    instrutorEpm: !!m.instrutorEpm,
    areasInstrutoria: m.areasInstrutoria ?? [],
    qualificacoesServico: m.qualificacoesServico ?? [],
    dispensaEscala: m.dispensaEscala ?? "NENHUMA",
    restricaoMedicaArmadoOuEmPe: !!m.restricaoMedicaArmadoOuEmPe,
    pontosEscala: m.pontosEscala ?? { normal: 0, domingoFeriado: 0, retem: 0, totalPonderado: 0 },
    roleAcesso: m.roleAcesso,
    historico: m.historico ?? [],
  };

  return {
    nip: m.nip,
    posto_grad: m.posto,
    especialidade: m.especialidade ?? "",
    nome_completo: m.nomeCompleto,
    nome_guerra: m.nomeGuerra,
    telefone: m.telefoneContato ?? null,
    email: m.emailFuncional ?? m.emailPessoal ?? null,
    funcao: m.funcao ?? m.funcaoPrincipal ?? null,
    ativo: m.ativo ? 1 : 0,
    atualizado_em: agora,
    // Colunas de integração SisPesCFT
    sispes_id: m.id,
    divisao: m.divisao ?? "PESSOAL",
    setor_codigo: m.setorCodigo ?? null,
    antiguidade: m.antiguidadeOrdem ?? null,
    situacao: m.situacao ?? (m.ativo ? "PRONTO" : "INATIVO"),
    email_funcional: m.emailFuncional ?? null,
    email_pessoal: m.emailPessoal ?? null,
    sispes_dados: sispesDados,
    excluido_em: m.ativo ? null : undefined,
  };
}

/**
 * Converte uma linha lida da tabela `public.militares` do Supabase para o modelo Militar do SisPesCFT.
 */
export function linhaParaMilitar(r: MilitarSupabaseRow): Militar {
  const dados = (r.sispes_dados ?? {}) as Record<string, unknown>;
  const agora = new Date().toISOString();

  const id = r.sispes_id || `m_${r.nip.replace(/\D/g, "")}`;
  const posto = normalizarPosto(r.posto_grad);

  return {
    id,
    nip: r.nip,
    posto,
    nomeGuerra: (r.nome_guerra ?? "").toUpperCase(),
    nomeCompleto: r.nome_completo ?? "",
    especialidade: r.especialidade ?? undefined,
    funcao: r.funcao ?? (dados.funcaoPrincipal as string) ?? undefined,
    divisao: (r.divisao as DivisaoId) ?? "PESSOAL",
    escalas: (dados.escalas as EscalaTipo[]) ?? [],
    membroConselho: Boolean(dados.membroConselho),
    restricoes: (dados.restricoes as Restricao[]) ?? [],
    ativo: r.ativo !== 0 && !r.excluido_em,
    createdAt: r.criado_em ?? agora,
    updatedAt: r.atualizado_em ?? agora,
    antiguidadeOrdem: r.antiguidade ?? undefined,
    setorCodigo: (r.setor_codigo as SetorCodigo) ?? undefined,
    setorSecundario: (dados.setorSecundario as SetorCodigo) ?? undefined,
    funcaoPrincipal: (dados.funcaoPrincipal as string) ?? r.funcao ?? undefined,
    incumbencias: (dados.incumbencias as string[]) ?? [],
    instrutorEpm: Boolean(dados.instrutorEpm),
    areasInstrutoria: (dados.areasInstrutoria as AreaInstrutoriaEpm[]) ?? [],
    qualificacoesServico: (dados.qualificacoesServico as QualificacaoPostoServico[]) ?? [],
    dispensaEscala: (dados.dispensaEscala as MotivoDispensaEscala) ?? "NENHUMA",
    restricaoMedicaArmadoOuEmPe: Boolean(dados.restricaoMedicaArmadoOuEmPe),
    pontosEscala: (dados.pontosEscala as SaldoPontosEscala) ?? {
      normal: 0,
      domingoFeriado: 0,
      retem: 0,
      totalPonderado: 0,
    },
    situacao: (r.situacao as SituacaoMilitar) ?? "PRONTO",
    emailFuncional: r.email_funcional ?? r.email ?? undefined,
    emailPessoal: r.email_pessoal ?? undefined,
    telefoneContato: r.telefone ?? undefined,
    roleAcesso: dados.roleAcesso as Militar["roleAcesso"],
    historico: (dados.historico as RegistroHistoricoMilitar[]) ?? [],
  };
}
