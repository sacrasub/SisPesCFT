import { PRIORIDADE_CATEGORIA, RESTRICAO_META, CATEGORIA_META, MOTIVO_DISPENSA_LABEL } from "../constants";
import { within } from "../dates";
import { nomeMilitar } from "../utils";
import type {
  Afastamento,
  AfastamentoCategoria,
  Database,
  DivisaoId,
  EscalaConfig,
  ISODate,
  Militar,
  Restricao,
  StatusPresenca,
} from "../types";

/**
 * Contexto pré-indexado para cálculos rápidos.
 * Criado uma vez por renderização (useMemo) e reutilizado por todos os motores.
 */
export interface Contexto {
  db: Database;
  militares: Militar[]; // apenas ativos
  militarMap: Map<string, Militar>;
  /** militarId -> afastamentos não cancelados */
  porMilitar: Map<string, Afastamento[]>;
}

export interface OpcoesContexto {
  /** Afastamentos adicionais (rascunho) para simulação de impacto. */
  extras?: Afastamento[];
  /** Ignora um afastamento existente (ex.: ao editar, para não contar duas vezes). */
  ignorarId?: string;
}

export function criarContexto(db: Database, opts: OpcoesContexto = {}): Contexto {
  const militares = db.militares.filter((m) => m.ativo);
  const militarMap = new Map(db.militares.map((m) => [m.id, m]));
  const porMilitar = new Map<string, Afastamento[]>();

  const lista = [...db.afastamentos.filter((a) => a.id !== opts.ignorarId), ...(opts.extras ?? [])];
  for (const a of lista) {
    if (a.status === "CANCELADO") continue;
    for (const mid of a.militarIds) {
      const arr = porMilitar.get(mid);
      if (arr) arr.push(a);
      else porMilitar.set(mid, [a]);
    }
  }
  return { db, militares, militarMap, porMilitar };
}

/* ------------------------------------------------------------------ */

export function afastamentosNoDia(ctx: Contexto, militarId: string, data: ISODate): Afastamento[] {
  return (ctx.porMilitar.get(militarId) ?? []).filter(
    (a) => a.inicio <= data && (a.terminoAsd || data <= a.fim),
  );
}

const prioridade = (c: AfastamentoCategoria) => PRIORIDADE_CATEGORIA.indexOf(c);

/** Categorias que sempre bloqueiam a escala de estado (a Equipe de IN não é bloqueada pela própria IN). */
const CATEGORIAS_BLOQUEIO_OBRIGATORIO: AfastamentoCategoria[] = ["FERIAS", "LICENCA", "MISSAO", "CURSO", "INSPECAO_NAVAL"];

export function bloqueiaEscalaDeEstado(categoria: AfastamentoCategoria, escala: EscalaConfig): boolean {
  if (escala.id === "INSPECAO_NAVAL" && categoria === "INSPECAO_NAVAL") return false;
  return CATEGORIAS_BLOQUEIO_OBRIGATORIO.includes(categoria);
}

export interface Presenca {
  status: StatusPresenca;
  afastamento?: Afastamento;
}

/** Situação do militar no dia (para o quadro de efetivo). Considera todos os lançamentos não cancelados. */
export function presenca(ctx: Contexto, militarId: string, data: ISODate): Presenca {
  const lista = afastamentosNoDia(ctx, militarId, data);
  if (!lista.length) return { status: "DISPONIVEL" };
  const principal = [...lista].sort((a, b) => prioridade(a.categoria) - prioridade(b.categoria))[0];
  return { status: principal.categoria as StatusPresenca, afastamento: principal };
}

export function restricoesAtivas(m: Militar, data: ISODate): Restricao[] {
  return m.restricoes.filter((r) => within(data, r.inicio, r.fim));
}

export type MotivoTipo = "RESTRICAO" | AfastamentoCategoria;

export interface Indisponibilidade {
  militarId: string;
  tipo: MotivoTipo;
  motivo: string;
  afastamentoId?: string;
}

/**
 * Verifica se o militar pode concorrer à escala no dia.
 * Retorna null se apto, ou o motivo da indisponibilidade.
 */
export function indisponibilidadeEscala(
  ctx: Contexto,
  m: Militar,
  escala: EscalaConfig,
  data: ISODate,
): Indisponibilidade | null {
  // 1. Verificar dispensa regulamentar OI 02-06D
  if (m.dispensaEscala && m.dispensaEscala !== "NENHUMA") {
    if (m.dispensaEscala === "RESTRICAO_MEDICA_PARCIAL" || m.restricaoMedicaArmadoOuEmPe) {
      const ehSg = ["1SG", "2SG", "3SG"].includes(m.posto);
      const ehCbMn = ["CB", "MN"].includes(m.posto);
      if (ehSg && escala.id !== "SUPERVISOR_SECOM") {
        return {
          militarId: m.id,
          tipo: "RESTRICAO",
          motivo: "Restrição Médica Parcial (OI 02-06D): redirecionar para Supervisor SECOM",
        };
      }
      if (ehCbMn && escala.id !== "IDENTIFICADOR") {
        return {
          militarId: m.id,
          tipo: "RESTRICAO",
          motivo: "Restrição Médica Parcial (OI 02-06D): redirecionar para Identificador",
        };
      }
    } else if (escala.id !== "INSPECAO_NAVAL") {
      return {
        militarId: m.id,
        tipo: "RESTRICAO",
        motivo: `Dispensado (OI 02-06D): ${MOTIVO_DISPENSA_LABEL[m.dispensaEscala]}`,
      };
    }
  }

  // 2. Verificar Trava de Papeleta de Qualificação OI 02-06D (se configurada para o posto)
  const qual = m.qualificacoesServico?.find((q) => q.posto === escala.id);
  if (qual && (!qual.papeletaConcluida || qual.servicosPraticosAcompanhados < 3 || !qual.numeroOsPublicacao)) {
    return {
      militarId: m.id,
      tipo: "RESTRICAO",
      motivo: `Trava OI 02-06D: Papeleta pendente (${qual.servicosPraticosAcompanhados}/3 svç práticos | OS: ${qual.numeroOsPublicacao ?? "Pendente"})`,
    };
  }

  // 3. Verificar restrições bloqueantes na data
  const bloqueio = restricoesAtivas(m, data).find((r) => escala.restricoesBloqueantes.includes(r.tipo));
  if (bloqueio) {
    return {
      militarId: m.id,
      tipo: "RESTRICAO",
      motivo: RESTRICAO_META[bloqueio.tipo].label + (bloqueio.descricao ? ` – ${bloqueio.descricao}` : ""),
    };
  }

  // 4. Verificar afastamentos que impactam escala.
  //    Férias, Licenças (LTS/LTSPF), Missão, Curso/Aula EPM e Inspeção Naval SEMPRE retiram o militar
  //    da escala de estado (OI 02-06D), mesmo que o lançamento esteja marcado como "não impacta escala".
  const considerarPrevistos = ctx.db.parametros.considerarPrevistos;
  const af = afastamentosNoDia(ctx, m.id, data)
    .filter(
      (a) =>
        (a.impactaEscala || bloqueiaEscalaDeEstado(a.categoria, escala)) &&
        (considerarPrevistos || a.status === "CONFIRMADO"),
    )
    .sort((a, b) => prioridade(a.categoria) - prioridade(b.categoria))[0];
  if (af) {
    return {
      militarId: m.id,
      tipo: af.categoria,
      motivo: `${CATEGORIA_META[af.categoria].label}: ${af.titulo}`,
      afastamentoId: af.id,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Trava de Paiol / Incumbência Órfã ("Acumulando Incumbência")       */
/* ------------------------------------------------------------------ */

export interface IncumbenciaAcumuladaInfo {
  titularId: string;
  titularNome: string;
  incumbencia: string;
  motivo: string;
  terminoAsd?: boolean;
  afastamentoId: string;
}

/**
 * Retorna os paióis/compartimentos/encargos que o militar está acumulando na data
 * por ter sido escalado como `militarSubstitutoId` de um militar afastado.
 */
export function obterIncumbenciasAcumuladas(
  ctx: Contexto,
  militarSubstitutoId: string,
  data: ISODate,
): IncumbenciaAcumuladaInfo[] {
  const out: IncumbenciaAcumuladaInfo[] = [];
  for (const af of ctx.db.afastamentos) {
    if (af.status === "CANCELADO") continue;
    if (af.militarSubstitutoId !== militarSubstitutoId) continue;
    if (af.inicio <= data && (af.terminoAsd || data <= af.fim)) {
      for (const tid of af.militarIds) {
        const titular = ctx.militarMap.get(tid);
        if (!titular) continue;
        const listaInc = titular.incumbencias?.length
          ? titular.incumbencias
          : [titular.funcao || titular.funcaoPrincipal || `Setor ${titular.setorCodigo ?? titular.divisao}`];
        for (const inc of listaInc) {
          out.push({
            titularId: titular.id,
            titularNome: nomeMilitar(titular),
            incumbencia: inc,
            motivo: af.subtipo || af.titulo,
            terminoAsd: af.terminoAsd,
            afastamentoId: af.id,
          });
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Resumo de efetivo (Dashboard / Painel do Comando)                   */
/* ------------------------------------------------------------------ */

export interface ResumoEfetivo {
  total: number;
  disponiveis: number;
  emMissao: number;
  missao: { STA: number; EPM: number; CURSO: number; INSPECAO_NAVAL: number; OUTRAS: number };
  ferias: number;
  licencas: number;
  comRestricao: number;
  porStatus: Record<StatusPresenca, number>;
  porDivisao: { divisao: DivisaoId; total: number; disponiveis: number; afastados: number }[];
  afastados: { militar: Militar; status: StatusPresenca; afastamento: Afastamento }[];
}

export function resumoEfetivo(ctx: Contexto, data: ISODate): ResumoEfetivo {
  const porStatus: Record<StatusPresenca, number> = {
    DISPONIVEL: 0,
    MISSAO: 0,
    CURSO: 0,
    INSPECAO_NAVAL: 0,
    FERIAS: 0,
    LICENCA: 0,
    DISPENSA: 0,
    OUTRO: 0,
  };
  const missao = { STA: 0, EPM: 0, CURSO: 0, INSPECAO_NAVAL: 0, OUTRAS: 0 };
  const divMap = new Map<DivisaoId, { divisao: DivisaoId; total: number; disponiveis: number; afastados: number }>();
  const afastados: ResumoEfetivo["afastados"] = [];
  let comRestricao = 0;

  for (const m of ctx.militares) {
    const p = presenca(ctx, m.id, data);
    porStatus[p.status]++;
    if (restricoesAtivas(m, data).length) comRestricao++;

    const d = divMap.get(m.divisao) ?? { divisao: m.divisao, total: 0, disponiveis: 0, afastados: 0 };
    d.total++;
    if (p.status === "DISPONIVEL") d.disponiveis++;
    else d.afastados++;
    divMap.set(m.divisao, d);

    if (p.afastamento) {
      afastados.push({ militar: m, status: p.status, afastamento: p.afastamento });
      if (p.status === "MISSAO") {
        if (p.afastamento.divisao === "STA") missao.STA++;
        else if (p.afastamento.divisao === "EPM") missao.EPM++;
        else missao.OUTRAS++;
      } else if (p.status === "CURSO") missao.CURSO++;
      else if (p.status === "INSPECAO_NAVAL") missao.INSPECAO_NAVAL++;
    }
  }

  return {
    total: ctx.militares.length,
    disponiveis: porStatus.DISPONIVEL,
    emMissao: porStatus.MISSAO + porStatus.CURSO + porStatus.INSPECAO_NAVAL,
    missao,
    ferias: porStatus.FERIAS,
    licencas: porStatus.LICENCA + porStatus.DISPENSA,
    comRestricao,
    porStatus,
    porDivisao: [...divMap.values()].sort((a, b) => b.total - a.total),
    afastados,
  };
}

export interface Horarios4TemposMilitar {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  statusObservacao: string;
}

/**
 * Obtém os horários da Folha de 4 Tempos de um militar específico em uma data.
 */
export function obterHorarios4TemposMilitar(
  ctx: Contexto,
  militar: Militar,
  data: ISODate,
): Horarios4TemposMilitar {
  const p = presenca(ctx, militar.id, data);
  if (p.afastamento) {
    if (p.afastamento.horarioEspecifico) {
      return {
        t1: p.afastamento.horarioEspecifico.t1,
        t2: p.afastamento.horarioEspecifico.t2,
        t3: p.afastamento.horarioEspecifico.t3,
        t4: p.afastamento.horarioEspecifico.t4,
        statusObservacao: p.afastamento.titulo || p.status,
      };
    }
    return {
      t1: "X",
      t2: "X",
      t3: "X",
      t4: "X",
      statusObservacao: p.afastamento.titulo || p.status,
    };
  }
  return {
    t1: "07:30",
    t2: "11:30",
    t3: "13:15",
    t4: "16:30",
    statusObservacao: "EXPEDIENTE NORMAL",
  };
}
