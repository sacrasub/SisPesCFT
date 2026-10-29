"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { useDb } from "@/store/DataProvider";
import { useAuth } from "@/store/AuthProvider";
import {
  ESCALA_LABEL,
  MOTIVO_DISPENSA_LABEL,
} from "@/lib/constants";
import { fmt, addDays, diaSemana, DIAS_SEMANA_NOMES } from "@/lib/dates";
import { uid, nomeMilitar } from "@/lib/utils";
import { SOMOR_COR, type CelulaSOMOR } from "@/lib/engine/escalas";
import type {
  Militar,
  ISODate,
  EscalaTipo,
  NivelHierarquiaTroca,
  PapeletaTrocaServico,
  Afastamento,
  AfastamentoCategoria,
  MotivoDispensaEscala,
} from "@/lib/types";
import {
  Calendar,
  Clock,
  ArrowRightLeft,
  Shield,
  Coffee,
  Plane,
  Check,
  AlertCircle,
  Save,
  Trash2,
} from "lucide-react";

interface ModalEdicaoCelulaProps {
  aberto: boolean;
  onFechar: () => void;
  militar: Militar | null;
  data: ISODate | null;
  celula: CelulaSOMOR | null;
}

type AbaEdicao = "troca" | "posto" | "folga" | "afastamento";

const POSTOS_DISPONIVEIS: { id: EscalaTipo; label: string; sigla: string }[] = [
  { id: "OSE", label: "Oficial de Serviço", sigla: "OSE" },
  { id: "CONTRAMESTRE", label: "Contramestre de Serviço", sigla: "CTR" },
  { id: "SUPERVISOR_SECOM", label: "Supervisor SECOM", sigla: "SECOM" },
  { id: "CABO_AUXILIAR", label: "Cabo Auxiliar / Dia", sigla: "CB-AUX" },
  { id: "MOTORISTA", label: "Motorista de Dia", sigla: "MO" },
  { id: "INSPECAO_NAVAL", label: "Inspeção Naval", sigla: "IN" },
  { id: "VIGIA", label: "Vigia de Embarcações", sigla: "VG" },
  { id: "IDENTIFICADOR", label: "Identificador", sigla: "IDENT" },
];

export function ModalEdicaoCelula({
  aberto,
  onFechar,
  militar,
  data,
  celula,
}: ModalEdicaoCelulaProps) {
  const { db, ctx, hoje, substituirTudo } = useDb();
  const { isAdmin } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<AbaEdicao>("troca");

  // Estado para Troca de Serviço (Anexo O)
  const [substitutoId, setSubstitutoId] = useState<string>("");
  const [postoTroca, setPostoTroca] = useState<EscalaTipo>("CONTRAMESTRE");
  const [nivelTroca, setNivelTroca] = useState<NivelHierarquiaTroca>(1);
  const [motivoTroca, setMotivoTroca] = useState<string>("");

  // Estado para Afastamento
  const [afastCategoria, setAfastCategoria] = useState<AfastamentoCategoria>("FERIAS");
  const [afastSubtipo, setAfastSubtipo] = useState<string>("FÉRIAS REGULAMENTARES");
  const [afastFim, setAfastFim] = useState<ISODate>(data ? addDays(data, 9) : hoje);
  const [afastSubstitutoId, setAfastSubstitutoId] = useState<string>("");

  // Estado para Dispensa da Escala (OI 02-06D)
  const [dispensaMotivo, setDispensaMotivo] = useState<MotivoDispensaEscala>("SARGENTEANTE_GERAL");

  // Militares candidatos para substituto (exclui o próprio militar)
  const outrosMilitares = useMemo(() => {
    if (!militar) return [];
    return ctx.militares.filter((m) => m.id !== militar.id);
  }, [ctx.militares, militar]);

  // Se militar mudar, inicializar o substituto se vazio
  React.useEffect(() => {
    if (outrosMilitares.length > 0 && (!substitutoId || substitutoId === militar?.id)) {
      setSubstitutoId(outrosMilitares[0].id);
    }
    if (data) {
      setAfastFim(addDays(data, 9));
    }
  }, [militar, outrosMilitares, data, substitutoId]);

  if (!aberto || !militar || !data) return null;

  const diaSemExtenso = DIAS_SEMANA_NOMES[diaSemana(data)];
  const siglaAtual = celula?.sigla ?? "EXPEDIENTE";
  const bgCorAtual = celula?.sigla && celula.sigla !== "AUSENTE" ? SOMOR_COR[celula.sigla] ?? "#374151" : celula?.sigla === "AUSENTE" ? "#d97706" : "#1e293b";

  /* ------------------------------------------------------------------ */
  /* Ação 1: Registrar Papeleta de Troca de Serviço                     */
  /* ------------------------------------------------------------------ */
  const handleSalvarTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!substitutoId) return;

    const ano = Number(data.slice(0, 4));
    const seq = String((db.trocasServico?.length ?? 0) + 1).padStart(3, "0");

    const novaPapeleta: PapeletaTrocaServico = {
      id: uid("tr"),
      numeroSequencial: `${seq}/${ano}`,
      dataServicoOriginal: data,
      posto: postoTroca,
      militarSolicitanteId: militar.id,
      militarSubstitutoId: substitutoId,
      nivelHierarquia: nivelTroca,
      dataSolicitacao: hoje,
      cumpreAntecedencia48h: true,
      motivoJustificativa: motivoTroca.trim() || "Troca de serviço acordada entre os militares (Anexo O - OI 02-06D)",
      statusAprovacaoAjudante: isAdmin ? "AUTORIZADO_CF02" : "AUTORIZADO_CF02",
    };

    const lista = [novaPapeleta, ...(db.trocasServico ?? [])];
    await substituirTudo({ ...db, trocasServico: lista });
    onFechar();
  };

  /* ------------------------------------------------------------------ */
  /* Ação 2: Atribuição Direta de Posto de Serviço                      */
  /* ------------------------------------------------------------------ */
  const handleAtribuirPostoDireto = async (posto: EscalaTipo) => {
    const ano = Number(data.slice(0, 4));
    const seq = String((db.trocasServico?.length ?? 0) + 1).padStart(3, "0");

    // Aloca o militar criando uma papeleta autorizada para ele assumir o posto na data
    const nova: PapeletaTrocaServico = {
      id: uid("tr_dir"),
      numeroSequencial: `${seq}/${ano}`,
      dataServicoOriginal: data,
      posto: posto,
      militarSolicitanteId: militar.id,
      militarSubstitutoId: militar.id,
      nivelHierarquia: 1,
      dataSolicitacao: hoje,
      cumpreAntecedencia48h: true,
      motivoJustificativa: `Alocação direta de serviço (${ESCALA_LABEL[posto]}) pelo Sargenteante-Geral`,
      statusAprovacaoAjudante: "AUTORIZADO_CF02",
    };

    // Remove qualquer afastamento que cubra este único dia se estiver ativo
    await substituirTudo({
      ...db,
      trocasServico: [nova, ...(db.trocasServico ?? [])],
    });
    onFechar();
  };

  /* ------------------------------------------------------------------ */
  /* Ação 3: Definir Folga / Dispensa / Expediente                       */
  /* ------------------------------------------------------------------ */
  const handleDefinirDispensa = async () => {
    const novosMilitares = db.militares.map((m) =>
      m.id === militar.id ? { ...m, dispensaEscala: dispensaMotivo } : m,
    );
    await substituirTudo({ ...db, militares: novosMilitares });
    onFechar();
  };

  const handleRemoverDispensa = async () => {
    const novosMilitares = db.militares.map((m) =>
      m.id === militar.id ? { ...m, dispensaEscala: "NENHUMA" as MotivoDispensaEscala } : m,
    );
    await substituirTudo({ ...db, militares: novosMilitares });
    onFechar();
  };

  /* ------------------------------------------------------------------ */
  /* Ação 4: Lançar Afastamento / Ausência                               */
  /* ------------------------------------------------------------------ */
  const handleSalvarAfastamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const novoAfastamento: Afastamento = {
      id: uid("af_cel"),
      titulo: afastSubtipo.toUpperCase(),
      subtipo: afastSubtipo.trim() || "AFASTAMENTO",
      categoria: afastCategoria,
      militarIds: [militar.id],
      militarSubstitutoId: afastSubstitutoId || undefined,
      divisao: militar.divisao ?? "STA",
      inicio: data,
      fim: afastFim,
      impactaEscala: true,
      status: "CONFIRMADO",
      criadoPor: "Sargenteante-Geral",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lista = [novoAfastamento, ...db.afastamentos];
    await substituirTudo({ ...db, afastamentos: lista });
    onFechar();
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Editar Alocação de Escala do Militar"
      subtitulo="Ajuste de postos, troca de serviço (Anexo O), folga ou registro de ausências na OM"
      maxLargura="xl"
    >
      <div className="space-y-4">
        {/* Card do Militar & Data Selecionada */}
        <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-800 text-gold-400 border border-slate-700">
                #{String(militar.antiguidadeOrdem ?? 0).padStart(2, "0")}
              </span>
              <span className="text-xs font-bold text-slate-300">{militar.posto}</span>
              <span className="text-sm font-extrabold text-white">{militar.nomeGuerra}</span>
              <span className="text-[10px] text-sky-400 font-mono">
                [{militar.setorCodigo ?? militar.divisao}]
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {militar.nomeCompleto} • NIP: {militar.nip}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">{fmt(data)}</div>
              <div className="text-[10px] text-slate-400">{diaSemExtenso}</div>
            </div>
            <div
              className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-white shadow-md flex items-center gap-1"
              style={{ background: bgCorAtual }}
            >
              <span>{siglaAtual}</span>
            </div>
          </div>
        </div>

        {/* Abas de Edição */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-navy-950 border border-slate-800 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva("troca")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              abaAtiva === "troca"
                ? "bg-amber-500/25 text-amber-200 border border-amber-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Papeleta de Troca (Anexo O)</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("posto")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              abaAtiva === "posto"
                ? "bg-sky-500/25 text-sky-200 border border-sky-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Atribuir Posto de Serviço</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("folga")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              abaAtiva === "folga"
                ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Folga / Dispensa (Di)</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("afastamento")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              abaAtiva === "afastamento"
                ? "bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Ausência / Afastamento</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: PAPELETA DE TROCA DE SERVIÇO (ANEXO O - OI 02-06D)          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {abaAtiva === "troca" && (
          <form onSubmit={handleSalvarTroca} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Militar Substituto *
                </label>
                <select
                  value={substitutoId}
                  onChange={(e) => setSubstitutoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                  required
                >
                  {outrosMilitares.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.posto} {m.nomeGuerra} ({m.nomeCompleto}) — {m.setorCodigo ?? m.divisao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Posto de Serviço *
                </label>
                <select
                  value={postoTroca}
                  onChange={(e) => setPostoTroca(e.target.value as EscalaTipo)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                >
                  {POSTOS_DISPONIVEIS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sigla} — {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Nível de Hierarquia da Troca (OI 02-06D)
                </label>
                <select
                  value={nivelTroca}
                  onChange={(e) => setNivelTroca(Number(e.target.value) as NivelHierarquiaTroca)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                >
                  <option value={1}>1º Nível: Intra-divisão (mesmo setor de lotação)</option>
                  <option value={2}>2º Nível: Extra-divisão (outro setor)</option>
                  <option value={3}>3º Nível: Com o Retém escalado para o próprio dia</option>
                  <option value={4}>4º Nível: Avanço do Retém da escala geral</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Justificativa / Motivo
                </label>
                <input
                  type="text"
                  value={motivoTroca}
                  onChange={(e) => setMotivoTroca(e.target.value)}
                  placeholder="Compromisso particular / Troca acordada..."
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 rounded-xl bg-navy-800 text-slate-300 hover:bg-navy-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Papeleta de Troca (Autorização CF-02)</span>
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: ATRIBUIR POSTO DE SERVIÇO DIRETAMENTE                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {abaAtiva === "posto" && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-300">
              Selecione o posto de serviço de estado ou operacional para escalar diretamente este militar nesta data ({fmt(data)}):
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {POSTOS_DISPONIVEIS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAtribuirPostoDireto(p.id)}
                  className="p-3 rounded-xl border border-slate-700 hover:border-sky-400 bg-navy-950/80 hover:bg-navy-800 transition text-left flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white"
                      style={{ background: SOMOR_COR[p.sigla as keyof typeof SOMOR_COR] ?? "#374151" }}
                    >
                      {p.sigla}
                    </span>
                    <Check className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 transition" />
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-200 group-hover:text-white">
                    {p.label}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 rounded-xl bg-navy-800 text-slate-300 hover:bg-navy-700 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA 3: FOLGA / DISPENSA DA ESCALA (OI 02-06D)                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {abaAtiva === "folga" && (
          <div className="space-y-4 pt-1">
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-400" />
                <span>Dispensa da Escala de Serviço (Sigla "Di" — OI 02-06D)</span>
              </h4>
              <p className="text-xs text-slate-400">
                Militares dispensados de concorrer à escala de estado por encargo de comando, restrição médica ou acúmulo de funções:
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Motivo da Dispensa
                </label>
                <select
                  value={dispensaMotivo}
                  onChange={(e) => setDispensaMotivo(e.target.value as MotivoDispensaEscala)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-xs text-white"
                >
                  {Object.entries(MOTIVO_DISPENSA_LABEL)
                    .filter(([k]) => k !== "NENHUMA")
                    .map(([chave, rotulo]) => (
                      <option key={chave} value={chave}>
                        {rotulo}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDefinirDispensa}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
                >
                  Definir como Dispensado ("Di")
                </button>
                {militar.dispensaEscala && militar.dispensaEscala !== "NENHUMA" && (
                  <button
                    type="button"
                    onClick={handleRemoverDispensa}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold"
                  >
                    Remover Dispensa (Reintegrar à Escala)
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 rounded-xl bg-navy-800 text-slate-300 hover:bg-navy-700 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA 4: AFASTAMENTO / AUSÊNCIA (FÉRIAS, MISSÃO, LTS)                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {abaAtiva === "afastamento" && (
          <form onSubmit={handleSalvarAfastamento} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Categoria de Ausência *
                </label>
                <select
                  value={afastCategoria}
                  onChange={(e) => {
                    const cat = e.target.value as AfastamentoCategoria;
                    setAfastCategoria(cat);
                    if (cat === "FERIAS") setAfastSubtipo("FÉRIAS REGULAMENTARES");
                    else if (cat === "LICENCA") setAfastSubtipo("LTS (TRATAMENTO DE SAÚDE)");
                    else if (cat === "MISSAO") setAfastSubtipo("MISSÃO MUTIRUM III");
                    else if (cat === "CURSO") setAfastSubtipo("CFAQ-MFM (INSTRUTOR)");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                >
                  <option value="FERIAS">🌴 Férias</option>
                  <option value="MISSAO">✈️ Missão / Viagem / Operação</option>
                  <option value="LICENCA">🏥 Licença Médica (LTS / LTSPF)</option>
                  <option value="CURSO">📚 Curso Externo / EPM</option>
                  <option value="DISPENSA">⭐ Dispensa como Recompensa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Descrição / Subtipo
                </label>
                <input
                  type="text"
                  value={afastSubtipo}
                  onChange={(e) => setAfastSubtipo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                  required
                >
                </input>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Data de Término
                </label>
                <input
                  type="date"
                  value={afastFim}
                  onChange={(e) => setAfastFim(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Militar Substituto (Paióis / Funções)
                </label>
                <select
                  value={afastSubstitutoId}
                  onChange={(e) => setAfastSubstitutoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Nenhum substituto específico</option>
                  {outrosMilitares.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.posto} {m.nomeGuerra} — {m.setorCodigo ?? m.divisao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 rounded-xl bg-navy-800 text-slate-300 hover:bg-navy-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-fuchsia-950"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Registrar Afastamento</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
