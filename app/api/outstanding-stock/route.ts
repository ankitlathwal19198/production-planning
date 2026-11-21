import { NextResponse } from "next/server";
import { fetchOutstandingStock, SheetBusyError } from "@/lib/outstandingData";

export const runtime = "nodejs"; // googleapis works best on node runtime

export async function GET() {
  try {
    const { rows, source } = await fetchOutstandingStock();

    return NextResponse.json(
      rows,
      {
        headers: {
          // CDN/browser caching for speed (tweak as needed)
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120",
          // "app" = computed from the sheet's raw cells, "sheet" = the sheet's own formulas
          "X-Stock-Source": source,
        },
      }
    );
  } catch (err) {
    console.error("GET /api/outstanding-stock failed:", err);
    const busy = err instanceof SheetBusyError;
    return NextResponse.json(
      {
        ok: false,
        error: busy
          ? "Stock sheet is busy recalculating. Try again in a minute."
          : "Failed to load stock from the sheet.",
      },
      { status: busy ? 503 : 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
