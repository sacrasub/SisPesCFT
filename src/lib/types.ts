/**
 * SisPesCFT — Modelo de domínio (v2.0 — Central do Sargenteante-Geral & OI 02-06D).
 * Todas as datas são strings ISO "YYYY-MM-DD" (sem fuso) para evitar
 * deslocamentos de fuso horário e permitir serialização JSON direta.
 */

export type ISODate = string;

export type DivisaoId =
  | "COMANDO"
  | "PESSOAL"
  | "EPM"
  | "STA"
  | "OPERACOES"
  | "CONTRAMESTRES"
  | "MOTORISTAS"
  | "INTENDENCIA";

export type Posto =
  | "CMG"
  | "CF"
  | "CC"
  | "CT"
  | "1T"
  | "2T"
  | "GM"
  | "SO"
  | "1SG"
  | "2SG"
  | "3SG"
  | "CB"
  | "MN"
  | "SC"; // Servidor Civil

export type PostoGraduacao = Posto;

export type SetorCodigo =
  | "CF-01"   // Capitão dos Portos
  | "CF-01.1" // Gabinete / ComSoc
  | "CF-02"   // Ajudante
  | "CF-03"   // GVI (Grupo de Vistoria e Inspeção)
  | "CF-04"   // Inteligência
  | "CF-05"   // Assessoria Jurídica
  | "CF-06"   // Conselho de Gestão
  | "CF-07"   // GAP (Grupo de Atendimento ao Público)
  | "CF-08"   // Ouvidoria / Encargos Especiais
  | "CF-09"   // SECOM
  | "CF-10"   // Divisão do EPM
  | "CF-11"   // Seção de Ensino
  | "CF-12"   // Habilitação de Aquaviários
  | "CF-20"   // Divisão de STA
  | "CF-21"   // Cadastro / CCCAM
  | "CF-22"   // Inspeção Naval e Vistorias
  | "CF-23"   // Arrais Amador
  | "CF-30"   // Divisão de Apoio
  | "CF-31"   // Seção de Pessoal / Sargenteante-Geral
  | "CF-32"   // Intendência
  | "CF-33"   // Serviços Gerais / Mestre
  | "CF-34"   // Saúde / Sala DOC
  | "CF-40"   // Manutenção de Embarcações e Viaturas
  | "CF-41"   // Embarcações
  | "CF-42";  // Viaturas / SINGRA 2

export type MacroDivisao = "COMANDO" | "EPM" | "STA" | "APOIO" | "MANUTENCAO";

export type EscalaTipo =
  | "OSE"               // Oficial de Serviço de Estado
  | "SUPERVISOR_SECOM"  // Operador/Supervisor de Comunicações Navais
  | "CONTRAMESTRE"      // Contramestre do Serviço de Estado
  | "CABO_AUXILIAR"     // Cabo de Dia / Quartos e Vistoria Horária de Lanchas
  | "MOTORISTA"         // Motorista de Serviço
  | "VIGIA"             // Vigia de Embarcações / Sentinela
  | "IDENTIFICADOR"     // Identificador / Plantão de Alojamento (Restrição Parcial)
  | "INSPECAO_NAVAL";   // Equipe de Inspeção Naval (IN)

export type AreaInstrutoriaEpm =
  | "CFAQ"
  | "CCCAM"
  | "TFM"
  | "SEG_ORG"
  | "CONDUCAO_EMBARCACOES"
  | "CONDUCAO_VIATURAS"
  | "CAV_PSO";

export type MotivoDispensaEscala =
  | "NENHUMA"
  | "SO_MOR"
  | "MESTRE"
  | "SARGENTEANTE_GERAL"
  | "DETALHISTA"
  | "FIEL_PAGAMENTO"
  | "INTELIGENCIA"
  | "MAIS_30_ANOS"
  | "SO_MAIS_3_ANOS"
  | "RESTRICAO_MEDICA_PARCIAL" // Redireciona SG -> SUPERVISOR_SECOM | CB/MN -> IDENTIFICADOR
  | "RESTRICAO_MEDICA_TOTAL";

export interface QualificacaoPostoServico {
  posto: EscalaTipo;
  papeletaConcluida: boolean;
  servicosPraticosAcompanhados: number; // Mínimo 3 para destravar escala (OI 02-06D)
  numeroOsPublicacao?: string;          // Ex: "OS nº 42/2026"
  habilitado: boolean;
}

export interface SaldoPontosEscala {
  normal: number;         // +1.0 por serviço em rotina normal
  domingoFeriado: number; // +1.5 por serviço em rotina de domingo/feriado
  retem: number;          // +0.25 (Normal) ou +0.5 (Dom/Feriado)
  totalPonderado: number; // Soma consolidada para ordenação do motor
}

export type StatusSituacaoMilitar =
  | "ATIVO"              // ✓ Ativo / Na Escala de Serviço
  | "FERIAS"             // 🌴 Férias
  | "MISSAO"             // ✈️ Viagem / Missão / Operação
  | "LICENCA"            // 🏥 Licença (LTSP / LE)
  | "DESEMBARCADO"       // ⚓ Desembarcado / Transferido
  | "INATIVO";           // 🚫 Inativo / Outro Afastamento

export type SituacaoMilitar =
  | "PRONTO"
  | "ATIVO"
  | "FERIAS"
  | "LTS"
  | "LTSPF"
  | "LICENCA"
  | "MISSAO"
  | "MISSAO_EXTERNA"
  | "CURSO_EXTERNO"
  | "INSTALACAO"
  | "DESTAQUE"
  | "DESEMBARCADO"
  | "INATIVO";

export interface StatusSituacaoInfo {
  status: StatusSituacaoMilitar;
  label: string;
  labelTabela: string;
  badgeCls: string;
  detalhe?: string;
  afastamentoAtivo?: Afastamento;
}

export type RestricaoTipo =
  | "SEM_SRAK"
  | "SEM_ESPRAC"
  | "MEDICA"
  | "CNH_VENCIDA"
  | "ADMINISTRATIVA"
  | "DISCIPLINAR"
  | "OUTRA";

export interface Restricao {
  id: string;
  tipo: RestricaoTipo;
  descricao?: string;
  inicio: ISODate;
  /** null/undefined = restrição por tempo indeterminado */
  fim?: ISODate | null;
}

export interface Militar {
  id: string;
  nip: string;
  posto: Posto;
  nomeGuerra: string;
  nomeCompleto: string;
  especialidade?: string;
  funcao?: string;
  divisao: DivisaoId;
  /** Escalas de serviço em que o militar concorre. */
  escalas: EscalaTipo[];
  /** Integra o Conselho de Gestão (não deve gozar férias nas reuniões). */
  membroConselho: boolean;
  restricoes: Restricao[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;

  /* --- Campos estendidos v2.0 (Central do Sargenteante-Geral & OI 02-06D) --- */
  /** 1 (Mais antigo da CFT) até 64 (Mais moderno) — usado no desempate por modernidade da OI 02-06D */
  antiguidadeOrdem?: number;
  /** Código administrativo oficial da CFT (CF-01 a CF-42) */
  setorCodigo?: SetorCodigo;
  setorSecundario?: SetorCodigo;
  funcaoPrincipal?: string;
  /** Paióis, compartimentos e encargos colaterais sob responsabilidade */
  incumbencias?: string[];
  /** Pertence à OS de Instrutores Eventuais do EPM / Adestramentos */
  instrutorEpm?: boolean;
  areasInstrutoria?: AreaInstrutoriaEpm[];
  /** Controle da Papeleta de Qualificação (mín. 3 serviços acompanhados + OS) */
  qualificacoesServico?: QualificacaoPostoServico[];
  /** Regra de dispensa parametrizável (OI 02-06D) */
  dispensaEscala?: MotivoDispensaEscala;
  /** Se verdadeiro, redireciona SG para SUPERVISOR_SECOM e CB/MN para IDENTIFICADOR */
  restricaoMedicaArmadoOuEmPe?: boolean;
  /** Saldo acumulado de pontos (Rotina Normal 1.0 vs Domingo/Feriado 1.5) */
  pontosEscala?: SaldoPontosEscala;
  situacao?: SituacaoMilitar;
  emailFuncional?: string;
  emailPessoal?: string;
  telefoneContato?: string;
  roleAcesso?: "super_admin" | "admin" | "operador" | "visualizador";
  /** Histórico funcional, averbações e linha do tempo do militar */
  historico?: RegistroHistoricoMilitar[];
}

export interface RegistroHistoricoMilitar {
  id: string;
  data: ISODate;
  tipo:
    | "SERVICO"
    | "AFASTAMENTO"
    | "TROCA_SERVICO"
    | "PROMOCAO"
    | "ELOGIO"
    | "CURSO"
    | "ALTERACAO_FUNCAO"
    | "RESTRICAO"
    | "ANOTACAO";
  titulo: string;
  descricao?: string;
  documentoReferencia?: string;
  registradoPor?: string;
  createdAt: string;
}

export type AfastamentoCategoria =
  | "MISSAO"
  | "CURSO"
  | "INSPECAO_NAVAL"
  | "FERIAS"
  | "LICENCA"
  | "DISPENSA"
  | "OUTRO";

export type AfastamentoStatus = "PREVISTO" | "CONFIRMADO" | "CANCELADO";

/** Qualquer evento que retire o militar do expediente/escala: missão, curso, férias, licença, faina... */
export interface Afastamento {
  id: string;
  categoria: AfastamentoCategoria;
  /** Ex.: CFAQ, Itinerância, Aulão, Inspeção Naval, Férias regulamentares, LTS, LTSPF, Mutirum III... */
  subtipo: string;
  titulo: string;
  local?: string;
  inicio: ISODate;
  fim: ISODate;
  militarIds: string[];
  /** Divisão responsável pelo lançamento. */
  divisao: DivisaoId;
  status: AfastamentoStatus;
  /** Se verdadeiro, o militar fica indisponível para as escalas de serviço no período. */
  impactaEscala: boolean;
  observacoes?: string;
  criadoPor: string;
  createdAt: string;
  updatedAt: string;

  /* --- Campos do Plano Semanal & Folha de 4 Tempos (v2.0) --- */
  /** Quando verdadeiro, exibe "ASD" (Até Segunda Determinação) no Plano Semanal */
  terminoAsd?: boolean;
  /** Militar substituto obrigatório que responde pelas funções/paióis no período */
  militarSubstitutoId?: string;
  /** Documento de publicação (ex.: Portaria, OS, Msg) */
  documentoReferencia?: string;
  /** Horários específicos nos 4 tempos (ex.: Faina parcial 09:00 às 09:40 ou IN 06:30–16:00) */
  horarioEspecifico?: {
    t1: string;
    t2: string;
    t3: string;
    t4: string;
  };
}

export type TipoLancamentoRotina =
  | "FERIAS"
  | "LTS"
  | "LTSPF"
  | "MISSAO_MUTIRUM"
  | "MISSAO_BRACOLPER"
  | "ITINERANCIA_STA_EPM"
  | "AULA_EPM"
  | "INSPECAO_NAVAL_DIARIA"
  | "FAINA_APOIO"
  | "INSTALACAO"
  | "DISPENSA_RECOMPENSA"
  | "SAINDO_SERVICO";

export type CodigoPresencaTempo =
  | "PRESENTE"
  | "SSVÇ"
  | "X"
  | "IN"
  | "MO"
  | "SVÇ"
  | "FAINA";

export interface LinhaFolhaPresenca {
  militarId: string;
  data: ISODate;
  tempo1: string; // Ex: "07:30", "06:30", "SSVÇ", "X"
  tempo2: string; // Ex: "11:30", "X"
  tempo3: string; // Ex: "13:15", "13:00", "X"
  tempo4: string; // Ex: "16:30", "16:00", "X"
  statusObservacao: string; // Ex: "CONTRAMESTRE SAINDO DE SVÇ", "INSPEÇÃO NAVAL", "INSTRUTOR – CFAQ-MFM"
  codigo: CodigoPresencaTempo;
  prioridadeAplicada: 1 | 2 | 3 | 4 | 5;
  bloqueadoPorEscalaOuAusencia: boolean;
  incumbenciasAcumuladas: { titularNome: string; incumbencia: string; motivo: string }[];
}

export type LegendaOficialCapitania =
  | "X"    // Serviço Normal
  | "O"    // Serviço Operativo / Missão
  | "Fe/C" // Férias / Curso
  | "D"    // Destaque
  | "Fo"   // Folga / SSVÇ
  | "Li"   // Licença (LTS / LTSPF)
  | "Nº"   // Quarto de Serviço
  | "Di";  // Dispensado

export interface ItemEscalaDia {
  posto: EscalaTipo;
  militarTitularId: string;
  militarRetemId?: string;
  pontosCreditadosTitular: number;
  pontosCreditadosRetem: number;
  alertaQualificacaoOuExcecao?: string;
}

export interface DetalheEmergenciaDia {
  grupoCav: {
    encarregadoId: string;      // OSE ou Contramestre
    desligadorEletricoId: string;
    bombeiro1Id: string;
    bombeiro2Id: string;
    isolamentoPrimeirosSocorrosId: string;
  };
  grupoReacao: {
    comandanteId: string;             // OSE / Contramestre (Pistola Taurus 9mm)
    pontoSensivelEscoteriaId: string; // Fuzil / Pistola
    pontoSensivelCp01Id: string;      // Residência CP-01
    pontoSensivelFrenteGapId: string; // Frente GAP / Atendimento ao Público
    pontoSensivelAlojamentosId: string;
  };
  checklistOperacional: {
    vistoriaHorariaLanchas: boolean;
    escutaCanal16Vhf: boolean;
    conferenciaArmamentoMunicao: boolean;
  };
}

export type NivelHierarquiaTroca =
  | 1 // 1º Intra-divisão (mesmo setor/divisão)
  | 2 // 2º Extra-divisão (outro setor com anuência dos encarregados)
  | 3 // 3º Com o Retém do próprio dia
  | 4; // 4º Avanço do Retém da escala

export interface PapeletaTrocaServico {
  id: string;
  numeroSequencial: string; // Anexo O - OI 02-06D
  dataServicoOriginal: ISODate;
  posto: EscalaTipo;
  militarSolicitanteId: string;
  militarSubstitutoId: string;
  nivelHierarquia: NivelHierarquiaTroca;
  dataSolicitacao: ISODate;
  cumpreAntecedencia48h: boolean;
  motivoJustificativa: string;
  statusAprovacaoAjudante: "PENDENTE_CF02" | "AUTORIZADO_CF02" | "INDEFERIDO";
}

export interface Equipe {
  id: string;
  nome: string;
  membros: string[];
}

export interface EscalaConfig {
  id: EscalaTipo;
  nome: string;
  descricao: string;
  modo: "INDIVIDUAL" | "EQUIPES";
  /** INDIVIDUAL: quantos militares entram de serviço por dia. */
  postosPorDia: number;
  /** Regime desejado: nº de folgas por serviço (3 => "3 por 1"). */
  regimeAlvo: number;
  /** Abaixo deste regime a escala é considerada CRÍTICA (2 => 1 por 1 é crítico). */
  limiteSeguranca: number;
  /** Tipos de restrição que impedem o militar de concorrer a esta escala. */
  restricoesBloqueantes: RestricaoTipo[];
  /** EQUIPES: composição das equipes rotativas. */
  equipes?: Equipe[];
  /** EQUIPES: mínimo de militares aptos para a equipe ser empregada. */
  tamanhoMinimoEquipe?: number;
  /** EQUIPES: duração (dias) de cada turno de equipe. */
  duracaoTurnoDias?: number;
  /** EQUIPES: data de referência do início da rotação (equipe 1). */
  dataBaseRotacao?: ISODate;
}

export type EventoTipo = "CONSELHO_GESTAO" | "INSPECAO_ADMINISTRATIVA" | "CERIMONIA" | "OUTRO";

export interface EventoInstitucional {
  id: string;
  tipo: EventoTipo;
  titulo: string;
  inicio: ISODate;
  fim: ISODate;
  /** Exige presença dos membros do Conselho de Gestão. */
  exigeConselho: boolean;
  observacoes?: string;
}

export interface Parametros {
  /** Percentual máximo da divisão em férias simultaneamente (0–1). */
  limiteFeriasDivisao: number;
  /** Horizonte (dias) para alertas de escala no dashboard. */
  horizonteAlertasDias: number;
  /** Considerar lançamentos PREVISTOS no cálculo das escalas (além dos CONFIRMADOS). */
  considerarPrevistos: boolean;
  /** Se verdadeiro, ativa alerta de Regresso Geral (ex.: "REGRESSO GERAL 7h ATÉ SEXTA-FEIRA"). */
  regressoGeralAtivo?: boolean;
  regressoGeralTexto?: string;
  /** Data-base fixa da simulação das escalas (garante previsão estável entre telas). */
  dataBaseEscalas?: ISODate;
}

export interface Database {
  version: number;
  militares: Militar[];
  afastamentos: Afastamento[];
  escalas: EscalaConfig[];
  eventos: EventoInstitucional[];
  parametros: Parametros;
  trocasServico?: PapeletaTrocaServico[];
  updatedAt: string;
}

export type CollectionKey = "militares" | "afastamentos" | "escalas" | "eventos";
export type CollectionItem<K extends CollectionKey> = Database[K][number];

/* ---------- Autenticação / perfis ---------- */

export type Perfil = "ADMIN" | "DIVISAO" | "LIDERANCA";

export interface Usuario {
  id: string;
  nome: string;
  cargo: string;
  perfil: Perfil;
  divisao?: DivisaoId;
  email?: string;
  nip?: string;
  posto?: Posto;
  nomeGuerra?: string;
  roleCft?: "super_admin" | "admin" | "operador";
}

/* ---------- Tipos derivados (motores de cálculo) ---------- */

export type StatusPresenca =
  | "DISPONIVEL"
  | "MISSAO"
  | "CURSO"
  | "INSPECAO_NAVAL"
  | "FERIAS"
  | "LICENCA"
  | "DISPENSA"
  | "OUTRO";

export type StatusCobertura = "OK" | "ATENCAO" | "CRITICO" | "SEM_COBERTURA";
