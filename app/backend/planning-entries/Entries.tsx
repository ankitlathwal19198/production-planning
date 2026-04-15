"use client";

import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import SheetShell from "@/components/backend/SheetShell";
import SheetTable from "@/components/backend/SheetTable";
import { buildColumnsFromRows } from "@/components/backend/useColumns";

type User = {
  email?: string | null;
  name?: string | null;
  role?: string | null;
  uid?: string | null;
} | null;

export default function Sheet1PlanningDataClient({ user }: { user: User }) {
  const rows = useAppSelector((s) => (s.planningData.items as any[]) || []);
  const users = useAppSelector((s) => (s.users.items as any[]) || []);
  const currentUser = users.find(u => u.email === user?.email);

  const filteredRows = rows.filter(r => r.plant_name === currentUser?.plant_name);

  console.log("Planning Entries filteredRows:", filteredRows.slice(-50).sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")));

  console.log(rows)

  const columns = React.useMemo(
    () =>
      buildColumnsFromRows(filteredRows, [
        "uid",
        "timestamp",
        "sales_order_no",
        "buyer_name",
        "lot_no",
        "quality_name",
        "wh_name_lot_location",
        "number_of_planned_bags",
        "plant_name",
        "planning_submitted_by",
      ]),
    [rows]
  );

  return (
    <SheetShell
      title="Planning Entries"
      subtitle={`Redux: planningData.items • User: ${user?.email ?? "Guest"}`}
      right={
        <div className="rounded-xl bg-slate-900/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200">
          Planning Entries
        </div>
      }
    >
      <SheetTable columns={columns} rows={filteredRows.slice(-50)} rowKey={(r, i) => r?.ci ?? i} />
    </SheetShell>
  );
}
