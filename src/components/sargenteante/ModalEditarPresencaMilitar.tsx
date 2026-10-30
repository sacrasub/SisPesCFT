"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { PostoChip } from "@/components/ui/Badge";
import {
  Clock,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type {
  Militar,
  ApontamentoPresencaMilitar,
  TipoPresencaStatus,
  Usuario,
} from "@/lib/types";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  militar: Militar | null;
  dataRef: string;
  apontamentoAtual?: ApontamentoPresencaMilitar;
  usuario: Usuario | null;
  onSalvarApontamento: (
    militarId: string,
    apontamento: ApontamentoPresencaMilitar | null
  ) => Promise<void>;
  isSargenteante: boolean;
}

export function ModalEditarPresencaMilitar({
  aberto,
  onFechar,
  militar,
  dataRef,
  apontamentoAtual,
  usuario,
  onSalvarApontamento,
  isSargenteante,
}: Props) {
  const [status, setStatus] = useState<TipoPresencaStatus>("PRESENTE");
  const [t1, setT1] = useState("07:30");
  const [t2, setT2] = useState("11:30");
  const [t3, setT3] = useState("13:15");
  const [t4, setT4] = useState("16:30");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (militar && aberto) {
      if (apontamentoAtual) {
        setStatus(apontamentoAtual.status);
        setT1(apontamentoAtual.tempo1 || "07:30");
        setT2(apontamentoAtual.tempo2 || "11:30");
        setT3(apontamentoAtual.tempo3 || "13:15");
        setT4(apontamentoAtual.tempo4 || "16:30");
        setObservacao(apontamentoAtual.observacao || "");
      } else {
        setStatus("PRESENTE");
        setT1("07:30");
        setT2("11:30");
        setT3("13:15");
        setT4("16:30");
        setObservacao("");
      }
    }
  }, [militar, apontamentoAtual, aberto]);

  if (!militar) return null;

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const responsavel = usuario?.nomeGuerra
        ? `${usuario.posto || ""} ${usuario.nomeGuerra} (${isSargenteante ? "Sargenteante-Geral" : "Contramestre"})`
        : isSargenteante
          ? "SO SACRAMENTO (Sargenteante-Geral)"
          : "3SG ROBSON (Contramestre)";

      const novoApontamento: ApontamentoPresencaMilitar = {
        militarId: militar.id,
        status,
        tempo1: t1,
        tempo2: t2,
        tempo3: t3,
        tempo4: t4,
        observacao,
        modificadoPor: responsavel,
        modificadoEm: new Date().toISOString(),
      };

      await onSalvarApontamento(militar.id, novoApontamento);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  const handleRestaurarPadrao = async () => {
    setSalvando(true);
    try {
      // Passar null remove o apontamento manual e restaura o cálculo automático da OI 02-06D
      await onSalvarApontamento(militar.id, null);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={`Editar Presença — ${militar.posto} ${militar.nomeGuerra}`}
      subtitulo={`Retificação de apontamento na Folha Diária de ${dataRef}`}
      maxLargura="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Identificação do Militar */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-950 border border-slate-800">
          <PostoChip posto={militar.posto} />
          <div>
            <div className="font-bold text-slate-100 text-sm">
              {militar.nomeCompleto}
            </div>
            <div className="text-slate-400 text-[11px] font-mono">
              NIP: {militar.nip} • Setor: {militar.setorCodigo || militar.divisao}
            </div>
          </div>
        </div>

        {/* Seletor de Situação */}
        <div>
          <label className="block text-slate-300 font-bold mb-1">
            Status da Presença no Dia *
          </label>
          <select
            value={status}
            onChange={(e) => {
              const novo = e.target.value as TipoPresencaStatus;
              setStatus(novo);
              if (novo === "FALTA") {
                setT1("FALTA");
                setT2("FALTA");
                setT3("FALTA");
                setT4("FALTA");
              } else if (novo === "DISPENSA") {
                setT1("DISP");
                setT2("DISP");
                setT3("DISP");
                setT4("DISP");
              } else if (novo === "FAINA_EXTERNA") {
                setT1("FAINA");
                setT2("FAINA");
                setT3("FAINA");
                setT4("FAINA");
              } else if (novo === "ATRASO") {
                setT1("08:00");
                setT2("11:30");
                setT3("13:15");
                setT4("16:30");
              } else {
                setT1("07:30");
                setT2("11:30");
                setT3("13:15");
                setT4("16:30");
              }
            }}
            className="input font-bold text-xs"
          >
            <option value="PRESENTE">🟢 Expediente Normal (Presente)</option>
            <option value="ATRASO">🟡 Atraso na Entrada</option>
            <option value="FALTA">🔴 Falta não Justificada</option>
            <option value="DISPENSA">🔵 Dispensado pelo Comando/Imediato</option>
            <option value="FAINA_EXTERNA">🟣 Faina Externa / Lancha</option>
          </select>
        </div>

        {/* Horários dos 4 Tempos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              1º Tempo (Entrada)
            </label>
            <input
              type="text"
              value={t1}
              onChange={(e) => setT1(e.target.value)}
              className="input font-mono text-center font-bold text-xs"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              2º Tempo (Almoço)
            </label>
            <input
              type="text"
              value={t2}
              onChange={(e) => setT2(e.target.value)}
              className="input font-mono text-center font-bold text-xs"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              3º Tempo (Regresso)
            </label>
            <input
              type="text"
              value={t3}
              onChange={(e) => setT3(e.target.value)}
              className="input font-mono text-center font-bold text-xs"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              4º Tempo (Saída)
            </label>
            <input
              type="text"
              value={t4}
              onChange={(e) => setT4(e.target.value)}
              className="input font-mono text-center font-bold text-xs"
            />
          </div>
        </div>

        {/* Campo de Observação / Justificativa */}
        <div>
          <label className="block text-slate-300 font-bold mb-1">
            Observação / Justificativa
          </label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Atraso autorizado pelo Encarregado da Divisão..."
            className="input text-xs"
          />
        </div>

        {apontamentoAtual?.modificadoPor && (
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
            Última alteração:{" "}
            <span className="font-bold text-slate-300">
              {apontamentoAtual.modificadoPor}
            </span>{" "}
            em{" "}
            {apontamentoAtual.modificadoEm
              ? new Date(apontamentoAtual.modificadoEm).toLocaleString("pt-BR")
              : "data recente"}
          </div>
        )}

        {/* Ações */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {apontamentoAtual ? (
            <button
              type="button"
              onClick={handleRestaurarPadrao}
              disabled={salvando}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition"
              title="Descarta o apontamento manual e restaura o cálculo automático da OI 02-06D"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Automático</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{salvando ? "Salvando..." : "Salvar Apontamento"}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
