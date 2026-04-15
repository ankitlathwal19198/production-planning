import LogoutButton from "@/components/LogoutButton";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SettingsClient from "./settings-client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  console.log("Current User in DashboardPage:", user);
  if (!user) redirect("/login");

  return (
    // <main className="card max-w-4xl mx-auto px-8 py-8">
    //   <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
    //     <div>
    //       <h1 className="text-2xl font-semibold">Dashboard</h1>
    //       <p className="text-sm text-slate-400">
    //         Welcome back, <span className="font-medium">{user.name}</span>.
    //       </p>
    //     </div>
        
    //     <LogoutButton />
    //   </header>

    //   <section className="grid gap-6 md:grid-cols-3">
    //     <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    //       <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
    //         Account
    //       </p>
    //       <p className="text-sm font-semibold mb-1">{user.email}</p>
    //       <p className="text-xs text-slate-500">Role: {user.role}</p>
    //     </div>

    //     <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    //       <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
    //         Plan
    //       </p>
    //       <p className="text-sm font-semibold mb-1">Starter (Free)</p>
    //       <p className="text-xs text-slate-500">
    //         Upgrade logic could be wired to another sheet tab.
    //       </p>
    //     </div>

    //     <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    //       <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
    //         API Backing
    //       </p>
    //       <p className="text-sm font-semibold mb-1">Google Sheets</p>
    //       <p className="text-xs text-slate-500">
    //         All users are stored in a Sheets tab via service account.
    //       </p>
    //     </div>
    //   </section>

    // </main>
      <SettingsClient user={user}/>
  );
}