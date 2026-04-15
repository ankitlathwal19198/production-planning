"use client";

import CopyPiButton from "@/components/CopyPiButton";
import * as React from "react";
import toast from "react-hot-toast";

type SuperUser = {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
};

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function Pill({ label, tone = "info" }: { label: string; tone?: "info" | "ok" | "warn" }) {
  const styles =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"
      : "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", styles)}>
      {label}
    </span>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-900/5 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-fuchsia-500/15 via-sky-500/15 to-emerald-500/15 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
          </div>
          {right}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
        {desc ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</div> : null}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full ring-1 transition",
          value
            ? "bg-emerald-500/25 ring-emerald-500/30"
            : "bg-slate-500/10 ring-slate-900/10 dark:bg-white/10 dark:ring-white/10"
        )}
        aria-label={`${label} toggle`}
      >
        <span
          className={cn(
            "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
            value ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SuperAdminPanel({ user }: { user: SuperUser }) {
  const [tab, setTab] = React.useState<"overview" | "users" | "security" | "ops">("overview");

  // Demo state (replace later with real APIs)
  const [maintenance, setMaintenance] = React.useState(false);
  const [signupsEnabled, setSignupsEnabled] = React.useState(true);
  const [auditMode, setAuditMode] = React.useState(true);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/5 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-sky-500 to-emerald-500" />
              Super Admin Console
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Control Panel</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              High-privilege workspace • Audit-first • Production safeguards
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill label={`Role: ${user.role}`} tone="ok" />
            <button
              onClick={() => copy(user.sub)}
              className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              title="Copy user id"
            >
              Copy User ID
            </button>
            <button
              onClick={() => toast.success("Health checks triggered (demo)")}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 dark:bg-white dark:text-slate-900"
            >
              Run Health Checks
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["users", "Users & Roles"],
            ["security", "Security"],
            ["ops", "Operations"],
          ].map(([k, label]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition",
                  active
                    ? "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300"
                    : "bg-white/70 text-slate-700 ring-slate-900/5 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === "overview" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card
              title="System Status"
              subtitle="Live signals (demo widgets)"
              right={<Pill label="Operational" tone="ok" />}
            >
              <div className="grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">API latency</span>
                  <span className="font-semibold">~120ms</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Error rate</span>
                  <span className="font-semibold">0.08%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Last deploy</span>
                  <span className="font-semibold">Today</span>
                </div>
              </div>
            </Card>

            <Card title="Privileges" subtitle="Your current session">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Name</span>
                  <span className="font-semibold">{user.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Email</span>
                  <span className="font-semibold">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Token expires</span>
                  <span className="font-semibold">{new Date(user.exp * 1000).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <Card title="Quick Actions" subtitle="Guardrails enabled by default">
              <div className="grid gap-3">
                <button
                  onClick={() => toast.success("Feature flags opened (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Manage Feature Flags
                </button>
                <button
                  onClick={() => toast.success("Audit export queued (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Export Audit Logs
                </button>
                <button
                  onClick={() => toast.success("Access review started (demo)")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 dark:bg-white dark:text-slate-900"
                >
                  Start Access Review
                </button>
              </div>
            </Card>

            <div className="lg:col-span-3 grid gap-4 lg:grid-cols-2">
              <Card title="Recent Activity" subtitle="Admin audit trail (sample feed)">
                <ul className="space-y-3 text-sm">
                  {[
                    { t: "2m ago", a: "Role change", d: "user_… → admin (approved)" },
                    { t: "18m ago", a: "Policy update", d: "Password policy tightened" },
                    { t: "1h ago", a: "Deploy", d: "Production release 1.0.0" },
                    { t: "3h ago", a: "API key rotated", d: "Billing-service key" },
                  ].map((x, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{x.a}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{x.d}</div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{x.t}</div>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Config Guardrails" subtitle="Safe-by-default toggles">
                <div className="grid gap-3">
                  <Toggle
                    label="Maintenance mode"
                    desc="Locks non-admin routes (demo)"
                    value={maintenance}
                    onChange={(v) => {
                      setMaintenance(v);
                      toast.success(v ? "Maintenance enabled (demo)" : "Maintenance disabled (demo)");
                    }}
                  />
                  <Toggle
                    label="New signups"
                    desc="Allow new user registrations"
                    value={signupsEnabled}
                    onChange={(v) => {
                      setSignupsEnabled(v);
                      toast.success(v ? "Signups enabled (demo)" : "Signups disabled (demo)");
                    }}
                  />
                  <Toggle
                    label="Audit mode"
                    desc="Extra logging on privileged actions"
                    value={auditMode}
                    onChange={(v) => {
                      setAuditMode(v);
                      toast.success(v ? "Audit mode ON (demo)" : "Audit mode OFF (demo)");
                    }}
                  />
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "users" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card title="User Directory" subtitle="Search + role management (demo)">
              <div className="flex gap-2">
                <input
                  placeholder="Search by email / id / name…"
                  className="w-full rounded-xl border border-slate-900/5 bg-white px-3 py-2 text-sm shadow-sm outline-none dark:border-white/10 dark:bg-slate-950/40"
                />
                <button
                  onClick={() => toast.success("Search executed (demo)")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                >
                  Search
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {[
                  { name: "Sahil", email: "test-user@google.com", role: "user" },
                  { name: "Accounts Lead", email: "lead@company.com", role: "admin" },
                  { name: "Ops", email: "ops@company.com", role: "super-admin" },
                ].map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                    </div>
                    <Pill label={u.role} tone={u.role === "super-admin" ? "warn" : u.role === "admin" ? "info" : "ok"} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Role Assignment" subtitle="Least-privilege workflows">
              <div className="grid gap-3">
                <button
                  onClick={() => toast.success("Role request created (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Create Role Change Request
                </button>
                <button
                  onClick={() => toast.success("Approvals opened (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  View Pending Approvals
                </button>
                <button
                  onClick={() => toast.success("Emergency access locked (demo)")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 dark:bg-white dark:text-slate-900"
                >
                  Lock Emergency Access
                </button>
              </div>
            </Card>

            <Card title="Policies" subtitle="Centralized governance">
              <ul className="space-y-2 text-sm">
                {[
                  ["Session duration", "8 hours"],
                  ["MFA", "Required for admins"],
                  ["IP allowlist", "Enabled for finance apps"],
                  ["API keys", "Rotation every 30 days"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <span className="text-slate-600 dark:text-slate-300">{k}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}

        {tab === "security" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card title="Security Posture" subtitle="Baseline checks (demo)" right={<Pill label="Good" tone="ok" />}>
              <div className="space-y-3 text-sm">
                {[
                  ["JWT validation", "Enabled"],
                  ["Cookie flags", "HttpOnly + Secure"],
                  ["Rate limiting", "Configured"],
                  ["Suspicious logins", "0 last 24h"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <span className="text-slate-600 dark:text-slate-300">{k}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Incident Toolkit" subtitle="High-impact actions">
              <div className="grid gap-3">
                <button
                  onClick={() => toast.success("All sessions revoked (demo)")}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Revoke All Sessions
                </button>
                <button
                  onClick={() => toast.success("API keys rotation started (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Rotate API Keys
                </button>
                <button
                  onClick={() => toast.success("Audit snapshot captured (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Capture Audit Snapshot
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                These are demo actions right now — wire them to your internal tooling when ready.
              </p>
            </Card>
          </div>
        ) : null}

        {tab === "ops" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card title="Jobs" subtitle="Background workflows (demo)">
              <div className="space-y-2 text-sm">
                {[
                  ["Invoice sync", "Healthy"],
                  ["Sheets importer", "Healthy"],
                  ["Report generator", "Healthy"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <span className="text-slate-600 dark:text-slate-300">{k}</span>
                    <Pill label={v} tone="ok" />
                  </div>
                ))}                
              </div>
            </Card>

            <Card title="Rate Limits" subtitle="Protect critical endpoints">
              <div className="space-y-2 text-sm">
                {[
                  ["/api/invoices", "60/min"],
                  ["/api/entries", "60/min"],
                  ["/api/auth/*", "30/min"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-slate-900/5 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <span className="text-slate-600 dark:text-slate-300">{k}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Deploy Controls" subtitle="Release workflow helpers">
              <div className="grid gap-3">
                <button
                  onClick={() => toast.success("Staging deployed (demo)")}
                  className="rounded-xl border border-slate-900/5 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Deploy to Staging
                </button>
                <button
                  onClick={() => toast.success("Prod deploy approved (demo)")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 dark:bg-white dark:text-slate-900"
                >
                  Approve Prod Deploy
                </button>
                <CopyPiButton />
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
