import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
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
  role: "super_admin" | "admin" | "operador";
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
  }
];

export const GAP_MILITARES_MAP: Record<string, MilitarMapItem> = {
  "daniel.costa@marinha.mil.br": {
    "nip": "87.0691.99",
    "posto_grad": "CC",
    "especialidade": "AA",
    "nome_completo": "DANIEL COSTA DE SOUZA",
    "nome_guerra": "DANIEL COSTA",
    "rotulo": "CC (AA) DANIEL COSTA",
    "email_funcional": "daniel.costa@marinha.mil.br",
    "email_pessoal": "danielcosta@hotmail.com"
  },
  "danielcosta@hotmail.com": {
    "nip": "87.0691.99",
    "posto_grad": "CC",
    "especialidade": "AA",
    "nome_completo": "DANIEL COSTA DE SOUZA",
    "nome_guerra": "DANIEL COSTA",
    "rotulo": "CC (AA) DANIEL COSTA",
    "email_funcional": "daniel.costa@marinha.mil.br",
    "email_pessoal": "danielcosta@hotmail.com"
  },
  "matheus.bispo@marinha.mil.br": {
    "nip": "10.0235.51",
    "posto_grad": "CT",
    "especialidade": "IM",
    "nome_completo": "MATHEUS BISPO PIRES DA SILVA",
    "nome_guerra": "BISPO",
    "rotulo": "CT (IM) BISPO",
    "email_funcional": "matheus.bispo@marinha.mil.br",
    "email_pessoal": "m.bisporj@gmail.com"
  },
  "m.bisporj@gmail.com": {
    "nip": "10.0235.51",
    "posto_grad": "CT",
    "especialidade": "IM",
    "nome_completo": "MATHEUS BISPO PIRES DA SILVA",
    "nome_guerra": "BISPO",
    "rotulo": "CT (IM) BISPO",
    "email_funcional": "matheus.bispo@marinha.mil.br",
    "email_pessoal": "m.bisporj@gmail.com"
  },
  "kelly.veras@marinha.mil.br": {
    "nip": "21.3201.28",
    "posto_grad": "1ºTen",
    "especialidade": "RM2-T",
    "nome_completo": "KELLY RODRIGUES VÉRAS",
    "nome_guerra": "VÉRAS",
    "rotulo": "1ºTen (RM2-T) VÉRAS",
    "email_funcional": "kelly.veras@marinha.mil.br"
  },
  "camila.cravero@marinha.mil.br": {
    "nip": "21.3218.25",
    "posto_grad": "1ºTen",
    "especialidade": "RM2-T",
    "nome_completo": "CAMILA CRAVERO DA SILVA",
    "nome_guerra": "CRAVERO",
    "rotulo": "1ºTen (RM2-T) CRAVERO",
    "email_funcional": "camila.cravero@marinha.mil.br",
    "email_pessoal": "camilacravero.silva@gmail.com"
  },
  "camilacravero.silva@gmail.com": {
    "nip": "21.3218.25",
    "posto_grad": "1ºTen",
    "especialidade": "RM2-T",
    "nome_completo": "CAMILA CRAVERO DA SILVA",
    "nome_guerra": "CRAVERO",
    "rotulo": "1ºTen (RM2-T) CRAVERO",
    "email_funcional": "camila.cravero@marinha.mil.br",
    "email_pessoal": "camilacravero.silva@gmail.com"
  },
  "balieiro.costa@marinha.mil.br": {
    "nip": "25.0313.25",
    "posto_grad": "1ºTen",
    "especialidade": "RM2-Md",
    "nome_completo": "LUIZ HENRIQUE COSTA BALIEIRO",
    "nome_guerra": "BALIEIRO",
    "rotulo": "1ºTen (RM2-Md) BALIEIRO",
    "email_funcional": "balieiro.costa@marinha.mil.br"
  },
  "azevedo.leonardo@marinha.mil.br": {
    "nip": "03.0294.33",
    "posto_grad": "2ºTen",
    "especialidade": "AA",
    "nome_completo": "LEONARDO BARBOSA AZEVEDO",
    "nome_guerra": "AZEVEDO",
    "rotulo": "2ºTen (AA) AZEVEDO",
    "email_funcional": "azevedo.leonardo@marinha.mil.br",
    "email_pessoal": "leoccs@bol.com.br"
  },
  "leoccs@bol.com.br": {
    "nip": "03.0294.33",
    "posto_grad": "2ºTen",
    "especialidade": "AA",
    "nome_completo": "LEONARDO BARBOSA AZEVEDO",
    "nome_guerra": "AZEVEDO",
    "rotulo": "2ºTen (AA) AZEVEDO",
    "email_funcional": "azevedo.leonardo@marinha.mil.br",
    "email_pessoal": "leoccs@bol.com.br"
  },
  "cristiano.sacramento@marinha.mil.br": {
    "nip": "97.1057.91",
    "posto_grad": "SO",
    "especialidade": "CI-SB",
    "nome_completo": "CRISTIANO DO SACRAMENTO SOARES",
    "nome_guerra": "SACRAMENTO",
    "rotulo": "SO (CI-SB) SACRAMENTO",
    "email_funcional": "cristiano.sacramento@marinha.mil.br",
    "email_pessoal": "sacrasub@gmail.com"
  },
  "sacrasub@gmail.com": {
    "nip": "97.1057.91",
    "posto_grad": "SO",
    "especialidade": "CI-SB",
    "nome_completo": "CRISTIANO DO SACRAMENTO SOARES",
    "nome_guerra": "SACRAMENTO",
    "rotulo": "SO (CI-SB) SACRAMENTO",
    "email_funcional": "cristiano.sacramento@marinha.mil.br",
    "email_pessoal": "sacrasub@gmail.com"
  },
  "wevertonluiz@hotmail.com": {
    "nip": "99.2056.53",
    "posto_grad": "SO",
    "especialidade": "MO",
    "nome_completo": "WEVERTON LUIZ FRANÇA",
    "nome_guerra": "FRANÇA",
    "rotulo": "SO (MO) FRANÇA",
    "email_pessoal": "wevertonluiz@hotmail.com"
  },
  "rogerio.junior@marinha.mil.br": {
    "nip": "01.0369.55",
    "posto_grad": "SO",
    "especialidade": "ET-SB",
    "nome_completo": "ROGÉRIO CORREIA DE OLIVEIRA JÚNIOR",
    "nome_guerra": "JÚNIOR",
    "rotulo": "SO (ET-SB) JÚNIOR",
    "email_funcional": "rogerio.junior@marinha.mil.br",
    "email_pessoal": "rogrioj@gmail.com"
  },
  "rogrioj@gmail.com": {
    "nip": "01.0369.55",
    "posto_grad": "SO",
    "especialidade": "ET-SB",
    "nome_completo": "ROGÉRIO CORREIA DE OLIVEIRA JÚNIOR",
    "nome_guerra": "JÚNIOR",
    "rotulo": "SO (ET-SB) JÚNIOR",
    "email_funcional": "rogerio.junior@marinha.mil.br",
    "email_pessoal": "rogrioj@gmail.com"
  },
  "miguel.nepo.angelo@gmail.com": {
    "nip": "06.0301.06",
    "posto_grad": "1ºSG",
    "especialidade": "MT",
    "nome_completo": "MIGUEL ANGELO NEPOMUCENO DE LIMA",
    "nome_guerra": "NEPOMUCENO",
    "rotulo": "1ºSG (MT) NEPOMUCENO"
  },
  "franciscotomazvieiraangelo1@gmail.com": {
    "nip": "08.0184.81",
    "posto_grad": "2ºSG",
    "especialidade": "ET",
    "nome_completo": "FRANCISCO TOMÁZ VIEIRA ANGELO",
    "nome_guerra": "TOMÁZ",
    "rotulo": "2ºSG (ET) TOMÁZ"
  },
  "azevedo@live.it": {
    "nip": "09.0075.71",
    "posto_grad": "2ºSG",
    "especialidade": "BA",
    "nome_completo": "FERNANDO PARANHOS AZEVEDO",
    "nome_guerra": "PARANHOS",
    "rotulo": "2ºSG (BA) PARANHOS"
  },
  "newrgs@hotmail.com": {
    "nip": "09.0214.42",
    "posto_grad": "2ºSG",
    "especialidade": "AM",
    "nome_completo": "RAMON GUIMARÃES SOUZA",
    "nome_guerra": "GUIMARÃES",
    "rotulo": "2ºSG (AM) GUIMARÃES"
  },
  "maicon.aparecido@marinha.mil.br": {
    "nip": "10.0164.73",
    "posto_grad": "2ºSG",
    "especialidade": "PL",
    "nome_completo": "MAICON APARECIDO GOMES DA COSTA",
    "nome_guerra": "MAICON",
    "rotulo": "2ºSG (PL) MAICON",
    "email_funcional": "maicon.aparecido@marinha.mil.br",
    "email_pessoal": "maiickgomes@hotmail.com"
  },
  "maiickgomes@hotmail.com": {
    "nip": "10.0164.73",
    "posto_grad": "2ºSG",
    "especialidade": "PL",
    "nome_completo": "MAICON APARECIDO GOMES DA COSTA",
    "nome_guerra": "MAICON",
    "rotulo": "2ºSG (PL) MAICON",
    "email_funcional": "maicon.aparecido@marinha.mil.br",
    "email_pessoal": "maiickgomes@hotmail.com"
  },
  "rodrigoccosta22@gmail.com": {
    "nip": "11.0261.62",
    "posto_grad": "2ºSG",
    "especialidade": "ET",
    "nome_completo": "RODRIGO CORRÊA DA COSTA",
    "nome_guerra": "RODRIGO",
    "rotulo": "2ºSG (ET) RODRIGO"
  },
  "azolamauro@gmail.com": {
    "nip": "11.0354.12",
    "posto_grad": "2ºSG",
    "especialidade": "AR",
    "nome_completo": "MAURO AZOLA ULTRAMAR",
    "nome_guerra": "AZOLA",
    "rotulo": "2ºSG (AR) AZOLA"
  },
  "messias4106@gmail.com": {
    "nip": "87.3815.67",
    "posto_grad": "3ºSG",
    "especialidade": "MR",
    "nome_completo": "LUIZ JONAS MESSIAS JÚNIOR",
    "nome_guerra": "JONAS",
    "rotulo": "3ºSG (MR) JONAS"
  },
  "nisototal90@hotmail.com": {
    "nip": "11.0691.55",
    "posto_grad": "3ºSG",
    "especialidade": "EL",
    "nome_completo": "REINILSON DO NASCIMENTO OLIVEIRA",
    "nome_guerra": "REINILSON",
    "rotulo": "3ºSG (EL) REINILSON"
  },
  "carlosheitorch13@gmail.com": {
    "nip": "13.0121.18",
    "posto_grad": "3ºSG",
    "especialidade": "DT",
    "nome_completo": "CARLOS HENRIQUE LIMA DO DESTERRO",
    "nome_guerra": "DESTERRO",
    "rotulo": "3ºSG (DT) DESTERRO"
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
    "posto_grad": "3ºSG",
    "especialidade": "EL",
    "nome_completo": "WELDER UCHOA SILVA GOMES",
    "nome_guerra": "UCHÔA",
    "rotulo": "3ºSG (EL) UCHÔA"
  },
  "teixeira.rodrigo@marinha.mil.br": {
    "nip": "15.0193.73",
    "posto_grad": "3ºSG",
    "especialidade": "ET",
    "nome_completo": "RODRIGO PINTO DA SILVA TEIXEIRA",
    "nome_guerra": "TEIXEIRA",
    "rotulo": "3ºSG (ET) TEIXEIRA",
    "email_funcional": "teixeira.rodrigo@marinha.mil.br",
    "email_pessoal": "rodrigo.rpst@hotmail.com"
  },
  "rodrigo.rpst@hotmail.com": {
    "nip": "15.0193.73",
    "posto_grad": "3ºSG",
    "especialidade": "ET",
    "nome_completo": "RODRIGO PINTO DA SILVA TEIXEIRA",
    "nome_guerra": "TEIXEIRA",
    "rotulo": "3ºSG (ET) TEIXEIRA",
    "email_funcional": "teixeira.rodrigo@marinha.mil.br",
    "email_pessoal": "rodrigo.rpst@hotmail.com"
  },
  "thomazbarroso@gmail.com": {
    "nip": "15.0308.57",
    "posto_grad": "3ºSG",
    "especialidade": "MA",
    "nome_completo": "JOSÉ THOMÁZ FEIO BARROSO",
    "nome_guerra": "THOMÁZ",
    "rotulo": "3ºSG (MA) THOMÁZ"
  },
  "robson.santos@marinha.mil.br": {
    "nip": "15.0197.99",
    "posto_grad": "3ºSG",
    "especialidade": "MC",
    "nome_completo": "ROBSON SANTOS DA SILVA",
    "nome_guerra": "ROBSON",
    "rotulo": "3ºSG (MC) ROBSON",
    "email_funcional": "robson.santos@marinha.mil.br",
    "email_pessoal": "robson.gds.27@gmail.com"
  },
  "robson.gds.27@gmail.com": {
    "nip": "15.0197.99",
    "posto_grad": "3ºSG",
    "especialidade": "MC",
    "nome_completo": "ROBSON SANTOS DA SILVA",
    "nome_guerra": "ROBSON",
    "rotulo": "3ºSG (MC) ROBSON",
    "email_funcional": "robson.santos@marinha.mil.br",
    "email_pessoal": "robson.gds.27@gmail.com"
  },
  "diego.marinho@marinha.mil.br": {
    "nip": "15.0338.56",
    "posto_grad": "3ºSG",
    "especialidade": "MO",
    "nome_completo": "DIEGO DA SILVA MARINHO",
    "nome_guerra": "MARINHO",
    "rotulo": "3ºSG (MO) MARINHO",
    "email_funcional": "diego.marinho@marinha.mil.br",
    "email_pessoal": "diego.marinho.233@gmail.com"
  },
  "diego.marinho.233@gmail.com": {
    "nip": "15.0338.56",
    "posto_grad": "3ºSG",
    "especialidade": "MO",
    "nome_completo": "DIEGO DA SILVA MARINHO",
    "nome_guerra": "MARINHO",
    "rotulo": "3ºSG (MO) MARINHO",
    "email_funcional": "diego.marinho@marinha.mil.br",
    "email_pessoal": "diego.marinho.233@gmail.com"
  },
  "erlley110394@gmail.com": {
    "nip": "15.0362.51",
    "posto_grad": "3ºSG",
    "especialidade": "MR",
    "nome_completo": "ERLLEY JOEL FRANÇA DOS SANTOS",
    "nome_guerra": "ERLLEY",
    "rotulo": "3ºSG (MR) ERLLEY"
  },
  "aciolycrl@gmail.com": {
    "nip": "19.0099.33",
    "posto_grad": "CB",
    "especialidade": "MR",
    "nome_completo": "LUIZ MATEUS ACIOLY DO CARMO",
    "nome_guerra": "ACIOLY",
    "rotulo": "CB (MR) ACIOLY"
  },
  "andresouza4778@gmail.com": {
    "nip": "21.0512.41",
    "posto_grad": "CB",
    "especialidade": "SQ",
    "nome_completo": "ANDRÉ LUCAS TAVARES SOUZA",
    "nome_guerra": "ANDRÉ LUCAS",
    "rotulo": "CB (SQ) ANDRÉ LUCAS"
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
    "especialidade": "RM2-EF",
    "nome_completo": "LUZIA PACÍFICO DOS SANTOS",
    "nome_guerra": "LUZIA",
    "rotulo": "CB (RM2-EF) LUZIA"
  },
  "pacificoandreza253@gmail.com": {
    "nip": "25.4259.27",
    "posto_grad": "CB",
    "especialidade": "RM2-EF",
    "nome_completo": "ANDREZA PACÍFICO VENÂNCIO",
    "nome_guerra": "ANDREZA",
    "rotulo": "CB (RM2-EF) ANDREZA"
  },
  "marla.ingridh@gmail.com": {
    "nip": "25.4262.29",
    "posto_grad": "CB",
    "especialidade": "RM2-PD",
    "nome_completo": "MARLA INGRIDH ROCHA GUEDES",
    "nome_guerra": "MARLA",
    "rotulo": "CB (RM2-PD) MARLA"
  },
  "matheussantosmb2000@gmail.com": {
    "nip": "22.1773.29",
    "posto_grad": "MN",
    "especialidade": "RM-2",
    "nome_completo": "MATEUS DIAS DE ALMEIDA",
    "nome_guerra": "DIAS",
    "rotulo": "MN (RM-2) DIAS"
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
    "especialidade": "RM-2",
    "nome_completo": "GABRIEL DA COSTA TANANTA",
    "nome_guerra": "TANANTA",
    "rotulo": "MN (RM-2) TANANTA"
  },
  "evertonarcanjobc123@gmail.com": {
    "nip": "22.1810.24",
    "posto_grad": "MN",
    "especialidade": "RM-2",
    "nome_completo": "EVERTON ARCANJO GARRIDO",
    "nome_guerra": "GARRIDO",
    "rotulo": "MN (RM-2) GARRIDO"
  },
  "pedrinhograndes16@gmail.com": {
    "nip": "24.3773.25",
    "posto_grad": "MN",
    "especialidade": "RM-2",
    "nome_completo": "LUIS ANTONIO GRANDE LOPES",
    "nome_guerra": "LOPES",
    "rotulo": "MN (RM-2) LOPES"
  },
  "danleyataide17@gmail.com": {
    "nip": "25.3312.21",
    "posto_grad": "MN",
    "especialidade": "RC",
    "nome_completo": "DANLEY ATAIDE ANGELO",
    "nome_guerra": "DANLEY",
    "rotulo": "MN (RC) DANLEY"
  },
  "haymanpequeno87@gmail.com": {
    "nip": "25.3325.20",
    "posto_grad": "MN",
    "especialidade": "RC",
    "nome_completo": "HAYMAN PEQUENO DA SILVA",
    "nome_guerra": "HAYMAN",
    "rotulo": "MN (RC) HAYMAN"
  },
  "jandersonvinicius290@gmail.com": {
    "nip": "25.3360.29",
    "posto_grad": "MN",
    "especialidade": "RC",
    "nome_completo": "JANDERSON VINICIUS DA COSTA D'AVILA",
    "nome_guerra": "D'AVILA",
    "rotulo": "MN (RC) D'AVILA"
  },
  "levycastro75@gmail.com": {
    "nip": "25.3376.29",
    "posto_grad": "MN",
    "especialidade": "RC",
    "nome_completo": "LEVY DE CASTRO MACEDO",
    "nome_guerra": "LEVY",
    "rotulo": "MN (RC) LEVY"
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
        nome: "SO SACRAMENTO — CRISTIANO DO SACRAMENTO SOARES",
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
    roleCft: role,
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
  role: "super_admin" | "admin" | "operador" = "operador"
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

export function cadastrarEmailsEmLote(
  texto: string,
  role: "super_admin" | "admin" | "operador" = "operador"
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
