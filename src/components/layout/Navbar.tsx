"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/store/AuthProvider";
import { useData } from "@/store/DataProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { GestaoAcessosModal } from "@/components/auth/GestaoAcessosModal";
import {
  Shield,
  ShieldCheck,
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
  UserCheck,
} from "lucide-react";
import { fmtDiaMes } from "@/lib/dates";

export function Navbar() {
  const pathname = usePathname();
  const { usuario, sair, modalAberto, abrirModal, fecharModal, isAdmin } = useAuth();
  const { hoje, backend, restaurarDemo } = useData();
  const [gestaoModalAberto, setGestaoModalAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const links = [
    { href: "/escalas", label: "Escalas", icone: CalendarCheck },
    { href: "/sargenteante", label: "Sargenteante", icone: ShieldCheck },
    { href: "/dashboard", label: "Dashboard", icone: LayoutDashboard },
    { href: "/lancamentos", label: "Lançamentos", icone: FileSpreadsheet },
    { href: "/ferias", label: "Férias & Plano", icone: CalendarDays },
    { href: "/comando", label: "Painel Comando", icone: Compass },
    { href: "/efetivo", label: "Efetivo", icone: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Marca Institucional */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-sky-500/40 flex items-center justify-center shadow-md shadow-sky-950 group-hover:border-sky-400 transition p-1">
              <Image
                src="/cft-logo-brasao.png"
                alt="Brasão CFT"
                width={32}
                height={32}
                className="object-contain transition-transform group-hover:scale-105"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg tracking-wider text-slate-100 group-hover:text-sky-300 transition">
                  SisPes<span className="text-sky-400">CFT</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
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
                      ? "bg-slate-800 text-sky-300 border border-sky-500/40 shadow-sm"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-900/80"
                  }`}
                >
                  <Icone className="w-4 h-4 opacity-80" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Direita: Data, Backend, Usuário */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Indicador de Data / Hoje */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{fmtDiaMes(hoje)}</span>
            </div>

            {/* Indicador Backend */}
            <span
              className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800"
              title={
                backend === "supabase"
                  ? "Sincronização em nuvem via Supabase Postgres"
                  : "Persistência no navegador (LocalStorage)"
              }
            >
              <DbIcon className="w-3 h-3 text-sky-400" />
              {backend === "supabase" ? "Supabase" : "Local"}
            </span>

            {/* Botão de Gestão de Acessos para Administrador */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setGestaoModalAberto(true)}
                className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 transition flex items-center gap-1.5"
                title="Gestão de Acessos e Usuários do Efetivo"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden xl:inline text-[11px] font-bold">Gestão Acessos</span>
              </button>
            )}

            {/* Usuário Autenticado */}
            {usuario ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAberto(!menuAberto)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-400/50 transition text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center font-bold text-xs">
                    {usuario.nomeGuerra ? usuario.nomeGuerra.slice(0, 2).toUpperCase() : usuario.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-xs font-bold text-slate-100 leading-tight flex items-center gap-1">
                      {usuario.posto ? `${usuario.posto} ${usuario.nomeGuerra || usuario.nome}` : usuario.nome}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-none mt-0.5">
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
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-700/90 p-2 shadow-2xl z-50 animate-sheet-up">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>{usuario.nome}</span>
                        </div>
                        {usuario.nip && (
                          <div className="text-[10px] text-sky-300 font-mono mt-0.5">
                            NIP: {usuario.nip}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {usuario.cargo} • Divisão: {usuario.divisao || "Geral"}
                        </div>
                        {usuario.email && (
                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {usuario.email}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuAberto(false);
                            setGestaoModalAberto(true);
                          }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-slate-800 rounded-lg transition"
                        >
                          <ShieldCheck className="w-4 h-4 text-sky-400" />
                          Painel Gestão de Acessos
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setMenuAberto(false);
                          abrirModal();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition"
                      >
                        <Shield className="w-4 h-4 text-sky-400" />
                        Trocar Perfil / Login
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
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-lg transition"
                      >
                        <RotateCcw className="w-4 h-4 text-blue-400" />
                        Restaurar Base CFT
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sair();
                          setMenuAberto(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition border-t border-slate-800/80 mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        Encerrar Sessão
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={abrirModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-sky-950/40"
              >
                <Shield className="w-4 h-4" />
                <span>Acessar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Autenticação Oficial (CFT Auth) */}
      <LoginModal aberto={modalAberto} onFechar={fecharModal} />

      {/* Modal de Gestão de Acessos para Administradores */}
      {gestaoModalAberto && (
        <GestaoAcessosModal
          aberto={gestaoModalAberto}
          onFechar={() => setGestaoModalAberto(false)}
        />
      )}
    </>
  );
}
