import { google, sheets_v4 } from "googleapis";

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const base64Credentials = process.env.GOOGLE_CREDENTIALS || "";
const credentials = JSON.parse(
  Buffer.from(base64Credentials, "base64").toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
const usersRange = process.env.GOOGLE_SHEETS_USERS_RANGE || "PlantUsers!A2:F";

const sheets = google.sheets({ version: "v4", auth });

if (!clientEmail || !spreadsheetId) {
  throw new Error("Google Sheets environment variables are missing");
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth });
}

export type SheetUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: string;
};

export async function getAllUsers(): Promise<SheetUser[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: usersRange,
  });

  const rows = res.data.values || [];

  console.log("Fetched users from Google Sheets:", rows);
  return rows.map((row) => ({
    id: row[0],
    email: row[1],
    passwordHash: row[2],
    name: row[3] || "",
    role: row[4] || "user",
    createdAt: row[5] || "",
  }));
}

export async function findUserByEmail(
  email: string
): Promise<SheetUser | null> {
  const users = await getAllUsers();

  return (
    users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
  );
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}): Promise<SheetUser> {
  const sheets = getSheetsClient();
  const id = `user_${Date.now()}`;

  const row = [id, input.email, input.passwordHash, input.name, "User", input.createdAt];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: usersRange,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  return {
    id,
    email: input.email,
    passwordHash: input.passwordHash,
    name: input.name,
    role: "User",
    createdAt: input.createdAt,
  };
}

export async function getSheetClient(): Promise<sheets_v4.Sheets> {
  return google.sheets({ version: "v4", auth });
}

export const SHEET_ID: string = process.env.GOOGLE_SHEETS_ID as string;
export const SHEET_RANGE = "Entries!A:D";
