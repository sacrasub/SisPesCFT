"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  COBERTURA_META,
  STATUS_LANCAMENTO_META,
  CATEGORIA_META,
  DIVISAO_MAP,
  RESTRICAO_META,
} from "@/lib/constants";
import type {
  StatusCobertura,
  AfastamentoStatus,
  AfastamentoCategoria,
  DivisaoId,
  RestricaoTipo,
  Posto,
} from "@/lib/types";

export function CoberturaBadge({
  status,
  size = "md",
  showDesc = false,
}: {
  status: StatusCobertura;
  size?: "sm" | "md" | "lg";
  showDesc?: boolean;
}) {
  const meta = COBERTURA_META[status] || COBERTURA_META.OK;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full ring-1 ring-inset",
        meta.bg,
        meta.text,
        meta.ring,
        size === "sm" && "text-[10px] px-2 py-0.5",
        size === "md" && "text-xs px-2.5 py-1",
        size === "lg" && "text-sm px-3.5 py-1.5"
      )}
      title={meta.descricao}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          status === "CRITICO" && "animate-ping opacity-75"
        )}
        style={{ backgroundColor: meta.cor }}
      />
      <span>{meta.label}</span>
      {showDesc && (
        <span className="text-[11px] opacity-75 hidden sm:inline">
          — {meta.descricao}
        </span>
      )}
    </span>
  );
}

export function StatusLancamentoBadge({ status }: { status: AfastamentoStatus }) {
  const meta = STATUS_LANCAMENTO_META[status] || STATUS_LANCAMENTO_META.PREVISTO;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.cls
      )}
    >
      {meta.label}
    </span>
  );
}

export function CategoriaBadge({ categoria }: { categoria: AfastamentoCategoria }) {
  const meta = CATEGORIA_META[categoria] || CATEGORIA_META.OUTRO;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-200 bg-navy-800/80 border border-slate-700/60"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: meta.cor }}
      />
      {meta.label}
    </span>
  );
}

export function DivisaoBadge({ divisao }: { divisao: DivisaoId }) {
  const info = DIVISAO_MAP[divisao];
  if (!info) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-100 bg-navy-900 border"
      style={{ borderColor: `${info.cor}40` }}
      title={info.nome}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: info.cor }}
      />
      {info.sigla}
    </span>
  );
}

export function RestricaoBadge({ tipo, descricao }: { tipo: RestricaoTipo; descricao?: string }) {
  const meta = RESTRICAO_META[tipo] || { label: tipo, descricao: "" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-rose-300 bg-rose-950/40 border border-rose-800/40"
      title={descricao || meta.descricao}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
      {meta.label}
    </span>
  );
}

export function PostoChip({ posto }: { posto: Posto }) {
  return (
    <span className="inline-flex items-center font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-navy-800 text-gold-300 border border-gold-500/20">
      {posto}
    </span>
  );
}
