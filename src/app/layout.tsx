import type { Metadata, Viewport } from "next";
import { Inter, Rajdhani } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/store/AuthProvider";
import { DataProvider } from "@/store/DataProvider";
import { AppShell } from "@/components/layout/AppShell";

const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? null;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SisPesCFT — Capitania Fluvial de Tabatinga",
  description:
    "Plataforma Integrada de Gestão de Pessoal, Previsões e Escalas de Serviço da Capitania Fluvial de Tabatinga (Marinha do Brasil).",
  keywords: ["Marinha do Brasil", "CFT", "Tabatinga", "Gestão de Pessoal", "Escalas", "Inspeção Naval", "EPM", "STA"],
  authors: [{ name: "Capitania Fluvial de Tabatinga - Setor de Pessoal" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#040a14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${rajdhani.variable} dark`}>
      {UMAMI_ID && (
        <head>
          <Script
            async
            defer
            src="https://analytics.umami.is/script.js"
            data-website-id={UMAMI_ID}
            strategy="afterInteractive"
          />
        </head>
      )}
      <body className="font-sans antialiased bg-navy-950 text-slate-100 min-h-screen selection:bg-gold-500/30 selection:text-white">
        <AuthProvider>
          <DataProvider>
            <AppShell>{children}</AppShell>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
