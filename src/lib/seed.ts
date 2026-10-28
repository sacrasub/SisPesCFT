import { addDays, diaSemana, hojeISO } from "./dates";
import { DB_VERSION } from "./constants";
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
  QualificacaoPostoServico,
  Restricao,
} from "./types";

export { DB_VERSION };

/**
 * Dados REAIS do efetivo da Capitania Fluvial de Tabatinga (CFT) — v2.0 (DB_VERSION = 3).
 * Consolidado a partir dos cadernos "Plano Semanal da CFT" e "Escala de Serviço da Tripulação" (OI 02-06D).
 * Contém os 64 militares reais com NIPs, e-mails funcionais/pessoais, setores CF-01 a CF-42,
 * incumbências/paióis, instrutores EPM, qualificações de serviço e pontuação OI 02-06D.
 */
export function criarSeed(hoje: string = hojeISO()): Database {
  const T = (n: number) => addDays(hoje, n);
  const agora = new Date().toISOString();
  const ano = Number(hoje.slice(0, 4));

  let ordemSeq = 0;

  const criarQualificacoes = (
    escalas: EscalaTipo[],
    pendentePosto?: EscalaTipo,
  ): QualificacaoPostoServico[] =>
    escalas.map((posto) => {
      if (pendentePosto && posto === pendentePosto) {
        return {
          posto,
          papeletaConcluida: false,
          servicosPraticosAcompanhados: 1,
          numeroOsPublicacao: undefined,
          habilitado: true,
        };
      }
      return {
        posto,
        papeletaConcluida: true,
        servicosPraticosAcompanhados: 4,
        numeroOsPublicacao: "OS nº 04/2026",
        habilitado: true,
      };
    });

  const mil = (
    id: string,
    posto: Posto,
    nomeGuerra: string,
    nomeCompleto: string,
    nip: string,
    divisao: DivisaoId,
    escalas: EscalaTipo[] = [],
    extra: Partial<Militar> = {},
  ): Militar => {
    const ordem = ++ordemSeq;
    const ptsNorm = Number(((ordem % 5) * 1.0).toFixed(2));
    const ptsDom = Number(((ordem % 3) * 1.5).toFixed(2));
    const ptsRet = Number(((ordem % 2) * 0.25).toFixed(2));
    return {
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
      antiguidadeOrdem: ordem,
      funcaoPrincipal: extra.funcao || "Serviço Geral / Bordo",
      incumbencias: [],
      instrutorEpm: false,
      areasInstrutoria: [],
      qualificacoesServico: criarQualificacoes(escalas),
      dispensaEscala: "NENHUMA",
      pontosEscala: {
        normal: ptsNorm,
        domingoFeriado: ptsDom,
        retem: ptsRet,
        totalPonderado: Number((ptsNorm + ptsDom + ptsRet).toFixed(2)),
      },
      situacao: "PRONTO",
      ...extra,
    };
  };

  const res = (
    id: string,
    tipo: Restricao["tipo"],
    inicio: string,
    fim: string | null,
    descricao?: string,
  ): Restricao => ({ id, tipo, inicio, fim, descricao });

  // ─────────────────────────────────────────────────────────────────────────
  // EFETIVO REAL DA CFT — 64 militares ordenados por antiguidade (01 a 64)
  // ─────────────────────────────────────────────────────────────────────────
  const militares: Militar[] = [
    // ── 01 a 07: OFICIAIS ─────────────────────────────────────────────────
    mil("m01", "CF", "HELD", "Eduardo Guimarães de Held", "06.0638.70", "COMANDO", [], {
      setorCodigo: "CF-01",
      funcao: "Capitão dos Portos",
      funcaoPrincipal: "Capitão dos Portos / Comandante da OM",
      incumbencias: ["Direção Geral do Serviço", "Presidência do Conselho de Gestão (CF-06)"],
      membroConselho: true,
      emailFuncional: "eduardo.held@marinha.mil.br",
    }),
    mil("m02", "CC", "DANIEL COSTA", "Daniel Costa de Souza", "87.0691.99", "COMANDO", [], {
      especialidade: "AA",
      setorCodigo: "CF-02",
      setorSecundario: "CF-06",
      funcao: "Ajudante / Imediato",
      funcaoPrincipal: "Ajudante da Capitania / Vice-Comandante",
      incumbencias: ["Controle de OIs (CF-02)", "Autorização de Papeletas de Troca (OI 02-06D)"],
      membroConselho: true,
      emailFuncional: "daniel.costa@marinha.mil.br",
      emailPessoal: "danielcosta@hotmail.com",
    }),
    mil("m03", "CT", "BISPO", "Matheus Bispo Pires da Silva", "10.0235.51", "INTENDENCIA", ["OSE"], {
      especialidade: "IM",
      setorCodigo: "CF-30",
      setorSecundario: "CF-32",
      funcao: "Encarregado da Div. de Apoio / Intendência",
      funcaoPrincipal: "Encarregado da Divisão de Apoio (CF-30) e Intendência (CF-32)",
      incumbencias: ["Execução Financeira (OI 30-14A)", "Licitações (OI 30-03)", "Logística NPaFlu/NAsH"],
      membroConselho: true,
      emailFuncional: "matheus.bispo@marinha.mil.br",
      emailPessoal: "m.bisporj@gmail.com",
    }),
    mil("m04", "1T", "VÉRAS", "Kelly Rodrigues Véras", "21.3201.28", "STA", ["OSE"], {
      especialidade: "RM2-T",
      setorCodigo: "CF-20",
      setorSecundario: "CF-30",
      funcao: "Encarregada da STA / Subst. Intendência",
      funcaoPrincipal: "Encarregada da Divisão de STA / Substituta do CT Bispo",
      incumbencias: ["Coordenação de Operações Fluviais", "Segurança da Navegação"],
      membroConselho: true,
      emailFuncional: "kelly.veras@marinha.mil.br",
    }),
    mil("m05", "1T", "CRAVERO", "Camila Cravero da Silva", "21.3218.25", "EPM", ["OSE"], {
      especialidade: "RM2-T",
      setorCodigo: "CF-10",
      setorSecundario: "CF-20",
      funcao: "Encarregada da Div 10 (EPM) / STA",
      funcaoPrincipal: "Encarregada da Divisão do EPM (CF-10) / Divisão de STA (CF-20)",
      incumbencias: ["Gestão do PREPOM", "Coordenação de Cursos Aquaviários"],
      membroConselho: true,
      emailFuncional: "camila.cravero@marinha.mil.br",
      emailPessoal: "camilacravero.silva@gmail.com",
    }),
    mil("m06", "1T", "BALIEIRO", "Luiz Henrique Costa Balieiro", "25.0313.25", "PESSOAL", ["OSE"], {
      especialidade: "RM2-Md",
      setorCodigo: "CF-34",
      setorSecundario: "CF-10",
      funcao: "Médico da OM / Sala DOC",
      funcaoPrincipal: "Encarregado da Seção de Saúde (CF-34) / Instrutor EPM",
      incumbencias: ["Sala DOC", "Controle de Licenças Médicas (LTS/LTSPF)"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ", "CAV_PSO"],
      emailFuncional: "balieiro.costa@marinha.mil.br",
    }),
    mil("m07", "2T", "AZEVEDO", "Leonardo Barbosa Azevedo", "03.0294.33", "STA", ["OSE"], {
      especialidade: "AA",
      setorCodigo: "CF-20",
      setorSecundario: "CF-02",
      funcao: "Oficial Ajudante / Instrutor SegOrg",
      funcaoPrincipal: "Coordenador de Adestramentos e Segurança Orgânica (SegOrg)",
      incumbencias: ["Coordenação de Alterações de Adestramento", "Segurança Orgânica (SegOrg)"],
      instrutorEpm: true,
      areasInstrutoria: ["SEG_ORG", "CAV_PSO"],
      emailFuncional: "azevedo.leonardo@marinha.mil.br",
      emailPessoal: "leoccs@bol.com.br",
    }),

    // ── 08 a 13: SUBOFICIAIS ──────────────────────────────────────────────
    mil("m08", "SO", "SACRAMENTO", "Cristiano do Sacramento Soares", "97.1057.91", "PESSOAL", ["CONTRAMESTRE"], {
      especialidade: "CI-SB",
      setorCodigo: "CF-31",
      setorSecundario: "CF-10",
      funcao: "Sargenteante-Geral / Enc. Div. EPM",
      funcaoPrincipal: "Encarregado da Divisão do EPM (CF-10) / Sargenteante-Geral (CF-31) / Instrutor TFM",
      incumbencias: ["Sargenteante-Geral (CF-31)", "Gabinete/ComSoc (CF-01.1)", "Instrutor Titular de TFM"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ", "CCCAM", "TFM"],
      dispensaEscala: "SARGENTEANTE_GERAL",
      emailFuncional: "cristiano.sacramento@marinha.mil.br",
      emailPessoal: "sacrasub@gmail.com",
    }),
    mil("m09", "SO", "EDSON", "Edson Rogerio Rosa Ribeiro dos Santos", "97.0182.87", "STA", ["INSPECAO_NAVAL"], {
      especialidade: "HN",
      setorCodigo: "CF-20",
      setorSecundario: "CF-34",
      funcao: "Suboficial-Mor / Inspetor Naval",
      funcaoPrincipal: "Suboficial-Mor (SO-MOR) / Apoio Operacional e Saúde",
      incumbencias: ["Suboficial-Mor (SO-MOR)"],
      dispensaEscala: "SO_MOR",
      membroConselho: true,
      emailFuncional: "edson.santos@marinha.mil.br",
    }),
    mil("m10", "SO", "SOUZA", "Edvaldo Vicente de Souza", "97.1125.42", "CONTRAMESTRES", ["INSPECAO_NAVAL"], {
      especialidade: "MO",
      setorCodigo: "CF-40",
      funcao: "Encarregado de Máquinas (Em LTSPF)",
      funcaoPrincipal: "Divisão de Máquinas / Manutenção (Substituído pelo 3SG Uchoa)",
      incumbencias: ["Setor de Máquinas (Substituído por 3SG Uchoa)"],
      situacao: "LTSPF",
      dispensaEscala: "RESTRICAO_MEDICA_TOTAL",
      emailFuncional: "edvaldo.souza@marinha.mil.br",
    }),
    mil("m11", "SO", "MARINO", "Humberto Marino dos Santos Serra", "99.1860.39", "INTENDENCIA", ["INSPECAO_NAVAL"], {
      especialidade: "PL",
      setorCodigo: "CF-30",
      setorSecundario: "CF-20",
      funcao: "Apoio / Inspetor Naval",
      funcaoPrincipal: "Responsável pelo Paiol de Material Comum (CF-30) / Inspetor Naval",
      incumbencias: ["Paiol de Material Comum (CF-30)"],
      dispensaEscala: "SO_MAIS_3_ANOS",
      emailFuncional: "humberto.serra@marinha.mil.br",
    }),
    mil("m12", "SO", "FRANÇA", "Weverton Luiz França", "99.2056.53", "CONTRAMESTRES", ["INSPECAO_NAVAL"], {
      especialidade: "MO",
      setorCodigo: "CF-40",
      setorSecundario: "CF-11",
      funcao: "Mestre / Paiol do Mestre / Instrutor EPM",
      funcaoPrincipal: "Responsável pelo Paiol do Mestre / Instrutor de Condução de Embarcações e Viaturas",
      incumbencias: ["Paiol do Mestre (CF-40)", "Instrutor de Condução de Embarcações e Viaturas"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ", "CONDUCAO_EMBARCACOES", "CONDUCAO_VIATURAS"],
      dispensaEscala: "MESTRE",
      emailFuncional: "weverton.franca@marinha.mil.br",
      emailPessoal: "wevertonluiz@hotmail.com",
    }),
    mil("m13", "SO", "JÚNIOR", "Rogério Correia de Oliveira Júnior", "01.0369.55", "OPERACOES", ["SUPERVISOR_SECOM", "INSPECAO_NAVAL"], {
      especialidade: "ET-SB",
      setorCodigo: "CF-09",
      setorSecundario: "CF-20",
      funcao: "Supervisor SECOM / Vistoriador STA",
      funcaoPrincipal: "Supervisor da SECOM (CF-09) / Escalado na Missão Mutirum III",
      incumbencias: ["Supervisão Técnica de Eletrônica e Rádio (CF-09)"],
      emailFuncional: "rogerio.junior@marinha.mil.br",
      emailPessoal: "rogrioj@gmail.com",
    }),

    // ── 14 a 16: PRIMEIROS-SARGENTOS ──────────────────────────────────────
    mil("m14", "1SG", "GONÇALVES", "Tiago Gonçalves Faria", "05.0624.38", "MOTORISTAS", ["MOTORISTA", "INSPECAO_NAVAL"], {
      especialidade: "MO-SB",
      setorCodigo: "CF-42",
      setorSecundario: "CF-22",
      funcao: "Motorista de Serviço / Inspetor Naval",
      funcaoPrincipal: "Transporte Rodoviário (CF-42) / Escalado na Missão Mutirum III",
      incumbencias: ["Viaturas Operacionais (CF-42)"],
      emailFuncional: "tiago.faria@marinha.mil.br",
    }),
    mil("m15", "1SG", "NEPOMUCENO", "Miguel Angelo Nepomuceno de Lima", "06.0301.06", "STA", ["MOTORISTA", "INSPECAO_NAVAL"], {
      especialidade: "MT",
      setorCodigo: "CF-20",
      setorSecundario: "CF-23",
      funcao: "Mestre de Bordo / Sup. Arrais e Adestramento",
      funcaoPrincipal: "Mestre de Bordo / Supervisor da Seção de Arrais Amador (CF-23), Adestramento e STA",
      incumbencias: ["Mestre de Bordo (CF-33)", "Seção de Arrais Amador (CF-23)", "Controle de Adestramentos"],
      instrutorEpm: true,
      areasInstrutoria: ["SEG_ORG", "CONDUCAO_EMBARCACOES"],
      dispensaEscala: "MESTRE",
      emailFuncional: "miguel.lima@marinha.mil.br",
      emailPessoal: "miguel.nepo.angelo@gmail.com",
    }),
    mil("m16", "1SG", "RUBEM", "Bruno Rodrigues Rubem", "07.1546.58", "OPERACOES", ["SUPERVISOR_SECOM", "INSPECAO_NAVAL"], {
      especialidade: "CN",
      setorCodigo: "CF-09",
      funcao: "Supervisor da SECOM",
      funcaoPrincipal: "Supervisor da Secretaria e Comunicações (SECOM - CF-09)",
      incumbencias: ["Supervisão da SECOM (CF-09)", "Controle SIGAD-MB/DATAMAR e Plano Semanal"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ"],
      emailFuncional: "bruno.rubem@marinha.mil.br",
    }),

    // ── 17 a 23: SEGUNDOS-SARGENTOS ───────────────────────────────────────
    mil("m17", "2SG", "TOMÁZ", "Francisco Tomáz Vieira Angelo", "08.0184.81", "STA", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "ET",
      setorCodigo: "CF-20",
      setorSecundario: "CF-10",
      funcao: "Contramestre de Serviço / Inspetor Naval",
      funcaoPrincipal: "Eletricidade / Instrutor EPM / Contramestre de Serviço",
      incumbencias: ["Manutenção Elétrica de Bordo"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ"],
      emailFuncional: "francisco.angelo@marinha.mil.br",
      emailPessoal: "franciscotomazvieiraangelo1@gmail.com",
    }),
    mil("m18", "2SG", "PARANHOS", "Fernando Paranhos Azevedo", "09.0075.71", "STA", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "BA",
      setorCodigo: "CF-21",
      setorSecundario: "CF-31",
      funcao: "Fiel de Pagamento / Sup. Cadastro e CCCAM",
      funcaoPrincipal: "Fiel de Pagamento (CF-31) / Supervisor da Seção de Cadastro e CCCAM (CF-21)",
      incumbencias: ["Fiel de Pagamento", "Seção de Cadastro e CCCAM (CF-21)"],
      dispensaEscala: "FIEL_PAGAMENTO",
      emailFuncional: "fernando.azevedo@marinha.mil.br",
      emailPessoal: "azevedo@live.it",
    }),
    mil("m19", "2SG", "GUIMARÃES", "Ramon Guimarães Souza", "09.0214.42", "COMANDO", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "AM",
      setorCodigo: "CF-04",
      setorSecundario: "CF-30",
      funcao: "Responsável Inteligência e Escoteria",
      funcaoPrincipal: "Encarregado da Seção de Inteligência (CF-04) e Escoteria (OI 30-15)",
      incumbencias: ["Seção de Inteligência (CF-04)", "Escoteria / Armamento e Munição"],
      dispensaEscala: "INTELIGENCIA",
      emailFuncional: "ramon.souza@marinha.mil.br",
      emailPessoal: "newrgs@hotmail.com",
    }),
    mil("m20", "2SG", "MAICON", "Maicon Aparecido Gomes da Costa", "10.0164.73", "OPERACOES", ["CONTRAMESTRE", "MOTORISTA", "INSPECAO_NAVAL"], {
      especialidade: "PL",
      setorCodigo: "CF-07",
      setorSecundario: "CF-22",
      funcao: "Supervisor GAP / Inspetor Naval",
      funcaoPrincipal: "Atendimento ao Público (GAP - CF-07) / Contramestre e Motorista de Serviço",
      incumbencias: ["Atendimento e Protocolo GAP (CF-07) — Substituído em IN pela CB Marla"],
      emailFuncional: "maicon.costa@marinha.mil.br",
      emailPessoal: "maiickgomes@hotmail.com",
    }),
    mil("m21", "2SG", "RODRIGO", "Rodrigo Corrêa da Costa", "11.0261.62", "STA", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "ET",
      setorCodigo: "CF-22",
      funcao: "Contramestre de Serviço / Inspetor Naval",
      funcaoPrincipal: "Seção de Inspeção Naval e Vistorias (CF-22) / Contramestre de Serviço",
      incumbencias: ["Equipamentos Eletrônicos STA"],
      emailFuncional: "rodrigo.costa@marinha.mil.br",
      emailPessoal: "rodrigoccosta22@gmail.com",
    }),
    mil("m22", "2SG", "AZOLA", "Mauro Azola Ultramar", "11.0354.12", "MOTORISTAS", ["MOTORISTA", "INSPECAO_NAVAL"], {
      especialidade: "AR",
      setorCodigo: "CF-42",
      setorSecundario: "CF-22",
      funcao: "Motorista de Serviço / Inspetor Naval",
      funcaoPrincipal: "Seção de Viaturas / SINGRA 2 (CF-42) / Motorista de Serviço",
      incumbencias: ["Controle SINGRA 2 (CF-42)"],
      emailFuncional: "mauro.ultramar@marinha.mil.br",
      emailPessoal: "azolamauro@gmail.com",
    }),
    mil("m23", "2SG", "NILTON", "Nilton da Silva Carvalho Junior", "14.0992.17", "CONTRAMESTRES", [], {
      especialidade: "MA",
      setorCodigo: "CF-40",
      funcao: "Máquinas (Em LTS Prolongada)",
      funcaoPrincipal: "Divisão de Manutenção e Máquinas (CF-40) — Afastado em LTS",
      incumbencias: [],
      situacao: "LTS",
      dispensaEscala: "RESTRICAO_MEDICA_TOTAL",
      emailFuncional: "nilton.junior@marinha.mil.br",
    }),

    // ── 24 a 42: TERCEIROS-SARGENTOS ──────────────────────────────────────
    mil("m24", "3SG", "JONAS", "Luiz Jonas Messias Júnior", "87.3815.67", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "MR",
      setorCodigo: "CF-33",
      funcao: "Apoio Administrativo / Marinharia",
      funcaoPrincipal: "Seção de Serviços Gerais (CF-33) / Substituto do CB Acioly nas férias",
      incumbencias: ["Marinharia e Conservação Predial (CF-33)"],
      emailFuncional: "luiz.junior@marinha.mil.br",
      emailPessoal: "messias4106@gmail.com",
    }),
    mil("m25", "3SG", "REINILSON", "Reinilson do Nascimento Oliveira", "11.0691.55", "EPM", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "EL",
      setorCodigo: "CF-11",
      setorSecundario: "CF-22",
      funcao: "Instrutor CFAQ-MFM / Contramestre",
      funcaoPrincipal: "Instrutor do Curso CFAQ-MFM T1-2026 (CF-11) / Contramestre de Serviço",
      incumbencias: ["Salas de Aula do EPM (CF-11)"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ", "CCCAM"],
      emailFuncional: "reinilson.oliveira@marinha.mil.br",
      emailPessoal: "nisototal90@hotmail.com",
    }),
    mil("m26", "3SG", "DESTERRO", "Carlos Henrique Lima do Desterro", "13.0121.18", "STA", ["MOTORISTA", "CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "DT",
      setorCodigo: "CF-23",
      setorSecundario: "CF-20",
      funcao: "Supervisor Arrais Amador / STA",
      funcaoPrincipal: "Supervisor da Seção de Arrais Amador (CF-23), Adestramento e STA / Motorista",
      incumbencias: ["Seção de Arrais Amador (CF-23)"],
      emailFuncional: "carlos.desterro@marinha.mil.br",
      emailPessoal: "carlosheitorch13@gmail.com",
    }),
    mil("m27", "3SG", "COUSAQUIVITI", "José Vinícius Ramos Fernandes Cousaquiviti", "13.0332.98", "OPERACOES", ["SUPERVISOR_SECOM", "CONTRAMESTRE"], {
      especialidade: "CN",
      setorCodigo: "CF-09",
      funcao: "Supervisor SECOM / Contramestre",
      funcaoPrincipal: "Operador e Supervisor de Comunicações Navais (SECOM - CF-09) / Contramestre",
      incumbencias: ["Estação Rádio / VHF (CF-09)"],
      emailFuncional: "jose.cousaquiviti@marinha.mil.br",
    }),
    mil("m28", "3SG", "INÁCIO", "Inácio Carvalho Guimarães", "13.1220.70", "OPERACOES", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "SQ",
      setorCodigo: "CF-07",
      setorSecundario: "CF-22",
      funcao: "Atendimento GAP / Inspetor Naval",
      funcaoPrincipal: "Grupo de Atendimento ao Público (GAP - CF-07) / Inspetor Naval",
      incumbencias: ["Relação de PNR / Atendimento GAP (CF-07)"],
      emailFuncional: "inacio.guimaraes@marinha.mil.br",
    }),
    mil("m29", "3SG", "BARBOSA", "Dimas Barbosa", "14.0052.71", "EPM", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "SQ",
      setorCodigo: "CF-10",
      setorSecundario: "CF-12",
      funcao: "Responsável pelo EPM e Paiol do EPM",
      funcaoPrincipal: "Supervisor de Habilitação/Cadastro EPM (CF-12) e Fiel do Paiol do EPM",
      incumbencias: ["Paiol do EPM (CF-10)", "Seção de Habilitação de Aquaviários (CF-12)"],
      emailFuncional: "dimas.barbosa@marinha.mil.br",
      emailPessoal: "dbarbosamb@gmail.com",
    }),
    mil("m30", "3SG", "MATHEUS", "Matheus Alves de Oliveira", "14.0124.64", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "MO",
      setorCodigo: "CF-40",
      setorSecundario: "CF-41",
      funcao: "Responsável pela Sala 40 (Manutenção)",
      funcaoPrincipal: "Divisão de Manutenção de Embarcações e Viaturas (Sala 40 - CF-40)",
      incumbencias: ["Sala 40 – Manutenção de Embarcações e Viaturas (CF-40)"],
      emailFuncional: "matheus.oliveira@marinha.mil.br",
    }),
    mil("m31", "3SG", "UCHÔA", "Welder Uchoa Silva Gomes", "14.0170.67", "CONTRAMESTRES", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "EL",
      setorCodigo: "CF-40",
      funcao: "Substituto do SO Souza / Contramestre",
      funcaoPrincipal: "Encarregado Interino de Máquinas (Substituto do SO-MO Souza) / Contramestre",
      incumbencias: ["Oficina de Máquinas (CF-40)"],
      emailFuncional: "welder.gomes@marinha.mil.br",
      emailPessoal: "welderuchoa94@gmail.com",
    }),
    mil("m32", "3SG", "TEIXEIRA", "Rodrigo Pinto da Silva Teixeira", "15.0193.73", "INTENDENCIA", ["CONTRAMESTRE"], {
      especialidade: "ET",
      setorCodigo: "CF-32",
      funcao: "Responsável pelo Compartimento da Intendência",
      funcaoPrincipal: "Seção de Intendência (CF-32) — Fiel de Material e Inventário CADBEM",
      incumbencias: ["Compartimento da Intendência (CF-32)", "Inventário Rotativo CADBEM"],
      emailFuncional: "teixeira.rodrigo@marinha.mil.br",
      emailPessoal: "rodrigo.rpst@hotmail.com",
    }),
    mil("m33", "3SG", "ROBSON", "Robson Santos da Silva", "15.0197.99", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "MC",
      setorCodigo: "CF-41",
      funcao: "Metalurgia e Manutenção / Contramestre",
      funcaoPrincipal: "Seção de Embarcações e Reparos Estruturais (CF-41) / Contramestre",
      incumbencias: ["Oficina de Metalurgia e Solda (CF-41)"],
      emailFuncional: "robson.santos@marinha.mil.br",
      emailPessoal: "robson.gds.27@gmail.com",
    }),
    mil("m34", "3SG", "RIBEIRO", "Leonardo Silva Ribeiro", "15.0198.00", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "CP",
      setorCodigo: "CF-33",
      funcao: "Carpintaria / Rotina de Bordo",
      funcaoPrincipal: "Manutenção Predial e Carpintaria Naval (CF-33) / Contramestre",
      incumbencias: ["Oficina de Carpintaria e PNR (CF-33)"],
      emailFuncional: "leonardo.ribeiro@marinha.mil.br",
    }),
    mil("m35", "3SG", "JOÃO MARCOS", "João Marcos Farias Ramos", "15.0234.01", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "MO",
      setorCodigo: "CF-40",
      funcao: "Responsável pelo Depósito de Combustível",
      funcaoPrincipal: "Encarregado do Depósito de Combustível (DEP. COMB - CF-40) / Contramestre",
      incumbencias: ["Depósito de Combustível – DEP. COMB (CF-40)"],
      emailFuncional: "joao.ramos@marinha.mil.br",
    }),
    mil("m36", "3SG", "CLEBER", "João Cleber da Silva Paz", "15.0289.92", "STA", ["CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "SQ",
      setorCodigo: "CF-22",
      setorSecundario: "CF-11",
      funcao: "Contramestre de Serviço / Inspetor Naval",
      funcaoPrincipal: "Inspeção Naval (CF-22) e Instrutor Eventual do EPM / Contramestre",
      incumbencias: ["Material de Salvatagem STA (CF-22)"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ"],
      emailFuncional: "joao.paz@marinha.mil.br",
    }),
    mil("m37", "3SG", "THOMÁZ", "José Thomáz Feio Barroso", "15.0308.57", "STA", ["CONTRAMESTRE"], {
      especialidade: "MA",
      setorCodigo: "CF-20",
      setorSecundario: "CF-31",
      funcao: "Controle de Alterações de Adestramento / Detalhista",
      funcaoPrincipal: "Controle de Alterações de Adestramento (CF-20) e Auxiliar de Detalhe / Contramestre",
      incumbencias: ["Controle de Alterações de Adestramento (CF-20)"],
      emailFuncional: "thomaz.barroso@marinha.mil.br",
      emailPessoal: "thomazbarroso@gmail.com",
    }),
    mil("m38", "3SG", "BRUNO MARTINS", "Bruno Martins Souza de Jesus", "15.0311.01", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "CI",
      setorCodigo: "CF-09",
      funcao: "Comunicações Interiores / Pernoitante",
      funcaoPrincipal: "Comunicações Interiores (CF-09) / Contramestre de Serviço",
      incumbencias: ["Rede de Telefonia e Comunicações Interiores"],
      emailFuncional: "bruno.jesus@marinha.mil.br",
    }),
    mil("m39", "3SG", "EVERTON", "Everton Perez Mattos Ferreira", "15.0313.57", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "EL",
      setorCodigo: "CF-40",
      funcao: "Responsável pelo Paiol EL / ET",
      funcaoPrincipal: "Manutenção Elétrica e Responsável pelo Paiol EL / ET (CF-40) / Contramestre",
      incumbencias: ["Paiol EL / ET (CF-40)"],
      emailFuncional: "everton.ferreira@marinha.mil.br",
    }),
    mil("m40", "3SG", "MARINHO", "Diego da Silva Marinho", "15.0338.56", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "MO",
      setorCodigo: "CF-41",
      funcao: "Motores / Recém-Embarcado (Instalação)",
      funcaoPrincipal: "Seção de Embarcações (CF-41) — Em conclusão de Papeleta de Qualificação",
      incumbencias: ["Motores de Popa (CF-41)"],
      qualificacoesServico: criarQualificacoes(["CONTRAMESTRE"], "CONTRAMESTRE"),
      emailFuncional: "diego.marinho@marinha.mil.br",
      emailPessoal: "diego.marinho.233@gmail.com",
    }),
    mil("m41", "3SG", "ERLLEY", "Erlley Joel França dos Santos", "15.0362.51", "CONTRAMESTRES", ["CONTRAMESTRE"], {
      especialidade: "MR",
      setorCodigo: "CF-33",
      setorSecundario: "CF-11",
      funcao: "Apoio de Manobra / Instrutor EPM",
      funcaoPrincipal: "Marinharia e Manobra de Bordo (CF-33) / Instrutor Eventual do EPM",
      incumbencias: ["Apoio de Manobra e Amarração"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ"],
      emailFuncional: "erlley.santos@marinha.mil.br",
      emailPessoal: "erlley110394@gmail.com",
    }),
    mil("m42", "3SG", "GERALDO", "Emilson Pontes Geraldo", "15.1637.33", "STA", ["MOTORISTA", "CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "QI",
      setorCodigo: "CF-22",
      setorSecundario: "CF-42",
      funcao: "Equipe de Inspeção Naval / Motorista",
      funcaoPrincipal: "Seção de Inspeção Naval (CF-22) / Motorista e Contramestre de Serviço",
      incumbencias: ["Controle Ambiental e Químico (OI 33-01B)"],
      emailFuncional: "emilson.geraldo@marinha.mil.br",
    }),

    // ── 43 a 55: CABOS ────────────────────────────────────────────────────
    mil("m43", "CB", "CILAS", "Cilas de Oliveira Santos", "18.0073.09", "OPERACOES", ["MOTORISTA", "CABO_AUXILIAR", "VIGIA"], {
      especialidade: "OR",
      setorCodigo: "CF-07",
      setorSecundario: "CF-30",
      funcao: "Auxiliar do GAP / Apoio Operativo",
      funcaoPrincipal: "Grupo de Atendimento ao Público (GAP - CF-07) / Escalado na Missão Mutirum III",
      incumbencias: ["Despacho e Protocolo GAP (CF-07)"],
      emailFuncional: "cilas.santos@marinha.mil.br",
    }),
    mil("m44", "CB", "WELLINGTON", "Gustavo Wellington de Jesus Peres", "18.0135.89", "STA", ["MOTORISTA", "CONTRAMESTRE", "INSPECAO_NAVAL"], {
      especialidade: "MR",
      setorCodigo: "CF-20",
      setorSecundario: "CF-33",
      funcao: "Auxiliar do Mestre / Patromoria / Motorista",
      funcaoPrincipal: "Auxiliar do Mestre e Patromoria (CF-33) / Divisão de STA (CF-20)",
      incumbencias: ["Patromoria e Auxiliar do Mestre (CF-33)"],
      emailFuncional: "gustavo.peres@marinha.mil.br",
    }),
    mil("m45", "CB", "IURI", "Iuri Henrique de Mello", "18.0139.11", "INTENDENCIA", ["CONTRAMESTRE", "MOTORISTA", "VIGIA", "INSPECAO_NAVAL"], {
      especialidade: "MA",
      setorCodigo: "CF-30",
      funcao: "Responsável pelos Alojamentos CB/MN e SO/SG",
      funcaoPrincipal: "Divisão de Apoio (CF-30) — Encarregado dos Alojamentos CB/MN e SO/SG",
      incumbencias: ["Alojamento CB/MN (CF-30)", "Alojamento SO/SG (CF-30)"],
      emailFuncional: "iuri.mello@marinha.mil.br",
    }),
    mil("m46", "CB", "ACIOLY", "Luiz Mateus Acioly do Carmo", "19.0099.33", "MOTORISTAS", ["MOTORISTA", "CABO_AUXILIAR", "INSPECAO_NAVAL"], {
      especialidade: "MR",
      setorCodigo: "CF-22",
      setorSecundario: "CF-33",
      funcao: "Inspeção Naval / Marinharia",
      funcaoPrincipal: "Inspeção Naval (CF-22) e Serviços de Bordo (Substituído nas férias por 3SG Jonas)",
      incumbencias: ["Material de Convés e Marinharia"],
      emailFuncional: "luiz.carmo@marinha.mil.br",
      emailPessoal: "aciolycrl@gmail.com",
    }),
    mil("m47", "CB", "EMANOEL", "Emanoel Ferreira Moreira", "20.0417.48", "MOTORISTAS", ["MOTORISTA", "IDENTIFICADOR"], {
      especialidade: "MO",
      setorCodigo: "CF-40",
      funcao: "Divisão de Máquinas / Motorista",
      funcaoPrincipal: "Manutenção de Motores (CF-40) / Motorista de Serviço",
      incumbencias: ["Ferramental da Oficina de Máquinas (CF-40)"],
      emailFuncional: "emanoel.moreira@marinha.mil.br",
    }),
    mil("m48", "CB", "ANDRÉ", "André Lucas Tavares Souza", "21.0512.41", "CONTRAMESTRES", ["CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA", "INSPECAO_NAVAL"], {
      especialidade: "SQ",
      setorCodigo: "CF-22",
      funcao: "Contramestre de Serviço / Inspetor Naval",
      funcaoPrincipal: "Seção de Inspeção Naval (CF-22) / Contramestre e Cabo Auxiliar",
      incumbencias: ["Equipamentos de Sondagem e Salvatagem"],
      emailFuncional: "andre.souza@marinha.mil.br",
      emailPessoal: "andresouza4778@gmail.com",
    }),
    mil("m49", "CB", "ELIAS", "Alexandre de Oliveira Elias", "21.0767.40", "OPERACOES", ["SUPERVISOR_SECOM", "CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA"], {
      especialidade: "ES",
      setorCodigo: "CF-09",
      setorSecundario: "CF-31",
      funcao: "Escrevente SECOM / Pessoal",
      funcaoPrincipal: "Secretaria e Comunicações (SECOM - CF-09) / Contramestre e Operador SECOM",
      incumbencias: ["Arquivo de Expedientes SIGAD-MB (CF-09)"],
      emailFuncional: "alexandre.elias@marinha.mil.br",
    }),
    mil("m50", "CB", "ÍTALO", "Ítalo Gabriel Silva Mendes", "21.0779.41", "CONTRAMESTRES", ["CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA", "INSPECAO_NAVAL"], {
      especialidade: "SQ",
      setorCodigo: "CF-22",
      funcao: "Contramestre de Serviço / Inspetor Naval",
      funcaoPrincipal: "Seção de Inspeção Naval (CF-22) / Contramestre e Cabo Auxiliar",
      incumbencias: ["Paiol de Coletes e Boias (CF-22)"],
      emailFuncional: "italo.mendes@marinha.mil.br",
    }),
    mil("m51", "CB", "BORDUAN", "João Luiz Borduan de Souza", "21.0805.42", "CONTRAMESTRES", ["CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA", "INSPECAO_NAVAL"], {
      especialidade: "SQ",
      setorCodigo: "CF-22",
      funcao: "Contramestre de Serviço / Inspetor Naval",
      funcaoPrincipal: "Seção de Inspeção Naval (CF-22) / Contramestre e Cabo Auxiliar",
      incumbencias: ["Apoio Náutico STA"],
      emailFuncional: "joao.souza@marinha.mil.br",
    }),
    mil("m52", "CB", "LIMA", "Thaina Lima Gomes", "25.4248.23", "INTENDENCIA", ["CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA", "IDENTIFICADOR"], {
      especialidade: "RM2-PD",
      setorCodigo: "CF-30",
      setorSecundario: "CF-07",
      funcao: "Responsável pelo Auditório e Alojamento Feminino",
      funcaoPrincipal: "Divisão de Apoio (CF-30) e GAP (CF-07) / Contramestre de Serviço",
      incumbencias: ["Auditório da CFT (CF-30)", "Alojamento Feminino (CF-30)"],
      emailFuncional: "thaina.gomes@marinha.mil.br",
      emailPessoal: "thaina44gomes@gmail.com",
    }),
    mil("m53", "CB", "LUZIA", "Luzia Pacífico dos Santos", "25.4252.26", "OPERACOES", ["CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA", "IDENTIFICADOR"], {
      especialidade: "RM2-EF",
      setorCodigo: "CF-09",
      setorSecundario: "CF-31",
      funcao: "Operadora SIGAD-MB / Contramestre",
      funcaoPrincipal: "Secretaria e Comunicações (CF-09) — Habilitada Estágio Avançado SIGAD-MB",
      incumbencias: ["Protocolo SIGAD-MB (CF-09)"],
      instrutorEpm: true,
      areasInstrutoria: ["TFM"],
      emailFuncional: "luzia.santos@marinha.mil.br",
      emailPessoal: "pacificoluzia45@gmail.com",
    }),
    mil("m54", "CB", "ANDREZA", "Andreza Pacífico Venâncio", "25.4259.27", "PESSOAL", ["VIGIA", "CABO_AUXILIAR", "IDENTIFICADOR"], {
      especialidade: "RM2-EF",
      setorCodigo: "CF-34",
      setorSecundario: "CF-10",
      funcao: "Responsável pelas Suítes / Instrutora EPM",
      funcaoPrincipal: "Seção de Saúde (CF-34) e Instrutora de Cursos do EPM (CF-10)",
      incumbencias: ["Suítes de Trânsito / Oficiais (CF-30)"],
      instrutorEpm: true,
      areasInstrutoria: ["CFAQ", "TFM"],
      emailFuncional: "andreza.venancio@marinha.mil.br",
      emailPessoal: "pacificoandreza253@gmail.com",
    }),
    mil("m55", "CB", "MARLA", "Marla Ingridh Rocha Guedes", "25.4262.29", "OPERACOES", ["CONTRAMESTRE", "CABO_AUXILIAR", "VIGIA", "IDENTIFICADOR"], {
      especialidade: "RM2-PD",
      setorCodigo: "CF-07",
      funcao: "Atendimento GAP / Contramestre de Serviço",
      funcaoPrincipal: "Grupo de Atendimento ao Público (GAP - CF-07) — Substituta do 2SG Maicon em IN",
      incumbencias: ["Sistemas de Atendimento GAP (CF-07)"],
      emailFuncional: "marla.guedes@marinha.mil.br",
      emailPessoal: "marla.ingridh@gmail.com",
    }),

    // ── 56 a 64: MARINHEIROS (RM2 e RC) ───────────────────────────────────
    mil("m56", "MN", "DIAS", "Mateus Dias de Almeida", "22.1773.29", "CONTRAMESTRES", ["VIGIA", "CABO_AUXILIAR", "INSPECAO_NAVAL"], {
      especialidade: "RM-2",
      setorCodigo: "CF-41",
      setorSecundario: "CF-22",
      funcao: "Vigia de Embarcações / Patrão de Lancha / IN",
      funcaoPrincipal: "Seção de Embarcações (CF-41) — Patrão de Lancha e Vigia do Flutuante",
      incumbencias: ["Lancha de Inspeção Naval (CF-41)"],
      emailFuncional: "mateus.almeida@marinha.mil.br",
      emailPessoal: "matheussantosmb2000@gmail.com",
    }),
    mil("m57", "MN", "CARLOS", "Carlos Henrique Rodrigues Costa", "22.1804.27", "CONTRAMESTRES", ["VIGIA", "CABO_AUXILIAR", "INSPECAO_NAVAL"], {
      especialidade: "RM-2",
      setorCodigo: "CF-41",
      funcao: "Vigia de Embarcações / Inspetor Naval",
      funcaoPrincipal: "Seção de Embarcações (CF-41) — Vigilância do Flutuante e Equipe IN",
      incumbencias: ["Conservação do Flutuante da CFT"],
      emailFuncional: "carlos.costa@marinha.mil.br",
      emailPessoal: "carloshrc6@gmail.com",
    }),
    mil("m58", "MN", "TANANTA", "Gabriel da Costa Tananta", "22.1807.29", "CONTRAMESTRES", ["VIGIA", "CABO_AUXILIAR", "INSPECAO_NAVAL"], {
      especialidade: "RM-2",
      setorCodigo: "CF-41",
      funcao: "Vigia de Embarcações / Inspetor Naval",
      funcaoPrincipal: "Seção de Embarcações (CF-41) — Vigilância do Flutuante e Equipe IN",
      incumbencias: ["Paiol de Cabos e Defensas (CF-41)"],
      emailFuncional: "gabriel.tananta@marinha.mil.br",
      emailPessoal: "gabrieldacostatanantatanantat@gmail.com",
    }),
    mil("m59", "MN", "GARRIDO", "Everton Arcanjo Garrido", "22.1810.24", "CONTRAMESTRES", ["VIGIA", "CABO_AUXILIAR", "IDENTIFICADOR", "INSPECAO_NAVAL"], {
      especialidade: "RM-2",
      setorCodigo: "CF-41",
      setorSecundario: "CF-40",
      funcao: "Vigia de Embarcações / Substituto em Missões",
      funcaoPrincipal: "Substituto a bordo de militares em missão (MN Grande na Mutirum III e SO França em IN)",
      incumbencias: ["Vigilância de Embarcações Operacionais (CF-41)"],
      emailFuncional: "everton.garrido@marinha.mil.br",
      emailPessoal: "evertonarcanjobc123@gmail.com",
    }),
    mil("m60", "MN", "GRANDE", "Luis Antonio Grande Lopes", "24.3773.25", "CONTRAMESTRES", ["VIGIA", "CABO_AUXILIAR", "INSPECAO_NAVAL"], {
      especialidade: "RM-2",
      setorCodigo: "CF-41",
      funcao: "Vigia de Embarcações / Patrão / Missão Mutirum III",
      funcaoPrincipal: "Patrão de Lancha e Vigia (CF-41) — Escalado na Missão Mutirum III (Subst. por MN Garrido)",
      incumbencias: ["Manutenção da Lancha Rápida (CF-41)"],
      emailFuncional: "luis.lopes@marinha.mil.br",
      emailPessoal: "pedrinhograndes16@gmail.com",
    }),
    mil("m61", "MN", "DANLEY", "Danley Ataide Angelo", "25.3312.21", "INTENDENCIA", ["VIGIA", "IDENTIFICADOR"], {
      especialidade: "RC",
      setorCodigo: "CF-30",
      funcao: "Divisão de Apoio / Vigia de Embarcações",
      funcaoPrincipal: "Auxiliar da Divisão de Apoio (CF-30) / Vigia e Identificador",
      incumbencias: ["Apoio Logístico e Rancho (CF-30)"],
      emailFuncional: "danley.angelo@marinha.mil.br",
      emailPessoal: "danleyataide17@gmail.com",
    }),
    mil("m62", "MN", "PEQUENO", "Hayman Pequeno da Silva", "25.3325.20", "CONTRAMESTRES", ["VIGIA", "IDENTIFICADOR"], {
      especialidade: "RC",
      setorCodigo: "CF-33",
      funcao: "Vigia de Embarcações / Serviços Gerais",
      funcaoPrincipal: "Seção de Serviços Gerais (CF-33) / Vigia de Embarcações e Plantão",
      incumbencias: ["Conservação de Áreas Externas (CF-33)"],
      emailFuncional: "hayman.silva@marinha.mil.br",
      emailPessoal: "haymanpequeno87@gmail.com",
    }),
    mil("m63", "MN", "D'AVILA", "Janderson Vinicius da Costa D'Avila", "25.3360.29", "CONTRAMESTRES", ["VIGIA", "IDENTIFICADOR"], {
      especialidade: "RC",
      setorCodigo: "CF-33",
      funcao: "Vigia de Embarcações / Apoio de Bordo",
      funcaoPrincipal: "Seção de Serviços Gerais (CF-33) / Vigia de Embarcações e Plantão",
      incumbencias: ["Apoio Operacional de Bordo"],
      emailFuncional: "janderson.davila@marinha.mil.br",
      emailPessoal: "jandersonvinicius290@gmail.com",
    }),
    mil("m64", "MN", "CASTRO", "Levy de Castro Macedo", "25.3376.29", "CONTRAMESTRES", ["VIGIA", "IDENTIFICADOR"], {
      especialidade: "RC",
      setorCodigo: "CF-33",
      funcao: "Vigia de Embarcações / Apoio de Bordo",
      funcaoPrincipal: "Seção de Serviços Gerais (CF-33) / Vigia de Embarcações e Plantão",
      incumbencias: ["Controle de Pórtico e Estacionamento"],
      emailFuncional: "levy.macedo@marinha.mil.br",
      emailPessoal: "levycastro75@gmail.com",
    }),
  ];

  // ── Restrições reais e de demonstração do motor ──────────────────────────
  militares.find((m) => m.id === "m10")!.restricoes = [
    res("r-souza", "MEDICA", T(-90), T(60), "LTSPF — Substituído nas funções pelo 3ºSG-EL Uchoa"),
  ];
  militares.find((m) => m.id === "m23")!.restricoes = [
    res("r-nilton", "MEDICA", T(-60), T(90), "LTS Prolongada (Seção de Saúde CF-34)"),
  ];
  militares.find((m) => m.id === "m40")!.restricoes = [
    res("r-marinho", "SEM_SRAK", T(-15), T(20), "Período de Instalação / Concluindo Papeleta OI 02-06D"),
  ];

  // ── Membros do Conselho de Gestão (CF-06) ────────────────────────────────
  (["m01", "m02", "m03", "m04", "m05", "m09"] as string[]).forEach((id) => {
    const m = militares.find((x) => x.id === id);
    if (m) m.membroConselho = true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AFASTAMENTOS E ALOCAÇÕES DO PLANO SEMANAL (com Substituto e suporte a ASD)
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
    criadoPor: divisao === "PESSOAL" ? "Sargenteante-Geral (CF-31)" : `Encarregado ${divisao}`,
    createdAt: agora,
    updatedAt: agora,
    ...extra,
  });

  const afastamentos: Afastamento[] = [
    // 1. LTSPF do SO Souza (Substituído pelo 3SG Uchoa)
    af("LICENCA", "PESSOAL", "LTSPF – Pessoa da Família", "LTSPF — SO-MO Souza (Substituído por 3ºSG-EL Uchoa)", -60, 45, ["m10"], "CONFIRMADO", {
      militarSubstitutoId: "m31",
      terminoAsd: false,
      documentoReferencia: "Portaria CFT / CF-34",
    }),
    // 2. LTS Prolongada do 2SG Nilton Carvalho
    af("LICENCA", "PESSOAL", "LTS – Licença para Tratamento de Saúde", "LTS — 2ºSG-MA Nilton Carvalho", -45, 60, ["m23"], "CONFIRMADO", {
      militarSubstitutoId: "m37",
      terminoAsd: false,
      documentoReferencia: "Laudo JRS / CF-34",
    }),
    // 3. Missão Mutirum III (Com término ASD — Até Segunda Determinação)
    af("MISSAO", "OPERACOES", "MISSÃO MUTIRUM III", "Missão Mutirum III — Calha do Solimões (23JAN A ASD)", -5, 15, ["m13", "m14", "m43", "m60"], "CONFIRMADO", {
      local: "Calha do Rio Solimões / Manaus",
      terminoAsd: true,
      militarSubstitutoId: "m59", // MN Garrido cobrindo MN Grande a bordo
      documentoReferencia: "OS Com9ºDN / Mutirum III",
    }),
    // 4. Inspeção Naval Diária (06:30 | 11:30 | 13:00 | 16:00)
    af("INSPECAO_NAVAL", "STA", "INSPEÇÃO NAVAL", "Inspeção Naval Diária — Rio Solimões (06:30 às 16:00)", 0, 0, ["m15", "m42"], "CONFIRMADO", {
      local: "Orla de Tabatinga / Benjamin Constant",
      militarSubstitutoId: "m26",
      impactaEscala: false,
      horarioEspecifico: { t1: "06:30", t2: "11:30", t3: "13:00", t4: "16:00" },
    }),
    // 5. Aula no Curso CFAQ-MFM (X X X X — INSTRUTOR – CFAQ-MFM T1-2026)
    af("CURSO", "EPM", "INSTRUTOR – CFAQ-MFM T1-2026", "Ministrar aula em curso do EPM — CFAQ-MFM T1-2026", 0, 4, ["m25", "m54"], "CONFIRMADO", {
      local: "Salas de Aula CF-11 (CFT)",
      militarSubstitutoId: "m29",
      documentoReferencia: "OS Instrutores Eventuais EPM",
    }),
    // 6. Inspeção Naval de Longa Duração / Itinerante STA (2SG Maicon substituído pela CB Marla no GAP)
    af("INSPECAO_NAVAL", "STA", "Inspeção Naval – Longa Duração", "Comissão de Inspeção Naval — Atalaia do Norte / Rio Javari", 2, 9, ["m20", "m21", "m48"], "CONFIRMADO", {
      local: "Atalaia do Norte / Rio Javari",
      militarSubstitutoId: "m55", // CB Marla cobrindo 2SG Maicon no GAP (CF-07)
      documentoReferencia: "OS STA / Termo de Viagem",
    }),
    // 7. Férias Regulamentares (CB Acioly substituído pelo 3SG Jonas Messias)
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias Regulamentares — CB-MR Acioly (Subst. por 3ºSG-MR Jonas)", -4, 25, ["m46"], "CONFIRMADO", {
      militarSubstitutoId: "m24",
      documentoReferencia: "Plano Anual de Férias CFT",
    }),
    // 8. Faina Temporária de Apoio ao EPM (09:00 às 09:40 – FAXINA NO EPM)
    af("OUTRO", "EPM", "FAXINA NO EPM", "09:00 às 09:40 – FAXINA NO EPM (Apoio de Manutenção)", 0, 0, ["m19"], "CONFIRMADO", {
      local: "Divisão EPM (CF-10)",
      impactaEscala: false,
      horarioEspecifico: { t1: "07:30", t2: "09:00–09:40", t3: "13:15", t4: "16:30" },
    }),
    // 9. Período de Instalação (Recém-embarcado)
    af("DISPENSA", "PESSOAL", "INSTALAÇÃO (Recém-embarcado)", "Período de Instalação — 3ºSG-MO Marinho (OI 30-09B)", -2, 5, ["m40"], "CONFIRMADO", {
      militarSubstitutoId: "m30",
      documentoReferencia: "OI 30-09B",
    }),
    // 10. Previsões próximas de Férias e Missões
    af("MISSAO", "STA", "Itinerância STA", "Itinerância STA – Santo Antônio do Içá", 6, 13, ["m17", "m26", "m36"], "PREVISTO", {
      local: "Santo Antônio do Içá/AM",
      militarSubstitutoId: "m21",
    }),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias Regulamentares — 3ºSG-SQ Cleber João", 12, 41, ["m36"], "PREVISTO", {
      militarSubstitutoId: "m28",
    }),
    af("FERIAS", "PESSOAL", "Férias – 1º período", "Férias Regulamentares — CB-MO Emanoel", 20, 49, ["m47"], "PREVISTO", {
      militarSubstitutoId: "m35",
    }),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // ESCALAS DE SERVIÇO (8 Postos Oficiais OI 02-06D + SOMOR)
  // ─────────────────────────────────────────────────────────────────────────
  const segunda = addDays(hoje, -((diaSemana(hoje) + 6) % 7));
  const BLOQ_GERAL = ["MEDICA", "ADMINISTRATIVA", "DISCIPLINAR", "OUTRA"] as const;

  const escalas: EscalaConfig[] = [
    {
      id: "OSE",
      nome: "Oficial de Serviço de Estado (OSE)",
      descricao: "Serviço de Estado 24h guarnecido por Oficiais Intermediários e Subalternos (CT, 1T, 2T). Domingos: pode encostar às 09h30 em sobreaviso.",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: [...BLOQ_GERAL],
    },
    {
      id: "CONTRAMESTRE",
      nome: "Contramestre de Serviço",
      descricao: "Serviço 24h armado (Pistola 9mm). Leitura de água/energia, claviculário, escuta permanente do Canal 16 VHF e supervisão de lanchas.",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["SEM_SRAK", ...BLOQ_GERAL],
    },
    {
      id: "SUPERVISOR_SECOM",
      nome: "Supervisor / Operador SECOM",
      descricao: "Comunicações Navais (CF-09). Assume às 07h30; após saída do Comando/Ajudante pode operar em regime de sobreaviso (40 min).",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 2,
      limiteSeguranca: 1,
      restricoesBloqueantes: ["DISCIPLINAR"],
    },
    {
      id: "CABO_AUXILIAR",
      nome: "Cabo Auxiliar / Cabo de Dia",
      descricao: "Quartos de serviço (08-12, 12-16, 16-20, 20-00, 00-04, 04-08). Disque Denúncias, folha de presença e vistoria horária das lanchas atracadas.",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: [...BLOQ_GERAL],
    },
    {
      id: "MOTORISTA",
      nome: "Motorista de Serviço",
      descricao: "Condução de viaturas administrativas e apoio emergencial (06:50 | 11:00 | 17:18 | 18:20).",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["CNH_VENCIDA", ...BLOQ_GERAL],
    },
    {
      id: "VIGIA",
      nome: "Vigia de Embarcações / Flutuante",
      descricao: "Dois vigias por dia em quartos alternados para segurança física das lanchas operacionais atracadas no flutuante da CFT.",
      modo: "INDIVIDUAL",
      postosPorDia: 2,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: [...BLOQ_GERAL],
    },
    {
      id: "IDENTIFICADOR",
      nome: "Identificador e Plantão de Alojamento",
      descricao: "Controle de acesso, crachás e plantão de alojamentos. Recebe prioritariamente CB/MN com restrição médica para serviço armado.",
      modo: "INDIVIDUAL",
      postosPorDia: 1,
      regimeAlvo: 3,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["DISCIPLINAR"],
    },
    {
      id: "INSPECAO_NAVAL",
      nome: "Equipe de Inspeção Naval (IN)",
      descricao: "Equipes rotativas semanais (Alfa/Bravo/Charlie) de prontidão para Fiscalização do Tráfego Aquaviário (FTA). Mínimo 2 com ESPRAC.",
      modo: "EQUIPES",
      postosPorDia: 1,
      regimeAlvo: 2,
      limiteSeguranca: 2,
      restricoesBloqueantes: ["SEM_ESPRAC", "SEM_SRAK", ...BLOQ_GERAL],
      tamanhoMinimoEquipe: 3,
      duracaoTurnoDias: 7,
      dataBaseRotacao: segunda,
      equipes: [
        { id: "eq-alfa", nome: "Alfa", membros: ["m15", "m17", "m21", "m42", "m56"] },
        { id: "eq-bravo", nome: "Bravo", membros: ["m18", "m20", "m26", "m36", "m57"] },
        { id: "eq-charlie", nome: "Charlie", membros: ["m22", "m28", "m29", "m31", "m58"] },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTOS INSTITUCIONAIS
  // ─────────────────────────────────────────────────────────────────────────
  const eventos: EventoInstitucional[] = [
    { id: "ev1", tipo: "CONSELHO_GESTAO", titulo: "Conselho de Gestão (CF-06) – Reunião Ordinária", inicio: T(-9), fim: T(-9), exigeConselho: true },
    { id: "ev2", tipo: "CONSELHO_GESTAO", titulo: "Conselho de Gestão (CF-06) – Reunião Ordinária", inicio: T(21), fim: T(21), exigeConselho: true },
    { id: "ev3", tipo: "CONSELHO_GESTAO", titulo: "Conselho de Gestão (CF-06) – Reunião Ordinária", inicio: T(51), fim: T(51), exigeConselho: true },
    { id: "ev4", tipo: "INSPECAO_ADMINISTRATIVA", titulo: "Inspeção Administrativo-Militar (IAM - Com9ºDN)", inicio: T(65), fim: T(67), exigeConselho: true },
    { id: "ev5", tipo: "CERIMONIA", titulo: "Operação BRACOLPER (OI 30-16)", inicio: T(35), fim: T(42), exigeConselho: false },
    { id: "ev6", tipo: "CERIMONIA", titulo: "Dia do Marinheiro", inicio: `${ano}-12-13`, fim: `${ano}-12-13`, exigeConselho: false },
    { id: "ev7", tipo: "CERIMONIA", titulo: "Aniversário da Capitania Fluvial de Tabatinga", inicio: `${ano}-09-17`, fim: `${ano}-09-17`, exigeConselho: false },
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
      regressoGeralAtivo: false,
      regressoGeralTexto: "REGRESSO GERAL 07:00 ATÉ SEXTA-FEIRA",
    },
    trocasServico: [
      {
        id: "tr-001",
        numeroSequencial: "014/2026",
        dataServicoOriginal: T(3),
        posto: "CONTRAMESTRE",
        militarSolicitanteId: "m29", // 3SG Barbosa
        militarSubstitutoId: "m32", // 3SG Teixeira
        nivelHierarquia: 2,
        dataSolicitacao: hoje,
        cumpreAntecedencia48h: true,
        motivoJustificativa: "Apoio na abertura de turma CFAQ-MFM no EPM (Anexo O - OI 02-06D)",
        statusAprovacaoAjudante: "AUTORIZADO_CF02",
      },
    ],
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
