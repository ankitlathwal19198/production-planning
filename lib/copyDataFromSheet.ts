// lib/copyDataFromSheet.ts
import { google } from "googleapis";

/**
 * Email -> CRM Name map
 */
const CRM_USERS: Record<string, string> = {
  "crm@shaziarice.com": "Sawanti",
  "crm1@shaziarice.com": "Shivani",
  "crm2@shaziarice.com": "Nidhi",
  "crm3@shaziarice.com": "Sulochana",
  "crm4@shaziarice.com": "Manmeet",
  "crm5@shaziarice.com": "Lakshmi",
  "crm6@shaziarice.com": "Nishi",
  "crm7@shaziarice.com": "Neha",
  "crm8@shaziarice.com": "Sanskriti",
  "operations.hrexports@shaziarice.com": "Pooja",
};

/**
 * Source -> Target mapping (1-based indices from source).
 * "" means blank output cell (except special case for j==3 CRM name)
 */
const MAPPING: (number | "")[] = [
  1, 2, 3, "", 4, 5, 6, "", 7, "",
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
  18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, "", "", "",
  32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, "", "", 45, "", 46, 47, "",
  "", 48, 49, "", 50, "", "", "", 51
];

const BATCH_SIZE = 100;

// ------------------- helpers -------------------
function columnLetterToIndex(letter: string) {
  let col = 0;
  for (const ch of letter.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return col;
}

function indexToColumnLetter(index1Based: number) {
  let n = index1Based;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseA1StartCell(a1: string) {
  const row = Number(a1.match(/\d+/)?.[0] ?? "1");
  const colLetters = a1.match(/[A-Z]+/i)?.[0] ?? "A";
  return { row, col: columnLetterToIndex(colLetters) };
}

function properCase(s: string) {
  const a = s.toLowerCase().split(/\s+/);
  for (let i = 0; i < a.length; i++) {
    const w = a[i];
    if (!w) continue;
    a[i] = w.charAt(0).toUpperCase() + w.slice(1);
  }
  return a.join(" ");
}

function getSheetsClient() {
  const base64 = process.env.GOOGLE_CREDENTIALS;
  if (!base64) throw new Error("Missing env GOOGLE_CREDENTIALS (base64 service account json).");

  const cleaned = base64.trim().replace(/^"|"$/g, "");
  const jsonStr = Buffer.from(cleaned, "base64").toString("utf8");
  const credentials = JSON.parse(jsonStr);

  if (!credentials.client_email) throw new Error("GOOGLE_CREDENTIALS missing client_email");
  if (!credentials.private_key) throw new Error("GOOGLE_CREDENTIALS missing private_key");

  credentials.private_key = String(credentials.private_key).replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function buildOutputRows(srcRows: any[][]) {
  const outCols = MAPPING.length;

  // mapping[2] is 3rd output col's source col (email assumed there from your script)
  const emailSourceIndex = (MAPPING[2] as number) - 1;

  const STRIP_PI_OUT_INDEX = 1;      // 2nd output col
  const PROPER_CASE_OUT_INDEX = 58;  // 59th output col

  return srcRows.map((srcRow) => {
    const outRow = new Array(outCols);

    for (let j = 0; j < outCols; j++) {
      const m = MAPPING[j];

      if (m === "") {
        // Special: 4th output column (index 3) = CRM display name using email
        if (j === 3 && emailSourceIndex >= 0) {
          const email = String(srcRow[emailSourceIndex] ?? "");
          outRow[j] = CRM_USERS[email] || "";
        } else {
          outRow[j] = "";
        }
        continue;
      }

      let v = srcRow[m - 1];

      // strip PI-
      if (j === STRIP_PI_OUT_INDEX && typeof v === "string" && v) {
        v = v.replace(/^PI-/, "");
      }

      // proper case
      if (j === PROPER_CASE_OUT_INDEX && typeof v === "string" && v) {
        v = properCase(v);
      }

      outRow[j] = v ?? "";
    }

    return outRow;
  });
}

// ------------------- main exported function -------------------
export async function copyDataFromSheet() {
  const SOURCE_SHEET_ID = process.env.SOURCE_SHEET_ID!;
  const SOURCE_TAB = process.env.SOURCE_TAB!;
  const TARGET_SHEET_ID = process.env.TARGET_SHEET_ID!;
  const TARGET_TAB = process.env.TARGET_TAB!;
  const TARGET_START_CELL = process.env.TARGET_START_CELL!;

  if (!SOURCE_SHEET_ID || !SOURCE_TAB || !TARGET_SHEET_ID || !TARGET_TAB || !TARGET_START_CELL) {
    throw new Error("Missing env vars. Need SOURCE_SHEET_ID, SOURCE_TAB, TARGET_SHEET_ID, TARGET_TAB, TARGET_START_CELL.");
  }

  const sheets = getSheetsClient();

  // Need up to max mapped col & col 48 for rejected filter
  const maxMappedCol = Math.max(
    48,
    ...MAPPING.filter((m): m is number => typeof m === "number")
  );

  // Read from A2 to maxMappedCol, open-ended rows
  const sourceRange = `${SOURCE_TAB}!A2:${indexToColumnLetter(maxMappedCol)}`;

  const readResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SOURCE_SHEET_ID,
    range: sourceRange,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const values = (readResp.data.values ?? []) as any[][];
  if (values.length === 0) return { written: 0, message: "No source rows found." };

  // Filter out rejected where source col 48 (index 47) == rejected
  const filtered = values.filter((r) => String(r[47] ?? "").toLowerCase() !== "rejected");
  if (filtered.length === 0) return { written: 0, message: "All rows rejected; nothing to write." };

  // Build output rows
  const outRows = buildOutputRows(filtered);

  // Target range geometry
  const { row: startRow, col: startCol } = parseA1StartCell(TARGET_START_CELL);
  const outCols = MAPPING.length;

  const startColLetter = indexToColumnLetter(startCol);
  const endColLetter = indexToColumnLetter(startCol + outCols - 1);

  // Write in batches
  let written = 0;

  for (let i = 0; i < outRows.length; i += BATCH_SIZE) {
    const batch = outRows.slice(i, i + BATCH_SIZE);
    const rowNumber = startRow + written;

    const writeRange = `${TARGET_TAB}!${startColLetter}${rowNumber}:${endColLetter}${rowNumber + batch.length - 1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: TARGET_SHEET_ID,
      range: writeRange,
      valueInputOption: "RAW",
      requestBody: { values: batch },
    });

    written += batch.length;
  }

  return { written, message: "Done" };
}
