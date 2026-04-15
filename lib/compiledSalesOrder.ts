import { google } from "googleapis";

type Cell = string | number | boolean | null;

type SalesOrderRow = Cell[]; // final output: 8 columns per row

// ---- normalized keys (sheet-independent) ----
const SALES_ORDER_KEYS = [
  "sales_order",
  "so_date",
  "buyer",
  "item_number",
  "brand_name_quality_description",
  "packing_size",
  "number_of_bags",
  "plant",
] as const;

type SalesOrderObj = Record<(typeof SALES_ORDER_KEYS)[number], any>;

type SourceConfig = {
  enabled: boolean;
  spreadsheetId: string;
  sheetName: string;
  columnMapping: string[]; // e.g. ['A','C','R','D','P','I','H','F'] => always 8
  filterColumn: string; // e.g. 'X'
  filterValues: string[]; // e.g. ['Approved']
};

const base64Credentials = process.env.GOOGLE_CREDENTIALS || "";
const credentials = JSON.parse(
  Buffer.from(base64Credentials, "base64").toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"], // readonly enough for fetch
});

const sheets = google.sheets({ version: "v4", auth });

// ---- helpers ----
function colLetterToIndex(letter: string): number {
  // A -> 0, B -> 1, Z -> 25, AA -> 26 ...
  let index = 0;
  const s = letter.trim().toUpperCase();
  for (let i = 0; i < s.length; i++) {
    index = index * 26 + (s.charCodeAt(i) - 65 + 1);
  }
  return index - 1;
}

function indexToColLetter(idx0: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA ...
  let n = idx0 + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function parseCell(v: any): Cell {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return v as Cell;

  const trimmed = v.trim();
  if (trimmed === "") return "";

  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "") return num;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  return trimmed;
}

function rowToObject<const T extends readonly string[]>(
  row: any[],
  keys: T
): Record<T[number], any> {
  const out = {} as Record<T[number], any>;

  keys.forEach((k, i) => {
    out[k as T[number]] = row[i];
  });

  return out;
}

async function importFromSource(
  source: SourceConfig,
  startRowInSource = 2
): Promise<SalesOrderRow[]> {
  if (!source.enabled) return [];

  // We only need data up to max(columnMapping + filterColumn)
  const allCols = [...source.columnMapping, source.filterColumn];
  const maxIdx = Math.max(...allCols.map(colLetterToIndex));
  const lastColLetter = indexToColLetter(maxIdx);

  // Read A:lastCol, from row 1 to end (Google will return existing rows only)
  const range = `${source.sheetName}!A1:${lastColLetter}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: source.spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const values = (res.data.values ?? []) as any[][];
  if (values.length < startRowInSource) return [];

  const filterIdx = colLetterToIndex(source.filterColumn);
  const mapIdxs = source.columnMapping.map(colLetterToIndex);

  const rows = values.slice(startRowInSource - 1);

  return rows
    .filter((row) => {
      const fv = row?.[filterIdx];
      // Apps Script me exact match; yahan string compare safe banate hain
      return source.filterValues.includes(String(fv ?? "").trim());
    })
    .map((row) => mapIdxs.map((i) => parseCell(row?.[i])));
}

// ---- main function ----
export async function fetchSalesOrder(): Promise<SalesOrderObj[]> {
  // Export
  const source1: SourceConfig = {
    enabled: true,
    spreadsheetId: "1iu2DpL-4fxIHudItXKqWhfSzUGE-0n8JAsyuIrd0t1c",
    sheetName: "Split Sales Order",
    columnMapping: ["A", "C", "R", "D", "P", "I", "H", "F"], // 8 cols
    filterColumn: "X",
    filterValues: ["Approved"],
  };

  // Domestic
  const source2: SourceConfig = {
    enabled: false,
    spreadsheetId: "1sV_zwdYUwIuxUCFkGWemTdmOh7XKtFPjErdHXsW7A9A",
    sheetName: "Split Sales Order",
    columnMapping: ["A", "C", "I", "D", "J", "M", "E", "F"], // 8 cols
    filterColumn: "S",
    filterValues: ["Approved", "Approved After Correction"],
  };

  const [data1, data2] = await Promise.all([
    importFromSource(source1, 2),
    importFromSource(source2, 2),
  ]);

  // Combined output, each row exactly 8 columns
  const rows = [...data1, ...data2];
  return rows.map((row) => rowToObject(row, SALES_ORDER_KEYS));
}
