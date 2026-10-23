"use client";

import React, { useState } from "react";
import { useAuth } from "@/store/AuthProvider";
import { X, Send, CheckCircle2, AlertCircle, Anchor } from "lucide-react";

interface SolicitarAcessoModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export function SolicitarAcessoModal({
  aberto,
  onFechar,
}: SolicitarAcessoModalProps) {
  const { solicitarAcesso } = useAuth();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [nip, setNip] = useState("");
  const [setor, setSetor] = useState("STA (Inspeção Naval)");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      await solicitarAcesso({
        email,
        nome,
        nip,
        setor,
        motivo,
      });
      setSucesso(true);
    } catch (err: any) {
      setErro(err.message || "Erro ao registrar solicitação.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-sky-800/50 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onFechar}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Solicitar Acesso</h2>
            <p className="text-xs text-slate-400">SisPesCFT • Capitania Fluvial de Tabatinga</p>
          </div>
        </div>

        {sucesso ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Solicitação Enviada!</h3>
            <p className="text-xs text-slate-300 leading-relaxed px-4">
              Sua solicitação foi registrada no sistema. O Administrador do Pessoal/Comando analisará seu cadastro. Assim que aprovado, você poderá acessar diretamente pelo Google ou com sua senha institucional.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={onFechar}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {erro && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                E-mail Institucional ou Google:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@marinha.mil.br ou @gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nome Completo com Posto/Graduação:
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: 2ºSG (ET) TOMÁZ - FRANCISCO TOMÁZ VIEIRA"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  NIP:
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="00.0000.00"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Divisão / Seção:
                </label>
                <select
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-sky-400 transition"
                >
                  <option value="STA (Inspeção Naval)">STA (Insp. Naval)</option>
                  <option value="EPM (Ensino Profissional)">EPM</option>
                  <option value="PESSOAL (Divisão 30)">Setor de Pessoal</option>
                  <option value="CONTRAMESTRE (Equipe de Manobra)">Contramestres</option>
                  <option value="MOTORISTAS (Transporte)">Motoristas</option>
                  <option value="COMANDO / IMEDIATO">Comando / Imediato</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Motivo / Justificativa do Acesso:
              </label>
              <textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Acompanhar escala de serviço e previsão de folgas"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-950/40 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{enviando ? "Enviando..." : "Enviar Solicitação"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
