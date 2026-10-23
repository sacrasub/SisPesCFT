import { addDays, diaSemana, hojeISO } from "./dates";
import type {
  Afastamento,
  AfastamentoCategoria,
  AfastamentoStatus,
  Database,
  DivisaoId,
  EscalaConfig,
  EscalaTipo,
  EventoInstitucional,
  Militar,
  Posto,
  Restricao,
} from "./types";

export const DB_VERSION = 2;

/**
 * Dados REAIS do efetivo da Capitania Fluvial de Tabatinga (CFT).
 * Fonte: cft-itinerante / militares_seed.json — sincronizado manualmente.
 * NIPs, postos e nomes de guerra conforme o efetivo real da OM.
 * As datas de afastamento são EXEMPLOS relativos a "hoje" para demonstração.
 */
export function criarSeed(hoje: string = hojeISO()): Database {
  const T = (n: number) => addDays(hoje, n);
  const agora = new Date().toISOString();
  const ano = Number(hoje.slice(0, 4));

  // Mapeamento de posto_grad do cft-inscricoes → Posto do SisPesCFT
  const postoMap: Record<string, Posto> = {
    "CF": "CF",
    "CC": "CC",
    "CT": "CT",
    "1ºTen": "1T",
    "1ÂºTen": "1T",
    "2ºTen": "2T",
    "2ÂºTen": "2T",
    "GM": "GM",
    "SO": "SO",
    "1ºSG": "1SG",
    "1ÂGSG": "1SG",
    "2ºSG": "2SG",
    "3ºSG": "3SG",
    "CB": "CB",
    "MN": "MN",
  };

  const mil = (
    id: string,
    posto: Posto,
    nomeGuerra: string,
    nomeCompleto: string,
    nip: string,
    divisao: DivisaoId,
    escalas: EscalaTipo[] = [],
    extra: Partial<Militar> = {},
  ): Militar => ({
    id,
    nip,
    posto,
    nomeGuerra: nomeGuerra.toUpperCase(),
    nomeCompleto: toTitleCase(nomeCompleto),
    divisao,
    escalas,
    membroConselho: false,
    restricoes: [],
    ativo: true,
    createdAt: agora,
    updatedAt: agora,
    ...extra,
  });

  const res = (
    id: string,
    tipo: Restricao["tipo"],
    inicio: string,
    fim: string | null,
    descricao?: string,
  ): Restricao => ({ id, tipo, inicio, fim, descricao });

  // ─────────────────────────────────────────────────────────────────────────
  // EFETIVO REAL DA CFT — 64 militares (fonte: cft-itinerante.vercel.app)
  // Agrupamento por Divisão/Seção conforme a organização da OM.
  // ─────────────────────────────────────────────────────────────────────────
  const militares: Militar[] = [
    // ── COMANDO / GABINETE ────────────────────────────────────────────────
    mil("m01", "CF",  "HELD",        "Eduardo Guimarães de Held",        "06.0638.70", "COMANDO",  [],
        { funcao: "Capitão dos Portos", membroConselho: true }),
    mil("m02", "CC",  "DANIEL COSTA","Daniel Costa de Souza",            "87.0691.99", "COMANDO",  [],
        { especialidade: "AA", funcao: "Imediato", membroConselho: true }),
    mil("m03", "CT",  "BISPO",       "Matheus Bispo Pires da Silva",     "10.0235.51", "PESSOAL",  [],
        { especialidade: "IM", funcao: "Encarregado do Pessoal", membroConselho: true }),
    mil("m04", "2T",  "AZEVEDO",     "Leonardo Barbosa Azevedo",         "03.0294.33", "COMANDO",  [],
        { especialidade: "AA", funcao: "Adjunto de Operações" }),

    // ── SETOR DE PESSOAL ─────────────────────────────────────────────────
    mil("m05", "SO",  "SACRAMENTO",  "Cristiano do Sacramento Soares",   "97.1057.91", "PESSOAL",  [],
        { especialidade: "CI-SB", funcao: "Auxiliar Administrativo", membroConselho: false }),

    // ── DIV 10 – EPM ─────────────────────────────────────────────────────
    mil("m06", "1T",  "VÉRAS",       "Kelly Rodrigues Véras",            "21.3201.28", "EPM",      [],
        { especialidade: "RM2-T", funcao: "Encarregada da Div 10", membroConselho: true }),
    mil("m07", "1T",  "CRAVERO",     "Camila Cravero da Silva",          "21.3218.25", "EPM",      [],
        { especialidade: "RM2-T", funcao: "Adjunta / Coordenadora de Cursos" }),
    mil("m08", "1T",  "BALIEIRO",    "Luiz Henrique Costa Balieiro",     "25.0313.25", "EPM",      [],
        { especialidade: "RM2-Md", funcao: "Instrutor EPM" }),

    // ── DIV 20 – STA ─────────────────────────────────────────────────────
    // Suboficiais MO = inspetores navais / STA
    mil("m09", "SO",  "ROGERIO",     "Edson Rogerio Rosa Ribeiro dos Santos","97.0182.87","STA",   [],
        { especialidade: "HN", funcao: "Inspetor Naval", membroConselho: true }),
    mil("m10", "SO",  "FRANÇA",      "Weverton Luiz França",             "99.2056.53", "STA",      [],
        { especialidade: "MO", funcao: "Inspetor Naval" }),
    mil("m11", "SO",  "MARINO",      "Humberto Marino dos Santos Serra", "99.1860.39", "STA",      [],
        { especialidade: "PL", funcao: "Inspetor Naval" }),
    mil("m12", "SO",  "EDVALDO",     "Edvaldo Vicente de Souza",         "97.1125.42", "STA",      [],
        { especialidade: "MO", funcao: "Inspetor Naval" }),
    mil("m13", "SO",  "ROGÉRIO",     "Rogério Correia de Oliveira Júnior","01.0369.55","STA",      [],
        { especialidade: "ET-SB", funcao: "Vistoriador STA" }),
    mil("m14", "1SG", "RUBEM",       "Bruno Rodrigues Rubem",            "07.1546.58", "STA",      [],
        { especialidade: "CN", funcao: "Inspetor Naval" }),
    mil("m15", "1SG", "TIAGO",       "Tiago Gonçalves Faria",            "05.0624.38", "STA",      [],
        { especialidade: "MO-SB", funcao: "Inspetor Naval" }),
    mil("m16", "1SG", "MIGUEL",      "Miguel Angelo Nepomuceno de Lima", "06.0301.06", "STA",      [],
        { especialidade: "MT", funcao: "Inspetor Naval" }),
    mil("m17", "2SG", "TOMÁZ",       "Francisco Tomáz Vieira Angelo",    "08.0184.81", "STA",      [],
        { especialidade: "ET" }),
    mil("m18", "2SG", "NILTON",      "Nilton da Silva Carvalho Junior",  "14.0992.17", "STA",      [],
        { especialidade: "MA" }),
    mil("m19", "2SG", "PARANHOS",    "Fernando Paranhos Azevedo",        "09.0075.71", "STA",      [],
        { especialidade: "BA" }),
    mil("m20", "2SG", "RAMON",       "Ramon Guimarães Souza",            "09.0214.42", "STA",      [],
        { especialidade: "AM" }),
    mil("m21", "2SG", "MAICON",      "Maicon Aparecido Gomes da Costa",  "10.0164.73", "STA",      [],
        { especialidade: "PL" }),
    mil("m22", "2SG", "AZOLA",       "Mauro Azola Ultramar",             "11.0354.12", "STA",      [],
        { especialidade: "AR" }),
    mil("m23", "2SG", "RODRIGO",     "Rodrigo Corrêa da Costa",          "11.0261.62", "STA",      [],
        { especialidade: "ET" }),

    // ── SEÇÃO DE CONTRAMESTRES ────────────────────────────────────────────
    mil("m24", "3SG", "GERALDO",     "Emilson Pontes Geraldo",           "15.1637.33", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "QI", funcao: "Encarregado da Seção" }),
    mil("m25", "3SG", "COUSAQUIVITI","José Vinícius Ramos Fernandes Cousaquiviti","13.0332.98","CONTRAMESTRES",["CONTRAMESTRE"],
        { especialidade: "CN" }),
    mil("m26", "3SG", "DESTERRO",    "Carlos Henrique Lima do Desterro", "13.0121.18", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "DT" }),
    mil("m27", "3SG", "BARBOSA",     "Dimas Barbosa",                    "14.0052.71", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "SQ" }),
    mil("m28", "3SG", "UCHÔA",       "Welder Uchoa Silva Gomes",         "14.0170.67", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "EL" }),
    mil("m29", "3SG", "REINILSON",   "Reinilson do Nascimento Oliveira", "11.0691.55", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "EL" }),
    mil("m30", "3SG", "MATHEUS",     "Matheus Alves de Oliveira",        "14.0124.64", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MO" }),
    mil("m31", "3SG", "CLEBER",      "João Cleber da Silva Paz",         "15.0289.92", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "SQ" }),
    mil("m32", "3SG", "JONAS",       "Luiz Jonas Messias Júnior",        "87.3815.67", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MR" }),
    mil("m33", "3SG", "INÁCIO",      "Inácio Carvalho Guimarães",        "13.1220.70", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "SQ" }),
    mil("m34", "3SG", "JOÃO MARCOS", "João Marcos Farias Ramos",         "15.0234.01", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MO" }),
    mil("m35", "3SG", "TEIXEIRA",    "Rodrigo Pinto da Silva Teixeira",  "15.0193.73", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "ET" }),
    mil("m36", "3SG", "EVERTON",     "Everton Perez Mattos Ferreira",    "15.0313.57", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "EL" }),
    mil("m37", "3SG", "THOMÁZ",      "José Thomáz Feio Barroso",         "15.0308.57", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MA" }),
    mil("m38", "3SG", "ERLLEY",      "Erlley Joel França dos Santos",     "15.0362.51", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MR" }),
    mil("m39", "3SG", "MARINHO",     "Diego da Silva Marinho",           "15.0338.56", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MO" }),
    mil("m40", "3SG", "ROBSON",      "Robson Santos da Silva",           "15.0197.99", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "MC" }),
    mil("m41", "3SG", "BRUNO MARTINS","Bruno Martins Souza de Jesus",    "15.0311.01", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "CI" }),
    mil("m42", "3SG", "RIBEIRO",     "Leonardo Silva Ribeiro",           "15.0198.00", "CONTRAMESTRES", ["CONTRAMESTRE"],
        { especialidade: "CP" }),

    // ── SEÇÃO DE MOTORISTAS ───────────────────────────────────────────────
    mil("m43", "CB",  "CILAS",       "Cilas de Oliveira Santos",         "18.0073.09", "MOTORISTAS", ["MOTORISTA", "VIGIA"],
        { especialidade: "OR" }),
    mil("m44", "CB",  "IURI",        "Iuri Henrique de Mello",           "18.0139.11", "MOTORISTAS", ["MOTORISTA", "VIGIA"],
        { especialidade: "MA" }),
    mil("m45", "CB",  "WELLINGTON",  "Gustavo Wellington de Jesus Peres","18.0135.89", "MOTORISTAS", ["MOTORISTA", "CONTRAMESTRE"],
        { especialidade: "MR" }),
    mil("m46", "CB",  "ACIOLY",      "Luiz Mateus Acioly do Carmo",      "19.0099.33", "MOTORISTAS", ["MOTORISTA"],
        { especialidade: "MR" }),
    mil("m47", "CB",  "EMANOEL",     "Emanoel Ferreira Moreira",         "20.0417.48", "MOTORISTAS", ["MOTORISTA"],
        { especialidade: "MO" }),

    // ── OPERAÇÕES (RM2 — Pessoal RM2 administrativo CFT) ─────────────────
    // SOMOR L056: CB MARLA — CTR + Férias | L057: CB LIMA = THAINA — CTR rotativo
    mil("m48", "CB",  "MARLA",       "Marla Ingridh Rocha Guedes",       "25.4262.29", "CONTRAMESTRES", ["CONTRAMESTRE", "VIGIA"],
        { especialidade: "RM2-PD" }),
    mil("m49", "CB",  "LIMA",        "Thaina Lima Gomes",                "25.4248.23", "CONTRAMESTRES", ["CONTRAMESTRE", "VIGIA"],
        { especialidade: "RM2-PD" }),
    mil("m50", "CB",  "LUZIA",       "Luzia Pacífico dos Santos",        "25.4252.26", "OPERACOES", ["VIGIA"],
        { especialidade: "RM2-EF" }),
    mil("m51", "CB",  "ANDREZA",     "Andreza Pacífico Venâncio",        "25.4259.27", "OPERACOES", ["VIGIA"],
        { especialidade: "RM2-EF" }),
    // SOMOR L059-L062: CBs SQ em rodízio CTR e IN
    mil("m52", "CB",  "ANDRÉ",       "André Lucas Tavares Souza",        "21.0512.41", "CONTRAMESTRES", ["CONTRAMESTRE", "VIGIA"],
        { especialidade: "SQ" }),
    mil("m53", "CB",  "BORDUAN",     "João Luiz Borduan de Souza",       "21.0805.42", "CONTRAMESTRES", ["CONTRAMESTRE", "VIGIA"],
        { especialidade: "SQ" }),
    mil("m54", "CB",  "ÍTALO",       "Ítalo Gabriel Silva Mendes",       "21.0779.41", "CONTRAMESTRES", ["CONTRAMESTRE", "VIGIA"],
        { especialidade: "SQ" }),
    mil("m55", "CB",  "ELIAS",       "Alexandre de Oliveira Elias",      "21.0767.40", "CONTRAMESTRES", ["CONTRAMESTRE", "VIGIA"],
        { especialidade: "ES" }),

    // ── MARINHEIROS — CONTRAMESTRES / SERVIÇOS GERAIS ────────────────────
    // SOMOR L067-L076: MNs no rodízio VG1/VG2/IN conforme planilha SOMOR
    // LOPES = "GRANDE" no SOMOR, D'AVILA = "D'AVILA", HAYMAN = "PEQUENO", LEVY = "CASTRO"
    mil("m56", "MN",  "GARRIDO",     "Everton Arcanjo Garrido",          "22.1810.24", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RM-2" }),
    mil("m57", "MN",  "CARLOS",      "Carlos Henrique Rodrigues Costa",  "22.1804.27", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RM-2" }),
    mil("m58", "MN",  "DIAS",        "Mateus Dias de Almeida",           "22.1773.29", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RM-2" }),
    mil("m59", "MN",  "TANANTA",     "Gabriel da Costa Tananta",         "22.1807.29", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RM-2" }),
    mil("m60", "MN",  "GRANDE",      "Luis Antonio Grande Lopes",        "24.3773.25", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RM-2" }),
    mil("m61", "MN",  "D'AVILA",     "Janderson Vinicius da Costa D'Avila","25.3360.29","CONTRAMESTRES",["VIGIA"],
        { especialidade: "RC" }),
    mil("m62", "MN",  "DANLEY",      "Danley Ataide Angelo",             "25.3312.21", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RC" }),
    mil("m63", "MN",  "PEQUENO",     "Hayman Pequeno da Silva",          "25.3325.20", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RC" }),
    mil("m64", "MN",  "CASTRO",      "Levy de Castro Macedo",            "25.3376.29", "CONTRAMESTRES", ["VIGIA"],
        { especialidade: "RC" }),
  ];

  // ── Restrições de demonstração aplicadas a militares reais ────────────
  // (sem restrições pré-fixadas — o Setor de Pessoal lançará as reais)
  // Exemplos para demonstração do motor:
  militares.find((m) => m.id === "m30")!.restricoes = [
    res("r01", "SEM_SRAK", T(-60), T(30), "Aguardando vaga no SRAK/ESPRAC"),
  ];
  militares.find((m) => m.id === "m22")!.restricoes = [
    res("r02", "SEM_ESPRAC", T(-90), null, "Sem habilitação ESPRAC – não apto a assinar rel. IN"),
  ];
  militares.find((m) => m.id === "m44")!.restricoes = [
    res("r03", "CNH_VENCIDA", T(-5), T(10), "CNH em renovação no DETRAN-AM"),
  ];

  // ── Membros do Conselho de Gestão ─────────────────────────────────────
  (["m01", "m02", "m03", "m06", "m09"] as string[]).forEach((id) => {
    const m = militares.find((x) => x.id === id);
    if (m) m.membroConselho = true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AFASTAMENTOS — Exemplos relativos a hoje para demonstração do motor
  // ─────────────────────────────────────────────────────────────────────────
  let afSeq = 0;
  const af = (
    categoria: AfastamentoCategoria,
    divisao: DivisaoId,
    subtipo: string,
    titulo: string,
    ini: number,
    fim: number,
    militarIds: string[],
    status: AfastamentoStatus = "CONFIRMADO",
    extra: Partial<Afastamento> = {},
  ): Afastamento => ({
    id: `a${String(++afSeq).padStart(3, "0")}`,
    categoria,
    divisao,
    subtipo,
    titulo,
    inicio: T(ini),
    fim: T(fim),
    militarIds,
    status,
    impactaEscala: categoria !== "OUTRO",
    criadoPor: divisao === "PESSOAL" ? "Setor de Pessoal" : `Encarregado ${divisao}`,
    createdAt: agora,
    updatedAt: agora,
    ...extra,
  });

  const afastamentos: Afastamento[] = [
    // Em andamento
    af("MISSAO", "STA",  "Itinerância STA", "Itinerância STA – Benjamin Constant",
       -3, 3, ["m14", "m17", "m19"], "CONFIRMADO", { local: "Benjamin Constant/AM" }),
    af("MISSAO", "EPM",  "Aplicação de Exame", "Exame de Arrais-Amador – Atalaia",
        0,  1, ["m07", "m08"], "CONFIRMADO", { local: "Atalaia do Norte/AM" }),
    af("CURSO",  "CONTRAMESTRES", "Curso de Carreira", "CSIE – Tabatinga",
       -10, 40, ["m42"], "CONFIRMADO", { local: "CFT – Tabatinga/AM" }),

    // Previsões próximas
    af("MISSAO", "STA",  "Itinerância STA", "Itinerância STA – Santo Antônio do Içá",
        4, 11, ["m15", "m18", "m20"], "PREVISTO", { local: "Santo Antônio do Içá/AM" }),
    af("MISSAO", "CONTRAMESTRES", "Condução de Lancha – Apoio STA", "Apoio lancha – Itinerância STA",
        4, 11, ["m24", "m33"], "PREVISTO", { local: "Santo Antônio do Içá/AM" }),
    af("MISSAO", "MOTORISTAS", "Apoio de Transporte", "Apoio transporte – Itinerância STA",
        4, 11, ["m45"], "CONFIRMADO"),
    af("MISSAO", "EPM",  "CFAQ – Instrução", "CFAQ – Turma Benjamin Constant",
        8, 19, ["m06", "m07", "m08"], "CONFIRMADO", { local: "Benjamin Constant/AM" }),
    af("INSPECAO_NAVAL", "STA", "Operação Integrada", "Operação Integrada – Rio Javari",
       14, 18, ["m09", "m10", "m14", "m15"], "PREVISTO", { local: "Atalaia do Norte/AM" }),
    af("MISSAO", "EPM",  "Itinerância EPM", "Itinerância EPM – Atalaia do Norte",
       30, 37, ["m06", "m07"], "PREVISTO", { local: "Atalaia do Norte/AM" }),

    // Férias distribuídas pelo ano
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias", -140, -111, ["m01"]),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",  -90,  -61, ["m03"]),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   -40, -11, ["m09"]),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",    5,  19,  ["m42"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   10,  39,  ["m48"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   18,  32,  ["m06"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   28,  57,  ["m24"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   52,  81,  ["m14"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   70,  84,  ["m02"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",   90, 119,  ["m10"], "PREVISTO"),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias",  120, 149,  ["m06"], "PREVISTO"),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // ESCALAS — configuração fiel à planilha SOMOR da CFT
  // ─────────────────────────────────────────────────────────────────────────
  const segunda = addDays(hoje, -((diaSemana(hoje) + 6) % 7));
  const BLOQ_GERAL = ["MEDICA", "ADMINISTRATIVA", "DISCIPLINAR", "OUTRA"] as const;

  const escalas: EscalaConfig[] = [
    {
      id: "CONTRAMESTRE",
      nome: "Contramestre de Serviço",
      descricao: "Serviço 24h. Regime alvo 3 por 1. Escalado entre 3ºSGs e CBs MO habilitados.",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["SEM_SRAK", ...BLOQ_GERAL],
    },
    {
      id: "MOTORISTA",
      nome: "Motorista de Serviço",
      descricao: "Motorista de dia, de sobreaviso para viaturas administrativas.",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["CNH_VENCIDA", ...BLOQ_GERAL],
    },
    {
      id: "VIGIA",
      nome: "Vigia / Sentinela",
      descricao: "Dois vigias por dia (quartos alternados). Escalado entre CBs e MNs.",
      modo: "INDIVIDUAL",
      postosPorDia: 2,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: [...BLOQ_GERAL],
    },
    {
      id: "INSPECAO_NAVAL",
      nome: "Equipe de Inspeção Naval",
      descricao: "Equipes rotativas semanais (Alfa/Bravo/Charlie) de prontidão para IN. Mínimo 2 com ESPRAC.",
      modo: "EQUIPES",
      postosPorDia: 1,
      regimeAlvo: 2,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["SEM_ESPRAC", "SEM_SRAK", ...BLOQ_GERAL],
      tamanhoMinimoEquipe: 3,
      duracaoTurnoDias: 7,
      dataBaseRotacao: segunda,
      equipes: [
        // Equipe Alfa — SOs e 1SGss habilitados
        { id: "eq-alfa",    nome: "Alfa",    membros: ["m09", "m10", "m14", "m15"] },
        // Equipe Bravo — 2SGss habilitados STA
        { id: "eq-bravo",   nome: "Bravo",   membros: ["m11", "m12", "m16", "m17"] },
        // Equipe Charlie — 2SGss e 3SGss habilitados
        { id: "eq-charlie", nome: "Charlie", membros: ["m13", "m18", "m19", "m20"] },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTOS INSTITUCIONAIS
  // ─────────────────────────────────────────────────────────────────────────
  const eventos: EventoInstitucional[] = [
    { id: "ev1", tipo: "CONSELHO_GESTAO",      titulo: "Conselho de Gestão – Reunião Ordinária",           inicio: T(-9),  fim: T(-9),  exigeConselho: true },
    { id: "ev2", tipo: "CONSELHO_GESTAO",      titulo: "Conselho de Gestão – Reunião Ordinária",           inicio: T(21),  fim: T(21),  exigeConselho: true },
    { id: "ev3", tipo: "CONSELHO_GESTAO",      titulo: "Conselho de Gestão – Reunião Ordinária",           inicio: T(51),  fim: T(51),  exigeConselho: true },
    { id: "ev4", tipo: "INSPECAO_ADMINISTRATIVA", titulo: "Inspeção Administrativo-Militar (IAM)",          inicio: T(65),  fim: T(67),  exigeConselho: true },
    { id: "ev5", tipo: "CONSELHO_GESTAO",      titulo: "Conselho de Gestão – Reunião Ordinária",           inicio: T(82),  fim: T(82),  exigeConselho: true },
    { id: "ev6", tipo: "CERIMONIA",             titulo: "Dia do Marinheiro",                                inicio: `${ano}-12-13`, fim: `${ano}-12-13`, exigeConselho: false },
    { id: "ev7", tipo: "CERIMONIA",             titulo: "Dia da Capitania dos Portos do Solimões",          inicio: `${ano}-09-17`, fim: `${ano}-09-17`, exigeConselho: false },
  ];

  return {
    version: DB_VERSION,
    militares,
    afastamentos,
    escalas,
    eventos,
    parametros: {
      limiteFeriasDivisao: 0.3,
      horizonteAlertasDias: 45,
      considerarPrevistos: true,
    },
    updatedAt: agora,
  };
}

/** Converte "EDUARDO GUIMARÃES DE HELD" → "Eduardo Guimarães de Held". */
function toTitleCase(s: string): string {
  const minusculas = new Set(["de", "da", "do", "dos", "das", "e"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i === 0 || !minusculas.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
