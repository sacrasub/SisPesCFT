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
} from "@/lib/constants";
import { uid, porAntiguidade } from "@/lib/utils";
import { podeEditarMilitar } from "@/lib/permissions";
import { obterIncumbenciasAcumuladas } from "@/lib/engine/disponibilidade";
import { DivisaoBadge, PostoChip, RestricaoBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
} from "lucide-react";
import type {
  DivisaoId,
  EscalaTipo,
  Militar,
  Posto,
  Restricao,
  RestricaoTipo,
} from "@/lib/types";

export default function EfetivoPage() {
  const { db, ctx, hoje, salvar, remover } = useDb();
  const { usuario } = useAuth();

  const [busca, setBusca] = useState("");
  const [filtroDivisao, setFiltroDivisao] = useState<DivisaoId | "TODAS">("TODAS");
  const [modalMilitarAberto, setModalMilitarAberto] = useState(false);
  const [militarEmEdicao, setMilitarEmEdicao] = useState<Militar | null>(null);
  const [militarParaExcluir, setMilitarParaExcluir] = useState<Militar | null>(null);

  // Modal de Restrição
  const [militarParaRestricao, setMilitarParaRestricao] = useState<Militar | null>(null);
  const [restricaoTipo, setRestricaoTipo] = useState<RestricaoTipo>("MEDICA");
  const [restricaoInicio, setRestricaoInicio] = useState<string>(hoje);
  const [restricaoFim, setRestricaoFim] = useState<string>("");
  const [restricaoDesc, setRestricaoDesc] = useState<string>("");

  // Campos do Formulário de Militar
  const [formNip, setFormNip] = useState("");
  const [formPosto, setFormPosto] = useState<Posto>("3SG");
  const [formNomeGuerra, setFormNomeGuerra] = useState("");
  const [formNomeCompleto, setFormNomeCompleto] = useState("");
  const [formEspecialidade, setFormEspecialidade] = useState("");
  const [formFuncao, setFormFuncao] = useState("");
  const [formDivisao, setFormDivisao] = useState<DivisaoId>("STA");
  const [formEscalas, setFormEscalas] = useState<EscalaTipo[]>([]);
  const [formConselho, setFormConselho] = useState(false);

  // Abrir Modal de Novo Militar
  const abrirNovo = () => {
    setMilitarEmEdicao(null);
    setFormNip("");
    setFormPosto("3SG");
    setFormNomeGuerra("");
    setFormNomeCompleto("");
    setFormEspecialidade("");
    setFormFuncao("");
    setFormDivisao("STA");
    setFormEscalas([]);
    setFormConselho(false);
    setModalMilitarAberto(true);
  };

  // Abrir Modal de Edição
  const abrirEditar = (m: Militar) => {
    setMilitarEmEdicao(m);
    setFormNip(m.nip);
    setFormPosto(m.posto);
    setFormNomeGuerra(m.nomeGuerra);
    setFormNomeCompleto(m.nomeCompleto);
    setFormEspecialidade(m.especialidade || "");
    setFormFuncao(m.funcao || "");
    setFormDivisao(m.divisao);
    setFormEscalas([...m.escalas]);
    setFormConselho(m.membroConselho);
    setModalMilitarAberto(true);
  };

  const handleSalvarMilitar = async (e: React.FormEvent) => {
    e.preventDefault();
    const agora = new Date().toISOString();
    const item: Militar = {
      id: militarEmEdicao?.id || uid("m"),
      nip: formNip.trim(),
      posto: formPosto,
      nomeGuerra: formNomeGuerra.trim().toUpperCase(),
      nomeCompleto: formNomeCompleto.trim(),
      especialidade: formEspecialidade.trim().toUpperCase() || undefined,
      funcao: formFuncao.trim() || undefined,
      divisao: formDivisao,
      escalas: formEscalas,
      membroConselho: formConselho,
      restricoes: militarEmEdicao?.restricoes || [],
      ativo: true,
      createdAt: militarEmEdicao?.createdAt || agora,
      updatedAt: agora,
    };

    await salvar("militares", item);
    setModalMilitarAberto(false);
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
  };

  // Remover Restrição
  const handleRemoverRestricao = async (m: Militar, rId: string) => {
    const atualizado: Militar = {
      ...m,
      restricoes: m.restricoes.filter((r) => r.id !== rId),
      updatedAt: new Date().toISOString(),
    };
    await salvar("militares", atualizado);
  };

  // Militares ordenados por antiguidade e filtrados
  const militaresFiltrados = useMemo(() => {
    return ctx.militares
      .filter((m) => {
        if (filtroDivisao !== "TODAS" && m.divisao !== filtroDivisao)
          return false;
        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const matchNome = m.nomeCompleto.toLowerCase().includes(termo);
          const matchGuerra = m.nomeGuerra.toLowerCase().includes(termo);
          const matchNip = m.nip.includes(termo);
          if (!matchNome && !matchGuerra && !matchNip) return false;
        }
        return true;
      })
      .sort(porAntiguidade);
  }, [ctx.militares, filtroDivisao, busca]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <Users className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Gestão de Efetivo & Restrições
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cadastro de pessoal, atribuição às escalas (Contramestre, Motorista, Vigia), restrições (SRAK, ESPRAC, JS médica) e Conselho.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-navy-900/80 border border-slate-800">
        <div className="relative sm:col-span-2">
          <input
            type="text"
            placeholder="Buscar por nome de guerra, nome completo ou NIP..."
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
      </div>

      {/* Tabela do Efetivo */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">
            Efetivo Cadastrado ({militaresFiltrados.length} militares)
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Posto / Nome</th>
                <th className="py-3 px-3">NIP</th>
                <th className="py-3 px-3">Divisão</th>
                <th className="py-3 px-3">Função / Esp.</th>
                <th className="py-3 px-3">Escalas Habilitadas</th>
                <th className="py-3 px-3">Restrições / Conselho</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {militaresFiltrados.map((m) => {
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-navy-900/50 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <PostoChip posto={m.posto} />
                        <span className="font-bold text-slate-100">
                          {m.nomeGuerra}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {m.nomeCompleto}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {m.nip}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <DivisaoBadge divisao={m.divisao} />
                        {m.setorCodigo && (
                          <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">
                            {m.setorCodigo}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="font-semibold text-slate-200">{m.funcao || m.funcaoPrincipal || "—"}</div>
                      {m.especialidade && (
                        <div className="text-[10px] font-mono text-slate-500">
                          Esp: {m.especialidade}
                        </div>
                      )}
                      {(m.incumbencias?.length ?? 0) > 0 && (
                        <div className="text-[10px] text-amber-300/90 mt-0.5">
                          🗝️ {m.incumbencias!.join(" • ")}
                        </div>
                      )}
                      {obterIncumbenciasAcumuladas(ctx, m.id, hoje).map((inc, idx) => (
                        <div
                          key={idx}
                          className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40"
                        >
                          ⚠️ Acumulando: {inc.incumbencia} (de {inc.titularNome})
                        </div>
                      ))}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
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

                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        {m.membroConselho && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] font-bold">
                            <Award className="w-3 h-3" />
                            Conselho Gestão
                          </span>
                        )}
                        {m.restricoes.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-1 text-[10px]"
                          >
                            <RestricaoBadge
                              tipo={r.tipo}
                              descricao={r.descricao}
                            />
                            {podeEditarMilitar(usuario) && (
                              <button
                                type="button"
                                onClick={() => handleRemoverRestricao(m, r.id)}
                                className="text-slate-500 hover:text-rose-400"
                                title="Remover restrição"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                          <>
                            <button
                              type="button"
                              onClick={() => abrirEditar(m)}
                              className="p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-gold-400 hover:bg-navy-700 transition"
                              title="Editar dados"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMilitarParaExcluir(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Excluir militar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* Modal de Cadastro / Edição de Militar */}
      <Modal
        aberto={modalMilitarAberto}
        onFechar={() => setModalMilitarAberto(false)}
        titulo={militarEmEdicao ? "Editar Militar" : "Cadastrar Militar no Efetivo"}
        subtitulo="Dados institucionais, divisão e concorrência às escalas da Capitania."
        maxLargura="lg"
      >
        <form onSubmit={handleSalvarMilitar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Posto / Graduação *</label>
              <select
                value={formPosto}
                onChange={(e) => setFormPosto(e.target.value as Posto)}
                className="input"
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
            <label className="label">Nome Completo *</label>
            <input
              type="text"
              placeholder="Ex: João da Silva Santos"
              value={formNomeCompleto}
              onChange={(e) => setFormNomeCompleto(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Divisão / Seção *</label>
              <select
                value={formDivisao}
                onChange={(e) => setFormDivisao(e.target.value as DivisaoId)}
                className="input"
              >
                {DIVISOES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.sigla} — {d.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Especialidade (Sigla)</label>
              <input
                type="text"
                placeholder="Ex: MO, ES, CL..."
                value={formEspecialidade}
                onChange={(e) => setFormEspecialidade(e.target.value)}
                className="input uppercase"
              />
            </div>

            <div>
              <label className="label">Função na Capitania</label>
              <input
                type="text"
                placeholder="Ex: Inspetor Naval, Instrutor..."
                value={formFuncao}
                onChange={(e) => setFormFuncao(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Escalas que Concorre */}
          <div>
            <label className="label">Escalas em que Concorre</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(["CONTRAMESTRE", "MOTORISTA", "VIGIA"] as EscalaTipo[]).map(
                (esc) => {
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
                      <span>{ESCALA_LABEL[esc]}</span>
                    </label>
                  );
                }
              )}
            </div>
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalMilitarAberto(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-gold-900/40 transition"
            >
              Salvar Militar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para Adicionar Restrição */}
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
          }
        }}
        onCancelar={() => setMilitarParaExcluir(null)}
      />
    </div>
  );
}
