/**
 * Motor de Cálculo e Configuração de Situação do Militar na OM
 * Compatível com o padrão do CFT-Itinerante (Ativo, Férias, Missão, Licença, Desembarcado, Inativo).
 */
import { afastamentosNoDia, type Contexto } from "./disponibilidade";
import type {
  Afastamento,
  ISODate,
  Militar,
  StatusSituacaoInfo,
  StatusSituacaoMilitar,
} from "../types";

export interface StatusSituacaoMeta {
  status: StatusSituacaoMilitar;
  label: string;
  labelTabela: string;
  badgeCls: string;
  descricao: string;
}

export const STATUS_SITUACAO_OPCOES: StatusSituacaoMeta[] = [
  {
    status: "ATIVO",
    label: "✓ Ativo / Na Escala de Serviço",
    labelTabela: "Ativo / Escala",
    badgeCls:
      "bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400",
    descricao: "Militar pronto e concorrendo normalmente às escalas de serviço.",
  },
  {
    status: "FERIAS",
    label: "🌴 Férias",
    labelTabela: "Férias",
    badgeCls:
      "bg-amber-500/15 border-amber-500/35 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400",
    descricao: "Em gozo de férias regulamentares ou acumuladas.",
  },
  {
    status: "MISSAO",
    label: "✈️ Viagem / Missão / Operação",
    labelTabela: "Viagem / Missão",
    badgeCls:
      "bg-sky-500/15 border-sky-500/35 text-sky-300 hover:bg-sky-500/25 hover:border-sky-400",
    descricao: "Em missão fluvial, comissão externa, itinerância ou destacamento.",
  },
  {
    status: "LICENCA",
    label: "🏥 Licença (LTSP / LE)",
    labelTabela: "Licença",
    badgeCls:
      "bg-purple-500/15 border-purple-500/35 text-purple-300 hover:bg-purple-500/25 hover:border-purple-400",
    descricao: "Licença médica para tratamento de saúde própria (LTS) ou familiar (LTSPF).",
  },
  {
    status: "DESEMBARCADO",
    label: "⚓ Desembarcado / Transferido",
    labelTabela: "Desembarcado",
    badgeCls:
      "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700/70 hover:border-slate-500",
    descricao: "Transferido da OM, movimentado ou na reserva.",
  },
  {
    status: "INATIVO",
    label: "🚫 Inativo / Outro Afastamento",
    labelTabela: "Inativo",
    badgeCls:
      "bg-rose-500/15 border-rose-500/35 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400",
    descricao: "Temporariamente afastado das escalas ou à disposição de outro órgão.",
  },
];

export const STATUS_SITUACAO_MAP: Record<StatusSituacaoMilitar, StatusSituacaoMeta> = {
  ATIVO: STATUS_SITUACAO_OPCOES[0],
  FERIAS: STATUS_SITUACAO_OPCOES[1],
  MISSAO: STATUS_SITUACAO_OPCOES[2],
  LICENCA: STATUS_SITUACAO_OPCOES[3],
  DESEMBARCADO: STATUS_SITUACAO_OPCOES[4],
  INATIVO: STATUS_SITUACAO_OPCOES[5],
};

/**
 * Calcula a situação real do militar na data especificada,
 * priorizando afastamentos confirmados ativos e o estado cadastral.
 */
export function obterStatusSituacao(
  ctx: Contexto,
  militar: Militar,
  data: ISODate,
): StatusSituacaoInfo {
  // 1. Desembarcado ou inativo cadastral
  if (!militar.ativo || militar.situacao === "DESEMBARCADO") {
    const meta = STATUS_SITUACAO_MAP.DESEMBARCADO;
    return {
      status: "DESEMBARCADO",
      label: meta.label,
      labelTabela: meta.labelTabela,
      badgeCls: meta.badgeCls,
      detalhe: militar.funcao?.includes("Desembarcado")
        ? militar.funcao
        : "Transferido / Desembarcado",
    };
  }

  if (militar.situacao === "INATIVO") {
    const meta = STATUS_SITUACAO_MAP.INATIVO;
    return {
      status: "INATIVO",
      label: meta.label,
      labelTabela: meta.labelTabela,
      badgeCls: meta.badgeCls,
      detalhe: "Inativo temporário",
    };
  }

  // 2. Verificar afastamentos ativos não cancelados na data
  const afs = afastamentosNoDia(ctx, militar.id, data).filter(
    (a) => a.status !== "CANCELADO",
  );

  if (afs.length > 0) {
    // Hierarquia: Férias > Licença > Missão > Outros
    const afFerias = afs.find((a) => a.categoria === "FERIAS");
    if (afFerias) {
      const meta = STATUS_SITUACAO_MAP.FERIAS;
      return {
        status: "FERIAS",
        label: meta.label,
        labelTabela: meta.labelTabela,
        badgeCls: meta.badgeCls,
        detalhe: afFerias.subtipo || afFerias.titulo,
        afastamentoAtivo: afFerias,
      };
    }

    const afLicenca = afs.find((a) => a.categoria === "LICENCA");
    if (afLicenca) {
      const meta = STATUS_SITUACAO_MAP.LICENCA;
      return {
        status: "LICENCA",
        label: meta.label,
        labelTabela: meta.labelTabela,
        badgeCls: meta.badgeCls,
        detalhe: afLicenca.subtipo || afLicenca.titulo,
        afastamentoAtivo: afLicenca,
      };
    }

    const afMissao = afs.find(
      (a) => a.categoria === "MISSAO" || a.categoria === "INSPECAO_NAVAL",
    );
    if (afMissao) {
      const meta = STATUS_SITUACAO_MAP.MISSAO;
      return {
        status: "MISSAO",
        label: meta.label,
        labelTabela: meta.labelTabela,
        badgeCls: meta.badgeCls,
        detalhe: afMissao.subtipo || afMissao.titulo,
        afastamentoAtivo: afMissao,
      };
    }

    const afOutro = afs[0];
    if (afOutro.categoria === "CURSO" || afOutro.categoria === "DISPENSA") {
      const meta = STATUS_SITUACAO_MAP.INATIVO;
      return {
        status: "INATIVO",
        label: meta.label,
        labelTabela: afOutro.subtipo || afOutro.titulo,
        badgeCls: meta.badgeCls,
        detalhe: afOutro.subtipo || afOutro.titulo,
        afastamentoAtivo: afOutro,
      };
    }
  }

  // 3. Fallback no campo situacao do militar caso não haja afastamento datado
  if (militar.situacao === "FERIAS") {
    const meta = STATUS_SITUACAO_MAP.FERIAS;
    return {
      status: "FERIAS",
      label: meta.label,
      labelTabela: meta.labelTabela,
      badgeCls: meta.badgeCls,
    };
  }
  if (
    militar.situacao === "LTS" ||
    militar.situacao === "LTSPF" ||
    militar.situacao === "LICENCA"
  ) {
    const meta = STATUS_SITUACAO_MAP.LICENCA;
    return {
      status: "LICENCA",
      label: meta.label,
      labelTabela: meta.labelTabela,
      badgeCls: meta.badgeCls,
      detalhe: militar.situacao === "LTSPF" ? "LTSPF" : "LTS",
    };
  }
  if (
    militar.situacao === "MISSAO" ||
    militar.situacao === "MISSAO_EXTERNA"
  ) {
    const meta = STATUS_SITUACAO_MAP.MISSAO;
    return {
      status: "MISSAO",
      label: meta.label,
      labelTabela: meta.labelTabela,
      badgeCls: meta.badgeCls,
    };
  }

  // 4. Default: Ativo / Na Escala
  const meta = STATUS_SITUACAO_MAP.ATIVO;
  return {
    status: "ATIVO",
    label: meta.label,
    labelTabela: meta.labelTabela,
    badgeCls: meta.badgeCls,
  };
}
