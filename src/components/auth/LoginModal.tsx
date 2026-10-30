"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/store/AuthProvider";
import {
  X,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { SolicitarAcessoModal } from "./SolicitarAcessoModal";
import { USUARIOS_DEMO } from "@/lib/constants";
import { SENHA_PADRAO_INSTITUCIONAL } from "@/lib/auth-cft";

interface LoginModalProps {
  aberto: boolean;
  onFechar: () => void;
  bloqueante?: boolean;
}

export function LoginModal({ aberto, onFechar, bloqueante = false }: LoginModalProps) {
  const { loginGoogle, loginFuncional, trocarSenha, entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [verNovaSenha, setVerNovaSenha] = useState(false);
  const [verConfirmaSenha, setVerConfirmaSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erro, setErro] = useState("");
  const [erroGoogle, setErroGoogle] = useState("");
  const [modalSolicitarAberto, setModalSolicitarAberto] = useState(false);
  const [modoTrocaSenha, setModoTrocaSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState("");
  const [modoDemo, setModoDemo] = useState(false);

  // Fecha no ESC apenas se não for tela bloqueante obrigatória
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloqueante) {
        onFechar();
      }
    };
    if (aberto) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [aberto, bloqueante, onFechar]);

  if (!aberto) return null;

  const handleLoginGoogle = async () => {
    setErro("");
    setErroGoogle("");
    setCarregandoGoogle(true);

    try {
      const res = await loginGoogle();
      if (res.sucesso) {
        onFechar();
      } else {
        setErroGoogle(res.erro || "Falha na autenticação Google.");
      }
    } catch (e: any) {
      setErroGoogle(e.message || "Erro inesperado ao conectar com Google.");
    } finally {
      setCarregandoGoogle(false);
    }
  };

  const handleLoginFuncional = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setErroGoogle("");
    setCarregando(true);

    try {
      const res = await loginFuncional(email, senha);
      if (res.sucesso) {
        if (res.precisaTrocarSenha) {
          if (res.usuario?.email) {
            setEmail(res.usuario.email);
          }
          setModoTrocaSenha(true);
        } else {
          onFechar();
        }
      } else {
        setErro(res.erro || "Verifique o e-mail/NIP e senha.");
      }
    } catch (e: any) {
      setErro(e.message || "Erro ao autenticar.");
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      setErro("A nova senha deve possuir no mínimo 6 dígitos.");
      return;
    }
    if (novaSenha !== confirmaNovaSenha) {
      setErro("As senhas digitadas não coincidem.");
      return;
    }
    setCarregando(true);
    try {
      await trocarSenha(email, novaSenha);
      setModoTrocaSenha(false);
      onFechar();
    } catch {
      setErro("Erro ao salvar nova senha criptografada.");
    } finally {
      setCarregando(false);
    }
  };

  const handleEsqueceuSenha = () => {
    setErro(
      `Para redefinir sua senha, solicite ao Administrador (SO Sacramento ou Imediato) ou utilize a senha padrão institucional para novo acesso: "${SENHA_PADRAO_INSTITUCIONAL}".`
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#060b14]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (!bloqueante && e.target === e.currentTarget) {
            onFechar();
          }
        }}
      >
        <div className="bg-[#0b1329] border border-sky-800/60 rounded-2xl w-full max-w-[440px] p-6 sm:p-7 shadow-2xl text-slate-100 relative">
          {/* Botão Fechar - Oculto se for tela de login obrigatório */}
          {!bloqueante && (
            <button
              onClick={onFechar}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Cabeçalho Oficial Marinha do Brasil */}
          <div className="flex flex-col items-center text-center space-y-2 mb-5">
            <div className="relative w-14 h-14 mb-1 drop-shadow-md">
              <Image
                src="/cft-logo-brasao.png"
                alt="Brasão Capitania Fluvial de Tabatinga"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Marinha do Brasil
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Capitania Fluvial de Tabatinga
              </div>
            </div>

            <div className="pt-1">
              <span className="inline-block px-3 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 text-[10px] font-black uppercase tracking-wider">
                Acesso Restrito ao Efetivo
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-0.5">
              Portal SisPesCFT
            </h1>
            <p className="text-xs text-slate-400">
              Gestão Integrada de Pessoal e Escalas Operacionais • CFT
            </p>
          </div>

          {/* TELA DE TROCA OBRIGATÓRIA DE SENHA NO PRIMEIRO ACESSO */}
          {modoTrocaSenha ? (
            <form onSubmit={handleSalvarNovaSenha} className="space-y-3.5">
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Primeiro Acesso Detectado!</strong> Por segurança da OM, defina uma nova senha pessoal para a conta <strong>{email}</strong>.
                </span>
              </div>

              {erro && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nova Senha Pessoal (mínimo 6 caracteres):
                </label>
                <div className="relative">
                  <input
                    type={verNovaSenha ? "text" : "password"}
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setVerNovaSenha(!verNovaSenha)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition"
                    title={verNovaSenha ? "Ocultar Senha" : "Exibir Senha"}
                  >
                    {verNovaSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Confirme a Nova Senha:
                </label>
                <div className="relative">
                  <input
                    type={verConfirmaSenha ? "text" : "password"}
                    required
                    value={confirmaNovaSenha}
                    onChange={(e) => setConfirmaNovaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setVerConfirmaSenha(!verConfirmaSenha)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition"
                    title={verConfirmaSenha ? "Ocultar Senha" : "Exibir Senha"}
                  >
                    {verConfirmaSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModoTrocaSenha(false);
                    setErro("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  ← Voltar ao login
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 text-xs uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Nova Senha e Acessar</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Opção 1: Login com Google */}
              <div>
                <button
                  type="button"
                  onClick={handleLoginGoogle}
                  disabled={carregandoGoogle}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition flex items-center justify-center gap-2.5 shadow-lg shadow-sky-950/50 text-xs sm:text-sm active:scale-98 disabled:opacity-75"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {carregandoGoogle ? "Conectando ao Google..." : "Entrar com Conta Google"}
                  </span>
                </button>

                {erroGoogle && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span className="leading-relaxed">{erroGoogle}</span>
                  </div>
                )}
              </div>

              {/* Divisor Visual */}
              <div className="flex items-center my-2">
                <div className="grow border-t border-slate-800"></div>
                <span className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  ou e-mail funcional
                </span>
                <div className="grow border-t border-slate-800"></div>
              </div>

              {/* Opção 2: Login com E-mail Institucional */}
              <form onSubmit={handleLoginFuncional} className="space-y-3">
                {erro && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    NIP ou E-mail Institucional
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="NIP (ex: 97.1057.91) ou usuario@marinha.mil.br"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Senha / PIN de Acesso
                    </label>
                    <button
                      type="button"
                      onClick={handleEsqueceuSenha}
                      className="text-[11px] text-sky-400 hover:text-sky-300 transition"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={verSenha ? "text" : "password"}
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha de acesso"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setVerSenha(!verSenha)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition"
                      title={verSenha ? "Ocultar Senha" : "Exibir Senha"}
                    >
                      {verSenha ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    💡 Primeiro acesso? Utilize a senha padrão institucional: <strong className="text-amber-300 font-mono">marinha123</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40 text-xs sm:text-sm active:scale-98 disabled:opacity-75"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{carregando ? "Verificando..." : "Acessar SisPesCFT"}</span>
                </button>
              </form>

              {/* Links e Ações do Rodapé */}
              <div className="pt-2 text-center space-y-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setModalSolicitarAberto(true)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium transition inline-flex items-center gap-1.5"
                >
                  <span>Não tem autorização? Solicitar Acesso</span>
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => setModoDemo(!modoDemo)}
                    className="text-[11px] text-slate-500 hover:text-slate-400 transition"
                  >
                    {modoDemo ? "▲ Ocultar Seleção Rápida de Demonstração" : "▼ Seleção Rápida de Perfil (Demonstração)"}
                  </button>
                </div>

                {modoDemo && (
                  <div className="pt-2 max-h-40 overflow-y-auto space-y-1 text-left p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                    {USUARIOS_DEMO.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          entrar(u.id, "1234");
                          onFechar();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-xs flex items-center justify-between transition text-slate-300 hover:text-white"
                      >
                        <span className="font-semibold">{u.nome}</span>
                        <span className="text-[10px] text-slate-500">{u.cargo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SolicitarAcessoModal
        aberto={modalSolicitarAberto}
        onFechar={() => setModalSolicitarAberto(false)}
      />
    </>
  );
}
