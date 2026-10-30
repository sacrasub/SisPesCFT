"use client";

import React, { useState } from "react";
import { useData } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { LoginModal } from "@/components/auth/LoginModal";
import { Anchor, ShieldAlert, Loader2, Database, X, RotateCcw } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { carregando, erro, db, ctx, restaurarDemo } = useData();
  const { usuario, pronto } = useAuth();
  const [bannerVisivel, setBannerVisivel] = useState(true);

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

  // ══════════════════════════════════════════════════════════════════════════
  // GATEKEEPER DE SEGURANÇA MILITAR (CFT)
  // Bloqueio rigoroso: pessoas não identificadas / não logadas NÃO ACESSAM o site.
  // Nenhum dado operacional, lista de efetivo ou escala é exposto no DOM.
  // ══════════════════════════════════════════════════════════════════════════
  if (!usuario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-950 text-slate-100 relative">
        <LoginModal aberto={true} onFechar={() => {}} bloqueante={true} />
      </div>
    );
  }

  // Proteção de segurança: se a base de dados não estiver carregada, exibe tela de recuperação em vez de quebrar
  if (!db || !ctx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-950 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Base de Dados Temporariamente Indisponível</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {erro || "Ocorreu uma instabilidade na conexão com o banco de dados. Você pode restaurar os dados de demonstração locais para continuar operando."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => restaurarDemo()}
              className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar Base Local
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSupabasePending = !!(
    erro &&
    (erro.includes("Supabase") || erro.includes("tabelas") || erro.includes("schema") || erro.includes("42P01"))
  );

  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100">
      {/* Navbar Superior */}
      <Navbar />

      {/* Alerta de erro de base / Supabase pendente com fallback gracioso */}
      {erro && bannerVisivel && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-2 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2 max-w-4xl">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-snug">{erro}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {isSupabasePending && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("abrir-modal-supabase"))}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold border border-amber-500/40 transition text-[11px]"
              >
                <Database className="w-3.5 h-3.5 text-amber-300" />
                <span>Ver Como Ativar Nuvem</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setBannerVisivel(false)}
              className="p-1 rounded text-amber-400/80 hover:text-amber-200 hover:bg-amber-500/10 transition"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal com padding inferior para o dock mobile - fluido até 1920px */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-3 sm:px-6 2xl:px-8 py-5 pb-24 lg:pb-12 transition-all">
        {children}
      </main>

      {/* Dock Inferior Mobile */}
      <BottomNav />
    </div>
  );
}
