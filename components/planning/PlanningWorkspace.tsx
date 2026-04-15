// components/planning/PlanningWorkspace.tsx
"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { SalesOrder, OutstandingData, PlanningLine } from "@/types";
import { useAppSelector } from "@/store/hooks";

import LeftInventoryPanel from "./LeftInventoryPanel";
import RightPanel from "./RightPanel";
import PlanningFormModal from "./PlanningFormModal";

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

const emptyLine = (): PlanningLine => ({
  sales_order: "",
  buyer: "",
  lot: "",
  quality: "",
  warehouse: "",
  bags_for_planning: 0,
  total_bags: 0,
});

export default function PlanningWorkspace({ user }: { user: CurrentUser }) {
  // Redux data
  const outstandingData = useAppSelector((s) => s.outstandingStock.items) as OutstandingData[];
  const salesOrderData = useAppSelector((s) => s.salesOrder.items) as SalesOrder[];

  const [submitting, setSubmitting] = useState(false);

  // current user (safe)
  const userEmail = useAppSelector((s: any) => s.auth?.user?.email ?? "");
  const userName = useAppSelector((s: any) => s.auth?.user?.name ?? "");

  // optional users directory (if exists in store)
  const usersDirectory = useAppSelector((s: any) => s.users?.items ?? []);
  const currentUser = useMemo(() => {
    return (usersDirectory ?? []).find((u: any) => u.email === user?.email);
  }, [usersDirectory, user?.email]);

  // LEFT SIDE
  const [selectedQuality, setSelectedQuality] = useState("");

  // MODAL
  const [openPlanning, setOpenPlanning] = useState(false);
  const [planningMode, setPlanningMode] = useState<"create" | "edit">("create");

  // PLANNING LINES
  const [lines, setLines] = useState<PlanningLine[]>([emptyLine()]);

  // Planner select
  const [planner, setPlanner] = useState<string>(userName || "");

  // ✅ Edit by Sales Order
  const [editSalesOrder, setEditSalesOrder] = useState("");
  const [loadingSO, setLoadingSO] = useState(false);
  const [editLot, setEditLot] = useState("");
  const [loadingLot, setLoadingLot] = useState(false);

  // ----- Indexes -----
  const salesOrderIndex = useMemo(() => {
    const m = new Map<string, SalesOrder>();
    for (const so of salesOrderData ?? []) {
      m.set(String(so.sales_order ?? "").trim(), so);
    }
    return m;
  }, [salesOrderData]);

  const salesOrderOptions = useMemo(() => salesOrderData ?? [], [salesOrderData]);


  const outstandingIndex = useMemo(() => {
    const m = new Map<string, number>();

    for (const r of outstandingData ?? []) {
      const lot = r?.lot_no;
      const wh = r?.warehouse_location; // defensive
      const key = makeKey(lot, wh);
      const qty = Number(r?.outstanding_stock ?? 0) || 0;
      m.set(key, (m.get(key) ?? 0) + qty);
    }

    return m;
  }, [outstandingData]);

  // console.log(outstandingIndex)

  // planner dropdown options
  const plannerOptions = useMemo(() => {
    const allowedNames: string[] = Array.isArray(currentUser?.allowed_users)
      ? currentUser.allowed_users
      : [];
    return allowedNames;
  }, [usersDirectory, currentUser?.allowed_users, userEmail, userName]);

  // Quality dropdown (left panel)
  const qualityOptions = useMemo(() => {
    const set = new Set(
      (outstandingData ?? []).map((r: any) => String(r.quality_name || "")).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [outstandingData]);

  // filtered inventory (left table)
  const filteredInventory = useMemo(() => {
    if (!selectedQuality) return [];
    return (outstandingData ?? [])
      .filter((r: any) => String(r.quality_name) === selectedQuality)
      .sort((a: any, b: any) => Number(a.lot_no) - Number(b.lot_no));
  }, [outstandingData, selectedQuality]);

  function resetModalState() {
    setLines([emptyLine()]);
    setPlanner(userName || "");
    setSubmitting(false);

    setEditSalesOrder("");
    setLoadingSO(false);

    // ✅ add this
    setEditLot("");
    setLoadingLot(false);
  }

  // ✅ Load planning lines by Sales Order (edit flow)
  async function loadPlanningBySalesOrder() {
    const so = editSalesOrder.trim();
    if (!so) {
      toast.error("Sales Order enter karo");
      return;
    }

    setLoadingSO(true);
    const tId = toast.loading("Loading planning...");

    try {
      const url = new URL("/api/planned-data", window.location.origin);
      url.searchParams.set("sales_order", so);

      const res = await fetch(url.toString(), { method: "GET" });
      const data = await res.json().catch(() => ({}));

      console.log("SO : ", data)

      if (!res.ok || data?.ok === false) {
        toast.dismiss(tId);
        toast.error(data?.message || "Sales Order not found / load failed");
        return;
      }

      setEditSalesOrder(so);
      setPlanner(data?.planner ?? "");

      const buyerFromSO = salesOrderIndex.get(so)?.buyer ?? "";

      const loaded: any[] = Array.isArray(data?.lines) ? data.lines : [];

      const normalized = (loaded.length ? loaded : [emptyLine()]).map((ln: any) => {
        // const lot = String(ln.lot ?? "");
        // const wh = String(ln.warehouse ?? "");


        const lot = String(ln.lot ?? "").trim();
        const wh = String(ln.warehouse ?? ln.warehouse_location ?? "").trim();

        const max = outstandingIndex.get(makeKey(lot, wh)) ?? 0;


        // ✅ compute max from outstanding
        // const max = (outstandingData ?? []).reduce((s: number, r: any) => {
        //   return String(r.lot_no) === lot && String(r.warehouse_location) === wh
        //     ? s + Number(r.outstanding_stock ?? 0)
        //     : s;
        // }, 0);

        return {
          ...emptyLine(), // ✅ ensures missing keys exist
          ...ln,
          sales_order: String(ln.sales_order ?? so), // ✅ force SO (key fix)
          buyer: String(ln.buyer ?? buyerFromSO ?? ""), // ✅ autofill buyer
          lot,
          warehouse: wh,
          total_bags: max,
          // ✅ safety clamp
          bags_for_planning: Math.min(Number(ln.bags_for_planning ?? 0), max || Number.MAX_SAFE_INTEGER),
        };
      });

      setLines(normalized);

      toast.dismiss(tId);
      toast.success(`Loaded Sales Order: ${so}`);
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e?.message || "Network error");
    } finally {
      setLoadingSO(false);
    }
  }

  // ✅ Load planning lines by Lot (edit flow)
  async function loadPlanningByLot() {
    const lotInput = editLot.trim();
    if (!lotInput) {
      toast.error("Lot enter karo");
      return;
    }

    setLoadingLot(true);
    const tId = toast.loading("Loading planning (lot)...");

    try {
      const url = new URL("/api/planned-data", window.location.origin);
      url.searchParams.set("lot", lotInput);

      const res = await fetch(url.toString(), { method: "GET" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        toast.dismiss(tId);
        toast.error(data?.message || "Lot not found / load failed");
        return;
      }

      setEditLot(lotInput);

      // If API returns planner / sales_order, sync them
      if (data?.planner) setPlanner(String(data.planner));
      if (data?.sales_order) setEditSalesOrder(String(data.sales_order));

      const so = String(data?.sales_order ?? editSalesOrder ?? "").trim();
      const buyerFromSO = so ? (salesOrderIndex.get(so)?.buyer ?? "") : "";

      const loaded: any[] = Array.isArray(data?.lines) ? data.lines : [];

      const normalized = (loaded.length ? loaded : [emptyLine()]).map((ln: any) => {
        const lot = String(ln.lot ?? lotInput);
        const wh = String(ln.warehouse ?? "");

        const max = (outstandingData ?? []).reduce((s: number, r: any) => {
          return String(r.lot_no) === lot && String(r.warehouse_location) === wh
            ? s + Number(r.outstanding_stock ?? 0)
            : s;
        }, 0);

        const finalSO = String(ln.sales_order ?? so ?? "");

        return {
          ...emptyLine(),
          ...ln,
          sales_order: finalSO,
          buyer: String(ln.buyer ?? buyerFromSO ?? ""),
          lot,
          warehouse: wh,
          total_bags: max,
          bags_for_planning: Math.min(
            Number(ln.bags_for_planning ?? 0),
            max || Number.MAX_SAFE_INTEGER
          ),
        };
      });

      setLines(normalized);

      toast.dismiss(tId);
      toast.success(`Loaded Lot: ${lotInput}`);
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e?.message || "Network error");
    } finally {
      setLoadingLot(false);
    }
  }

  // ----- Submit validation + submit -----
  async function submitPlanning() {
    const isEditMode = planningMode === "edit";

    if (!planner) {
      toast.error("Planner / यूज़र select karo");
      return;
    }

    // ✅ In edit mode Sales Order required (key)
    if (isEditMode && !editSalesOrder.trim()) {
      toast.error("Edit ke liye Sales Order required");
      return;
    }

    // ✅ validate rows
    for (const [i, line] of lines.entries()) {
      const rowNo = i + 1;

      if (!line.sales_order || !line.lot || !line.warehouse) {
        toast.error(`Row ${rowNo}: Sales Order / Lot / Warehouse required`);
        return;
      }

      const max = Number(line.total_bags ?? 0);
      const bags = Number(line.bags_for_planning ?? 0);

      // Create flow strict max check
      if (!isEditMode) {
        if (!(max > 0)) {
          toast.error(`Row ${rowNo}: Outstanding (Max) is 0`);
          return;
        }
        if (bags > max) {
          toast.error(`Row ${rowNo}: Bags cannot exceed Max (${max})`);
          return;
        }
      }

      if (!(bags > 0)) {
        toast.error(`Row ${rowNo}: Bags must be > 0`);
        return;
      }
    }

    setSubmitting(true);
    const toastId = toast.loading(isEditMode ? "Updating planning..." : "Submitting planning...");

    try {
      const payload: any = {
        planner,
        plantName: currentUser?.plant_name || "",
        lines,
      };

      if (isEditMode) payload.sales_order = editSalesOrder.trim();

      const res = await fetch("/api/planned-data", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        toast.dismiss(toastId);
        toast.error(data?.message || (isEditMode ? "Planning update failed" : "Planning submit failed"));
        return;
      }

      toast.dismiss(toastId);
      if (isEditMode) {
        toast.success(`Planning updated (SO: ${editSalesOrder.trim()})`);
      } else {
        toast.success(`Planning submitted (UIDs: ${data?.uidFrom} → ${data?.uidTo})`);
      }

      setOpenPlanning(false);
      resetModalState();
      setPlanningMode("create");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600 p-5 text-white shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Planning Workspace</h1>
              <p className="text-white/80 text-sm">Inventory → pick lot/warehouse → create planning lines</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlanningMode("create");
                  // resetModalState();
                  setOpenPlanning(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium ring-1 ring-white/30 backdrop-blur hover:bg-white/20 active:scale-[0.99]"
              >
                Open Planning
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlanningMode("edit");
                  resetModalState();
                  setOpenPlanning(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium ring-1 ring-white/30 backdrop-blur hover:bg-white/20 active:scale-[0.99]"
              >
                Edit Planning
              </button>
            </div>
          </div>
        </div>

        {/* LEFT / RIGHT */}
        {/* <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"> */}
        <LeftInventoryPanel
          selectedQuality={selectedQuality}
          setSelectedQuality={setSelectedQuality}
          qualityOptions={qualityOptions}
          filteredInventory={filteredInventory}
        />

        {/* <RightPanel
            salesOrderCount={salesOrderData?.length ?? 0}
            outstandingCount={outstandingData?.length ?? 0}
            planningRows={lines.length}
            onOpenPlanning={() => {
              setPlanningMode("create");
              resetModalState();
              setOpenPlanning(true);
            }}
          /> */}
        {/* </div> */}

      </div>
      <PlanningFormModal
        open={openPlanning}
        mode={planningMode}
        onClose={() => setOpenPlanning(false)}
        outstandingData={outstandingData}
        salesOrderOptions={salesOrderOptions}
        salesOrderIndex={salesOrderIndex}
        planner={planner}
        setPlanner={setPlanner}
        plannerOptions={plannerOptions}
        lines={lines}
        setLines={setLines}
        emptyLine={emptyLine}
        submitting={submitting}
        onSubmit={submitPlanning}
        // ✅ now edit uses sales order
        editSalesOrder={editSalesOrder}
        setEditSalesOrder={setEditSalesOrder}
        loadingSO={loadingSO}
        onLoadSO={loadPlanningBySalesOrder}

        // ✅ NEW: lot based edit load
        editLot={editLot}
        setEditLot={setEditLot}
        loadingLot={loadingLot}
        onLoadLot={loadPlanningByLot}
      />
    </>
  );
}


const norm = (v: any) => String(v ?? "").trim().toUpperCase();

// Lot normalization: "0012" -> "12" (if your lots are numeric-like)
const normLot = (v: any) => {
  const s = String(v ?? "").trim();
  // keep as-is if non-numeric
  if (!/^\d+$/.test(s)) return s.toUpperCase();
  return String(Number(s)); // "0012" -> 12 -> "12"
};

const makeKey = (lot: any, wh: any) => `${normLot(lot)}|${norm(wh)}`;
