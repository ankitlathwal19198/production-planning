"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

type CurrentUser =
  | {
    sub: string;
    email: string;
    name: string;
    role: string;
    iat: number;
    exp: number;
  }
  | null;

const NAV = [
  {
    href: "/planning-form",
    label: "Planning",
    items: [
      // { href: "/inflow/add", label: "➕ Add Inflow" },
      // { href: "/inflow/list", label: "📄 All Inflows" },
      // { href: "/inflow/categories", label: "🏷️ Categories" },
    ],
  },
  {
    href: "/backend/planning-entries",
    label: "Data Base",
    items: [
      { href: "/backend/planning-entries", label: "Planning Entries" },
    ],
  },
] as const;

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function RolePill({ role }: { role?: string }) {
  const r = (role || "User");
  const isAdmin = r === "Admin";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        isAdmin
          ? "bg-fuchsia-500/10 text-fuchsia-700 ring-fuchsia-500/20 dark:text-fuchsia-300"
          : "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300"
      )}
    >
      {isAdmin ? "Admin" : r}
    </span>
  );
}

function NavItem({
  href,
  label,
  items,
}: {
  href: string;
  label: string;
  items?: ReadonlyArray<{ href: string; label: string }>;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const hasItems = (items?.length || 0) > 0;

  return (
    <div className="relative group">
      <Link
        href={href}
        className={cn(
          "relative inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200",
          active
            ? "text-blue-700 bg-blue-500/10 ring-1 ring-blue-500/20 dark:text-sky-300 dark:bg-sky-400/10 dark:ring-sky-400/20"
            : "text-slate-700 hover:text-slate-900 hover:bg-slate-500/5 dark:text-slate-200 dark:hover:bg-white/5"
        )}
      >
        {label}
        {hasItems ? (
          <span className="text-xs opacity-70 transition-transform duration-200 group-hover:rotate-180">
            ▾
          </span>
        ) : null}
      </Link>

      {/* Dropdown (hover) */}
      {hasItems ? (
        <div className="absolute left-0 top-full">
          {/* hover bridge (prevents close while moving cursor down) */}
          <div className="h-3 w-56" />

          <div
            className={cn(
              "w-56 overflow-hidden rounded-2xl",
              "bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/10",
              "dark:bg-slate-900/90 dark:ring-white/10",
              "origin-top-left",
              "pointer-events-none opacity-0 translate-y-1 scale-95",
              "transition-all duration-200",
              "group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
            )}
          >
            <div className="py-2">
              {items!.map((it) => {
                const isSubActive = pathname === it.href;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "block px-4 py-2.5 text-sm font-medium transition-colors",
                      isSubActive
                        ? "bg-blue-500/10 text-blue-700 dark:text-sky-300"
                        : "text-slate-700 hover:bg-slate-500/5 dark:text-slate-200 dark:hover:bg-white/5"
                    )}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}


function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      // bg-slate-500/5 hover:bg-slate-500/10
      className="
        relative inline-flex h-9 w-9 items-center justify-center rounded-full
        ring-1 ring-slate-900/10
        transition-all
        dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10
      "
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      <span
        className={cn(
          "absolute text-[16px] transition-all duration-300",
          isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}
      >
        ☀️
      </span>
      <span
        className={cn(
          "absolute text-[16px] transition-all duration-300",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        )}
      >
        🌙
      </span>
    </button>
  );
}

function Bell({ count }: { count: number }) {
  return (
    <button
      className="
        relative inline-flex h-9 w-9 items-center justify-center rounded-xl
        bg-slate-500/5 hover:bg-slate-500/10
        ring-1 ring-slate-900/10
        transition-all
        dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10
      "
      title="Notifications"
      aria-label="Notifications"
    >
      <span className="text-[16px]">🔔</span>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

export default function Navbar({ user }: { user: CurrentUser }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.name || "User";
  const email = user?.email || "";
  const role = user?.role || "user";
  const avatar = useMemo(() => initials(displayName), [displayName]);

  // Demo notifications count (you can wire real count later)
  const notifCount = 2;

  // Close dropdown on outside click + ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (mobileOpen && mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mobileOpen]);

  const handleLogout = async () => {
    if (!user) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <nav
      className="
        sticky top-0 z-40
        border-b border-slate-900/5
        bg-white/70 backdrop-blur-xl
        shadow-sm
        dark:border-white/10 dark:bg-slate-950/70
      "
    >
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/5 hover:bg-slate-500/10 ring-1 ring-slate-900/10 dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            title="Menu"
          >
            <span className="text-[16px]">☰</span>
          </button>

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold shadow">
              P
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              Production<span className="text-slate-500 dark:text-slate-300"></span>
            </span>
          </Link>
        </div>

        {/* Nav (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {user
            ? NAV.map((n) => (
              <NavItem key={n.href} href={n.href} label={n.label} items={n.items} />
            ))
            : null}
        </div>


        {/* Actions */}
        <div className="relative flex items-center gap-2" ref={menuRef}>
          <ThemeToggle />
          {/* <Bell count={notifCount} /> */}

          <button
            onClick={user ? () => setOpen((v) => !v) : undefined}
            aria-label="Open profile menu"
            className="
              relative flex h-9 w-9 items-center justify-center
              rounded-full
              bg-gradient-to-br from-emerald-400 to-emerald-600
              text-sm font-bold text-white
              shadow-sm
              ring-1 ring-emerald-600/40
              transition-all duration-200
              hover:scale-[1.03] hover:shadow
              active:scale-[0.98]
              dark:ring-emerald-400/40
            "
          >
            {avatar}
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950" />
          </button>


          {/* Animated Dropdown */}
          {user ? (
            <div
              className={cn(
                "absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl",
                "bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/10",
                "dark:bg-slate-900/90 dark:ring-white/10",
                "origin-top-right transition-all duration-200",
                open ? "scale-100 opacity-100 translate-y-0" : "pointer-events-none scale-95 opacity-0 -translate-y-1"
              )}
            >
              <div className="border-b border-slate-900/5 px-5 py-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                  </div>
                  <RolePill role={role} />
                </div>
              </div>

              <div className="py-2">
                {[
                  ["/profile", "👤 Profile"],
                  ["/settings", "⚙️ Settings"],
                  ["/policies", "📄 Policies"],
                  role.toLowerCase() === "super admin" ? ["/super-admin", "🛠 Dev Mode"] : ['', ''],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="
                    block px-5 py-2.5 text-sm font-medium
                    text-slate-700 hover:bg-slate-500/5
                    dark:text-slate-200 dark:hover:bg-white/5
                  "
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-slate-900/5 dark:border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full px-5 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-500/10"
                >
                  ⏻ Sign out
                </button>
              </div>
            </div>)
            : null}
        </div>
      </div>

      {/* Mobile slide-over */}
      <div className={cn("md:hidden fixed inset-0 z-50", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        {/* backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />
        {/* panel */}
        <div
          ref={mobileRef}
          className={cn(
            "absolute left-0 top-0 h-full w-[84%] max-w-sm",
            "bg-white/95 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl",
            "dark:bg-slate-950/95 dark:ring-white/10",
            "transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-900/5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold shadow">
                A
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">Menu</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/5 hover:bg-slate-500/10 ring-1 ring-slate-900/10 dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="px-3 py-3">
            <div className="mb-3 rounded-2xl bg-slate-500/5 ring-1 ring-slate-900/10 p-3 dark:bg-white/5 dark:ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">
                  {avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                    <RolePill role={role} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-1">
              {user
                ? NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                      "text-slate-700 hover:bg-slate-500/5 hover:text-slate-900",
                      "dark:text-slate-200 dark:hover:bg-white/5"
                    )}
                  >
                    {n.label}
                  </Link>
                )) : null}
            </div>


            <div className="mt-4 flex items-center gap-2">
              <ThemeToggle />
              <Bell count={notifCount} />
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
