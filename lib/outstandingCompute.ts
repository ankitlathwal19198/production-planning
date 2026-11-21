// lib/outstandingCompute.ts
// Outstanding Stock worked out from the cells people type, instead of the sheet's formulas.
//
// Reading a value from "New Outstanding & Planning Stock H.R Exports" waits until Google
// has recalculated the spreadsheet, and each edit (a form entry, a submitted planning)
// starts a recalculation that runs for minutes. /api/outstanding-stock then hit Vercel's
// 300 s limit (504) and the planning form showed no lots. A read with
// valueRenderOption FORMULA returns in under a second even then, so the API reads the
// inputs that way and repeats the sheet's arithmetic here:
//
//   Z  Planning Stock (Approved)    planned bags on this lot + warehouse whose UID is approved
//   AA Planning Stock (Unapproved)  planned bags on every other planning row
//   AB Direct Sale (In Bags)        bags sold straight from this lot + warehouse
//   AC Outstanding Stock            Y - Z - AB - AA
//
// It only does so while the sheet's formulas are exactly the ones below. If someone edits
// one, computeOutstanding reports it and the caller uses the sheet's own values instead,
// so the app never shows a number the sheet would not.

export type Cell = string | number | boolean | null | undefined;
/** One sheet column from row 1 down, as values.batchGet returns it with majorDimension COLUMNS. */
export type Column = readonly Cell[];

/** Every range the computation needs, read with valueRenderOption FORMULA. */
export const STOCK_SOURCE_COLUMNS = {
  osLot: "'Outstanding Stock'!A1:A",
  osSupplier: "'Outstanding Stock'!F1:F",
  osTruck: "'Outstanding Stock'!H1:H",
  osWarehouse: "'Outstanding Stock'!I1:I",
  osPerBagWt: "'Outstanding Stock'!K1:K",
  osQuality: "'Outstanding Stock'!L1:L",
  osTotalBags: "'Outstanding Stock'!Y1:Y",
  osApproved: "'Outstanding Stock'!Z1:Z",
  osUnapproved: "'Outstanding Stock'!AA1:AA",
  osDirectSale: "'Outstanding Stock'!AB1:AB",
  osOutstanding: "'Outstanding Stock'!AC1:AC",

  planUid: "'Planned Stock Backend'!A1:A",
  planLot: "'Planned Stock Backend'!E1:E",
  planWarehouse: "'Planned Stock Backend'!G1:G",
  planBags: "'Planned Stock Backend'!H1:H",
  planApproval: "'Planned Stock Backend'!O1:O",

  domUid: "'Domestic Planned Stock Backend'!A1:A",
  domLot: "'Domestic Planned Stock Backend'!E1:E",
  domWarehouse: "'Domestic Planned Stock Backend'!G1:G",
  domBags: "'Domestic Planned Stock Backend'!H1:H",
  domApprovalDate: "'Domestic Planned Stock Backend'!L1:L",
  domApproval: "'Domestic Planned Stock Backend'!M1:M",
  domApprovedBy: "'Domestic Planned Stock Backend'!N1:N",

  approvalUid: "'Planned Entry Approval'!B1:B",
  approvalStatus: "'Planned Entry Approval'!F1:F",

  saleLotWarehouse: "'Direct Sale'!D1:D",
  saleLot: "'Direct Sale'!E1:E",
  saleWarehouse: "'Direct Sale'!F1:F",
  saleBags: "'Direct Sale'!H1:H",
} as const;

export type StockSourceKey = keyof typeof STOCK_SOURCE_COLUMNS;
export type StockSource = Record<StockSourceKey, Column>;

/** Row 1 of each column, after normalizeHeader, must start with this; otherwise columns have moved. */
const EXPECTED_HEADERS: Partial<Record<StockSourceKey, string>> = {
  osLot: "lot_no",
  osSupplier: "supplier_name",
  osTruck: "truck_no",
  osWarehouse: "warehouse_location",
  osPerBagWt: "per_bag_weight_in_kg",
  osQuality: "quality_name",
  osTotalBags: "total_bags_after",
  osApproved: "planning_stock_approved",
  osUnapproved: "planning_stock_unapproved",
  osDirectSale: "direct_sale",
  osOutstanding: "outstanding_stock",
  planUid: "uid",
  planLot: "lot_no",
  planWarehouse: "wh_name",
  planBags: "number_of_planned_bags",
  planApproval: "approval_status",
  domUid: "uid",
  domLot: "lot_no",
  domWarehouse: "wh_name",
  domBags: "number_of_planned_bags",
  domApproval: "approval_status",
  approvalUid: "uid",
  approvalStatus: "status",
  saleLotWarehouse: "lot_no",
  saleBags: "total_bags",
};

// The sheet's formulas, copied from the sheet. Per-row ones take the row number.
const OS_FIRST_FORMULA_ROW = 3;
const FORMULA_Z = (r: number) =>
  `=IF(A${r}<>"",SUMIFS('Planned Stock Backend'!H:H,'Planned Stock Backend'!E:E,A${r},'Planned Stock Backend'!G:G,I${r},'Planned Stock Backend'!O:O,"Approved")+SUMIFS('Domestic Planned Stock Backend'!H:H,'Domestic Planned Stock Backend'!E:E,A${r},'Domestic Planned Stock Backend'!G:G,I${r},'Domestic Planned Stock Backend'!M:M,"Approved"),"")`;
const FORMULA_AA = (r: number) =>
  `=IF(A${r}<>"",SUMIFS('Planned Stock Backend'!H:H,'Planned Stock Backend'!E:E,A${r},'Planned Stock Backend'!G:G,I${r},'Planned Stock Backend'!O:O,"<>"&"Approved")+SUMIFS('Domestic Planned Stock Backend'!H:H,'Domestic Planned Stock Backend'!E:E,A${r},'Domestic Planned Stock Backend'!G:G,I${r},'Domestic Planned Stock Backend'!M:M,"<>"&"Approved"),"")`;
const FORMULA_AB = (r: number) =>
  `=IF(A${r}<>"",SUMIFS('Direct Sale'!H:H,'Direct Sale'!E:E,A${r},'Direct Sale'!F:F,I${r}),"")`;
// Array formulas: one cell holds the formula and the cells below it must stay empty.
const FORMULA_AC3 = `=ArrayFormula(IF(Z3:Z="",,Y3:Y-Z3:Z-(AB3:AB)-(AA3:AA)))`;
const FORMULA_PLAN_O3 = `=ArrayFormula(IF(A3:A<>"",IFNA(VLOOKUP(Text(A3:A,0),{Text('Planned Entry Approval'!B:B,0),'Planned Entry Approval'!F:F},2,0),),))`;
const FORMULA_DOM_L2 = `=ArrayFormula(IFNA(VLOOKUP(A2:A,{'Planned Entry Approval'!B:B,'Planned Entry Approval'!A:A,'Planned Entry Approval'!F:F,'Planned Entry Approval'!E:E},{2,3,4},0),""))`;
const FORMULA_SALE_E1 = `=ArrayFormula(IF(ROW(D:D)=1,"Split Data",IF(D:D<>"",SPLIT(D:D,"@"),"")))`;

/** The 9 fields /api/outstanding-stock has always returned, in the same order. */
export type OutstandingRow = {
  lot_no: string | number | boolean;
  truck_no: string | number | boolean;
  quality_name: string | number | boolean;
  per_bag_weight_in_kg: string | number | boolean;
  supplier_name: string | number | boolean;
  warehouse_location: string | number | boolean;
  planning_stock_approved: string | number | boolean;
  planning_stock_unapproved: string | number | boolean;
  /** "" where the sheet leaves it blank; NaN where the sheet shows an error. */
  outstanding_stock: string | number | boolean;
};

export type ComputeResult =
  | { ok: true; rows: OutstandingRow[] }
  | { ok: false; problems: string[] };

export function normalizeHeader(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** What the old FORMATTED_VALUE read made of a cell: numbers and booleans parsed, text trimmed. */
export function parseValue(value: Cell): string | number | boolean {
  if (typeof value === "number" || typeof value === "boolean") return value;
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";

  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  return trimmed;
}

const isBlank = (v: Cell) => v === undefined || v === null || v === "";
const isFormula = (v: Cell): v is string => typeof v === "string" && v.startsWith("=");
const NUMERIC_TEXT = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * SUMIFS with a cell as the criterion: equal ignoring case, and "21" matches 21.
 * Criteria with wildcards or a leading operator are refused in criteriaProblem.
 */
function criterionKey(v: Cell): string {
  if (typeof v === "number") return `n:${v}`;
  if (typeof v === "boolean") return `b:${v}`;
  const s = String(v ?? "");
  const t = s.trim();
  if (NUMERIC_TEXT.test(t)) return `n:${Number(t)}`;
  return `s:${s.toLowerCase()}`;
}

/** VLOOKUP exact match: ignores case, but 21 does not find "21". */
function lookupKey(v: Cell): string {
  if (typeof v === "number") return `n:${v}`;
  if (typeof v === "boolean") return `b:${v}`;
  return `s:${String(v ?? "").toLowerCase()}`;
}

/** TEXT(v, 0) as a lookup key: numbers rounded to whole, text unchanged. */
function text0Key(v: Cell): string {
  if (typeof v === "number") return `s:${(Math.sign(v) * Math.round(Math.abs(v))).toString()}`;
  if (typeof v === "boolean") return v ? "s:true" : "s:false";
  return `s:${String(v ?? "").toLowerCase()}`;
}

/** A value in sheet arithmetic: blank is 0, numeric text is a number, other text is an error (NaN). */
function asNumber(v: Cell): number {
  if (isBlank(v)) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const t = String(v).trim();
  return NUMERIC_TEXT.test(t) ? Number(t) : NaN;
}

// SUMIFS(..., "Approved") ignores case but not spaces.
const isApproved = (status: Cell) => String(status ?? "").toLowerCase() === "approved";

/** A criterion SUMIFS would read as a pattern or comparison, which criterionKey does not model. */
function criteriaProblem(v: Cell): boolean {
  return typeof v === "string" && (/[*?~]/.test(v) || /^\s*(=|<|>)/.test(v));
}

export function computeOutstanding(src: StockSource): ComputeResult {
  const problems: string[] = [];
  const at = (key: StockSourceKey, i: number): Cell => src[key]?.[i];

  for (const [key, expected] of Object.entries(EXPECTED_HEADERS) as [StockSourceKey, string][]) {
    const header = normalizeHeader(String(at(key, 0) ?? ""));
    if (!header.startsWith(expected)) {
      problems.push(`${STOCK_SOURCE_COLUMNS[key]} header is "${at(key, 0) ?? ""}", expected ${expected}`);
    }
  }

  // An array formula sits in one cell; anything typed below it breaks the formula in the sheet.
  const checkArrayFormula = (key: StockSourceKey, anchorIndex: number, formula: string | null) => {
    const col = src[key] ?? [];
    if (formula !== null && at(key, anchorIndex) !== formula) {
      problems.push(`${STOCK_SOURCE_COLUMNS[key]} row ${anchorIndex + 1} formula changed: ${String(at(key, anchorIndex) ?? "")}`);
    }
    for (let i = anchorIndex + (formula === null ? 0 : 1); i < col.length; i++) {
      if (!isBlank(col[i])) {
        problems.push(`${STOCK_SOURCE_COLUMNS[key]} row ${i + 1} has a typed value inside an array formula's range`);
        break;
      }
    }
  };
  checkArrayFormula("osOutstanding", OS_FIRST_FORMULA_ROW - 1, FORMULA_AC3);
  checkArrayFormula("planApproval", 2, FORMULA_PLAN_O3);
  checkArrayFormula("domApprovalDate", 1, FORMULA_DOM_L2);
  checkArrayFormula("domApproval", 1, null);
  checkArrayFormula("domApprovedBy", 1, null);
  checkArrayFormula("saleLot", 0, FORMULA_SALE_E1);
  checkArrayFormula("saleWarehouse", 0, null);

  if (problems.length) return { ok: false, problems };

  // Approval status of a planning UID: the first "Planned Entry Approval" row for it.
  const statusByText0 = new Map<string, Cell>();
  const statusByValue = new Map<string, Cell>();
  const approvalUids = src.approvalUid ?? [];
  for (let i = 0; i < approvalUids.length; i++) {
    const uid = approvalUids[i];
    if (isBlank(uid)) continue;
    const status = at("approvalStatus", i);
    const k1 = text0Key(uid);
    if (!statusByText0.has(k1)) statusByText0.set(k1, status);
    const k2 = lookupKey(uid);
    if (!statusByValue.has(k2)) statusByValue.set(k2, status);
  }

  const approved = new Map<string, number>();
  const unapproved = new Map<string, number>();
  const directSale = new Map<string, number>();
  const pairKey = (lot: Cell, warehouse: Cell) => `${criterionKey(lot)}|${criterionKey(warehouse)}`;
  const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

  // Planned Stock Backend: O = IF(A<>"", IFNA(VLOOKUP(TEXT(A,0), {TEXT(approval UID,0), Status}, 2, 0)), "")
  const planRows = Math.max(src.planBags?.length ?? 0, src.planLot?.length ?? 0);
  for (let i = 0; i < planRows; i++) {
    const bags = at("planBags", i);
    if (typeof bags !== "number") continue; // SUMIFS adds numbers only
    const uid = at("planUid", i);
    const status = i < 2 ? at("planApproval", i) : isBlank(uid) ? "" : statusByText0.get(text0Key(uid)) ?? "";
    add(isApproved(status) ? approved : unapproved, pairKey(at("planLot", i), at("planWarehouse", i)), bags);
  }

  // Domestic Planned Stock Backend: M = IFNA(VLOOKUP(A, {approval UID, ..., Status, ...}, 3, 0), "")
  const domRows = Math.max(src.domBags?.length ?? 0, src.domLot?.length ?? 0);
  for (let i = 0; i < domRows; i++) {
    const bags = at("domBags", i);
    if (typeof bags !== "number") continue;
    const uid = at("domUid", i);
    const status = i < 1 ? at("domApproval", i) : isBlank(uid) ? "" : statusByValue.get(lookupKey(uid)) ?? "";
    add(isApproved(status) ? approved : unapproved, pairKey(at("domLot", i), at("domWarehouse", i)), bags);
  }

  // Direct Sale: E and F are SPLIT(D, "@"); a third part would break that array formula.
  const saleRows = src.saleLotWarehouse?.length ?? 0;
  for (let i = 1; i < saleRows; i++) {
    const d = at("saleLotWarehouse", i);
    if (isBlank(d)) continue;
    const parts = String(d).split("@").filter((p) => p !== "");
    if (parts.length > 2) {
      return { ok: false, problems: [`'Direct Sale'!D${i + 1} has more than one "@": ${String(d)}`] };
    }
    const bags = at("saleBags", i);
    if (typeof bags !== "number") continue;
    add(directSale, pairKey(parts[0] ?? "", parts[1] ?? ""), bags);
  }

  // One Outstanding Stock column: the formula's result, or whatever was typed over it.
  const cellResult = (
    key: "osApproved" | "osUnapproved" | "osDirectSale",
    i: number,
    formula: (r: number) => string,
    compute: () => number,
  ): Cell => {
    const cell = at(key, i);
    if (i < OS_FIRST_FORMULA_ROW - 1 || !isFormula(cell)) return cell;
    const row = i + 1;
    if (cell !== formula(row)) {
      problems.push(`${STOCK_SOURCE_COLUMNS[key]} row ${row} formula changed: ${cell}`);
      return "";
    }
    return isBlank(at("osLot", i)) ? "" : compute();
  };

  const rows: OutstandingRow[] = [];
  const osRows = Math.max(src.osLot?.length ?? 0, src.osApproved?.length ?? 0, src.osTotalBags?.length ?? 0);
  for (let i = 1; i < osRows; i++) {
    const lot = at("osLot", i);
    const warehouse = at("osWarehouse", i);
    const k = pairKey(lot, warehouse);

    const lotIsCriterion = i >= OS_FIRST_FORMULA_ROW - 1 && !isBlank(lot);
    if (lotIsCriterion && (criteriaProblem(lot) || criteriaProblem(warehouse))) {
      problems.push(`'Outstanding Stock' row ${i + 1}: lot/warehouse contains a SUMIFS wildcard or operator`);
    }

    const z = cellResult("osApproved", i, FORMULA_Z, () => approved.get(k) ?? 0);
    const aa = cellResult("osUnapproved", i, FORMULA_AA, () => unapproved.get(k) ?? 0);
    const ab = cellResult("osDirectSale", i, FORMULA_AB, () => directSale.get(k) ?? 0);

    // AC = IF(Z="", "", Y - Z - AB - AA) from row 3 down; rows above hold what was typed.
    let ac: Cell;
    if (i < OS_FIRST_FORMULA_ROW - 1) ac = at("osOutstanding", i);
    else if (isBlank(z)) ac = "";
    else ac = asNumber(at("osTotalBags", i)) - asNumber(z) - asNumber(ab) - asNumber(aa);

    rows.push({
      lot_no: parseValue(lot),
      truck_no: parseValue(at("osTruck", i)),
      quality_name: parseValue(at("osQuality", i)),
      per_bag_weight_in_kg: parseValue(at("osPerBagWt", i)),
      supplier_name: parseValue(at("osSupplier", i)),
      warehouse_location: parseValue(warehouse),
      planning_stock_approved: parseValue(z),
      planning_stock_unapproved: parseValue(aa),
      outstanding_stock: typeof ac === "number" ? ac : parseValue(ac),
    });
  }

  if (problems.length) return { ok: false, problems };
  return { ok: true, rows };
}
