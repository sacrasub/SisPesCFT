/**
 * SisPesCFT v2.0 — Bateria de Testes Funcionais (Motor OI 02-06D + Folha de 4 Tempos + Migração v3)
 * Execução: npx tsx scripts/test-funcional-v2.ts
 */
import { criarSeed, DB_VERSION } from "../src/lib/seed";
import { SETORES_CFT, HORARIOS_PADRAO_4_TEMPOS } from "../src/lib/constants";
import { addDays, diaSemana, eachDay } from "../src/lib/dates";
import {
  criarContexto,
  indisponibilidadeEscala,
  obterIncumbenciasAcumuladas,
  type Contexto,
} from "../src/lib/engine/disponibilidade";
import {
  gerarEscala,
  gerarDetalheDiarioOI0206D,
  gerarFolhaPresencaDia,
  gerarGradeSOMOR,
} from "../src/lib/engine/escalas";
import {
  creditoPontosOI0206D,
  alertasFeriasSemAntecedencia,
  avaliarReintegracaoDispensados,
  validarPapeletaTroca,
} from "../src/lib/engine/regrasOI0206D";
import { migrarDatabase } from "../src/lib/repository/migracao";
import type { Afastamento, Database, EscalaConfig, Militar, AfastamentoCategoria } from "../src/lib/types";

/* ------------------------------------------------------------------ */
/* Mini-runner                                                         */
/* ------------------------------------------------------------------ */

const HOJE = "2026-10-26"; // segunda-feira (data fixa para resultados determinísticos)
const DOMINGO = "2026-11-01";

interface Resultado { nome: string; ok: boolean; checks: number; falhas: string[]; }
const resultados: Resultado[] = [];
let atual: Resultado;

function check(cond: unknown, msg: string) {
  atual.checks++;
  if (!cond) atual.falhas.push(msg);
}

function teste(nome: string, fn: () => void) {
  atual = { nome, ok: true, checks: 0, falhas: [] };
  try {
    fn();
  } catch (e) {
    atual.falhas.push(`EXCEÇÃO: ${(e as Error).stack ?? e}`);
  }
  atual.ok = atual.falhas.length === 0;
  resultados.push(atual);
  console.log(`${atual.ok ? "✅ PASS" : "❌ FAIL"}  ${nome}  (${atual.checks} verificações)`);
  for (const f of atual.falhas) console.log(`      ↳ ${f}`);
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const novoDb = (): Database => criarSeed(HOJE);
const ctxDe = (db: Database) => criarContexto(db);
const escalaDe = (db: Database, id: EscalaConfig["id"]) => db.escalas.find((e) => e.id === id)!;
const mil = (db: Database, id: string) => db.militares.find((m) => m.id === id)!;

let afSeq = 0;
function afast(p: Partial<Afastamento> & { categoria: AfastamentoCategoria; militarIds: string[]; inicio: string; fim: string }): Afastamento {
  return {
    id: `t-af-${++afSeq}`,
    subtipo: p.categoria,
    titulo: `Teste ${p.categoria}`,
    divisao: "PESSOAL",
    status: "CONFIRMADO",
    impactaEscala: p.categoria !== "OUTRO",
    criadoPor: "teste",
    createdAt: "",
    updatedAt: "",
    ...p,
  };
}

/** Titulares e retém por dia/escala individual. */
function mapaServicos(ctx: Contexto, inicio: string, fim: string) {
  const out: Record<string, Map<string, { titulares: string[]; retem?: string; aptos: number; postos: number }>> = {};
  for (const esc of ctx.db.escalas.filter((e) => e.modo === "INDIVIDUAL")) {
    out[esc.id] = new Map(
      gerarEscala(ctx, esc, inicio, fim).map((s) => [s.data, { titulares: s.militarIds, retem: s.retemId, aptos: s.cobertura.aptos, postos: esc.postosPorDia }]),
    );
  }
  return out;
}

const CATEG_BLOQ: AfastamentoCategoria[] = ["FERIAS", "LICENCA", "MISSAO", "CURSO", "INSPECAO_NAVAL"];

console.log(`\nSisPesCFT v2.0 — Testes Funcionais OI 02-06D  |  data-referência ${HOJE}  |  DB_VERSION=${DB_VERSION}\n`);

/* ================================================================== */
/* 1. Integridade do Seed                                              */
/* ================================================================== */
teste("1. Integridade do Seed (DB_VERSION = 4, 64 militares, CF-01..CF-42, casos reais)", () => {
  const db = novoDb();
  check(DB_VERSION === 4 && db.version === 4, `DB_VERSION esperado 4, obtido ${db.version}`);
  check(db.militares.length === 64, `Esperados 64 militares, obtidos ${db.militares.length}`);
  check(new Set(db.militares.map((m) => m.id)).size === 64, "IDs duplicados");
  check(new Set(db.militares.map((m) => m.nip)).size === 64, "NIPs duplicados");
  const ordens = db.militares.map((m) => m.antiguidadeOrdem).sort((a, b) => a! - b!);
  check(ordens.every((o, i) => o === i + 1), "antiguidadeOrdem não é contínua 1..64");
  const setoresValidos = new Set(Object.keys(SETORES_CFT));
  const semSetor = db.militares.filter((m) => !m.setorCodigo || !setoresValidos.has(m.setorCodigo));
  check(semSetor.length === 0, `Militares sem setor CF válido: ${semSetor.map((m) => m.id).join(",")}`);

  const souza = mil(db, "m10");
  const afSouza = db.afastamentos.find((a) => a.militarIds.includes("m10") && a.categoria === "LICENCA");
  check(souza.nomeGuerra === "SOUZA" && souza.posto === "SO", "m10 deveria ser SO SOUZA");
  check(afSouza && /LTSPF/.test(afSouza.subtipo), "SO Souza sem LTSPF");
  check(afSouza?.militarSubstitutoId === "m31" && mil(db, "m31").nomeGuerra.startsWith("UCH"), "Substituto do SO Souza deveria ser 3SG Uchoa (m31)");

  const afNilton = db.afastamentos.find((a) => a.militarIds.includes("m23") && a.categoria === "LICENCA");
  check(mil(db, "m23").nomeGuerra === "NILTON" && afNilton && /LTS/.test(afNilton.subtipo), "2SG Nilton sem LTS");

  const instrutores = db.militares.filter((m) => m.instrutorEpm);
  check(instrutores.length >= 5, `Instrutores EPM insuficientes: ${instrutores.length}`);

  const mutirum = db.afastamentos.find((a) => /MUTIRUM/i.test(a.subtipo));
  check(mutirum?.categoria === "MISSAO" && mutirum.militarIds.length === 4 && mutirum.terminoAsd === true, "Missão Mutirum III (4 militares, ASD) ausente/incorreta");
});

/* ================================================================== */
/* 2. Pontuação e desempate por modernidade                            */
/* ================================================================== */
teste("2. Pontuação Normal × Domingo (1,0/0,25 × 1,5/0,5) e desempate por modernidade", () => {
  check(diaSemana(HOJE) === 1 && diaSemana(DOMINGO) === 0, "Datas de referência incorretas");
  check(creditoPontosOI0206D(HOJE, "TITULAR") === 1.0, "Titular dia útil ≠ 1,0");
  check(creditoPontosOI0206D(HOJE, "RETEM") === 0.25, "Retém dia útil ≠ 0,25");
  check(creditoPontosOI0206D(DOMINGO, "TITULAR") === 1.5, "Titular domingo ≠ 1,5");
  check(creditoPontosOI0206D(DOMINGO, "RETEM") === 0.5, "Retém domingo ≠ 0,5");
  check(creditoPontosOI0206D("2026-11-03", "TITULAR", ["2026-11-03"]) === 1.5, "Feriado cadastrado deveria pontuar 1,5");

  // Detalhe diário credita os pontos corretos
  const ctx = ctxDe(novoDb());
  const detUtil = gerarDetalheDiarioOI0206D(ctx, HOJE);
  const detDom = gerarDetalheDiarioOI0206D(ctx, DOMINGO);
  check(detUtil.itens.every((i) => i.pontosCreditadosTitular === 1.0 && (!i.militarRetemId || i.pontosCreditadosRetem === 0.25)), "Detalhe dia útil com pontuação errada");
  check(detDom.itens.every((i) => i.pontosCreditadosTitular === 1.5 && (!i.militarRetemId || i.pontosCreditadosRetem === 0.5)), "Detalhe domingo com pontuação errada");

  // Cenário sintético: 4 militares com pontos zerados, simulação iniciando no próprio dia
  const db = novoDb();
  db.parametros.dataBaseEscalas = HOJE;
  const ids = ["m29", "m30", "m31", "m32"];
  const ordens: Record<string, number> = { m29: 10, m30: 20, m31: 30, m32: 40 };
  for (const m of db.militares) {
    m.escalas = m.escalas.filter((e) => e !== "CONTRAMESTRE");
    if (ids.includes(m.id)) {
      m.escalas.push("CONTRAMESTRE");
      m.antiguidadeOrdem = ordens[m.id];
      m.pontosEscala = { normal: 0, domingoFeriado: 0, retem: 0, totalPonderado: 0 };
      m.dispensaEscala = "NENHUMA";
      m.restricoes = [];
      m.qualificacoesServico = [{ posto: "CONTRAMESTRE", papeletaConcluida: true, servicosPraticosAcompanhados: 3, numeroOsPublicacao: "OS 1/2026", habilitado: true }];
    }
  }
  db.afastamentos = db.afastamentos.filter((a) => !a.militarIds.some((id) => ids.includes(id)));
  db.trocasServico = [];
  const s = gerarEscala(ctxDe(db), escalaDe(db, "CONTRAMESTRE"), HOJE, addDays(HOJE, 2));
  // D1: todos 0 pts → mais moderno (m32, ordem 40) titular; retém m31
  check(s[0].militarIds[0] === "m32", `D1 titular esperado m32 (mais moderno), obtido ${s[0].militarIds[0]}`);
  check(s[0].retemId === "m31", `D1 retém esperado m31, obtido ${s[0].retemId}`);
  // D2: m31 tem 0,25 (retém) → entre m29/m30 com 0 pts, escala o mais moderno m30
  check(s[1].militarIds[0] === "m30", `D2 titular esperado m30 (retém pontuou 0,25), obtido ${s[1].militarIds[0]}`);
  // D3: m31 e m29 empatados em 0,25 → mais moderno m31
  check(s[2].militarIds[0] === "m31", `D3 titular esperado m31 (empate 0,25 → mais moderno), obtido ${s[2].militarIds[0]}`);
});

/* ================================================================== */
/* 3. Filtro 2×1, impedidos e estabilidade da previsão                 */
/* ================================================================== */
teste("3. Filtro 2×1 e bloqueio de impedidos em simulação de 7 dias (8 postos)", () => {
  const ctx = ctxDe(novoDb());
  const fim = addDays(HOJE, 6);
  const mapa = mapaServicos(ctx, addDays(HOJE, -2), fim);
  const dias = eachDay(HOJE, fim);

  for (const [escId, porDia] of Object.entries(mapa)) {
    for (const d of dias) {
      const hoje = porDia.get(d)!;
      const ant = [...(porDia.get(addDays(d, -1))?.titulares ?? []), ...(porDia.get(addDays(d, -2))?.titulares ?? [])];
      const repetidos = hoje.titulares.filter((id) => ant.includes(id));
      if (hoje.aptos >= 3 * hoje.postos) {
        check(repetidos.length === 0, `[${escId}] ${d}: ${repetidos.join(",")} escalado(s) sem cumprir 2×1`);
      } else {
        const cob = gerarEscala(ctx, escalaDe(ctx.db, escId as EscalaConfig["id"]), d, d)[0].cobertura.status;
        check(cob !== "OK", `[${escId}] ${d}: efetivo insuficiente para 2×1 mas cobertura reportada OK`);
      }
      for (const id of [...hoje.titulares, ...(hoje.retem ? [hoje.retem] : [])]) {
        const bloq = (ctx.porMilitar.get(id) ?? []).find(
          (a) => CATEG_BLOQ.includes(a.categoria) && a.inicio <= d && (a.terminoAsd || d <= a.fim),
        );
        check(!bloq, `[${escId}] ${d}: ${id} escalado estando em ${bloq?.categoria} (${bloq?.titulo})`);
        const m = ctx.militarMap.get(id)!;
        check(!m.dispensaEscala || m.dispensaEscala === "NENHUMA" || m.dispensaEscala === "RESTRICAO_MEDICA_PARCIAL", `[${escId}] ${d}: ${id} dispensado (${m.dispensaEscala}) foi escalado`);
      }
    }
  }
  // Casos nominais: IN diária (m15, m42) e instrutores CFAQ (m25, m54)
  const todosHoje = Object.values(mapa).flatMap((pd) => pd.get(HOJE)!.titulares);
  check(!todosHoje.includes("m15") && !todosHoje.includes("m42"), "Militar em IN Diária entrou na escala de estado");
  for (const d of eachDay(HOJE, addDays(HOJE, 4))) {
    const t = Object.values(mapa).flatMap((pd) => pd.get(d)!.titulares);
    check(!t.includes("m25") && !t.includes("m54"), `${d}: instrutor CFAQ escalado`);
  }
  // Caso determinístico: quem seria titular hoje é lançado em IN Diária (mesmo marcado "não impacta escala")
  for (const escId of ["CONTRAMESTRE", "VIGIA", "MOTORISTA"] as const) {
    const titular = mapa[escId].get(HOJE)!.titulares[0];
    const dbIN = novoDb();
    dbIN.afastamentos.push(afast({ categoria: "INSPECAO_NAVAL", militarIds: [titular], inicio: HOJE, fim: HOJE, impactaEscala: false, horarioEspecifico: { t1: "06:30", t2: "11:30", t3: "13:00", t4: "16:00" } }));
    const s = gerarEscala(ctxDe(dbIN), escalaDe(dbIN, escId), HOJE, HOJE)[0];
    check(!s.militarIds.includes(titular) && s.retemId !== titular, `[${escId}] ${titular} em IN Diária continuou escalado`);
  }
  // Estabilidade: o serviço de um dia não pode depender da janela consultada
  for (const esc of ctx.db.escalas.filter((e) => e.modo === "INDIVIDUAL")) {
    const a = gerarEscala(ctxDe(novoDb()), esc, addDays(HOJE, 3), addDays(HOJE, 3))[0].militarIds.join();
    const b = gerarEscala(ctxDe(novoDb()), esc, "2026-10-01", "2026-10-31").find((s) => s.data === addDays(HOJE, 3))!.militarIds.join();
    check(a === b, `[${esc.id}] previsão instável entre janelas (${a} × ${b})`);
  }
});

/* ================================================================== */
/* 4. Trava de qualificação e restrição médica parcial                 */
/* ================================================================== */
teste("4. Trava da Papeleta de Qualificação (3 svç + OS) e redirecionamento médico parcial", () => {
  const db = novoDb();
  const ctr = escalaDe(db, "CONTRAMESTRE");
  const pool = db.militares.filter((m) => m.escalas.includes("CONTRAMESTRE") && m.dispensaEscala === "NENHUMA");
  const [a, b] = [pool[0], pool[1]];
  a.qualificacoesServico = [{ posto: "CONTRAMESTRE", papeletaConcluida: true, servicosPraticosAcompanhados: 2, numeroOsPublicacao: "OS 1/2026", habilitado: true }];
  b.qualificacoesServico = [{ posto: "CONTRAMESTRE", papeletaConcluida: true, servicosPraticosAcompanhados: 3, numeroOsPublicacao: undefined, habilitado: true }];
  const ctx = ctxDe(db);
  check(indisponibilidadeEscala(ctx, a, ctr, HOJE)?.motivo.includes("Papeleta"), `${a.id} com 2/3 svç práticos não foi bloqueado`);
  check(indisponibilidadeEscala(ctx, b, ctr, HOJE)?.motivo.includes("Papeleta"), `${b.id} sem OS publicada não foi bloqueado`);
  const escalados = gerarEscala(ctx, ctr, HOJE, addDays(HOJE, 13)).flatMap((s) => [...s.militarIds, s.retemId]);
  check(!escalados.includes(a.id) && !escalados.includes(b.id), "Militar sem qualificação apareceu na escala (titular/retém)");

  // Restrição médica parcial
  const db2 = novoDb();
  const semAfast = (m: Militar) => !db2.afastamentos.some((a) => a.militarIds.includes(m.id)) && m.restricoes.length === 0;
  const sg = db2.militares.find((m) => ["1SG", "2SG", "3SG"].includes(m.posto) && m.escalas.includes("CONTRAMESTRE") && m.dispensaEscala === "NENHUMA" && semAfast(m))!;
  const cb = db2.militares.find((m) => ["CB", "MN"].includes(m.posto) && m.escalas.includes("VIGIA") && m.dispensaEscala === "NENHUMA" && semAfast(m))!;
  sg.dispensaEscala = "RESTRICAO_MEDICA_PARCIAL";
  cb.dispensaEscala = "RESTRICAO_MEDICA_PARCIAL";
  const ctx2 = ctxDe(db2);
  const outrosSg = db2.escalas.filter((e) => e.id !== "SUPERVISOR_SECOM" && e.modo === "INDIVIDUAL");
  const outrosCb = db2.escalas.filter((e) => e.id !== "IDENTIFICADOR" && e.modo === "INDIVIDUAL");
  check(outrosSg.every((e) => indisponibilidadeEscala(ctx2, sg, e, HOJE)?.motivo.includes("Supervisor SECOM")), `SG ${sg.id} com restrição parcial aceito fora do SUPERVISOR_SECOM`);
  check(indisponibilidadeEscala(ctx2, sg, escalaDe(db2, "SUPERVISOR_SECOM"), HOJE) === null, `SG ${sg.id} com restrição parcial recusado no SUPERVISOR_SECOM`);
  check(outrosCb.every((e) => indisponibilidadeEscala(ctx2, cb, e, HOJE)?.motivo.includes("Identificador")), `CB/MN ${cb.id} com restrição parcial aceito fora do IDENTIFICADOR`);
  check(indisponibilidadeEscala(ctx2, cb, escalaDe(db2, "IDENTIFICADOR"), HOJE) === null, `CB/MN ${cb.id} com restrição parcial recusado no IDENTIFICADOR: ${indisponibilidadeEscala(ctx2, cb, escalaDe(db2, "IDENTIFICADOR"), HOJE)?.motivo}`);
  // E, se concorrer ao IDENTIFICADOR, o motor efetivamente o escala só lá
  cb.escalas = [...new Set([...cb.escalas, "IDENTIFICADOR" as const])];
  const ctx3 = ctxDe(db2);
  const postosDoCb = db2.escalas.filter((e) => e.modo === "INDIVIDUAL").filter((e) => gerarEscala(ctx3, e, HOJE, addDays(HOJE, 13)).some((s) => s.militarIds.includes(cb.id))).map((e) => e.id);
  check(postosDoCb.every((p) => p === "IDENTIFICADOR"), `CB/MN com restrição parcial escalado em: ${postosDoCb.join(",")}`);
});

/* ================================================================== */
/* 5. Precedência da Folha de 4 Tempos + Regresso Geral                */
/* ================================================================== */
teste("5. Precedência estrita da Folha de Presença (4 Tempos) e Regresso Geral 07:00", () => {
  const H = HORARIOS_PADRAO_4_TEMPOS;
  const db = novoDb();
  const ctx = ctxDe(db);
  const ontem = addDays(HOJE, -1);
  const mapa = mapaServicos(ctx, ontem, HOJE);
  const entrando = new Map<string, string>();
  const saindo = new Map<string, string>();
  for (const [esc, pd] of Object.entries(mapa)) {
    pd.get(HOJE)!.titulares.forEach((id) => entrando.set(id, esc));
    pd.get(ontem)!.titulares.forEach((id) => saindo.set(id, esc));
  }
  const folha = new Map(gerarFolhaPresencaDia(ctx, HOJE).map((l) => [l.militarId, l]));
  const t = (id: string) => { const l = folha.get(id)!; return `${l.tempo1}|${l.tempo2}|${l.tempo3}|${l.tempo4}`; };

  // 1º Ausência integral
  check(t("m46") === "X|X|X|X" && folha.get("m46")!.prioridadeAplicada === 1, `Férias m46: ${t("m46")}`);
  check(t("m25") === "X|X|X|X", `Instrutor CFAQ m25: ${t("m25")}`);
  check(t("m13") === "X|X|X|X", `Mutirum m13: ${t("m13")}`);
  // 2º Entrando de serviço / MO
  for (const [id, esc] of entrando) {
    const l = folha.get(id)!;
    if (esc === "MOTORISTA") check(t(id) === `${H.MOTORISTA_SERVICO.t1}|${H.MOTORISTA_SERVICO.t2}|${H.MOTORISTA_SERVICO.t3}|${H.MOTORISTA_SERVICO.t4}` && l.codigo === "MO", `MO ${id}: ${t(id)}`);
    else check(l.prioridadeAplicada === 2 && l.codigo === "SVÇ", `Entrando ${esc} ${id}: prioridade ${l.prioridadeAplicada}`);
  }
  // 3º Saindo de serviço (exceto motorista e quem também entra hoje)
  for (const [id, esc] of saindo) {
    if (esc === "MOTORISTA" || entrando.has(id)) continue;
    check(t(id) === "SSVÇ|X|X|X" && folha.get(id)!.prioridadeAplicada === 3, `Saindo ${esc} ${id}: ${t(id)}`);
  }
  // 4º IN diária / faina — 5º expediente normal
  if (!saindo.has("m15")) check(t("m15") === "06:30|11:30|13:00|16:00" && folha.get("m15")!.codigo === "IN", `IN m15: ${t("m15")}`);
  if (!saindo.has("m19") && !entrando.has("m19")) check(folha.get("m19")!.codigo === "FAINA", `Faina m19: ${folha.get("m19")!.codigo}`);
  const livre = db.militares.find((m) => !entrando.has(m.id) && !saindo.has(m.id) && !(ctx.porMilitar.get(m.id) ?? []).some((a) => a.inicio <= HOJE && (a.terminoAsd || HOJE <= a.fim)))!;
  check(t(livre.id) === "07:30|11:30|13:15|16:30" && folha.get(livre.id)!.prioridadeAplicada === 5, `Expediente normal ${livre.id}: ${t(livre.id)}`);

  // Conflitos sintéticos
  const [idSaindo, escSaindo] = [...saindo].find(([id, e]) => e !== "MOTORISTA" && !entrando.has(id))!;
  const [idEntrando] = [...entrando].find(([, e]) => e !== "MOTORISTA")!;
  const [idSaindo2] = [...saindo].find(([id, e]) => e !== "MOTORISTA" && !entrando.has(id) && id !== idSaindo)!;
  // 1 > 3: férias a partir de hoje para quem sai de serviço
  // 4 < 2: faina para quem entra de serviço | 4 < 3: faina para quem sai
  const db2 = novoDb();
  db2.afastamentos.push(
    afast({ categoria: "FERIAS", militarIds: [idSaindo], inicio: HOJE, fim: addDays(HOJE, 10) }),
    afast({ categoria: "OUTRO", titulo: "FAINA", militarIds: [idEntrando, idSaindo2], inicio: HOJE, fim: HOJE, impactaEscala: false }),
  );
  const f2 = new Map(gerarFolhaPresencaDia(ctxDe(db2), HOJE).map((l) => [l.militarId, l]));
  check(f2.get(idSaindo)!.prioridadeAplicada === 1 && f2.get(idSaindo)!.tempo1 === "X", `1º>3º falhou para ${idSaindo} (${escSaindo})`);
  check(f2.get(idEntrando)!.prioridadeAplicada === 2, `2º>4º falhou para ${idEntrando}: prioridade ${f2.get(idEntrando)!.prioridadeAplicada}`);
  check(f2.get(idSaindo2)!.prioridadeAplicada === 3, `3º>4º falhou para ${idSaindo2}: prioridade ${f2.get(idSaindo2)!.prioridadeAplicada}`);

  // 2 > 3: papeleta força quem saiu ontem a entrar hoje (mesmo posto)
  const db3 = novoDb();
  const escCtr = "CONTRAMESTRE";
  const ctrOntem = mapa[escCtr].get(ontem)!.titulares[0];
  const ctrHoje = mapa[escCtr].get(HOJE)!.titulares[0];
  db3.trocasServico = [{ id: "t-tr", numeroSequencial: "T/1", dataServicoOriginal: HOJE, posto: escCtr, militarSolicitanteId: ctrHoje, militarSubstitutoId: ctrOntem, nivelHierarquia: 1, dataSolicitacao: addDays(HOJE, -5), cumpreAntecedencia48h: true, motivoJustificativa: "teste", statusAprovacaoAjudante: "AUTORIZADO_CF02" }];
  const f3 = new Map(gerarFolhaPresencaDia(ctxDe(db3), HOJE).map((l) => [l.militarId, l]));
  check(f3.get(ctrOntem)!.prioridadeAplicada === 2, `2º>3º falhou: ${ctrOntem} saindo e entrando ficou com prioridade ${f3.get(ctrOntem)!.prioridadeAplicada}`);

  // Regresso Geral
  const db4 = novoDb();
  db4.parametros.regressoGeralAtivo = true;
  const f4 = gerarFolhaPresencaDia(ctxDe(db4), HOJE);
  const f4m = new Map(f4.map((l) => [l.militarId, l]));
  check(f4.filter((l) => l.prioridadeAplicada === 5).every((l) => l.tempo1 === "07:00"), "Regresso Geral não aplicou 07:00 no expediente normal");
  check(f4m.get(livre.id)!.tempo1 === "07:00", "Regresso Geral não aplicado ao militar livre");
  for (const [id, l] of folha) {
    if (l.prioridadeAplicada === 1) check(f4m.get(id)!.tempo1 === "X" && f4m.get(id)!.prioridadeAplicada === 1, `Regresso Geral sobrescreveu ausência integral de ${id}`);
  }
  check(f4m.get(idSaindo)!.tempo1 === "07:00", `Regresso Geral deveria convocar quem sai de serviço (${idSaindo}): ${f4m.get(idSaindo)!.tempo1}`);
});

/* ================================================================== */
/* 6. Incumbência órfã, ASD e alerta de 8 dias                         */
/* ================================================================== */
teste("6. Trava de Paiol/Incumbência órfã com ASD e alerta de férias < 8 dias", () => {
  const db = novoDb();
  const titular = db.militares.find((m) => (m.incumbencias?.length ?? 0) > 0 && !db.afastamentos.some((a) => a.militarIds.includes(m.id)))!;
  const substituto = db.militares.find((m) => m.id !== titular.id && !db.afastamentos.some((a) => a.militarSubstitutoId === m.id || a.militarIds.includes(m.id)))!;
  // ASD: fim original no passado, mas término "Até Segunda Determinação"
  db.afastamentos.push(afast({ categoria: "MISSAO", subtipo: "COMISSÃO ASD", militarIds: [titular.id], inicio: addDays(HOJE, -20), fim: addDays(HOJE, -10), terminoAsd: true, militarSubstitutoId: substituto.id }));
  const ctx = ctxDe(db);
  const acum = obterIncumbenciasAcumuladas(ctx, substituto.id, HOJE);
  check(acum.length === titular.incumbencias!.length, `Substituto deveria acumular ${titular.incumbencias!.length} incumbência(s), acumula ${acum.length}`);
  check(acum.every((i) => i.terminoAsd && i.titularId === titular.id), "Incumbências acumuladas sem flag ASD/titular");
  const linha = gerarFolhaPresencaDia(ctx, HOJE).find((l) => l.militarId === substituto.id)!;
  check(linha.incumbenciasAcumuladas.length > 0, "Folha de 4 Tempos não exibe 'Acumulando Incumbência' do substituto");
  check(gerarFolhaPresencaDia(ctx, HOJE).find((l) => l.militarId === titular.id)!.tempo1 === "X", "Titular em ASD deveria constar ausente (X)");

  // Sem ASD e já encerrado: não acumula
  const db2 = novoDb();
  db2.afastamentos.push(afast({ categoria: "MISSAO", militarIds: [titular.id], inicio: addDays(HOJE, -20), fim: addDays(HOJE, -10), terminoAsd: false, militarSubstitutoId: substituto.id }));
  check(obterIncumbenciasAcumuladas(ctxDe(db2), substituto.id, HOJE).length === 0, "Afastamento encerrado sem ASD continua gerando acúmulo");

  // Alerta 8 dias
  const fer = (ini: number) => afast({ categoria: "FERIAS", militarIds: [titular.id], inicio: addDays(HOJE, ini), fim: addDays(HOJE, ini + 29) });
  const [f0, f5, f7, f8, f10] = [fer(0), fer(5), fer(7), fer(8), fer(10)];
  const alertas = alertasFeriasSemAntecedencia([f0, f5, f7, f8, f10], HOJE).map((a) => a.id);
  check(alertas.includes(f0.id) && alertas.includes(f5.id) && alertas.includes(f7.id), "Férias com < 8 dias não alertadas");
  check(!alertas.includes(f8.id) && !alertas.includes(f10.id), "Férias com ≥ 8 dias alertadas indevidamente");
});

/* ================================================================== */
/* 7. Reintegração de dispensados e Detalhe CAV/Reação                 */
/* ================================================================== */
teste("7. Alerta de reintegração (4×1 SO / 2×1 geral) e Detalhe de Emergência CAV/Reação", () => {
  const db = novoDb();
  const ctr = escalaDe(db, "CONTRAMESTRE");
  const pool = db.militares.filter((m) => m.escalas.includes("CONTRAMESTRE"));
  check(avaliarReintegracaoDispensados(ctxDe(db), ctr, HOJE) === null || pool.length < 4, "Alerta de reintegração disparado com efetivo normal");
  // Um dispensado (Mestre) concorre à escala; todos menos 2 aptos entram em missão
  const mestre = db.militares.find((m) => m.dispensaEscala === "MESTRE")!;
  mestre.escalas = [...new Set([...mestre.escalas, "CONTRAMESTRE" as const])];
  const aptos = pool.filter((m) => !indisponibilidadeEscala(ctxDe(db), m, ctr, HOJE));
  const fora = aptos.slice(2).map((m) => m.id);
  db.afastamentos.push(afast({ categoria: "MISSAO", militarIds: fora, inicio: HOJE, fim: addDays(HOJE, 5) }));
  const ctx = ctxDe(db);
  const alerta = avaliarReintegracaoDispensados(ctx, ctr, HOJE);
  check(alerta !== null, "Redução crítica do efetivo não disparou o alerta de reintegração");
  check(alerta?.aptos === 2 && alerta.regime === 1 && alerta.limite === 2, `Alerta com números incorretos: ${JSON.stringify(alerta && { aptos: alerta.aptos, regime: alerta.regime, limite: alerta.limite })}`);
  check(alerta?.candidatosReintegracao.includes(mestre.id), "Mestre dispensado não listado como candidato à reintegração");
  check(gerarDetalheDiarioOI0206D(ctx, HOJE).alertasSegurancaEscala.some((a) => a.includes("reintegração")), "Detalhe Diário não exibe o alerta de reintegração");

  // Escala só de SO usa limite 4×1
  const db2 = novoDb();
  const sos = db2.militares.filter((m) => m.posto === "SO").slice(0, 4);
  const esSO: EscalaConfig = { ...escalaDe(db2, "CONTRAMESTRE"), id: "CONTRAMESTRE", restricoesBloqueantes: [] };
  for (const m of db2.militares) m.escalas = m.escalas.filter((e) => e !== "CONTRAMESTRE");
  for (const m of sos) { m.escalas.push("CONTRAMESTRE"); m.dispensaEscala = "NENHUMA"; m.qualificacoesServico = []; m.restricoes = []; }
  db2.afastamentos = db2.afastamentos.filter((a) => !a.militarIds.some((id) => sos.some((s) => s.id === id)));
  const alSO = avaliarReintegracaoDispensados(ctxDe(db2), esSO, HOJE);
  check(alSO?.ehEscalaDeSO && alSO.limite === 4 && alSO.regime === 3, `Escala de SO (4 aptos = 3×1) deveria alertar com limite 4×1: ${JSON.stringify(alSO && { so: alSO.ehEscalaDeSO, limite: alSO.limite, regime: alSO.regime })}`);

  // Detalhe CAV/Reação completo por 7 dias
  const ctxN = ctxDe(novoDb());
  for (const d of eachDay(HOJE, addDays(HOJE, 6))) {
    const det = gerarDetalheDiarioOI0206D(ctxN, d).detalheEmergencia;
    const ids = [...Object.entries(det.grupoCav), ...Object.entries(det.grupoReacao)];
    for (const [k, v] of ids) check(typeof v === "string" && v.length > 0 && ctxN.militarMap.has(v), `${d}: posto ${k} sem militar válido (${v})`);
  }
});

/* ================================================================== */
/* 8. Migração v2/v3 → v4 por NIP e Papeleta de Troca                 */
/* ================================================================== */
teste("8. Migração segura por NIP (v2/v3 → v4) e Papeleta de Troca (48h + 4 níveis)", () => {
  const seed = novoDb();
  // Base v2 simulada: IDs antigos diferentes, sem os campos v2.0
  const v2: Database = clone(seed);
  v2.version = 2;
  v2.militares = v2.militares.map((m) => {
    const { antiguidadeOrdem, setorCodigo, qualificacoesServico, incumbencias, dispensaEscala, ...resto } = m;
    void antiguidadeOrdem; void setorCodigo; void qualificacoesServico; void incumbencias; void dispensaEscala;
    return { ...resto, id: `old-${m.id}`, pontosEscala: m.id === "m29" ? { normal: 9, domingoFeriado: 3, retem: 1, totalPonderado: 13 } : undefined } as Militar;
  });
  v2.afastamentos = [
    ...v2.afastamentos.map((a) => ({ ...a, militarIds: a.militarIds.map((id) => `old-${id}`) })),
    afast({ id: "custom-001", categoria: "MISSAO", subtipo: "BRACOLPER", militarIds: ["old-m29"], inicio: addDays(HOJE, 3), fim: addDays(HOJE, 8), militarSubstitutoId: "old-m30" }),
  ];
  v2.trocasServico = [{ id: "tr-old", numeroSequencial: "001/2026", dataServicoOriginal: addDays(HOJE, 4), posto: "CONTRAMESTRE", militarSolicitanteId: "old-m31", militarSubstitutoId: "old-m32", nivelHierarquia: 1, dataSolicitacao: HOJE, cumpreAntecedencia48h: true, motivoJustificativa: "v2", statusAprovacaoAjudante: "PENDENTE_CF02" }];
  v2.parametros.regressoGeralAtivo = true;

  const mig = migrarDatabase(v2, criarSeed(HOJE));
  check(mig.version === 4, `Versão migrada ${mig.version}`);
  check(mig.militares.length === 64 && mig.militares.every((m) => m.setorCodigo && m.antiguidadeOrdem && m.qualificacoesServico), "Campos v2.0 não carregados nos 64 militares");
  check(mig.militares.every((m) => !m.id.startsWith("old-")), "IDs antigos permaneceram nos militares");
  check(mil(mig, "m29").pontosEscala?.normal === 9, "Saldo de pontos do militar não preservado");
  const custom = mig.afastamentos.find((a) => a.id === "custom-001");
  check(custom && custom.militarIds[0] === "m29" && custom.militarSubstitutoId === "m30", `Lançamento customizado não preservado/remapeado: ${JSON.stringify(custom && { ids: custom.militarIds, sub: custom.militarSubstitutoId })}`);
  check(mig.afastamentos.filter((a) => /^a0\d\d$/.test(a.id)).length === seed.afastamentos.length, "Afastamentos do seed duplicados ou perdidos");
  check(mig.afastamentos.some((a) => a.titulo.includes("Amaturá")), "Afastamentos de Amaturá presentes após migração para v4");
  const tr = mig.trocasServico?.find((t) => t.id === "tr-old");
  check(tr && tr.militarSolicitanteId === "m31" && tr.militarSubstitutoId === "m32", "Papeleta antiga não preservada/remapeada");
  check(mig.parametros.regressoGeralAtivo === true, "Parâmetros do usuário não preservados");
  check(mig.afastamentos.every((a) => a.militarIds.every((id) => mig.militares.some((m) => m.id === id))), "Afastamento referenciando militar inexistente após migração");

  // Papeleta de Troca
  const db = novoDb();
  db.trocasServico = [];
  const ctx = ctxDe(db);
  const ctr = escalaDe(db, "CONTRAMESTRE");
  const D = addDays(HOJE, 3);
  const [sD, sD1] = gerarEscala(ctx, ctr, D, addDays(D, 1));
  const sol = sD.militarIds[0];
  const base = { hoje: HOJE, dataServico: D, escala: ctr, solicitanteId: sol };
  const v3 = validarPapeletaTroca(ctx, { ...base, substitutoId: sD.retemId!, nivel: 3 });
  check(v3.valida && v3.cumpreAntecedencia48h && v3.horasAntecedencia === 72, `Nível 3 (retém do dia) deveria ser válido: ${v3.erros.join("; ")}`);
  const v4 = validarPapeletaTroca(ctx, { ...base, substitutoId: sD1.retemId!, nivel: 4 });
  check(v4.valida || sD1.retemId === sD.retemId, `Nível 4 (avanço do retém) deveria ser válido: ${v4.erros.join("; ")}`);
  check(!validarPapeletaTroca(ctx, { ...base, substitutoId: sD.retemId!, nivel: 4 }).valida || sD1.retemId === sD.retemId, "Nível 4 aceito com retém do próprio dia");
  const solM = ctx.militarMap.get(sol)!;
  const grupo = (m: Militar) => (m.setorCodigo ?? "").slice(0, 4);
  const aptosPool = ctx.militares.filter((m) => m.escalas.includes("CONTRAMESTRE") && m.id !== sol && m.id !== sD.retemId && m.id !== sD1.retemId && !indisponibilidadeEscala(ctx, m, ctr, D));
  const mesma = aptosPool.find((m) => grupo(m) === grupo(solM));
  const outra = aptosPool.find((m) => grupo(m) !== grupo(solM))!;
  if (mesma) {
    const v1 = validarPapeletaTroca(ctx, { ...base, substitutoId: mesma.id, nivel: 1 });
    check(v1.valida, `Nível 1 intra-divisão deveria ser válido: ${v1.erros.join("; ")}`);
    check(!validarPapeletaTroca(ctx, { ...base, substitutoId: mesma.id, nivel: 3 }).valida, "Nível 3 aceito com substituto que não é o retém");
  }
  check(!validarPapeletaTroca(ctx, { ...base, substitutoId: outra.id, nivel: 1 }).valida, "Nível 1 aceito com substituto de outra divisão");
  const v2b = validarPapeletaTroca(ctx, { ...base, substitutoId: outra.id, nivel: 2 });
  check(v2b.valida && v2b.nivelSugerido === 2, `Nível 2 extra-divisão deveria ser válido: ${v2b.erros.join("; ")}`);
  const v48 = validarPapeletaTroca(ctx, { ...base, dataServico: addDays(HOJE, 1), substitutoId: outra.id, nivel: 2 });
  check(!v48.valida && !v48.cumpreAntecedencia48h && v48.horasAntecedencia === 24, "Troca com 24h de antecedência aceita");
  check(validarPapeletaTroca(ctx, { ...base, dataServico: addDays(HOJE, 2), substitutoId: outra.id, nivel: 2 }).cumpreAntecedencia48h, "Troca com exatas 48h recusada");
  const impedido = db.militares.find((m) => m.id === "m46")!; // em férias
  check(!validarPapeletaTroca(ctx, { ...base, substitutoId: impedido.id, nivel: 2 }).valida, "Substituto em férias aceito");
  check(!validarPapeletaTroca(ctx, { ...base, substitutoId: sol, nivel: 1 }).valida, "Troca consigo mesmo aceita");

  // Papeleta autorizada é aplicada pelo motor
  db.trocasServico = [{ id: "tr-x", numeroSequencial: "X", dataServicoOriginal: D, posto: "CONTRAMESTRE", militarSolicitanteId: sol, militarSubstitutoId: outra.id, nivelHierarquia: 2, dataSolicitacao: HOJE, cumpreAntecedencia48h: true, motivoJustificativa: "t", statusAprovacaoAjudante: "AUTORIZADO_CF02" }];
  const apl = gerarEscala(ctxDe(db), ctr, D, D)[0];
  check(apl.militarIds.includes(outra.id) && !apl.militarIds.includes(sol) && apl.trocaAutorizada, "Papeleta autorizada não aplicada na escala");

  // Grade SOMOR coerente com a Folha (mesma fonte de verdade)
  const ctxG = ctxDe(novoDb());
  const grade = gerarGradeSOMOR(ctxG, "CONTRAMESTRE", 2026, 9);
  const idx = grade.cabecalhos.findIndex((c) => c.data === HOJE);
  const naGrade = grade.linhas.filter((l) => l.celulas[idx].sigla === "CTR").map((l) => l.militar.id);
  const naFolha = gerarFolhaPresencaDia(ctxG, HOJE).filter((l) => l.statusObservacao.includes("(CONTRAMESTRE)")).map((l) => l.militarId);
  check(naFolha.every((id) => naGrade.includes(id)), `Grade SOMOR (${naGrade}) diverge da Folha (${naFolha}) no Contramestre de ${HOJE}`);
});

/* ------------------------------------------------------------------ */
const aprovados = resultados.filter((r) => r.ok).length;
const totalChecks = resultados.reduce((s, r) => s + r.checks, 0);
console.log(`\nResultado: ${aprovados}/${resultados.length} testes aprovados — ${totalChecks} verificações executadas.\n`);
process.exit(aprovados === resultados.length ? 0 : 1);
