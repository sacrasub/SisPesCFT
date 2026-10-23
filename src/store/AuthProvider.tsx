"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_PIN, USUARIOS_DEMO } from "@/lib/constants";
import type { Usuario } from "@/lib/types";

const SESSION_KEY = "sispescft:session";

interface AuthState {
  usuario: Usuario | null;
  pronto: boolean;
  entrar: (usuarioId: string, pin: string) => boolean;
  sair: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Autenticação SIMULADA por perfil (demonstração).
 * Para produção, substituir por Supabase Auth mantendo a mesma interface (usuario/entrar/sair).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    try {
      const id = window.localStorage.getItem(SESSION_KEY);
      setUsuario(USUARIOS_DEMO.find((u) => u.id === id) ?? null);
    } finally {
      setPronto(true);
    }
  }, []);

  const entrar = useCallback((usuarioId: string, pin: string) => {
    const u = USUARIOS_DEMO.find((x) => x.id === usuarioId);
    if (!u || pin !== DEMO_PIN) return false;
    window.localStorage.setItem(SESSION_KEY, u.id);
    setUsuario(u);
    return true;
  }, []);

  const sair = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUsuario(null);
  }, []);

  const value = useMemo(() => ({ usuario, pronto, entrar, sair }), [usuario, pronto, entrar, sair]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
