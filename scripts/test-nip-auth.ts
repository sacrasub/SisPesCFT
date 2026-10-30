// Mock window e localStorage ANTES dos imports dinâmicos
const storage: Record<string, string> = {};
(globalThis as any).window = {
  location: { hostname: "localhost" },
  crypto: globalThis.crypto,
  localStorage: {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
  },
};

async function run() {
  const {
    verificarEmailAutorizado,
    loginComEmailFuncionalService,
    salvarNovaSenhaUsuario,
    obterStatusSenhaUsuarioAsync,
    resetarSenhaParaPadrao,
    KEY_SENHAS_CACHE,
  } = await import("../src/lib/auth-cft");

  const {
    registrarFalhaLogin,
    verificarBloqueioLogin,
    limparFalhasLogin,
    mascararEmail,
    mascararTelefone,
  } = await import("../src/lib/security");

  console.log("=== 1. TESTE DE AUTENTICAÇÃO POR NIP / E-MAIL ===");
  
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
  console.log("Login com NIP + marinha123:", loginRes.sucesso, loginRes.usuario?.nome);
  if (!loginRes.sucesso) throw new Error("Falha no login com NIP");

  console.log("\n=== 2. TESTE DE CRIPTOGRAFIA DE SENHAS (SHA-256 COM SALT) ===");
  const emailTeste = "cristiano.sacramento@marinha.mil.br";
  const novaSenhaTeste = "CorvetaTabatinga2026!";

  // Grava nova senha criptografada
  await salvarNovaSenhaUsuario(emailTeste, novaSenhaTeste);
  const cacheGravado = JSON.parse(storage[KEY_SENHAS_CACHE] || "{}");
  console.log("Registro no storage (nunca deve conter texto puro):", cacheGravado[emailTeste]);

  if (typeof cacheGravado[emailTeste] !== "object" || !cacheGravado[emailTeste].hash) {
    throw new Error("Falha: Senha não foi armazenada com hash criptográfico!");
  }
  if (JSON.stringify(cacheGravado).includes(novaSenhaTeste)) {
    throw new Error("VULNERABILIDADE CRÍTICA: Senha em texto puro encontrada no cache!");
  }
  console.log("✅ Proteção validada: Senha em texto puro NÃO existe no storage.");

  // Validação com nova senha
  const statusNovaSenha = await obterStatusSenhaUsuarioAsync(emailTeste);
  const okComNova = await statusNovaSenha.validarSenha(novaSenhaTeste);
  const erroComAntiga = await statusNovaSenha.validarSenha("marinha123");
  console.log("Login com nova senha criptografada:", okComNova);
  console.log("Bloqueio da senha antiga:", !erroComAntiga);
  if (!okComNova || erroComAntiga) throw new Error("Falha na validação da nova senha criptografada");

  // Reset de volta para padrão
  resetarSenhaParaPadrao(emailTeste);

  console.log("\n=== 3. TESTE DE PROTEÇÃO ANTI-FORÇA BRUTA (RATE LIMITING) ===");
  const nipBrute = "99.9999.99";
  limparFalhasLogin(nipBrute);

  // 4 tentativas incorretas não devem bloquear
  for (let i = 1; i <= 4; i++) {
    const res = registrarFalhaLogin(nipBrute);
    if (res.bloqueado) throw new Error(`Não deveria bloquear na tentativa ${i}`);
  }
  console.log("Tentativas 1 a 4: permitido com aviso de tentativas restantes");

  // A 5ª tentativa consecutiva DEVE bloquear por 60s
  const res5 = registrarFalhaLogin(nipBrute);
  console.log("5ª tentativa incorreta bloqueada?", res5.bloqueado, `Segundos restantes: ${res5.segundosRestantes}`);
  if (!res5.bloqueado) throw new Error("Deveria ter bloqueado na 5ª tentativa falha!");
  limparFalhasLogin(nipBrute);

  console.log("\n=== 4. TESTE DE MASCARAMENTO LGPD ===");
  const emailMascarado = mascararEmail("sacrasub@gmail.com");
  const telMascarado = mascararTelefone("(97) 99123-4567");
  console.log("E-mail mascarado:", emailMascarado);
  console.log("Telefone mascarado:", telMascarado);

  if (emailMascarado !== "sac***@gmail.com" || telMascarado.includes("9123")) {
    throw new Error("Falha no mascaramento LGPD");
  }
  console.log("✅ Mascaramento LGPD validado com sucesso.");

  console.log("\n🎯 TODOS OS TESTES DE BLINDAGEM DE SEGURANÇA FORAM APROVADOS COM 100% DE SUCESSO!");
}

run().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
