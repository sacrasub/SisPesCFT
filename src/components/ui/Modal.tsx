"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  maxLargura?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function Modal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  maxLargura = "lg",
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    if (aberto) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const widthClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-5xl xl:max-w-6xl",
    full: "max-w-6xl 2xl:max-w-7xl",
  }[maxLargura];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onFechar}
      />

      {/* Sheet Content */}
      <div
        className={cn(
          "relative z-10 w-full rounded-t-3xl sm:rounded-2xl border border-slate-700/60 bg-navy-900/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col animate-sheet-up",
          widthClass
        )}
      >
        {/* Header */}
        {(titulo || subtitulo) && (
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div>
              {titulo && (
                <h3 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                  {titulo}
                </h3>
              )}
              {subtitulo && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>
              )}
            </div>
            <button
              onClick={onFechar}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1">{children}</div>
      </div>
    </div>
  );
}
