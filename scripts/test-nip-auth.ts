import { verificarEmailAutorizado, loginComEmailFuncionalService } from "../src/lib/auth-cft";

async function testAuth() {
  console.log("--- TESTANDO AUTENTICAÇÃO POR NIP ---");
  
  // 1. SO Sacramento por NIP
  const checkSacramento = verificarEmailAutorizado("97.1057.91");
  console.log("SO Sacramento por NIP:", checkSacramento.autorizado, checkSacramento.usuario?.nome, checkSacramento.usuario?.role);
  if (!checkSacramento.autorizado || checkSacramento.usuario?.role !== "super_admin") throw new Error("Falha SO Sacramento");

  // 2. CF Held por NIP
  const checkHeld = verificarEmailAutorizado("06.0638.70");
  console.log("CF Held por NIP:", checkHeld.autorizado, checkHeld.usuario?.nome, checkHeld.usuario?.role);
  if (!checkHeld.autorizado || checkHeld.usuario?.role !== "admin") throw new Error("Falha CF Held");

  // 3. CC Daniel Costa por NIP sem pontos
  const checkDaniel = verificarEmailAutorizado("87069199");
  console.log("CC Daniel Costa (sem pontos):", checkDaniel.autorizado, checkDaniel.usuario?.nome, checkDaniel.usuario?.role);
  if (!checkDaniel.autorizado) throw new Error("Falha CC Daniel Costa");

  // 4. Login com NIP e senha padrão
  const loginRes = await loginComEmailFuncionalService("97.1057.91", "marinha123");
  console.log("Login com NIP + marinha123:", loginRes.sucesso, loginRes.usuario?.nome, loginRes.usuario?.cargo);
  if (!loginRes.sucesso) throw new Error("Falha no login com NIP");

  // 5. Bloqueio de senha incorreta
  const loginInvalido = await loginComEmailFuncionalService("97.1057.91", "senhaerrada");
  console.log("Bloqueio senha errada:", !loginInvalido.sucesso, loginInvalido.erro);
  if (loginInvalido.sucesso) throw new Error("Deveria ter bloqueado senha errada");

  // 6. Bloqueio de NIP/email inexistente
  const loginInexistente = await loginComEmailFuncionalService("00.0000.00", "marinha123");
  console.log("Bloqueio NIP inexistente:", !loginInexistente.sucesso, loginInexistente.erro);
  if (loginInexistente.sucesso) throw new Error("Deveria ter bloqueado NIP inexistente");

  console.log("✅ TODOS OS TESTES DE AUTENTICAÇÃO POR NIP/EMAIL PASSARAM!");
  process.exit(0);
}

testAuth().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
