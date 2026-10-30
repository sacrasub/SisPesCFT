import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/notify
 * Dispara alerta por e-mail via Resend quando um afastamento coloca
 * uma escala em status CRÍTICO ou SEM_COBERTURA.
 *
 * Corpo esperado:
 * {
 *   escala: string;          // nome da escala afetada
 *   divisao: string;         // divisão que fez o lançamento
 *   militares: string[];     // nomes dos militares lançados
 *   periodo: string;         // ex.: "23/10 a 30/10/2026"
 *   status: "CRITICO" | "SEM_COBERTURA";
 *   regime?: number;         // regime resultante
 * }
 */
export async function POST(req: NextRequest) {
  // 1. Blindagem de Segurança da API: Validação de Origem e Proteção Anti-Abuso
  const origin = req.headers.get("origin") || req.headers.get("referer");
  const host = req.headers.get("host");
  const internalSecret = req.headers.get("x-sispes-token");

  // Se chamada vier de fora da aplicação sem token interno, rejeita com 403
  const isMesmaOrigem = origin && host && (origin.includes(host) || origin.includes("localhost") || origin.includes("vercel.app"));
  const isTokenValido = internalSecret === process.env.INTERNAL_NOTIFY_TOKEN || process.env.NODE_ENV === "development";

  if (!isMesmaOrigem && !isTokenValido) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Disparo de alertas restrito a origens verificadas da aplicação." },
      { status: 403 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFY_EMAIL_TO;

  // Sem configuração de Resend: modo silencioso (não falha o client)
  if (!apiKey || !toEmail) {
    return NextResponse.json({ ok: true, skipped: true, reason: "RESEND_API_KEY ou NOTIFY_EMAIL_TO não configurados" });
  }

  let body: {
    escala: string;
    divisao: string;
    militares: string[];
    periodo: string;
    status: string;
    regime?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const statusLabel = body.status === "SEM_COBERTURA" ? "SEM COBERTURA" : "CRÍTICO";
  const regimeStr = body.regime !== undefined ? ` (regime ${body.regime}×1)` : "";
  const militaresHtml = body.militares.map((n) => `<li>${n}</li>`).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #040a14; color: #e2e8f0; padding: 24px; border-radius: 12px; border: 1px solid #1e3a5f;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <div style="background: #991b1b; color: #fff; font-weight: 900; font-size: 13px; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.08em;">
          ⚠ ALERTA ${statusLabel}
        </div>
        <span style="color: #d4a63a; font-weight: 700; font-size: 16px;">SisPesCFT — Capitania Fluvial de Tabatinga</span>
      </div>
      <h2 style="color: #f87171; margin: 0 0 12px;">Escala de ${body.escala} — ${statusLabel}${regimeStr}</h2>
      <p style="color: #94a3b8; margin: 0 0 8px;">
        A <strong style="color: #e2e8f0;">${body.divisao}</strong> lançou afastamento(s) que colocam a escala em situação crítica.
      </p>
      <p style="color: #94a3b8; margin: 0 0 4px;"><strong style="color: #cbd5e1;">Período:</strong> ${body.periodo}</p>
      <p style="color: #94a3b8; margin: 0 0 12px;"><strong style="color: #cbd5e1;">Militares lançados:</strong></p>
      <ul style="color: #e2e8f0; padding-left: 18px; margin: 0 0 20px;">${militaresHtml}</ul>
      <p style="color: #64748b; font-size: 12px; border-top: 1px solid #1e3a5f; padding-top: 12px; margin: 0;">
        Acesse o SisPesCFT → Módulo Escalas para visualizar e ajustar a grade.
      </p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SisPesCFT <noreply@sispescft.mar.mil.br>",
        to: [toEmail],
        subject: `[SisPesCFT] ⚠ Alerta ${statusLabel} — Escala de ${body.escala} · ${body.periodo}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[notify] Resend error:", err);
      return NextResponse.json({ error: "Falha no Resend", detail: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notify] fetch error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
