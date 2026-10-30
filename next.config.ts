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

  // Cabeçalhos de segurança cibernética recomendados para implantação militar/governamental
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Previne clickjacking (não permite embutir em iframes externos)
          { key: "X-Frame-Options", value: "DENY" },
          // Impede interpretação de arquivos fora do tipo MIME declarado
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Ativa filtro anti-XSS no navegador
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Força comunicação HTTPS estrita por 2 anos com subdomínios
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Protege o referer na navegação cruzada
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Bloqueia acesso a sensores de hardware e localização
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
