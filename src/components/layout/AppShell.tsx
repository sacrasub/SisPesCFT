"use client";

import React, { useEffect } from "react";
import { useData } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { Anchor, ShieldAlert, Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { carregando, erro } = useData();
  const { usuario, pronto, abrirModal } = useAuth();

  // Se o usuário não estiver logado após carregar a sessão, abre modal de login institucional
  useEffect(() => {
    if (pronto && !usuario) {
      abrirModal();
    }
  }, [pronto, usuario, abrirModal]);

  if (carregando || !pronto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-950 text-slate-100">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-navy-900 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-xl shadow-navy-950 animate-pulse">
              <Anchor className="w-8 h-8" />
            </div>
            <Loader2 className="w-5 h-5 text-gold-400 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-wider text-slate-100">
              SisPes<span className="text-gold-400">CFT</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Capitania Fluvial de Tabatinga • Carregando base integrada...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100">
      {/* Navbar Superior */}
      <Navbar />

      {/* Alerta de erro de base se houver */}
      {erro && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-rose-300 text-xs flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Aviso de sincronização: {erro}</span>
        </div>
      )}

      {/* Conteúdo Principal com padding inferior para o dock mobile */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
        {children}
      </main>

      {/* Dock Inferior Mobile */}
      <BottomNav />
    </div>
  );
}
