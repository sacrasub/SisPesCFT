"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Mail,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  obterSolicitacoesAcesso,
  aprovarSolicitacaoAcesso,
  cadastrarEmailsEmLote,
  obterCacheUsuarios,
  salvarCacheUsuarios,
  type SolicitacaoAcesso,
  type UsuarioCftAuth,
} from "@/lib/auth-cft";

interface GestaoAcessosModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export function GestaoAcessosModal({ aberto, onFechar }: GestaoAcessosModalProps) {
  const [abaAtiva, setAbaAtiva] = useState<"solicitacoes" | "lote" | "usuarios">("solicitacoes");
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioCftAuth[]>([]);
  const [loteTexto, setLoteTexto] = useState("");
  const [loteRole, setLoteRole] = useState<"super_admin" | "admin" | "operador">("operador");
  const [msgSucesso, setMsgSucesso] = useState("");
  const [filtro, setFiltro] = useState("");

  const carregarDados = () => {
    setSolicitacoes(obterSolicitacoesAcesso());
    setUsuarios(obterCacheUsuarios());
  };

  useEffect(() => {
    if (aberto) {
      carregarDados();
      setMsgSucesso("");
    }
  }, [aberto]);

  if (!aberto) return null;

  const pendentes = solicitacoes.filter((s) => s.status === "pendente");

  const handleAprovar = async (id: string, role: "super_admin" | "admin" | "operador") => {
    await aprovarSolicitacaoAcesso(id, role);
    carregarDados();
    setMsgSucesso("Solicitação aprovada com sucesso!");
    setTimeout(() => setMsgSucesso(""), 4000);
  };

  const handleCadastroLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteTexto.trim()) return;

    const res = cadastrarEmailsEmLote(loteTexto, loteRole);
    setLoteTexto("");
    carregarDados();
    setMsgSucesso(`Cadastrados ${res.adicionados} novos e-mails funcionais com sucesso!`);
    setTimeout(() => setMsgSucesso(""), 4000);
  };

  const handleToggleStatus = (email: string) => {
    const list = [...usuarios];
    const item = list.find((u) => u.email === email);
    if (item) {
      item.ativo = !item.ativo;
      salvarCacheUsuarios(list);
      setUsuarios(list);
    }
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      u.email.toLowerCase().includes(filtro.toLowerCase()) ||
      (u.cargo && u.cargo.toLowerCase().includes(filtro.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-sky-800/60 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gestão de Acessos & Efetivo
                {pendentes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                    {pendentes.length} pendente(s)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Administração centralizada de credenciais e permissões SisPesCFT
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {msgSucesso && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{msgSucesso}</span>
          </div>
        )}

        {/* Abas */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-2 shrink-0 bg-slate-950/30">
          <button
            type="button"
            onClick={() => setAbaAtiva("solicitacoes")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === "solicitacoes"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Solicitações ({pendentes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("lote")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === "lote"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Cadastro em Lote (@marinha.mil.br)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("usuarios")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === "usuarios"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Usuários Ativos ({usuarios.length})</span>
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ABA 1: Solicitações */}
          {abaAtiva === "solicitacoes" && (
            <div className="space-y-3">
              {pendentes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <UserCheck className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">Nenhuma solicitação de acesso pendente no momento.</p>
                </div>
              ) : (
                pendentes.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{s.nome}</span>
                        {s.nip && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            NIP: {s.nip}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                          {s.setor}
                        </span>
                      </div>
                      <div className="text-xs text-sky-400 font-mono mt-0.5">{s.email}</div>
                      {s.motivo && (
                        <p className="text-xs text-slate-400 mt-1 italic">"{s.motivo}"</p>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1">
                        Solicitado em: {new Date(s.dataSolicitacao).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAprovar(s.id!, "operador")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                      >
                        Aprovar Operador
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAprovar(s.id!, "admin")}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
                      >
                        Aprovar Admin
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 2: Cadastro em Lote */}
          {abaAtiva === "lote" && (
            <form onSubmit={handleCadastroLote} className="space-y-3.5">
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-200 leading-relaxed">
                Cole aqui a relação de e-mails funcionais fornecidos pelo Comando ou OM. O sistema registrará todos automaticamente com permissão de acesso e senha padrão inicial <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-bold">marinha123</code>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  E-mails Institucionais (um por linha ou separados por vírgula):
                </label>
                <textarea
                  rows={6}
                  required
                  value={loteTexto}
                  onChange={(e) => setLoteTexto(e.target.value)}
                  placeholder={"exemplo1@marinha.mil.br\nexemplo2@marinha.mil.br\nexemplo3@marinha.mil.br"}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Perfil Atribuído ao Lote:
                  </label>
                  <select
                    value={loteRole}
                    onChange={(e: any) => setLoteRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-sky-400 transition"
                  >
                    <option value="operador">Operador (Acesso a Escalas, Folgas e Efetivo)</option>
                    <option value="admin">Administrador (Liderança / Lançamentos / Gestão)</option>
                  </select>
                </div>
                <div className="pt-5">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-sky-950/50"
                  >
                    Cadastrar Lote
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ABA 3: Usuários Ativos */}
          {abaAtiva === "usuarios" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail ou posto..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {usuariosFiltrados.map((u) => (
                  <div
                    key={u.email}
                    className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{u.nome}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            u.role === "super_admin"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : u.role === "admin"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      {u.cargo && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{u.cargo}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.email)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          u.ativo
                            ? "bg-emerald-500/20 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300"
                            : "bg-rose-500/20 text-rose-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                        }`}
                      >
                        {u.ativo ? "Ativo" : "Bloqueado"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
