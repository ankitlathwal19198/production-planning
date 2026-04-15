"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import AuthShell from "@/components/AuthShell";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/[0-9]/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(4, s);
}

export default function SignupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(true);

  const score = useMemo(() => passwordScore(pw), [pw]);
  const scoreLabel = ["Weak", "Fair", "Good", "Strong", "Strong"][score];
  const scoreClass =
    score <= 1
      ? "bg-rose-500/20 text-rose-200 ring-rose-500/25"
      : score === 2
        ? "bg-amber-500/20 text-amber-100 ring-amber-500/25"
        : score === 3
          ? "bg-sky-500/20 text-sky-100 ring-sky-500/25"
          : "bg-emerald-500/20 text-emerald-100 ring-emerald-500/25";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!agree) {
      toast.error("Please accept Terms & Privacy to continue.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating your account…");

    try {
      const formData = new FormData(e.currentTarget);
      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      function getKolkataTime() {
        const now = new Date();
        return now
          .toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(",", "");
      }
      const ts = getKolkataTime();

      const payload = { name, email, password, createdAt: ts };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };

      if (!res.ok) {
        const msg = data?.error || "Signup failed";
        setError(msg);
        toast.error(msg, { id: toastId });
        return;
      }

      toast.success("Account created! Welcome 👋", { id: toastId });
      router.push("/");
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your Accounts workspace"
      subtitle="Secure onboarding for finance teams — track inflow/outflow, invoices & entries in one place."
    >
      {/* SaaS-style top note */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 text-white ring-1 ring-white/10">
            ✨
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Setup takes under a minute
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Use your official email for access controls and audit logs.
            </p>
          </div>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Full name */}
        <div className="space-y-1">
          <label className="text-sm text-slate-300" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            className="input"
            placeholder="e.g. Sahil Kumar"
            autoComplete="name"
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm text-slate-300" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
          <p className="text-[12px] text-slate-400">
            We’ll use this for sign-in and account recovery.
          </p>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300" htmlFor="password">
              Password
            </label>

            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", scoreClass)}>
              {scoreLabel}
            </span>
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              className="input pr-12"
              minLength={6}
              placeholder="Create a strong password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          <p className="text-[12px] text-slate-400">
            Tip: 8+ chars, 1 uppercase, 1 number, 1 symbol.
          </p>
        </div>

        {/* Terms */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <div className="text-sm text-slate-300">
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-white hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-white hover:underline">
              Privacy Policy
            </Link>
            .
            <div className="mt-1 text-[12px] text-slate-400">
              Your activity may be logged for audit and compliance.
            </div>
          </div>
        </label>

        {/* Error */}
        {error && (
          <p className="text-sm text-rose-200 bg-rose-950/40 border border-rose-900/60 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        {/* Security note */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-white">Security</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-200 ring-1 ring-emerald-500/25">
              Enabled
            </span>
          </div>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-400">
            <li>JWT session cookies (HttpOnly)</li>
            <li>Role-based access control (RBAC)</li>
            <li>Audit-friendly actions</li>
          </ul>
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-white hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
