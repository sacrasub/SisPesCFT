"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Mail,
  Check,
  AlertCircle,
  Search,
  KeyRound,
  Pencil,
  Trash2,
  Lock,
  Ban,
  CheckCircle2,
  Anchor,
  RotateCcw,
} from "lucide-react";
import {
  obterSolicitacoesAcesso,
  aprovarSolicitacaoAcesso,
  rejeitarSolicitacaoAcesso,
  cadastrarEmailsEmLote,
  cadastrarUsuarioIndividual,
  alterarStatusUsuario,
  alterarRoleUsuario,
  removerUsuario,
  resetarSenhaParaPadrao,
  obterCacheUsuarios,
  obterMilitarVinculado,
  obterStatusSenhaUsuario,
  isMasterAdmin,
  normalizarEmail,
  obterListaMilitaresCompleta,
  type SolicitacaoAcesso,
  type UsuarioCftAuth,
  type MilitarMapItem,
} from "@/lib/auth-cft";

interface GestaoAcessosModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export function GestaoAcessosModal({ aberto, onFechar }: GestaoAcessosModalProps) {
  const [abaAtiva, setAbaAtiva] = useState<"solicitacoes" | "lote" | "usuarios">("usuarios");
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioCftAuth[]>([]);
  const [tripulacao, setTripulacao] = useState<MilitarMapItem[]>([]);
  const [loteTexto, setLoteTexto] = useState("");
  const [loteRole, setLoteRole] = useState<"super_admin" | "admin" | "operador" | "visualizador">("operador");
  const [msgSucesso, setMsgSucesso] = useState("");
  const [filtro, setFiltro] = useState("");

  // Estado do formulário de Novo Usuário Individual
  const [formNovoAberto, setFormNovoAberto] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoEmailFuncional, setNovoEmailFuncional] = useState("");
  const [novoEmailPessoal, setNovoEmailPessoal] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoNip, setNovoNip] = useState("");
  const [novoPostoGrad, setNovoPostoGrad] = useState("");
  const [novoNomeGuerra, setNovoNomeGuerra] = useState("");
  const [novoRole, setNovoRole] = useState<"super_admin" | "admin" | "operador" | "visualizador">("operador");

  // Estado do modal de Edição
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioCftAuth | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmailFuncional, setEditEmailFuncional] = useState("");
  const [editEmailPessoal, setEditEmailPessoal] = useState("");
  const [editRole, setEditRole] = useState<"super_admin" | "admin" | "operador" | "visualizador">("operador");
  const [editNip, setEditNip] = useState("");
  const [editPostoGrad, setEditPostoGrad] = useState("");
  const [editNomeGuerra, setEditNomeGuerra] = useState("");

  const carregarDados = () => {
    setSolicitacoes(obterSolicitacoesAcesso());
    setUsuarios(obterCacheUsuarios());
    setTripulacao(obterListaMilitaresCompleta());
  };

  useEffect(() => {
    if (aberto) {
      carregarDados();
      setMsgSucesso("");
      setFormNovoAberto(false);
      setUsuarioEditando(null);
    }
  }, [aberto]);

  const pendentes = solicitacoes.filter((s) => s.status === "pendente");

  const mostrarMensagem = (msg: string) => {
    setMsgSucesso(msg);
    setTimeout(() => setMsgSucesso(""), 4500);
  };

  const handleAprovar = async (id: string, role: "super_admin" | "admin" | "operador" | "visualizador") => {
    await aprovarSolicitacaoAcesso(id, role);
    carregarDados();
    mostrarMensagem("Solicitação aprovada com sucesso!");
  };

  const handleRejeitar = async (id: string) => {
    await rejeitarSolicitacaoAcesso(id);
    carregarDados();
    mostrarMensagem("Solicitação rejeitada.");
  };

  const handleCadastroLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteTexto.trim()) return;

    const res = cadastrarEmailsEmLote(loteTexto, loteRole);
    setLoteTexto("");
    carregarDados();
    mostrarMensagem(`Cadastrados ${res.adicionados} novos e-mails funcionais com sucesso!`);
  };

  const handleToggleStatus = (email: string, ativoAtual: boolean) => {
    alterarStatusUsuario(email, !ativoAtual);
    carregarDados();
    mostrarMensagem(ativoAtual ? `Acesso de ${email} desativado.` : `Acesso de ${email} reativado.`);
  };

  const handleAlterarRole = (email: string, novoR: "super_admin" | "admin" | "operador" | "visualizador") => {
    alterarRoleUsuario(email, novoR);
    carregarDados();
    mostrarMensagem(`Perfil de ${email} alterado para ${novoR}.`);
  };

  const handleResetarSenha = (email: string) => {
    resetarSenhaParaPadrao(email);
    carregarDados();
    mostrarMensagem(`Senha de ${email} resetada para "marinha123" (troca obrigatória no próximo login).`);
  };

  const handleExcluirUsuario = (email: string) => {
    if (confirm(`Remover definitivamente o acesso de ${email}?`)) {
      removerUsuario(email);
      carregarDados();
      mostrarMensagem(`Usuário ${email} removido.`);
    }
  };

  // Preenche dados ao selecionar um militar da tripulação
  const handleSelecionarTripulacao = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nipSel = e.target.value;
    if (!nipSel) return;

    const mil = tripulacao.find((m) => m.nip === nipSel);
    if (mil) {
      setNovoNip(mil.nip);
      setNovoPostoGrad(mil.posto_grad);
      setNovoNomeGuerra(mil.nome_guerra);
      setNovoNome(`${mil.posto_grad} ${mil.nome_guerra} - ${mil.nome_completo}`);
      if (mil.email_funcional) {
        setNovoEmail(mil.email_funcional);
        setNovoEmailFuncional(mil.email_funcional);
      }
      if (mil.email_pessoal) setNovoEmailPessoal(mil.email_pessoal);
    }
  };

  const handleSalvarNovoUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.trim() || !novoNome.trim()) return;

    try {
      cadastrarUsuarioIndividual({
        email: novoEmail,
        email_funcional: novoEmailFuncional || novoEmail,
        email_pessoal: novoEmailPessoal,
        nome: novoNome,
        nip: novoNip,
        posto_grad: novoPostoGrad,
        nome_guerra: novoNomeGuerra,
        role: novoRole,
      });

      setFormNovoAberto(false);
      setNovoEmail("");
      setNovoEmailFuncional("");
      setNovoEmailPessoal("");
      setNovoNome("");
      setNovoNip("");
      setNovoPostoGrad("");
      setNovoNomeGuerra("");
      carregarDados();
      mostrarMensagem("Novo usuário cadastrado e liberado com sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar usuário.");
    }
  };

  const handleAbrirEdicao = (u: UsuarioCftAuth) => {
    const mil = obterMilitarVinculado(u.email);
    setUsuarioEditando(u);
    setEditNome(u.nome);
    setEditEmailFuncional(u.email_funcional || (u.email.endsWith("@marinha.mil.br") ? u.email : ""));
    setEditEmailPessoal(u.email_pessoal || (u.email.endsWith("@gmail.com") ? u.email : ""));
    setEditRole(u.role);
    setEditNip(mil?.nip || "");
    setEditPostoGrad(mil?.posto_grad || "");
    setEditNomeGuerra(mil?.nome_guerra || "");
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    cadastrarUsuarioIndividual({
      email: usuarioEditando.email,
      email_funcional: editEmailFuncional,
      email_pessoal: editEmailPessoal,
      nome: editNome,
      role: editRole,
      nip: editNip,
      posto_grad: editPostoGrad,
      nome_guerra: editNomeGuerra,
    });

    setUsuarioEditando(null);
    carregarDados();
    mostrarMensagem("Dados do usuário atualizados com sucesso!");
  };

  const usuariosFiltrados = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return usuarios;

    return usuarios.filter((u) => {
      const mil = obterMilitarVinculado(u.email);
      const txt = [
        u.nome,
        u.email,
        u.email_funcional,
        u.email_pessoal,
        u.cargo,
        mil?.nip,
        mil?.posto_grad,
        mil?.nome_guerra,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return txt.includes(q);
    });
  }, [usuarios, filtro]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-sky-800/80 rounded-2xl w-full max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 relative overflow-hidden">
        
        {/* Cabeçalho Oficial (Idêntico ao CFT Itinerante) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Gestão de Acessos & E-mails — SisPesCFT
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold uppercase tracking-wider">
                  MASTER ADMIN
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Sincronizado
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Setor de Pessoal / Tripulação • Capitania Fluvial de Tabatinga
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback de sucesso */}
        {msgSucesso && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msgSucesso}</span>
          </div>
        )}

        {/* Navegação por Abas */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-2 shrink-0 bg-slate-950/30 select-none">
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
            <span>Solicitações Google</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] ml-0.5">
              {pendentes.length}
            </span>
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
            <span>Usuários Autorizados ({usuarios.length})</span>
          </button>
        </div>

        {/* Conteúdo com rolagem suave */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* ABA 1: SOLICITAÇÕES */}
          {abaAtiva === "solicitacoes" && (
            <div className="space-y-3">
              {pendentes.length === 0 ? (
                <div className="py-14 text-center text-slate-400 space-y-2">
                  <UserCheck className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">Nenhuma solicitação de acesso Google pendente no momento.</p>
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
                      <button
                        type="button"
                        onClick={() => handleRejeitar(s.id!)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs transition border border-rose-500/30"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 2: CADASTRO EM LOTE */}
          {abaAtiva === "lote" && (
            <form onSubmit={handleCadastroLote} className="space-y-3.5 max-w-3xl">
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
                    <option value="visualizador">Visualizador (Apenas Leitura)</option>
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

          {/* ABA 3: USUÁRIOS AUTORIZADOS (MATRIZ COMPLETA SOMOR / CFT) */}
          {abaAtiva === "usuarios" && (
            <div className="space-y-3.5">
              {/* Barra de Ação Superior */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail ou NIP..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <button
                  type="button"
                  onClick={() => setFormNovoAberto(!formNovoAberto)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 transition shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Novo Usuário Individual</span>
                </button>
              </div>

              {/* Formulário Retrátil de Novo Usuário */}
              {formNovoAberto && (
                <form
                  onSubmit={handleSalvarNovoUsuario}
                  className="p-4 bg-slate-900/95 border border-sky-700/50 rounded-2xl space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-sky-300 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Cadastrar Novo Usuário Autorizado
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFormNovoAberto(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Seleção rápida da Tripulação Oficial */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Vincular a Militar da Tripulação CFT (64 Militares):
                    </label>
                    <select
                      onChange={handleSelecionarTripulacao}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-sky-400"
                    >
                      <option value="">-- Selecione para preenchimento automático --</option>
                      {tripulacao.map((m) => (
                        <option key={m.nip} value={m.nip}>
                          {m.rotulo || `${m.posto_grad} ${m.nome_guerra}`} • NIP: {m.nip} ({m.nome_completo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Ex: 2ºSG (ET) TOMÁZ - FRANCISCO TOMÁZ"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">E-mail Principal / Login</label>
                      <input
                        type="email"
                        required
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        placeholder="usuario@marinha.mil.br ou @gmail.com"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">E-mail Funcional (MB)</label>
                      <input
                        type="email"
                        value={novoEmailFuncional}
                        onChange={(e) => setNovoEmailFuncional(e.target.value)}
                        placeholder="exemplo@marinha.mil.br"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">E-mail Pessoal (Google)</label>
                      <input
                        type="email"
                        value={novoEmailPessoal}
                        onChange={(e) => setNovoEmailPessoal(e.target.value)}
                        placeholder="exemplo@gmail.com"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Perfil de Acesso</label>
                      <select
                        value={novoRole}
                        onChange={(e: any) => setNovoRole(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-sky-400"
                      >
                        <option value="operador">Operador</option>
                        <option value="admin">Administrador</option>
                        <option value="visualizador">Visualizador</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setFormNovoAberto(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar e Liberar Acesso com NIP
                    </button>
                  </div>
                </form>
              )}

              {/* Tabela de Usuários com Scroll Horizontal e Coluna de Ações Sticky */}
              <div className="border border-slate-700/80 rounded-2xl overflow-x-auto shadow-2xl bg-slate-950/70 pb-1">
                <table className="w-full text-left text-xs min-w-[780px]">
                  <thead className="bg-slate-800/95 text-slate-300 font-bold border-b border-slate-700 select-none">
                    <tr>
                      <th className="py-3 px-3.5 min-w-[200px]">Nome & Militar Atendente</th>
                      <th className="py-3 px-3 min-w-[190px]">E-mail</th>
                      <th className="py-3 px-2.5 min-w-[125px]">Perfil</th>
                      <th className="py-3 px-2.5 min-w-[105px]">Credencial</th>
                      <th className="py-3 px-2.5 min-w-[80px]">Status</th>
                      <th className="py-3 px-3.5 text-right min-w-[200px] sticky right-0 bg-slate-800/95 backdrop-blur-md shadow-[-6px_0_10px_rgba(0,0,0,0.35)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {usuariosFiltrados.map((u) => {
                      const isM = isMasterAdmin(u.email);
                      const mil = obterMilitarVinculado(u.email);
                      const senhaInfo = obterStatusSenhaUsuario(u.email);

                      return (
                        <tr key={u.email} className="hover:bg-slate-800/50 transition">
                          {/* Coluna 1: Nome & Militar */}
                          <td className="py-2.5 px-3.5 font-semibold text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs">{u.nome || u.email.split("@")[0].toUpperCase()}</span>
                              {isM && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 font-bold">
                                  MASTER
                                </span>
                              )}
                            </div>
                            {mil && mil.nip ? (
                              <div className="text-[10px] text-sky-300 font-mono flex items-center gap-1 mt-0.5">
                                <span className="text-sky-400">⚓</span>
                                <span>{mil.rotulo || `${mil.posto_grad} ${mil.nome_guerra || ""}`}</span>
                                <span className="text-slate-400">• NIP: {mil.nip}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">
                                NIP militar não vinculado
                              </div>
                            )}
                          </td>

                          {/* Coluna 2: E-mail (MB / Google) */}
                          <td className="py-2.5 px-3">
                            {u.email && u.email_pessoal && normalizarEmail(u.email) !== normalizarEmail(u.email_pessoal) ? (
                              <div className="space-y-1">
                                <div className="font-mono text-[11px] text-sky-400 flex items-center gap-1.5">
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">
                                    MB
                                  </span>
                                  <span>{u.email_funcional || u.email}</span>
                                </div>
                                <div className="font-mono text-[11px] text-emerald-400 flex items-center gap-1.5">
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                                    G
                                  </span>
                                  <span>{u.email_pessoal}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="font-mono text-[11px] flex items-center gap-1.5">
                                <span
                                  className={`text-[8px] px-1 py-0.2 rounded font-bold border ${
                                    (u.email || "").endsWith("@marinha.mil.br")
                                      ? "bg-sky-500/20 text-sky-300 border-sky-400/30"
                                      : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                  }`}
                                >
                                  {(u.email || "").endsWith("@marinha.mil.br") ? "MB" : "G"}
                                </span>
                                <span className={(u.email || "").endsWith("@gmail.com") ? "text-emerald-400" : "text-sky-400"}>
                                  {u.email}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Coluna 3: Perfil */}
                          <td className="py-2.5 px-2.5">
                            {isM ? (
                              <span className="font-black text-amber-400 text-xs">Super Admin Master</span>
                            ) : (
                              <select
                                value={u.role || "operador"}
                                onChange={(e: any) => handleAlterarRole(u.email, e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-sky-400 transition"
                              >
                                <option value="operador">Operador</option>
                                <option value="admin">Administrador</option>
                                <option value="visualizador">Visualizador</option>
                              </select>
                            )}
                          </td>

                          {/* Coluna 4: Credencial */}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            {senhaInfo.senhaAlterada ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                title="Senha pessoal configurada"
                              >
                                <Lock className="w-3 h-3" /> Ativa
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                title="Ainda usando senha padrão inicial (marinha123)"
                              >
                                <KeyRound className="w-3 h-3 text-amber-400" /> Pendente
                              </span>
                            )}
                          </td>

                          {/* Coluna 5: Status */}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.ativo !== false
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.ativo !== false ? "bg-emerald-400" : "bg-rose-400"
                                }`}
                              />
                              {u.ativo !== false ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          {/* Coluna 6: Ações (Sticky Right) */}
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap sticky right-0 bg-slate-950/95 backdrop-blur-md shadow-[-6px_0_10px_rgba(0,0,0,0.35)]">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAbrirEdicao(u)}
                                className="px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/40 text-[11px] font-bold transition inline-flex items-center gap-1 border border-sky-400/40 shadow-sm"
                                title="Editar dados cadastrais, NIP e perfil deste usuário"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Editar</span>
                              </button>

                              {!isM ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleResetarSenha(u.email)}
                                    className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 text-[11px] font-bold transition inline-flex items-center gap-1 border border-amber-400/40 shadow-sm"
                                    title="Resetar senha para marinha123 e forçar troca no próximo acesso"
                                  >
                                    <KeyRound className="w-3 h-3" />
                                    <span>Reset</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(u.email, u.ativo !== false)}
                                    className={`p-1 rounded-lg ${
                                      u.ativo !== false
                                        ? "bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-amber-500/20 border border-slate-700"
                                        : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                                    } text-xs font-bold transition`}
                                    title={u.ativo !== false ? "Desativar acesso deste militar" : "Ativar acesso deste militar"}
                                  >
                                    {u.ativo !== false ? (
                                      <Ban className="w-3.5 h-3.5" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExcluirUsuario(u.email)}
                                    className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 transition text-xs border border-rose-500/30"
                                    title="Remover usuário da lista de autorizados"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-amber-300 font-mono font-bold px-2 py-0.5 bg-amber-500/20 rounded border border-amber-400/40">
                                  Master
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Secundário: Edição de Usuário */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1329] border border-sky-700/80 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setUsuarioEditando(null)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Pencil className="w-4 h-4 text-sky-400" /> Editar Acesso do Usuário
            </h3>

            <form onSubmit={handleSalvarEdicao} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Nome / Rótulo de Exibição</label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">NIP</label>
                  <input
                    type="text"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Posto / Graduação</label>
                  <input
                    type="text"
                    value={editPostoGrad}
                    onChange={(e) => setEditPostoGrad(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">E-mail Funcional (@marinha.mil.br)</label>
                <input
                  type="email"
                  value={editEmailFuncional}
                  onChange={(e) => setEditEmailFuncional(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">E-mail Pessoal (Google @gmail.com)</label>
                <input
                  type="email"
                  value={editEmailPessoal}
                  onChange={(e) => setEditEmailPessoal(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Perfil de Acesso</label>
                <select
                  value={editRole}
                  onChange={(e: any) => setEditRole(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                  <option value="visualizador">Visualizador</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUsuarioEditando(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
