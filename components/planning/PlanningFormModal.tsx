// components/planning/PlanningFormModal.tsx
"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SalesOrder, OutstandingData, PlanningLine } from "@/types";
import SalesOrderDropdown from "./SalesOrderDropdown";
import SearchableDropdown from "./SearchableDropdown";

function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
                d="M9 3h6m-8 4h10m-1 0-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7m3 4v8m6-8v8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function DuplicateIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
                d="M8 8h10v12H8V8Zm-2 8H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

type Props = {
    open: boolean;
    mode: "create" | "edit";
    onClose: () => void;

    outstandingData: OutstandingData[];
    salesOrderOptions: SalesOrder[];
    salesOrderIndex: Map<string, SalesOrder>;

    planner: string;
    setPlanner: (v: string) => void;
    plannerOptions: string[];

    lines: PlanningLine[];
    setLines: React.Dispatch<React.SetStateAction<PlanningLine[]>>;
    emptyLine: () => PlanningLine;

    submitting: boolean;
    onSubmit: () => void;
    onDeleteLine: (idx: number) => void;

    // ✅ edit-by-sales-order UI
    editSalesOrder: string;
    setEditSalesOrder: (v: string) => void;
    loadingSO: boolean;
    onLoadSO: (so?: string) => void | Promise<void>;

    editLot: string;
    setEditLot: (v: string) => void;
    loadingLot: boolean;
    onLoadLot: (lot?: string) => void | Promise<void>;

    // derived options for edit mode
    editSalesOrderOptions: any[];
    editLotOptions: string[];
};

export default function PlanningFormModal({
    open,
    mode,
    onClose,
    outstandingData,
    salesOrderOptions,
    salesOrderIndex,
    planner,
    setPlanner,
    plannerOptions,
    lines,
    setLines,
    emptyLine,
    submitting,
    onSubmit,
    onDeleteLine,
    editSalesOrder,
    setEditSalesOrder,
    loadingSO,
    onLoadSO,
    editLot,
    setEditLot,
    loadingLot,
    onLoadLot,
    editSalesOrderOptions,
    editLotOptions,
}: Props) {
    const isEditMode = mode === "edit";

    // ----- helpers -----
    const getLots = (data: any[]) =>
        [...new Set((data ?? []).map((r) => r.lot_no).filter(Boolean))].sort((a, b) => Number(a) - Number(b));

    const getQualityByLot = (data: any[], lot: any) => {
        const row = (data ?? []).find((r) => String(r.lot_no) === String(lot) && r.quality_name);
        return row?.quality_name ?? "";
    };

    const getWarehousesByLot = (data: any[], lot: any) =>
        [
            ...new Set(
                (data ?? [])
                    .filter((r) => String(r.lot_no) === String(lot))
                    .map((r) => r.warehouse_location)
                    .filter(Boolean)
            ),
        ].sort();

    const getOutstanding = (data: any[], lot: any, wh: any) =>
        (data ?? []).reduce(
            (s, r) =>
                String(r.lot_no) === String(lot) && String(r.warehouse_location) === String(wh)
                    ? s + Number(r.outstanding_stock ?? 0)
                    : s,
            0
        );

    // ----- styling (dark ready) -----
    const clsManual =
        "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
        "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-indigo-400";

    const clsAutoBuyer =
        "w-full rounded-xl border border-gray-200 bg-indigo-50 px-3 py-2 text-gray-800 " +
        "dark:border-gray-700 dark:bg-indigo-950/40 dark:text-indigo-100";

    const clsAutoQuality =
        "w-full rounded-xl border border-gray-200 bg-emerald-50 px-3 py-2 text-gray-800 " +
        "dark:border-gray-700 dark:bg-emerald-950/40 dark:text-emerald-100";

    // ----- line utilities -----
    const patchLine = (idx: number, patch: Partial<PlanningLine>) =>
        setLines((prev) => prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));

    const addRow = () => setLines((prev) => [...prev, emptyLine()]);
    const removeRow = (idx: number) =>
        setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
    const duplicateRow = (idx: number) => {
        setLines((prev) => {
            const base = prev[idx];
            const copy: PlanningLine = {
                ...base,
                // ✅ safety: ensure new object references
                // (agar PlanningLine me koi nested object/array ho to yahan deep clone kar sakte ho)
            };

            const next = [...prev];
            next.splice(idx + 1, 0, copy); // insert just below
            return next;
        });
    };

    // ----- handlers -----
    function handleSOChange(idx: number, so: string) {
        const key = String(so ?? "").trim();
        const soObj = salesOrderIndex.get(key);

        patchLine(idx, {
            sales_order: key,
            buyer: String((soObj as any)?.buyer ?? (soObj as any)?.buyer_name ?? ""),
            quality: "",
            lot: "",
            warehouse: "",
            total_bags: 0,
            bags_for_planning: "",
        });
    }

    function handleLotChange(idx: number, lot: string) {
        const q = getQualityByLot(outstandingData as any, lot);
        patchLine(idx, {
            lot,
            quality: q,
            warehouse: "",
            total_bags: 0,
            bags_for_planning: "",
        });
    }

    function handleWarehouseChange(idx: number, wh: string) {
        const lot = lines[idx]?.lot ?? "";
        const max = getOutstanding(outstandingData as any, lot, wh);
        const currentVal = lines[idx]?.bags_for_planning;
        const nextBags = currentVal === "" ? "" : Math.min(Number(currentVal ?? 0), max);
        patchLine(idx, {
            warehouse: wh,
            total_bags: max,
            bags_for_planning: nextBags,
        });
    }

    function handleBagsChange(idx: number, val: string) {
        if (val === "") {
            patchLine(idx, { bags_for_planning: "" });
            return;
        }
        const n = Number(val);
        patchLine(idx, { bags_for_planning: n < 0 ? 0 : n });
    }

    const lotOptions = useMemo(() => {
        // show only lots that actually have stock
        const rows = (outstandingData as any) ?? [];
        const lots = rows
            .filter((r: any) => Number(r.outstanding_stock ?? 0) > 0)
            .map((r: any) => String(r.lot_no ?? "").trim())
            .filter(Boolean);

        return Array.from(new Set(lots)).sort((a, b) => Number(a) - Number(b));
    }, [outstandingData]);

    return (
        <AnimatePresence>
            {open ? (
                <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />

                    {/* full screen sheet */}
                    <motion.div
                        className="absolute inset-0 bg-white dark:bg-gray-950"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    >
                        {/* header */}
                        <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600 px-5 py-4 text-white">
                            <div>
                                <h3 className="text-lg font-semibold">{isEditMode ? "Edit Planning" : "Planning Form"}</h3>
                                <p className="text-white/80 text-xs">SO → Buyer autofill, Lot → Quality autofill</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl bg-white/15 px-3 py-2 text-sm ring-1 ring-white/30 hover:bg-white/20"
                            >
                                Close
                            </button>
                        </div>

                        {/* body */}
                        <div className="h-[calc(100vh-64px)] overflow-auto p-4 bg-white dark:bg-gray-950">
                            {/* top bar */}
                            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Rows:{" "}
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {lines.length}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* ✅ Sales order loader in edit mode */}
                                    {isEditMode ? (
  <div className="flex flex-wrap items-center gap-3">
    {/* Sales order loader */}
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-700 dark:text-gray-200">Sales Order</label>
      <SalesOrderDropdown
        value={editSalesOrder}
        options={editSalesOrderOptions}
        onChange={(so) => {
          setEditSalesOrder(so);
          onLoadSO(so); // pass directly
          setEditLot(""); // clear lot on SO change
        }}
        dropdownWidth={320}
        dropdownMaxHeight={360}
        placeholder="Select Sales Order..."
      />
    </div>

    {/* ✅ Lot loader */}
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-700 dark:text-gray-200">Lot</label>
      <SearchableDropdown
        value={editLot}
        options={editLotOptions}
        onChange={(lot) => {
          setEditLot(lot);
          onLoadLot(lot); // pass directly
        }}
        dropdownWidth={320}
        dropdownMaxHeight={360}
        placeholder="Select Lot..."
      />

      <span className="ml-1 inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700
        dark:bg-amber-950/40 dark:text-amber-200">
        Edit Mode
      </span>
    </div>
  </div>
) : null}


                                    {/* planner */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-700 dark:text-gray-200">Planner / यूज़र</label>
                                        <select
                                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                                 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-indigo-400"
                                            value={planner}
                                            onChange={(e) => setPlanner(e.target.value)}
                                        >
                                            <option value="">Select user...</option>
                                            {plannerOptions.map((u, idx) => (
                                                <option key={idx} value={u}>
                                                    {u}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {!isEditMode && (
                                        <button
                                            type="button"
                                            className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800
             dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                            onClick={addRow}
                                        >
                                            Add Row
                                        </button>
                                    )}

                                </div>
                            </div>

                            {/* table */}
                            <div className="overflow-auto rounded-2xl border border-gray-200 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700">
                                <table className="min-w-[1300px] w-full text-sm text-gray-900 dark:text-gray-100">
                                    <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                        <tr className="text-left">
                                            <th className="p-3">#</th>
                                            <th className="p-3">Sales Order / सेल्स ऑर्डर</th>
                                            <th className="p-3">Buyer / खरीदार</th>
                                            <th className="p-3">Lot / लॉट</th>
                                            <th className="p-3">Quality / क्वालिटी</th>
                                            <th className="p-3">Warehouse / गोदाम</th>
                                            <th className="p-3">Bags / बैग</th>
                                            <th className="p-3">Max / अधिकतम</th>

                                            <th className="p-3 text-center">Action / एक्शन</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {lines.map((line, idx) => {

                                            const whOptions = getWarehousesByLot(outstandingData as any, line.lot);

                                            return (
                                                <motion.tr
                                                    key={`row-${idx}`}
                                                    className="align-top hover:bg-indigo-50/30 dark:hover:bg-gray-800/60"
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 8 }}
                                                    transition={{ duration: 0.18 }}
                                                >
                                                    <td className="p-3 font-medium text-gray-600 dark:text-gray-300">{idx + 1}</td>

                                                    <td className="p-3">
                                                        <SalesOrderDropdown
                                                            value={line.sales_order}
                                                            options={salesOrderOptions}
                                                            onChange={(so) => handleSOChange(idx, so)}
                                                            dropdownWidth={640}
                                                            dropdownMaxHeight={360}
                                                        // disabled={isEditMode} // ✅ lock in edit
                                                        />
                                                    </td>

                                                    <td className="p-3">
                                                        <input className={clsAutoBuyer} value={line.buyer ?? ""} readOnly />
                                                    </td>

                                                    {/* <td className="p-3">
                                                        <select
                                                            className={clsManual}
                                                            value={line.lot || ""}
                                                            disabled={!line.sales_order}
                                                            onChange={(e) => handleLotChange(idx, e.target.value)}
                                                        >
                                                            <option value="">{line.sales_order ? "Select..." : "Select SO first"}</option>
                                                            {lotOptions.map((x: any) => (
                                                                <option key={x} value={x}>
                                                                    {x}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td> */}

                                                    <td className="p-3">
                                                        <SearchableDropdown
                                                            value={line.lot || ""}
                                                            options={lotOptions.map(String)}
                                                            disabled={!line.sales_order}
                                                            placeholder={line.sales_order ? "Select..." : "Select SO first"}
                                                            searchPlaceholder="Search lot..."
                                                            dropdownWidth={320}
                                                            dropdownMaxHeight={360}
                                                            onChange={(v) => handleLotChange(idx, v)}
                                                        />
                                                    </td>


                                                    <td className="p-3">
                                                        <input className={clsAutoQuality} value={line.quality ?? ""} readOnly />
                                                    </td>

                                                    {/* <td className="p-3">
                                                        <select
                                                            className={clsManual}
                                                            value={line.warehouse || ""}
                                                            disabled={!line.lot}
                                                            onChange={(e) => handleWarehouseChange(idx, e.target.value)}
                                                        >
                                                            <option value="">{line.lot ? "Select..." : "Select Lot first"}</option>
                                                            {whOptions.map((x: any) => (
                                                                <option key={x} value={x}>
                                                                    {x}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td> */}

                                                    <td className="p-3">
                                                        <SearchableDropdown
                                                            value={line.warehouse || ""}
                                                            options={whOptions.map(String)}
                                                            disabled={!line.lot}
                                                            placeholder={line.lot ? "Select..." : "Select Lot first"}
                                                            searchPlaceholder="Search warehouse..."
                                                            dropdownWidth={360}
                                                            dropdownMaxHeight={360}
                                                            onChange={(v) => handleWarehouseChange(idx, v)}
                                                        />
                                                    </td>


                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className={clsManual}
                                                            value={line.bags_for_planning ?? ""}
                                                            disabled={!isEditMode && !line.total_bags}
                                                            onChange={(e) => handleBagsChange(idx, e.target.value)}
                                                        />
                                                         <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                             Max: {Number(line.total_bags ?? 0)}
                                                         </div>
                                                     </td>

                                                     <td className="p-3">
                                                        <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                                                            {Number(line.total_bags ?? 0)}
                                                        </span>
                                                    </td>

                                                    <td className="p-3 text-center">
                                                        <div className="inline-flex gap-2">
                                                            {!isEditMode && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => duplicateRow(idx)}
                                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                                                    title="Duplicate row"
                                                                >
                                                                    <DuplicateIcon />
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => onDeleteLine(idx)}
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 shadow-sm hover:bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                                                title={isEditMode ? "Delete Record Permanently" : "Remove Row"}
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        </div>
                                                    </td>


                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* footer */}
                            <div className="mt-4 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50
                             dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={onSubmit}
                                    disabled={submitting}
                                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:scale-[0.99] disabled:opacity-60
                             dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                >
                                    {submitting ? "Submitting..." : isEditMode ? "Update Planning" : "Submit Planning"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
