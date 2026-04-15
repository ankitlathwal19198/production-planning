"use client";

import { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type Pos = { top: number; left: number; width: number };
const toStr = (v: unknown) => (v == null ? "" : String(v));

export default function SearchableDropdown({
    value,
    options,
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    disabled = false,
    dropdownWidth = 360,
    dropdownMaxHeight = 320,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    dropdownWidth?: number;
    dropdownMaxHeight?: number;
}) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [open, setOpen] = useState(false);
    const [q, setQ] = useState<string>(() => toStr(value));
    const [pos, setPos] = useState<Pos>({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    useEffect(() => setQ(toStr(value)), [value]);

    const filtered = useMemo(() => {
        const query = toStr(q).trim().toLowerCase();
        const arr = options ?? [];
        if (!query) return arr.slice(0, 250);
        return arr
            .filter((x) => toStr(x).toLowerCase().includes(query))
            .slice(0, 250);
    }, [options, q]);

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
                        <div className="relative border-b border-gray-200 p-2 dark:border-gray-700">
                            <input
                                autoFocus
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-900 shadow-sm
               placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
               dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-indigo-400"
                            />

                            {/* ❌ clear button */}
                            {q && (
                                <button
                                    type="button"
                                    onClick={() => setQ("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1
                 text-gray-400 hover:bg-gray-100 hover:text-gray-600
                 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div style={{ maxHeight: dropdownMaxHeight }} className="overflow-auto">
                            {filtered.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No results</div>
                            ) : (
                                filtered.map((x, idx) => (
                                    <motion.button
                                        key={`${toStr(x)}-${idx}`}
                                        type="button"
                                        whileHover={{ scale: 1.01 }}
                                        onClick={() => {
                                            onChange(toStr(x));
                                            setOpen(false);
                                            setQ(toStr(x));
                                        }}
                                        className="w-full border-b border-gray-100 px-3 py-2 text-left
                                 hover:bg-indigo-50/40 dark:border-gray-800 dark:hover:bg-gray-800/60"
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{toStr(x)}</div>
                                    </motion.button>
                                ))
                            )}
                        </div>
                    </motion.div>
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
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setOpen((s) => !s);
                    setTimeout(() => computePos(), 0);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-900 shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60
                   dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-indigo-400"
            >
                {toStr(value) ? (
                    <span className="font-medium">{toStr(value)}</span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
                )}
            </button>

            {menu}
        </div>
    );
}
