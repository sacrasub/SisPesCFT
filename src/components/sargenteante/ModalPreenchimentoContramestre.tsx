"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { PostoChip } from "@/components/ui/Badge";
import { DIVISOES } from "@/lib/constants";
import { fmt } from "@/lib/dates";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Anchor,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Save,
} from "lucide-react";
import type {
  Militar,
  DivisaoId,
  FolhaPresencaDiaRegistro,
  ApontamentoPresencaMilitar,
  TipoPresencaStatus,
  Usuario,
} from "@/lib/types";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  dataRef: string;
  militares: Militar[];
  folhaSalva?: FolhaPresencaDiaRegistro;
  usuario: Usuario | null;
  onSalvarFolha: (folha: FolhaPresencaDiaRegistro) => Promise<void>;
  isSargenteante: boolean;
}

export function ModalPreenchimentoContramestre({
  aberto,
  onFechar,
  dataRef,
  militares,
  folhaSalva,
  usuario,
  onSalvarFolha,
  isSargenteante,
}: Props) {
  // Preenchedor padrão: 3SG Robson se for Contramestre, ou usuário logado
  const preenchedorPadrao = useMemo(() => {
    if (usuario?.nomeGuerra) {
      return `${usuario.posto || ""} ${usuario.nomeGuerra} (${isSargenteante ? "Sargenteante-Geral" : "Contramestre de Serviço"})`.trim();
    }
    return "3SG ROBSON (Contramestre de Serviço)";
  }, [usuario, isSargenteante]);

  const [nomePreenchedor, setNomePreenchedor] = useState(
    folhaSalva?.preenchidoPorNome || preenchedorPadrao
  );
  const [filtroDiv, setFiltroDiv] = useState<DivisaoId | "TODAS">("TODAS");
  const [busca, setBusca] = useState("");

  // Estado local dos apontamentos por militarId
  const [apontamentos, setApontamentos] = useState<
    Record<string, ApontamentoPresencaMilitar>
  >(() => {
    const inicial: Record<string, ApontamentoPresencaMilitar> = {};
    if (folhaSalva?.apontamentos) {
      Object.assign(inicial, folhaSalva.apontamentos);
    }
    return inicial;
  });

  const [salvando, setSalvando] = useState(false);

  // Atualiza quando abrir ou mudar folha
  React.useEffect(() => {
    if (aberto) {
      setNomePreenchedor(folhaSalva?.preenchidoPorNome || preenchedorPadrao);
      const inicial: Record<string, ApontamentoPresencaMilitar> = {};
      if (folhaSalva?.apontamentos) {
        Object.assign(inicial, folhaSalva.apontamentos);
      }
      setApontamentos(inicial);
    }
  }, [aberto, folhaSalva, preenchedorPadrao]);

  // Alterar status de um militar
  const setStatusMilitar = (
    militarId: string,
    status: TipoPresencaStatus,
    obs?: string,
    t1?: string
  ) => {
    setApontamentos((prev) => {
      const atual = prev[militarId] || {
        militarId,
        status: "PRESENTE",
      };
      return {
        ...prev,
        [militarId]: {
          ...atual,
          status,
          observacao: obs !== undefined ? obs : atual.observacao || "",
          tempo1: t1 !== undefined ? t1 : (status === "ATRASO" ? "08:00" : status === "FALTA" ? "FALTA" : "07:30"),
          modificadoPor: nomePreenchedor,
          modificadoEm: new Date().toISOString(),
        },
      };
    });
  };

  // Alterar observação
  const setObsMilitar = (militarId: string, observacao: string) => {
    setApontamentos((prev) => {
      const atual = prev[militarId] || { militarId, status: "PRESENTE" };
      return {
        ...prev,
        [militarId]: { ...atual, observacao },
      };
    });
  };

  // Alterar horário de chegada (para atrasos)
  const setHorarioChegada = (militarId: string, tempo1: string) => {
    setApontamentos((prev) => {
      const atual = prev[militarId] || { militarId, status: "ATRASO" };
      return {
        ...prev,
        [militarId]: { ...atual, tempo1 },
      };
    });
  };

  // Ação Rápida: Marcar Todos como Presentes (exceto quem já está marcado com falta/atraso/dispensa)
  const marcarTodosPresentes = () => {
    const novos: Record<string, ApontamentoPresencaMilitar> = { ...apontamentos };
    for (const m of militares) {
      if (m.ativo === false || m.situacao === "DESEMBARCADO") continue;
      // Se já não estiver com falta ou atraso
      const statusAtual = novos[m.id]?.status;
      if (!statusAtual || statusAtual === "PRESENTE") {
        novos[m.id] = {
          militarId: m.id,
          status: "PRESENTE",
          tempo1: "07:30",
          tempo2: "11:30",
          tempo3: "13:15",
          tempo4: "16:30",
          observacao: "Presente na Parada Matinal",
          modificadoPor: nomePreenchedor,
          modificadoEm: new Date().toISOString(),
        };
      }
    }
    setApontamentos(novos);
  };

  // Salvar a folha
  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const registro: FolhaPresencaDiaRegistro = {
        data: dataRef,
        statusFolha: isSargenteante
          ? "HOMOLOGADA_SARGENTEANTE"
          : "PREENCHIDA_CONTRAMESTRE",
        preenchidoPorNome: nomePreenchedor,
        preenchidoPorNip: usuario?.nip || "15.0178.93",
        preenchidoEm: folhaSalva?.preenchidoEm || new Date().toISOString(),
        homologadoPorNome: isSargenteante
          ? (usuario?.nomeGuerra ? `${usuario.posto || ""} ${usuario.nomeGuerra}` : "SO SACRAMENTO (Sargenteante-Geral)")
          : folhaSalva?.homologadoPorNome,
        homologadoPorNip: isSargenteante ? (usuario?.nip || "97.1057.91") : folhaSalva?.homologadoPorNip,
        homologadoEm: isSargenteante ? new Date().toISOString() : folhaSalva?.homologadoEm,
        apontamentos,
      };

      await onSalvarFolha(registro);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  // Filtragem da lista para o Contramestre
  const militaresFiltrados = useMemo(() => {
    return militares
      .filter((m) => m.ativo !== false && m.situacao !== "DESEMBARCADO")
      .filter((m) => {
        if (filtroDiv !== "TODAS" && m.divisao !== filtroDiv) return false;
        if (busca.trim()) {
          const q = busca.toLowerCase().trim();
          const nome = (m.nomeGuerra || "").toLowerCase();
          const nip = (m.nip || "").toLowerCase();
          const setor = (m.setorCodigo || "").toLowerCase();
          if (!nome.includes(q) && !nip.includes(q) && !setor.includes(q)) {
            return false;
          }
        }
        return true;
      });
  }, [militares, filtroDiv, busca]);

  // Contadores rápidos no modal
  const contadores = useMemo(() => {
    let presentes = 0;
    let faltas = 0;
    let atrasos = 0;
    let dispensas = 0;
    let fainas = 0;

    for (const m of militares) {
      const ap = apontamentos[m.id];
      const st = ap?.status;
      if (st === "PRESENTE") presentes++;
      else if (st === "FALTA") faltas++;
      else if (st === "ATRASO") atrasos++;
      else if (st === "DISPENSA") dispensas++;
      else if (st === "FAINA_EXTERNA") fainas++;
    }
    return { presentes, faltas, atrasos, dispensas, fainas };
  }, [militares, apontamentos]);

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={`⚓ Preenchimento de Presença Diária — ${fmt(dataRef)}`}
      subtitulo="Conferência matinal do Contramestre e registro da tripulação de bordo"
      maxLargura="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Cabeçalho de Identificação do Preenchedor */}
        <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Militar Responsável pelo Preenchimento *
            </label>
            <input
              type="text"
              value={nomePreenchedor}
              onChange={(e) => setNomePreenchedor(e.target.value)}
              className="input text-xs py-1.5 font-bold text-sky-300"
              placeholder="Ex: 3SG ROBSON (Contramestre de Serviço)"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={marcarTodosPresentes}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 transition"
              title="Marca todo o efetivo pronto como presente no expediente normal"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ Todos Presentes (1-Clique)</span>
            </button>
          </div>
        </div>

        {/* Barra de Resumo Rápido */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <div className="text-base font-black">{contadores.presentes}</div>
            <div className="text-[10px] font-bold uppercase">Presentes</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <div className="text-base font-black">{contadores.faltas}</div>
            <div className="text-[10px] font-bold uppercase">Faltas</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <div className="text-base font-black">{contadores.atrasos}</div>
            <div className="text-[10px] font-bold uppercase">Atrasos</div>
          </div>
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300">
            <div className="text-base font-black">{contadores.dispensas}</div>
            <div className="text-[10px] font-bold uppercase">Dispensas</div>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <div className="text-base font-black">{contadores.fainas}</div>
            <div className="text-[10px] font-bold uppercase">Faina Ext.</div>
          </div>
        </div>

        {/* Filtros de Chamada Rápida */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Buscar por militar, NIP ou setor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input text-xs py-1.5 flex-1"
          />
          <select
            value={filtroDiv}
            onChange={(e) => setFiltroDiv(e.target.value as any)}
            className="input text-xs py-1.5 sm:w-56"
          >
            <option value="TODAS">Todas as Divisões</option>
            {DIVISOES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.sigla} — {d.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Chamada Matinal dos Militares */}
        <div className="max-h-96 overflow-y-auto space-y-2 pr-1 border border-slate-800 rounded-xl p-2 bg-navy-950/60 divide-y divide-slate-800/60">
          {militaresFiltrados.map((m) => {
            const ap = apontamentos[m.id];
            const statusAtual = ap?.status || "PRESENTE";
            const obsAtual = ap?.observacao || "";
            const t1Atual = ap?.tempo1 || "07:30";

            return (
              <div
                key={m.id}
                className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                {/* Militar / Posto / Setor */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <PostoChip posto={m.posto} />
                  <div>
                    <span className="font-bold text-slate-100 text-xs">
                      {m.nomeGuerra}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                      {m.nip}
                    </span>
                    <div className="text-[10px] text-sky-400 font-semibold">
                      {m.setorCodigo || m.divisao}
                    </div>
                  </div>
                </div>

                {/* Botões de Seleção de Status da Presença */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusMilitar(m.id, "PRESENTE", "Presente")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      statusAtual === "PRESENTE"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-navy-900/80 text-slate-400 border-slate-800 hover:text-emerald-300"
                    }`}
                  >
                    ✓ Presente
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusMilitar(m.id, "FALTA", "Não compareceu na parada")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      statusAtual === "FALTA"
                        ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                        : "bg-navy-900/80 text-slate-400 border-slate-800 hover:text-rose-300"
                    }`}
                  >
                    ✕ Falta
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusMilitar(m.id, "ATRASO", "Atraso na entrada", "08:00")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      statusAtual === "ATRASO"
                        ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                        : "bg-navy-900/80 text-slate-400 border-slate-800 hover:text-amber-300"
                    }`}
                  >
                    ⏱ Atraso
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusMilitar(m.id, "DISPENSA", "Dispensado pelo Imediato")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      statusAtual === "DISPENSA"
                        ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                        : "bg-navy-900/80 text-slate-400 border-slate-800 hover:text-sky-300"
                    }`}
                  >
                    Dispensa
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusMilitar(m.id, "FAINA_EXTERNA", "Faina externa")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      statusAtual === "FAINA_EXTERNA"
                        ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                        : "bg-navy-900/80 text-slate-400 border-slate-800 hover:text-purple-300"
                    }`}
                  >
                    Faina
                  </button>
                </div>

                {/* Campos adicionais para Atraso ou Justificativa */}
                <div className="flex items-center gap-1.5 sm:w-56">
                  {statusAtual === "ATRASO" && (
                    <input
                      type="time"
                      value={t1Atual}
                      onChange={(e) => setHorarioChegada(m.id, e.target.value)}
                      className="input py-1 px-2 text-xs font-mono w-24 text-center text-amber-300 font-bold"
                      title="Horário de chegada do militar"
                    />
                  )}
                  <input
                    type="text"
                    value={obsAtual}
                    onChange={(e) => setObsMilitar(m.id, e.target.value)}
                    placeholder="Obs / Justificativa..."
                    className="input py-1 px-2 text-xs flex-1 text-slate-300"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com ações de gravação */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {salvando
                ? "Gravando presença..."
                : isSargenteante
                  ? "Salvar & Homologar (Sargenteante-Geral)"
                  : "Salvar & Assinar Folha (Contramestre)"}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
