"use client";

import { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { SalesOrder } from "@/types";

type Pos = { top: number; left: number; width: number };

// ✅ helper: always return a safe string
const toStr = (v: unknown) => (v == null ? "" : String(v));

export default function SalesOrderDropdown({
  value,
  options,
  onChange,
  dropdownWidth = 520,
  dropdownMaxHeight = 320,
  placeholder = "Select...",
}: {
  value: string;
  options: any[]; // Changed from SalesOrder[] to any[] for flexibility
  onChange: (so: string) => void;
  dropdownWidth?: number;
  dropdownMaxHeight?: number;
  placeholder?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);

  // ✅ q must ALWAYS be a string
  const [q, setQ] = useState<string>(() => toStr(value));

  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ✅ make options unique by (sales_order + buyer)
  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: SalesOrder[] = [];

    for (const x of options ?? []) {
      const so = toStr((x as any).sales_order || (x as any).sales_order_no).trim();
      const buyer = toStr((x as any).buyer || (x as any).buyer_name).trim();
      const key = `${so}__${buyer}`; // unique key

      if (!so) continue; // optional: skip blank SOs
      if (seen.has(key)) continue;

      seen.add(key);
      out.push(x);
    }

    return out;
  }, [options]);

  // ✅ selectedObj match also string-safe (now from uniqueOptions)
  const selectedObj = useMemo(() => {
    const v = toStr(value).trim();
    return (uniqueOptions ?? []).find((x) => 
      toStr((x as any).sales_order || (x as any).sales_order_no).trim() === v
    );
  }, [uniqueOptions, value]);

  // ✅ filter only by sales_order OR buyer (brand/desc removed)
  const filtered = useMemo(() => {
    const query = toStr(q).trim().toLowerCase();
    const arr = uniqueOptions ?? [];
    if (!query) return arr.slice(0, 250);

    return arr
      .filter((x: any) => {
        const so = toStr(x.sales_order).toLowerCase();
        const buyer = toStr(x.buyer).toLowerCase();
        return so.includes(query) || buyer.includes(query);
      })
      .slice(0, 250);
  }, [uniqueOptions, q]);

  const computePos = () => {
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const gap = 8;

    const w = Math.min(dropdownWidth, window.innerWidth - 16);
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - 8 - w;
    if (left < 8) left = 8;

    const spaceBelow = window.innerHeight - r.bottom;
    const openDown = spaceBelow >= dropdownMaxHeight + 60;
    const top = openDown ? r.bottom + gap : Math.max(8, r.top - gap - dropdownMaxHeight);

    setPos({ top, left, width: w });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePos();

    const onScroll = () => computePos();
    const onResize = () => computePos();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dropdownWidth, dropdownMaxHeight]);

  // ✅ whenever parent value changes, sync q as string
  useEffect(() => {
    setQ(toStr(value));
  }, [value]);

  // outside click close
  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const menu = mounted
    ? createPortal(
        <AnimatePresence>
          {open ? (
            <>
              <div className="fixed inset-0 z-[9998] pointer-events-none" />
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="fixed z-[9999] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl
                           dark:border-gray-700 dark:bg-gray-900"
                style={{ top: pos.top, left: pos.left, width: pos.width }}
              >
                <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search SO / buyer..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm
                               placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                               dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-indigo-400"
                  />
                </div>

                <div style={{ maxHeight: dropdownMaxHeight }} className="overflow-auto">
                  {filtered.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No results</div>
                  ) : (
                    filtered.map((x: any, idx) => (
                      <motion.button
                        key={`${toStr(x.sales_order)}-${toStr(x.buyer)}-${idx}`}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        onClick={() => {
                          const so = toStr((x as any).sales_order || (x as any).sales_order_no);
                          onChange(so);
                          setOpen(false);
                          setQ(so);
                        }}
                        className="w-full border-b border-gray-100 px-3 py-2 text-left
                                   hover:bg-indigo-50/40 dark:border-gray-800 dark:hover:bg-gray-800/60"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {toStr(x.sales_order)}
                          </div>
                          <div className="text-xs text-gray-500 truncate dark:text-gray-400">
                            {toStr(x.buyer)}
                          </div>
                        </div>

                        {/* ❌ removed brand_name_quality_description line */}
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setOpen((s) => !s);
          setTimeout(() => computePos(), 0);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-900 shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-indigo-500
                   dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-indigo-400"
      >
        {selectedObj ? (
          <div className="truncate">
            <div className="font-medium">{toStr((selectedObj as any).sales_order || (selectedObj as any).sales_order_no)}</div>
            <div className="text-xs text-gray-500 truncate dark:text-gray-400">
              {toStr((selectedObj as any).buyer || (selectedObj as any).buyer_name)}
            </div>
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
        )}
      </button>

      {menu}
    </div>
  );
}
