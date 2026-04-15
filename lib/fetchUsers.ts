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

function parseValue(value: string): any {
  const trimmed = value.trim();
  if (trimmed === "") return "";

  // 👇 array string handle karega: ['a','b']
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const jsonSafe = trimmed.replace(/'/g, '"');
      return JSON.parse(jsonSafe);
    } catch (e) {
      return trimmed;
    }
  }

  const num = Number(trimmed);
  if (!isNaN(num)) return num;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  return trimmed;
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
  const sheetId = process.env.GOOGLE_SHEETS_ID!;
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
