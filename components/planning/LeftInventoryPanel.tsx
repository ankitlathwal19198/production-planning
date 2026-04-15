"use client";

import SearchableDropdown from "./SearchableDropdown";

export default function LeftInventoryPanel({
  selectedQuality,
  setSelectedQuality,
  qualityOptions,
  filteredInventory,
}: any) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Quality Inventory
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-300">
            Outstanding stock by lot & warehouse
          </p>
        </div>

        {/* <select
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-400"
          value={selectedQuality}
          onChange={(e) => setSelectedQuality(e.target.value)}
        >
          <option value="">Select quality...</option>
          {qualityOptions.map((q: string) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select> */}

        <div className="p-3">
          <SearchableDropdown
            value={selectedQuality || ""}
            options={qualityOptions.map(String)}
            placeholder={selectedQuality ? "Select..." : "Select Quality..."}
            searchPlaceholder="Search warehouse..."
            dropdownWidth={360}
            dropdownMaxHeight={360}
            onChange={(v) => setSelectedQuality(v)}
          />
        </div>

      </div>

      <div className="overflow-auto">
        <table className="min-w-[1100px] w-full text-sm text-gray-900 dark:text-gray-100">
          <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <tr className="text-left">
              <th className="p-3">#</th>
              <th className="p-3">Lot No.</th>
              <th className="p-3">Truck No.</th>
              <th className="p-3">Quality</th>
              <th className="p-3">Per Bag (kg)</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Warehouse</th>
              <th className="p-3">Approved</th>
              <th className="p-3">Unapproved</th>
              <th className="p-3">Outstanding</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {!selectedQuality ? (
              <tr>
                <td className="p-4 text-gray-500 dark:text-gray-300" colSpan={10}>
                  Select a quality to view inventory
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-500 dark:text-gray-300" colSpan={10}>
                  No rows for this quality
                </td>
              </tr>
            ) : (
              filteredInventory.map((r: any, idx: number) => (
                <tr
                  key={`${r.lot_no}-${r.warehouse_location}-${idx}`}
                  className="hover:bg-indigo-50/30 dark:hover:bg-gray-800/60"
                >
                  <td className="p-3 font-medium text-gray-600 dark:text-gray-300">{idx + 1}</td>
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{r.lot_no}</td>
                  <td className="p-3 whitespace-pre-line text-gray-700 dark:text-gray-200">{r.truck_no}</td>

                  <td className="p-3">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700
                                     dark:bg-indigo-950/40 dark:text-indigo-200">
                      {r.quality_name}
                    </span>
                  </td>

                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.per_bag_weight_in_kg}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.supplier_name}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.warehouse_location}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.planning_stock_approved}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.planning_stock_unapproved}</td>

                  <td className="p-3">
                    <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700
                                     dark:bg-emerald-950/40 dark:text-emerald-200">
                      {r.outstanding_stock}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
