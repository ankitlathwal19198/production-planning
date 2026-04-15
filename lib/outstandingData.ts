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
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return "";

  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  return trimmed;
}

function normalizeHeader(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Only selected columns, returns array of objects with ONLY 9 keys.
 * Same as Apps Script columnMapping: A,H,L,K,F,I,Z,AA,AC
 */
export async function fetchOutstanding9Cols(): Promise<
  Array<Record<string, string | number | boolean>>
> {
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

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  const cols =
    res.data.valueRanges?.map((vr) => (vr.values ?? []) as string[][]) ?? [];

  // headers = first row of each column
  const headers = cols.map((col) => col[0]?.[0] ?? "");
  const keys = headers.map(normalizeHeader);

  // find max rows length among all columns
  const maxLen = Math.max(...cols.map((c) => c.length), 0);

  const out: Array<Record<string, string | number | boolean>> = [];

  // start from row index 1 (because row index 0 = header)
  for (let r = 1; r < maxLen; r++) {
    const obj: Record<string, string | number | boolean> = {};

    for (let c = 0; c < cols.length; c++) {
      const cell = cols[c][r]?.[0] ?? "";
      obj[keys[c] || `col_${c}`] = parseValue(cell);
    }

    // Apps Script jaisa filter: AC != 0  (AC is last selected column)
    const acKey = keys[8];
    const acVal = obj[acKey];
    const acNum = typeof acVal === "number" ? acVal : Number(acVal);
    if (Number.isNaN(acNum) || acNum === 0) continue;

    out.push(obj);
  }

  return out;
}