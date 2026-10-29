"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useDb } from "@/store/DataProvider";
import {
  ESCALA_LABEL,
  MOTIVO_DISPENSA_LABEL,
  SETORES_CFT,
} from "@/lib/constants";
import {
  fmt,
  fmtDiaMes,
  addDays,
  diaSemana,
  DIAS_SEMANA_NOMES,
  isFimDeSemana,
  MESES,
} from "@/lib/dates";
import { nomeMilitar } from "@/lib/utils";
import {
  gerarDetalheDiarioOI0206D,
  gerarFolhaPresencaDia,
  gerarGradeSOMOR,
  SOMOR_COR,
} from "@/lib/engine/escalas";
import type {
  ISODate,
  PapeletaTrocaServico,
  Militar,
  EscalaTipo,
} from "@/lib/types";
import {
  Printer,
  FileText,
  Shield,
  CalendarDays,
  HeartPulse,
  ClipboardCheck,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  CheckCircle,
  Users,
} from "lucide-react";

export type TipoDocumentoImpressao =
  | "TROCA_SERVICO"
  | "DETALHE_SERVICO"
  | "GUIA_FERIAS"
  | "COMUNICACAO_LICENCA"
  | "FOLHA_PRESENCA"
  | "RELATORIOS_DIVERSOS";

export type SubtipoRelatorio =
  | "QUADRO_TRIPULACAO"
  | "MAPA_SOMOR"
  | "EXTRATO_PONTOS";

interface CentralImpressaoProps {
  dataInicial?: ISODate;
  onVoltarParaGrade?: () => void;
}

export function CentralImpressao({
  dataInicial,
  onVoltarParaGrade,
}: CentralImpressaoProps) {
  const { db, ctx, hoje } = useDb();

  const [documentoAtivo, setDocumentoAtivo] =
    useState<TipoDocumentoImpressao>("TROCA_SERVICO");
  const [dataDoc, setDataDoc] = useState<ISODate>(dataInicial ?? hoje);
  const [militarId, setMilitarId] = useState<string>(
    db.militares[0]?.id ?? "m01",
  );
  const [subtipoRelatorio, setSubtipoRelatorio] =
    useState<SubtipoRelatorio>("QUADRO_TRIPULACAO");

  // Papeletas de troca
  const trocas = db.trocasServico ?? [];
  const [trocaId, setTrocaId] = useState<string>(trocas[0]?.id ?? "");

  const trocaSelecionada = useMemo(() => {
    return trocas.find((t) => t.id === trocaId) || trocas[0];
  }, [trocas, trocaId]);

  const militarSelecionado = useMemo(() => {
    return ctx.militarMap.get(militarId) || ctx.militares[0];
  }, [ctx, militarId]);

  // Afastamento do militar selecionado (se houver)
  const afastamentoMilitar = useMemo(() => {
    const lista = ctx.porMilitar.get(militarId) ?? [];
    return lista.find((a) => a.status !== "CANCELADO") || lista[0];
  }, [ctx, militarId]);

  // Detalhe Diário da data
  const detalheDiario = useMemo(() => {
    return gerarDetalheDiarioOI0206D(ctx, dataDoc);
  }, [ctx, dataDoc]);

  // Folha de 4 Tempos da data
  const folhaPresenca = useMemo(() => {
    return gerarFolhaPresencaDia(ctx, dataDoc);
  }, [ctx, dataDoc]);

  // Grade SOMOR para o Mapa SOMOR (mês da dataDoc)
  const anoDoc = Number(dataDoc.slice(0, 4));
  const mes0Doc = Number(dataDoc.slice(5, 7)) - 1;
  const gradeSOMORMensal = useMemo(() => {
    return gerarGradeSOMOR(ctx, "TODAS", anoDoc, mes0Doc, false);
  }, [ctx, anoDoc, mes0Doc]);

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Barra de Controle Superior (Não aparece na impressão) */}
      <div className="print:hidden space-y-4">
        {/* Header e Botão de Impressão */}
        <div className="p-5 rounded-2xl glass border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-sky-500/20 text-sky-300">
                <Printer className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">
                Central de Impressão de Documentos Oficiais
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Papeletas de Troca de Serviço (Anexo O), Detalhe Diário (OI 02-06D), Guia de Férias, Licenças Médicas, Folha de Presença (4 Tempos) e Relatórios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onVoltarParaGrade && (
              <button
                type="button"
                onClick={onVoltarParaGrade}
                className="px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-bold transition"
              >
                Voltar à Grade
              </button>
            )}
            <button
              type="button"
              onClick={handleImprimir}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-sky-950 transition transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Documento Oficial (A4)</span>
            </button>
          </div>
        </div>

        {/* Abas Seletoras de Documentos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            {
              id: "TROCA_SERVICO" as TipoDocumentoImpressao,
              label: "Papeleta de Troca",
              sub: "Anexo O (OI 02-06D)",
              icon: ArrowRightLeft,
            },
            {
              id: "DETALHE_SERVICO" as TipoDocumentoImpressao,
              label: "Detalhe de Serviço",
              sub: "CAV + Reação + Postos",
              icon: Shield,
            },
            {
              id: "GUIA_FERIAS" as TipoDocumentoImpressao,
              label: "Guia de Férias",
              sub: "Papeleta Regulamentar",
              icon: CalendarDays,
            },
            {
              id: "COMUNICACAO_LICENCA" as TipoDocumentoImpressao,
              label: "Licença Médica",
              sub: "LTS / LTSPF (JRS)",
              icon: HeartPulse,
            },
            {
              id: "FOLHA_PRESENCA" as TipoDocumentoImpressao,
              label: "Folha de Presença",
              sub: "4 Tempos Diários",
              icon: ClipboardCheck,
            },
            {
              id: "RELATORIOS_DIVERSOS" as TipoDocumentoImpressao,
              label: "Relatórios Diversos",
              sub: "Tripulação / SOMOR / Pontos",
              icon: FileSpreadsheet,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const ativa = documentoAtivo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDocumentoAtivo(tab.id)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  ativa
                    ? "bg-sky-500/20 border-sky-400/60 text-sky-200 shadow-md shadow-sky-950/40"
                    : "bg-navy-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-navy-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${ativa ? "text-sky-300" : "text-slate-500"}`} />
                  {ativa && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold leading-tight">{tab.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Barra de Parâmetros Contextuais */}
        <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Seletor de Data */}
          {(documentoAtivo === "DETALHE_SERVICO" ||
            documentoAtivo === "FOLHA_PRESENCA" ||
            (documentoAtivo === "RELATORIOS_DIVERSOS" && subtipoRelatorio === "MAPA_SOMOR")) && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Data de Referência:</span>
              <button
                type="button"
                onClick={() => setDataDoc(addDays(dataDoc, -1))}
                className="p-1 rounded bg-navy-900 text-slate-300 hover:bg-navy-800 border border-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={dataDoc}
                onChange={(e) => setDataDoc(e.target.value)}
                className="px-2.5 py-1 rounded bg-navy-900 border border-slate-700 text-white font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setDataDoc(addDays(dataDoc, 1))}
                className="p-1 rounded bg-navy-900 text-slate-300 hover:bg-navy-800 border border-slate-700"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDataDoc(hoje)}
                className="px-2 py-1 rounded bg-navy-800 text-gold-400 font-bold hover:bg-navy-700"
              >
                Hoje
              </button>
            </div>
          )}

          {/* Seletor de Papeleta de Troca */}
          {documentoAtivo === "TROCA_SERVICO" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-bold">Papeleta Registrada:</span>
              <select
                value={trocaId}
                onChange={(e) => setTrocaId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-navy-900 border border-slate-700 text-xs text-white max-w-xs"
              >
                {trocas.length === 0 ? (
                  <option value="">Nenhuma papeleta registrada</option>
                ) : (
                  trocas.map((t) => {
                    const sol = ctx.militarMap.get(t.militarSolicitanteId);
                    const sub = ctx.militarMap.get(t.militarSubstitutoId);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.numeroSequencial} — {ESCALA_LABEL[t.posto]} ({fmt(t.dataServicoOriginal)}): {sol?.nomeGuerra} ➔ {sub?.nomeGuerra}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          )}

          {/* Seletor de Militar (Férias e Licença) */}
          {(documentoAtivo === "GUIA_FERIAS" || documentoAtivo === "COMUNICACAO_LICENCA") && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-bold">Militar:</span>
              <select
                value={militarId}
                onChange={(e) => setMilitarId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-navy-900 border border-slate-700 text-xs text-white max-w-sm"
              >
                {ctx.militares.map((m) => (
                  <option key={m.id} value={m.id}>
                    #{String(m.antiguidadeOrdem ?? 0).padStart(2, "0")} {m.posto} {m.nomeGuerra} ({m.nomeCompleto}) — {m.setorCodigo ?? m.divisao}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de Subtipo de Relatório */}
          {documentoAtivo === "RELATORIOS_DIVERSOS" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Tipo de Relatório:</span>
              <select
                value={subtipoRelatorio}
                onChange={(e) => setSubtipoRelatorio(e.target.value as SubtipoRelatorio)}
                className="px-3 py-1.5 rounded-xl bg-navy-900 border border-slate-700 text-xs text-white"
              >
                <option value="QUADRO_TRIPULACAO">Quadro Geral da Tripulação (CF-01 a CF-42)</option>
                <option value="MAPA_SOMOR">Mapa Mensal SOMOR (Grade A4)</option>
                <option value="EXTRATO_PONTOS">Extrato de Pontuação Acumulada OI 02-06D</option>
              </select>
            </div>
          )}

          <div className="text-[11px] text-slate-400 font-mono">
            Formato: <span className="text-sky-300 font-bold">Folha A4 Oficial</span> • Marinha do Brasil
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CANVAS DE IMPRESSÃO (ESTILO FOLHA DE PAPEL OFICIAL A4)              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl max-w-4xl mx-auto border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full font-serif text-[12px] leading-relaxed select-text">
        {/* Cabeçalho Institucional Padrão da Marinha do Brasil */}
        <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative w-12 h-12">
              <Image
                src="/cft-logo-brasao.png"
                alt="Brasão Marinha do Brasil"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
          </div>
          <div className="text-[14px] font-bold tracking-widest uppercase">
            MARINHA DO BRASIL
          </div>
          <div className="text-[12px] font-semibold tracking-wider uppercase text-slate-800">
            COMANDO DO 9º DISTRITO NAVAL
          </div>
          <div className="text-[13px] font-extrabold tracking-wider uppercase text-slate-900">
            CAPITANIA FLUVIAL DE TABATINGA
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO 1: PAPELETA DE TROCA DE SERVIÇO (ANEXO O - OI 02-06D)    */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {documentoAtivo === "TROCA_SERVICO" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                PAPELETA DE TROCA DE SERVIÇO (OI 02-06D — ANEXO O)
              </h2>
              <div className="flex justify-between items-center text-[11px] font-mono mt-2 text-slate-700">
                <span>REGISTRO: <strong>{trocaSelecionada?.numeroSequencial ?? "001/2026"}</strong></span>
                <span>DATA DO PEDIDO: <strong>{fmt(trocaSelecionada?.dataSolicitacao ?? hoje)}</strong></span>
              </div>
            </div>

            {/* Informações das Partes */}
            <div className="border border-slate-900 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-600">1. MILITAR SOLICITANTE:</div>
                  {(() => {
                    const sol = ctx.militarMap.get(trocaSelecionada?.militarSolicitanteId ?? "");
                    return (
                      <div className="mt-1">
                        <div className="font-bold text-[13px]">{sol?.posto} {sol?.nomeGuerra}</div>
                        <div className="text-[11px] text-slate-700">{sol?.nomeCompleto}</div>
                        <div className="text-[10px] font-mono mt-0.5">NIP: {sol?.nip} | Setor: {sol?.setorCodigo ?? sol?.divisao}</div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-600">2. MILITAR SUBSTITUTO:</div>
                  {(() => {
                    const sub = ctx.militarMap.get(trocaSelecionada?.militarSubstitutoId ?? "");
                    return (
                      <div className="mt-1">
                        <div className="font-bold text-[13px]">{sub?.posto} {sub?.nomeGuerra}</div>
                        <div className="text-[11px] text-slate-700">{sub?.nomeCompleto}</div>
                        <div className="text-[10px] font-mono mt-0.5">NIP: {sub?.nip} | Setor: {sub?.setorCodigo ?? sub?.divisao}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Detalhes do Serviço */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600">3. POSTO DE SERVIÇO:</span>
                  <div className="font-extrabold text-[13px] mt-0.5">
                    {ESCALA_LABEL[trocaSelecionada?.posto ?? "CONTRAMESTRE"]}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600">4. DATA DO SERVIÇO ORIGINAL:</span>
                  <div className="font-extrabold text-[13px] mt-0.5">
                    {fmt(trocaSelecionada?.dataServicoOriginal ?? dataDoc)} ({DIAS_SEMANA_NOMES[diaSemana(trocaSelecionada?.dataServicoOriginal ?? dataDoc)]})
                  </div>
                </div>
              </div>

              {/* Nível da Troca e Antecedência */}
              <div className="space-y-2 border-b border-slate-300 pb-3 text-[11px]">
                <div className="font-bold uppercase text-slate-600 text-[10px]">
                  5. NÍVEL DE HIERARQUIA DA TROCA (OI 02-06D):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-1.5 border ${trocaSelecionada?.nivelHierarquia === 1 ? "border-slate-900 bg-slate-100 font-bold" : "border-slate-300 text-slate-600"}`}>
                    [ {trocaSelecionada?.nivelHierarquia === 1 ? "X" : " "} ] 1º Nível: Intra-divisão (mesmo setor)
                  </div>
                  <div className={`p-1.5 border ${trocaSelecionada?.nivelHierarquia === 2 ? "border-slate-900 bg-slate-100 font-bold" : "border-slate-300 text-slate-600"}`}>
                    [ {trocaSelecionada?.nivelHierarquia === 2 ? "X" : " "} ] 2º Nível: Extra-divisão (outro setor)
                  </div>
                  <div className={`p-1.5 border ${trocaSelecionada?.nivelHierarquia === 3 ? "border-slate-900 bg-slate-100 font-bold" : "border-slate-300 text-slate-600"}`}>
                    [ {trocaSelecionada?.nivelHierarquia === 3 ? "X" : " "} ] 3º Nível: Com o Retém do dia
                  </div>
                  <div className={`p-1.5 border ${trocaSelecionada?.nivelHierarquia === 4 ? "border-slate-900 bg-slate-100 font-bold" : "border-slate-300 text-slate-600"}`}>
                    [ {trocaSelecionada?.nivelHierarquia === 4 ? "X" : " "} ] 4º Nível: Avanço do Retém da escala
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-slate-700">
                  Antecedência: [ <strong>X</strong> ] Cumpre o prazo regulamentar de 48 horas de antecedência (Art. 12 da OI 02-06D).
                </div>
              </div>

              {/* Motivo / Justificativa */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-600">6. MOTIVO / JUSTIFICATIVA:</div>
                <div className="p-2 border border-slate-300 bg-slate-50 italic text-[11px] min-h-[48px]">
                  {trocaSelecionada?.motivoJustificativa || "Troca combinada por conveniência particular e comum acordo entre as partes, com total cobertura das obrigações da OM."}
                </div>
              </div>
            </div>

            {/* Bloco de Assinaturas Oficiais */}
            <div className="border border-slate-900 p-4 space-y-6">
              <div className="grid grid-cols-2 gap-8 text-center pt-2">
                <div>
                  <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                  <div className="font-bold text-[11px]">Militar Solicitante</div>
                  <div className="text-[10px] text-slate-600">Assinatura</div>
                </div>
                <div>
                  <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                  <div className="font-bold text-[11px]">Militar Substituto</div>
                  <div className="text-[10px] text-slate-600">Assinatura de Concordância</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-300">
                <div>
                  <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                  <div className="font-bold text-[11px]">Encarregado da Divisão / Setor</div>
                  <div className="text-[10px] text-slate-600">Parecer: [ X ] Favorável  [ ] Desfavorável</div>
                </div>
                <div>
                  <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                  <div className="font-bold text-[11px]">Ajudante da CFT (CF-02)</div>
                  <div className="text-[10px] text-slate-600">Despacho: [ X ] AUTORIZADO  [ ] INDEFERIDO</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO 2: DETALHE DIÁRIO DE SERVIÇO (OI 02-06D)                 */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {documentoAtivo === "DETALHE_SERVICO" && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                DETALHE DIÁRIO DE SERVIÇO DE ESTADO E GRUPOS OPERACIONAIS
              </h2>
              <div className="flex justify-between items-center text-[11px] font-mono mt-2 text-slate-700">
                <span>DATA: <strong>{fmt(dataDoc)}</strong> ({DIAS_SEMANA_NOMES[diaSemana(dataDoc)].toUpperCase()})</span>
                <span>REGIME: <strong>{detalheDiario.ehDomingoOuFeriado ? "DOMINGO / FERIADO (1,5 pt)" : "ROTINA NORMAL (1,0 pt)"}</strong></span>
              </div>
            </div>

            {/* Tabela Guarnição do Serviço de Estado (24 Horas) */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider bg-slate-200 px-2 py-1 border border-slate-900 border-b-0">
                1. GUARNIÇÃO DO SERVIÇO DE ESTADO (24 HORAS)
              </div>
              <table className="w-full text-left border-collapse border border-slate-900 text-[11px]">
                <thead className="bg-slate-100">
                  <tr className="border-b border-slate-900">
                    <th className="p-1.5 border-r border-slate-900">Posto de Serviço</th>
                    <th className="p-1.5 border-r border-slate-900">Posto / Grad</th>
                    <th className="p-1.5 border-r border-slate-900">Nome de Guerra</th>
                    <th className="p-1.5 border-r border-slate-900">NIP</th>
                    <th className="p-1.5 border-r border-slate-900">Setor</th>
                    <th className="p-1.5">Armamento / Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {detalheDiario.itens.map((it) => {
                    const m = ctx.militarMap.get(it.militarTitularId);
                    return (
                      <tr key={it.posto} className="border-b border-slate-300">
                        <td className="p-1.5 border-r border-slate-300 font-bold">
                          {ESCALA_LABEL[it.posto]}
                        </td>
                        <td className="p-1.5 border-r border-slate-300">{m?.posto ?? "—"}</td>
                        <td className="p-1.5 border-r border-slate-300 font-bold">{m?.nomeGuerra ?? "A DESIGNAR"}</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono text-[10px]">{m?.nip ?? "—"}</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono text-[10px]">{m?.setorCodigo ?? m?.divisao ?? "—"}</td>
                        <td className="p-1.5 text-[10px]">
                          {it.posto === "OSE" || it.posto === "CONTRAMESTRE" ? "Pistola 9mm (+1,0 pt)" : "Armamento padrão"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Grupo de Controle de Avarias (CAV) */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider bg-slate-200 px-2 py-1 border border-slate-900 border-b-0">
                2. GRUPO DE CONTROLE DE AVARIAS (CAV — OI 30-07)
              </div>
              <table className="w-full text-left border-collapse border border-slate-900 text-[11px]">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold w-1/3">Encarregado do CAV</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoCav.encarregadoId))}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold">Desligador Elétrico</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoCav.desligadorEletricoId))}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold">Bombeiros nº 1 e nº 2</td>
                    <td className="p-1.5">
                      {nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoCav.bombeiro1Id))} • {nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoCav.bombeiro2Id))}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 font-bold">Isolamento e Primeiros Socorros</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoCav.isolamentoPrimeirosSocorrosId))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grupo de Reação (Pontos Sensíveis) */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider bg-slate-200 px-2 py-1 border border-slate-900 border-b-0">
                3. GRUPO DE REAÇÃO E SEGURANÇA ORGÂNICA (PONTOS SENSÍVEIS)
              </div>
              <table className="w-full text-left border-collapse border border-slate-900 text-[11px]">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold w-1/3">Comandante da Reação</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoReacao.comandanteId))} — Pistola Taurus 9mm</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold">Ponto Sensível 1: Escoteria / Paiol</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoReacao.pontoSensivelEscoteriaId))} — Fuzil 7.62 / Pistola</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold">Ponto Sensível 2: Residência CP-01</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoReacao.pontoSensivelCp01Id))}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-300 font-bold">Ponto Sensível 3: Frente GAP / Acesso</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoReacao.pontoSensivelFrenteGapId))}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 font-bold">Ponto Sensível 4: Alojamentos</td>
                    <td className="p-1.5">{nomeMilitar(ctx.militarMap.get(detalheDiario.detalheEmergencia.grupoReacao.pontoSensivelAlojamentosId))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Checklist Operacional & Assinaturas */}
            <div className="border border-slate-900 p-3 text-[10px] space-y-2">
              <div className="font-bold uppercase text-slate-800">4. CHECKLIST OPERACIONAL DIÁRIO DA GUARNIÇÃO:</div>
              <div className="grid grid-cols-3 gap-2">
                <div>[ <strong>X</strong> ] Vistoria horária das lanchas no flutuante</div>
                <div>[ <strong>X</strong> ] Escuta permanente no Canal 16 VHF</div>
                <div>[ <strong>X</strong> ] Conferência e dotação do armamento</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center pt-6">
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Oficial de Serviço (OSE)</div>
                <div className="text-[10px] text-slate-600">Assinatura no Livro de Quarto</div>
              </div>
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Ajudante / Imediato (CF-02)</div>
                <div className="text-[10px] text-slate-600">Visto Oficial</div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO 3: GUIA DE FÉRIAS REGULAMENTARES                          */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {documentoAtivo === "GUIA_FERIAS" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                GUIA DE CONCESSÃO DE FÉRIAS REGULAMENTARES
              </h2>
              <div className="text-[11px] font-mono mt-2 text-slate-700">
                PLANO ANUAL DE FÉRIAS — CAPITANIA FLUVIAL DE TABATINGA
              </div>
            </div>

            <div className="border border-slate-900 p-4 space-y-4">
              <div className="border-b border-slate-300 pb-3">
                <div className="text-[10px] font-bold uppercase text-slate-600">1. IDENTIFICAÇÃO DO MILITAR:</div>
                <div className="mt-1">
                  <div className="font-extrabold text-[14px]">
                    {militarSelecionado.posto} {militarSelecionado.nomeGuerra}
                  </div>
                  <div className="text-[11px] text-slate-700">{militarSelecionado.nomeCompleto}</div>
                  <div className="text-[10px] font-mono mt-0.5">
                    NIP: {militarSelecionado.nip} • Setor: {militarSelecionado.setorCodigo ?? militarSelecionado.divisao} • Função: {militarSelecionado.funcao ?? "Tripulante CFT"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-600">2. PERÍODO AQUISITIVO:</div>
                  <div className="font-bold text-[12px] mt-0.5">Ano de 2025 / 2026</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-600">3. PERÍODO DE GOZO CONCEDIDO:</div>
                  <div className="font-bold text-[12px] mt-0.5">
                    {afastamentoMilitar ? `${fmt(afastamentoMilitar.inicio)} a ${fmt(afastamentoMilitar.fim)}` : `${fmt(dataDoc)} a ${fmt(addDays(dataDoc, 29))}`} (30 dias)
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-300 pb-3">
                <div className="text-[10px] font-bold uppercase text-slate-600">4. MILITAR SUBSTITUTO OBRIGATÓRIO (PAIÓIS E ENCARGOS):</div>
                <div className="mt-1">
                  {afastamentoMilitar?.militarSubstitutoId ? (
                    (() => {
                      const sub = ctx.militarMap.get(afastamentoMilitar.militarSubstitutoId);
                      return (
                        <div className="font-bold text-[12px]">
                          {sub?.posto} {sub?.nomeGuerra} (NIP: {sub?.nip}) — Respondendo pelo setor e inventário no período.
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-slate-600 text-[11px] italic">
                      Designação oficial conforme Ordem Interna de Encargos Colaterais da CFT.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-600">5. ENDEREÇO E CONTATO DURANTE AS FÉRIAS:</div>
                <div className="p-2 border border-slate-300 bg-slate-50 text-[11px]">
                  Município de Tabatinga/AM ou trânsito interestadual informado à Secretaria da CFT (CF-09).
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center pt-8">
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Militar Concessionário</div>
                <div className="text-[10px] text-slate-600">Ciente</div>
              </div>
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Encarregado da Divisão</div>
                <div className="text-[10px] text-slate-600">Concordância</div>
              </div>
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Capitão dos Portos (CF-01)</div>
                <div className="text-[10px] text-slate-600">Homologação</div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO 4: COMUNICAÇÃO DE LICENÇA MÉDICA (LTS / LTSPF)           */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {documentoAtivo === "COMUNICACAO_LICENCA" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                COMUNICAÇÃO DE LICENÇA MÉDICA E RESTRIÇÃO OPERACIONAL
              </h2>
              <div className="text-[11px] font-mono mt-2 text-slate-700">
                JUNTA REGULAR DE SAÚDE (JRS) / SERVIÇO DE SAÚDE DA CFT
              </div>
            </div>

            <div className="border border-slate-900 p-4 space-y-4">
              <div className="border-b border-slate-300 pb-3">
                <div className="text-[10px] font-bold uppercase text-slate-600">1. MILITAR PERICIADO:</div>
                <div className="mt-1">
                  <div className="font-extrabold text-[14px]">
                    {militarSelecionado.posto} {militarSelecionado.nomeGuerra}
                  </div>
                  <div className="text-[11px] text-slate-700">{militarSelecionado.nomeCompleto}</div>
                  <div className="text-[10px] font-mono mt-0.5">
                    NIP: {militarSelecionado.nip} • Setor: {militarSelecionado.setorCodigo ?? militarSelecionado.divisao}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-600">2. NATUREZA DO AFASTAMENTO:</div>
                  <div className="font-bold text-[12px] mt-0.5">
                    [ X ] LTS (Tratamento de Saúde Própria) &nbsp; [ ] LTSPF (Pessoa da Família)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-600">3. PERÍODO HOMOLOGADO:</div>
                  <div className="font-bold text-[12px] mt-0.5">
                    {afastamentoMilitar ? `${fmt(afastamentoMilitar.inicio)} a ${fmt(afastamentoMilitar.fim)}` : `${fmt(dataDoc)} (Em homologação)`}
                  </div>
                </div>
              </div>

              <div className="space-y-1 border-b border-slate-300 pb-3">
                <div className="text-[10px] font-bold uppercase text-slate-600">4. RESTRIÇÕES OPERACIONAIS APLICADAS (OI 02-06D):</div>
                <div className="p-2 border border-slate-300 bg-slate-50 text-[11px]">
                  Militar dispensado das escalas armadas de estado e missões de Inspeção Naval (IN).
                  {militarSelecionado.posto.startsWith("S") ? " Concorre apenas como Supervisor SECOM mediante liberação médica." : " Concorre apenas como Identificador ou apoio interno."}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-600">5. DETERMINAÇÃO AO SARGENTEANTE-GERAL:</div>
                <div className="p-2 border border-slate-300 bg-slate-50 text-[11px]">
                  Proceder à atualização do banco de dados do SisPesCFT, aplicando bloqueio automático nas escalas e registro na Folha de 4 Tempos.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center pt-8">
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Médico da OM (1T Balieiro)</div>
                <div className="text-[10px] text-slate-600">CRM / Parecer Pericial</div>
              </div>
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold text-[11px]">Ajudante da CFT (CF-02)</div>
                <div className="text-[10px] text-slate-600">Publicação em Ordem de Serviço</div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO 5: FOLHA DIÁRIA DE PRESENÇA E REGRESSO (4 TEMPOS)        */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {documentoAtivo === "FOLHA_PRESENCA" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                FOLHA DIÁRIA DE CONTROLE DE PRESENÇA E REGRESSO (4 TEMPOS)
              </h2>
              <div className="flex justify-between items-center text-[11px] font-mono mt-1 text-slate-700">
                <span>DATA: <strong>{fmt(dataDoc)}</strong> ({DIAS_SEMANA_NOMES[diaSemana(dataDoc)].toUpperCase()})</span>
                <span>EXPEDIENTE CFT: <strong>07:30 / 11:30 / 13:15 / 16:30</strong></span>
              </div>
            </div>

            {/* Tabela dos 4 Tempos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-900 text-[10px]">
                <thead className="bg-slate-200">
                  <tr className="border-b border-slate-900">
                    <th className="p-1 border-r border-slate-900">Setor</th>
                    <th className="p-1 border-r border-slate-900">Posto</th>
                    <th className="p-1 border-r border-slate-900">Nome de Guerra</th>
                    <th className="p-1 border-r border-slate-900">NIP</th>
                    <th className="p-1 border-r border-slate-900 text-center w-12">1º T</th>
                    <th className="p-1 border-r border-slate-900 text-center w-12">2º T</th>
                    <th className="p-1 border-r border-slate-900 text-center w-12">3º T</th>
                    <th className="p-1 border-r border-slate-900 text-center w-12">4º T</th>
                    <th className="p-1">Situação / Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {folhaPresenca.map((linha) => {
                    const m = ctx.militarMap.get(linha.militarId);
                    if (!m) return null;
                    return (
                      <tr key={linha.militarId} className="border-b border-slate-300">
                        <td className="p-1 border-r border-slate-300 font-mono font-bold">
                          {m.setorCodigo ?? m.divisao}
                        </td>
                        <td className="p-1 border-r border-slate-300">{m.posto}</td>
                        <td className="p-1 border-r border-slate-300 font-bold">{m.nomeGuerra}</td>
                        <td className="p-1 border-r border-slate-300 font-mono">{m.nip}</td>
                        <td className="p-1 border-r border-slate-300 text-center font-bold font-mono">
                          {linha.tempo1}
                        </td>
                        <td className="p-1 border-r border-slate-300 text-center font-bold font-mono">
                          {linha.tempo2}
                        </td>
                        <td className="p-1 border-r border-slate-300 text-center font-bold font-mono">
                          {linha.tempo3}
                        </td>
                        <td className="p-1 border-r border-slate-300 text-center font-bold font-mono">
                          {linha.tempo4}
                        </td>
                        <td className="p-1 text-[9px] text-slate-700">
                          {linha.statusObservacao}
                          {linha.incumbenciasAcumuladas.length > 0 && (
                            <span className="font-bold text-slate-900 block">
                              * Acumulando: {linha.incumbenciasAcumuladas.map((i) => i.incumbencia).join(", ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo Numérico e Assinaturas */}
            <div className="grid grid-cols-2 gap-8 text-center pt-6 text-[11px]">
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold">Sargenteante-Geral da CFT</div>
                <div className="text-[10px] text-slate-600">Conferência Nominal</div>
              </div>
              <div>
                <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
                <div className="font-bold">Ajudante (CF-02)</div>
                <div className="text-[10px] text-slate-600">Visto do Comando</div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO 6: RELATÓRIOS DIVERSOS (TRIPULAÇÃO / SOMOR / PONTOS)     */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {documentoAtivo === "RELATORIOS_DIVERSOS" && (
          <div className="space-y-5">
            {/* Subtipo 1: Quadro Geral da Tripulação */}
            {subtipoRelatorio === "QUADRO_TRIPULACAO" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                    QUADRO GERAL DA TRIPULAÇÃO — LOTAÇÃO NOMINAL CF-01 A CF-42
                  </h2>
                  <div className="text-[11px] font-mono mt-1 text-slate-700">
                    TOTAL DE MILITARES: <strong>{ctx.militares.length} TRIPULANTES ATIVOS</strong>
                  </div>
                </div>

                <table className="w-full text-left border-collapse border border-slate-900 text-[10px]">
                  <thead className="bg-slate-200">
                    <tr className="border-b border-slate-900">
                      <th className="p-1 border-r border-slate-900">#</th>
                      <th className="p-1 border-r border-slate-900">Posto</th>
                      <th className="p-1 border-r border-slate-900">Esp</th>
                      <th className="p-1 border-r border-slate-900">Nome de Guerra</th>
                      <th className="p-1 border-r border-slate-900">Nome Completo</th>
                      <th className="p-1 border-r border-slate-900">NIP</th>
                      <th className="p-1 border-r border-slate-900">Setor</th>
                      <th className="p-1">Encargos / Paióis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.militares.map((m) => (
                      <tr key={m.id} className="border-b border-slate-300">
                        <td className="p-1 border-r border-slate-300 font-mono">
                          #{String(m.antiguidadeOrdem ?? 0).padStart(2, "0")}
                        </td>
                        <td className="p-1 border-r border-slate-300 font-bold">{m.posto}</td>
                        <td className="p-1 border-r border-slate-300">{m.especialidade ?? "—"}</td>
                        <td className="p-1 border-r border-slate-300 font-bold">{m.nomeGuerra}</td>
                        <td className="p-1 border-r border-slate-300 text-[9px]">{m.nomeCompleto}</td>
                        <td className="p-1 border-r border-slate-300 font-mono text-[9px]">{m.nip}</td>
                        <td className="p-1 border-r border-slate-300 font-mono font-bold">{m.setorCodigo ?? m.divisao}</td>
                        <td className="p-1 text-[9px]">
                          {m.incumbencias?.length ? m.incumbencias.join(", ") : m.funcao ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subtipo 2: Mapa Mensal SOMOR */}
            {subtipoRelatorio === "MAPA_SOMOR" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                    MAPA MENSAL DE ESCALAS DE SERVIÇO (SOMOR) — {MESES[mes0Doc].toUpperCase()} / {anoDoc}
                  </h2>
                  <div className="text-[11px] font-mono mt-1 text-slate-700">
                    CONSOLIDAÇÃO CONCOMITANTE DE TODAS AS ESCALAS DA OM
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-900 text-[9px]">
                    <thead className="bg-slate-200">
                      <tr className="border-b border-slate-900">
                        <th className="p-1 border-r border-slate-900 min-w-[140px]"># • Militar [Setor]</th>
                        {gradeSOMORMensal.cabecalhos.map((c) => (
                          <th key={c.data} className={`p-1 border-r border-slate-900 text-center ${c.fds ? "bg-slate-300 font-bold" : ""}`}>
                            <div>{c.numDia}</div>
                            <div className="text-[8px] font-normal">{c.diaSemCurto}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gradeSOMORMensal.linhas.map((linha) => (
                        <tr key={linha.militar.id} className="border-b border-slate-300">
                          <td className="p-1 border-r border-slate-300 font-bold whitespace-nowrap">
                            #{String(linha.militar.antiguidadeOrdem ?? 0).padStart(2, "0")} {linha.militar.posto} {linha.militar.nomeGuerra} [{linha.militar.setorCodigo ?? linha.militar.divisao}]
                          </td>
                          {linha.celulas.map((cel, idx) => (
                            <td key={idx} className="p-0.5 border-r border-slate-300 text-center font-mono font-bold text-[8px]">
                              {cel.sigla ? (
                                <span className="px-1 py-0.5 rounded text-[8px] bg-slate-200">
                                  {cel.sigla === "AUSENTE" ? "AUS" : cel.sigla}
                                </span>
                              ) : null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subtipo 3: Extrato de Pontuação Acumulada */}
            {subtipoRelatorio === "EXTRATO_PONTOS" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-[15px] font-extrabold uppercase tracking-wide border-y border-slate-400 py-1.5 bg-slate-100">
                    EXTRATO DE PONTUAÇÃO ACUMULADA E EQUIDADE (OI 02-06D)
                  </h2>
                  <div className="text-[11px] font-mono mt-1 text-slate-700">
                    ROTINA NORMAL: <strong>1,0 PT</strong> • DOMINGO / FERIADO: <strong>1,5 PT</strong> • RETÉM: <strong>0,25 / 0,5 PT</strong>
                  </div>
                </div>

                <table className="w-full text-left border-collapse border border-slate-900 text-[10px]">
                  <thead className="bg-slate-200">
                    <tr className="border-b border-slate-900">
                      <th className="p-1 border-r border-slate-900">#</th>
                      <th className="p-1 border-r border-slate-900">Posto</th>
                      <th className="p-1 border-r border-slate-900">Nome de Guerra</th>
                      <th className="p-1 border-r border-slate-900">NIP</th>
                      <th className="p-1 border-r border-slate-900">Setor</th>
                      <th className="p-1 border-r border-slate-900 text-right">Pts Normais</th>
                      <th className="p-1 border-r border-slate-900 text-right">Pts Domingo</th>
                      <th className="p-1 border-r border-slate-900 text-right">Pts Retém</th>
                      <th className="p-1 text-right font-bold">Total Ponderado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.militares.map((m) => {
                      const pts = m.pontosEscala ?? { normal: 0, domingoFeriado: 0, retem: 0, totalPonderado: 0 };
                      return (
                        <tr key={m.id} className="border-b border-slate-300">
                          <td className="p-1 border-r border-slate-300 font-mono">
                            #{String(m.antiguidadeOrdem ?? 0).padStart(2, "0")}
                          </td>
                          <td className="p-1 border-r border-slate-300 font-bold">{m.posto}</td>
                          <td className="p-1 border-r border-slate-300 font-bold">{m.nomeGuerra}</td>
                          <td className="p-1 border-r border-slate-300 font-mono">{m.nip}</td>
                          <td className="p-1 border-r border-slate-300 font-mono">{m.setorCodigo ?? m.divisao}</td>
                          <td className="p-1 border-r border-slate-300 text-right font-mono">{pts.normal.toFixed(1)}</td>
                          <td className="p-1 border-r border-slate-300 text-right font-mono font-bold text-slate-800">{pts.domingoFeriado.toFixed(1)}</td>
                          <td className="p-1 border-r border-slate-300 text-right font-mono">{pts.retem.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono font-extrabold text-[11px]">{pts.totalPonderado.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

