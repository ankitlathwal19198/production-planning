import { NextResponse } from "next/server";
import {
  addPlanningEntries,
  type AddPlanningLine,
  fetchSheetData,
  fetchPlanningBySalesOrder,
  fetchPlanningByLot,
  updatePlanningRowsByRowNumber,
  deletePlanningRow,
} from "@/lib/planningSheet";

export const runtime = "nodejs";

// GET: all OR by uid
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const so = searchParams.get("sales_order")?.trim();
    const lot = searchParams.get("lot")?.trim();

    // ✅ If sales_order present -> load all rows for that sales order (edit flow)
    if (so) {
      const matches = await fetchPlanningBySalesOrder(so);

      // return frontend-friendly payload:
      // each row includes rowNumber + uid (for update mapping)
      const lines = matches.map((m) => {
        const d: any = m.data;

        return {
          _rowNumber: m.rowNumber, // 👈 IMPORTANT (for update)
          _uid: m.uid, // 👈 keep for safety
          sales_order: String(d.sales_order_no ?? ""),
          buyer: String(d.buyer_name ?? ""),
          lot: String(d.lot_no ?? ""),
          quality: String(d.quality_name ?? ""),
          warehouse: String(d.wh_name_lot_location ?? ""),
          bags_for_planning: Number(d.number_of_planned_bags ?? 0),
          total_bags: 0, // sheet me nahi hota; UI outstanding se compute kar sakta
        };
      });

      const planner = String(matches?.[0]?.data?.planning_submitted_by ?? "");
      const plantName = String(matches?.[0]?.data?.plant_name ?? "");

      return NextResponse.json(
        { ok: true, sales_order: so, planner, plantName, lines },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // ✅ If lot present -> load all rows for that lot (edit flow)
    if (lot) {
      const matches = await fetchPlanningByLot(lot);

      const lines = matches.map((m) => {
        const d: any = m.data;

        return {
          _rowNumber: m.rowNumber,
          _uid: m.uid,
          sales_order: String(d.sales_order_no ?? ""),
          buyer: String(d.buyer_name ?? ""),
          lot: String(d.lot_no ?? ""),
          quality: String(d.quality_name ?? ""),
          warehouse: String(d.wh_name_lot_location ?? ""),
          bags_for_planning: Number(d.number_of_planned_bags ?? 0),
          total_bags: 0,
        };
      });

      const planner = String(matches?.[0]?.data?.planning_submitted_by ?? "");
      const plantName = String(matches?.[0]?.data?.plant_name ?? "");
      const sales_order = String(matches?.[0]?.data?.sales_order_no ?? ""); // ✅ helpful

      return NextResponse.json(
        { ok: true, lot, sales_order, planner, plantName, lines },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // default: load all entries (existing behavior)
    const data = await fetchSheetData("Planned Stock Backend!A1:J");
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to load entries" },
      { status: 500 },
    );
  }
}

// POST: create (append) - unchanged
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawLines = Array.isArray(body?.lines) ? body.lines : [];

    if (!rawLines.length) {
      return NextResponse.json(
        { ok: false, message: "No planning rows" },
        { status: 400 },
      );
    }

    for (let i = 0; i < rawLines.length; i++) {
      const rowNo = i + 1;
      const ln = rawLines[i];

      const so = String(ln?.sales_order ?? "").trim();
      const lot = String(ln?.lot ?? "").trim();
      const wh = String(ln?.warehouse ?? "").trim();

      if (!so || !lot || !wh) {
        return NextResponse.json(
          {
            ok: false,
            message: `Row ${rowNo}: Sales Order / Lot / Warehouse required`,
          },
          { status: 400 },
        );
      }

      const max = Number(ln?.total_bags ?? 0);
      const bags = Number(ln?.bags_for_planning ?? 0);

      if (!(max > 0))
        return NextResponse.json(
          { ok: false, message: `Row ${rowNo}: Max is 0` },
          { status: 400 },
        );
      if (!(bags >= 0))
        return NextResponse.json(
          { ok: false, message: `Row ${rowNo}: Bags cannot be negative` },
          { status: 400 },
        );
      if (bags > max) {
        return NextResponse.json(
          {
            ok: false,
            message: `Row ${rowNo}: Bags cannot exceed Max (${max})`,
          },
          { status: 400 },
        );
      }
    }

    const toAppend: AddPlanningLine[] = rawLines.map((ln: any) => ({
      sales_order_no: String(ln.sales_order ?? ""),
      buyer_name: String(ln.buyer ?? ""),
      lot_no: String(ln.lot ?? ""),
      quality_name: String(ln.quality ?? ""),
      wh_name_lot_location: String(ln.warehouse ?? ""),
      number_of_planned_bags: Number(ln.bags_for_planning ?? 0),
      plant_name: String(body?.plantName ?? "").trim(),
      planning_submitted_by: String(body?.planner ?? "").trim(),
    }));

    const result = await addPlanningEntries(toAppend);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/planning error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to submit planning" },
      { status: 500 },
    );
  }
}

// ✅ PUT: edit/update by UID (UID = start UID)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const so = String(body?.sales_order ?? "").trim();
    const rawLines = Array.isArray(body?.lines) ? body.lines : [];

    if (!so) {
      return NextResponse.json(
        { ok: false, message: "sales_order required" },
        { status: 400 },
      );
    }
    if (!rawLines.length) {
      return NextResponse.json(
        { ok: false, message: "No planning rows" },
        { status: 400 },
      );
    }

    // ✅ Convert frontend lines -> rowsToUpdate (by rowNumber + uid)
    const rowsToUpdate = rawLines.map((ln: any, idx: number) => {
      const rowNumber = Number(ln?._rowNumber);
      const uid = String(ln?._uid ?? "").trim();

      if (!(rowNumber >= 2) || !uid) {
        throw new Error(
          `Row ${idx + 1}: missing _rowNumber/_uid (required for edit update)`,
        );
      }

      return {
        rowNumber,
        uid,
        sales_order_no: String(ln.sales_order ?? ""),
        buyer_name: String(ln.buyer ?? ""),
        lot_no: String(ln.lot ?? ""),
        quality_name: String(ln.quality ?? ""),
        wh_name_lot_location: String(ln.warehouse ?? ""),
        number_of_planned_bags: Number(ln.bags_for_planning ?? 0),
        plant_name: String(body?.plantName ?? "").trim(),
        planning_submitted_by: String(body?.planner ?? "").trim(),
      };
    });

    const result = await updatePlanningRowsByRowNumber(rowsToUpdate);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("PUT /api/planned-data error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to update planning" },
      { status: 500 },
    );
  }
}

// ✅ DELETE: delete row by rowNumber
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rowNumber = Number(searchParams.get("rowNumber"));

    if (!(rowNumber >= 2)) {
      return NextResponse.json(
        { ok: false, message: "Invalid rowNumber" },
        { status: 400 },
      );
    }

    const result = await deletePlanningRow(rowNumber);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /api/planned-data error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to delete row" },
      { status: 500 },
    );
  }
}
