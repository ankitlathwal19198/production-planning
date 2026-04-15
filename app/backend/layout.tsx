"use client";

import * as React from "react";
import BackendTabs from "@/components/backend/BackendTabs";

export default function BackendLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full px-2 py-3 sm:px-4 sm:py-5">
        <div className="mb-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Backend</div>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sheets View
          </h1>
        </div>

        <BackendTabs />

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
