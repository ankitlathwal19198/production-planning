"use client";

import * as React from "react";

type Column = {
  key: string;
  label: string;
  width?: number;
};

export default function SheetTable({
  columns,
  rows,
  rowKey,
  showRowNumbers = true,
}: {
  columns: Column[];
  rows: any[];
  rowKey?: (row: any, idx: number) => string | number;
  showRowNumbers?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="max-h-[75vh] w-full overflow-auto">
        <table className="min-w-full w-full border-separate border-spacing-0 text-xs sm:text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-100/95 backdrop-blur dark:bg-slate-900/80">
              {/* Row number header = 0 */}
              {showRowNumbers ? (
                <th className="sticky left-0 z-30 px-2 py-2 text-left text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-white/10 bg-slate-100/95 backdrop-blur dark:bg-slate-900/80 w-[52px]">
                  0
                </th>
              ) : null}

              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 border-b border-white/10"
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {rows.length ? (
              rows.map((r, idx) => (
                <tr
                  key={rowKey ? rowKey(r, idx) : idx}
                  className={
                    idx % 2 === 0
                      ? "bg-white/30 dark:bg-white/0 hover:bg-slate-100/60 dark:hover:bg-white/5"
                      : "bg-white/10 dark:bg-white/0 hover:bg-slate-100/60 dark:hover:bg-white/5"
                  }
                >
                  {/* Row numbers start from 1 */}
                  {showRowNumbers ? (
                    <td className="sticky left-0 z-10 px-2 py-1.5 text-slate-600 dark:text-slate-300 bg-white/80 backdrop-blur dark:bg-slate-950/60 border-r border-white/10 w-[52px]">
                      {idx + 1}
                    </td>
                  ) : null}

                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-2 py-1.5 text-slate-800 dark:text-slate-200 whitespace-nowrap"
                      title={r?.[c.key] != null ? String(r?.[c.key]) : ""}
                    >
                      <div className="max-w-[24rem] truncate">
                        {r?.[c.key] == null || r?.[c.key] === "" ? "—" : String(r?.[c.key])}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (showRowNumbers ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300"
                >
                  No rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/10 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
        Showing {rows.length} rows
      </div>
    </div>
  );
}
