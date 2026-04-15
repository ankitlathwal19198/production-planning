"use client";

import { useMemo, useState } from "react";

type User = {
    id?: string;
    name: string;
    email: string;
    role?: string;
    phone?: string;
    department?: string;
    employeeCode?: string;
    timezone?: string;
};

type Status = "Active" | "On Leave" | "Busy";
type Theme = "System" | "Light" | "Dark";

export default function ProfileClient({ user }: { user: User }) {
    // Editable fields
    const [name, setName] = useState(user.name ?? "");
    const [phone, setPhone] = useState(user.phone ?? "");
    const [department, setDepartment] = useState(user.department ?? "Accounts");
    const [employeeCode, setEmployeeCode] = useState(user.employeeCode ?? "");
    const [timezone, setTimezone] = useState(user.timezone ?? "Asia/Kolkata");
    const [status, setStatus] = useState<Status>("Active");
    const [theme, setTheme] = useState<Theme>("System");

    // Internal preferences
    const [signature, setSignature] = useState(
        `Regards,\n${user.name ?? "—"}\n${user.department ?? "Accounts Department"}`
    );

    const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
    const [defaultCurrency, setDefaultCurrency] = useState("INR");

    const [dailyDigest, setDailyDigest] = useState(true);
    const [dueAlerts, setDueAlerts] = useState(true);

    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const roleLabel = useMemo(() => user.role ?? "Employee", [user.role]);

    const initials = useMemo(() => {
        const parts = (name || "User").trim().split(/\s+/);
        const a = parts[0]?.[0] ?? "U";
        const b = parts[1]?.[0] ?? "";
        return (a + b).toUpperCase();
    }, [name]);

    // Fake content (replace with real data later)
    const stats = [
        { label: "Entries created", value: "128", hint: "Last 30 days" },
        { label: "Approvals pending", value: "6", hint: "Needs action" },
        { label: "Overdue dues", value: "2", hint: "Follow up" },
        { label: "Exports", value: "14", hint: "Reports generated" },
    ];

    const activity = [
        { t: "Today", text: "Recorded inflow for CI-1098 (Collection)", badge: "Inflow" },
        { t: "Yesterday", text: "Approved outflow request: Vendor payment", badge: "Approval" },
        { t: "2 days ago", text: "Generated monthly cash report (PDF export)", badge: "Report" },
        { t: "Last week", text: "Updated routing default to Discounting", badge: "Settings" },
    ];

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch("/api/profile/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profile: { name, phone, department, employeeCode, timezone, status },
                    preferences: { theme, dailyDigest, dueAlerts, signature },
                }),
            });
            if (!res.ok) throw new Error("Save failed");

            setMsg("✅ Profile updated!");
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
            {/* LEFT: Identity Card */}
            <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-6">
                <div className="relative">
                    <div className="h-24 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500" />
                    <div className="absolute left-5 top-12 flex items-end gap-4">
                        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-xl font-bold text-slate-900 ring-1 ring-slate-200 shadow-sm">
                            {initials}
                        </div>
                        <div className="pb-2">
                            <p className="text-sm font-semibold text-white/90">Employee Profile</p>
                            <p className="text-lg font-bold text-white">{name}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-12 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                            <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                                {roleLabel}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                            <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                {status}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                        <InfoRow label="Email" value={user.email} />
                        <InfoRow label="Department" value={department} />
                        <InfoRow label="Employee Code" value={employeeCode || "—"} />
                        <InfoRow label="Timezone" value={timezone} />
                        <InfoRow label="User ID" value={user.id ?? "—"} />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save profile"}
                    </button>

                    {msg && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {msg}
                        </div>
                    )}

                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        <p className="font-semibold">Internal note</p>
                        <p className="mt-1">
                            Your profile is used in approvals, audit logs, and report headers.
                        </p>
                    </div>
                </div>
            </aside>

            {/* RIGHT: Main content */}
            <section className="lg:col-span-2 space-y-6">
                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-2">
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5"
                        >
                            <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                    {s.hint}
                                </span>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{s.value}</p>
                            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                                <div className="h-1.5 w-2/3 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Profile Settings */}
                <Section title="Profile details" subtitle="Update your internal directory information.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Full name">
                            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                        </Field>

                        <Field label="Phone">
                            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                        </Field>

                        <Field label="Department">
                            <select className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
                                <option>Accounts</option>
                                <option>Finance</option>
                                <option>Sales</option>
                                <option>Operations</option>
                                <option>Admin</option>
                            </select>
                        </Field>

                        <Field label="Employee Code">
                            <input className={inputCls} value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="EMP-1023" />
                        </Field>

                        <Field label="Timezone">
                            <select className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                <option value="Europe/London">Europe/London</option>
                                <option value="America/New_York">America/New_York</option>
                            </select>
                        </Field>

                        <Field label="Availability status">
                            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                                <option value="Active">Active</option>
                                <option value="Busy">Busy</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                        </Field>
                    </div>
                </Section>

                {/* Preferences */}
                <Section
                    title="Work preferences"
                    subtitle="Personal view preferences for the Accounts dashboard."
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

                        <Field label="Default date format">
                            <select className={inputCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </Field>

                        <Field label="Default currency">
                            <select className={inputCls} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="AED">AED</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </Field>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-900">Email preferences</p>
                            <div className="mt-3 space-y-3">
                                <Toggle title="Daily digest" checked={dailyDigest} onChange={setDailyDigest} />
                                <Toggle title="Due date alerts" checked={dueAlerts} onChange={setDueAlerts} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <Field label="Email signature (used in reminders/export emails)">
                            <textarea
                                className={`${inputCls} h-28`}
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                            />
                        </Field>
                    </div>
                </Section>

                {/* Quick Actions */}
                <Section
                    title="Quick actions"
                    subtitle="Fast shortcuts used by Accounts team."
                    accent="from-indigo-600 to-sky-600"
                >
                    <div className="grid gap-3 md:grid-cols-3">
                        <ActionCard title="Create Inflow" desc="Record incoming cash/payment." pill="Inflow" />
                        <ActionCard title="Create Outflow" desc="Vendor payment / expense entry." pill="Outflow" />
                        <ActionCard title="Export Report" desc="Download monthly cash summary." pill="Report" />
                    </div>
                </Section>

                {/* Recent activity */}
                <Section title="Recent activity" subtitle="Audit-friendly trail of what you did recently.">
                    <div className="space-y-3">
                        {activity.map((a, idx) => (
                            <div
                                key={idx}
                                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{a.text}</p>
                                    <p className="mt-1 text-xs text-slate-500">{a.t}</p>
                                </div>
                                <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {a.badge}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>
            </section>
        </div>
    );
}

/* ---------- UI helpers ---------- */

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-slate-600">{label}</span>
            <span className="font-medium text-slate-900">{value}</span>
        </div>
    );
}

function Section({
    title,
    subtitle,
    accent = "from-sky-500 to-indigo-500",
    children,
}: {
    title: string;
    subtitle: string;
    accent?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
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

function Toggle({
    title,
    checked,
    onChange,
}: {
    title: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm text-slate-700">{title}</span>
            <input
                type="checkbox"
                className="h-5 w-5 accent-indigo-600"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </label>
    );
}

function ActionCard({ title, desc, pill }: { title: string; desc: string; pill: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                    {pill}
                </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100">
                <div className="h-1.5 w-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500" />
            </div>
        </div>
    );
}

const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
