"use client";

import Link from "next/link";
import { useMemo } from "react";

const APP_NAME = "PlantOps";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0.0";
const ENV = process.env.NODE_ENV === "production" ? "Production" : "Development";

// Optional: CI/CD se inject karo (recommended)
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

type FooterProps = {
  plantName?: string;          // e.g. "Unit-1 (Indore)"
  shiftLabel?: string;         // e.g. "Shift A"
  lastSyncAt?: string;         // e.g. "10/01/2026 14:10:33"
  systemStatus?: "operational" | "degraded" | "down";
};

function StatusPill({ status }: { status: FooterProps["systemStatus"] }) {
  const ui = useMemo(() => {
    switch (status) {
      case "down":
        return {
          label: "System Down",
          cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
          dot: "bg-rose-500",
        };
      case "degraded":
        return {
          label: "Degraded",
          cls: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
          dot: "bg-amber-500",
        };
      case "operational":
      default:
        return {
          label: "Operational",
          cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          dot: "bg-emerald-500",
        };
    }
  }, [status]);

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${ui.cls}`}>
      <span className={`h-2 w-2 rounded-full ${ui.dot}`} />
      {ui.label}
    </div>
  );
}

const Footer: React.FC<FooterProps> = ({
  plantName = "Main Plant",
  shiftLabel = "Shift",
  lastSyncAt = "",
  systemStatus = "operational",
}) => {
  const runtimeBuild = useMemo(() => {
    // fallback runtime string if NEXT_PUBLIC_BUILD_TIME missing
    const s = new Date().toLocaleString("en-GB", { hour12: false });
    return BUILD_TIME || s;
  }, []);

  return (
    <footer
      className="
        border-t border-gray-200 bg-white text-gray-600
        dark:border-white/10 dark:bg-slate-950 dark:text-slate-400
      "
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand / Plant */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-rose-600 text-white shadow">
                P
              </div>

              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {APP_NAME} <span className="text-gray-500 dark:text-slate-300">Production</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {plantName} • {shiftLabel}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed">
              Planning, Inventory, Dispatch & QA — ek hi jagah se. Live stock, lot-wise movement, and planning approvals.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill status={systemStatus} />
              {lastSyncAt ? (
                <span className="text-xs text-gray-500 dark:text-slate-500">
                  Last sync: {lastSyncAt}
                </span>
              ) : null}
            </div>
          </div>

          {/* Operations */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Operations
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/planning" className="hover:text-gray-900 dark:hover:text-white">
                  Planning Workspace
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-gray-900 dark:hover:text-white">
                  Inventory (Lot / WH)
                </Link>
              </li>
              <li>
                <Link href="/dispatch" className="hover:text-gray-900 dark:hover:text-white">
                  Dispatch & Loading
                </Link>
              </li>
              <li>
                <Link href="/qa" className="hover:text-gray-900 dark:hover:text-white">
                  Quality / Lab
                </Link>
              </li>
            </ul>
          </div>

          {/* Reports & Controls */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Reports & Controls
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/reports" className="hover:text-gray-900 dark:hover:text-white">
                  Production Reports
                </Link>
              </li>
              <li>
                <Link href="/stock-ledger" className="hover:text-gray-900 dark:hover:text-white">
                  Stock Ledger
                </Link>
              </li>
              <li>
                <Link href="/users" className="hover:text-gray-900 dark:hover:text-white">
                  Users & Roles
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-gray-900 dark:hover:text-white">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* System */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              System
            </h4>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Version</span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                  {APP_VERSION}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Environment</span>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {ENV}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Build</span>
                <span className="text-xs text-gray-500 dark:text-slate-500">
                  {runtimeBuild}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/sop"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  SOP
                </Link>
                <Link
                  href="/safety"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Safety
                </Link>
                <Link
                  href="/policies"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Policies
                </Link>
                <Link
                  href="/help"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()}{" "}
            <span className="font-medium text-gray-700 dark:text-slate-300">
              {APP_NAME}
            </span>
            . Internal Plant Application.
          </span>

          <span className="text-gray-500 dark:text-slate-400">
            For Production • Stores • Dispatch • QA • Accounts
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;