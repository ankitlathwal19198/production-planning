import { NextResponse } from "next/server";
import { fetchSalesOrder } from "@/lib/compiledSalesOrder";

export const runtime = "nodejs"; // googleapis works best on node runtime

export async function GET() {
  try {
    const data = await fetchSalesOrder();

    return NextResponse.json(
      data,
      {
        headers: {
          // CDN/browser caching for speed (tweak as needed)
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to load entries" },
      { status: 500 }
    );
  }
}
