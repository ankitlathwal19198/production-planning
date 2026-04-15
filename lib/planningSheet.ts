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

  // Determine starting row for _rowNumber index
  // e.g. "Sheet!A1:J" -> data starts at row 2
  // e.g. "Sheet!A5:J" -> data starts at row 6
  let startRow = 1;
  const match = range.match(/!.*?(\d+)/);
  if (match) startRow = parseInt(match[1], 10);

  return rows.map((row, idx) => {
    const obj = keys.reduce((acc, key, i) => {
      (acc as any)[key] = parseValue(row[i] ?? "");
      return acc;
    }, {} as any);

    obj._rowNumber = startRow + idx + 1; // +1 if headers included, +idx
    return obj as T;
  });
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
    if (!(bags >= 0)) {
      throw new Error(`Row ${rowNo}: Planned bags cannot be negative`);
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
 * HIGH PERFORMANCE: Two-step fetch strategy.
 */
export async function fetchPlanningBySalesOrder(salesOrder: string): Promise<PlanningRowMatch[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const so = String(salesOrder ?? "").trim();
  if (!so) throw new Error("Sales order required");

  // 1. Headers to find where sales_order_no is
  const headerKeys = await fetchPlanningSheetHeaders();
  const soIdx = headerKeys.indexOf("sales_order_no");
  if (soIdx === -1) throw new Error("sales_order_no column not found in sheet");

  const colLetter = indexToColLetter(soIdx);

  // 2. Fetch only that column
  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!${colLetter}2:${colLetter}`,
  });

  const colValues = (colRes.data.values ?? []) as string[][];
  const matchingRowNumbers: number[] = [];

  for (let i = 0; i < colValues.length; i++) {
    const val = String(colValues[i]?.[0] ?? "").trim();
    if (val === so) {
      matchingRowNumbers.push(i + 2); // A2 is start
    }
  }

  if (matchingRowNumbers.length === 0) {
    throw new Error("No entries found for this Sales Order");
  }

  // 3. Fetch full rows only for matches
  const ranges = matchingRowNumbers.map(n => `${PLANNING_SHEET_NAME}!A${n}:J${n}`);
  const batchRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  const valueRanges = batchRes.data.valueRanges ?? [];
  const matches: PlanningRowMatch[] = [];

  for (let i = 0; i < valueRanges.length; i++) {
    const row = (valueRanges[i].values?.[0] ?? []) as string[];
    const rowNumber = matchingRowNumbers[i];

    const obj = headerKeys.reduce((acc, key, idx) => {
      (acc as any)[key] = parseValue(String(row[idx] ?? ""));
      return acc;
    }, {} as Record<string, any>);

    matches.push({
      rowNumber,
      uid: String(obj.uid ?? "").trim(),
      data: obj,
    });
  }

  return matches;
}

/**
 * Fetch all planning rows for a given Lot number.
 * HIGH PERFORMANCE: Two-step fetch strategy.
 */
export async function fetchPlanningByLot(lot: string): Promise<PlanningRowMatch[]> {
  const sheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;
  const lVal = String(lot ?? "").trim();
  if (!lVal) throw new Error("Lot required");

  // 1. Headers to find where lot_no is
  const headerKeys = await fetchPlanningSheetHeaders();
  const lotIdx = headerKeys.indexOf("lot_no");
  if (lotIdx === -1) throw new Error("lot_no column not found in sheet");

  const colLetter = indexToColLetter(lotIdx);

  // 2. Fetch only that column
  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${PLANNING_SHEET_NAME}!${colLetter}2:${colLetter}`,
  });

  const colValues = (colRes.data.values ?? []) as string[][];
  const matchingRowNumbers: number[] = [];

  for (let i = 0; i < colValues.length; i++) {
    const val = String(colValues[i]?.[0] ?? "").trim();
    if (val === lVal) {
      matchingRowNumbers.push(i + 2);
    }
  }

  if (matchingRowNumbers.length === 0) {
    throw new Error("No entries found for this Lot");
  }

  // 3. Fetch full rows only for matches
  const ranges = matchingRowNumbers.map(n => `${PLANNING_SHEET_NAME}!A${n}:J${n}`);
  const batchRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  const valueRanges = batchRes.data.valueRanges ?? [];
  const matches: PlanningRowMatch[] = [];

  for (let i = 0; i < valueRanges.length; i++) {
    const row = (valueRanges[i].values?.[0] ?? []) as string[];
    const rowNumber = matchingRowNumbers[i];

    const obj = headerKeys.reduce((acc, key, idx) => {
      (acc as any)[key] = parseValue(String(row[idx] ?? ""));
      return acc;
    }, {} as Record<string, any>);

    matches.push({
      rowNumber,
      uid: String(obj.uid ?? "").trim(),
      data: obj,
    });
  }

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
    if (!(bags >= 0)) throw new Error(`Row ${i + 1}: Bags cannot be negative`);

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

/**
 * Delete a specific row from the Planning sheet.
 * DANGER: This is permanent.
 */
export async function deletePlanningRow(rowNumber: number): Promise<{ ok: true; deletedRow: number }> {
  const spreadsheetId = process.env.Outstanding_AND_PLANNING_SHEET_ID!;

  if (!(rowNumber >= 2)) {
    throw new Error(`Invalid rowNumber: ${rowNumber}. Cannot delete header or non-existent row.`);
  }

  // 1. Get spreadsheet metadata to find the internal sheetId for the tab name
  const ss = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = ss.data.sheets?.find(
    (s) => s.properties?.title === PLANNING_SHEET_NAME
  );

  if (!sheet || sheet.properties?.sheetId === undefined) {
    throw new Error(`Sheet "${PLANNING_SHEET_NAME}" not found or has no sheetId.`);
  }

  const sheetInternalId = sheet.properties.sheetId;

  // 2. Execute deleteDimension request
  // startIndex is 0-indexed and inclusive, endIndex is exclusive.
  // Row 2 -> index 1.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetInternalId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });

  return { ok: true, deletedRow: rowNumber };
}
