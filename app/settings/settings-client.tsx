"use client";

import { useMemo, useState } from "react";

type User = {
  name: string;
  email: string;
  role?: string;
  id?: string;
  phone?: string;
  company?: string;
  timezone?: string;
  department?: string;
  employeeCode?: string;
};

type RoutingPreference = "Discounting" | "Collection";
type ApprovalMode = "Single" | "Two-step";
type Theme = "System" | "Light" | "Dark";

export default function SettingsClient({ user }: { user: User }) {
  // ---------- Profile / Directory
  const [name, setName] = useState(user.name ?? "");
  const [email] = useState(user.email ?? ""); // read-only
  const [phone, setPhone] = useState(user.phone ?? "");
  const [department, setDepartment] = useState(user.department ?? "Accounts");
  const [employeeCode, setEmployeeCode] = useState(user.employeeCode ?? "");
  const [timezone, setTimezone] = useState(user.timezone ?? "Asia/Kolkata");

  // ---------- Work preferences
  const [theme, setTheme] = useState<Theme>("System");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const [compactMode, setCompactMode] = useState(false);

  // ---------- Workflow preferences (internal finance)
  const [defaultRouting, setDefaultRouting] = useState<RoutingPreference>("Collection");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("Two-step");
  const [autoTagging, setAutoTagging] = useState(true);
  const [dueReminderDays, setDueReminderDays] = useState("3"); // days before due date

  // ---------- Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // ---------- Security (internal)
  const [twoFA, setTwoFA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("60");

  // ---------- Integrations (internal tools)
  const [sheetsConnected, setSheetsConnected] = useState(true);
  const [erpSync, setErpSync] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const roleLabel = useMemo(() => user.role ?? "Employee", [user.role]);

  const saveAll = async () => {
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { name, phone, department, employeeCode, timezone },
          preferences: { theme, dateFormat, defaultCurrency, compactMode },
          workflow: { defaultRouting, approvalMode, autoTagging, dueReminderDays },
          notifications: { emailAlerts, dailySummary, criticalOnly },
          security: { twoFA, sessionTimeout },
          integrations: { sheetsConnected, erpSync, webhookUrl },
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      setMsg("✅ Settings saved (internal)!");
    } catch (e) {
      console.error(e);
      setMsg("❌ Save failed. Console check karo.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* LEFT: Profile card */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Employee</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{name}</p>
            <p className="text-sm text-slate-600">{email}</p>
          </div>

          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
            {roleLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-slate-600">Department</span>
            <span className="font-medium text-slate-900">{department}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-slate-600">Employee Code</span>
            <span className="font-medium text-slate-900">{employeeCode || "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-slate-600">Timezone</span>
            <span className="font-medium text-slate-900">{timezone}</span>
          </div>
        </div>

        <button
          onClick={saveAll}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        {msg && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {msg}
          </div>
        )}

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">Internal note</p>
          <p className="mt-1">
            Changes may reflect across approvals, reminders, and reporting views.
          </p>
        </div>
      </aside>

      {/* RIGHT: Sections */}
      <section className="lg:col-span-2 space-y-6">
        {/* Profile & Directory */}
        <Section
          title="Profile & Directory"
          subtitle="Update your internal directory details used in approvals and reports."
          accent="from-sky-500 to-indigo-500"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Email (read-only)">
              <input className={inputReadOnlyCls} value={email} readOnly />
            </Field>

            <Field label="Phone">
              <input
                className={inputCls}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
              />
            </Field>

            <Field label="Department">
              <select
                className={inputCls}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option>Accounts</option>
                <option>Finance</option>
                <option>Sales</option>
                <option>Operations</option>
                <option>Admin</option>
              </select>
            </Field>

            <Field label="Employee Code">
              <input
                className={inputCls}
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="EMP-1023"
              />
            </Field>

            <Field label="Timezone">
              <select
                className={inputCls}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* Role & Permissions */}
        <Section
          title="Role & Permissions"
          subtitle="Assigned by Admin. Contact Admin to change access."
          accent="from-violet-500 to-fuchsia-500"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InfoPill label="Role" value={roleLabel} />
            <InfoPill label="Access level" value={roleLabel === "Admin" ? "Full" : "Standard"} />
            <InfoPill label="Can approve entries" value={roleLabel === "Admin" ? "Yes" : "As assigned"} />
            <InfoPill label="Export reports" value="Allowed" />
          </div>
        </Section>

        {/* Work Preferences */}
        <Section
          title="Work Preferences"
          subtitle="Personal view settings — doesn’t affect others."
          accent="from-emerald-500 to-teal-500"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Theme">
              <select className={inputCls} value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                <option value="System">System</option>
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
              </select>
            </Field>

            <Field label="Date format">
              <select className={inputCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </Field>

            <Field label="Default currency">
              <select
                className={inputCls}
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </Field>

            <ToggleRow
              title="Compact mode"
              subtitle="Tighter spacing for tables & logs."
              checked={compactMode}
              onChange={setCompactMode}
            />
          </div>
        </Section>

        {/* Approvals & Workflow */}
        <Section
          title="Approvals & Finance Workflow"
          subtitle="Defaults for how inflows/outflows are recorded internally."
          accent="from-amber-500 to-orange-500"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default routing">
              <select
                className={inputCls}
                value={defaultRouting}
                onChange={(e) => setDefaultRouting(e.target.value as RoutingPreference)}
              >
                <option value="Discounting">Discounting (80% credit)</option>
                <option value="Collection">Collection (100% payment)</option>
              </select>
            </Field>

            <Field label="Approval mode">
              <select
                className={inputCls}
                value={approvalMode}
                onChange={(e) => setApprovalMode(e.target.value as ApprovalMode)}
              >
                <option value="Single">Single-step approval</option>
                <option value="Two-step">Two-step (Maker → Checker)</option>
              </select>
            </Field>

            <ToggleRow
              title="Auto-tagging"
              subtitle="Auto add tags based on buyer / invoice keywords."
              checked={autoTagging}
              onChange={setAutoTagging}
            />

            <Field label="Due reminder (days before)">
              <select
                className={inputCls}
                value={dueReminderDays}
                onChange={(e) => setDueReminderDays(e.target.value)}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* Notifications */}
        <Section
          title="Notifications"
          subtitle="Internal alerts for approvals, dues and critical events."
          accent="from-rose-500 to-pink-500"
        >
          <div className="space-y-3">
            <ToggleRow
              title="Email alerts"
              subtitle="Approvals, due reminders, and receipts."
              checked={emailAlerts}
              onChange={setEmailAlerts}
            />
            <ToggleRow
              title="Daily summary"
              subtitle="Daily activity summary of inflow/outflow."
              checked={dailySummary}
              onChange={setDailySummary}
            />
            <ToggleRow
              title="Critical only mode"
              subtitle="Only high-priority alerts (overdue, failed sync)."
              checked={criticalOnly}
              onChange={setCriticalOnly}
            />
          </div>
        </Section>

        {/* Security */}
        <Section
          title="Security"
          subtitle="Session and sign-in protections."
          accent="from-slate-600 to-slate-900"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              title="Two-factor authentication (2FA)"
              subtitle="Extra security during sign-in."
              checked={twoFA}
              onChange={setTwoFA}
            />

            <Field label="Session timeout (minutes)">
              <select
                className={inputCls}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="120">120</option>
              </select>
            </Field>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Tip</p>
              <p className="mt-1">
                If you use shared systems, keep session timeout shorter (30–60 mins).
              </p>
            </div>
          </div>
        </Section>

        {/* Integrations */}
        <Section
          title="Integrations"
          subtitle="Company tooling connections (controlled by Admin)."
          accent="from-cyan-500 to-blue-500"
        >
          <div className="space-y-3">
            <ToggleRow
              title="Google Sheets sync"
              subtitle="Save entries to the central sheet."
              checked={sheetsConnected}
              onChange={setSheetsConnected}
            />
            <ToggleRow
              title="ERP sync"
              subtitle="Sync approved entries to ERP (if enabled)."
              checked={erpSync}
              onChange={setErpSync}
            />

            <Field label="Webhook URL (optional)">
              <input
                className={inputCls}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://internal.company/webhook"
              />
              <p className="mt-1 text-xs text-slate-500">
                For internal automation (approval created, due overdue, sync failed).
              </p>
            </Field>
          </div>
        </Section>
      </section>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-6">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ToggleRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <input
        type="checkbox"
        className="h-5 w-5 accent-indigo-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const inputReadOnlyCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600";
