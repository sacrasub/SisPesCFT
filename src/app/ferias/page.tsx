"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  cargaFeriasAnual,
  conflitosFerias,
  type ConflitoFerias,
} from "@/lib/engine/ferias";
import { DIVISOES, DIVISAO_MAP } from "@/lib/constants";
import { fmt, duracaoDias, hojeISO, MESES_CURTOS } from "@/lib/dates";
import { nomeMilitar, uid } from "@/lib/utils";
import { podeEditarFerias } from "@/lib/permissions";
import { DivisaoBadge, PostoChip, StatusLancamentoBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CalendarDays,
  Palmtree,
  AlertTriangle,
  CheckCircle,
  Plus,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Search,
  Trash2,
} from "lucide-react";
import type { Afastamento, DivisaoId, ISODate } from "@/lib/types";

export default function FeriasPage() {
  const { db, ctx, hoje, salvar, remover } = useDb();
  const { usuario } = useAuth();

  const [ano, setAno] = useState<number>(() => Number(hoje.slice(0, 4)));
  const [filtroDivisao, setFiltroDivisao] = useState<DivisaoId | "TODAS">("TODAS");
  const [busca, setBusca] = useState("");

  // Modal de Agendamento de Férias
  const [modalAberto, setModalAberto] = useState(false);
  const [feriasParaExcluir, setFeriasParaExcluir] = useState<Afastamento | null>(null);

  // Campos do Formulário de Férias
  const [formMilitarId, setFormMilitarId] = useState<string>("");
  const [formPeriodoTipo, setFormPeriodoTipo] = useState<string>("Férias regulamentares");
  const [formInicio, setFormInicio] = useState<string>(`${ano}-01-10`);
  const [formFim, setFormFim] = useState<string>(`${ano}-02-08`);
  const [formObservacoes, setFormObservacoes] = useState<string>("");

  // Análise anual de carga e picos por divisão
  const cargasPorDivisao = useMemo(
    () => cargaFeriasAnual(ctx, ano),
    [ctx, ano]
  );

  // Conflitos detectados no ano (Conselho de Gestão, Picos de Divisão, Escalas Críticas)
  const conflitos = useMemo(
    () => conflitosFerias(ctx, `${ano}-01-01`, `${ano}-12-31`),
    [ctx, ano]
  );

  // Lista de todas as férias cadastradas no ano
  const todasFerias = useMemo(() => {
    return db.afastamentos
      .filter(
        (a) =>
          a.categoria === "FERIAS" &&
          (a.inicio.startsWith(String(ano)) || a.fim.startsWith(String(ano)))
      )
      .filter((a) => {
        if (filtroDivisao !== "TODAS") {
          const m = ctx.militarMap.get(a.militarIds[0]);
          if (m?.divisao !== filtroDivisao) return false;
        }
        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const m = ctx.militarMap.get(a.militarIds[0]);
          return (
            m &&
            (m.nomeGuerra.toLowerCase().includes(termo) ||
              m.nomeCompleto.toLowerCase().includes(termo) ||
              m.nip.includes(termo))
          );
        }
        return true;
      })
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [db.afastamentos, ano, filtroDivisao, busca, ctx.militarMap]);

  // Submissão do Formulário de Férias
  const handleSalvarFerias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMilitarId) {
      alert("Selecione o militar.");
      return;
    }
    if (formFim < formInicio) {
      alert("A data final não pode ser anterior à data inicial.");
      return;
    }

    const militar = ctx.militarMap.get(formMilitarId);
    if (!militar) return;

    const agora = new Date().toISOString();
    const item: Afastamento = {
      id: uid("fer"),
      categoria: "FERIAS",
      divisao: militar.divisao,
      subtipo: formPeriodoTipo,
      titulo: `${formPeriodoTipo} — ${militar.posto} ${militar.nomeGuerra}`,
      inicio: formInicio,
      fim: formFim,
      militarIds: [militar.id],
      status: "PREVISTO",
      impactaEscala: true,
      observacoes: formObservacoes.trim() || undefined,
      criadoPor: usuario?.nome || "Setor de Pessoal",
      createdAt: agora,
      updatedAt: agora,
    };

    await salvar("afastamentos", item);
    setModalAberto(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <Palmtree className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Módulo de Férias e Afastamentos Integrados
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cronograma anual unificado • Prevenção de gargalos por divisão e conflitos com o Conselho de Gestão.
          </p>
        </div>

        {/* Seletor de Ano e Novo Agendamento */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-navy-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setAno(ano - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition"
              title="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-sm text-gold-400 px-2">
              {ano}
            </span>
            <button
              onClick={() => setAno(ano + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition"
              title="Próximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormMilitarId(ctx.militares[0]?.id || "");
              setModalAberto(true);
            }}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Férias</span>
          </button>
        </div>
      </div>

      {/* Painel de Conflitos Detectados no Ano */}
      {conflitos.length > 0 && (
        <div className="card p-5 border-amber-500/30 bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Gargalos e Conflitos Detectados no Cronograma ({conflitos.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Ação Necessária
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conflitos.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-navy-950/80 border border-amber-500/30 text-xs space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {c.titulo}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {fmt(c.inicio)}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{c.detalhe}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAPA DE CARGA / GARGALO DE FÉRIAS POR DIVISÃO */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gold-400" />
              <span>Mapa de Carga de Férias por Divisão ({ano})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Pico de militares de férias por mês. Destaque em vermelho quando ultrapassa o limite institucional (30%).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Divisão</th>
                <th className="py-3 px-2 text-center">Efetivo</th>
                <th className="py-3 px-2 text-center">Limite (30%)</th>
                {MESES_CURTOS.map((mes: string) => (
                  <th key={mes} className="py-3 px-2 text-center">
                    {mes}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {cargasPorDivisao.map((item) => {
                const info = DIVISAO_MAP[item.divisao];
                return (
                  <tr key={item.divisao} className="hover:bg-navy-900/40">
                    <td className="py-2.5 px-3">
                      <DivisaoBadge divisao={item.divisao} />
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                      {item.efetivo}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-gold-400">
                      {item.limite}
                    </td>
                    {item.meses.map((m) => {
                      const excedeu = m.excedido;
                      const temGente = m.pico > 0;
                      return (
                        <td key={m.mes} className="py-2 px-1 text-center font-mono">
                          {temGente ? (
                            <span
                              className={`inline-block w-7 py-1 rounded text-xs font-bold ${
                                excedeu
                                  ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                                  : "bg-navy-800 text-slate-200 border border-slate-700"
                              }`}
                              title={`${m.pico} militar(es) de férias simultaneamente`}
                            >
                              {m.pico}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de Férias Agendadas no Ano */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold-400" />
              <span>Cronograma Individual de Férias ({todasFerias.length} agendamentos)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Registros individuais de períodos de férias homologados e previstos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar militar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input text-xs py-1.5 w-44"
            />
            <select
              value={filtroDivisao}
              onChange={(e) => setFiltroDivisao(e.target.value as any)}
              className="input text-xs py-1.5 w-auto bg-navy-900"
            >
              <option value="TODAS">Todas as Divisões</option>
              {DIVISOES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.sigla}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Militar</th>
                <th className="py-3 px-3">Divisão</th>
                <th className="py-3 px-3">Tipo de Período</th>
                <th className="py-3 px-3">Início</th>
                <th className="py-3 px-3">Término</th>
                <th className="py-3 px-3 text-center">Dias</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {todasFerias.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    Nenhuma férias registrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                todasFerias.map((f) => {
                  const m = ctx.militarMap.get(f.militarIds[0]);
                  const dias = duracaoDias(f.inicio, f.fim);
                  const podeEditar = podeEditarFerias(usuario, m);

                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-navy-900/50 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <PostoChip posto={m?.posto || "MN"} />
                          <span className="font-bold text-slate-100">
                            {m?.nomeGuerra || "Militar"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {m && <DivisaoBadge divisao={m.divisao} />}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {f.subtipo || "Férias"}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{fmt(f.inicio)}</td>
                      <td className="py-2.5 px-3 font-mono">{fmt(f.fim)}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-gold-400">
                        {dias}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusLancamentoBadge status={f.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {podeEditar && (
                          <button
                            type="button"
                            onClick={() => setFeriasParaExcluir(f)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Remover agendamento de férias"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Agendamento de Férias */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Agendar Período de Férias"
        subtitulo="Lançamento no cronograma anual com validação de conselho e cobertura."
        maxLargura="md"
      >
        <form onSubmit={handleSalvarFerias} className="space-y-4">
          <div>
            <label className="label">Selecione o Militar *</label>
            <select
              value={formMilitarId}
              onChange={(e) => setFormMilitarId(e.target.value)}
              className="input"
              required
            >
              <option value="">Selecione...</option>
              {ctx.militares.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.posto} {m.nomeGuerra} ({m.nomeCompleto}) — {DIVISAO_MAP[m.divisao]?.sigla}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Período / Fracionamento *</label>
            <select
              value={formPeriodoTipo}
              onChange={(e) => setFormPeriodoTipo(e.target.value)}
              className="input"
            >
              <option value="Férias regulamentares (30 dias)">
                Férias regulamentares (30 dias)
              </option>
              <option value="Férias – 1º período (15 dias)">
                Férias – 1º período (15 dias)
              </option>
              <option value="Férias – 2º período (15 dias)">
                Férias – 2º período (15 dias)
              </option>
              <option value="Férias – 1º período (10 dias)">
                Férias – 1º período (10 dias)
              </option>
              <option value="Férias – 2º período (10 dias)">
                Férias – 2º período (10 dias)
              </option>
              <option value="Férias – 3º período (10 dias)">
                Férias – 3º período (10 dias)
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="label">Observações</label>
            <input
              type="text"
              placeholder="Ex: Portaria de concessão nº..."
              value={formObservacoes}
              onChange={(e) => setFormObservacoes(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-gold-900/40 transition"
            >
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão de Férias */}
      <ConfirmDialog
        aberto={!!feriasParaExcluir}
        titulo="Remover Férias"
        mensagem={`Deseja remover as férias de ${feriasParaExcluir?.titulo}? O militar voltará a estar disponível para as escalas no período.`}
        textoConfirmar="Remover"
        perigoso
        onConfirmar={async () => {
          if (feriasParaExcluir) {
            await remover("afastamentos", feriasParaExcluir.id);
            setFeriasParaExcluir(null);
          }
        }}
        onCancelar={() => setFeriasParaExcluir(null)}
      />
    </div>
  );
}
