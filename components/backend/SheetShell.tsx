"use client";

import * as React from "react";
import { motion } from "framer-motion";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function SheetShell({
  title,
  subtitle,
  children,
  right,
  searchValue,
  onSearchChange,
  rowsCount,
  searchPlaceholder = "Search…",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;

  // new
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  rowsCount?: number;
  searchPlaceholder?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full rounded-2xl border border-white/10 bg-white/70 shadow-sm backdrop-blur dark:bg-white/5 overflow-hidden"
    >
      {/* top header */}
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {title}
            </div>

            {/* subtitle + rows */}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle ? <span className="truncate">{subtitle}</span> : null}
              {typeof rowsCount === "number" ? (
                <span className="rounded-lg bg-slate-900/5 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  Rows: {rowsCount}
                </span>
              ) : null}
            </div>
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>

        {/* search just below title/subtitle (headers ke upar) */}
        {onSearchChange ? (
          <div className="mt-2">
            <input
              value={searchValue || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm",
                "outline-none focus:border-slate-300",
                "dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/20"
              )}
            />
          </div>
        ) : null}
      </div>

      <div className="p-0">{children}</div>
    </motion.section>
  );
}
