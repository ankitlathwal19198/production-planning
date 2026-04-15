"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { href: "/backend/planning-entries", label: "Planning Entries" },
  // { href: "/backend/drip-charge", label: "Drip" },
  // { href: "/backend/final-drip", label: "Final Drip" },
];

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function BackendTabs() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, tabs.findIndex((t) => pathname?.startsWith(t.href)));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/70 p-2 shadow-sm backdrop-blur dark:bg-white/5">
      <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Active pill */}
        <motion.div
          className="absolute inset-y-0 left-0 hidden sm:block"
          animate={{ x: `${activeIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{ width: "33.3333%" }}
        >
          <div className="h-full w-full rounded-xl bg-slate-900/90 dark:bg-white" />
        </motion.div>

        {tabs.map((t, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative z-10 rounded-xl px-3 py-2 text-sm font-semibold transition",
                active
                  ? "text-white dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
