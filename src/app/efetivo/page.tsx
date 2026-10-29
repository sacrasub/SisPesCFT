"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  POSTOS,
  DIVISOES,
  DIVISAO_MAP,
  ESCALA_LABEL,
  RESTRICAO_META,
  POSTO_ORDEM,
  SETORES_CFT,
  SETOR_LISTA,
  MOTIVO_DISPENSA_LABEL,
} from "@/lib/constants";
import { uid, porAntiguidade } from "@/lib/utils";
import { podeEditarMilitar } from "@/lib/permissions";
import { obterIncumbenciasAcumuladas } from "@/lib/engine/disponibilidade";
import { obterStatusSituacao, STATUS_SITUACAO_OPCOES } from "@/lib/engine/situacao";
import { addDays } from "@/lib/dates";
import { DivisaoBadge, PostoChip, RestricaoBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FichaAcompanhamentoModal } from "@/components/militar/FichaAcompanhamentoModal";
import {
  obterUsuarioAuthPorMilitar,
  verificarSenhaAlterada,
  alterarRoleUsuario,
  resetarSenhaParaPadrao,
  cadastrarUsuarioIndividual,
  isMasterAdmin,
} from "@/lib/auth-cft";
import {
  Users,
  Search,
  Plus,
  Shield,
  Edit2,
  Trash2,
  AlertTriangle,
  Award,
  CheckCircle,
  Clock,
  Palmtree,
  Plane,
  HeartPulse,
  Anchor,
  Ban,
  RefreshCw,
  UserCheck,
  FileText,
  Calendar,
  Mail,
  Key,
  Lock,
  Check,
  Building2,
  Sparkles,
  Phone,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type {
  Afastamento,
  DivisaoId,
  EscalaTipo,
  Militar,
  Posto,
  Restricao,
  RestricaoTipo,
  StatusSituacaoMilitar,
  SetorCodigo,
  MotivoDispensaEscala,
} from "@/lib/types";

export default function EfetivoPage() {
  const { db, ctx, hoje, salvar, remover, substituirTudo } = useDb();
  const { usuario } = useAuth();

  const [busca, setBusca] = useState("");
  const [filtroDivisao, setFiltroDivisao] = useState<DivisaoId | "TODAS">("TODAS");
  const [filtroStatus, setFiltroStatus] = useState<StatusSituacaoMilitar | "TODOS">("TODOS");

  // Modais
  const [modalMilitarAberto, setModalMilitarAberto] = useState(false);
  const [abaModalMilitar, setAbaModalMilitar] = useState<
    "identificacao" | "lotacao" | "escalas" | "acesso"
  >("identificacao");
  const [militarEmEdicao, setMilitarEmEdicao] = useState<Militar | null>(null);
  const [militarParaExcluir, setMilitarParaExcluir] = useState<Militar | null>(null);
  const [militarParaFicha, setMilitarParaFicha] = useState<Militar | null>(null);

  // Notificação Toast
  const [toastMsg, setToastMsg] = useState<{
    texto: string;
    tipo: "sucesso" | "info" | "erro";
  } | null>(null);

  const mostrarToast = (texto: string, tipo: "sucesso" | "info" | "erro" = "sucesso") => {
    setToastMsg({ texto, tipo });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Modal de Alteração de Situação (Padrão CFT-Itinerante)
  const [modalSituacaoAberto, setModalSituacaoAberto] = useState(false);
  const [militarParaSituacao, setMilitarParaSituacao] = useState<Militar | null>(null);
  const [novaSituacao, setNovaSituacao] = useState<StatusSituacaoMilitar>("ATIVO");
  const [situacaoSubtipo, setSituacaoSubtipo] = useState("");
  const [situacaoTitulo, setSituacaoTitulo] = useState("");
  const [situacaoLocal, setSituacaoLocal] = useState("");
  const [situacaoDataInicio, setSituacaoDataInicio] = useState(hoje);
  const [situacaoDataFim, setSituacaoDataFim] = useState(addDays(hoje, 29));
  const [situacaoAsd, setSituacaoAsd] = useState(false);
  const [situacaoSubstitutoId, setSituacaoSubstitutoId] = useState("");
  const [situacaoDocumento, setSituacaoDocumento] = useState("");
  const [situacaoMotivo, setSituacaoMotivo] = useState("");

  // Modal de Restrição
  const [militarParaRestricao, setMilitarParaRestricao] = useState<Militar | null>(null);
  const [restricaoTipo, setRestricaoTipo] = useState<RestricaoTipo>("MEDICA");
  const [restricaoInicio, setRestricaoInicio] = useState<string>(hoje);
  const [restricaoFim, setRestricaoFim] = useState<string>("");
  const [restricaoDesc, setRestricaoDesc] = useState<string>("");

  // Campos do Formulário Unificado de Militar (4 Abas)
  // Aba 1: Identificação & Carreira
  const [formNip, setFormNip] = useState("");
  const [formPosto, setFormPosto] = useState<Posto>("3SG");
  const [formNomeGuerra, setFormNomeGuerra] = useState("");
  const [formNomeCompleto, setFormNomeCompleto] = useState("");
  const [formEspecialidade, setFormEspecialidade] = useState("");
  const [formAntiguidade, setFormAntiguidade] = useState<number>(64);

  // Aba 2: Lotação & Funções na CFT
  const [formSetorCodigo, setFormSetorCodigo] = useState<SetorCodigo | "">("CF-20");
  const [formDivisao, setFormDivisao] = useState<DivisaoId>("STA");
  const [formFuncao, setFormFuncao] = useState("");
  const [formIncumbencias, setFormIncumbencias] = useState("");
  const [formConselho, setFormConselho] = useState(false);

  // Aba 3: Escalas & Dispensa OI 02-06D
  const [formEscalas, setFormEscalas] = useState<EscalaTipo[]>([]);
  const [formDispensaEscala, setFormDispensaEscala] = useState<MotivoDispensaEscala>("NENHUMA");
  const [formRestricaoMedicaArmado, setFormRestricaoMedicaArmado] = useState(false);

  // Aba 4: Acesso Digital & Credenciais
  const [formEmailFuncional, setFormEmailFuncional] = useState("");
  const [formEmailPessoal, setFormEmailPessoal] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formRoleAcesso, setFormRoleAcesso] = useState<
    "super_admin" | "admin" | "operador" | "visualizador"
  >("operador");
  const [senhaRedefinidaMsg, setSenhaRedefinidaMsg] = useState(false);

  // Abrir Modal de Novo Militar
  const abrirNovo = () => {
    setMilitarEmEdicao(null);
    setAbaModalMilitar("identificacao");
    setFormNip("");
    setFormPosto("3SG");
    setFormNomeGuerra("");
    setFormNomeCompleto("");
    setFormEspecialidade("");
    setFormAntiguidade((db.militares.length || 0) + 1);
    setFormSetorCodigo("CF-20");
    setFormDivisao("STA");
    setFormFuncao("");
    setFormIncumbencias("");
    setFormConselho(false);
    setFormEscalas([]);
    setFormDispensaEscala("NENHUMA");
    setFormRestricaoMedicaArmado(false);
    setFormEmailFuncional("");
    setFormEmailPessoal("");
    setFormTelefone("");
    setFormRoleAcesso("operador");
    setSenhaRedefinidaMsg(false);
    setModalMilitarAberto(true);
  };

  // Abrir Modal de Edição Unificado
  const abrirEditar = (m: Militar) => {
    setMilitarEmEdicao(m);
    setAbaModalMilitar("identificacao");

    const authUser = obterUsuarioAuthPorMilitar(m);

    setFormNip(m.nip);
    setFormPosto(m.posto);
    setFormNomeGuerra(m.nomeGuerra);
    setFormNomeCompleto(m.nomeCompleto);
    setFormEspecialidade(m.especialidade || "");
    setFormAntiguidade(m.antiguidadeOrdem ?? 64);

    setFormSetorCodigo(m.setorCodigo || "");
    setFormDivisao(m.divisao);
    setFormFuncao(m.funcao || m.funcaoPrincipal || "");
    setFormIncumbencias((m.incumbencias || []).join(", "));
    setFormConselho(m.membroConselho);

    setFormEscalas([...m.escalas]);
    setFormDispensaEscala(m.dispensaEscala || "NENHUMA");
    setFormRestricaoMedicaArmado(!!m.restricaoMedicaArmadoOuEmPe);

    const emailMbSugerido =
      m.emailFuncional ||
      authUser?.email_funcional ||
      `${m.nomeGuerra.toLowerCase().replace(/[^a-z0-9]/g, "")}@marinha.mil.br`;
    setFormEmailFuncional(emailMbSugerido);

    const emailPessoalSugerido =
      m.emailPessoal ||
      authUser?.email_pessoal ||
      (authUser?.email && !authUser.email.endsWith("@marinha.mil.br") ? authUser.email : "");
    setFormEmailPessoal(emailPessoalSugerido);

    setFormTelefone(m.telefoneContato || "");
    setFormRoleAcesso(
      (m.roleAcesso as any) ||
        (authUser?.role as any) ||
        (m.posto === "CF" || m.posto === "CC" ? "admin" : "operador")
    );
    setSenhaRedefinidaMsg(false);
    setModalMilitarAberto(true);
  };

  // Salvar Militar no DB e Sincronizar com Autenticação
  const handleSalvarMilitar = async (e: React.FormEvent) => {
    e.preventDefault();
    const agora = new Date().toISOString();

    const incumbenciasArray = formIncumbencias
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const emailMbNorm = formEmailFuncional.trim().toLowerCase();
    const emailPessoalNorm = formEmailPessoal.trim().toLowerCase();
    const emailPrincipal =
      emailMbNorm ||
      emailPessoalNorm ||
      `${formNomeGuerra.toLowerCase().replace(/[^a-z0-9]/g, "")}@marinha.mil.br`;

    const item: Militar = {
      id: militarEmEdicao?.id || uid("m"),
      nip: formNip.trim(),
      posto: formPosto,
      nomeGuerra: formNomeGuerra.trim().toUpperCase(),
      nomeCompleto: formNomeCompleto.trim(),
      especialidade: formEspecialidade.trim().toUpperCase() || undefined,
      antiguidadeOrdem: Number(formAntiguidade) || 64,
      setorCodigo: formSetorCodigo ? (formSetorCodigo as SetorCodigo) : undefined,
      divisao: formDivisao,
      funcao: formFuncao.trim() || undefined,
      funcaoPrincipal: formFuncao.trim() || undefined,
      incumbencias: incumbenciasArray.length > 0 ? incumbenciasArray : undefined,
      escalas: formEscalas,
      dispensaEscala: formDispensaEscala !== "NENHUMA" ? formDispensaEscala : undefined,
      restricaoMedicaArmadoOuEmPe: formRestricaoMedicaArmado,
      membroConselho: formConselho,
      emailFuncional: emailMbNorm || undefined,
      emailPessoal: emailPessoalNorm || undefined,
      telefoneContato: formTelefone.trim() || undefined,
      roleAcesso: formRoleAcesso,
      restricoes: militarEmEdicao?.restricoes || [],
      ativo: militarEmEdicao ? militarEmEdicao.ativo : true,
      situacao: militarEmEdicao ? militarEmEdicao.situacao : "PRONTO",
      createdAt: militarEmEdicao?.createdAt || agora,
      updatedAt: agora,
    };

    // 1. Salva no banco de dados SisPesCFT
    await salvar("militares", item);

    // 2. Sincroniza com o subsistema de autenticação e perfis
    try {
      cadastrarUsuarioIndividual({
        email: emailPrincipal,
        email_funcional: emailMbNorm || undefined,
        email_pessoal: emailPessoalNorm || undefined,
        nome: `${item.posto} ${item.nomeGuerra} - ${item.nomeCompleto}`,
        role: formRoleAcesso,
        cargo: `${item.posto} - ${item.funcao || "Tripulação CFT"}`,
        nip: item.nip,
        posto_grad: item.posto,
        nome_guerra: item.nomeGuerra,
      });
    } catch (err) {
      console.warn("Sincronização de usuário:", err);
    }

    setModalMilitarAberto(false);
    mostrarToast(
      `Militar ${item.posto} ${item.nomeGuerra} e perfil digital salvos com sucesso!`
    );
  };

  // Alteração Rápida de Perfil Inline na Tabela
  const handleAlterarRoleInline = async (
    m: Militar,
    novoRole: "super_admin" | "admin" | "operador" | "visualizador"
  ) => {
    const authUser = obterUsuarioAuthPorMilitar(m);
    const emailAlvo =
      m.emailFuncional ||
      m.emailPessoal ||
      authUser?.email ||
      `${m.nomeGuerra.toLowerCase().replace(/[^a-z0-9]/g, "")}@marinha.mil.br`;

    // 1. Atualiza no Militar
    const atualizado: Militar = {
      ...m,
      roleAcesso: novoRole,
      updatedAt: new Date().toISOString(),
    };
    await salvar("militares", atualizado);

    // 2. Atualiza no Auth
    alterarRoleUsuario(emailAlvo, novoRole);

    mostrarToast(
      `Perfil de ${m.posto} ${m.nomeGuerra} alterado para: ${novoRole.toUpperCase()}`,
      "sucesso"
    );
  };

  // Reset Rápido de Senha para Padrão (marinha123)
  const handleResetarSenha = (m: Militar) => {
    const authUser = obterUsuarioAuthPorMilitar(m);
    const emailAlvo =
      m.emailFuncional ||
      m.emailPessoal ||
      authUser?.email ||
      `${m.nomeGuerra.toLowerCase().replace(/[^a-z0-9]/g, "")}@marinha.mil.br`;

    resetarSenhaParaPadrao(emailAlvo);
    if (m.emailPessoal) resetarSenhaParaPadrao(m.emailPessoal);
    if (m.emailFuncional) resetarSenhaParaPadrao(m.emailFuncional);

    setSenhaRedefinidaMsg(true);
    mostrarToast(
      `Senha de ${m.posto} ${m.nomeGuerra} redefinida com sucesso para o padrão: marinha123`,
      "sucesso"
    );
  };

  // Adicionar Restrição Médica / Administrativa
  const handleAdicionarRestricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!militarParaRestricao) return;

    const novaRestricao: Restricao = {
      id: uid("res"),
      tipo: restricaoTipo,
      descricao: restricaoDesc.trim() || undefined,
      inicio: restricaoInicio,
      fim: restricaoFim || null,
    };

    const atualizado: Militar = {
      ...militarParaRestricao,
      restricoes: [...militarParaRestricao.restricoes, novaRestricao],
      updatedAt: new Date().toISOString(),
    };

    await salvar("militares", atualizado);
    setMilitarParaRestricao(null);
    setRestricaoDesc("");
    setRestricaoFim("");
    mostrarToast(`Restrição registrada para ${atualizado.posto} ${atualizado.nomeGuerra}.`);
  };

  // Remover Restrição
  const handleRemoverRestricao = async (m: Militar, rId: string) => {
    const atualizado: Militar = {
      ...m,
      restricoes: m.restricoes.filter((r) => r.id !== rId),
      updatedAt: new Date().toISOString(),
    };
    await salvar("militares", atualizado);
    mostrarToast(`Restrição removida.`);
  };

  // Abrir Modal de Alteração de Situação (Estilo CFT-Itinerante)
  const abrirModalSituacao = (m: Militar) => {
    setMilitarParaSituacao(m);
    const info = obterStatusSituacao(ctx, m, hoje);
    setNovaSituacao(info.status);
    setSituacaoSubtipo(
      info.afastamentoAtivo?.subtipo ||
        (info.status === "FERIAS" ? "Férias Regulamentares (1º período)" : "")
    );
    setSituacaoTitulo(info.afastamentoAtivo?.titulo || "");
    setSituacaoLocal(info.afastamentoAtivo?.local || "");
    setSituacaoDataInicio(info.afastamentoAtivo?.inicio || hoje);
    setSituacaoDataFim(
      info.afastamentoAtivo?.fim ||
        addDays(hoje, info.status === "FERIAS" ? 29 : 15)
    );
    setSituacaoAsd(info.afastamentoAtivo?.terminoAsd || false);
    setSituacaoSubstitutoId(info.afastamentoAtivo?.militarSubstitutoId || "");
    setSituacaoDocumento(info.afastamentoAtivo?.documentoReferencia || "");
    setSituacaoMotivo(
      m.funcao?.includes("Desembarcado")
        ? m.funcao.replace(/^Desembarcado:\s*/, "")
        : ""
    );
    setModalSituacaoAberto(true);
  };

  // Salvar Alteração de Situação (Atualiza Militar e Sincroniza Afastamentos)
  const handleSalvarSituacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!militarParaSituacao) return;

    const agora = new Date().toISOString();
    let militarAtualizado: Militar = { ...militarParaSituacao, updatedAt: agora };
    let novosAfastamentos = [...db.afastamentos];

    if (novaSituacao === "ATIVO") {
      militarAtualizado.ativo = true;
      militarAtualizado.situacao = "PRONTO";
      novosAfastamentos = novosAfastamentos.map((a) => {
        if (
          a.militarIds.includes(militarAtualizado.id) &&
          a.status === "CONFIRMADO"
        ) {
          if (a.inicio <= hoje && (a.terminoAsd || a.fim >= hoje)) {
            return {
              ...a,
              fim: hoje,
              terminoAsd: false,
              updatedAt: agora,
            };
          }
        }
        return a;
      });
    } else if (novaSituacao === "DESEMBARCADO") {
      militarAtualizado.ativo = false;
      militarAtualizado.situacao = "DESEMBARCADO";
      if (situacaoMotivo.trim()) {
        militarAtualizado.funcao = `Desembarcado: ${situacaoMotivo.trim()}`;
      }
    } else if (novaSituacao === "INATIVO") {
      militarAtualizado.ativo = false;
      militarAtualizado.situacao = "INATIVO";
    } else if (novaSituacao === "FERIAS") {
      militarAtualizado.ativo = true;
      militarAtualizado.situacao = "FERIAS";
      const sub = situacaoSubtipo.trim() || "Férias Regulamentares (1º período)";
      const afItem: Afastamento = {
        id: uid("af"),
        categoria: "FERIAS",
        subtipo: sub,
        titulo: `${sub} — ${militarParaSituacao.posto} ${militarParaSituacao.nomeGuerra}`,
        inicio: situacaoDataInicio,
        fim: situacaoDataFim,
        militarIds: [militarParaSituacao.id],
        divisao: militarParaSituacao.divisao,
        status: "CONFIRMADO",
        impactaEscala: true,
        militarSubstitutoId: situacaoSubstitutoId || undefined,
        documentoReferencia: situacaoDocumento.trim() || undefined,
        criadoPor: "Gestão de Efetivo (CF-31)",
        createdAt: agora,
        updatedAt: agora,
      };
      novosAfastamentos.push(afItem);
    } else if (novaSituacao === "MISSAO") {
      militarAtualizado.ativo = true;
      militarAtualizado.situacao = "MISSAO";
      const tit = situacaoTitulo.trim() || "Missão / Operação Fluvial";
      const afItem: Afastamento = {
        id: uid("af"),
        categoria: "MISSAO",
        subtipo: tit,
        titulo: `${tit} — ${militarParaSituacao.posto} ${militarParaSituacao.nomeGuerra}`,
        local: situacaoLocal.trim() || undefined,
        inicio: situacaoDataInicio,
        fim: situacaoAsd ? situacaoDataInicio : situacaoDataFim,
        terminoAsd: situacaoAsd,
        militarIds: [militarParaSituacao.id],
        divisao: militarParaSituacao.divisao,
        status: "CONFIRMADO",
        impactaEscala: true,
        militarSubstitutoId: situacaoSubstitutoId || undefined,
        documentoReferencia: situacaoDocumento.trim() || undefined,
        criadoPor: "Gestão de Efetivo (CF-31)",
        createdAt: agora,
        updatedAt: agora,
      };
      novosAfastamentos.push(afItem);
    } else if (novaSituacao === "LICENCA") {
      militarAtualizado.ativo = true;
      militarAtualizado.situacao = situacaoSubtipo.includes("LTSPF")
        ? "LTSPF"
        : "LTS";
      const sub = situacaoSubtipo.trim() || "LTS – Licença para Tratamento de Saúde";
      const afItem: Afastamento = {
        id: uid("af"),
        categoria: "LICENCA",
        subtipo: sub,
        titulo: `${sub} — ${militarParaSituacao.posto} ${militarParaSituacao.nomeGuerra}`,
        inicio: situacaoDataInicio,
        fim: situacaoAsd ? situacaoDataInicio : situacaoDataFim,
        terminoAsd: situacaoAsd,
        militarIds: [militarParaSituacao.id],
        divisao: "PESSOAL",
        status: "CONFIRMADO",
        impactaEscala: true,
        militarSubstitutoId: situacaoSubstitutoId || undefined,
        documentoReferencia: situacaoDocumento.trim() || undefined,
        criadoPor: "Seção de Saúde (CF-34)",
        createdAt: agora,
        updatedAt: agora,
      };
      novosAfastamentos.push(afItem);
    }

    await substituirTudo({
      ...db,
      militares: db.militares.map((m) =>
        m.id === militarAtualizado.id ? militarAtualizado : m
      ),
      afastamentos: novosAfastamentos,
    });

    setModalSituacaoAberto(false);
    setMilitarParaSituacao(null);
    mostrarToast(`Situação de ${militarAtualizado.posto} ${militarAtualizado.nomeGuerra} atualizada na OM.`);
  };

  // Militares ordenados por antiguidade e filtrados
  const militaresFiltrados = useMemo(() => {
    return ctx.militares
      .filter((m) => {
        if (filtroDivisao !== "TODAS" && m.divisao !== filtroDivisao)
          return false;
        if (filtroStatus !== "TODOS") {
          const info = obterStatusSituacao(ctx, m, hoje);
          if (info.status !== filtroStatus) return false;
        }
        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const matchNome = m.nomeCompleto.toLowerCase().includes(termo);
          const matchGuerra = m.nomeGuerra.toLowerCase().includes(termo);
          const matchNip = m.nip.includes(termo);
          const matchMb = m.emailFuncional?.toLowerCase().includes(termo) ?? false;
          const matchPessoal = m.emailPessoal?.toLowerCase().includes(termo) ?? false;
          if (!matchNome && !matchGuerra && !matchNip && !matchMb && !matchPessoal)
            return false;
        }
        return true;
      })
      .sort(porAntiguidade);
  }, [ctx, filtroDivisao, filtroStatus, busca, hoje]);

  return (
    <div className="space-y-6">
      {/* Toast flutuante */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 animate-bounce duration-300">
          <div className="px-4 py-2.5 rounded-xl bg-navy-900 border border-sky-400 text-slate-100 shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg.texto}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <Users className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Tripulação & Gestão Unificada do Efetivo
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle integrado de militares, lotação oficial (CF-01 a CF-42), escalas, situação na OM e credenciais de acesso digital.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {podeEditarMilitar(usuario) && (
            <button
              type="button"
              onClick={abrirNovo}
              className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold-900/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Militar</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-navy-900/80 border border-slate-800">
        <div className="relative sm:col-span-2">
          <input
            type="text"
            placeholder="Buscar por Nome de Guerra, Civil, NIP ou E-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input text-xs pl-8 py-2"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>

        <select
          value={filtroDivisao}
          onChange={(e) => setFiltroDivisao(e.target.value as any)}
          className="input text-xs py-2 bg-navy-900"
        >
          <option value="TODAS">Todas as Divisões</option>
          {DIVISOES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.sigla} — {d.nome}
            </option>
          ))}
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as any)}
          className="input text-xs py-2 bg-navy-900 font-semibold text-slate-200"
        >
          <option value="TODOS">Status: Todos</option>
          <option value="ATIVO">✓ Ativo / Escala</option>
          <option value="FERIAS">🌴 Férias</option>
          <option value="MISSAO">✈️ Viagem / Missão</option>
          <option value="LICENCA">🏥 Licença (LTSP/LE)</option>
          <option value="DESEMBARCADO">⚓ Desembarcado</option>
          <option value="INATIVO">🚫 Inativo</option>
        </select>
      </div>

      {/* Tabela do Efetivo Unificada */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100">
              Tripulação Cadastrada ({militaresFiltrados.length} militares)
            </h2>
            <span className="text-[11px] text-slate-400">
              • Clique no status para alterar situação ou no lápis para edição unificada
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Antig.</th>
                <th className="py-3 px-3">NIP</th>
                <th className="py-3 px-3">Militar (Guerra)</th>
                <th className="py-3 px-3">Nome Civil & E-mails</th>
                <th className="py-3 px-3">Posto / Esp.</th>
                <th className="py-3 px-3">Lotação (Setor)</th>
                <th className="py-3 px-3">Função & Incumbências</th>
                <th className="py-3 px-3">Escalas</th>
                <th className="py-3 px-3 text-center">Status / Situação ⇅</th>
                <th className="py-3 px-3">Acesso / Perfil</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {militaresFiltrados.map((m) => {
                const info = obterStatusSituacao(ctx, m, hoje);
                const authUser = obterUsuarioAuthPorMilitar(m);
                const emailMB = m.emailFuncional || authUser?.email_funcional;
                const emailPessoal =
                  m.emailPessoal ||
                  authUser?.email_pessoal ||
                  (authUser?.email && !authUser.email.endsWith("@marinha.mil.br")
                    ? authUser.email
                    : undefined);
                const emailPrimario = emailMB || emailPessoal || authUser?.email || "";
                const senhaAlterada = emailPrimario
                  ? verificarSenhaAlterada(emailPrimario)
                  : false;
                const isMaster =
                  authUser?.role === "super_admin" ||
                  isMasterAdmin(emailMB || "") ||
                  isMasterAdmin(emailPessoal || "");
                const roleAtual =
                  (m.roleAcesso as any) ||
                  (authUser?.role as any) ||
                  (m.posto === "CF" || m.posto === "CC" ? "admin" : "operador");

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-navy-900/50 transition-colors"
                  >
                    {/* Antiguidade */}
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-navy-950 border border-slate-700 text-sky-300">
                        {String(m.antiguidadeOrdem ?? 99).padStart(2, "0")}
                        {m.posto === "CF" || m.posto === "CC" ? " ⚓" : ""}
                      </span>
                    </td>

                    {/* NIP */}
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px] font-semibold whitespace-nowrap">
                      {m.nip}
                    </td>

                    {/* Militar (Nome de Guerra) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div
                        className="flex items-center gap-1.5 cursor-pointer group"
                        onClick={() => setMilitarParaFicha(m)}
                        title="Abrir Ficha de Acompanhamento Individual"
                      >
                        <PostoChip posto={m.posto} />
                        <span className="font-bold text-slate-100 text-xs group-hover:text-sky-300 transition">
                          {m.nomeGuerra}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[9px] font-bold group-hover:bg-sky-500 group-hover:text-navy-950 transition ml-0.5">
                          Ficha
                        </span>
                      </div>
                    </td>

                    {/* Nome Completo (Civil) & E-mails */}
                    <td className="py-2.5 px-3 min-w-[210px] max-w-[260px]">
                      <div className="font-semibold text-slate-100 text-xs truncate">
                        {m.nomeCompleto}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {emailMB && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-500/30 font-mono text-[10px] text-sky-300"
                            title={`E-mail institucional MB: ${emailMB}`}
                          >
                            <Mail className="w-2.5 h-2.5 text-sky-400" />
                            <span className="truncate max-w-[130px]">MB: {emailMB}</span>
                          </span>
                        )}
                        {emailPessoal && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 font-mono text-[10px] text-emerald-300"
                            title={`E-mail Google: ${emailPessoal}`}
                          >
                            <span className="font-black text-[9px] text-emerald-400">G:</span>
                            <span className="truncate max-w-[130px]">{emailPessoal}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Posto / Esp */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                      <span className="font-bold text-slate-200">{m.posto}</span>
                      {m.especialidade ? (
                        <span className="text-slate-400 ml-1">({m.especialidade})</span>
                      ) : (
                        <span className="text-slate-600 ml-1">—</span>
                      )}
                    </td>

                    {/* Lotação / Setor */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <DivisaoBadge divisao={m.divisao} />
                        {m.setorCodigo && (
                          <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">
                            {m.setorCodigo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Função & Incumbências */}
                    <td className="py-2.5 px-3 text-slate-300 min-w-[170px] max-w-[230px]">
                      <div className="font-semibold text-slate-200 truncate">
                        {m.funcao || m.funcaoPrincipal || "—"}
                      </div>
                      {(m.incumbencias?.length ?? 0) > 0 && (
                        <div className="text-[10px] text-amber-300/90 mt-0.5 truncate">
                          🗝️ {m.incumbencias!.join(" • ")}
                        </div>
                      )}
                      {obterIncumbenciasAcumuladas(ctx, m.id, hoje).map((inc, idx) => (
                        <div
                          key={idx}
                          className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 truncate max-w-[200px]"
                        >
                          ⚠️ Acumulando: {inc.incumbencia} (de {inc.titularNome})
                        </div>
                      ))}
                    </td>

                    {/* Escalas Habilitadas */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {m.escalas.length > 0 ? (
                          m.escalas.map((esc) => (
                            <span
                              key={esc}
                              className="px-1.5 py-0.5 rounded bg-navy-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                            >
                              {ESCALA_LABEL[esc]}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </div>
                    </td>

                    {/* STATUS / SITUAÇÃO (Pill interativa padrão CFT-Itinerante) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => abrirModalSituacao(m)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm hover:scale-105 ${info.badgeCls}`}
                        title={`Clique para alterar a situação de ${m.nomeGuerra} na OM`}
                      >
                        {info.status === "ATIVO" && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {info.status === "FERIAS" && (
                          <Palmtree className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        {info.status === "MISSAO" && (
                          <Plane className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        {info.status === "LICENCA" && (
                          <HeartPulse className="w-3.5 h-3.5 text-purple-400" />
                        )}
                        {info.status === "DESEMBARCADO" && (
                          <Anchor className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {info.status === "INATIVO" && (
                          <Ban className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{info.labelTabela}</span>
                      </button>
                      {info.detalhe && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px] mx-auto">
                          {info.detalhe}
                        </div>
                      )}
                    </td>

                    {/* ACESSO / PERFIL & CREDENCIAL */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start min-w-[135px]">
                        {isMaster ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-500/20 text-gold-300 border border-gold-400/40">
                            Super Admin
                          </span>
                        ) : (
                          <select
                            value={roleAtual}
                            onChange={(e) =>
                              handleAlterarRoleInline(m, e.target.value as any)
                            }
                            disabled={!podeEditarMilitar(usuario)}
                            className="text-[11px] font-semibold bg-navy-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:border-sky-500 cursor-pointer"
                          >
                            <option value="operador">Operador</option>
                            <option value="admin">Administrador</option>
                            <option value="visualizador">Visualizador</option>
                          </select>
                        )}

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              senhaAlterada
                                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                            }`}
                            title={
                              senhaAlterada
                                ? "Senha pessoal configurada"
                                : "Senha padrão: marinha123"
                            }
                          >
                            {senhaAlterada ? (
                              <Lock className="w-2.5 h-2.5" />
                            ) : (
                              <Key className="w-2.5 h-2.5" />
                            )}
                            <span>{senhaAlterada ? "Pessoal" : "marinha123"}</span>
                          </span>

                          {podeEditarMilitar(usuario) && (
                            <button
                              type="button"
                              onClick={() => handleResetarSenha(m)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-navy-800 hover:bg-gold-500/20 text-slate-300 hover:text-gold-300 border border-slate-700 transition"
                              title="Redefinir senha para padrão (marinha123)"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* AÇÕES UNIFICADAS */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setMilitarParaFicha(m)}
                          className="p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-sky-300 hover:bg-navy-700 transition"
                          title="Abrir Ficha de Acompanhamento Individual do Militar (com Histórico)"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirEditar(m)}
                          className="p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-gold-400 hover:bg-navy-700 transition"
                          title="Editar dados completos (Carreira, Lotação, Escalas e Acesso)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirModalSituacao(m)}
                          className="p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-sky-400 hover:bg-navy-700 transition"
                          title="Alterar Situação na OM"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMilitarParaRestricao(m);
                            setRestricaoInicio(hoje);
                            setRestricaoFim("");
                            setRestricaoDesc("");
                          }}
                          className="p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-amber-400 hover:bg-navy-700 transition"
                          title="Adicionar restrição médica/administrativa"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>

                        {podeEditarMilitar(usuario) && (
                          <button
                            type="button"
                            onClick={() => setMilitarParaExcluir(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Excluir militar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL UNIFICADO DE EDIÇÃO DE MILITAR (4 ABAS)                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        aberto={modalMilitarAberto}
        onFechar={() => setModalMilitarAberto(false)}
        titulo={
          militarEmEdicao
            ? `Editar Militar — ${militarEmEdicao.posto} ${militarEmEdicao.nomeGuerra}`
            : "Cadastrar Novo Militar na Tripulação CFT"
        }
        subtitulo="Gestão integrada: Identificação militar, Lotação oficial, Escalas da Capitania e Credenciais de acesso."
        maxLargura="xl"
      >
        <form onSubmit={handleSalvarMilitar} className="space-y-4">
          {/* Navegação entre as 4 Abas */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setAbaModalMilitar("identificacao")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                abaModalMilitar === "identificacao"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>1. Identificação & Carreira</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaModalMilitar("lotacao")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                abaModalMilitar === "lotacao"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Lotação & Funções CFT</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaModalMilitar("escalas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                abaModalMilitar === "escalas"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>3. Escalas & Dispensa OI 02-06D</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaModalMilitar("acesso")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                abaModalMilitar === "acesso"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>4. Acesso Digital & Credenciais</span>
            </button>
          </div>

          {/* ════ ABA 1: IDENTIFICAÇÃO & CARREIRA ════ */}
          {abaModalMilitar === "identificacao" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Posto / Graduação *</label>
                  <select
                    value={formPosto}
                    onChange={(e) => setFormPosto(e.target.value as Posto)}
                    className="input"
                    required
                  >
                    {POSTOS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Nome de Guerra *</label>
                  <input
                    type="text"
                    placeholder="Ex: SILVA"
                    value={formNomeGuerra}
                    onChange={(e) => setFormNomeGuerra(e.target.value)}
                    className="input uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="label">NIP *</label>
                  <input
                    type="text"
                    placeholder="Ex: 87.1234.56"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    className="input font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Nome Completo (Civil) *</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva Santos"
                  value={formNomeCompleto}
                  onChange={(e) => setFormNomeCompleto(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Especialidade / Quadro</label>
                  <input
                    type="text"
                    placeholder="Ex: MO, ES, CL, CI-SB, AA, IM, RM2-T..."
                    value={formEspecialidade}
                    onChange={(e) => setFormEspecialidade(e.target.value)}
                    className="input uppercase"
                  />
                </div>

                <div>
                  <label className="label">
                    Ordem de Antiguidade na CFT (1 a 64)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={formAntiguidade}
                    onChange={(e) => setFormAntiguidade(Number(e.target.value))}
                    className="input font-mono"
                    title="1 = mais antigo da CFT, maior número = mais moderno (usado no desempate da escala pela OI 02-06D)"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Critério de modernidade: em igualdade de pontos na escala, o militar mais moderno é escalado antes do mais antigo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ════ ABA 2: LOTAÇÃO & FUNÇÕES NA CFT ════ */}
          {abaModalMilitar === "lotacao" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Setor Oficial CFT (CF-01 a CF-42) *</label>
                  <select
                    value={formSetorCodigo}
                    onChange={(e) => setFormSetorCodigo(e.target.value as SetorCodigo)}
                    className="input text-xs"
                  >
                    <option value="">Selecione o setor...</option>
                    {SETOR_LISTA.map((s) => (
                      <option key={s.codigo} value={s.codigo}>
                        {s.codigo} — {s.nome} ({s.macroDivisao})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Divisão / Seção *</label>
                  <select
                    value={formDivisao}
                    onChange={(e) => setFormDivisao(e.target.value as DivisaoId)}
                    className="input"
                    required
                  >
                    {DIVISOES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.sigla} — {d.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Função Principal na Capitania</label>
                <input
                  type="text"
                  placeholder="Ex: Inspetor Naval, Chefe de Máquinas da LPR, Detalhista..."
                  value={formFuncao}
                  onChange={(e) => setFormFuncao(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  Incumbências & Paióis sob Responsabilidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Paiol de Armamento, Chaveiro Geral, Almoxarifado, Sala de Rádio (separados por vírgula)"
                  value={formIncumbencias}
                  onChange={(e) => setFormIncumbencias(e.target.value)}
                  className="input"
                />
                <p className="text-[10px] text-amber-300/80 mt-1">
                  Se o militar entrar em férias, licença ou missão, o substituto designado exibirá o badge de incumbência acumulada no painel.
                </p>
              </div>

              {/* Membro do Conselho de Gestão */}
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConselho}
                    onChange={(e) => setFormConselho(e.target.checked)}
                    className="rounded border-slate-700 bg-navy-900 text-gold-500 focus:ring-gold-400"
                  />
                  <span className="text-xs font-bold text-slate-100">
                    Membro do Conselho de Gestão da Capitania
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 ml-5">
                  Gera alertas impeditivos se houver agendamento de férias durante as reuniões ordinárias do Conselho.
                </p>
              </div>
            </div>
          )}

          {/* ════ ABA 3: ESCALAS & DISPENSA OI 02-06D ════ */}
          {abaModalMilitar === "escalas" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="label">Escalas em que Concorre</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      "OSE",
                      "CONTRAMESTRE",
                      "SUPERVISOR_SECOM",
                      "CABO_AUXILIAR",
                      "MOTORISTA",
                      "VIGIA",
                      "IDENTIFICADOR",
                      "INSPECAO_NAVAL",
                    ] as EscalaTipo[]
                  ).map((esc) => {
                    const checked = formEscalas.includes(esc);
                    return (
                      <label
                        key={esc}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                          checked
                            ? "bg-navy-800 border-gold-500/40 text-slate-100"
                            : "bg-navy-950/60 border-slate-800 text-slate-400 hover:bg-navy-900"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormEscalas([...formEscalas, esc]);
                            } else {
                              setFormEscalas(
                                formEscalas.filter((x) => x !== esc)
                              );
                            }
                          }}
                          className="rounded border-slate-700 bg-navy-900 text-gold-500 focus:ring-gold-400"
                        />
                        <span className="font-semibold">{ESCALA_LABEL[esc]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Dispensa Regulamentar de Escala (OI 02-06D)</label>
                <select
                  value={formDispensaEscala}
                  onChange={(e) =>
                    setFormDispensaEscala(e.target.value as MotivoDispensaEscala)
                  }
                  className="input text-xs"
                >
                  {Object.entries(MOTIVO_DISPENSA_LABEL).map(([motivo, label]) => (
                    <option key={motivo} value={motivo}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Militares dispensados por função ou antiguidade não são escalados automaticamente pelo motor da OI 02-06D.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRestricaoMedicaArmado}
                    onChange={(e) => setFormRestricaoMedicaArmado(e.target.checked)}
                    className="rounded border-slate-700 bg-navy-900 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-100">
                    Restrição Médica Parcial (Inapto para Serviço Armado / Em Pé)
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 ml-5">
                  Conforme a OI 02-06D, Sargentos com parecer médico parcial são redirecionados exclusivamente para <strong>SUPERVISOR_SECOM</strong> e Cabos/Marinheiros para <strong>IDENTIFICADOR</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ════ ABA 4: ACESSO DIGITAL & CREDENCIAIS ════ */}
          {abaModalMilitar === "acesso" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  As credenciais e permissões aqui cadastradas sincronizam instantaneamente a conta de login do militar no SisPesCFT.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">E-mail Institucional (@marinha.mil.br)</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Ex: silva.santos@marinha.mil.br"
                      value={formEmailFuncional}
                      onChange={(e) => setFormEmailFuncional(e.target.value)}
                      className="input pl-8 font-mono text-xs"
                    />
                    <Mail className="w-3.5 h-3.5 text-sky-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="label">E-mail Pessoal Google (@gmail.com)</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Ex: silva.santos@gmail.com"
                      value={formEmailPessoal}
                      onChange={(e) => setFormEmailPessoal(e.target.value)}
                      className="input pl-8 font-mono text-xs"
                    />
                    <Mail className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefone / WhatsApp de Contato</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: (97) 98123-4567"
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(e.target.value)}
                      className="input pl-8 font-mono text-xs"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="label">Perfil de Acesso no SisPesCFT *</label>
                  <select
                    value={formRoleAcesso}
                    onChange={(e) =>
                      setFormRoleAcesso(
                        e.target.value as
                          | "super_admin"
                          | "admin"
                          | "operador"
                          | "visualizador"
                      )
                    }
                    className="input text-xs font-semibold"
                  >
                    <option value="operador">Operador (Escalas, Folgas e Efetivo)</option>
                    <option value="admin">Administrador (Gestão Plena e Homologação)</option>
                    <option value="super_admin">Super Admin (Comando & Configuração Mestre)</option>
                    <option value="visualizador">Visualizador (Apenas Consulta)</option>
                  </select>
                </div>
              </div>

              {/* Status da Senha e Ação de Reset */}
              <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100">
                      Credencial de Acesso
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      Padrão Inicial: marinha123
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Se o militar esquecer a senha, redefina-a para o padrão imediatamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const eMb = formEmailFuncional.trim();
                    const ePess = formEmailPessoal.trim();
                    if (eMb) resetarSenhaParaPadrao(eMb);
                    if (ePess) resetarSenhaParaPadrao(ePess);
                    setSenhaRedefinidaMsg(true);
                    mostrarToast("Senha redefinida para marinha123!");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-navy-800 hover:bg-gold-500/20 text-slate-200 hover:text-gold-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                >
                  <Key className="w-3.5 h-3.5 text-gold-400" />
                  <span>Redefinir para marinha123</span>
                </button>
              </div>

              {senhaRedefinidaMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    A senha deste militar foi redefinida com sucesso para o padrão de fábrica: <strong>marinha123</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400">
              * Campos obrigatórios em todas as abas
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalMilitarAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-gold-900/40 transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Militar Completo</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal para Adicionar Restrição Médica/Administrativa */}
      <Modal
        aberto={!!militarParaRestricao}
        onFechar={() => setMilitarParaRestricao(null)}
        titulo={`Adicionar Restrição — ${militarParaRestricao?.posto} ${militarParaRestricao?.nomeGuerra}`}
        subtitulo="Bloqueio temporário ou definitivo para escalas específicas (médica, SRAK, ESPRAC, CNH)."
        maxLargura="md"
      >
        <form onSubmit={handleAdicionarRestricao} className="space-y-4">
          <div>
            <label className="label">Tipo de Restrição *</label>
            <select
              value={restricaoTipo}
              onChange={(e) => setRestricaoTipo(e.target.value as RestricaoTipo)}
              className="input"
            >
              {Object.entries(RESTRICAO_META).map(([tipo, meta]) => (
                <option key={tipo} value={tipo}>
                  {meta.label} — {meta.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data de Início *</label>
              <input
                type="date"
                value={restricaoInicio}
                onChange={(e) => setRestricaoInicio(e.target.value)}
                className="input font-mono"
                required
              />
            </div>
            <div>
              <label className="label">Data de Término (Opcional)</label>
              <input
                type="date"
                value={restricaoFim}
                onChange={(e) => setRestricaoFim(e.target.value)}
                className="input font-mono"
                placeholder="Em branco = indeterminado"
              />
            </div>
          </div>

          <div>
            <label className="label">Descrição / Motivo</label>
            <input
              type="text"
              placeholder="Ex: Parecer da Junta de Saúde nº..."
              value={restricaoDesc}
              onChange={(e) => setRestricaoDesc(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setMilitarParaRestricao(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider transition"
            >
              Registrar Restrição
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Alteração de Situação do Militar (Padrão CFT-Itinerante) */}
      <Modal
        aberto={modalSituacaoAberto && !!militarParaSituacao}
        onFechar={() => setModalSituacaoAberto(false)}
        titulo="Alterar Situação do Militar"
        subtitulo={
          militarParaSituacao
            ? `${militarParaSituacao.posto} ${militarParaSituacao.nomeGuerra} (${militarParaSituacao.nomeCompleto.toUpperCase()})`
            : ""
        }
        maxLargura="md"
      >
        {militarParaSituacao && (
          <form onSubmit={handleSalvarSituacao} className="space-y-4 text-xs">
            {/* Header info card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-400">Militar Selecionado:</div>
                <div className="font-bold text-slate-100 truncate text-sm">
                  {militarParaSituacao.posto} {militarParaSituacao.nomeGuerra}
                </div>
                <div className="text-[11px] font-mono text-sky-400">
                  NIP: {militarParaSituacao.nip} • {militarParaSituacao.setorCodigo ?? militarParaSituacao.divisao}
                </div>
              </div>
            </div>

            {/* Nova Situação / Status Dropdown (Opções idênticas ao CFT-Itinerante) */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Nova Situação / Status *
              </label>
              <select
                value={novaSituacao}
                onChange={(e) => setNovaSituacao(e.target.value as StatusSituacaoMilitar)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-slate-100 font-semibold focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
              >
                <option value="ATIVO">✓ Ativo / Na Escala de Serviço</option>
                <option value="FERIAS">🌴 Férias</option>
                <option value="MISSAO">✈️ Viagem / Missão / Operação</option>
                <option value="LICENCA">🏥 Licença (LTSP / LE)</option>
                <option value="DESEMBARCADO">⚓ Desembarcado / Transferido</option>
                <option value="INATIVO">🚫 Inativo / Outro Afastamento</option>
              </select>
            </div>

            {/* Conteúdo dinâmico de acordo com a situação escolhida */}
            {novaSituacao === "ATIVO" && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Pronto para o Serviço & Escalas da CFT</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  O militar permanecerá ativo na OM, concorrendo às suas escalas habilitadas ({militarParaSituacao.escalas.length > 0 ? militarParaSituacao.escalas.join(", ") : "nenhuma escala ativa"}). Eventuais afastamentos confirmados vigentes serão finalizados na data de hoje.
                </p>
              </div>
            )}

            {novaSituacao === "FERIAS" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-navy-950 border border-amber-500/30">
                <div className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                  <Palmtree className="w-4 h-4 text-amber-400" />
                  <span>Configuração de Férias Regulamentares</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subtipo de Férias</label>
                  <select
                    value={situacaoSubtipo}
                    onChange={(e) => setSituacaoSubtipo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  >
                    <option value="Férias Regulamentares (1º período)">Férias Regulamentares (1º período)</option>
                    <option value="Férias Regulamentares (2º período)">Férias Regulamentares (2º período)</option>
                    <option value="Férias Acumuladas">Férias Acumuladas</option>
                    <option value="Férias (30 dias)">Férias (30 dias integrais)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Início das Férias *</label>
                    <input
                      type="date"
                      value={situacaoDataInicio}
                      onChange={(e) => setSituacaoDataInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Término das Férias *</label>
                    <input
                      type="date"
                      value={situacaoDataFim}
                      onChange={(e) => setSituacaoDataFim(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Militar Substituto na CFT (Paióis / Funções)
                  </label>
                  <select
                    value={situacaoSubstitutoId}
                    onChange={(e) => setSituacaoSubstitutoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  >
                    <option value="">Selecione o substituto...</option>
                    {ctx.militares
                      .filter((m) => m.id !== militarParaSituacao.id && m.ativo)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.posto} {m.nomeGuerra} ({m.setorCodigo ?? m.divisao})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Documento de Publicação</label>
                  <input
                    type="text"
                    placeholder="Ex: Portaria nº 12/2026 - PAF CFT"
                    value={situacaoDocumento}
                    onChange={(e) => setSituacaoDocumento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            )}

            {novaSituacao === "MISSAO" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-navy-950 border border-sky-500/30">
                <div className="text-sky-300 font-bold text-xs flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-sky-400" />
                  <span>Configuração de Viagem / Missão / Operação</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Título / Descrição da Missão *</label>
                  <input
                    type="text"
                    placeholder="Ex: Missão Mutirum III, Comissão Itinerante STA, Operação BRACOLPER..."
                    value={situacaoTitulo}
                    onChange={(e) => setSituacaoTitulo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Início da Missão *</label>
                    <input
                      type="date"
                      value={situacaoDataInicio}
                      onChange={(e) => setSituacaoDataInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {situacaoAsd ? "Término (ASD Ativo)" : "Término Previsto *"}
                    </label>
                    <input
                      type="date"
                      value={situacaoDataFim}
                      onChange={(e) => setSituacaoDataFim(e.target.value)}
                      disabled={situacaoAsd}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100 font-mono disabled:opacity-50"
                      required={!situacaoAsd}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={situacaoAsd}
                    onChange={(e) => setSituacaoAsd(e.target.checked)}
                    className="rounded border-slate-700 bg-navy-900 text-sky-500 focus:ring-sky-400"
                  />
                  <span className="font-semibold text-sky-300">
                    Término ASD (Até Segunda Determinação)
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Local / Destino</label>
                    <input
                      type="text"
                      placeholder="Ex: Rio Solimões / Manaus"
                      value={situacaoLocal}
                      onChange={(e) => setSituacaoLocal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Militar Substituto a Bordo</label>
                    <select
                      value={situacaoSubstitutoId}
                      onChange={(e) => setSituacaoSubstitutoId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                    >
                      <option value="">Selecione o substituto...</option>
                      {ctx.militares
                        .filter((m) => m.id !== militarParaSituacao.id && m.ativo)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.posto} {m.nomeGuerra} ({m.setorCodigo ?? m.divisao})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Documento / Ordem de Serviço</label>
                  <input
                    type="text"
                    placeholder="Ex: OS Com9ºDN nº 24/2026 / Termo de Viagem"
                    value={situacaoDocumento}
                    onChange={(e) => setSituacaoDocumento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            )}

            {novaSituacao === "LICENCA" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-navy-950 border border-purple-500/30">
                <div className="text-purple-300 font-bold text-xs flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-purple-400" />
                  <span>Configuração de Licença Médica (LTS / LTSPF / LE)</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Licença *</label>
                  <select
                    value={situacaoSubtipo}
                    onChange={(e) => setSituacaoSubtipo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  >
                    <option value="LTS – Licença para Tratamento de Saúde (Própria)">
                      LTS – Licença para Tratamento de Saúde (Própria)
                    </option>
                    <option value="LTSPF – Pessoa da Família">
                      LTSPF – Licença para Tratamento de Saúde de Pessoa da Família
                    </option>
                    <option value="LE – Licença Especial">LE – Licença Especial</option>
                    <option value="Licença Maternidade / Paternidade">Licença Maternidade / Paternidade</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Início *</label>
                    <input
                      type="date"
                      value={situacaoDataInicio}
                      onChange={(e) => setSituacaoDataInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {situacaoAsd ? "Término (ASD Ativo)" : "Término Previsto *"}
                    </label>
                    <input
                      type="date"
                      value={situacaoDataFim}
                      onChange={(e) => setSituacaoDataFim(e.target.value)}
                      disabled={situacaoAsd}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100 font-mono disabled:opacity-50"
                      required={!situacaoAsd}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={situacaoAsd}
                    onChange={(e) => setSituacaoAsd(e.target.checked)}
                    className="rounded border-slate-700 bg-navy-900 text-purple-500 focus:ring-purple-400"
                  />
                  <span className="font-semibold text-purple-300">
                    Término ASD (Até Segunda Determinação da Junta de Saúde)
                  </span>
                </label>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Militar Substituto para Incumbências / Paióis
                  </label>
                  <select
                    value={situacaoSubstitutoId}
                    onChange={(e) => setSituacaoSubstitutoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  >
                    <option value="">Selecione o substituto...</option>
                    {ctx.militares
                      .filter((m) => m.id !== militarParaSituacao.id && m.ativo)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.posto} {m.nomeGuerra} ({m.setorCodigo ?? m.divisao})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Documento / Laudo da Junta</label>
                  <input
                    type="text"
                    placeholder="Ex: Laudo JRS / CF-34 ou Portaria"
                    value={situacaoDocumento}
                    onChange={(e) => setSituacaoDocumento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            )}

            {novaSituacao === "DESEMBARCADO" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-navy-950 border border-slate-700">
                <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                  <Anchor className="w-4 h-4 text-slate-400" />
                  <span>Transferência / Desembarque da Capitania</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  O militar será desativado do efetivo operacional da CFT e não concorrerá mais às escalas de serviço.
                </p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Destino / Nova OM / Motivo</label>
                  <input
                    type="text"
                    placeholder="Ex: Transferido para Com9ºDN / BNCG / Reserva Remunerada"
                    value={situacaoMotivo}
                    onChange={(e) => setSituacaoMotivo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            )}

            {novaSituacao === "INATIVO" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-navy-950 border border-rose-500/30">
                <div className="text-rose-300 font-bold text-xs flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Inativo / Outro Afastamento Temporário</span>
                </div>
                <p className="text-[11px] text-rose-200/90">
                  O militar será temporariamente desativado das escalas e da rotina operacional.
                </p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Motivo do Afastamento *</label>
                  <input
                    type="text"
                    placeholder="Ex: Disposição de outro órgão / Afastamento disciplinar / Cautelar"
                    value={situacaoMotivo}
                    onChange={(e) => setSituacaoMotivo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalSituacaoAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-900/40 transition"
              >
                Salvar Alteração
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmação de Exclusão de Militar */}
      <ConfirmDialog
        aberto={!!militarParaExcluir}
        titulo="Remover Militar"
        mensagem={`Tem certeza de que deseja remover o militar ${militarParaExcluir?.posto} ${militarParaExcluir?.nomeGuerra}? Ele será retirado das escalas imediatamente.`}
        textoConfirmar="Remover"
        perigoso
        onConfirmar={async () => {
          if (militarParaExcluir) {
            await remover("militares", militarParaExcluir.id);
            setMilitarParaExcluir(null);
            mostrarToast("Militar removido com sucesso.");
          }
        }}
        onCancelar={() => setMilitarParaExcluir(null)}
      />

      {/* Ficha de Acompanhamento Individual do Militar (com Histórico) */}
      <FichaAcompanhamentoModal
        militar={militarParaFicha}
        aberto={!!militarParaFicha}
        onFechar={() => setMilitarParaFicha(null)}
      />
    </div>
  );
}
