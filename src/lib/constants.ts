import type {
  AfastamentoCategoria,
  AfastamentoStatus,
  DivisaoId,
  EscalaTipo,
  LegendaOficialCapitania,
  MacroDivisao,
  MotivoDispensaEscala,
  Posto,
  RestricaoTipo,
  SetorCodigo,
  StatusCobertura,
  StatusPresenca,
  Usuario,
} from "./types";

export const DB_VERSION = 4;

/* ------------------------------------------------------------------ */
/* Setores Oficiais da CFT (Tabela de Lotação CF-01 a CF-42)          */
/* ------------------------------------------------------------------ */

export interface SetorMetadata {
  codigo: SetorCodigo;
  nome: string;
  macroDivisao: MacroDivisao;
  divisaoId: DivisaoId;
  ordensInternas: string[];
  atividadesResumo: string;
}

export const SETORES_CFT: Record<SetorCodigo, SetorMetadata> = {
  "CF-01": {
    codigo: "CF-01",
    nome: "Capitão dos Portos",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 01-01"],
    atividadesResumo: "Comando da OM e Direção do Serviço",
  },
  "CF-01.1": {
    codigo: "CF-01.1",
    nome: "Gabinete e Comunicação Social",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 01-02", "OI 01-05"],
    atividadesResumo: "Ética, notas de promoção, aniversariantes e cobertura audiovisual (envio até 24h)",
  },
  "CF-02": {
    codigo: "CF-02",
    nome: "Ajudante da Capitania",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 02-01", "OI 02-06D"],
    atividadesResumo: "Ordens ao pessoal, atualização de OIs, publicação de ausências e autorização de trocas de serviço",
  },
  "CF-03": {
    codigo: "CF-03",
    nome: "Grupo de Vistoria e Inspeção (GVI)",
    macroDivisao: "STA",
    divisaoId: "STA",
    ordensInternas: ["OI 03-01"],
    atividadesResumo: "Vistorias navais e inspeções técnicas",
  },
  "CF-04": {
    codigo: "CF-04",
    nome: "Seção de Inteligência",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 04-01"],
    atividadesResumo: "Inteligência, escoteria e arquivamento de papeletas de troca de serviço",
  },
  "CF-05": {
    codigo: "CF-05",
    nome: "Assessoria Jurídica",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 05-01"],
    atividadesResumo: "Pareceres e procedimentos de prisão em flagrante / IAFN",
  },
  "CF-06": {
    codigo: "CF-06",
    nome: "Conselho de Gestão",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 06-01"],
    atividadesResumo: "Gestão administrativa e financeira da OM",
  },
  "CF-07": {
    codigo: "CF-07",
    nome: "Grupo de Atendimento ao Público (GAP)",
    macroDivisao: "APOIO",
    divisaoId: "OPERACOES",
    ordensInternas: ["OI 07-01"],
    atividadesResumo: "Atendimento ao público externo, protocolo e inscrições de cursos (ex: CFAQ)",
  },
  "CF-08": {
    codigo: "CF-08",
    nome: "Encargos Colaterais / Ouvidoria",
    macroDivisao: "COMANDO",
    divisaoId: "COMANDO",
    ordensInternas: ["OI 08-01"],
    atividadesResumo: "Ouvidoria e encargos especiais",
  },
  "CF-09": {
    codigo: "CF-09",
    nome: "Seção de Comunicações (SECOM)",
    macroDivisao: "COMANDO",
    divisaoId: "OPERACOES",
    ordensInternas: ["OI 09-01"],
    atividadesResumo: "SIGAD-MB/DATAMAR, numeração de expedientes (OS, OfExt, Port) e confecção do Plano Semanal",
  },
  "CF-10": {
    codigo: "CF-10",
    nome: "Divisão de Ensino Profissional Marítimo (EPM)",
    macroDivisao: "EPM",
    divisaoId: "EPM",
    ordensInternas: ["OI 10-01"],
    atividadesResumo: "Gestão do PREPOM, indicadores de eficiência e cursos aquaviários",
  },
  "CF-11": {
    codigo: "CF-11",
    nome: "Seção de Ensino",
    macroDivisao: "EPM",
    divisaoId: "EPM",
    ordensInternas: ["OI 11-01"],
    atividadesResumo: "Execução de cursos (CFAQ-MFM) e gestão da OS de Instrutores Eventuais",
  },
  "CF-12": {
    codigo: "CF-12",
    nome: "Seção de Hab. e Cadastro de Aquaviários",
    macroDivisao: "EPM",
    divisaoId: "EPM",
    ordensInternas: ["OI 12-01"],
    atividadesResumo: "Habilitação e certificação do pessoal aquaviário",
  },
  "CF-20": {
    codigo: "CF-20",
    nome: "Divisão de Segurança do Tráfego Aquaviário (STA)",
    macroDivisao: "STA",
    divisaoId: "STA",
    ordensInternas: ["OI 20-01"],
    atividadesResumo: "Coordenação de operações fluviais, adestramentos semanais e segurança da navegação",
  },
  "CF-21": {
    codigo: "CF-21",
    nome: "Seção de Cadastro e CCCAM",
    macroDivisao: "STA",
    divisaoId: "STA",
    ordensInternas: ["OI 21-01"],
    atividadesResumo: "Cadastro de embarcações e supervisão do CCCAM",
  },
  "CF-22": {
    codigo: "CF-22",
    nome: "Seção de Inspeção Naval e Vistorias",
    macroDivisao: "STA",
    divisaoId: "STA",
    ordensInternas: ["OI 22-01"],
    atividadesResumo: "Execução de ações de Inspeção Naval (IN) e operações (Navegue Seguro)",
  },
  "CF-23": {
    codigo: "CF-23",
    nome: "Seção de Hab. e Cadastro de Amadores",
    macroDivisao: "STA",
    divisaoId: "STA",
    ordensInternas: ["OI 23-01"],
    atividadesResumo: "Seção de Arrais Amador e motonautas",
  },
  "CF-30": {
    codigo: "CF-30",
    nome: "Divisão de Apoio",
    macroDivisao: "APOIO",
    divisaoId: "INTENDENCIA",
    ordensInternas: ["OI 30-03", "OI 30-07D", "OI 30-09B", "OI 30-10B", "OI 30-14A", "OI 30-15", "OI 30-16"],
    atividadesResumo: "Licitações, CAV, recém-embarcados, formaturas, execução financeira, escoteria, BRACOLPER e apoio a navios",
  },
  "CF-31": {
    codigo: "CF-31",
    nome: "Seção de Pessoal / Sargenteante-Geral",
    macroDivisao: "APOIO",
    divisaoId: "PESSOAL",
    ordensInternas: ["OI 02-06D", "OI 31-01C"],
    atividadesResumo: "Controle do SisPes/SIGeP, Plano de Busca, pagamento/diárias/passagens e trocas em comissões",
  },
  "CF-32": {
    codigo: "CF-32",
    nome: "Seção de Intendência e Finanças",
    macroDivisao: "APOIO",
    divisaoId: "INTENDENCIA",
    ordensInternas: ["OI 32-01C", "OI 32-02"],
    atividadesResumo: "Gestão de material, pagamento de pedidos (terças), inventário CADBEM, PAR e Ouvidoria",
  },
  "CF-33": {
    codigo: "CF-33",
    nome: "Seção de Serviços Gerais / Mestre",
    macroDivisao: "APOIO",
    divisaoId: "CONTRAMESTRES",
    ordensInternas: ["OI 33-01B"],
    atividadesResumo: "Manutenção predial, Patromoria e Sistema de Gestão Ambiental",
  },
  "CF-34": {
    codigo: "CF-34",
    nome: "Seção de Saúde / Sala DOC",
    macroDivisao: "APOIO",
    divisaoId: "PESSOAL",
    ordensInternas: ["OI 34-01"],
    atividadesResumo: "Rotina de saúde, Sala DOC e controle de licenças médicas (LTS/LTSPF)",
  },
  "CF-40": {
    codigo: "CF-40",
    nome: "Div. de Manutenção de Embarcações e Viaturas",
    macroDivisao: "MANUTENCAO",
    divisaoId: "CONTRAMESTRES",
    ordensInternas: ["OI 40-01"],
    atividadesResumo: "Gestão e manutenção de meios navais e terrestres",
  },
  "CF-41": {
    codigo: "CF-41",
    nome: "Seção de Embarcações",
    macroDivisao: "MANUTENCAO",
    divisaoId: "CONTRAMESTRES",
    ordensInternas: ["OI 40-02", "OI 40-06"],
    atividadesResumo: "Ordens de serviço de manutenção e utilização de embarcações",
  },
  "CF-42": {
    codigo: "CF-42",
    nome: "Seção de Viaturas / SINGRA 2",
    macroDivisao: "MANUTENCAO",
    divisaoId: "MOTORISTAS",
    ordensInternas: ["OI 40-04"],
    atividadesResumo: "Controle do SINGRA 2 (OMC/COMACO/COMARE) e acidentes com viaturas",
  },
};

export const SETOR_LISTA: SetorMetadata[] = Object.values(SETORES_CFT);

/* ------------------------------------------------------------------ */
/* Regras Normativas OI 02-06D & Rotina de 4 Tempos                    */
/* ------------------------------------------------------------------ */

export const REGRAS_PONTUACAO_OI_02_06D = {
  NORMAL: {
    TITULAR: 1.0,
    RETEM: 0.25,
  },
  DOMINGO_FERIADO: {
    TITULAR: 1.5,
    RETEM: 0.5,
  },
  MINIMO_SERVICOS_PRATICOS_QUALIFICACAO: 3,
  ANTECEDENCIA_MINIMA_TROCA_HORAS: 48,
  ANTECEDENCIA_SUBSTITUTO_FERIAS_DIAS: 8,
  LIMITE_SEGURANCA_REINTEGRACAO_DISPENSADOS: {
    SO: 4,     // Alerta se escala de SO cair abaixo de 4x1
    GERAL: 2,  // Alerta se demais escalas caírem abaixo de 2x1
  },
} as const;

export const HORARIOS_PADRAO_4_TEMPOS = {
  EXPEDIENTE_NORMAL: { t1: "07:30", t2: "11:30", t3: "13:15", t4: "16:30" },
  INSPECAO_NAVAL:    { t1: "06:30", t2: "11:30", t3: "13:00", t4: "16:00" },
  MOTORISTA_SERVICO: { t1: "06:50", t2: "11:00", t3: "17:18", t4: "18:20" },
  SERVICO_ESTADO:    { t1: "07:30", t2: "SVÇ",   t3: "SVÇ",   t4: "24H"   },
  SAINDO_SERVICO:    { t1: "SSVÇ",  t2: "X",     t3: "X",     t4: "X"     },
  AUSENTE_INTEGRAL:  { t1: "X",     t2: "X",     t3: "X",     t4: "X"     },
} as const;

export const SIGLA_OPERACIONAL_SOMOR: Record<EscalaTipo, string> = {
  OSE: "OSE",
  SUPERVISOR_SECOM: "SECOM",
  CONTRAMESTRE: "CTR",
  CABO_AUXILIAR: "CB-AUX",
  MOTORISTA: "MO",
  VIGIA: "VG",
  IDENTIFICADOR: "IDENT",
  INSPECAO_NAVAL: "IN",
};

export const LEGENDA_OFICIAL_CAPITANIA: Record<LegendaOficialCapitania, string> = {
  X: "Serviço Normal de Estado (24h)",
  O: "Serviço Operativo / Missão / Inspeção Naval",
  "Fe/C": "Férias ou Curso",
  D: "Destaque / Missão Fora de Sede",
  Fo: "Folga / Saindo de Serviço (SSVÇ)",
  Li: "Licença (LTS / LTSPF)",
  "Nº": "Quarto de Serviço",
  Di: "Dispensado da Escala (OI 02-06D)",
};

export const MOTIVO_DISPENSA_LABEL: Record<MotivoDispensaEscala, string> = {
  NENHUMA: "Concorre Normalmente",
  SO_MOR: "Suboficial-Mor (SO-MOR)",
  MESTRE: "Mestre da OM",
  SARGENTEANTE_GERAL: "Sargenteante-Geral",
  DETALHISTA: "Detalhista de Serviço",
  FIEL_PAGAMENTO: "Fiel de Pagamento / Municiamento",
  INTELIGENCIA: "Praça na Função de Inteligência (CF-04)",
  MAIS_30_ANOS: "Mais de 30 anos de serviço",
  SO_MAIS_3_ANOS: "Suboficial com +3 anos na graduação",
  RESTRICAO_MEDICA_PARCIAL: "Restrição Médica Parcial (Redireciona SECOM / Identificador)",
  RESTRICAO_MEDICA_TOTAL: "Restrição Médica Total (Inapto temporário)",
};

export const GRADE_SEMANAL_ADESTRAMENTOS = [
  {
    id: "adest-cav-pso",
    diasSemana: [0, 1, 2, 3, 4, 5, 6], // Dom a Sáb
    diasLabel: "Segunda a Domingo",
    horario: "07:30",
    atividade: "Adestramento Diário de CAV / PSO (Divisão e Quarto de Serviço)",
    instrutorTitular: "Oficial de Serviço (OSE) / Contramestre",
    instrutorId: "m03",
    coordenacao: ["2T Azevedo", "1SG Nepomuceno", "3SG José Thomáz"],
  },
  {
    id: "adest-tfm",
    diasSemana: [1, 3, 5], // Seg, Qua, Sex
    diasLabel: "Segundas, Quartas e Sextas",
    horario: "08:00 às 09:00",
    atividade: "Treinamento Físico Militar (TFM) da Tripulação",
    instrutorTitular: "SO-CI-SB Sacramento",
    instrutorId: "m05",
    coordenacao: ["2T Azevedo", "1SG Nepomuceno"],
  },
  {
    id: "adest-embarcacoes",
    diasSemana: [2], // Terça
    diasLabel: "Terças-feiras",
    horario: "08:10",
    atividade: "Adestramento de Condução de Embarcações",
    instrutorTitular: "SO-MO França",
    instrutorId: "m10",
    coordenacao: ["2T Azevedo", "1SG Nepomuceno", "3SG José Thomáz"],
  },
  {
    id: "adest-segorg-viaturas",
    diasSemana: [4], // Quinta
    diasLabel: "Quintas-feiras",
    horario: "08:10",
    atividade: "SegOrg (Recém-Embarcados / Serviço Armado) & Condução de Viaturas (CF-40)",
    instrutorTitular: "2T (AA) Azevedo / SO França (CF-40)",
    instrutorId: "m04",
    coordenacao: ["2T Azevedo", "1SG Nepomuceno", "3SG José Thomáz"],
  },
];

/* ------------------------------------------------------------------ */
/* Divisões / Seções Macro                                             */
/* ------------------------------------------------------------------ */

export interface DivisaoInfo {
  id: DivisaoId;
  sigla: string;
  nome: string;
  /** Cor de identificação (hex) usada em gráficos e chips. */
  cor: string;
}

export const DIVISOES: DivisaoInfo[] = [
  { id: "COMANDO", sigla: "CF-01/02", nome: "Comando / Ajudância / Gabinete", cor: "#e2b13c" },
  { id: "PESSOAL", sigla: "CF-31/34", nome: "Seção de Pessoal / Saúde", cor: "#60a5fa" },
  { id: "EPM", sigla: "CF-10", nome: "Div 10 – Ensino Profissional Marítimo", cor: "#a78bfa" },
  { id: "STA", sigla: "CF-20", nome: "Div 20 – Segurança do Tráfego Aquaviário", cor: "#22d3ee" },
  { id: "OPERACOES", sigla: "CF-07/09", nome: "GAP / SECOM / Operações", cor: "#34d399" },
  { id: "CONTRAMESTRES", sigla: "CF-33/41", nome: "Contramestres / Embarcações", cor: "#f472b6" },
  { id: "MOTORISTAS", sigla: "CF-40/42", nome: "Seção de Viaturas / Motoristas", cor: "#fb923c" },
  { id: "INTENDENCIA", sigla: "CF-30/32", nome: "Div. Apoio / Intendência", cor: "#94a3b8" },
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
  OSE: "Oficial de Serviço (OSE)",
  SUPERVISOR_SECOM: "Supervisor SECOM",
  CONTRAMESTRE: "Contramestre",
  CABO_AUXILIAR: "Cabo Auxiliar / Dia",
  MOTORISTA: "Motorista",
  VIGIA: "Vigia de Embarcações",
  IDENTIFICADOR: "Identificador / Plantão",
  INSPECAO_NAVAL: "Inspeção Naval",
};

export const ESCALA_ORDEM: EscalaTipo[] = [
  "OSE",
  "CONTRAMESTRE",
  "SUPERVISOR_SECOM",
  "CABO_AUXILIAR",
  "MOTORISTA",
  "VIGIA",
  "IDENTIFICADOR",
  "INSPECAO_NAVAL",
];

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
  MISSAO: { label: "Missão / Comissão", cor: "#22d3ee", impactaPorPadrao: true },
  CURSO: { label: "Curso / Aula EPM", cor: "#a78bfa", impactaPorPadrao: true },
  INSPECAO_NAVAL: { label: "Inspeção Naval", cor: "#38bdf8", impactaPorPadrao: true },
  FERIAS: { label: "Férias", cor: "#34d399", impactaPorPadrao: true },
  LICENCA: { label: "Licença (LTS/LTSPF)", cor: "#fb7185", impactaPorPadrao: true },
  DISPENSA: { label: "Dispensa / Instalação", cor: "#fbbf24", impactaPorPadrao: true },
  OUTRO: { label: "Faina / Apoio", cor: "#94a3b8", impactaPorPadrao: false },
};

export const STATUS_LANCAMENTO_META: Record<AfastamentoStatus, { label: string; cls: string }> = {
  PREVISTO: { label: "Previsto", cls: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  CONFIRMADO: { label: "Confirmado", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  CANCELADO: { label: "Cancelado", cls: "bg-slate-500/15 text-slate-400 ring-slate-400/30 line-through" },
};

export const PRESENCA_META: Record<StatusPresenca, { label: string; cor: string }> = {
  DISPONIVEL: { label: "Disponível", cor: "#34d399" },
  MISSAO: { label: "Em missão", cor: "#22d3ee" },
  CURSO: { label: "Curso / Aula EPM", cor: "#a78bfa" },
  INSPECAO_NAVAL: { label: "Inspeção Naval", cor: "#38bdf8" },
  FERIAS: { label: "Férias", cor: "#4ade80" },
  LICENCA: { label: "Licença (LTS/LTSPF)", cor: "#fb7185" },
  DISPENSA: { label: "Dispensa / Instalação", cor: "#fbbf24" },
  OUTRO: { label: "Faina / Apoio", cor: "#94a3b8" },
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
    MISSAO: ["CFAQ-MFM – Instrução", "CEMAQ – Instrução", "Itinerância EPM", "Aulão", "Aplicação de Exame"],
    CURSO: ["Ministrar aula em curso do EPM", "INSTRUTOR – CFAQ-MFM T1-2026", "Curso Expedito", "Curso de Aperfeiçoamento"],
    OUTRO: ["FAXINA NO EPM", "Apoio Administrativo EPM"],
  },
  STA: {
    MISSAO: ["MISSÃO MUTIRUM III", "OPERAÇÃO NAVEGUE SEGURO", "COMISSÃO BRACOLPER", "Itinerância STA", "Vistoria GVI", "Perícia / IAFN"],
    INSPECAO_NAVAL: ["INSPEÇÃO NAVAL", "Inspeção Naval – Rio Solimões", "Inspeção Naval – Rio Javari", "Operação Integrada"],
  },
  OPERACOES: {
    MISSAO: ["MISSÃO MUTIRUM III", "COMISSÃO BRACOLPER", "Operação Ágata", "Apoio Logístico NPaFlu/NAsH"],
    INSPECAO_NAVAL: ["INSPEÇÃO NAVAL", "Operação Integrada"],
    CURSO: ["Estágio Avançado SIGAD-MB", "Curso CIANB"],
  },
  CONTRAMESTRES: {
    MISSAO: ["MISSÃO MUTIRUM III", "Condução de Lancha – Apoio STA", "Condução de Lancha – Apoio EPM", "Manutenção de Embarcação (CF-41)"],
  },
  MOTORISTAS: {
    MISSAO: ["MOTORISTA DE SERVIÇO", "Apoio de Transporte", "Viagem Administrativa (CF-42)"],
  },
};

export const SUBTIPOS_GERAIS: Record<AfastamentoCategoria, string[]> = {
  MISSAO: ["MISSÃO MUTIRUM III", "COMISSÃO BRACOLPER", "OPERAÇÃO NAVEGUE SEGURO", "Reunião do Grupo Norte", "Viagem a Manaus"],
  CURSO: ["Ministrar aula em curso do EPM", "INSTRUTOR – CFAQ-MFM T1-2026", "Curso C-EMOI", "Estágio SIGAD-MB / SIAFI / SINGRA 2"],
  INSPECAO_NAVAL: ["INSPEÇÃO NAVAL", "Inspeção Naval – Longa Duração"],
  FERIAS: ["Férias regulamentares", "Férias – 1º período", "Férias – 2º período", "Férias – 3º período"],
  LICENCA: ["LTS – Licença para Tratamento de Saúde", "LTSPF – Pessoa da Família", "Licença Paternidade", "Luto", "Núpcias"],
  DISPENSA: ["INSTALAÇÃO (Recém-embarcado)", "SSVÇ – Saindo de Serviço", "Dispensa médica", "Dispensa como recompensa"],
  OUTRO: ["FAXINA NO EPM", "Apoio Administrativo", "Outro"],
};

/* ------------------------------------------------------------------ */
/* Restrições                                                          */
/* ------------------------------------------------------------------ */

export const RESTRICAO_META: Record<RestricaoTipo, { label: string; descricao: string }> = {
  SEM_SRAK: { label: "Sem SRAK", descricao: "Não possui a habilitação/curso SRAK exigido" },
  SEM_ESPRAC: { label: "Sem ESPRAC", descricao: "Não possui a habilitação/curso ESPRAC exigido" },
  MEDICA: { label: "Restrição médica", descricao: "Impedimento por inspeção de saúde (redireciona SECOM/Identificador)" },
  CNH_VENCIDA: { label: "CNH vencida/irregular", descricao: "Habilitação de condutor irregular" },
  ADMINISTRATIVA: { label: "Administrativa", descricao: "Impedimento administrativo / Papeleta OI 02-06D pendente" },
  DISCIPLINAR: { label: "Disciplinar", descricao: "Cumprindo medida disciplinar" },
  OUTRA: { label: "Outra", descricao: "Outro impedimento" },
};

/* ------------------------------------------------------------------ */
/* Usuários de demonstração (login simulado)                           */
/* ------------------------------------------------------------------ */

export const DEMO_PIN = "1234";

export const USUARIOS_DEMO: Usuario[] = [
  { id: "u-pessoal", nome: "Sargenteante-Geral / Pessoal", cargo: "Encarregado do Pessoal / SO-MOR (CF-31)", perfil: "ADMIN", divisao: "PESSOAL" },
  { id: "u-comandante", nome: "Comandante (CF-01)", cargo: "Capitão dos Portos", perfil: "LIDERANCA", divisao: "COMANDO" },
  { id: "u-imediato", nome: "Ajudante / Imediato (CF-02)", cargo: "Ajudante da Capitania", perfil: "LIDERANCA", divisao: "COMANDO" },
  { id: "u-epm", nome: "Div 10 – EPM (CF-10)", cargo: "Encarregado da Div 10 (SO Sacramento)", perfil: "DIVISAO", divisao: "EPM" },
  { id: "u-sta", nome: "Div 20 – STA (CF-20)", cargo: "Encarregada da Div 20 (1T Cravero)", perfil: "DIVISAO", divisao: "STA" },
  { id: "u-ops", nome: "GAP / SECOM (CF-07/09)", cargo: "Supervisor GAP / SECOM", perfil: "DIVISAO", divisao: "OPERACOES" },
  { id: "u-cmt", nome: "Contramestres / Mestre (CF-33/41)", cargo: "Mestre / Contramestres", perfil: "DIVISAO", divisao: "CONTRAMESTRES" },
  { id: "u-mot", nome: "Viaturas / Manutenção (CF-40/42)", cargo: "Encarregado de Viaturas", perfil: "DIVISAO", divisao: "MOTORISTAS" },
  { id: "u-int", nome: "Apoio / Intendência (CF-30/32)", cargo: "Encarregado da Intendência (CT Bispo)", perfil: "DIVISAO", divisao: "INTENDENCIA" },
];

export const PERFIL_LABEL = {
  ADMIN: "Sargenteante-Geral / Pessoal (Admin)",
  DIVISAO: "Divisão / Seção (CF-XX)",
  LIDERANCA: "Comando / Ajudância (CF-01 / CF-02)",
} as const;
