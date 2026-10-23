/**
 * SisPesCFT — Modelo de domínio.
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

export type EscalaTipo = "CONTRAMESTRE" | "MOTORISTA" | "VIGIA" | "INSPECAO_NAVAL";

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

/** Qualquer evento que retire o militar do expediente/escala: missão, curso, férias, licença... */
export interface Afastamento {
  id: string;
  categoria: AfastamentoCategoria;
  /** Ex.: CFAQ, Itinerância, Aulão, Inspeção Naval, Férias regulamentares... */
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
}

export interface Database {
  version: number;
  militares: Militar[];
  afastamentos: Afastamento[];
  escalas: EscalaConfig[];
  eventos: EventoInstitucional[];
  parametros: Parametros;
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
