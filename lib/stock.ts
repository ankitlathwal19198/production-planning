// lib/stock.ts
// Plannable bags per (lot × warehouse), read from the Outstanding Stock sheet.

export type StockRow = {
  lot_no?: unknown;
  warehouse_location?: unknown;
  truck_no?: unknown;
  outstanding_stock?: unknown;
};

const normLot = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? String(Number(s)) : s.toUpperCase(); // "0021" -> "21"
};

const normWarehouse = (v: unknown) => String(v ?? "").trim().toUpperCase();

/** The key every stock lookup goes through, so create and edit always agree. */
export const stockKey = (lot: unknown, warehouse: unknown) => `${normLot(lot)}|${normWarehouse(warehouse)}`;

// Exact cell match: a merged truck cell that merely mentions it stays a truck row.
export const isDetailedEntryRow = (r: StockRow) => /^\s*see detailed entry\s*$/i.test(String(r.truck_no ?? ""));

/**
 * A processed lot can sit in one godown on two sheet rows: the truck-inward row
 * and a "See Detailed Entry" row. Both rows subtract the lot's full planning
 * (approved and unapproved repeat on each), and the Detailed row's balance is
 * never below the truck row's, equal to it where nothing was produced there, so
 * it already carries the trucks. Adding the two subtracts every planned bag
 * twice: Lot 21 at Surya Kanta read -32352 while its Detailed row says -1777.
 * A transfer moves both rows by the same amount (Lot 21 into Surya Kanta: +2158
 * on each). Where a Detailed row exists it is the balance; truck rows alone add
 * up as before. The API keeps Detailed rows at exactly 0 for this reason.
 */
export function buildStockIndex(rows: readonly StockRow[] | null | undefined): Map<string, number> {
  const trucks = new Map<string, number>();
  const detailed = new Map<string, number>();

  for (const r of rows ?? []) {
    const bucket = isDetailedEntryRow(r) ? detailed : trucks;
    const key = stockKey(r.lot_no, r.warehouse_location);
    bucket.set(key, (bucket.get(key) ?? 0) + (Number(r.outstanding_stock) || 0));
  }

  for (const [key, bags] of detailed) trucks.set(key, bags);
  return trucks;
}
