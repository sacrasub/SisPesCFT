"use client";

import React, { useMemo, useState } from "react";
import { useDb } from "@/store/DataProvider";
import { resumoEfetivo } from "@/lib/engine/disponibilidade";
import { gerarEscala, simularImpactoEfetivo } from "@/lib/engine/escalas";
import { metaMensalFerias } from "@/lib/engine/ferias";
import { DIVISAO_MAP, DIVISOES, ESCALA_LABEL } from "@/lib/constants";
import { fmt, fmtDiaMes, addDays, inicioMes, MESES } from "@/lib/dates";
import { nomeMilitar, fmtRegime } from "@/lib/utils";
import { CoberturaBadge, PostoChip, DivisaoBadge } from "@/components/ui/Badge";
import {
  Compass,
  Printer,
  Shield,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Users,
  Anchor,
  FileText,
  BarChart3,
  Swords,
  Calendar,
} from "lucide-react";

export default function PainelComandoPage() {
  const { db, ctx, hoje } = useDb();
  const [dataConsulta, setDataConsulta] = useState<string>(hoje);

  // Resumo do Efetivo no dia
  const resumo = useMemo(
    () => resumoEfetivo(ctx, dataConsulta),
    [ctx, dataConsulta]
  );

  // Escalas do dia
  const servicosDoDia = useMemo(() => {
    return db.escalas.map((escala) => {
      const escalaGerada = gerarEscala(ctx, escala, dataConsulta, dataConsulta);
      return {
        escala,
        servico: escalaGerada[0],
      };
    });
  }, [db.escalas, ctx, dataConsulta]);

  // Missões e Viagens em Andamento no dia
  const missoesAtivas = useMemo(() => {
    return db.afastamentos.filter(
      (a) =>
        a.inicio <= dataConsulta &&
        dataConsulta <= a.fim &&
        a.status !== "CANCELADO" &&
        (a.categoria === "MISSAO" ||
          a.categoria === "INSPECAO_NAVAL" ||
          a.categoria === "CURSO")
    );
  }, [db.afastamentos, dataConsulta]);

  const imprimirBoletim = () => {
    window.print();
  };

  // ── Card PSO: disponíveis para missão sem quebrar o regime mínimo ──
  const anoHoje = Number(hoje.slice(0, 4));
  const mes0Proximo = (Number(hoje.slice(5, 7))) % 12; // mês seguinte base-0
  const anoProximo = mes0Proximo === 0 ? anoHoje + 1 : anoHoje;
  const inicioProximo = inicioMes(anoProximo, mes0Proximo);

  const metaFerias = useMemo(
    () => metaMensalFerias(ctx, anoHoje),
    [ctx, anoHoje]
  );

  const [simNAfastar, setSimNAfastar] = useState(1);
  const [simEscalaId, setSimEscalaId] = useState<"CONTRAMESTRE" | "MOTORISTA">("CONTRAMESTRE");

  const simulacao = useMemo(
    () => simularImpactoEfetivo(ctx, hoje, simEscalaId, simNAfastar),
    [ctx, hoje, simEscalaId, simNAfastar]
  );

  return (
    <div className="space-y-6 print-area">
      {/* Top Header & Controles de Impressão (Oculto na impressão) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-gold-500/20 text-gold-300">
              <Compass className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Painel de Consulta do Comando & Liderança
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visão consolidada para o Comandante, Imediato e Encarregados de Divisão • Tomada de Decisão Ágil.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              <span>Data:</span>
            </label>
            <input
              type="date"
              value={dataConsulta}
              onChange={(e) => setDataConsulta(e.target.value)}
              className="input text-xs py-1.5 px-3 w-auto font-mono bg-navy-900 border-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={imprimirBoletim}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold-900/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Boletim A4</span>
          </button>
        </div>
      </div>

      {/* CABEÇALHO OFICIAL INSTITUCIONAL (Visível na tela e na impressão A4) */}
      <div className="card p-6 border-gold-500/30 print:border-none print:shadow-none print:p-0">
        <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-400 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-navy-900 border border-gold-500/40 flex items-center justify-center text-gold-400 print:border-slate-800">
              <Anchor className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-gold-400 print:text-slate-800">
                MARINHA DO BRASIL • COMANDO DO 9º DISTRITO NAVAL
              </div>
              <h2 className="text-lg font-extrabold text-slate-100 print:text-black">
                CAPITANIA FLUVIAL DE TABATINGA
              </h2>
              <div className="text-xs text-slate-400 print:text-slate-600">
                Boletim Diário de Efetivo e Serviço • {fmt(dataConsulta)} ({fmtDiaMes(dataConsulta)})
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block print:block">
            <div className="text-[10px] font-mono uppercase text-slate-400 print:text-slate-600">
              Emitido via SisPesCFT
            </div>
            <div className="text-xs font-mono font-bold text-slate-200 print:text-black">
              Efetivo Total: {resumo.total} Militares
            </div>
          </div>
        </div>

        {/* Quadro Resumo Executivo em 4 colunas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 rounded-xl bg-navy-900/60 border border-slate-800 print:border-slate-300">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
              Disponíveis para Serviço
            </div>
            <div className="text-2xl font-bold font-display text-emerald-400 print:text-emerald-700 mt-1">
              {resumo.disponiveis}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-600">
              {Math.round((resumo.disponiveis / (resumo.total || 1)) * 100)}% do efetivo
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/60 border border-slate-800 print:border-slate-300">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
              Em Missão Externa / Viagem
            </div>
            <div className="text-2xl font-bold font-display text-cyan-300 print:text-blue-700 mt-1">
              {resumo.porStatus.MISSAO}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-600">
              STA: {resumo.missao.STA} • EPM: {resumo.missao.EPM}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/60 border border-slate-800 print:border-slate-300">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
              Inspeção Naval / Cursos
            </div>
            <div className="text-2xl font-bold font-display text-purple-300 print:text-purple-700 mt-1">
              {resumo.porStatus.INSPECAO_NAVAL + resumo.porStatus.CURSO}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-600">
              IN: {resumo.missao.INSPECAO_NAVAL} • Cursos: {resumo.porStatus.CURSO}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/60 border border-slate-800 print:border-slate-300">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
              Férias / Licenças Médicas
            </div>
            <div className="text-2xl font-bold font-display text-amber-300 print:text-amber-700 mt-1">
              {resumo.ferias + resumo.licencas}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-600">
              Férias: {resumo.ferias} • JS: {resumo.licencas}
            </div>
          </div>
        </div>
      </div>

      {/* GUIA DE SERVIÇO DO DIA (Quem está de serviço hoje) */}
      <div className="card p-5 space-y-4 print:border-slate-300 print:p-0">
        <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-400 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold-400 print:text-slate-800" />
            <h3 className="text-base font-bold text-slate-100 print:text-black">
              Escala de Serviço Guarnecida — {fmt(dataConsulta)}
            </h3>
          </div>
          <span className="text-xs text-slate-400 print:text-slate-600">
            Quarto de Hora e Viaturas Operacionais
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servicosDoDia.map(({ escala, servico }) => {
            return (
              <div
                key={escala.id}
                className="p-4 rounded-xl bg-navy-900/70 border border-slate-800 print:border-slate-400 print:bg-white"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-100 print:text-black">
                      {escala.nome}
                    </h4>
                    <div className="text-[11px] text-slate-400 print:text-slate-600 font-mono">
                      Regime: {fmtRegime(servico.cobertura.regime)} • Aptos:{" "}
                      {servico.cobertura.aptos}/{servico.cobertura.efetivo}
                    </div>
                  </div>
                  <CoberturaBadge status={servico.cobertura.status} size="sm" />
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 print:border-slate-300">
                  <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 mb-1.5">
                    Militar(es) de Serviço:
                  </div>
                  <div className="space-y-1">
                    {servico.militarIds.length === 0 ? (
                      <span className="text-rose-400 font-bold text-xs">
                        Nenhum militar apto (Posto Desguarnecido)
                      </span>
                    ) : (
                      servico.militarIds.map((mid) => {
                        const m = ctx.militarMap.get(mid);
                        return (
                          <div
                            key={mid}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <PostoChip posto={m?.posto || "MN"} />
                              <span className="font-bold text-slate-100 print:text-black">
                                {m?.nomeGuerra}
                              </span>
                              <span className="text-[11px] text-slate-400 print:text-slate-600 hidden sm:inline">
                                ({m?.nomeCompleto})
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 print:text-slate-600">
                              {DIVISAO_MAP[m?.divisao || "STA"]?.sigla}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MISSÕES, ITINERÂNCIAS E CURSOS EM ANDAMENTO */}
      <div className="card p-5 space-y-4 print:border-slate-300 print:p-0">
        <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-400 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gold-400 print:text-slate-800" />
            <h3 className="text-base font-bold text-slate-100 print:text-black">
              Missões e Cursos Fora da Sede em Execução
            </h3>
          </div>
          <span className="text-xs text-slate-400 print:text-slate-600">
            {missoesAtivas.length} missão(ões) ativa(s)
          </span>
        </div>

        {missoesAtivas.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs">
            Nenhuma missão ou itinerância externa em andamento nesta data.
          </div>
        ) : (
          <div className="space-y-2.5">
            {missoesAtivas.map((m) => {
              const nomes = m.militarIds
                .map((id) => nomeMilitar(ctx.militarMap.get(id)))
                .join(", ");

              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-navy-900/60 border border-slate-800 print:border-slate-300 print:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <DivisaoBadge divisao={m.divisao} />
                      <span className="font-bold text-slate-100 print:text-black text-sm">
                        {m.titulo}
                      </span>
                    </div>
                    {m.local && (
                      <div className="text-slate-400 print:text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gold-400" />
                        <span>{m.local}</span>
                      </div>
                    )}
                    <div className="text-slate-300 print:text-slate-700">
                      <strong>Efetivo:</strong> {nomes}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-slate-400 print:text-slate-600 text-[11px] block">
                      {fmt(m.inicio)} a {fmt(m.fim)}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 print:text-blue-800 border border-cyan-500/30">
                      {m.categoria}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SUBSÍDIO PARA O CONSELHO DE GESTÃO / PSO                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-5 no-print border-gold-500/30">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-gold-400" />
            <h3 className="text-base font-bold text-slate-100">
              Subsídio para o Conselho de Gestão / PSO
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 border border-gold-500/30">
            Próximo mês: {MESES[mes0Proximo]} {anoProximo}
          </span>
        </div>

        {/* Disponíveis para Missão no Próximo Mês */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            Militares disponíveis para missão sem quebrar o regime mínimo de escala
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.escalas.map((esc) => {
              const cob = gerarEscala(ctx, esc, inicioProximo, addDays(inicioProximo, 29));
              const regimeMedio = cob.length
                ? cob.reduce((s, d) => s + d.cobertura.aptos, 0) / cob.length
                : 0;
              const aptosProximo = Math.round(regimeMedio);
              const necessario = (esc.limiteSeguranca + 1) * esc.postosPorDia;
              const disponiveis = Math.max(0, aptosProximo - necessario);
              return (
                <div
                  key={esc.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    disponiveis > 0
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : "bg-rose-950/20 border-rose-500/30"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{esc.nome}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Mínimo seguro: {necessario} militares aptos · Média aptos: {aptosProximo}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-extrabold font-display ${disponiveis > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {disponiveis}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Disponíveis</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Simulador de Impacto */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-fuchsia-400" />
            Simulador de Impacto: missão com N militares a menos
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={simEscalaId}
              onChange={(e) => setSimEscalaId(e.target.value as "CONTRAMESTRE" | "MOTORISTA")}
              className="input text-xs py-1.5 px-3 w-auto"
            >
              <option value="CONTRAMESTRE">Contramestre</option>
              <option value="MOTORISTA">Motorista</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Afastar</label>
              <input
                type="number"
                min={0}
                max={10}
                value={simNAfastar}
                onChange={(e) => setSimNAfastar(Math.max(0, Number(e.target.value)))}
                className="input text-xs py-1.5 px-3 w-20 font-mono"
              />
              <label className="text-xs text-slate-400">militares aptos</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Cenário Atual</div>
              <div className="mt-1 font-bold text-lg font-display text-slate-100">
                {fmtRegime(simulacao.regimeAtual)}
              </div>
              <CoberturaBadge status={simulacao.statusAtual} size="sm" />
            </div>
            <div className={`p-3.5 rounded-xl border ${
              simulacao.statusSimulado === "OK" ? "bg-emerald-950/20 border-emerald-500/30"
              : simulacao.statusSimulado === "ATENCAO" ? "bg-amber-950/20 border-amber-500/30"
              : "bg-rose-950/20 border-rose-500/30"
            }`}>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Com {simNAfastar} Militar(es) a Menos
              </div>
              <div className="mt-1 font-bold text-lg font-display text-slate-100">
                {fmtRegime(simulacao.regimeSimulado)}
              </div>
              <CoberturaBadge status={simulacao.statusSimulado} size="sm" />
            </div>
          </div>
        </div>

        {/* Meta de Férias por Divisão */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            Meta de Férias por Divisão — {MESES[mes0Proximo]} {anoProximo}
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-navy-900 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2 px-3">Divisão</th>
                  <th className="py-2 px-3">Efetivo</th>
                  <th className="py-2 px-3">Total Dias/Ano</th>
                  <th className="py-2 px-3">Meta {MESES[mes0Proximo]}</th>
                  <th className="py-2 px-3">Dias Úteis no Mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metaFerias.map((mf) => {
                  const metaMes = mf.metaPorMes[mes0Proximo];
                  const div = DIVISAO_MAP[mf.divisao];
                  return (
                    <tr key={mf.divisao} className="hover:bg-navy-900/40">
                      <td className="py-2 px-3 font-bold text-slate-200">{div?.sigla ?? mf.divisao}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{mf.efetivo}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{mf.totalDiasAno}</td>
                      <td className="py-2 px-3 font-bold font-mono text-gold-400">{metaMes.metaDias} dias</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{metaMes.diasUteisNoMes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RODAPÉ INSTITUCIONAL (Para assinatura no boletim impresso) */}
      <div className="only-print mt-12 pt-8 border-t border-slate-400 text-center">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="h-10 border-b border-black w-48 mx-auto" />
            <div className="font-bold mt-1">Encarregado do Setor de Pessoal</div>
            <div className="text-[11px] text-slate-600">Capitania Fluvial de Tabatinga</div>
          </div>
          <div>
            <div className="h-10 border-b border-black w-48 mx-auto" />
            <div className="font-bold mt-1">Capitão dos Portos / Imediato</div>
            <div className="text-[11px] text-slate-600">Capitania Fluvial de Tabatinga</div>
          </div>
        </div>
      </div>
    </div>
  );
}
