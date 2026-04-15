"use client";

export default function RightPanel({
  salesOrderCount,
  outstandingCount,
  planningRows,
  onOpenPlanning,
}: any) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Planning</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Full screen form open karo for better UX.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPlanning}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm
                     hover:bg-gray-800 active:scale-[0.99]
                     dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Create Planning
        </button>
      </div>

      <div
        className="mt-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 text-sm text-gray-700
                   dark:border-gray-700 dark:from-gray-950 dark:to-gray-900 dark:text-gray-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-300">Sales Orders loaded</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{salesOrderCount}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-300">Outstanding rows loaded</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{outstandingCount}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-300">Planning rows (current)</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{planningRows}</span>
        </div>
      </div>
    </section>
  );
}
