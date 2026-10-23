"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CalendarCheck,
  CalendarDays,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Dashboard", icone: LayoutDashboard },
    { href: "/lancamentos", label: "Lançar", icone: FileSpreadsheet },
    { href: "/escalas", label: "Escalas", icone: CalendarCheck },
    { href: "/ferias", label: "Férias", icone: CalendarDays },
    { href: "/comando", label: "Comando", icone: Compass },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy-950/90 border-t border-slate-800/80 backdrop-blur-xl px-2 py-1.5 safe-area-pb">
      <nav className="flex items-center justify-around">
        {items.map((item) => {
          const Icone = item.icone;
          const ativo =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition text-[10px] font-semibold",
                ativo
                  ? "text-gold-300 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  ativo ? "bg-navy-800 text-gold-400 ring-1 ring-gold-500/30" : ""
                )}
              >
                <Icone className="w-5 h-5" />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
