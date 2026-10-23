"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_PIN, USUARIOS_DEMO } from "@/lib/constants";
import type { Usuario } from "@/lib/types";
import {
  KEY_ACTIVE_SESSION,
  loginComEmailFuncionalService,
  loginComGoogleService,
  normalizarEmail,
  isMasterAdmin,
  salvarNovaSenhaUsuario,
  registrarSolicitacaoAcesso,
} from "@/lib/auth-cft";

interface AuthState {
  usuario: Usuario | null;
  pronto: boolean;
  modalAberto: boolean;
  abrirModal: () => void;
  fecharModal: () => void;
  entrar: (usuarioId: string, pin: string) => boolean;
  loginGoogle: () => Promise<{
    sucesso: boolean;
    usuario?: Usuario;
    erro?: string;
    isDomainError?: boolean;
  }>;
  loginFuncional: (
    email: string,
    pass: string
  ) => Promise<{
    sucesso: boolean;
    usuario?: Usuario;
    precisaTrocarSenha?: boolean;
    erro?: string;
  }>;
  solicitarAcesso: (dados: {
    email: string;
    nome: string;
    nip?: string;
    setor?: string;
    motivo?: string;
  }) => Promise<void>;
  trocarSenha: (email: string, novaSenha: string) => void;
  sair: () => void;
  isMaster: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pronto, setPronto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    try {
      // 1. Tenta carregar sessão ativa oficial (CFT Auth)
      const rawCft = window.localStorage.getItem(KEY_ACTIVE_SESSION);
      if (rawCft) {
        const parsed = JSON.parse(rawCft);
        if (parsed && parsed.id) {
          setUsuario(parsed);
          setPronto(true);
          return;
        }
      }

      // 2. Fallback de sessão demo prévia se houver
      const demoId = window.localStorage.getItem("sispescft:session");
      if (demoId) {
        const u = USUARIOS_DEMO.find((x) => x.id === demoId);
        if (u) {
          setUsuario(u);
          setPronto(true);
          return;
        }
      }

      // Se não há sessão, define o usuário master padrão para uso imediato em ambiente de desenvolvimento
      const masterUser: Usuario = {
        id: "97.1057.91",
        nome: "SO SACRAMENTO",
        cargo: "SO (CI-SB) SACRAMENTO — Super Admin",
        perfil: "ADMIN",
        divisao: "PESSOAL",
        email: "cristiano.sacramento@marinha.mil.br",
        nip: "97.1057.91",
        posto: "SO",
        nomeGuerra: "SACRAMENTO",
        roleCft: "super_admin",
      };
      setUsuario(masterUser);
      window.localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(masterUser));
    } catch (e) {
      console.warn("[SisPesCFT] Erro ao restaurar sessão:", e);
    } finally {
      setPronto(true);
    }
  }, []);

  const abrirModal = useCallback(() => setModalAberto(true), []);
  const fecharModal = useCallback(() => setModalAberto(false), []);

  const loginGoogle = useCallback(async () => {
    const res = await loginComGoogleService();
    if (res.sucesso && res.usuario) {
      setUsuario(res.usuario);
      window.localStorage.removeItem("sispescft:session");
    }
    return res;
  }, []);

  const loginFuncional = useCallback(async (email: string, pass: string) => {
    const res = await loginComEmailFuncionalService(email, pass);
    if (res.sucesso && res.usuario) {
      setUsuario(res.usuario);
      window.localStorage.removeItem("sispescft:session");
    }
    return res;
  }, []);

  // Compatibilidade com seleção rápida demo
  const entrar = useCallback((usuarioId: string, pin: string) => {
    const u = USUARIOS_DEMO.find((x) => x.id === usuarioId);
    if (!u || pin !== DEMO_PIN) return false;
    window.localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(u));
    setUsuario(u);
    return true;
  }, []);

  const solicitarAcesso = useCallback(
    async (dados: {
      email: string;
      nome: string;
      nip?: string;
      setor?: string;
      motivo?: string;
    }) => {
      await registrarSolicitacaoAcesso(dados);
    },
    []
  );

  const trocarSenha = useCallback((email: string, novaSenha: string) => {
    salvarNovaSenhaUsuario(email, novaSenha);
  }, []);

  const sair = useCallback(() => {
    window.localStorage.removeItem(KEY_ACTIVE_SESSION);
    window.localStorage.removeItem("sispescft:session");
    setUsuario(null);
    setModalAberto(true);
  }, []);

  const isMaster = useMemo(() => {
    return isMasterAdmin(usuario?.email || "") || usuario?.roleCft === "super_admin";
  }, [usuario]);

  const isAdmin = useMemo(() => {
    return (
      isMaster ||
      usuario?.perfil === "ADMIN" ||
      usuario?.roleCft === "admin" ||
      usuario?.divisao === "COMANDO" ||
      usuario?.cargo?.includes("Imediato") ||
      false
    );
  }, [isMaster, usuario]);

  const value = useMemo(
    () => ({
      usuario,
      pronto,
      modalAberto,
      abrirModal,
      fecharModal,
      entrar,
      loginGoogle,
      loginFuncional,
      solicitarAcesso,
      trocarSenha,
      sair,
      isMaster,
      isAdmin,
    }),
    [
      usuario,
      pronto,
      modalAberto,
      abrirModal,
      fecharModal,
      entrar,
      loginGoogle,
      loginFuncional,
      solicitarAcesso,
      trocarSenha,
      sair,
      isMaster,
      isAdmin,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
