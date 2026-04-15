import { NextResponse } from "next/server";
import { fetchOutstanding9Cols } from "@/lib/outstandingData";

export const runtime = "nodejs"; // googleapis works best on node runtime

export async function GET() {
  try {
    const data = await fetchOutstanding9Cols();

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
