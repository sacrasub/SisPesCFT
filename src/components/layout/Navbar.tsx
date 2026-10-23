"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/store/AuthProvider";
import { useData } from "@/store/DataProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import {
  Anchor,
  Shield,
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  Users,
  Compass,
  RotateCcw,
  Database as DbIcon,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { fmtDiaMes } from "@/lib/dates";

export function Navbar() {
  const pathname = usePathname();
  const { usuario, sair } = useAuth();
  const { hoje, backend, restaurarDemo } = useData();
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const links = [
    { href: "/dashboard", label: "Dashboard", icone: LayoutDashboard },
    { href: "/lancamentos", label: "Lançamentos", icone: FileSpreadsheet },
    { href: "/escalas", label: "Escalas", icone: CalendarCheck },
    { href: "/ferias", label: "Férias & Plano", icone: CalendarDays },
    { href: "/comando", label: "Painel Comando", icone: Compass },
    { href: "/efetivo", label: "Efetivo", icone: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-navy-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Marca Institucional */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-800 to-navy-900 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-md shadow-navy-950 group-hover:border-gold-400 transition">
              <Anchor className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg tracking-wider text-slate-100 group-hover:text-gold-300 transition">
                  SisPes<span className="text-gold-400">CFT</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  MB
                </span>
              </div>
              <div className="text-[10px] text-slate-400 -mt-0.5 hidden xs:block">
                Capitania Fluvial de Tabatinga
              </div>
            </div>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((item) => {
              const Icone = item.icone;
              const ativo = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    ativo
                      ? "bg-navy-800 text-gold-300 border border-gold-500/30 shadow-sm"
                      : "text-slate-300 hover:text-slate-100 hover:bg-navy-900/80"
                  }`}
                >
                  <Icone className="w-4 h-4 opacity-80" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Direita: Data, Backend, Usuário */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Indicador de Data / Hoje */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{fmtDiaMes(hoje)}</span>
            </div>

            {/* Indicador Backend */}
            <span
              className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-navy-900/60 border border-slate-800"
              title={
                backend === "supabase"
                  ? "Sincronização em nuvem via Supabase Postgres"
                  : "Persistência no navegador (LocalStorage)"
              }
            >
              <DbIcon className="w-3 h-3 text-gold-400" />
              {backend === "supabase" ? "Supabase" : "Local"}
            </span>

            {/* Botão de Usuário / Login */}
            {usuario ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAberto(!menuAberto)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-navy-900 border border-slate-700/80 hover:border-gold-500/50 transition text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-300 flex items-center justify-center font-bold text-xs">
                    {usuario.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-xs font-bold text-slate-100 leading-tight">
                      {usuario.nome}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-none">
                      {usuario.cargo}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {menuAberto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuAberto(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-navy-900 border border-slate-700/80 p-2 shadow-2xl z-50 animate-sheet-up">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <div className="text-xs font-bold text-slate-100">
                          {usuario.nome}
                        </div>
                        <div className="text-[11px] text-gold-400">
                          {usuario.cargo}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Divisão: {usuario.divisao || "Geral"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuAberto(false);
                          setModalLoginAberto(true);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-navy-800 rounded-lg transition"
                      >
                        <Shield className="w-4 h-4 text-gold-400" />
                        Alternar Divisão / Perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              "Restaurar dados de demonstração originais da Capitania?"
                            )
                          ) {
                            restaurarDemo();
                            setMenuAberto(false);
                          }
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-navy-800 rounded-lg transition"
                      >
                        <RotateCcw className="w-4 h-4 text-blue-400" />
                        Restaurar Base Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sair();
                          setMenuAberto(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair do Perfil
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalLoginAberto(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-gold-900/30"
              >
                <Shield className="w-4 h-4" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Login / Troca de Perfil */}
      <LoginModal
        aberto={modalLoginAberto}
        onFechar={() => setModalLoginAberto(false)}
      />
    </>
  );
}
