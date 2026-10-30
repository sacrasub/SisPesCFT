import { gerarFolhaPresencaDia } from "../src/lib/engine/escalas";
import { criarSeed } from "../src/lib/seed";
import { criarContexto } from "../src/lib/engine/disponibilidade";
import type { FolhaPresencaDiaRegistro, ApontamentoPresencaMilitar } from "../src/lib/types";

console.log("=== TESTE DE FOLHA DE PRESENÇA (CONTRAMESTRE & SARGENTEANTE) ===");

const HOJE = "2026-10-29";
const db = criarSeed(HOJE);

// 1. Folha automática padrão (sem apontamentos manuais)
let ctx = criarContexto(db, HOJE);
const folhaAuto = gerarFolhaPresencaDia(ctx, HOJE);
const m1 = db.militares[0];
const linhaAutoM1 = folhaAuto.find(l => l.militarId === m1.id);
console.log(`[Auto] Militar ${m1.nomeGuerra}: código = ${linhaAutoM1?.codigo}, status = ${linhaAutoM1?.statusObservacao}`);

// 2. Apontamento do Contramestre: Registrar FALTA injustificada para o militar m1
const apontamentoFalta: ApontamentoPresencaMilitar = {
  militarId: m1.id,
  status: "FALTA",
  observacao: "Chamada Matinal",
  tempo1: "FALTA",
  tempo2: "FALTA",
  tempo3: "FALTA",
  tempo4: "FALTA",
  modificadoPor: "3SG ROBSON (Contramestre)",
  modificadoEm: new Date().toISOString(),
};

// 3. Apontamento de ATRASO com chegada às 08:15 para m2
const m2 = db.militares[1];
const apontamentoAtraso: ApontamentoPresencaMilitar = {
  militarId: m2.id,
  status: "ATRASO",
  observacao: "Chegada 08:15",
  tempo1: "08:15",
  tempo2: "11:30",
  tempo3: "13:15",
  tempo4: "16:30",
  modificadoPor: "3SG ROBSON (Contramestre)",
  modificadoEm: new Date().toISOString(),
};

const folhaRegistro: FolhaPresencaDiaRegistro = {
  data: HOJE,
  statusFolha: "PREENCHIDA_CONTRAMESTRE",
  preenchidoPorNome: "3SG ROBSON (Contramestre)",
  preenchidoPorNip: "97.1057.91",
  preenchidoEm: new Date().toISOString(),
  apontamentos: {
    [m1.id]: apontamentoFalta,
    [m2.id]: apontamentoAtraso,
  },
};

db.parametros.folhasPresenca = {
  [HOJE]: folhaRegistro,
};

ctx = criarContexto(db, HOJE);
const folhaManual = gerarFolhaPresencaDia(ctx, HOJE);

const linhaM1 = folhaManual.find(l => l.militarId === m1.id);
const linhaM2 = folhaManual.find(l => l.militarId === m2.id);

if (linhaM1?.codigo !== "FALTA" || linhaM1?.tempo1 !== "FALTA") {
  console.error("ERRO: Falta apontada pelo contramestre não foi aplicada!", linhaM1);
  process.exit(1);
}
console.log(`✅ [OK] Militar ${m1.nomeGuerra} registrado como FALTA com sucesso.`);

if (linhaM2?.codigo !== "ATRASO" || linhaM2?.tempo1 !== "08:15") {
  console.error("ERRO: Atraso com horário 08:15 não foi aplicado!", linhaM2);
  process.exit(1);
}
console.log(`✅ [OK] Militar ${m2.nomeGuerra} registrado como ATRASO (08:15) com sucesso.`);

// 4. Homologação pelo Sargenteante-Geral
folhaRegistro.statusFolha = "HOMOLOGADA_SARGENTEANTE";
folhaRegistro.homologadoPorNome = "SO SACRAMENTO (Sargenteante-Geral)";
folhaRegistro.homologadoPorNip = "97.1057.91";
folhaRegistro.homologadoEm = new Date().toISOString();

db.parametros.folhasPresenca[HOJE] = folhaRegistro;
ctx = criarContexto(db, HOJE);
const folhaHomologada = gerarFolhaPresencaDia(ctx, HOJE);
const l1H = folhaHomologada.find(l => l.militarId === m1.id);

if (l1H?.codigo !== "FALTA") {
  console.error("ERRO na folha homologada!");
  process.exit(1);
}
console.log(`✅ [OK] Folha homologada pelo Sargenteante com sucesso e integridade preservada.`);
console.log("=== TODOS OS TESTES DE PRESENÇA PASSARAM COM SUCESSO! ===");
