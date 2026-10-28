"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  DIVISOES,
  DIVISAO_MAP,
  CATEGORIA_META,
  STATUS_LANCAMENTO_META,
  SUBTIPOS_POR_DIVISAO,
  SUBTIPOS_GERAIS,
  ESCALA_LABEL,
} from "@/lib/constants";
import { fmt, duracaoDias, diffDays } from "@/lib/dates";
import { uid, nomeMilitar, toCSV, downloadArquivo } from "@/lib/utils";
import { podeLancarPara, podeEditarLancamento } from "@/lib/permissions";
import { analisarImpacto, type ImpactoLancamento } from "@/lib/engine/impacto";
import {
  CategoriaBadge,
  DivisaoBadge,
  PostoChip,
  StatusLancamentoBadge,
} from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  Edit2,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import type {
  Afastamento,
  AfastamentoCategoria,
  AfastamentoStatus,
  DivisaoId,
} from "@/lib/types";

export default function LancamentosPage() {
  const { db, ctx, hoje, salvar, remover } = useDb();
  const { usuario } = useAuth();

  // Filtros de listagem
  const [filtroDivisao, setFiltroDivisao] = useState<DivisaoId | "TODAS">(
    usuario?.perfil === "DIVISAO" && usuario.divisao ? usuario.divisao : "TODAS"
  );
  const [filtroCategoria, setFiltroCategoria] = useState<
    AfastamentoCategoria | "TODAS"
  >("TODAS");
  const [filtroStatus, setFiltroStatus] = useState<
    AfastamentoStatus | "TODOS"
  >("TODOS");
  const [busca, setBusca] = useState("");

  // Estado do Modal de Formulário
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<Afastamento | null>(null);

  // Confirmação de exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<Afastamento | null>(null);

  // Campos do Formulário
  const divisaoInicial: DivisaoId =
    usuario?.perfil === "DIVISAO" && usuario.divisao
      ? usuario.divisao
      : "STA";

  const [formDivisao, setFormDivisao] = useState<DivisaoId>(divisaoInicial);
  const [formCategoria, setFormCategoria] =
    useState<AfastamentoCategoria>("MISSAO");
  const [formSubtipo, setFormSubtipo] = useState<string>("");
  const [formTitulo, setFormTitulo] = useState<string>("");
  const [formLocal, setFormLocal] = useState<string>("");
  const [formInicio, setFormInicio] = useState<string>(hoje);
  const [formFim, setFormFim] = useState<string>(hoje);
  const [formMilitares, setFormMilitares] = useState<string[]>([]);
  const [formImpactaEscala, setFormImpactaEscala] = useState<boolean>(true);
  const [formStatus, setFormStatus] = useState<AfastamentoStatus>("PREVISTO");
  const [formObservacoes, setFormObservacoes] = useState<string>("");
  const [formTerminoAsd, setFormTerminoAsd] = useState<boolean>(false);
  const [formSubstitutoId, setFormSubstitutoId] = useState<string>("");

  // Subtipos sugeridos conforme categoria e divisão
  const subtiposSugeridos = useMemo(() => {
    const daDivisao =
      SUBTIPOS_POR_DIVISAO[formDivisao]?.[formCategoria] || [];
    const gerais = SUBTIPOS_GERAIS[formCategoria] || [];
    return Array.from(new Set([...daDivisao, ...gerais]));
  }, [formDivisao, formCategoria]);

  // Simulação de Impacto "What-If" em tempo real enquanto edita
  const impactoPreview: ImpactoLancamento = useMemo(() => {
    if (!formInicio || !formFim || !formMilitares.length) {
      return {
        nivel: "ok",
        escalas: [],
        duplicidades: [],
        conselho: [],
        picoFerias: [],
      };
    }
    const rascunho: Afastamento = {
      id: itemEmEdicao?.id || "temp-preview",
      divisao: formDivisao,
      categoria: formCategoria,
      subtipo: formSubtipo || formTitulo || "Previsão",
      titulo: formTitulo || "Nova Previsão",
      local: formLocal,
      inicio: formInicio,
      fim: formFim,
      terminoAsd: formTerminoAsd,
      militarSubstitutoId: formSubstitutoId || undefined,
      militarIds: formMilitares,
      status: formStatus,
      impactaEscala: formImpactaEscala,
      criadoPor: usuario?.nome || "Usuário",
      createdAt: hoje,
      updatedAt: hoje,
    };
    return analisarImpacto(db, rascunho, itemEmEdicao?.id);
  }, [
    db,
    formDivisao,
    formCategoria,
    formSubtipo,
    formTitulo,
    formLocal,
    formInicio,
    formFim,
    formMilitares,
    formStatus,
    formImpactaEscala,
    itemEmEdicao,
    usuario,
    hoje,
  ]);

  // Abrir Modal para Novo Lançamento
  const abrirNovo = () => {
    setItemEmEdicao(null);
    const div =
      usuario?.perfil === "DIVISAO" && usuario.divisao
        ? usuario.divisao
        : "STA";
    setFormDivisao(div);
    setFormCategoria("MISSAO");
    setFormSubtipo("");
    setFormTitulo("");
    setFormLocal("");
    setFormInicio(hoje);
    setFormFim(hoje);
    setFormMilitares([]);
    setFormImpactaEscala(true);
    setFormStatus("PREVISTO");
    setFormObservacoes("");
    setFormTerminoAsd(false);
    setFormSubstitutoId("");
    setModalAberto(true);
  };

  // Abrir Modal para Edição
  const abrirEditar = (item: Afastamento) => {
    setItemEmEdicao(item);
    setFormDivisao(item.divisao);
    setFormCategoria(item.categoria);
    setFormSubtipo(item.subtipo);
    setFormTitulo(item.titulo);
    setFormLocal(item.local || "");
    setFormInicio(item.inicio);
    setFormFim(item.fim);
    setFormMilitares([...item.militarIds]);
    setFormImpactaEscala(item.impactaEscala);
    setFormStatus(item.status);
    setFormObservacoes(item.observacoes || "");
    setFormTerminoAsd(Boolean(item.terminoAsd));
    setFormSubstitutoId(item.militarSubstitutoId || "");
    setModalAberto(true);
  };

  // Salvar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMilitares.length) {
      alert("Selecione pelo menos um militar para o lançamento.");
      return;
    }
    if (formFim < formInicio) {
      alert("A data de término não pode ser anterior à data de início.");
      return;
    }

    const agora = new Date().toISOString();
    const item: Afastamento = {
      id: itemEmEdicao?.id || uid("af"),
      divisao: formDivisao,
      categoria: formCategoria,
      subtipo: formSubtipo.trim() || formTitulo.trim(),
      titulo: formTitulo.trim() || formSubtipo.trim() || "Missão Institucional",
      local: formLocal.trim() || undefined,
      inicio: formInicio,
      fim: formFim,
      terminoAsd: formTerminoAsd,
      militarSubstitutoId: formSubstitutoId || undefined,
      militarIds: formMilitares,
      status: formStatus,
      impactaEscala: formImpactaEscala,
      observacoes: formObservacoes.trim() || undefined,
      criadoPor: itemEmEdicao?.criadoPor || usuario?.nome || "Operador",
      createdAt: itemEmEdicao?.createdAt || agora,
      updatedAt: agora,
    };

    await salvar("afastamentos", item);
    setModalAberto(false);
  };

  // Alternar confirmação do status
  const alternarStatusConfirmado = async (item: Afastamento) => {
    const novoStatus: AfastamentoStatus =
      item.status === "CONFIRMADO" ? "PREVISTO" : "CONFIRMADO";
    await salvar("afastamentos", {
      ...item,
      status: novoStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  // Filtragem da lista
  const lancamentosFiltrados = useMemo(() => {
    return db.afastamentos
      .filter((a) => {
        if (filtroDivisao !== "TODAS" && a.divisao !== filtroDivisao)
          return false;
        if (filtroCategoria !== "TODAS" && a.categoria !== filtroCategoria)
          return false;
        if (filtroStatus !== "TODOS" && a.status !== filtroStatus) return false;
        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const matchTitulo = a.titulo.toLowerCase().includes(termo);
          const matchSub = a.subtipo.toLowerCase().includes(termo);
          const matchLocal = (a.local || "").toLowerCase().includes(termo);
          const matchMilitar = a.militarIds.some((mid) => {
            const m = ctx.militarMap.get(mid);
            return (
              m &&
              (m.nomeGuerra.toLowerCase().includes(termo) ||
                m.nip.includes(termo))
            );
          });
          if (!matchTitulo && !matchSub && !matchLocal && !matchMilitar)
            return false;
        }
        return true;
      })
      .sort((a, b) => b.inicio.localeCompare(a.inicio));
  }, [
    db.afastamentos,
    filtroDivisao,
    filtroCategoria,
    filtroStatus,
    busca,
    ctx.militarMap,
  ]);

  // Exportar para CSV
  const exportarCSV = () => {
    const linhas = lancamentosFiltrados.map((a) => {
      const nomes = a.militarIds
        .map((id) => nomeMilitar(ctx.militarMap.get(id)))
        .join(", ");
      return {
        ID: a.id,
        Divisão: a.divisao,
        Categoria: a.categoria,
        Subtipo: a.subtipo,
        Título: a.titulo,
        Local: a.local || "",
        Início: a.inicio,
        Fim: a.fim,
        "Duração (dias)": duracaoDias(a.inicio, a.fim),
        Status: a.status,
        "Impacta Escala": a.impactaEscala ? "SIM" : "NÃO",
        Militares: nomes,
        "Criado Por": a.criadoPor,
      };
    });
    const csv = toCSV(linhas);
    downloadArquivo(
      `SisPesCFT_Lancamentos_${hoje}.csv`,
      csv,
      "text/csv"
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Lançamentos Descentralizados das Divisões
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Previsões mensais de missões, cursos (CFAQ/EPM), itinerâncias (STA), operações e afastamentos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            className="px-3.5 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={abrirNovo}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-navy-900/80 border border-slate-800">
        {/* Busca textual */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por missão, local ou militar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input text-xs pl-8 py-2"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>

        {/* Filtro de Divisão */}
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

        {/* Filtro de Categoria */}
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value as any)}
          className="input text-xs py-2 bg-navy-900"
        >
          <option value="TODAS">Todas as Categorias</option>
          {Object.entries(CATEGORIA_META).map(([cat, meta]) => (
            <option key={cat} value={cat}>
              {meta.label}
            </option>
          ))}
        </select>

        {/* Filtro de Status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as any)}
          className="input text-xs py-2 bg-navy-900"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="PREVISTO">Previstos</option>
          <option value="CONFIRMADO">Confirmados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {/* Lista / Grade de Lançamentos */}
      <div className="space-y-3">
        {lancamentosFiltrados.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            Nenhum lançamento encontrado para os filtros selecionados.
          </div>
        ) : (
          lancamentosFiltrados.map((item) => {
            const dias = duracaoDias(item.inicio, item.fim);
            const podeEditar = podeEditarLancamento(usuario, item);

            return (
              <div
                key={item.id}
                className="card p-4 sm:p-5 card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Lado Esquerdo: Detalhes do Lançamento */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DivisaoBadge divisao={item.divisao} />
                    <CategoriaBadge categoria={item.categoria} />
                    <StatusLancamentoBadge status={item.status} />
                    {item.impactaEscala ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/20">
                        Impacta Escala
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Sem impacto na escala
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{item.titulo}</span>
                      {item.subtipo && item.subtipo !== item.titulo && (
                        <span className="text-xs text-slate-400 font-normal">
                          ({item.subtipo})
                        </span>
                      )}
                    </h3>

                    {item.local && (
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gold-400" />
                        <span>{item.local}</span>
                      </div>
                    )}
                  </div>

                  {/* Período e Duração */}
                  <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.terminoAsd
                        ? `${fmt(item.inicio)} A ASD`
                        : `${fmt(item.inicio)} até ${fmt(item.fim)}`}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-gold-300 font-semibold">
                      {item.terminoAsd ? "ASD (Até 2ª Determinação)" : `${dias} dia${dias > 1 ? "s" : ""}`}
                    </span>
                    {item.militarSubstitutoId && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-300 font-sans font-semibold">
                          Substituto: {nomeMilitar(ctx.militarMap.get(item.militarSubstitutoId))}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Militares Envolvidos */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Efetivo:
                    </span>
                    {item.militarIds.map((mid) => {
                      const m = ctx.militarMap.get(mid);
                      if (!m) return null;
                      return (
                        <span
                          key={mid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-800 text-[11px] text-slate-200 border border-slate-700"
                        >
                          <PostoChip posto={m.posto} />
                          <span>{m.nomeGuerra}</span>
                        </span>
                      );
                    })}
                  </div>

                  {item.observacoes && (
                    <div className="text-[11px] text-slate-400 italic pt-1">
                      Obs: {item.observacoes}
                    </div>
                  )}
                </div>

                {/* Lado Direito: Ações */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                  <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
                    Criado por: {item.criadoPor}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de Confirmar/Alternar Status */}
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => alternarStatusConfirmado(item)}
                        className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1 ${
                          item.status === "CONFIRMADO"
                            ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50"
                            : "bg-navy-800 border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40"
                        }`}
                        title={
                          item.status === "CONFIRMADO"
                            ? "Clique para voltar para Previsto"
                            : "Clique para Confirmar Lançamento"
                        }
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">
                          {item.status === "CONFIRMADO"
                            ? "Confirmado"
                            : "Confirmar"}
                        </span>
                      </button>
                    )}

                    {/* Editar */}
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => abrirEditar(item)}
                        className="p-2 rounded-xl bg-navy-800 border border-slate-700 text-slate-300 hover:text-gold-300 hover:border-gold-500/40 transition"
                        title="Editar lançamento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Excluir */}
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => setItemParaExcluir(item)}
                        className="p-2 rounded-xl bg-navy-800 border border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Lançamento / Edição Descentralizada */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={itemEmEdicao ? "Editar Previsão / Lançamento" : "Novo Lançamento Descentralizado"}
        subtitulo="Cadastre a missão, curso ou afastamento e acompanhe o impacto na escala em tempo real."
        maxLargura="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Divisão Responsável */}
            <div>
              <label className="label">Divisão Lançadora *</label>
              <select
                value={formDivisao}
                onChange={(e) => setFormDivisao(e.target.value as DivisaoId)}
                className="input"
                disabled={
                  usuario?.perfil === "DIVISAO" && !!usuario.divisao
                }
              >
                {DIVISOES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.sigla} — {d.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="label">Categoria do Evento *</label>
              <select
                value={formCategoria}
                onChange={(e) => {
                  const cat = e.target.value as AfastamentoCategoria;
                  setFormCategoria(cat);
                  setFormSubtipo("");
                  setFormImpactaEscala(CATEGORIA_META[cat].impactaPorPadrao);
                }}
                className="input"
              >
                {Object.entries(CATEGORIA_META).map(([cat, meta]) => (
                  <option key={cat} value={cat}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subtipo sugerido ou livre */}
            <div>
              <label className="label">Tipo / Missão Específica *</label>
              <input
                type="text"
                list="subtipos-datalist"
                placeholder="Ex: CFAQ, Itinerância, Aulão..."
                value={formSubtipo}
                onChange={(e) => {
                  setFormSubtipo(e.target.value);
                  if (!formTitulo) setFormTitulo(e.target.value);
                }}
                className="input"
                required
              />
              <datalist id="subtipos-datalist">
                {subtiposSugeridos.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* Título / Descritivo */}
            <div>
              <label className="label">Título / Descrição da Missão *</label>
              <input
                type="text"
                placeholder="Ex: Itinerância STA – Benjamin Constant"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Local */}
            <div>
              <label className="label">Local / Município</label>
              <input
                type="text"
                placeholder="Ex: Tabatinga, Benjamin Constant..."
                value={formLocal}
                onChange={(e) => setFormLocal(e.target.value)}
                className="input"
              />
            </div>

            {/* Data Início */}
            <div>
              <label className="label">Data de Início *</label>
              <input
                type="date"
                value={formInicio}
                onChange={(e) => setFormInicio(e.target.value)}
                className="input font-mono"
                required
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="label">Data de Término *</label>
              <input
                type="date"
                value={formFim}
                onChange={(e) => setFormFim(e.target.value)}
                className="input font-mono"
                required
              />
            </div>
          </div>

          {/* Seleção de Militares */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">
                Militares Envolvidos ({formMilitares.length} selecionados) *
              </label>
              <button
                type="button"
                onClick={() => {
                  // Selecionar todos da divisão
                  const ids = ctx.militares
                    .filter((m) => m.divisao === formDivisao)
                    .map((m) => m.id);
                  setFormMilitares(ids);
                }}
                className="text-[11px] text-gold-400 hover:text-gold-300 font-semibold"
              >
                Selecionar todos da divisão
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-950/80 border border-slate-800 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ctx.militares.map((m) => {
                const checked = formMilitares.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition border text-xs ${
                      checked
                        ? "bg-navy-800 border-gold-500/40 text-slate-100"
                        : "bg-navy-900/40 border-transparent text-slate-300 hover:bg-navy-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormMilitares([...formMilitares, m.id]);
                        } else {
                          setFormMilitares(
                            formMilitares.filter((id) => id !== m.id)
                          );
                        }
                      }}
                      className="rounded border-slate-700 bg-navy-900 text-gold-500 focus:ring-gold-400"
                    />
                    <PostoChip posto={m.posto} />
                    <span className="font-semibold">{m.nomeGuerra}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {DIVISAO_MAP[m.divisao]?.sigla}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Opções de Escala e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-navy-950/60 border border-slate-800">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formImpactaEscala}
                  onChange={(e) => setFormImpactaEscala(e.target.checked)}
                  className="rounded border-slate-700 bg-navy-900 text-gold-500 focus:ring-gold-400"
                />
                <span className="text-xs font-bold text-slate-200">
                  Impacta as Escalas de Serviço
                </span>
              </label>
              <p className="text-[11px] text-slate-400 mt-1 ml-5">
                Se marcado, os militares ficam indisponíveis para Contramestre, Motorista, Vigia e IN no período.
              </p>
            </div>

            <div>
              <label className="label">Status Inicial do Lançamento</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as AfastamentoStatus)}
                className="input text-xs py-1.5"
              >
                <option value="PREVISTO">Previsto (Planejamento)</option>
                <option value="CONFIRMADO">Confirmado (Execução)</option>
              </select>
            </div>
          </div>

          {/* Plano Semanal: Militar Substituto Obrigatório e Término ASD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <div>
              <label className="label text-amber-300">
                Militar Substituto (Plano Semanal — Item 2.2/2.3)
              </label>
              <select
                value={formSubstitutoId}
                onChange={(e) => setFormSubstitutoId(e.target.value)}
                className="input text-xs py-1.5"
              >
                <option value="">Selecione o militar substituto...</option>
                {ctx.militares
                  .filter((m) => !formMilitares.includes(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {nomeMilitar(m)} [{m.setorCodigo ?? m.divisao}]
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formTerminoAsd}
                  onChange={(e) => setFormTerminoAsd(e.target.checked)}
                  className="rounded border-slate-700 bg-navy-900 text-gold-500 focus:ring-gold-400"
                />
                <span className="text-xs font-bold text-rose-300">
                  Término ASD (Até Segunda Determinação)
                </span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="label">Observações Institucionais</label>
            <input
              type="text"
              placeholder="Ex: Embarque às 08h; apoio de combustível solicitado..."
              value={formObservacoes}
              onChange={(e) => setFormObservacoes(e.target.value)}
              className="input text-xs"
            />
          </div>

          {/* PAINEL DE SIMULAÇÃO DE IMPACTO (WHAT-IF) */}
          {formMilitares.length > 0 && formInicio && formFim && (
            <div
              className={`p-4 rounded-xl border transition ${
                impactoPreview.nivel === "critico"
                  ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                  : impactoPreview.nivel === "atencao"
                  ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                  : "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Simulação de Impacto Institucional (What-If)</span>
              </div>

              {impactoPreview.nivel === "ok" ? (
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Nenhum conflito com escalas, Conselho de Gestão ou duplicidades detectado para este período.
                  </span>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {impactoPreview.escalas.map((imp) => (
                    <div
                      key={imp.escala.id}
                      className="flex items-start gap-2 text-rose-300"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>{ESCALA_LABEL[imp.escala.id]}:</strong> A escala
                        sofrerá degradação para regime crítico durante este período!
                      </div>
                    </div>
                  ))}

                  {impactoPreview.duplicidades.map((dup, i) => {
                    const m = ctx.militarMap.get(dup.militarId);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-amber-300"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>{nomeMilitar(m)}:</strong> já possui o lançamento{" "}
                          <em>{dup.afastamento.titulo}</em> ({fmt(dup.afastamento.inicio)} a {fmt(dup.afastamento.fim)}).
                        </div>
                      </div>
                    );
                  })}

                  {impactoPreview.conselho.map((c, i) => {
                    const m = ctx.militarMap.get(c.militarId);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-rose-300 font-semibold"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Conselho de Gestão:</strong> {nomeMilitar(m)} é
                          membro e estará ausente na reunião <em>{c.evento.titulo}</em>.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Botões do Formulário */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-gold-900/40 transition"
            >
              {itemEmEdicao ? "Salvar Alterações" : "Salvar Lançamento"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        aberto={!!itemParaExcluir}
        titulo="Excluir Lançamento"
        mensagem={`Tem certeza de que deseja excluir "${itemParaExcluir?.titulo}"? Esta ação removerá o afastamento das escalas imediatamente.`}
        textoConfirmar="Excluir"
        perigoso
        onConfirmar={async () => {
          if (itemParaExcluir) {
            await remover("afastamentos", itemParaExcluir.id);
            setItemParaExcluir(null);
          }
        }}
        onCancelar={() => setItemParaExcluir(null)}
      />
    </div>
  );
}
