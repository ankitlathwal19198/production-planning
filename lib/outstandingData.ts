import { google } from "googleapis";
import { isDetailedEntryRow } from "@/lib/stock";
import {
  STOCK_SOURCE_COLUMNS,
  computeOutstanding,
  normalizeHeader,
  parseValue,
  type Column,
  type StockSource,
  type StockSourceKey,
} from "@/lib/outstandingCompute";

const base64Credentials = process.env.GOOGLE_CREDENTIALS || "";
const credentials = JSON.parse(
  Buffer.from(base64Credentials, "base64").toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

/**
 * A FORMULA read answers in about a second. A value read waits for the sheet to finish
 * recalculating, which can take minutes, so it gets cut off and reported as "sheet busy".
 */
const FORMULA_READ_TIMEOUT_MS = 30_000;
const VALUE_READ_TIMEOUT_MS = 25_000;

type Row = Record<string, string | number | boolean>;

export type OutstandingStockResult = {
  rows: Row[];
  /** "app": worked out from the raw cells. "sheet": the sheet's own formula results. */
  source: "app" | "sheet";
};

/** Thrown when the sheet was still recalculating after VALUE_READ_TIMEOUT_MS. */
export class SheetBusyError extends Error {
  constructor() {
    super("Outstanding Stock sheet is busy recalculating");
    this.name = "SheetBusyError";
  }
}

// Apps Script jaisa filter: AC != 0  (AC is the Outstanding Stock column).
// Except a "See Detailed Entry" row at exactly 0: that 0 is the lot's balance
// in that godown. Dropping it leaves only the truck row, which can be deeply
// negative (Lot 21 at Hindustan Agro showed -1992 for a real 0).
function keepRow(row: Row, outstandingKey: string, lotKey: string): boolean {
  const acVal = row[outstandingKey];
  const acNum = typeof acVal === "number" ? acVal : Number(acVal);
  const keepZero = isDetailedEntryRow(row) && String(row[lotKey] ?? "").trim() !== "";
  return !(acVal === "" || Number.isNaN(acNum) || (acNum === 0 && !keepZero));
}

/** Outstanding Stock per lot × warehouse row, with the same 9 fields as always. */
export async function fetchOutstandingStock(): Promise<OutstandingStockResult> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const keys = Object.keys(STOCK_SOURCE_COLUMNS) as StockSourceKey[];

  const res = await sheets.spreadsheets.values.batchGet(
    {
      spreadsheetId: sheetId,
      ranges: keys.map((k) => STOCK_SOURCE_COLUMNS[k]),
      majorDimension: "COLUMNS",
      valueRenderOption: "FORMULA",
    },
    { timeout: FORMULA_READ_TIMEOUT_MS }
  );

  const source = {} as StockSource;
  keys.forEach((k, i) => {
    source[k] = (res.data.valueRanges?.[i]?.values?.[0] ?? []) as Column;
  });

  const computed = computeOutstanding(source);
  if (computed.ok) {
    return {
      rows: computed.rows.filter((r) => keepRow(r, "outstanding_stock", "lot_no")),
      source: "app",
    };
  }

  console.warn(
    "[outstanding-stock] The sheet no longer matches lib/outstandingCompute.ts, so its own values are used:",
    computed.problems.slice(0, 10)
  );
  return { rows: await fetchOutstandingFromSheetFormulas(), source: "sheet" };
}

/**
 * The sheet's own results. Only used when computeOutstanding cannot vouch for its copy
 * of the formulas, because this read waits for the sheet to finish recalculating.
 * Same as Apps Script columnMapping: A,H,L,K,F,I,Z,AA,AC
 */
async function fetchOutstandingFromSheetFormulas(): Promise<Row[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const sheet = "Outstanding Stock";

  const ranges = [
    `${sheet}!A1:A`, // 0
    `${sheet}!H1:H`, // 1
    `${sheet}!L1:L`, // 2
    `${sheet}!K1:K`, // 3
    `${sheet}!F1:F`, // 4
    `${sheet}!I1:I`, // 5
    `${sheet}!Z1:Z`, // 6
    `${sheet}!AA1:AA`, // 7
    `${sheet}!AC1:AC`, // 8
  ];

  let res;
  try {
    res = await sheets.spreadsheets.values.batchGet(
      { spreadsheetId: sheetId, ranges },
      { timeout: VALUE_READ_TIMEOUT_MS }
    );
  } catch (err) {
    const e = err as { name?: string; message?: string } | null;
    if (e?.name === "AbortError" || /aborted|timeout/i.test(String(e?.message))) {
      throw new SheetBusyError();
    }
    throw err;
  }

  const cols =
    res.data.valueRanges?.map((vr) => (vr.values ?? []) as string[][]) ?? [];

  // headers = first row of each column
  const headers = cols.map((col) => col[0]?.[0] ?? "");
  const keys = headers.map(normalizeHeader);

  // find max rows length among all columns
  const maxLen = Math.max(...cols.map((c) => c.length), 0);

  const out: Row[] = [];

  // start from row index 1 (because row index 0 = header)
  for (let r = 1; r < maxLen; r++) {
    const obj: Row = {};

    for (let c = 0; c < cols.length; c++) {
      const cell = cols[c][r]?.[0] ?? "";
      obj[keys[c] || `col_${c}`] = parseValue(cell);
    }

    if (keepRow(obj, keys[8], keys[0])) out.push(obj);
  }

  return out;
}
