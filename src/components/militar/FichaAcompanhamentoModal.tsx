"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  POSTOS,
  DIVISOES,
  ESCALA_LABEL,
  SETORES_CFT,
  SETOR_LISTA,
  MOTIVO_DISPENSA_LABEL,
  RESTRICAO_META,
} from "@/lib/constants";
import { uid, porAntiguidade, nomeMilitar } from "@/lib/utils";
import { podeEditarMilitar } from "@/lib/permissions";
import { obterStatusSituacao } from "@/lib/engine/situacao";
import {
  obterIncumbenciasAcumuladas,
  obterHorarios4TemposMilitar,
} from "@/lib/engine/disponibilidade";
import { gerarFolhaPresencaDia } from "@/lib/engine/escalas";
import { fmt, fmtDiaMes, addDays } from "@/lib/dates";
import { DivisaoBadge, PostoChip, RestricaoBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  obterUsuarioAuthPorMilitar,
  verificarSenhaAlterada,
  alterarRoleUsuario,
  resetarSenhaParaPadrao,
  cadastrarUsuarioIndividual,
  isMasterAdmin,
} from "@/lib/auth-cft";
import {
  User,
  Shield,
  Building2,
  Calendar,
  Key,
  History,
  Edit2,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Award,
  Palmtree,
  Plane,
  HeartPulse,
  Anchor,
  Ban,
  Mail,
  Phone,
  Lock,
  Plus,
  Trash2,
  FileText,
  Printer,
  ChevronRight,
  Sparkles,
  BookOpen,
  ArrowRightLeft,
  X,
} from "lucide-react";
import type {
  Militar,
  Posto,
  DivisaoId,
  SetorCodigo,
  EscalaTipo,
  MotivoDispensaEscala,
  RegistroHistoricoMilitar,
  ISODate,
} from "@/lib/types";

interface FichaAcompanhamentoModalProps {
  militar: Militar | null;
  aberto: boolean;
  onFechar: () => void;
  abaInicial?: AbaFicha;
}

export type AbaFicha =
  | "resumo"
  | "lotacao"
  | "escalas"
  | "afastamentos"
  | "acesso"
  | "historico";

export function FichaAcompanhamentoModal({
  militar,
  aberto,
  onFechar,
  abaInicial = "resumo",
}: FichaAcompanhamentoModalProps) {
  const { db, ctx, hoje, salvar, substituirTudo } = useDb();
  const { usuario } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<AbaFicha>(abaInicial);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);

  // Estados de Edição da Ficha
  const [formPosto, setFormPosto] = useState<Posto>(militar?.posto || "3SG");
  const [formNomeGuerra, setFormNomeGuerra] = useState(militar?.nomeGuerra || "");
  const [formNomeCompleto, setFormNomeCompleto] = useState(militar?.nomeCompleto || "");
  const [formNip, setFormNip] = useState(militar?.nip || "");
  const [formEspecialidade, setFormEspecialidade] = useState(militar?.especialidade || "");
  const [formAntiguidade, setFormAntiguidade] = useState<number>(militar?.antiguidadeOrdem ?? 64);
  const [formSetorCodigo, setFormSetorCodigo] = useState<SetorCodigo | "">(militar?.setorCodigo || "");
  const [formSetorSecundario, setFormSetorSecundario] = useState<SetorCodigo | "">(militar?.setorSecundario || "");
  const [formDivisao, setFormDivisao] = useState<DivisaoId>(militar?.divisao || "STA");
  const [formFuncao, setFormFuncao] = useState(militar?.funcao || militar?.funcaoPrincipal || "");
  const [formIncumbencias, setFormIncumbencias] = useState((militar?.incumbencias || []).join(", "));
  const [formConselho, setFormConselho] = useState(militar?.membroConselho || false);
  const [formInstrutorEpm, setFormInstrutorEpm] = useState(militar?.instrutorEpm || false);
  const [formEscalas, setFormEscalas] = useState<EscalaTipo[]>(militar?.escalas || []);
  const [formDispensaEscala, setFormDispensaEscala] = useState<MotivoDispensaEscala>(militar?.dispensaEscala || "NENHUMA");
  const [formRestricaoArmado, setFormRestricaoArmado] = useState(!!militar?.restricaoMedicaArmadoOuEmPe);
  const [formEmailMb, setFormEmailMb] = useState(militar?.emailFuncional || "");
  const [formEmailPessoal, setFormEmailPessoal] = useState(militar?.emailPessoal || "");
  const [formTelefone, setFormTelefone] = useState(militar?.telefoneContato || "");
  const [formRole, setFormRole] = useState<"super_admin" | "admin" | "operador" | "visualizador">(
    (militar?.roleAcesso as any) || "operador"
  );

  // Formulário para Novo Registro Manual de Histórico
  const [modalNovoHistorico, setModalNovoHistorico] = useState(false);
  const [novoHistTipo, setNovoHistTipo] = useState<RegistroHistoricoMilitar["tipo"]>("ELOGIO");
  const [novoHistTitulo, setNovoHistTitulo] = useState("");
  const [novoHistDesc, setNovoHistDesc] = useState("");
  const [novoHistData, setNovoHistData] = useState<ISODate>(hoje);
  const [novoHistDoc, setNovoHistDoc] = useState("");

  // Sincroniza formulário ao mudar de militar
  React.useEffect(() => {
    if (militar) {
      const authUser = obterUsuarioAuthPorMilitar(militar);
      setFormPosto(militar.posto);
      setFormNomeGuerra(militar.nomeGuerra);
      setFormNomeCompleto(militar.nomeCompleto);
      setFormNip(militar.nip);
      setFormEspecialidade(militar.especialidade || "");
      setFormAntiguidade(militar.antiguidadeOrdem ?? 64);
      setFormSetorCodigo(militar.setorCodigo || "");
      setFormSetorSecundario(militar.setorSecundario || "");
      setFormDivisao(militar.divisao);
      setFormFuncao(militar.funcao || militar.funcaoPrincipal || "");
      setFormIncumbencias((militar.incumbencias || []).join(", "));
      setFormConselho(militar.membroConselho);
      setFormInstrutorEpm(!!militar.instrutorEpm);
      setFormEscalas([...militar.escalas]);
      setFormDispensaEscala(militar.dispensaEscala || "NENHUMA");
      setFormRestricaoArmado(!!militar.restricaoMedicaArmadoOuEmPe);
      setFormEmailMb(militar.emailFuncional || authUser?.email_funcional || "");
      setFormEmailPessoal(militar.emailPessoal || authUser?.email_pessoal || "");
      setFormTelefone(militar.telefoneContato || "");
      setFormRole((militar.roleAcesso as any) || (authUser?.role as any) || "operador");
      setModoEdicao(false);
      setMsgSucesso(null);
    }
  }, [militar]);

  const folhaHoje = useMemo(
    () => (aberto && militar ? gerarFolhaPresencaDia(ctx, hoje) : []),
    [aberto, ctx, hoje, militar],
  );
  const linhaFolhaHoje = useMemo(
    () => (militar ? folhaHoje.find((l) => l.militarId === militar.id) : undefined),
    [folhaHoje, militar],
  );
  const horariosHoje = useMemo(
    () => ({
      t1: linhaFolhaHoje?.tempo1 ?? "07:30",
      t2: linhaFolhaHoje?.tempo2 ?? "11:30",
      t3: linhaFolhaHoje?.tempo3 ?? "13:15",
      t4: linhaFolhaHoje?.tempo4 ?? "16:30",
      statusObservacao: linhaFolhaHoje?.statusObservacao ?? "EXPEDIENTE NORMAL",
    }),
    [linhaFolhaHoje],
  );

  const infoSituacao = useMemo(
    () => (militar ? obterStatusSituacao(ctx, militar, hoje) : null),
    [ctx, militar, hoje],
  );
  const authUser = useMemo(
    () => (militar ? obterUsuarioAuthPorMilitar(militar) : null),
    [militar],
  );
  const incumbenciasAcumuladas = useMemo(
    () => (militar ? obterIncumbenciasAcumuladas(ctx, militar.id, hoje) : []),
    [ctx, militar, hoje],
  );
  const emailPrincipal = formEmailMb || formEmailPessoal || authUser?.email || "";
  const senhaAlterada = emailPrincipal ? verificarSenhaAlterada(emailPrincipal) : false;

  // Afastamentos associados a este militar
  const afastamentosDoMilitar = useMemo(
    () => (militar ? db.afastamentos.filter((a) => a.militarIds.includes(militar.id)) : []),
    [db.afastamentos, militar],
  );

  // Trocas de serviço onde este militar atuou (solicitante ou substituto)
  const trocasDoMilitar = useMemo(
    () =>
      militar
        ? (db.trocasServico || []).filter(
            (t) => t.militarSolicitanteId === militar.id || t.militarSubstitutoId === militar.id,
          )
        : [],
    [db.trocasServico, militar],
  );

  // Salvar Alterações da Ficha
  const handleSalvarFicha = async () => {
    if (!militar) return;
    setSalvando(true);
    const agora = new Date().toISOString();

    const incumbenciasArray = formIncumbencias
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const emailMbNorm = formEmailMb.trim().toLowerCase();
    const emailPessoalNorm = formEmailPessoal.trim().toLowerCase();
    const emailLogin =
      emailMbNorm ||
      emailPessoalNorm ||
      `${formNomeGuerra.toLowerCase().replace(/[^a-z0-9]/g, "")}@marinha.mil.br`;

    const atualizado: Militar = {
      ...militar,
      posto: formPosto,
      nomeGuerra: formNomeGuerra.trim().toUpperCase(),
      nomeCompleto: formNomeCompleto.trim(),
      nip: formNip.trim(),
      especialidade: formEspecialidade.trim().toUpperCase() || undefined,
      antiguidadeOrdem: Number(formAntiguidade) || 64,
      setorCodigo: formSetorCodigo ? (formSetorCodigo as SetorCodigo) : undefined,
      setorSecundario: formSetorSecundario ? (formSetorSecundario as SetorCodigo) : undefined,
      divisao: formDivisao,
      funcao: formFuncao.trim() || undefined,
      funcaoPrincipal: formFuncao.trim() || undefined,
      incumbencias: incumbenciasArray.length > 0 ? incumbenciasArray : undefined,
      membroConselho: formConselho,
      instrutorEpm: formInstrutorEpm,
      escalas: formEscalas,
      dispensaEscala: formDispensaEscala !== "NENHUMA" ? formDispensaEscala : undefined,
      restricaoMedicaArmadoOuEmPe: formRestricaoArmado,
      emailFuncional: emailMbNorm || undefined,
      emailPessoal: emailPessoalNorm || undefined,
      telefoneContato: formTelefone.trim() || undefined,
      roleAcesso: formRole,
      updatedAt: agora,
    };

    await salvar("militares", atualizado);

    // Sincroniza Auth
    try {
      cadastrarUsuarioIndividual({
        email: emailLogin,
        email_funcional: emailMbNorm || undefined,
        email_pessoal: emailPessoalNorm || undefined,
        nome: `${atualizado.posto} ${atualizado.nomeGuerra} - ${atualizado.nomeCompleto}`,
        role: formRole,
        cargo: `${atualizado.posto} - ${atualizado.funcao || "Tripulação CFT"}`,
        nip: atualizado.nip,
        posto_grad: atualizado.posto,
        nome_guerra: atualizado.nomeGuerra,
      });
    } catch (err) {
      console.warn("Erro ao sincronizar login na ficha:", err);
    }

    setSalvando(false);
    setModoEdicao(false);
    setMsgSucesso("Ficha individual atualizada com sucesso!");
    setTimeout(() => setMsgSucesso(null), 4000);
  };

  // Adicionar Registro Manual ao Histórico
  const handleAdicionarRegistroHistorico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!militar || !novoHistTitulo.trim()) return;

    const novoReg: RegistroHistoricoMilitar = {
      id: uid("hist"),
      data: novoHistData,
      tipo: novoHistTipo,
      titulo: novoHistTitulo.trim(),
      descricao: novoHistDesc.trim() || undefined,
      documentoReferencia: novoHistDoc.trim() || undefined,
      registradoPor: usuario?.nome || "Sargenteante-Geral / CF-31",
      createdAt: new Date().toISOString(),
    };

    const atualizado: Militar = {
      ...militar,
      historico: [novoReg, ...(militar.historico || [])],
      updatedAt: new Date().toISOString(),
    };

    await salvar("militares", atualizado);
    setModalNovoHistorico(false);
    setNovoHistTitulo("");
    setNovoHistDesc("");
    setNovoHistDoc("");
    setMsgSucesso("Novo registro averbado no histórico com sucesso!");
    setTimeout(() => setMsgSucesso(null), 4000);
  };

  // Remover Registro do Histórico
  const handleRemoverRegistroHistorico = async (histId: string) => {
    if (!militar) return;
    const atualizado: Militar = {
      ...militar,
      historico: (militar.historico || []).filter((h) => h.id !== histId),
      updatedAt: new Date().toISOString(),
    };
    await salvar("militares", atualizado);
    setMsgSucesso("Registro removido do histórico.");
    setTimeout(() => setMsgSucesso(null), 3000);
  };

  // Linha do Tempo Consolidada (Eventos de Sistema + Registros Manuais)
  const linhaDoTempoConsolidada = useMemo(() => {
    if (!militar) return [];
    const itens: Array<{
      id: string;
      data: string;
      categoria: string;
      titulo: string;
      subtitulo?: string;
      icone: any;
      corBadge: string;
      documento?: string;
      manual?: boolean;
    }> = [];

    // 1. Registros manuais do histórico
    (militar.historico || []).forEach((h) => {
      let cor = "bg-sky-500/20 text-sky-300 border-sky-400/30";
      let icone = Award;
      if (h.tipo === "ELOGIO") {
        cor = "bg-gold-500/20 text-gold-300 border-gold-400/40";
        icone = Sparkles;
      } else if (h.tipo === "PROMOCAO") {
        cor = "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
        icone = Award;
      } else if (h.tipo === "CURSO") {
        cor = "bg-purple-500/20 text-purple-300 border-purple-400/40";
        icone = BookOpen;
      } else if (h.tipo === "RESTRICAO") {
        cor = "bg-rose-500/20 text-rose-300 border-rose-400/40";
        icone = AlertTriangle;
      }

      itens.push({
        id: h.id,
        data: h.data,
        categoria: h.tipo,
        titulo: h.titulo,
        subtitulo: h.descricao,
        icone,
        corBadge: cor,
        documento: h.documentoReferencia,
        manual: true,
      });
    });

    // 2. Afastamentos e Missões
    afastamentosDoMilitar.forEach((a) => {
      let icone = Plane;
      let cor = "bg-sky-500/20 text-sky-300 border-sky-400/30";
      if (a.categoria === "FERIAS") {
        icone = Palmtree;
        cor = "bg-amber-500/20 text-amber-300 border-amber-400/40";
      } else if (a.categoria === "LICENCA") {
        icone = HeartPulse;
        cor = "bg-purple-500/20 text-purple-300 border-purple-400/40";
      }

      const subtitulo = `Período: ${fmt(a.inicio)} a ${a.terminoAsd ? "ASD" : fmt(a.fim)}${
        a.militarSubstitutoId
          ? ` • Substituto: ${ctx.militarMap.get(a.militarSubstitutoId)?.nomeGuerra || a.militarSubstitutoId}`
          : ""
      }`;

      itens.push({
        id: `af-${a.id}`,
        data: a.inicio,
        categoria: a.categoria,
        titulo: a.titulo,
        subtitulo,
        icone,
        corBadge: cor,
        documento: a.documentoReferencia,
      });
    });

    // 3. Papeletas de Troca de Serviço
    trocasDoMilitar.forEach((t) => {
      const eraSolicitante = t.militarSolicitanteId === militar.id;
      const outroMilitar = ctx.militarMap.get(
        eraSolicitante ? t.militarSubstitutoId : t.militarSolicitanteId
      );

      itens.push({
        id: `tr-${t.id}`,
        data: t.dataServicoOriginal,
        categoria: "TROCA_SERVICO",
        titulo: `Papeleta de Troca nº ${t.numeroSequencial} (${ESCALA_LABEL[t.posto]})`,
        subtitulo: eraSolicitante
          ? `Solicitou substituição para ${outroMilitar ? nomeMilitar(outroMilitar) : t.militarSubstitutoId} (Nível ${t.nivelHierarquia})`
          : `Assumiu o serviço de ${outroMilitar ? nomeMilitar(outroMilitar) : t.militarSolicitanteId}`,
        icone: ArrowRightLeft,
        corBadge: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40",
        documento: `Status: ${t.statusAprovacaoAjudante}`,
      });
    });

    // 4. Restrições Médicas Atuais
    militar.restricoes.forEach((r) => {
      const meta = RESTRICAO_META[r.tipo];
      itens.push({
        id: `res-${r.id}`,
        data: r.inicio,
        categoria: "RESTRIÇÃO",
        titulo: `${meta.label} — ${r.descricao || meta.descricao}`,
        subtitulo: `Vigência: ${fmt(r.inicio)} a ${r.fim ? fmt(r.fim) : "Indeterminado"}`,
        icone: AlertTriangle,
        corBadge: "bg-rose-500/20 text-rose-300 border-rose-400/40",
      });
    });

    // Ordena do mais recente para o mais antigo
    return itens.sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [militar, afastamentosDoMilitar, trocasDoMilitar, ctx]);

  if (!aberto || !militar || !infoSituacao) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-navy-950 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Toast de Sucesso */}
        {msgSucesso && (
          <div className="absolute top-4 right-14 z-50 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-navy-950 text-xs font-bold shadow-lg flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-4 h-4" />
            <span>{msgSucesso}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CABEÇALHO MILITAR DA FICHA INDIVIDUAL (IMAGEM DO USUÁRIO)         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#071326] via-[#0b1c36] to-[#08152c] border-b border-slate-700/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-slate-900 border border-sky-400/40 p-1 flex items-center justify-center shadow-lg shadow-sky-950/50 shrink-0">
                <Image
                  src="/cft-logo-brasao.png"
                  alt="Brasão CFT"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-navy-950 border border-slate-700 text-sky-300">
                    #{String(militar.antiguidadeOrdem ?? 0).padStart(2, "0")}
                    {militar.posto === "CF" || militar.posto === "CC" ? " ⚓" : ""}
                  </span>
                  <PostoChip posto={militar.posto} />
                  <h1 className="text-lg font-bold text-slate-100 tracking-wide">
                    {militar.especialidade ? `(${militar.especialidade}) ` : ""}
                    {militar.nomeGuerra}
                  </h1>
                  <span className="text-xs font-mono text-slate-400">
                    {militar.nip}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5 font-medium">
                  {militar.nomeCompleto}
                </div>
              </div>
            </div>

            {/* Badges de 4 Tempos, Pontos e Status */}
            <div className="flex flex-wrap items-center gap-2 sm:self-auto">
              {/* Horários dos 4 Tempos de Hoje */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900/90 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shadow-sm">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {horariosHoje.t1} | {horariosHoje.t2} | {horariosHoje.t3} | {horariosHoje.t4}
                </span>
              </div>

              {/* Status na OM */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm ${infoSituacao.badgeCls}`}
              >
                {infoSituacao.status === "ATIVO" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                {infoSituacao.status === "FERIAS" && <Palmtree className="w-3.5 h-3.5 text-amber-400" />}
                {infoSituacao.status === "MISSAO" && <Plane className="w-3.5 h-3.5 text-sky-400" />}
                {infoSituacao.status === "LICENCA" && <HeartPulse className="w-3.5 h-3.5 text-purple-400" />}
                <span>{infoSituacao.labelTabela}</span>
              </div>

              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={onFechar}
                className="p-1.5 rounded-xl bg-navy-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fechar ficha"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Segunda Linha do Header: Setor, Paióis, Pontos da Escala */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {militar.setorCodigo && (
                <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-sky-950/80 text-sky-300 border border-sky-500/30">
                  {militar.setorCodigo} • {SETORES_CFT[militar.setorCodigo]?.nome || militar.divisao}
                </span>
              )}
              {militar.setorSecundario && (
                <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  2º Setor: {militar.setorSecundario}
                </span>
              )}
              {(militar.incumbencias?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold">
                  <span>🗝️ Paióis:</span>
                  <span className="text-slate-300">{militar.incumbencias!.join(" • ")}</span>
                </div>
              )}
              {incumbenciasAcumuladas.map((inc, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40"
                >
                  ⚠️ Acumulando: {inc.incumbencia} (de {inc.titularNome})
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>
                Status do Dia: <strong className="text-slate-200">{horariosHoje.statusObservacao}</strong>
              </span>
              <span>•</span>
              <span>
                Pts Escala: <strong className="text-sky-300">N {militar.pontosEscala?.normal ?? 0}</strong> | <strong className="text-gold-300">D {militar.pontosEscala?.domingoFeriado ?? 0}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* NAVEGAÇÃO ENTRE ABAS DA FICHA INDIVIDUAL                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-4 sm:px-5 border-b border-slate-800 bg-navy-950/90 overflow-x-auto">
          <div className="flex items-center gap-1 py-2">
            <button
              type="button"
              onClick={() => setAbaAtiva("resumo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                abaAtiva === "resumo"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Resumo & Carreira</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("lotacao")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                abaAtiva === "lotacao"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Lotação & Funções (CF-XX)</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("escalas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                abaAtiva === "escalas"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>3. Escalas & Qualificação</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("afastamentos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                abaAtiva === "afastamentos"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>4. Afastamentos ({afastamentosDoMilitar.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("acesso")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                abaAtiva === "acesso"
                  ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>5. Acesso Digital</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("historico")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                abaAtiva === "historico"
                  ? "bg-sky-500 text-navy-950 shadow-md shadow-sky-900/30"
                  : "text-sky-300 bg-sky-950/40 border border-sky-500/30 hover:bg-sky-900/50"
              }`}
            >
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span>📜 6. Histórico Funcional ({linhaDoTempoConsolidada.length})</span>
            </button>
          </div>

          {/* Botões de Ação da Ficha (Editar / Salvar) */}
          {podeEditarMilitar(usuario) && (
            <div className="flex items-center gap-2 py-2">
              {modoEdicao ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModoEdicao(false)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-400 hover:bg-navy-900 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvarFicha}
                    disabled={salvando}
                    className="px-3.5 py-1 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{salvando ? "Gravando..." : "Salvar Ficha"}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModoEdicao(true)}
                  className="px-3 py-1 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gold-400" />
                  <span>Editar Dados</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CORPO DE CONTEÚDO DAS ABAS                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ──── ABA 1: RESUMO & CARREIRA ──── */}
          {abaAtiva === "resumo" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4 space-y-3 bg-navy-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <User className="w-4 h-4 text-sky-400" />
                    <span>Identificação Militar</span>
                  </div>

                  {modoEdicao ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-slate-400">Posto/Graduação</label>
                        <select
                          value={formPosto}
                          onChange={(e) => setFormPosto(e.target.value as Posto)}
                          className="input text-xs py-1.5 mt-0.5"
                        >
                          {POSTOS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id} — {p.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400">Nome de Guerra</label>
                        <input
                          type="text"
                          value={formNomeGuerra}
                          onChange={(e) => setFormNomeGuerra(e.target.value)}
                          className="input text-xs py-1.5 mt-0.5 uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400">Nome Civil</label>
                        <input
                          type="text"
                          value={formNomeCompleto}
                          onChange={(e) => setFormNomeCompleto(e.target.value)}
                          className="input text-xs py-1.5 mt-0.5"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400">NIP</label>
                          <input
                            type="text"
                            value={formNip}
                            onChange={(e) => setFormNip(e.target.value)}
                            className="input text-xs py-1.5 mt-0.5 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400">Especialidade</label>
                          <input
                            type="text"
                            value={formEspecialidade}
                            onChange={(e) => setFormEspecialidade(e.target.value)}
                            className="input text-xs py-1.5 mt-0.5 uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400">Posto / Graduação:</span>{" "}
                        <strong className="text-slate-100">{militar.posto}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Nome de Guerra:</span>{" "}
                        <strong className="text-slate-100">{militar.nomeGuerra}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Nome Completo:</span>{" "}
                        <div className="text-slate-200 font-medium">{militar.nomeCompleto}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">NIP:</span>{" "}
                        <span className="font-mono text-sky-300 font-bold">{militar.nip}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Especialidade / Quadro:</span>{" "}
                        <span className="font-mono text-slate-200">{militar.especialidade || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Antiguidade na CFT:</span>{" "}
                        <span className="font-mono font-bold text-gold-300">#{militar.antiguidadeOrdem ?? "—"}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card p-4 space-y-3 bg-navy-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Rotina de 4 Tempos de Hoje</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">1º Tempo (Início):</span>
                      <strong className="font-mono text-slate-100">{horariosHoje.t1}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">2º Tempo (Almoço):</span>
                      <strong className="font-mono text-slate-100">{horariosHoje.t2}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">3º Tempo (Tarde):</span>
                      <strong className="font-mono text-slate-100">{horariosHoje.t3}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">4º Tempo (Término):</span>
                      <strong className="font-mono text-slate-100">{horariosHoje.t4}</strong>
                    </div>
                  </div>
                </div>

                <div className="card p-4 space-y-3 bg-navy-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <Award className="w-4 h-4 text-gold-400" />
                    <span>Pontuação & Modernidade (OI 02-06D)</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] text-slate-400">Saldo Rotina Normal (Úteis):</div>
                      <div className="text-xl font-bold font-mono text-sky-400">
                        {militar.pontosEscala?.normal ?? 0} <span className="text-xs text-slate-500">pontos (+1.0/svç)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] text-slate-400">Saldo Domingos & Feriados:</div>
                      <div className="text-xl font-bold font-mono text-gold-400">
                        {militar.pontosEscala?.domingoFeriado ?? 0} <span className="text-xs text-slate-500">pontos (+1.5/svç)</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Critério de desempate da Capitania: em igualdade de pontos na escala, o militar mais moderno é escalado antes do mais antigo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──── ABA 2: LOTAÇÃO & FUNÇÕES ──── */}
          {abaAtiva === "lotacao" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="card p-5 bg-navy-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <span>Enquadramento Orgânico na Capitania Fluvial de Tabatinga</span>
                </div>

                {modoEdicao ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold">Setor Oficial CFT (CF-01 a CF-42)</label>
                      <select
                        value={formSetorCodigo}
                        onChange={(e) => setFormSetorCodigo(e.target.value as SetorCodigo)}
                        className="input text-xs py-2 mt-1"
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
                      <label className="text-slate-400 font-semibold">2º Setor / Apoio</label>
                      <select
                        value={formSetorSecundario}
                        onChange={(e) => setFormSetorSecundario(e.target.value as SetorCodigo)}
                        className="input text-xs py-2 mt-1"
                      >
                        <option value="">Nenhum</option>
                        {SETOR_LISTA.map((s) => (
                          <option key={s.codigo} value={s.codigo}>
                            {s.codigo} — {s.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold">Divisão Orgânica</label>
                      <select
                        value={formDivisao}
                        onChange={(e) => setFormDivisao(e.target.value as DivisaoId)}
                        className="input text-xs py-2 mt-1"
                      >
                        {DIVISOES.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.sigla} — {d.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold">Função Principal na OM</label>
                      <input
                        type="text"
                        value={formFuncao}
                        onChange={(e) => setFormFuncao(e.target.value)}
                        className="input text-xs py-2 mt-1"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-slate-400 font-semibold">
                        Incumbências & Paióis sob Responsabilidade
                      </label>
                      <input
                        type="text"
                        value={formIncumbencias}
                        onChange={(e) => setFormIncumbencias(e.target.value)}
                        placeholder="Ex: Paiol de Armamento, Chaveiro Geral, Almoxarifado (separados por vírgula)"
                        className="input text-xs py-2 mt-1"
                      />
                    </div>

                    <div className="flex items-center gap-4 md:col-span-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formConselho}
                          onChange={(e) => setFormConselho(e.target.checked)}
                          className="rounded border-slate-700 bg-navy-900 text-gold-500"
                        />
                        <span className="text-xs font-bold text-slate-200">
                          Membro do Conselho de Gestão da CFT
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formInstrutorEpm}
                          onChange={(e) => setFormInstrutorEpm(e.target.checked)}
                          className="rounded border-slate-700 bg-navy-900 text-purple-500"
                        />
                        <span className="text-xs font-bold text-slate-200">
                          Pertence à OS de Instrutores Eventuais do EPM (CF-10)
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Setor Oficial:</span>
                        <div className="font-bold text-slate-100 text-sm mt-0.5">
                          {militar.setorCodigo || "Não especificado"}
                          {militar.setorCodigo && SETORES_CFT[militar.setorCodigo]
                            ? ` — ${SETORES_CFT[militar.setorCodigo].nome}`
                            : ""}
                        </div>
                        {militar.setorCodigo && SETORES_CFT[militar.setorCodigo] && (
                          <div className="text-[11px] text-slate-400 mt-1">
                            {SETORES_CFT[militar.setorCodigo].atividadesResumo}
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Divisão / Seção:</span>
                        <div className="font-bold text-slate-100 text-sm mt-0.5">
                          <DivisaoBadge divisao={militar.divisao} />
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1">
                          Função: <strong>{militar.funcao || militar.funcaoPrincipal || "Tripulação CFT"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Paióis, Compartimentos & Encargos Titulares:</span>
                      {(militar.incumbencias?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {militar.incumbencias!.map((inc, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-200 border border-slate-700 text-xs font-semibold"
                            >
                              🗝️ {inc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 mt-1 italic">Nenhum paiol ou encargo titular cadastrado.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──── ABA 3: ESCALAS & QUALIFICAÇÃO ──── */}
          {abaAtiva === "escalas" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="card p-5 bg-navy-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-gold-400" />
                  <span>Concorrência às Escalas de Serviço (OI 02-06D)</span>
                </div>

                {modoEdicao ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold mb-1 block">Escalas Habilitadas</label>
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
                              className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${
                                checked
                                  ? "bg-navy-800 border-gold-500/40 text-slate-100"
                                  : "bg-navy-950/60 border-slate-800 text-slate-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) setFormEscalas([...formEscalas, esc]);
                                  else setFormEscalas(formEscalas.filter((x) => x !== esc));
                                }}
                                className="rounded text-gold-500"
                              />
                              <span className="font-semibold">{ESCALA_LABEL[esc]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold mb-1 block">Dispensa Regulamentar de Escala</label>
                      <select
                        value={formDispensaEscala}
                        onChange={(e) => setFormDispensaEscala(e.target.value as MotivoDispensaEscala)}
                        className="input text-xs py-2"
                      >
                        {Object.entries(MOTIVO_DISPENSA_LABEL).map(([cod, label]) => (
                          <option key={cod} value={cod}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-navy-950 border border-slate-800">
                      <input
                        type="checkbox"
                        checked={formRestricaoArmado}
                        onChange={(e) => setFormRestricaoArmado(e.target.checked)}
                        className="rounded text-amber-500"
                      />
                      <span className="font-semibold text-amber-300">
                        Restrição Médica Parcial (Redireciona SG para Supervisor SECOM e CB/MN para Identificador)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1.5 font-semibold">Escalas Concorridas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {militar.escalas.length > 0 ? (
                          militar.escalas.map((esc) => (
                            <span
                              key={esc}
                              className="px-2.5 py-1 rounded-lg bg-navy-800 text-slate-200 border border-slate-700 font-bold"
                            >
                              {ESCALA_LABEL[esc]}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">Não concorre a nenhuma escala de serviço.</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Condição de Dispensa:</span>
                      <div className="font-bold text-slate-100 text-sm mt-0.5">
                        {militar.dispensaEscala ? MOTIVO_DISPENSA_LABEL[militar.dispensaEscala] : "Concorre Normalmente"}
                      </div>
                    </div>

                    {militar.restricoes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                        <span className="text-rose-300 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Restrições Ativas:</span>
                        </span>
                        {militar.restricoes.map((r) => (
                          <div key={r.id} className="text-[11px] text-slate-300">
                            • <RestricaoBadge tipo={r.tipo} descricao={r.descricao} /> (Desde {fmt(r.inicio)})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──── ABA 4: AFASTAMENTOS & MISSÕES ──── */}
          {abaAtiva === "afastamentos" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="card p-5 bg-navy-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Afastamentos, Férias e Missões Registradas</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total: {afastamentosDoMilitar.length} registros
                  </span>
                </div>

                {afastamentosDoMilitar.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs italic">
                    Nenhum afastamento, missão ou período de férias registrado para este militar.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                    {afastamentosDoMilitar.map((a) => {
                      const subst = a.militarSubstitutoId ? ctx.militarMap.get(a.militarSubstitutoId) : null;
                      return (
                        <div key={a.id} className="p-3.5 bg-navy-950/60 hover:bg-navy-900/40 transition text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-100">{a.titulo}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Categoria: <strong>{a.categoria}</strong> • Período: <strong>{fmt(a.inicio)} a {a.terminoAsd ? "ASD" : fmt(a.fim)}</strong>
                              </div>
                              {a.local && (
                                <div className="text-[11px] text-sky-300 mt-0.5">Local: {a.local}</div>
                              )}
                              {subst && (
                                <div className="text-[11px] text-amber-300 mt-0.5">
                                  Substituto na CFT: <strong>{subst.posto} {subst.nomeGuerra}</strong>
                                </div>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.status === "CONFIRMADO"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──── ABA 5: ACESSO DIGITAL & CONTATOS ──── */}
          {abaAtiva === "acesso" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="card p-5 bg-navy-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Key className="w-4 h-4 text-gold-400" />
                  <span>Credenciais e Perfis de Acesso Digital ao SisPesCFT</span>
                </div>

                {modoEdicao ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold">E-mail Institucional (@marinha.mil.br)</label>
                      <input
                        type="email"
                        value={formEmailMb}
                        onChange={(e) => setFormEmailMb(e.target.value)}
                        className="input text-xs py-2 mt-1 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold">E-mail Pessoal Google (@gmail.com)</label>
                      <input
                        type="email"
                        value={formEmailPessoal}
                        onChange={(e) => setFormEmailPessoal(e.target.value)}
                        className="input text-xs py-2 mt-1 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={formTelefone}
                        onChange={(e) => setFormTelefone(e.target.value)}
                        className="input text-xs py-2 mt-1 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold">Perfil de Acesso no SisPesCFT</label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as any)}
                        className="input text-xs py-2 mt-1 font-semibold"
                      >
                        <option value="operador">Operador</option>
                        <option value="admin">Administrador</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="visualizador">Visualizador</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[11px]">E-mail Institucional MB:</span>
                        <div className="font-mono text-sky-300 font-bold text-xs truncate">
                          {militar.emailFuncional || authUser?.email_funcional || "Não informado"}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[11px]">E-mail Pessoal Google:</span>
                        <div className="font-mono text-emerald-300 font-bold text-xs truncate">
                          {militar.emailPessoal || authUser?.email_pessoal || "Não informado"}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">Status da Senha:</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              senhaAlterada
                                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                            }`}
                          >
                            {senhaAlterada ? "🔒 Senha Pessoal Configurada" : "🔑 Padrão (marinha123)"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Perfil: <strong>{militar.roleAcesso?.toUpperCase() || authUser?.role?.toUpperCase() || "OPERADOR"}</strong>
                        </div>
                      </div>

                      {podeEditarMilitar(usuario) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (emailPrincipal) {
                              resetarSenhaParaPadrao(emailPrincipal);
                              if (militar.emailPessoal) resetarSenhaParaPadrao(militar.emailPessoal);
                              setMsgSucesso("Senha redefinida para marinha123!");
                              setTimeout(() => setMsgSucesso(null), 3000);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-navy-800 hover:bg-gold-500/20 text-slate-200 hover:text-gold-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Key className="w-3.5 h-3.5 text-gold-400" />
                          <span>Redefinir para marinha123</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ──── ABA 6: HISTÓRICO FUNCIONAL & LINHA DO TEMPO (SOLICITADA) ──── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === "historico" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="card p-5 bg-navy-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                      <History className="w-4 h-4 text-sky-400" />
                      <span>Ficha de Histórico Funcional & Linha do Tempo</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registro cronológico consolidado: serviços cumpridos, afastamentos, trocas autorizadas, qualificações, averbações e elogios.
                    </p>
                  </div>

                  {podeEditarMilitar(usuario) && (
                    <button
                      type="button"
                      onClick={() => setModalNovoHistorico(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-sky-950 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Registro</span>
                    </button>
                  )}
                </div>

                {linhaDoTempoConsolidada.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">
                    Nenhum registro histórico averbado ainda para este militar. Clique em &quot;Adicionar Registro&quot; para registrar elogios, averbações ou anotações funcionais.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {linhaDoTempoConsolidada.map((item) => {
                      const IconeItem = item.icone;
                      return (
                        <div key={item.id} className="relative group text-xs">
                          {/* Marcador na linha */}
                          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-navy-950 border border-slate-700 flex items-center justify-center shadow-md">
                            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-navy-950/80 border border-slate-800 hover:border-slate-700 transition space-y-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.corBadge}`}>
                                  {item.categoria}
                                </span>
                                <span className="font-bold text-slate-100 text-sm">
                                  {item.titulo}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400 text-[11px]">
                                  {fmt(item.data)}
                                </span>
                                {item.manual && podeEditarMilitar(usuario) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoverRegistroHistorico(item.id)}
                                    className="text-slate-500 hover:text-rose-400 transition"
                                    title="Remover averbação manual"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {item.subtitulo && (
                              <p className="text-slate-300 text-xs leading-relaxed">
                                {item.subtitulo}
                              </p>
                            )}

                            {item.documento && (
                              <div className="text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800/60">
                                Ref: <strong>{item.documento}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RODAPÉ DA FICHA                                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="p-3.5 sm:px-5 bg-navy-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            NIP: <span className="font-mono text-sky-400 font-bold">{militar.nip}</span> • Atualizado em:{" "}
            {fmtDiaMes(militar.updatedAt.slice(0, 10))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-1.5 rounded-xl bg-navy-900 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-700 transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL PARA ADICIONAR NOVO REGISTRO NO HISTÓRICO                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        aberto={modalNovoHistorico}
        onFechar={() => setModalNovoHistorico(false)}
        titulo={`Averbar Novo Registro — ${militar.posto} ${militar.nomeGuerra}`}
        subtitulo="Registro oficial na Ficha Individual de Acompanhamento (Elogios, Cursos, Promoções, Anotações)."
        maxLargura="md"
      >
        <form onSubmit={handleAdicionarRegistroHistorico} className="space-y-3.5 text-xs">
          <div>
            <label className="label">Categoria do Registro *</label>
            <select
              value={novoHistTipo}
              onChange={(e) => setNovoHistTipo(e.target.value as any)}
              className="input text-xs"
            >
              <option value="ELOGIO">⭐ Elogio / Citação Meritória</option>
              <option value="PROMOCAO">⚓ Promoção / Ascensão na Carreira</option>
              <option value="CURSO">🎓 Conclusão de Curso / Habilitação EPM</option>
              <option value="ALTERACAO_FUNCAO">🏢 Alteração de Função / Setor</option>
              <option value="SERVICO">🛡️ Serviço Relevante / Comissão Extraordinária</option>
              <option value="ANOTACAO">📝 Anotação Administrativa / Disciplinar</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data do Evento *</label>
              <input
                type="date"
                value={novoHistData}
                onChange={(e) => setNovoHistData(e.target.value)}
                className="input font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="label">Documento de Publicação</label>
              <input
                type="text"
                placeholder="Ex: Portaria nº 14/2026, BI nº 42"
                value={novoHistDoc}
                onChange={(e) => setNovoHistDoc(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label">Título do Registro *</label>
            <input
              type="text"
              placeholder="Ex: Elogio por dedicação no adestramento de CAV..."
              value={novoHistTitulo}
              onChange={(e) => setNovoHistTitulo(e.target.value)}
              className="input text-xs"
              required
            />
          </div>

          <div>
            <label className="label">Descrição Detalhada / Texto da Averbação</label>
            <textarea
              rows={3}
              placeholder="Descreva o fato, motivo ou texto transcrito do boletim..."
              value={novoHistDesc}
              onChange={(e) => setNovoHistDesc(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalNovoHistorico(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 font-bold text-xs uppercase tracking-wider transition"
            >
              Salvar no Histórico
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
