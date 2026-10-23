"use client";

import React from "react";
import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigoso?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  perigoso = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    <Modal aberto={aberto} onFechar={onCancelar} maxLargura="sm">
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            perigoso ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-100">{titulo}</h4>
          <p className="text-sm text-slate-300 mt-1">{mensagem}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition ${
            perigoso
              ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40"
              : "bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-gold-900/40"
          }`}
        >
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
