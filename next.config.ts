import type { NextConfig } from "next";

/**
 * Configuração Next.js compatível com:
 * - Cloudflare Pages (edge runtime, output: "export" desativado para SSR com Supabase)
 * - Build limpo sem headers desnecessários
 * - lucide-react tree-shaking
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Para deploy no Cloudflare Pages com next-on-pages ou CF Workers
  // Se quiser site estático puro: troque para "export" e remova as API routes.
  // output: "export",

  experimental: {
    // Reduz o bundle importando apenas os ícones usados.
    optimizePackageImports: ["lucide-react"],
  },

  // Cabeçalhos de segurança recomendados para implantação institucional
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
