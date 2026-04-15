"use client";

import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card px-8 py-10">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">
              {process.env.NEXT_PUBLIC_APP_NAME?.[0] || "S"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing you agree to our{" "}
          <Link href="#" className="underline hover:text-slate-300">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline hover:text-slate-300">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
