// components/planning/PlanningWorkspace.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { SalesOrder, OutstandingData, PlanningLine } from "@/types";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchPlannedData } from "@/store/slices/planningDataSlice";

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

  const dispatch = useAppDispatch();

  // Load all planned data for edit dropdowns
  const allPlannedData = useAppSelector((s: any) => s.planningData.items) as any[];

  useEffect(() => {
    dispatch(fetchPlannedData());
  }, [dispatch]);

  // ✅ Edit by Sales Order
  const [editSalesOrder, setEditSalesOrder] = useState("");
  const [loadingSO, setLoadingSO] = useState(false);
  const [editLot, setEditLot] = useState("");
  const [loadingLot, setLoadingLot] = useState(false);

  // Derive unique Sales Orders from planned data
  const editSalesOrderOptions = useMemo(() => {
    const map = new Map<string, string>();
    (allPlannedData ?? []).forEach((item: any) => {
      const so = String(item.sales_order_no ?? "").trim();
      const buyer = String(item.buyer_name ?? "").trim();
      if (so && !map.has(so)) {
        map.set(so, buyer);
      }
    });

    return Array.from(map.entries()).map(([so, buyer]) => ({
      sales_order: so,
      buyer: buyer,
    })).sort((a, b) => a.sales_order.localeCompare(b.sales_order));
  }, [allPlannedData]);

  // Derive Lots for the selected Sales Order
  const editLotOptions = useMemo(() => {
    if (!editSalesOrder) return [];
    const lots = (allPlannedData ?? [])
      .filter((item: any) => String(item.sales_order_no ?? "").trim() === editSalesOrder)
      .map((item: any) => String(item.lot_no ?? "").trim())
      .filter(Boolean);
    return Array.from(new Set(lots)).sort();
  }, [allPlannedData, editSalesOrder]);

  // ----- Indexes -----
  const salesOrderIndex = useMemo(() => {
    const m = new Map<string, SalesOrder>();
    for (const so of salesOrderData ?? []) {
      m.set(String(so.sales_order ?? "").trim(), so);
    }
    return m;
  }, [salesOrderData]);

  const salesOrderOptions = useMemo(() => {
    // 1. Get all active SO strings for lookup
    const activeSOStrings = new Set(
      (salesOrderData ?? []).map((so: any) => String(so.sales_order ?? so.sales_order_no ?? "").trim())
    );
    

    // 2. Create merged list starting with active data
    const merged = [...(salesOrderData ?? [])];

    // 3. Add SOs from current lines that aren't in active list (historical)
    for (const line of lines) {
      const soVal = String(line.sales_order ?? "").trim();
      if (soVal && !activeSOStrings.has(soVal)) {
        merged.push({ sales_order: soVal, buyer: line.buyer } as any);
        activeSOStrings.add(soVal);
      }
    }

    return merged;
  }, [salesOrderData, lines]);


  const outstandingIndex = useMemo(() => {
    const m = new Map<string, number>();

    for (const r of outstandingData ?? []) {
      const itemR = r as any;
      // 'Try-all' defensive lookup for lot and warehouse
      const lot = itemR?.lot_no ?? itemR?.lot_number ?? itemR?.lot;
      const wh = itemR?.warehouse_location ?? itemR?.wh_name_lot_location ?? itemR?.warehouse ?? itemR?.wh;

      const key = makeKey(lot, wh);
      const qty = Number(itemR?.outstanding_stock ?? 0) || 0;
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

  // ✅ Load planning lines by Sales Order (edit flow) - NOW CLIENT SIDE
  function loadPlanningBySalesOrder(soOverride?: string) {
    const so = (soOverride ?? editSalesOrder).trim();
    if (!so) return;

    const tId = toast.loading("Loading planning (local)...");

    // Filter local Redux state
    const matches = (allPlannedData ?? []).filter((item: any) => {
      const itemSO = String(item.sales_order ?? item.sales_order_no ?? "").trim();
      return itemSO === so;
    });

    if (matches.length === 0) {
      toast.dismiss(tId);
      toast.error(`No entries found for Sales Order: ${so}`);
      return;
    }

    setEditSalesOrder(so);
    setPlanner(String(matches[0]?.planning_submitted_by ?? ""));

    const buyerFromSO = salesOrderIndex.get(so)?.buyer ?? "";

    const normalized = matches.map((item: any) => {
      const lot = String(item.lot_no ?? item.lot_number ?? item.lot ?? "").trim();
      const wh = String(item.wh_name_lot_location ?? item.warehouse ?? item.warehouse_location ?? "").trim();
      const max = outstandingIndex.get(makeKey(lot, wh)) ?? 0;

      return {
        ...emptyLine(),
        _rowNumber: item._rowNumber,
        _uid: String(item.uid ?? ""),
        sales_order: String(item.sales_order ?? item.sales_order_no ?? so),
        buyer: String(item.buyer_name ?? item.buyer ?? buyerFromSO ?? ""),
        lot,
        warehouse: wh,
        quality: String(item.quality_name ?? item.quality ?? ""),
        bags_for_planning: Number(item.number_of_planned_bags ?? item.planned_bags ?? 0),
        total_bags: max,
      };
    });

    setLines(normalized);
    toast.dismiss(tId);
    toast.success(`Loaded ${matches.length} rows for SO ${so}`);
  }

  // ✅ Load planning lines by Lot (edit flow) - NOW CLIENT SIDE
  function loadPlanningByLot(lotOverride?: string) {
    const lotInput = (lotOverride ?? editLot).trim();
    if (!lotInput) return;

    const tId = toast.loading("Loading planning (local)...");

    // Filter local Redux state
    const matches = (allPlannedData ?? []).filter((item: any) => {
      const itemLot = String(item.lot_no ?? item.lot_number ?? item.lot ?? "").trim();
      return itemLot === lotInput;
    });

    if (matches.length === 0) {
      toast.dismiss(tId);
      toast.error(`No entries found for Lot: ${lotInput}`);
      return;
    }

    setEditLot(lotInput);
    const so = String(matches[0]?.sales_order_no ?? matches[0]?.sales_order ?? "").trim();
    if (so) setEditSalesOrder(so);
    setPlanner(String(matches[0]?.planning_submitted_by ?? ""));

    const buyerFromSO = so ? (salesOrderIndex.get(so)?.buyer ?? "") : "";

    const normalized = matches.map((item: any) => {
      const lot = String(item.lot_no ?? "").trim();
      const wh = String(item.wh_name_lot_location ?? "").trim();
      const max = outstandingIndex.get(makeKey(lot, wh)) ?? 0;

      return {
        ...emptyLine(),
        _rowNumber: item._rowNumber,
        _uid: String(item.uid ?? ""),
        sales_order: String(item.sales_order_no ?? so),
        buyer: String(item.buyer_name ?? buyerFromSO ?? ""),
        lot,
        warehouse: wh,
        quality: String(item.quality_name ?? ""),
        bags_for_planning: Number(item.number_of_planned_bags ?? 0),
        total_bags: max,
      };
    });

    setLines(normalized);
    toast.dismiss(tId);
    toast.success(`Loaded ${matches.length} rows for Lot ${lotInput}`);
  }

  // ✅ Handle row deletion (Local or Permanent)
  async function handleDeletePlanningLine(idx: number) {
    const line = lines[idx];
    const isEditMode = planningMode === "edit";

    // 1. Create mode: just remove from state
    if (!isEditMode) {
      setLines((prev) => (prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== idx)));
      return;
    }

    // 2. Edit mode: Permanent deletion from Sheets
    const rowNumber = (line as any)._rowNumber;
    if (!rowNumber) {
      // Safety: if row number is missing, just remove from UI
      setLines((prev) => (prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== idx)));
      return;
    }

    const confirmMsg = `Are you sure you want to PERMANENTLY delete this record?\n\n` +
      `Sales Order: ${line.sales_order}\n` +
      `Lot: ${line.lot}\n` +
      `Bags: ${line.bags_for_planning}\n\n` +
      `This action cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    const tId = toast.loading("Deleting planning record...");

    try {
      const url = new URL("/api/planned-data", window.location.origin);
      url.searchParams.set("rowNumber", String(rowNumber));

      const res = await fetch(url.toString(), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        toast.dismiss(tId);
        toast.error(data?.message || "Delete failed");
        return;
      }

      toast.dismiss(tId);
      toast.success("Record deleted successfully");

      // IMPORTANT: Refresh global data because all row numbers below the deleted one have shifted!
      dispatch(fetchPlannedData());

      // Remove from UI
      const result = lines.filter((_, i) => i !== idx);
      setLines(result.length ? result : [emptyLine()]);

    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e?.message || "Network error during delete");
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

      if (!(bags >= 0)) {
        toast.error(`Row ${rowNo}: Bags cannot be negative`);
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

      // ✅ Refresh global data so client-side search is updated
      dispatch(fetchPlannedData());
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
        onDeleteLine={handleDeletePlanningLine}
        // ✅ now edit uses sales order
        editSalesOrder={editSalesOrder}
        setEditSalesOrder={setEditSalesOrder}
        loadingSO={loadingSO}
        onLoadSO={loadPlanningBySalesOrder}
        editSalesOrderOptions={editSalesOrderOptions}

        // ✅ NEW: lot based edit load
        editLot={editLot}
        setEditLot={setEditLot}
        loadingLot={loadingLot}
        onLoadLot={loadPlanningByLot}
        editLotOptions={editLotOptions}
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
