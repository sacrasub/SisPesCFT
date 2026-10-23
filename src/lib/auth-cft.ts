import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Usuario, Perfil, DivisaoId, Posto } from "@/lib/types";

export const SENHA_PADRAO_INSTITUCIONAL = "marinha123";

export const MASTER_ADMIN_EMAILS = [
  "cristiano.sacramento@marinha.mil.br",
  "sacrasub@gmail.com"
];

export interface UsuarioCftAuth {
  email: string;
  email_funcional?: string;
  email_pessoal?: string;
  nome: string;
  role: "super_admin" | "admin" | "operador" | "visualizador";
  ativo: boolean;
  tipo?: "institucional" | "google";
  cargo?: string;
  senhaHash?: string;
  senhaAlterada?: boolean;
}

export interface MilitarMapItem {
  nip: string;
  posto_grad: string;
  especialidade?: string;
  nome_completo: string;
  nome_guerra: string;
  rotulo?: string;
  email_funcional?: string;
  email_pessoal?: string;
}

export interface SolicitacaoAcesso {
  id?: string;
  email: string;
  nome: string;
  nip?: string;
  setor?: string;
  motivo?: string;
  status: "pendente" | "aprovado" | "rejeitado";
  dataSolicitacao: string;
}

export const GAP_DEFAULT_WHITELIST: UsuarioCftAuth[] = [
  {
    "email": "cristiano.sacramento@marinha.mil.br",
    "email_funcional": "cristiano.sacramento@marinha.mil.br",
    "email_pessoal": "sacrasub@gmail.com",
    "nome": "CRISTIANO DO SACRAMENTO SOARES",
    "role": "super_admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "Super Admin Master"
  },
  {
    "email": "admin@marinha.mil.br",
    "nome": "Administrador GAP CFT",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "Administrador"
  },
  {
    "email": "daniel.costa@marinha.mil.br",
    "email_funcional": "daniel.costa@marinha.mil.br",
    "email_pessoal": "danielcosta@hotmail.com",
    "nome": "CC DANIEL COSTA - DANIEL COSTA DE SOUZA",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CC - Imediato"
  },
  {
    "email": "matheus.bispo@marinha.mil.br",
    "email_funcional": "matheus.bispo@marinha.mil.br",
    "email_pessoal": "m.bisporj@gmail.com",
    "nome": "CT BISPO - MATHEUS BISPO PIRES DA SILVA",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CT - Oficial de Intendência"
  },
  {
    "email": "kelly.veras@marinha.mil.br",
    "email_funcional": "kelly.veras@marinha.mil.br",
    "nome": "1ºTen VÉRAS - KELLY RODRIGUES VÉRAS",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "1ºTen - Oficial"
  },
  {
    "email": "camila.cravero@marinha.mil.br",
    "email_funcional": "camila.cravero@marinha.mil.br",
    "email_pessoal": "camilacravero.silva@gmail.com",
    "nome": "1ºTen CRAVERO - CAMILA CRAVERO DA SILVA",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "1ºTen - Oficial"
  },
  {
    "email": "balieiro.costa@marinha.mil.br",
    "email_funcional": "balieiro.costa@marinha.mil.br",
    "nome": "1ºTen BALIEIRO - LUIZ HENRIQUE COSTA BALIEIRO",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "1ºTen - Médico"
  },
  {
    "email": "azevedo.leonardo@marinha.mil.br",
    "email_funcional": "azevedo.leonardo@marinha.mil.br",
    "email_pessoal": "leoccs@bol.com.br",
    "nome": "2ºTen AZEVEDO - LEONARDO BARBOSA AZEVEDO",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "2ºTen - Oficial"
  },
  {
    "email": "wevertonluiz@hotmail.com",
    "email_pessoal": "wevertonluiz@hotmail.com",
    "nome": "SO FRANÇA - WEVERTON LUIZ FRANÇA",
    "role": "admin",
    "ativo": true,
    "tipo": "google",
    "cargo": "SO - Tripulação CFT"
  },
  {
    "email": "rogerio.junior@marinha.mil.br",
    "email_funcional": "rogerio.junior@marinha.mil.br",
    "email_pessoal": "rogrioj@gmail.com",
    "nome": "SO JÚNIOR - ROGÉRIO CORREIA DE OLIVEIRA JÚNIOR",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "SO - Tripulação CFT"
  },
  {
    "email": "miguel.nepo.angelo@gmail.com",
    "email_pessoal": "miguel.nepo.angelo@gmail.com",
    "nome": "1ºSG NEPOMUCENO - MIGUEL ANGELO NEPOMUCENO DE LIMA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "1ºSG - Tripulação CFT"
  },
  {
    "email": "franciscotomazvieiraangelo1@gmail.com",
    "email_pessoal": "franciscotomazvieiraangelo1@gmail.com",
    "nome": "2ºSG TOMÁZ - FRANCISCO TOMÁZ VIEIRA ANGELO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "2ºSG - Tripulação CFT"
  },
  {
    "email": "azevedo@live.it",
    "email_pessoal": "azevedo@live.it",
    "nome": "2ºSG PARANHOS - FERNANDO PARANHOS AZEVEDO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "2ºSG - Tripulação CFT"
  },
  {
    "email": "newrgs@hotmail.com",
    "email_pessoal": "newrgs@hotmail.com",
    "nome": "2ºSG GUIMARÃES - RAMON GUIMARÃES SOUZA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "2ºSG - Tripulação CFT"
  },
  {
    "email": "maicon.aparecido@marinha.mil.br",
    "email_funcional": "maicon.aparecido@marinha.mil.br",
    "email_pessoal": "maiickgomes@hotmail.com",
    "nome": "2ºSG APARECIDO - MAICON APARECIDO GOMES DA COSTA",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "2ºSG - Tripulação CFT"
  },
  {
    "email": "rodrigoccosta22@gmail.com",
    "email_pessoal": "rodrigoccosta22@gmail.com",
    "nome": "2ºSG RODRIGO - RODRIGO CORRÊA DA COSTA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "2ºSG - Tripulação CFT"
  },
  {
    "email": "azolamauro@gmail.com",
    "email_pessoal": "azolamauro@gmail.com",
    "nome": "2ºSG AZOLA - MAURO AZOLA ULTRAMAR",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "2ºSG - Tripulação CFT"
  },
  {
    "email": "messias4106@gmail.com",
    "email_pessoal": "messias4106@gmail.com",
    "nome": "3ºSG JONAS - LUIZ JONAS MESSIAS JÚNIOR",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "nisototal90@hotmail.com",
    "email_pessoal": "nisototal90@hotmail.com",
    "nome": "3ºSG REINILSON - REINILSON DO NASCIMENTO OLIVEIRA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "carlosheitorch13@gmail.com",
    "email_pessoal": "carlosheitorch13@gmail.com",
    "nome": "3ºSG DESTERRO - CARLOS HENRIQUE LIMA DO DESTERRO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "dbarbosamb@gmail.com",
    "email_pessoal": "dbarbosamb@gmail.com",
    "nome": "3ºSG BARBOSA - DIMAS BARBOSA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "welderuchoa94@gmail.com",
    "email_pessoal": "welderuchoa94@gmail.com",
    "nome": "3ºSG UCHÔA - WELDER UCHOA SILVA GOMES",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "teixeira.rodrigo@marinha.mil.br",
    "email_funcional": "teixeira.rodrigo@marinha.mil.br",
    "email_pessoal": "rodrigo.rpst@hotmail.com",
    "nome": "3ºSG TEIXEIRA - RODRIGO PINTO DA SILVA TEIXEIRA",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "thomazbarroso@gmail.com",
    "email_pessoal": "thomazbarroso@gmail.com",
    "nome": "3ºSG THOMÁZ - JOSÉ THOMÁZ FEIO BARROSO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "robson.santos@marinha.mil.br",
    "email_funcional": "robson.santos@marinha.mil.br",
    "email_pessoal": "robson.gds.27@gmail.com",
    "nome": "3ºSG ROBSON - ROBSON SANTOS DA SILVA",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "diego.marinho@marinha.mil.br",
    "email_funcional": "diego.marinho@marinha.mil.br",
    "email_pessoal": "diego.marinho.233@gmail.com",
    "nome": "3ºSG MARINHO - DIEGO DA SILVA MARINHO",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "erlley110394@gmail.com",
    "email_pessoal": "erlley110394@gmail.com",
    "nome": "3ºSG ERLLEY - ERLLEY JOEL FRANÇA DOS SANTOS",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "3ºSG - Tripulação CFT"
  },
  {
    "email": "aciolycrl@gmail.com",
    "email_pessoal": "aciolycrl@gmail.com",
    "nome": "CB ACIOLY - LUIZ MATEUS ACIOLY DO CARMO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "CB - Tripulação CFT"
  },
  {
    "email": "andresouza4778@gmail.com",
    "email_pessoal": "andresouza4778@gmail.com",
    "nome": "CB ANDRÉ LUCAS - ANDRÉ LUCAS TAVARES SOUZA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "CB - Tripulação CFT"
  },
  {
    "email": "thaina44gomes@gmail.com",
    "email_pessoal": "thaina44gomes@gmail.com",
    "nome": "CB THAINA - THAINA LIMA GOMES",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "CB - Tripulação CFT"
  },
  {
    "email": "pacificoluzia45@gmail.com",
    "email_pessoal": "pacificoluzia45@gmail.com",
    "nome": "CB LUZIA - LUZIA PACÍFICO DOS SANTOS",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "CB - Tripulação CFT"
  },
  {
    "email": "pacificoandreza253@gmail.com",
    "email_pessoal": "pacificoandreza253@gmail.com",
    "nome": "CB ANDREZA - ANDREZA PACÍFICO VENÂNCIO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "CB - Tripulação CFT"
  },
  {
    "email": "marla.ingridh@gmail.com",
    "email_pessoal": "marla.ingridh@gmail.com",
    "nome": "CB MARLA - MARLA INGRIDH ROCHA GUEDES",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "CB - Tripulação CFT"
  },
  {
    "email": "matheussantosmb2000@gmail.com",
    "email_pessoal": "matheussantosmb2000@gmail.com",
    "nome": "MN DIAS - MATEUS DIAS DE ALMEIDA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "carloshrc6@gmail.com",
    "email_pessoal": "carloshrc6@gmail.com",
    "nome": "MN RODRIGUES - CARLOS HENRIQUE RODRIGUES COSTA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "gabrieldacostatanantatanantat@gmail.com",
    "email_pessoal": "gabrieldacostatanantatanantat@gmail.com",
    "nome": "MN TANANTA - GABRIEL DA COSTA TANANTA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "evertonarcanjobc123@gmail.com",
    "email_pessoal": "evertonarcanjobc123@gmail.com",
    "nome": "MN GARRIDO - EVERTON ARCANJO GARRIDO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "pedrinhograndes16@gmail.com",
    "email_pessoal": "pedrinhograndes16@gmail.com",
    "nome": "MN LOPES - LUIS ANTONIO GRANDE LOPES",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "danleyataide17@gmail.com",
    "email_pessoal": "danleyataide17@gmail.com",
    "nome": "MN DANLEY - DANLEY ATAIDE ANGELO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "haymanpequeno87@gmail.com",
    "email_pessoal": "haymanpequeno87@gmail.com",
    "nome": "MN HAYMAN - HAYMAN PEQUENO DA SILVA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "jandersonvinicius290@gmail.com",
    "email_pessoal": "jandersonvinicius290@gmail.com",
    "nome": "MN D'AVILA - JANDERSON VINICIUS DA COSTA D'AVILA",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "levycastro75@gmail.com",
    "email_pessoal": "levycastro75@gmail.com",
    "nome": "MN LEVY - LEVY DE CASTRO MACEDO",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "MN - Tripulação CFT"
  },
  {
    "email": "eduardo.held@marinha.mil.br",
    "email_funcional": "eduardo.held@marinha.mil.br",
    "nome": "CF HELD - Eduardo Guimarães de Held",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CF - Tripulação CFT (COMANDO)"
  },
  {
    "email": "edson.santos@marinha.mil.br",
    "email_funcional": "edson.santos@marinha.mil.br",
    "nome": "SO ROGERIO - Edson Rogerio Rosa Ribeiro dos Santos",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "SO - Tripulação CFT (STA)"
  },
  {
    "email": "humberto.serra@marinha.mil.br",
    "email_funcional": "humberto.serra@marinha.mil.br",
    "nome": "SO MARINO - Humberto Marino dos Santos Serra",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "SO - Tripulação CFT (STA)"
  },
  {
    "email": "edvaldo.souza@marinha.mil.br",
    "email_funcional": "edvaldo.souza@marinha.mil.br",
    "nome": "SO EDVALDO - Edvaldo Vicente de Souza",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "SO - Tripulação CFT (STA)"
  },
  {
    "email": "bruno.rubem@marinha.mil.br",
    "email_funcional": "bruno.rubem@marinha.mil.br",
    "nome": "1SG RUBEM - Bruno Rodrigues Rubem",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "1SG - Tripulação CFT (STA)"
  },
  {
    "email": "tiago.faria@marinha.mil.br",
    "email_funcional": "tiago.faria@marinha.mil.br",
    "nome": "1SG TIAGO - Tiago Gonçalves Faria",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "1SG - Tripulação CFT (STA)"
  },
  {
    "email": "nilton.junior@marinha.mil.br",
    "email_funcional": "nilton.junior@marinha.mil.br",
    "nome": "2SG NILTON - Nilton da Silva Carvalho Junior",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "2SG - Tripulação CFT (STA)"
  },
  {
    "email": "emilson.geraldo@marinha.mil.br",
    "email_funcional": "emilson.geraldo@marinha.mil.br",
    "nome": "3SG GERALDO - Emilson Pontes Geraldo",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3SG - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "jose.cousaquiviti@marinha.mil.br",
    "email_funcional": "jose.cousaquiviti@marinha.mil.br",
    "nome": "3SG COUSAQUIVITI - José Vinícius Ramos Fernandes Cousaquiviti",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3SG - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "joao.paz@marinha.mil.br",
    "email_funcional": "joao.paz@marinha.mil.br",
    "nome": "3SG CLEBER - João Cleber da Silva Paz",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3SG - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "inacio.guimaraes@marinha.mil.br",
    "email_funcional": "inacio.guimaraes@marinha.mil.br",
    "nome": "3SG INÁCIO - Inácio Carvalho Guimarães",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3SG - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "joao.ramos@marinha.mil.br",
    "email_funcional": "joao.ramos@marinha.mil.br",
    "nome": "3SG JOÃO MARCOS - João Marcos Farias Ramos",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3SG - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "bruno.jesus@marinha.mil.br",
    "email_funcional": "bruno.jesus@marinha.mil.br",
    "nome": "3SG BRUNO MARTINS - Bruno Martins Souza de Jesus",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "3SG - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "cilas.santos@marinha.mil.br",
    "email_funcional": "cilas.santos@marinha.mil.br",
    "nome": "CB CILAS - Cilas de Oliveira Santos",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (MOTORISTAS)"
  },
  {
    "email": "iuri.mello@marinha.mil.br",
    "email_funcional": "iuri.mello@marinha.mil.br",
    "nome": "CB IURI - Iuri Henrique de Mello",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (MOTORISTAS)"
  },
  {
    "email": "gustavo.peres@marinha.mil.br",
    "email_funcional": "gustavo.peres@marinha.mil.br",
    "nome": "CB WELLINGTON - Gustavo Wellington de Jesus Peres",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (MOTORISTAS)"
  },
  {
    "email": "emanoel.moreira@marinha.mil.br",
    "email_funcional": "emanoel.moreira@marinha.mil.br",
    "nome": "CB EMANOEL - Emanoel Ferreira Moreira",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (MOTORISTAS)"
  },
  {
    "email": "joao.souza@marinha.mil.br",
    "email_funcional": "joao.souza@marinha.mil.br",
    "nome": "CB BORDUAN - João Luiz Borduan de Souza",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "italo.mendes@marinha.mil.br",
    "email_funcional": "italo.mendes@marinha.mil.br",
    "nome": "CB ÍTALO - Ítalo Gabriel Silva Mendes",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "alexandre.elias@marinha.mil.br",
    "email_funcional": "alexandre.elias@marinha.mil.br",
    "nome": "CB ELIAS - Alexandre de Oliveira Elias",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "CB - Tripulação CFT (CONTRAMESTRES)"
  },
  {
    "email": "triangulotatico@gmail.com",
    "email_pessoal": "triangulotatico@gmail.com",
    "nome": "EQUIPE TRIÂNGULO TÁTICO CFT",
    "role": "operador",
    "ativo": true,
    "tipo": "google",
    "cargo": "Operador de Campo / Insp. Naval"
  },
  {
    "email": "comsoc.cft@marinha.mil.br",
    "email_funcional": "comsoc.cft@marinha.mil.br",
    "nome": "COMUNICAÇÃO SOCIAL CFT",
    "role": "operador",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "ComSoc - Divisão Pessoal"
  },
  {
    "email": "epm.cft@marinha.mil.br",
    "email_funcional": "epm.cft@marinha.mil.br",
    "nome": "ENSINO PROFISSIONAL MARÍTIMO",
    "role": "admin",
    "ativo": true,
    "tipo": "institucional",
    "cargo": "Divisão de Ensino (Div 10)"
  }
];

export const GAP_MILITARES_MAP: Record<string, MilitarMapItem> = {
  "daniel.costa@marinha.mil.br": {
    "nip": "87.0691.99",
    "posto_grad": "CC",
    "especialidade": "CFT",
    "nome_completo": "Daniel Costa de Souza",
    "nome_guerra": "DANIEL COSTA",
    "rotulo": "CC DANIEL COSTA",
    "email_funcional": "daniel.costa@marinha.mil.br",
    "email_pessoal": "danielcosta@hotmail.com"
  },
  "danielcosta@hotmail.com": {
    "nip": "87.0691.99",
    "posto_grad": "CC",
    "especialidade": "CFT",
    "nome_completo": "Daniel Costa de Souza",
    "nome_guerra": "DANIEL COSTA",
    "rotulo": "CC DANIEL COSTA",
    "email_funcional": "daniel.costa@marinha.mil.br",
    "email_pessoal": "danielcosta@hotmail.com"
  },
  "matheus.bispo@marinha.mil.br": {
    "nip": "14.0124.64",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Matheus Alves de Oliveira",
    "nome_guerra": "MATHEUS",
    "rotulo": "3SG MATHEUS",
    "email_funcional": "matheus.bispo@marinha.mil.br",
    "email_pessoal": "m.bisporj@gmail.com"
  },
  "m.bisporj@gmail.com": {
    "nip": "14.0124.64",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Matheus Alves de Oliveira",
    "nome_guerra": "MATHEUS",
    "rotulo": "3SG MATHEUS",
    "email_funcional": "matheus.bispo@marinha.mil.br",
    "email_pessoal": "m.bisporj@gmail.com"
  },
  "kelly.veras@marinha.mil.br": {
    "nip": "21.3201.28",
    "posto_grad": "1T",
    "especialidade": "CFT",
    "nome_completo": "Kelly Rodrigues Véras",
    "nome_guerra": "VÉRAS",
    "rotulo": "1T VÉRAS",
    "email_funcional": "kelly.veras@marinha.mil.br"
  },
  "camila.cravero@marinha.mil.br": {
    "nip": "21.3218.25",
    "posto_grad": "1T",
    "especialidade": "CFT",
    "nome_completo": "Camila Cravero da Silva",
    "nome_guerra": "CRAVERO",
    "rotulo": "1T CRAVERO",
    "email_funcional": "camila.cravero@marinha.mil.br",
    "email_pessoal": "camilacravero.silva@gmail.com"
  },
  "camilacravero.silva@gmail.com": {
    "nip": "21.3218.25",
    "posto_grad": "1T",
    "especialidade": "CFT",
    "nome_completo": "Camila Cravero da Silva",
    "nome_guerra": "CRAVERO",
    "rotulo": "1T CRAVERO",
    "email_funcional": "camila.cravero@marinha.mil.br",
    "email_pessoal": "camilacravero.silva@gmail.com"
  },
  "balieiro.costa@marinha.mil.br": {
    "nip": "25.0313.25",
    "posto_grad": "1T",
    "especialidade": "CFT",
    "nome_completo": "Luiz Henrique Costa Balieiro",
    "nome_guerra": "BALIEIRO",
    "rotulo": "1T BALIEIRO",
    "email_funcional": "balieiro.costa@marinha.mil.br"
  },
  "azevedo.leonardo@marinha.mil.br": {
    "nip": "14.0052.71",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Dimas Barbosa",
    "nome_guerra": "BARBOSA",
    "rotulo": "3SG BARBOSA",
    "email_funcional": "azevedo.leonardo@marinha.mil.br",
    "email_pessoal": "leoccs@bol.com.br"
  },
  "leoccs@bol.com.br": {
    "nip": "14.0052.71",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Dimas Barbosa",
    "nome_guerra": "BARBOSA",
    "rotulo": "3SG BARBOSA",
    "email_funcional": "azevedo.leonardo@marinha.mil.br",
    "email_pessoal": "leoccs@bol.com.br"
  },
  "cristiano.sacramento@marinha.mil.br": {
    "nip": "97.1057.91",
    "posto_grad": "SO",
    "especialidade": "CFT",
    "nome_completo": "Cristiano do Sacramento Soares",
    "nome_guerra": "SACRAMENTO",
    "rotulo": "SO SACRAMENTO",
    "email_funcional": "cristiano.sacramento@marinha.mil.br",
    "email_pessoal": "sacrasub@gmail.com"
  },
  "sacrasub@gmail.com": {
    "nip": "97.1057.91",
    "posto_grad": "SO",
    "especialidade": "CFT",
    "nome_completo": "Cristiano do Sacramento Soares",
    "nome_guerra": "SACRAMENTO",
    "rotulo": "SO SACRAMENTO",
    "email_funcional": "cristiano.sacramento@marinha.mil.br",
    "email_pessoal": "sacrasub@gmail.com"
  },
  "wevertonluiz@hotmail.com": {
    "nip": "15.0313.57",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Everton Perez Mattos Ferreira",
    "nome_guerra": "EVERTON",
    "rotulo": "3SG EVERTON",
    "email_funcional": "wevertonluiz@hotmail.com",
    "email_pessoal": "wevertonluiz@hotmail.com"
  },
  "rogerio.junior@marinha.mil.br": {
    "nip": "01.0369.55",
    "posto_grad": "SO",
    "especialidade": "CFT",
    "nome_completo": "Rogério Correia de Oliveira Júnior",
    "nome_guerra": "ROGÉRIO",
    "rotulo": "SO ROGÉRIO",
    "email_funcional": "rogerio.junior@marinha.mil.br",
    "email_pessoal": "rogrioj@gmail.com"
  },
  "rogrioj@gmail.com": {
    "nip": "01.0369.55",
    "posto_grad": "SO",
    "especialidade": "CFT",
    "nome_completo": "Rogério Correia de Oliveira Júnior",
    "nome_guerra": "ROGÉRIO",
    "rotulo": "SO ROGÉRIO",
    "email_funcional": "rogerio.junior@marinha.mil.br",
    "email_pessoal": "rogrioj@gmail.com"
  },
  "miguel.nepo.angelo@gmail.com": {
    "nip": "25.4248.23",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Thaina Lima Gomes",
    "nome_guerra": "LIMA",
    "rotulo": "CB LIMA",
    "email_funcional": "miguel.nepo.angelo@gmail.com",
    "email_pessoal": "miguel.nepo.angelo@gmail.com"
  },
  "franciscotomazvieiraangelo1@gmail.com": {
    "nip": "08.0184.81",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Francisco Tomáz Vieira Angelo",
    "nome_guerra": "TOMÁZ",
    "rotulo": "2SG TOMÁZ",
    "email_funcional": "franciscotomazvieiraangelo1@gmail.com",
    "email_pessoal": "franciscotomazvieiraangelo1@gmail.com"
  },
  "azevedo@live.it": {
    "nip": "09.0075.71",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Fernando Paranhos Azevedo",
    "nome_guerra": "PARANHOS",
    "rotulo": "2SG PARANHOS",
    "email_funcional": "azevedo@live.it",
    "email_pessoal": "azevedo@live.it"
  },
  "newrgs@hotmail.com": {
    "nip": "09.0214.42",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Ramon Guimarães Souza",
    "nome_guerra": "RAMON",
    "rotulo": "2SG RAMON",
    "email_funcional": "newrgs@hotmail.com",
    "email_pessoal": "newrgs@hotmail.com"
  },
  "maicon.aparecido@marinha.mil.br": {
    "nip": "10.0164.73",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Maicon Aparecido Gomes da Costa",
    "nome_guerra": "MAICON",
    "rotulo": "2SG MAICON",
    "email_funcional": "maicon.aparecido@marinha.mil.br",
    "email_pessoal": "maiickgomes@hotmail.com"
  },
  "maiickgomes@hotmail.com": {
    "nip": "10.0164.73",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Maicon Aparecido Gomes da Costa",
    "nome_guerra": "MAICON",
    "rotulo": "2SG MAICON",
    "email_funcional": "maicon.aparecido@marinha.mil.br",
    "email_pessoal": "maiickgomes@hotmail.com"
  },
  "rodrigoccosta22@gmail.com": {
    "nip": "11.0261.62",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Rodrigo Corrêa da Costa",
    "nome_guerra": "RODRIGO",
    "rotulo": "2SG RODRIGO",
    "email_funcional": "rodrigoccosta22@gmail.com",
    "email_pessoal": "rodrigoccosta22@gmail.com"
  },
  "azolamauro@gmail.com": {
    "nip": "11.0354.12",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Mauro Azola Ultramar",
    "nome_guerra": "AZOLA",
    "rotulo": "2SG AZOLA",
    "email_funcional": "azolamauro@gmail.com",
    "email_pessoal": "azolamauro@gmail.com"
  },
  "messias4106@gmail.com": {
    "nip": "87.3815.67",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Luiz Jonas Messias Júnior",
    "nome_guerra": "JONAS",
    "rotulo": "3SG JONAS",
    "email_funcional": "messias4106@gmail.com",
    "email_pessoal": "messias4106@gmail.com"
  },
  "nisototal90@hotmail.com": {
    "nip": "11.0691.55",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Reinilson do Nascimento Oliveira",
    "nome_guerra": "REINILSON",
    "rotulo": "3SG REINILSON",
    "email_funcional": "nisototal90@hotmail.com",
    "email_pessoal": "nisototal90@hotmail.com"
  },
  "carlosheitorch13@gmail.com": {
    "nip": "22.1804.27",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Carlos Henrique Rodrigues Costa",
    "nome_guerra": "CARLOS",
    "rotulo": "MN CARLOS",
    "email_funcional": "carlosheitorch13@gmail.com",
    "email_pessoal": "carlosheitorch13@gmail.com"
  },
  "dbarbosamb@gmail.com": {
    "nip": "14.0052.71",
    "posto_grad": "3ºSG",
    "especialidade": "SQ",
    "nome_completo": "DIMAS BARBOSA",
    "nome_guerra": "BARBOSA",
    "rotulo": "3ºSG (SQ) BARBOSA"
  },
  "welderuchoa94@gmail.com": {
    "nip": "14.0170.67",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Welder Uchoa Silva Gomes",
    "nome_guerra": "UCHÔA",
    "rotulo": "3SG UCHÔA",
    "email_funcional": "welderuchoa94@gmail.com",
    "email_pessoal": "welderuchoa94@gmail.com"
  },
  "teixeira.rodrigo@marinha.mil.br": {
    "nip": "15.0193.73",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Rodrigo Pinto da Silva Teixeira",
    "nome_guerra": "TEIXEIRA",
    "rotulo": "3SG TEIXEIRA",
    "email_funcional": "teixeira.rodrigo@marinha.mil.br",
    "email_pessoal": "rodrigo.rpst@hotmail.com"
  },
  "rodrigo.rpst@hotmail.com": {
    "nip": "15.0193.73",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Rodrigo Pinto da Silva Teixeira",
    "nome_guerra": "TEIXEIRA",
    "rotulo": "3SG TEIXEIRA",
    "email_funcional": "teixeira.rodrigo@marinha.mil.br",
    "email_pessoal": "rodrigo.rpst@hotmail.com"
  },
  "thomazbarroso@gmail.com": {
    "nip": "15.0308.57",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "José Thomáz Feio Barroso",
    "nome_guerra": "THOMÁZ",
    "rotulo": "3SG THOMÁZ",
    "email_funcional": "thomazbarroso@gmail.com",
    "email_pessoal": "thomazbarroso@gmail.com"
  },
  "robson.santos@marinha.mil.br": {
    "nip": "15.0197.99",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Robson Santos da Silva",
    "nome_guerra": "ROBSON",
    "rotulo": "3SG ROBSON",
    "email_funcional": "robson.santos@marinha.mil.br",
    "email_pessoal": "robson.gds.27@gmail.com"
  },
  "robson.gds.27@gmail.com": {
    "nip": "15.0197.99",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Robson Santos da Silva",
    "nome_guerra": "ROBSON",
    "rotulo": "3SG ROBSON",
    "email_funcional": "robson.santos@marinha.mil.br",
    "email_pessoal": "robson.gds.27@gmail.com"
  },
  "diego.marinho@marinha.mil.br": {
    "nip": "15.0338.56",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Diego da Silva Marinho",
    "nome_guerra": "MARINHO",
    "rotulo": "3SG MARINHO",
    "email_funcional": "diego.marinho@marinha.mil.br",
    "email_pessoal": "diego.marinho.233@gmail.com"
  },
  "diego.marinho.233@gmail.com": {
    "nip": "15.0338.56",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Diego da Silva Marinho",
    "nome_guerra": "MARINHO",
    "rotulo": "3SG MARINHO",
    "email_funcional": "diego.marinho@marinha.mil.br",
    "email_pessoal": "diego.marinho.233@gmail.com"
  },
  "erlley110394@gmail.com": {
    "nip": "15.0362.51",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Erlley Joel França dos Santos",
    "nome_guerra": "ERLLEY",
    "rotulo": "3SG ERLLEY",
    "email_funcional": "erlley110394@gmail.com",
    "email_pessoal": "erlley110394@gmail.com"
  },
  "aciolycrl@gmail.com": {
    "nip": "19.0099.33",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Luiz Mateus Acioly do Carmo",
    "nome_guerra": "ACIOLY",
    "rotulo": "CB ACIOLY",
    "email_funcional": "aciolycrl@gmail.com",
    "email_pessoal": "aciolycrl@gmail.com"
  },
  "andresouza4778@gmail.com": {
    "nip": "21.0512.41",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "André Lucas Tavares Souza",
    "nome_guerra": "ANDRÉ",
    "rotulo": "CB ANDRÉ",
    "email_funcional": "andresouza4778@gmail.com",
    "email_pessoal": "andresouza4778@gmail.com"
  },
  "thaina44gomes@gmail.com": {
    "nip": "25.4248.23",
    "posto_grad": "CB",
    "especialidade": "RM2-PD",
    "nome_completo": "THAINA LIMA GOMES",
    "nome_guerra": "THAINA",
    "rotulo": "CB (RM2-PD) THAINA"
  },
  "pacificoluzia45@gmail.com": {
    "nip": "25.4252.26",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Luzia Pacífico dos Santos",
    "nome_guerra": "LUZIA",
    "rotulo": "CB LUZIA",
    "email_funcional": "pacificoluzia45@gmail.com",
    "email_pessoal": "pacificoluzia45@gmail.com"
  },
  "pacificoandreza253@gmail.com": {
    "nip": "25.4259.27",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Andreza Pacífico Venâncio",
    "nome_guerra": "ANDREZA",
    "rotulo": "CB ANDREZA",
    "email_funcional": "pacificoandreza253@gmail.com",
    "email_pessoal": "pacificoandreza253@gmail.com"
  },
  "marla.ingridh@gmail.com": {
    "nip": "25.4262.29",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Marla Ingridh Rocha Guedes",
    "nome_guerra": "MARLA",
    "rotulo": "CB MARLA",
    "email_funcional": "marla.ingridh@gmail.com",
    "email_pessoal": "marla.ingridh@gmail.com"
  },
  "matheussantosmb2000@gmail.com": {
    "nip": "22.1773.29",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Mateus Dias de Almeida",
    "nome_guerra": "DIAS",
    "rotulo": "MN DIAS",
    "email_funcional": "matheussantosmb2000@gmail.com",
    "email_pessoal": "matheussantosmb2000@gmail.com"
  },
  "carloshrc6@gmail.com": {
    "nip": "22.1804.27",
    "posto_grad": "MN",
    "especialidade": "RM-2",
    "nome_completo": "CARLOS HENRIQUE RODRIGUES COSTA",
    "nome_guerra": "RODRIGUES",
    "rotulo": "MN (RM-2) RODRIGUES"
  },
  "gabrieldacostatanantatanantat@gmail.com": {
    "nip": "22.1807.29",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Gabriel da Costa Tananta",
    "nome_guerra": "TANANTA",
    "rotulo": "MN TANANTA",
    "email_funcional": "gabrieldacostatanantatanantat@gmail.com",
    "email_pessoal": "gabrieldacostatanantatanantat@gmail.com"
  },
  "evertonarcanjobc123@gmail.com": {
    "nip": "22.1810.24",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Everton Arcanjo Garrido",
    "nome_guerra": "GARRIDO",
    "rotulo": "MN GARRIDO",
    "email_funcional": "evertonarcanjobc123@gmail.com",
    "email_pessoal": "evertonarcanjobc123@gmail.com"
  },
  "pedrinhograndes16@gmail.com": {
    "nip": "24.3773.25",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Luis Antonio Grande Lopes",
    "nome_guerra": "GRANDE",
    "rotulo": "MN GRANDE",
    "email_funcional": "pedrinhograndes16@gmail.com",
    "email_pessoal": "pedrinhograndes16@gmail.com"
  },
  "danleyataide17@gmail.com": {
    "nip": "25.3312.21",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Danley Ataide Angelo",
    "nome_guerra": "DANLEY",
    "rotulo": "MN DANLEY",
    "email_funcional": "danleyataide17@gmail.com",
    "email_pessoal": "danleyataide17@gmail.com"
  },
  "haymanpequeno87@gmail.com": {
    "nip": "25.3325.20",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Hayman Pequeno da Silva",
    "nome_guerra": "PEQUENO",
    "rotulo": "MN PEQUENO",
    "email_funcional": "haymanpequeno87@gmail.com",
    "email_pessoal": "haymanpequeno87@gmail.com"
  },
  "jandersonvinicius290@gmail.com": {
    "nip": "25.3360.29",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Janderson Vinicius da Costa D'Avila",
    "nome_guerra": "D'AVILA",
    "rotulo": "MN D'AVILA",
    "email_funcional": "jandersonvinicius290@gmail.com",
    "email_pessoal": "jandersonvinicius290@gmail.com"
  },
  "levycastro75@gmail.com": {
    "nip": "25.3376.29",
    "posto_grad": "MN",
    "especialidade": "CFT",
    "nome_completo": "Levy de Castro Macedo",
    "nome_guerra": "CASTRO",
    "rotulo": "MN CASTRO",
    "email_funcional": "levycastro75@gmail.com",
    "email_pessoal": "levycastro75@gmail.com"
  },
  "eduardo.held@marinha.mil.br": {
    "nip": "06.0638.70",
    "posto_grad": "CF",
    "especialidade": "CFT",
    "nome_completo": "Eduardo Guimarães de Held",
    "nome_guerra": "HELD",
    "rotulo": "CF HELD",
    "email_funcional": "eduardo.held@marinha.mil.br"
  },
  "edson.santos@marinha.mil.br": {
    "nip": "15.0198.00",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Leonardo Silva Ribeiro",
    "nome_guerra": "RIBEIRO",
    "rotulo": "3SG RIBEIRO",
    "email_funcional": "edson.santos@marinha.mil.br"
  },
  "humberto.serra@marinha.mil.br": {
    "nip": "99.1860.39",
    "posto_grad": "SO",
    "especialidade": "CFT",
    "nome_completo": "Humberto Marino dos Santos Serra",
    "nome_guerra": "MARINO",
    "rotulo": "SO MARINO",
    "email_funcional": "humberto.serra@marinha.mil.br"
  },
  "edvaldo.souza@marinha.mil.br": {
    "nip": "97.1125.42",
    "posto_grad": "SO",
    "especialidade": "CFT",
    "nome_completo": "Edvaldo Vicente de Souza",
    "nome_guerra": "EDVALDO",
    "rotulo": "SO EDVALDO",
    "email_funcional": "edvaldo.souza@marinha.mil.br"
  },
  "bruno.rubem@marinha.mil.br": {
    "nip": "07.1546.58",
    "posto_grad": "1SG",
    "especialidade": "CFT",
    "nome_completo": "Bruno Rodrigues Rubem",
    "nome_guerra": "RUBEM",
    "rotulo": "1SG RUBEM",
    "email_funcional": "bruno.rubem@marinha.mil.br"
  },
  "tiago.faria@marinha.mil.br": {
    "nip": "05.0624.38",
    "posto_grad": "1SG",
    "especialidade": "CFT",
    "nome_completo": "Tiago Gonçalves Faria",
    "nome_guerra": "TIAGO",
    "rotulo": "1SG TIAGO",
    "email_funcional": "tiago.faria@marinha.mil.br"
  },
  "nilton.junior@marinha.mil.br": {
    "nip": "14.0992.17",
    "posto_grad": "2SG",
    "especialidade": "CFT",
    "nome_completo": "Nilton da Silva Carvalho Junior",
    "nome_guerra": "NILTON",
    "rotulo": "2SG NILTON",
    "email_funcional": "nilton.junior@marinha.mil.br"
  },
  "emilson.geraldo@marinha.mil.br": {
    "nip": "15.1637.33",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Emilson Pontes Geraldo",
    "nome_guerra": "GERALDO",
    "rotulo": "3SG GERALDO",
    "email_funcional": "emilson.geraldo@marinha.mil.br"
  },
  "jose.cousaquiviti@marinha.mil.br": {
    "nip": "13.0332.98",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "José Vinícius Ramos Fernandes Cousaquiviti",
    "nome_guerra": "COUSAQUIVITI",
    "rotulo": "3SG COUSAQUIVITI",
    "email_funcional": "jose.cousaquiviti@marinha.mil.br"
  },
  "joao.paz@marinha.mil.br": {
    "nip": "15.0289.92",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "João Cleber da Silva Paz",
    "nome_guerra": "CLEBER",
    "rotulo": "3SG CLEBER",
    "email_funcional": "joao.paz@marinha.mil.br"
  },
  "inacio.guimaraes@marinha.mil.br": {
    "nip": "13.1220.70",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Inácio Carvalho Guimarães",
    "nome_guerra": "INÁCIO",
    "rotulo": "3SG INÁCIO",
    "email_funcional": "inacio.guimaraes@marinha.mil.br"
  },
  "joao.ramos@marinha.mil.br": {
    "nip": "15.0234.01",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "João Marcos Farias Ramos",
    "nome_guerra": "JOÃO MARCOS",
    "rotulo": "3SG JOÃO MARCOS",
    "email_funcional": "joao.ramos@marinha.mil.br"
  },
  "bruno.jesus@marinha.mil.br": {
    "nip": "15.0311.01",
    "posto_grad": "3SG",
    "especialidade": "CFT",
    "nome_completo": "Bruno Martins Souza de Jesus",
    "nome_guerra": "BRUNO MARTINS",
    "rotulo": "3SG BRUNO MARTINS",
    "email_funcional": "bruno.jesus@marinha.mil.br"
  },
  "cilas.santos@marinha.mil.br": {
    "nip": "18.0073.09",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Cilas de Oliveira Santos",
    "nome_guerra": "CILAS",
    "rotulo": "CB CILAS",
    "email_funcional": "cilas.santos@marinha.mil.br"
  },
  "iuri.mello@marinha.mil.br": {
    "nip": "18.0139.11",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Iuri Henrique de Mello",
    "nome_guerra": "IURI",
    "rotulo": "CB IURI",
    "email_funcional": "iuri.mello@marinha.mil.br"
  },
  "gustavo.peres@marinha.mil.br": {
    "nip": "18.0135.89",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Gustavo Wellington de Jesus Peres",
    "nome_guerra": "WELLINGTON",
    "rotulo": "CB WELLINGTON",
    "email_funcional": "gustavo.peres@marinha.mil.br"
  },
  "emanoel.moreira@marinha.mil.br": {
    "nip": "20.0417.48",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Emanoel Ferreira Moreira",
    "nome_guerra": "EMANOEL",
    "rotulo": "CB EMANOEL",
    "email_funcional": "emanoel.moreira@marinha.mil.br"
  },
  "joao.souza@marinha.mil.br": {
    "nip": "21.0805.42",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "João Luiz Borduan de Souza",
    "nome_guerra": "BORDUAN",
    "rotulo": "CB BORDUAN",
    "email_funcional": "joao.souza@marinha.mil.br"
  },
  "italo.mendes@marinha.mil.br": {
    "nip": "21.0779.41",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Ítalo Gabriel Silva Mendes",
    "nome_guerra": "ÍTALO",
    "rotulo": "CB ÍTALO",
    "email_funcional": "italo.mendes@marinha.mil.br"
  },
  "alexandre.elias@marinha.mil.br": {
    "nip": "21.0767.40",
    "posto_grad": "CB",
    "especialidade": "CFT",
    "nome_completo": "Alexandre de Oliveira Elias",
    "nome_guerra": "ELIAS",
    "rotulo": "CB ELIAS",
    "email_funcional": "alexandre.elias@marinha.mil.br"
  }
};

const KEY_AUTH_CACHE = "sispescft_auth_users_cache";
const KEY_SENHAS_CACHE = "sispescft_user_passwords";
const KEY_SOLICITACOES = "sispescft_solicitacoes_cache";
export const KEY_ACTIVE_SESSION = "sispescft_active_session";

export function normalizarEmail(email: string): string {
  return (email || "").toLowerCase().trim();
}

export function isMasterAdmin(email: string): boolean {
  const norm = normalizarEmail(email);
  return MASTER_ADMIN_EMAILS.some((m) => normalizarEmail(m) === norm);
}

export function obterCacheUsuarios(): UsuarioCftAuth[] {
  if (typeof window === "undefined") return GAP_DEFAULT_WHITELIST;
  try {
    const raw = window.localStorage.getItem(KEY_AUTH_CACHE);
    if (!raw) {
      window.localStorage.setItem(KEY_AUTH_CACHE, JSON.stringify(GAP_DEFAULT_WHITELIST));
      return GAP_DEFAULT_WHITELIST;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : GAP_DEFAULT_WHITELIST;
  } catch {
    return GAP_DEFAULT_WHITELIST;
  }
}

export function salvarCacheUsuarios(lista: UsuarioCftAuth[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_AUTH_CACHE, JSON.stringify(lista));
  } catch (e) {
    console.warn("[SisPesCFT] Erro ao salvar cache de usuários:", e);
  }
}

export function obterStatusSenhaUsuario(email: string): { senhaAlterada: boolean; senhaValida: (pass: string) => boolean } {
  const norm = normalizarEmail(email);
  if (typeof window === "undefined") {
    return { senhaAlterada: false, senhaValida: (p) => p === SENHA_PADRAO_INSTITUCIONAL };
  }
  try {
    const raw = window.localStorage.getItem(KEY_SENHAS_CACHE);
    const senhas = raw ? JSON.parse(raw) : {};
    if (senhas[norm]) {
      return {
        senhaAlterada: true,
        senhaValida: (p: string) => p.trim() === senhas[norm],
      };
    }
  } catch {}
  return {
    senhaAlterada: false,
    senhaValida: (p: string) => p.trim() === SENHA_PADRAO_INSTITUCIONAL,
  };
}

export function salvarNovaSenhaUsuario(email: string, novaSenha: string): void {
  const norm = normalizarEmail(email);
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY_SENHAS_CACHE);
    const senhas = raw ? JSON.parse(raw) : {};
    senhas[norm] = novaSenha.trim();
    window.localStorage.setItem(KEY_SENHAS_CACHE, JSON.stringify(senhas));
  } catch (e) {
    console.warn("[SisPesCFT] Erro ao gravar nova senha local:", e);
  }
}

export function resetarSenhaParaPadrao(email: string): void {
  const norm = normalizarEmail(email);
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY_SENHAS_CACHE);
    const senhas = raw ? JSON.parse(raw) : {};
    delete senhas[norm];
    window.localStorage.setItem(KEY_SENHAS_CACHE, JSON.stringify(senhas));
  } catch (e) {
    console.warn("[SisPesCFT] Erro ao resetar senha local:", e);
  }
}

export function obterMilitarVinculado(email: string): MilitarMapItem | null {
  const norm = normalizarEmail(email);
  if (!norm) return null;

  if (GAP_MILITARES_MAP[norm]) {
    return { ...GAP_MILITARES_MAP[norm] };
  }

  const usuarios = obterCacheUsuarios();
  const u = usuarios.find((item) => {
    const ePri = normalizarEmail(item.email);
    const eFun = normalizarEmail(item.email_funcional || "");
    const ePes = normalizarEmail(item.email_pessoal || "");
    return ePri === norm || (eFun && eFun === norm) || (ePes && ePes === norm);
  });

  if (u) {
    return {
      nip: "00.0000.00",
      posto_grad: u.role === "super_admin" ? "SO" : u.role === "admin" ? "OFICIAL" : "PRAÇA",
      nome_completo: u.nome,
      nome_guerra: u.nome.split(" ")[0] || "MILITAR",
      rotulo: u.cargo || u.nome,
      email_funcional: u.email_funcional || u.email,
      email_pessoal: u.email_pessoal,
    };
  }

  return null;
}

export function obterListaMilitaresCompleta(): MilitarMapItem[] {
  const lista: MilitarMapItem[] = [];
  const nipsVistos = new Set<string>();

  for (const em in GAP_MILITARES_MAP) {
    const m = GAP_MILITARES_MAP[em];
    const chave = (m.nip || m.nome_guerra).toLowerCase();
    if (!nipsVistos.has(chave)) {
      nipsVistos.add(chave);
      lista.push({ ...m });
    }
  }

  return lista;
}

export function verificarEmailAutorizado(email: string): {
  autorizado: boolean;
  usuario?: UsuarioCftAuth;
  motivo?: string;
} {
  const norm = normalizarEmail(email);
  if (!norm) return { autorizado: false, motivo: "E-mail não informado." };

  if (isMasterAdmin(norm)) {
    return {
      autorizado: true,
      usuario: {
        email: norm,
        email_funcional: "cristiano.sacramento@marinha.mil.br",
        email_pessoal: "sacrasub@gmail.com",
        nome: "CRISTIANO DO SACRAMENTO SOARES",
        role: "super_admin",
        ativo: true,
        cargo: "Super Admin Master",
      },
    };
  }

  const lista = obterCacheUsuarios();
  const usuario = lista.find((u) => {
    const ePri = normalizarEmail(u.email);
    const eFun = normalizarEmail(u.email_funcional || "");
    const ePes = normalizarEmail(u.email_pessoal || "");
    return ePri === norm || (eFun && eFun === norm) || (ePes && ePes === norm);
  });

  if (!usuario) {
    return {
      autorizado: false,
      motivo: `O e-mail "${email}" não está autorizado. Solicite liberação ao Administrador.`,
    };
  }

  if (usuario.ativo === false) {
    return {
      autorizado: false,
      motivo: `O acesso para "${email}" foi temporariamente desativado pelo Administrador.`,
    };
  }

  return { autorizado: true, usuario };
}

export function mapearParaUsuarioSisPes(
  authItem: UsuarioCftAuth,
  milItem?: MilitarMapItem | null
): Usuario {
  const role = authItem.role || (isMasterAdmin(authItem.email) ? "super_admin" : "operador");
  let perfil: Perfil = "LIDERANCA";
  if (role === "super_admin" || role === "admin") perfil = "ADMIN";
  else perfil = "DIVISAO";

  let divisao: DivisaoId = "STA";
  if (milItem?.rotulo?.includes("EPM") || milItem?.posto_grad?.includes("1ºTen")) {
    divisao = "EPM";
  } else if (milItem?.rotulo?.includes("IM") || milItem?.nome_guerra?.includes("BISPO") || milItem?.nome_guerra?.includes("SACRAMENTO")) {
    divisao = "PESSOAL";
  } else if (milItem?.posto_grad === "CC" || milItem?.posto_grad === "CF") {
    divisao = "COMANDO";
  }

  return {
    id: milItem?.nip || authItem.email,
    nome: milItem ? `${milItem.posto_grad} ${milItem.nome_guerra}` : authItem.nome,
    cargo: milItem ? (milItem.rotulo || `${milItem.posto_grad} (${milItem.especialidade || "CFT"}) ${milItem.nome_guerra}`) : (authItem.cargo || "Tripulante CFT"),
    perfil,
    divisao,
    email: authItem.email,
    nip: milItem?.nip,
    posto: (milItem?.posto_grad as Posto) || "SO",
    nomeGuerra: milItem?.nome_guerra || authItem.nome.split(" ")[0],
    roleCft: role === "visualizador" ? "operador" : role,
  };
}

export async function loginComGoogleService(): Promise<{
  sucesso: boolean;
  usuario?: Usuario;
  erro?: string;
  isDomainError?: boolean;
}> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { sucesso: false, erro: "Serviço de autenticação do Google indisponível no momento." };
  }

  try {
    const provider = getGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    const gUser = result.user;
    if (!gUser || !gUser.email) {
      return { sucesso: false, erro: "Não foi possível obter o e-mail da conta Google." };
    }

    const check = verificarEmailAutorizado(gUser.email);
    if (!check.autorizado) {
      return {
        sucesso: false,
        erro: check.motivo || `E-mail ${gUser.email} não autorizado. Solicite acesso ao Administrador.`,
      };
    }

    const authItem = check.usuario!;
    const milItem = obterMilitarVinculado(gUser.email);
    const usuarioSis = mapearParaUsuarioSisPes(authItem, milItem);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(usuarioSis));
    }

    return { sucesso: true, usuario: usuarioSis };
  } catch (err: any) {
    console.warn("[SisPesCFT] Erro no login Google:", err);
    if (err.code === "auth/unauthorized-domain") {
      const host = typeof window !== "undefined" ? window.location.hostname : "dominio";
      return {
        sucesso: false,
        isDomainError: true,
        erro: `O domínio "${host}" precisa ser autorizado no Firebase Console (agenda-cft-01) em Authentication > Configurações > Domínios Autorizados. Enquanto isso, acesse com seu e-mail funcional ou senha.`,
      };
    }
    if (err.code === "auth/popup-closed-by-user") {
      return { sucesso: false, erro: "Janela do Google fechada antes da confirmação." };
    }
    return { sucesso: false, erro: err.message || "Falha na autenticação Google." };
  }
}

export async function loginComEmailFuncionalService(
  email: string,
  pass: string
): Promise<{
  sucesso: boolean;
  usuario?: Usuario;
  precisaTrocarSenha?: boolean;
  erro?: string;
}> {
  const norm = normalizarEmail(email);
  if (!norm) return { sucesso: false, erro: "Informe seu e-mail institucional." };
  if (!pass) return { sucesso: false, erro: `Informe a senha de acesso (Padrão inicial: "${SENHA_PADRAO_INSTITUCIONAL}").` };

  const check = verificarEmailAutorizado(norm);
  if (!check.autorizado) {
    return { sucesso: false, erro: check.motivo || `O e-mail "${norm}" não está autorizado.` };
  }

  const statusSenha = obterStatusSenhaUsuario(norm);
  if (!statusSenha.senhaValida(pass)) {
    return {
      sucesso: false,
      erro: statusSenha.senhaAlterada
        ? "Senha incorreta."
        : `Senha incorreta. Para o primeiro acesso, utilize a senha padrão institucional: "${SENHA_PADRAO_INSTITUCIONAL}".`,
    };
  }

  const authItem = check.usuario!;
  const milItem = obterMilitarVinculado(norm);
  const usuarioSis = mapearParaUsuarioSisPes(authItem, milItem);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(usuarioSis));
  }

  return {
    sucesso: true,
    usuario: usuarioSis,
    precisaTrocarSenha: !statusSenha.senhaAlterada,
  };
}

export function obterSolicitacoesAcesso(): SolicitacaoAcesso[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_SOLICITACOES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function registrarSolicitacaoAcesso(dados: {
  email: string;
  nome: string;
  nip?: string;
  setor?: string;
  motivo?: string;
}): Promise<void> {
  const norm = normalizarEmail(dados.email);
  if (!norm) throw new Error("E-mail é obrigatório.");
  if (!dados.nome.trim()) throw new Error("Nome é obrigatório.");

  const nova: SolicitacaoAcesso = {
    id: `sol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: norm,
    nome: dados.nome.trim(),
    nip: dados.nip?.trim() || "",
    setor: dados.setor?.trim() || "Atendimento Geral",
    motivo: dados.motivo?.trim() || "Acesso ao SisPesCFT",
    status: "pendente",
    dataSolicitacao: new Date().toISOString(),
  };

  const lista = obterSolicitacoesAcesso();
  lista.unshift(nova);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_SOLICITACOES, JSON.stringify(lista));
  }

  try {
    const db = getFirebaseDb();
    if (db) {
      const docRef = doc(collection(db, "gap_solicitacoes"), nova.id);
      await setDoc(docRef, { ...nova, serverCreatedAt: serverTimestamp() });
    }
  } catch (e) {
    console.warn("[SisPesCFT] Firestore offline, solicitação salva no cache local:", e);
  }
}

export async function aprovarSolicitacaoAcesso(
  id: string,
  role: "super_admin" | "admin" | "operador" | "visualizador" = "operador"
): Promise<void> {
  const lista = obterSolicitacoesAcesso();
  const sol = lista.find((s) => s.id === id);
  if (!sol) return;

  sol.status = "aprovado";
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_SOLICITACOES, JSON.stringify(lista));
  }

  const users = obterCacheUsuarios();
  if (!users.some((u) => normalizarEmail(u.email) === normalizarEmail(sol.email))) {
    users.push({
      email: sol.email,
      nome: sol.nome,
      role,
      ativo: true,
      tipo: sol.email.endsWith("@marinha.mil.br") ? "institucional" : "google",
      cargo: sol.setor || "Tripulante CFT",
    });
    salvarCacheUsuarios(users);
  }

  try {
    const db = getFirebaseDb();
    if (db) {
      await updateDoc(doc(db, "gap_solicitacoes", id), { status: "aprovado" });
    }
  } catch {}
}

export async function rejeitarSolicitacaoAcesso(id: string): Promise<void> {
  const lista = obterSolicitacoesAcesso();
  const sol = lista.find((s) => s.id === id);
  if (!sol) return;

  sol.status = "rejeitado";
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_SOLICITACOES, JSON.stringify(lista));
  }

  try {
    const db = getFirebaseDb();
    if (db) {
      await updateDoc(doc(db, "gap_solicitacoes", id), { status: "rejeitado" });
    }
  } catch {}
}

export function cadastrarEmailsEmLote(
  texto: string,
  role: "super_admin" | "admin" | "operador" | "visualizador" = "operador"
): { adicionados: number; total: number } {
  const linhas = texto
    .split(/[\r\n,;]+/)
    .map((e) => normalizarEmail(e))
    .filter((e) => e.length > 3 && e.includes("@"));

  const users = obterCacheUsuarios();
  let adicionados = 0;

  linhas.forEach((email) => {
    if (!users.some((u) => normalizarEmail(u.email) === email)) {
      users.push({
        email,
        nome: email.split("@")[0].toUpperCase().replace(/\./g, " "),
        role,
        ativo: true,
        tipo: email.endsWith("@marinha.mil.br") ? "institucional" : "google",
        cargo: "Tripulação CFT",
      });
      adicionados++;
    }
  });

  if (adicionados > 0) {
    salvarCacheUsuarios(users);
  }

  return { adicionados, total: users.length };
}

export function cadastrarUsuarioIndividual(dados: {
  email: string;
  email_funcional?: string;
  email_pessoal?: string;
  nome: string;
  role: "super_admin" | "admin" | "operador" | "visualizador";
  cargo?: string;
  nip?: string;
  posto_grad?: string;
  nome_guerra?: string;
}): void {
  const emailNorm = normalizarEmail(dados.email);
  if (!emailNorm) throw new Error("E-mail principal é obrigatório.");

  const users = obterCacheUsuarios();
  const idx = users.findIndex((u) => normalizarEmail(u.email) === emailNorm);

  const novoUsuario: UsuarioCftAuth = {
    email: emailNorm,
    email_funcional: dados.email_funcional ? normalizarEmail(dados.email_funcional) : undefined,
    email_pessoal: dados.email_pessoal ? normalizarEmail(dados.email_pessoal) : undefined,
    nome: dados.nome.trim(),
    role: dados.role,
    ativo: true,
    tipo: emailNorm.endsWith("@marinha.mil.br") ? "institucional" : "google",
    cargo: dados.cargo || (dados.posto_grad ? `${dados.posto_grad} - Tripulação CFT` : "Tripulação CFT"),
  };

  if (idx !== -1) {
    users[idx] = novoUsuario;
  } else {
    users.unshift(novoUsuario);
  }

  salvarCacheUsuarios(users);

  // Vincular ao mapa de militares
  if (dados.nip || dados.nome_guerra) {
    const itemMap: MilitarMapItem = {
      nip: dados.nip || "00.0000.00",
      posto_grad: dados.posto_grad || "PRAÇA",
      nome_completo: dados.nome,
      nome_guerra: dados.nome_guerra || dados.nome.split(" ")[0],
      rotulo: dados.posto_grad ? `${dados.posto_grad} ${dados.nome_guerra || ""}`.trim() : dados.nome,
      email_funcional: dados.email_funcional || emailNorm,
      email_pessoal: dados.email_pessoal,
    };
    GAP_MILITARES_MAP[emailNorm] = itemMap;
    if (dados.email_pessoal) GAP_MILITARES_MAP[normalizarEmail(dados.email_pessoal)] = itemMap;
    if (dados.email_funcional) GAP_MILITARES_MAP[normalizarEmail(dados.email_funcional)] = itemMap;
  }
}

export function alterarStatusUsuario(email: string, ativo: boolean): void {
  const norm = normalizarEmail(email);
  const users = obterCacheUsuarios();
  const item = users.find((u) => normalizarEmail(u.email) === norm);
  if (item) {
    item.ativo = ativo;
    salvarCacheUsuarios(users);
  }
}

export function alterarRoleUsuario(
  email: string,
  novoRole: "super_admin" | "admin" | "operador" | "visualizador"
): void {
  const norm = normalizarEmail(email);
  const users = obterCacheUsuarios();
  const item = users.find((u) => normalizarEmail(u.email) === norm);
  if (item) {
    item.role = novoRole;
    salvarCacheUsuarios(users);
  }
}

export function removerUsuario(email: string): void {
  const norm = normalizarEmail(email);
  let users = obterCacheUsuarios();
  users = users.filter((u) => normalizarEmail(u.email) !== norm);
  salvarCacheUsuarios(users);
}
