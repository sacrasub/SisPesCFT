/**
 * Regras de negócio puras da OI 02-06D (sem dependência de React/DOM),
 * isoladas para uso pelas telas e pela bateria de testes funcionais.
 */
import { REGRAS_PONTUACAO_OI_02_06D } from "../constants";
import { addDays, diffDays, isFimDeSemana } from "../dates";
import type {
  Afastamento,
  EscalaConfig,
  ISODate,
  Militar,
  MotivoDispensaEscala,
  NivelHierarquiaTroca,
} from "../types";
import { indisponibilidadeEscala, type Contexto } from "./disponibilidade";
import { efetivoEscala, gerarEscala } from "./escalas";

/* ------------------------------------------------------------------ */
/* Pontuação                                                           */
/* ------------------------------------------------------------------ */

/** Rotina de Domingo/Feriado (escala vermelha): sábados, domingos e feriados cadastrados. */
export function ehRotinaDomingoFeriado(data: ISODate, feriados: ISODate[] = []): boolean {
  return isFimDeSemana(data) || feriados.includes(data);
}

/** Crédito de pontos OI 02-06D: Normal 1,0 / 0,25 (retém) — Domingo/Feriado 1,5 / 0,5 (retém). */
export function creditoPontosOI0206D(
  data: ISODate,
  papel: "TITULAR" | "RETEM",
  feriados: ISODate[] = [],
): number {
  const regra = ehRotinaDomingoFeriado(data, feriados)
    ? REGRAS_PONTUACAO_OI_02_06D.DOMINGO_FERIADO
    : REGRAS_PONTUACAO_OI_02_06D.NORMAL;
  return regra[papel];
}

/* ------------------------------------------------------------------ */
/* Alerta de férias sem antecedência mínima (8 dias)                   */
/* ------------------------------------------------------------------ */

export function alertasFeriasSemAntecedencia(afastamentos: Afastamento[], hoje: ISODate): Afastamento[] {
  return afastamentos.filter(
    (a) =>
      a.status !== "CANCELADO" &&
      a.categoria === "FERIAS" &&
      a.inicio >= hoje &&
      diffDays(hoje, a.inicio) < REGRAS_PONTUACAO_OI_02_06D.ANTECEDENCIA_SUBSTITUTO_FERIAS_DIAS,
  );
}

/* ------------------------------------------------------------------ */
/* Alerta de reintegração temporária de dispensados (4×1 SO / 2×1)     */
/* ------------------------------------------------------------------ */

/** Dispensas funcionais que podem ser suspensas temporariamente pelo Capitão dos Portos. */
export const DISPENSAS_REINTEGRAVEIS: MotivoDispensaEscala[] = [
  "SO_MOR",
  "MESTRE",
  "SARGENTEANTE_GERAL",
  "DETALHISTA",
  "FIEL_PAGAMENTO",
  "INTELIGENCIA",
  "MAIS_30_ANOS",
  "SO_MAIS_3_ANOS",
];

export interface AlertaReintegracao {
  escalaId: EscalaConfig["id"];
  escalaNome: string;
  data: ISODate;
  aptos: number;
  regime: number;
  limite: number;
  ehEscalaDeSO: boolean;
  candidatosReintegracao: string[];
  mensagem: string;
}

export function avaliarReintegracaoDispensados(
  ctx: Contexto,
  escala: EscalaConfig,
  data: ISODate,
): AlertaReintegracao | null {
  if (escala.modo === "EQUIPES") return null;
  const pool = efetivoEscala(ctx, escala);
  if (!pool.length) return null;

  const aptos = pool.filter((m) => !indisponibilidadeEscala(ctx, m, escala, data)).length;
  const regime = Math.floor(aptos / Math.max(1, escala.postosPorDia)) - 1;
  const ehEscalaDeSO = pool.every((m) => m.posto === "SO");
  const limite = ehEscalaDeSO
    ? REGRAS_PONTUACAO_OI_02_06D.LIMITE_SEGURANCA_REINTEGRACAO_DISPENSADOS.SO
    : REGRAS_PONTUACAO_OI_02_06D.LIMITE_SEGURANCA_REINTEGRACAO_DISPENSADOS.GERAL;

  if (regime >= limite) return null;

  const candidatosReintegracao = pool
    .filter((m) => m.dispensaEscala && DISPENSAS_REINTEGRAVEIS.includes(m.dispensaEscala))
    .map((m) => m.id);

  return {
    escalaId: escala.id,
    escalaNome: escala.nome,
    data,
    aptos,
    regime,
    limite,
    ehEscalaDeSO,
    candidatosReintegracao,
    mensagem: `Alerta OI 02-06D [${escala.nome}]: ${aptos} apto(s) — regime ${Math.max(regime, 0)}×1 abaixo do limite ${limite}×1. Avaliar reintegração temporária de dispensados (${candidatosReintegracao.length} disponível(is)) mediante autorização do Capitão dos Portos.`,
  };
}

/* ------------------------------------------------------------------ */
/* Papeleta de Troca de Serviço (Anexo O)                              */
/* ------------------------------------------------------------------ */

export interface EntradaValidacaoTroca {
  hoje: ISODate;
  dataServico: ISODate;
  escala: EscalaConfig;
  solicitanteId: string;
  substitutoId: string;
  nivel: NivelHierarquiaTroca;
}

export interface ResultadoValidacaoTroca {
  valida: boolean;
  cumpreAntecedencia48h: boolean;
  horasAntecedencia: number;
  nivelSugerido: NivelHierarquiaTroca | null;
  erros: string[];
}

function mesmaDivisao(a: Militar, b: Militar): boolean {
  if (a.setorCodigo && b.setorCodigo) {
    // Mesma divisão = mesmo grupo CF-X0..CF-X9 (ex.: CF-31 e CF-33 pertencem à Divisão de Apoio CF-30)
    const grupo = (s: string) => s.slice(0, 4);
    return grupo(a.setorCodigo) === grupo(b.setorCodigo);
  }
  return a.divisao === b.divisao;
}

/**
 * Valida a Papeleta de Troca segundo a OI 02-06D:
 * - antecedência mínima de 48h;
 * - substituto apto e concorrente ao mesmo posto;
 * - hierarquia: 1º intra-divisão → 2º extra-divisão → 3º retém do dia → 4º avanço do retém (retém de D+1).
 */
export function validarPapeletaTroca(ctx: Contexto, e: EntradaValidacaoTroca): ResultadoValidacaoTroca {
  const erros: string[] = [];
  const horasAntecedencia = diffDays(e.hoje, e.dataServico) * 24;
  const cumpreAntecedencia48h = horasAntecedencia >= REGRAS_PONTUACAO_OI_02_06D.ANTECEDENCIA_MINIMA_TROCA_HORAS;
  if (!cumpreAntecedencia48h) erros.push(`Antecedência de ${horasAntecedencia}h inferior às 48h exigidas.`);

  const sol = ctx.militarMap.get(e.solicitanteId);
  const sub = ctx.militarMap.get(e.substitutoId);
  if (!sol || !sub) {
    erros.push("Solicitante ou substituto inexistente.");
    return { valida: false, cumpreAntecedencia48h, horasAntecedencia, nivelSugerido: null, erros };
  }
  if (sol.id === sub.id) erros.push("Solicitante e substituto são o mesmo militar.");

  const pool = efetivoEscala(ctx, e.escala);
  if (!pool.some((m) => m.id === sub.id)) erros.push(`Substituto não concorre à escala ${e.escala.nome}.`);
  const ind = indisponibilidadeEscala(ctx, sub, e.escala, e.dataServico);
  if (ind) erros.push(`Substituto indisponível em ${e.dataServico}: ${ind.motivo}`);

  const servDia = gerarEscala(ctx, e.escala, e.dataServico, addDays(e.dataServico, 1));
  const retemDia = servDia.find((s) => s.data === e.dataServico)?.retemId;
  const retemProximo = servDia.find((s) => s.data === addDays(e.dataServico, 1))?.retemId;

  const nivelSugerido: NivelHierarquiaTroca =
    sub.id === retemDia ? 3 : sub.id === retemProximo ? 4 : mesmaDivisao(sol, sub) ? 1 : 2;

  switch (e.nivel) {
    case 1:
      if (!mesmaDivisao(sol, sub)) erros.push("Nível 1 exige substituto da mesma divisão do solicitante.");
      break;
    case 2:
      if (mesmaDivisao(sol, sub)) erros.push("Nível 2 (extra-divisão) declarado, mas o substituto é da mesma divisão: usar nível 1.");
      break;
    case 3:
      if (sub.id !== retemDia) erros.push("Nível 3 exige que o substituto seja o retém do próprio dia.");
      break;
    case 4:
      if (sub.id !== retemProximo) erros.push("Nível 4 exige que o substituto seja o retém do dia seguinte (avanço do retém).");
      break;
  }

  return { valida: erros.length === 0, cumpreAntecedencia48h, horasAntecedencia, nivelSugerido, erros };
}

