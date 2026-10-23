import type {
  AfastamentoCategoria,
  AfastamentoStatus,
  DivisaoId,
  EscalaTipo,
  Posto,
  RestricaoTipo,
  StatusCobertura,
  StatusPresenca,
  Usuario,
} from "./types";

/* ------------------------------------------------------------------ */
/* Divisões / Seções                                                   */
/* ------------------------------------------------------------------ */

export interface DivisaoInfo {
  id: DivisaoId;
  sigla: string;
  nome: string;
  /** Cor de identificação (hex) usada em gráficos e chips. */
  cor: string;
}

export const DIVISOES: DivisaoInfo[] = [
  { id: "COMANDO", sigla: "CMD", nome: "Comando / Gabinete", cor: "#e2b13c" },
  { id: "PESSOAL", sigla: "PES", nome: "Setor de Pessoal", cor: "#60a5fa" },
  { id: "EPM", sigla: "Div 10", nome: "Div 10 – Ensino Profissional Marítimo", cor: "#a78bfa" },
  { id: "STA", sigla: "Div 20", nome: "Div 20 – Segurança do Tráfego Aquaviário", cor: "#22d3ee" },
  { id: "OPERACOES", sigla: "OPS", nome: "Operações", cor: "#34d399" },
  { id: "CONTRAMESTRES", sigla: "CMT", nome: "Seção de Contramestres", cor: "#f472b6" },
  { id: "MOTORISTAS", sigla: "MOT", nome: "Seção de Motoristas", cor: "#fb923c" },
  { id: "INTENDENCIA", sigla: "INT", nome: "Intendência", cor: "#94a3b8" },
];

export const DIVISAO_MAP = Object.fromEntries(DIVISOES.map((d) => [d.id, d])) as Record<
  DivisaoId,
  DivisaoInfo
>;

/* ------------------------------------------------------------------ */
/* Postos e graduações (ordem de antiguidade)                          */
/* ------------------------------------------------------------------ */

export const POSTOS: { id: Posto; nome: string }[] = [
  { id: "CMG", nome: "Capitão de Mar e Guerra" },
  { id: "CF", nome: "Capitão de Fragata" },
  { id: "CC", nome: "Capitão de Corveta" },
  { id: "CT", nome: "Capitão-Tenente" },
  { id: "1T", nome: "Primeiro-Tenente" },
  { id: "2T", nome: "Segundo-Tenente" },
  { id: "GM", nome: "Guarda-Marinha" },
  { id: "SO", nome: "Suboficial" },
  { id: "1SG", nome: "Primeiro-Sargento" },
  { id: "2SG", nome: "Segundo-Sargento" },
  { id: "3SG", nome: "Terceiro-Sargento" },
  { id: "CB", nome: "Cabo" },
  { id: "MN", nome: "Marinheiro" },
  { id: "SC", nome: "Servidor Civil" },
];

export const POSTO_ORDEM: Record<Posto, number> = Object.fromEntries(
  POSTOS.map((p, i) => [p.id, i]),
) as Record<Posto, number>;

/* ------------------------------------------------------------------ */
/* Escalas                                                             */
/* ------------------------------------------------------------------ */

export const ESCALA_LABEL: Record<EscalaTipo, string> = {
  CONTRAMESTRE: "Contramestre",
  MOTORISTA: "Motorista",
  VIGIA: "Vigia",
  INSPECAO_NAVAL: "Inspeção Naval",
};

export const ESCALA_ORDEM: EscalaTipo[] = ["CONTRAMESTRE", "MOTORISTA", "VIGIA", "INSPECAO_NAVAL"];

export const COBERTURA_META: Record<
  StatusCobertura,
  { label: string; descricao: string; cor: string; bg: string; ring: string; text: string }
> = {
  OK: {
    label: "Adequada",
    descricao: "Regime igual ou superior ao alvo",
    cor: "#34d399",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-400/40",
    text: "text-emerald-300",
  },
  ATENCAO: {
    label: "Atenção",
    descricao: "Abaixo do alvo, acima do limite de segurança",
    cor: "#fbbf24",
    bg: "bg-amber-500/15",
    ring: "ring-amber-400/40",
    text: "text-amber-300",
  },
  CRITICO: {
    label: "Crítica",
    descricao: "Abaixo do limite de segurança",
    cor: "#f87171",
    bg: "bg-red-500/15",
    ring: "ring-red-400/50",
    text: "text-red-300",
  },
  SEM_COBERTURA: {
    label: "Sem cobertura",
    descricao: "Efetivo apto insuficiente para guarnecer o serviço",
    cor: "#e879f9",
    bg: "bg-fuchsia-600/20",
    ring: "ring-fuchsia-400/60",
    text: "text-fuchsia-300",
  },
};

/* ------------------------------------------------------------------ */
/* Afastamentos                                                        */
/* ------------------------------------------------------------------ */

export const CATEGORIA_META: Record<
  AfastamentoCategoria,
  { label: string; cor: string; impactaPorPadrao: boolean }
> = {
  MISSAO: { label: "Missão", cor: "#22d3ee", impactaPorPadrao: true },
  CURSO: { label: "Curso", cor: "#a78bfa", impactaPorPadrao: true },
  INSPECAO_NAVAL: { label: "Inspeção Naval", cor: "#38bdf8", impactaPorPadrao: true },
  FERIAS: { label: "Férias", cor: "#34d399", impactaPorPadrao: true },
  LICENCA: { label: "Licença", cor: "#fb7185", impactaPorPadrao: true },
  DISPENSA: { label: "Dispensa", cor: "#fbbf24", impactaPorPadrao: true },
  OUTRO: { label: "Outro", cor: "#94a3b8", impactaPorPadrao: false },
};

export const STATUS_LANCAMENTO_META: Record<AfastamentoStatus, { label: string; cls: string }> = {
  PREVISTO: { label: "Previsto", cls: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  CONFIRMADO: { label: "Confirmado", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  CANCELADO: { label: "Cancelado", cls: "bg-slate-500/15 text-slate-400 ring-slate-400/30 line-through" },
};

export const PRESENCA_META: Record<StatusPresenca, { label: string; cor: string }> = {
  DISPONIVEL: { label: "Disponível", cor: "#34d399" },
  MISSAO: { label: "Em missão", cor: "#22d3ee" },
  CURSO: { label: "Em curso", cor: "#a78bfa" },
  INSPECAO_NAVAL: { label: "Inspeção Naval", cor: "#38bdf8" },
  FERIAS: { label: "Férias", cor: "#4ade80" },
  LICENCA: { label: "Licença", cor: "#fb7185" },
  DISPENSA: { label: "Dispensa", cor: "#fbbf24" },
  OUTRO: { label: "Outro", cor: "#94a3b8" },
};

/** Prioridade quando há afastamentos simultâneos (menor = prevalece). */
export const PRIORIDADE_CATEGORIA: AfastamentoCategoria[] = [
  "LICENCA",
  "FERIAS",
  "CURSO",
  "INSPECAO_NAVAL",
  "MISSAO",
  "DISPENSA",
  "OUTRO",
];

/** Subtipos sugeridos por divisão (o campo também aceita texto livre). */
export const SUBTIPOS_POR_DIVISAO: Partial<Record<DivisaoId, Partial<Record<AfastamentoCategoria, string[]>>>> = {
  EPM: {
    MISSAO: ["CFAQ – Instrução", "CEMAQ – Instrução", "Itinerância EPM", "Aulão", "Aplicação de Exame"],
    CURSO: ["Curso Expedito", "Curso de Aperfeiçoamento"],
  },
  STA: {
    MISSAO: ["Itinerância STA", "Patrulha Naval", "Vistoria", "Perícia / Inquérito", "Atendimento a Acidente"],
    INSPECAO_NAVAL: ["Inspeção Naval – Rio Solimões", "Inspeção Naval – Rio Javari", "Operação Integrada"],
  },
  OPERACOES: {
    MISSAO: ["Operação Ágata", "Apoio Logístico", "Transporte de Material"],
    INSPECAO_NAVAL: ["Inspeção Naval", "Operação Integrada"],
  },
  CONTRAMESTRES: {
    MISSAO: ["Condução de Lancha – Apoio STA", "Condução de Lancha – Apoio EPM", "Manutenção de Embarcação"],
  },
  MOTORISTAS: {
    MISSAO: ["Apoio de Transporte", "Viagem Administrativa"],
  },
};

export const SUBTIPOS_GERAIS: Record<AfastamentoCategoria, string[]> = {
  MISSAO: ["Missão Administrativa", "Representação"],
  CURSO: ["Curso de Carreira", "Estágio", "Capacitação EAD"],
  INSPECAO_NAVAL: ["Inspeção Naval"],
  FERIAS: ["Férias regulamentares", "Férias – 1º período", "Férias – 2º período", "Férias – 3º período"],
  LICENCA: ["Licença para Tratamento de Saúde", "Licença Paternidade", "Licença Maternidade", "Luto", "Núpcias"],
  DISPENSA: ["Dispensa médica", "Dispensa como recompensa", "Dispensa por serviço"],
  OUTRO: ["Outro"],
};

/* ------------------------------------------------------------------ */
/* Restrições                                                          */
/* ------------------------------------------------------------------ */

export const RESTRICAO_META: Record<RestricaoTipo, { label: string; descricao: string }> = {
  SEM_SRAK: { label: "Sem SRAK", descricao: "Não possui a habilitação/curso SRAK exigido" },
  SEM_ESPRAC: { label: "Sem ESPRAC", descricao: "Não possui a habilitação/curso ESPRAC exigido" },
  MEDICA: { label: "Restrição médica", descricao: "Impedimento por inspeção de saúde" },
  CNH_VENCIDA: { label: "CNH vencida/irregular", descricao: "Habilitação de condutor irregular" },
  ADMINISTRATIVA: { label: "Administrativa", descricao: "Impedimento administrativo" },
  DISCIPLINAR: { label: "Disciplinar", descricao: "Cumprindo medida disciplinar" },
  OUTRA: { label: "Outra", descricao: "Outro impedimento" },
};

/* ------------------------------------------------------------------ */
/* Usuários de demonstração (login simulado)                           */
/* ------------------------------------------------------------------ */

/** PIN único de demonstração. Substituir por Supabase Auth em produção. */
export const DEMO_PIN = "1234";

export const USUARIOS_DEMO: Usuario[] = [
  { id: "u-pessoal", nome: "Setor de Pessoal", cargo: "Encarregado do Pessoal", perfil: "ADMIN", divisao: "PESSOAL" },
  { id: "u-comandante", nome: "Comandante", cargo: "Capitão dos Portos", perfil: "LIDERANCA", divisao: "COMANDO" },
  { id: "u-imediato", nome: "Imediato", cargo: "Imediato da Capitania", perfil: "LIDERANCA", divisao: "COMANDO" },
  { id: "u-epm", nome: "Div 10 – EPM", cargo: "Encarregado da Div 10", perfil: "DIVISAO", divisao: "EPM" },
  { id: "u-sta", nome: "Div 20 – STA", cargo: "Encarregado da Div 20", perfil: "DIVISAO", divisao: "STA" },
  { id: "u-ops", nome: "Operações", cargo: "Encarregado de Operações", perfil: "DIVISAO", divisao: "OPERACOES" },
  { id: "u-cmt", nome: "Seção de Contramestres", cargo: "Encarregado dos Contramestres", perfil: "DIVISAO", divisao: "CONTRAMESTRES" },
  { id: "u-mot", nome: "Seção de Motoristas", cargo: "Encarregado dos Motoristas", perfil: "DIVISAO", divisao: "MOTORISTAS" },
  { id: "u-int", nome: "Intendência", cargo: "Encarregado da Intendência", perfil: "DIVISAO", divisao: "INTENDENCIA" },
];

export const PERFIL_LABEL = {
  ADMIN: "Setor de Pessoal (Administrador)",
  DIVISAO: "Divisão / Seção",
  LIDERANCA: "Liderança (consulta)",
} as const;
