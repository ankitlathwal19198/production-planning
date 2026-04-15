import { google } from "googleapis";

const base64Credentials = process.env.GOOGLE_CREDENTIALS || "";
const credentials = JSON.parse(
  Buffer.from(base64Credentials, "base64").toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

function parseValue(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (trimmed === "") return "";

  const num = Number(trimmed);
  if (!isNaN(num)) return num;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  return value;
}

function normalizeHeader(key: string) {
  // "Type of Document" -> "type_of_document"
  // keeps it consistent even if sheet me extra symbols aa jayein
  return key
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function fetchSheetData<T = Record<string, any>>(
  range: string
): Promise<T[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const [headers = [], ...rows] = (res.data.values ?? []) as string[][];
  const keys = headers.map(normalizeHeader);

  return rows.map((row) =>
    keys.reduce((acc, key, i) => {
      (acc as any)[key] = parseValue(row[i] ?? "");
      return acc;
    }, {} as T)
  );
}

/* ------------------------------------------------------------------ */
/* ✅ NEW: Planning helpers (UID + Append)                              */
/* ------------------------------------------------------------------ */

const PLANNING_SHEET_NAME = "Planned Stock Backend";

// UID like "6068/PL" -> 6068
function parseUidNumber(uid: string): number | null {
  const s = String(uid ?? "").trim();
  const m = s.match(/^(\d+)\s*\/\s*PL$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads last UID number from column A (UID).
 * If no data, returns 0 (so next is 1/PL).
 */

async function fetchPlanningSheetHeaders(): Promise<string[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!A1:Z1`,
  });

  const headers = (res.data.values?.[0] ?? []) as string[];
  return headers.map(normalizeHeader);
}

export async function fetchLastPlanningUidNumber(): Promise<number> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;

  // Read UID column excluding header
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!A2:A`,
    majorDimension: "COLUMNS",
  });

  const col = (res.data.values?.[0] ?? []) as string[];

  for (let i = col.length - 1; i >= 0; i--) {
    const v = String(col[i] ?? "").trim();
    if (!v) continue;
    const n = parseUidNumber(v);
    if (typeof n === "number") return n;
  }

  return 0;
}

export type AddPlanningLine = {
  sales_order_no: string;
  buyer_name: string;
  lot_no: string;
  quality_name: string;
  wh_name_lot_location: string;
  number_of_planned_bags: number;
  plant_name: string;
  planning_submitted_by: string; // email/name
};

export type AddPlanningResult = {
  ok: true;
  appended: number;
  uidFrom: string;
  uidTo: string;
  newRows: string[][]; // A:J rows appended
};

/**
 * Appends planning rows to "Planned Stock Backend" sheet (A:J).
 * Auto-generates sequential UID like 6069/PL...
 */
export async function addPlanningEntries(
  lines: AddPlanningLine[]
): Promise<AddPlanningResult> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("No planning rows provided");
  }

  // minimal validation on server side
  for (let i = 0; i < lines.length; i++) {
    const rowNo = i + 1;
    const ln = lines[i];

    if (!ln.sales_order_no || !ln.lot_no || !ln.wh_name_lot_location) {
      throw new Error(`Row ${rowNo}: Sales Order / Lot / Warehouse required`);
    }

    const bags = Number(ln.number_of_planned_bags ?? 0);
    if (!(bags > 0)) {
      throw new Error(`Row ${rowNo}: Planned bags must be > 0`);
    }
  }

  // ✅ get headers dynamically
  const headerKeys = await fetchPlanningSheetHeaders();
  const lastUid = await fetchLastPlanningUidNumber();

  function formatDateForSheet(date: Date) {
    // United Kingdom locale → dd/mm/yyyy, 24-hour time
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  /**
   * Payload object keys MUST match normalizeHeader(sheet headers)
   */
  const rowsAsObjects = lines.map((ln, idx) => ({
    uid: `${lastUid + idx + 1}/PL`,
    timestamp: formatDateForSheet(new Date()),
    sales_order_no: ln.sales_order_no,
    buyer_name: ln.buyer_name,
    lot_no: ln.lot_no,
    quality_name: ln.quality_name,
    wh_name_lot_location: ln.wh_name_lot_location,
    number_of_planned_bags: ln.number_of_planned_bags,
    plant_name: ln.plant_name,
    planning_submitted_by: ln.planning_submitted_by,
  }));

  /**
   * Convert objects → array in SHEET HEADER ORDER
   */
  const values: string[][] = rowsAsObjects.map((obj) =>
    headerKeys.map((key) => String((obj as any)[key] ?? ""))
  );

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return {
    ok: true,
    appended: lines.length,
    uidFrom: `${lastUid + 1}/PL`,
    uidTo: `${lastUid + lines.length}/PL`,
    newRows: values,
  };
}

/* ------------------------------------------------------------------ */
/* ✅ NEW: Edit Planning by Sales Order (load all rows + update rows)  */
/* ------------------------------------------------------------------ */

export type PlanningRowMatch = {
  rowNumber: number; // sheet row number (1-based)
  uid: string;       // e.g. 6139/PL
  data: Record<string, any>; // normalized keys object
};

/**
 * Fetch all planning rows for a given sales order number.
 * Reads A2:Z and filters by sales_order_no column (normalized header).
 */
export async function fetchPlanningBySalesOrder(salesOrder: string): Promise<PlanningRowMatch[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const so = String(salesOrder ?? "").trim();
  if (!so) throw new Error("Sales order required");

  // headers
  const headerKeys = await fetchPlanningSheetHeaders();

  // all rows (A2:Z)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!A2:Z`,
  });

  const rows = (res.data.values ?? []) as string[][];

  const matches: PlanningRowMatch[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // A2 is first data row
    const row = rows[i] ?? [];

    // build object
    const obj = headerKeys.reduce((acc, key, idx) => {
      (acc as any)[key] = parseValue(String(row[idx] ?? ""));
      return acc;
    }, {} as Record<string, any>);

    // match sales order
    const soVal = String(obj.sales_order_no ?? "").trim();
    if (soVal === so) {
      matches.push({
        rowNumber,
        uid: String(obj.uid ?? "").trim(),
        data: obj,
      });
    }
  }

  if (!matches.length) throw new Error("No entries found for this Sales Order");

  return matches;
}

export async function fetchPlanningByLot(lot: string): Promise<PlanningRowMatch[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const so = String(lot ?? "").trim();
  if (!so) throw new Error("Lot required");

  // headers
  const headerKeys = await fetchPlanningSheetHeaders();

  // all rows (A2:Z)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!A2:Z`,
  });

  const rows = (res.data.values ?? []) as string[][];

  const matches: PlanningRowMatch[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // A2 is first data row
    const row = rows[i] ?? [];

    // build object
    const obj = headerKeys.reduce((acc, key, idx) => {
      (acc as any)[key] = parseValue(String(row[idx] ?? ""));
      return acc;
    }, {} as Record<string, any>);

    // match lot_no
    const soVal = String(obj.lot_no ?? "").trim();
    if (soVal === so) {
      matches.push({
        rowNumber,
        uid: String(obj.uid ?? "").trim(),
        data: obj,
      });
    }
  }

  if (!matches.length) throw new Error("No entries found for this Lot");
  return matches;
}

export type UpdatePlanningByRowsInput = {
  rowNumber: number; // required
  uid: string;       // required, we will keep it same
  // below are sheet columns (normalized keys)
  sales_order_no: string;
  buyer_name: string;
  lot_no: string;
  quality_name: string;
  wh_name_lot_location: string;
  number_of_planned_bags: number;
  plant_name: string;
  planning_submitted_by: string;
};

export type UpdatePlanningByRowsResult = {
  ok: true;
  updated: number;
  updatedRowNumbers: number[];
};

/**
 * Update exact rows by rowNumber (best for “edit multiple rows”).
 * We keep UID same (immutable) and update timestamp to now.
 * Also supports "update only changed rows" if you pass previous snapshot (optional),
 * but simplest: we update every row provided.
 */
export async function updatePlanningRowsByRowNumber(
  rowsToUpdate: UpdatePlanningByRowsInput[]
): Promise<UpdatePlanningByRowsResult> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;

  if (!Array.isArray(rowsToUpdate) || rowsToUpdate.length === 0) {
    throw new Error("No rows to update");
  }

  const headerKeys = await fetchPlanningSheetHeaders();

  function formatDateForSheet(date: Date) {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  const data: { range: string; values: string[][] }[] = [];
  const updatedRowNumbers: number[] = [];

  for (let i = 0; i < rowsToUpdate.length; i++) {
    const r = rowsToUpdate[i];

    const rowNumber = Number(r.rowNumber);
    if (!(rowNumber >= 2)) throw new Error(`Invalid rowNumber at index ${i}`);

    const uid = String(r.uid ?? "").trim();
    if (!uid) throw new Error(`UID missing at index ${i}`);

    // minimal validation
    if (!String(r.sales_order_no ?? "").trim() || !String(r.lot_no ?? "").trim() || !String(r.wh_name_lot_location ?? "").trim()) {
      throw new Error(`Row ${i + 1}: Sales Order / Lot / Warehouse required`);
    }

    const bags = Number(r.number_of_planned_bags ?? 0);
    if (!(bags > 0)) throw new Error(`Row ${i + 1}: Bags must be > 0`);

    // Build object in normalized header keys
    const obj: Record<string, any> = {
      uid, // keep same
      timestamp: formatDateForSheet(new Date()),
      sales_order_no: String(r.sales_order_no ?? ""),
      buyer_name: String(r.buyer_name ?? ""),
      lot_no: String(r.lot_no ?? ""),
      quality_name: String(r.quality_name ?? ""),
      wh_name_lot_location: String(r.wh_name_lot_location ?? ""),
      number_of_planned_bags: Number(r.number_of_planned_bags ?? 0),
      plant_name: String(r.plant_name ?? ""),
      planning_submitted_by: String(r.planning_submitted_by ?? ""),
    };

    const values = headerKeys.map((k) => String(obj[k] ?? ""));
    data.push({
      range: `${PLANNING_SHEET_NAME}!A${rowNumber}:Z${rowNumber}`,
      values: [values],
    });
    updatedRowNumbers.push(rowNumber);
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return { ok: true, updated: rowsToUpdate.length, updatedRowNumbers };
}
