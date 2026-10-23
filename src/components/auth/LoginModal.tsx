"use client";

import React, { useState } from "react";
import { useAuth } from "@/store/AuthProvider";
import { USUARIOS_DEMO, DEMO_PIN, PERFIL_LABEL } from "@/lib/constants";
import { Modal } from "@/components/ui/Modal";
import { ShieldCheck, UserCheck, KeyRound, Anchor, AlertCircle } from "lucide-react";
import { rotaInicial } from "@/lib/permissions";
import { useRouter } from "next/navigation";

interface LoginModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export function LoginModal({ aberto, onFechar }: LoginModalProps) {
  const { entrar, usuario } = useAuth();
  const router = useRouter();
  const [selecionadoId, setSelecionadoId] = useState<string>(
    USUARIOS_DEMO[0].id
  );
  const [pin, setPin] = useState(DEMO_PIN);
  const [erro, setErro] = useState("");

  const handleEntrar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const sucesso = entrar(selecionadoId, pin);
    if (sucesso) {
      const u = USUARIOS_DEMO.find((x) => x.id === selecionadoId);
      if (u) {
        router.push(rotaInicial(u));
      }
      onFechar();
    } else {
      setErro(`PIN incorreto! Use o PIN institucional de demonstração: ${DEMO_PIN}`);
    }
  };

  const handleTrocaRapida = (userId: string) => {
    setSelecionadoId(userId);
    setPin(DEMO_PIN);
    const sucesso = entrar(userId, DEMO_PIN);
    if (sucesso) {
      const u = USUARIOS_DEMO.find((x) => x.id === userId);
      if (u) router.push(rotaInicial(u));
      onFechar();
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Acesso Institucional SisPesCFT"
      subtitulo="Selecione o perfil da sua divisão ou liderança para autenticar"
      maxLargura="md"
    >
      <form onSubmit={handleEntrar} className="space-y-4">
        {erro && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div>
          <label className="label">Selecione o Perfil / Divisão</label>
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
            {USUARIOS_DEMO.map((u) => {
              const ativo = selecionadoId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelecionadoId(u.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                    ativo
                      ? "bg-navy-800 border-gold-500/60 ring-1 ring-gold-500/30 shadow-md"
                      : "bg-navy-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        u.perfil === "ADMIN"
                          ? "bg-blue-500/20 text-blue-300"
                          : u.perfil === "LIDERANCA"
                          ? "bg-gold-500/20 text-gold-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {u.perfil === "ADMIN" ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : u.perfil === "LIDERANCA" ? (
                        <Anchor className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">
                        {u.nome}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {u.cargo} • {PERFIL_LABEL[u.perfil]}
                      </div>
                    </div>
                  </div>
                  {usuario?.id === u.id && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Atual
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">PIN de Segurança (Padrão: {DEMO_PIN})</label>
          <div className="relative">
            <input
              type="password"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input pl-9 font-mono tracking-widest text-base"
              placeholder="••••"
              required
            />
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleTrocaRapida(selecionadoId)}
            className="text-xs text-gold-400 hover:text-gold-300 underline underline-offset-4"
          >
            Acesso Rápido 1-Click
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-gold-900/30 transition flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Entrar no Sistema
          </button>
        </div>
      </form>
    </Modal>
  );
}
