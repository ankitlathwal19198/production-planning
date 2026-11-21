import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { OutstandingData } from "@/types";

const unwrapRows = <T,>(payload: any, label: string): T[] => {
  if (payload && typeof payload === "object" && payload.ok === false) {
    throw new Error(`${label}: ${payload.error || "Unknown error"}`);
  }
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.data)) return payload.data as T[];
  throw new Error(`${label}: Unexpected JSON shape`);
};

export type OutstandingDataState = {
  items: OutstandingData[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastUpdated: string | null;
  /** The newest request; an older one that finishes later must not overwrite it. */
  currentRequestId: string | null;
};

const initialState: OutstandingDataState = {
  items: [],
  status: "idle",
  error: null,
  lastUpdated: null,
  currentRequestId: null,
};

const TTL_MS = 0;
// The API answers in a few seconds; past this something is stuck, so say so instead of spinning.
const REQUEST_TIMEOUT_MS = 60_000;

export const fetchOutstandingData = createAsyncThunk<
  { items: OutstandingData[]; fetchedAt: string },
  /** fresh: skip the CDN copy, e.g. right after a planning was saved. */
  { force?: boolean; fresh?: boolean } | void,
  { state: any; rejectValue: string }
>(
  "outstanding/fetchOutstandingData",
  async (arg, { rejectWithValue }) => {
    const fresh = (arg as { fresh?: boolean } | undefined)?.fresh === true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = fresh ? `/api/outstanding-stock?fresh=${Date.now()}` : "/api/outstanding-stock";
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        let apiError = "";
        try {
          apiError = JSON.parse(t)?.error ?? "";
        } catch {
          // not JSON, e.g. Vercel's own 504 page
        }
        throw new Error(apiError || `Stock API failed (${res.status}): ${t.slice(0, 120)}`);
      }

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Outstanding Data Non-JSON response: ${text.slice(0, 120)}`);
      }

      const json = await res.json();
      const rows = unwrapRows<OutstandingData>(json, "Outstanding Data");

      return { items: rows, fetchedAt: new Date().toISOString() };
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return rejectWithValue("Stock request timed out. Try again.");
      }
      return rejectWithValue(e?.message || "Failed to fetch outstanding data");
    } finally {
      clearTimeout(timer);
    }
  },
  {
    condition: (arg, { getState }) => {
      const force = !!(arg as any)?.force;
      if (force) return true; // ✅ allow force refetch

      const state = getState();
      const s: OutstandingDataState = state.outstandingStock;

      if (s.status === "loading") return false;
      if (s.status === "succeeded" && TTL_MS === 0) return false;

      if (s.status === "succeeded" && TTL_MS > 0 && s.lastUpdated) {
        const age = Date.now() - new Date(s.lastUpdated).getTime();
        if (age < TTL_MS) return false;
      }

      return true;
    },
  }
);

const outstandingSlice = createSlice({
  name: "outstanding",
  initialState,
  reducers: {
    clearOutstanding(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.lastUpdated = null;
      state.currentRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutstandingData.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchOutstandingData.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = "succeeded";
        state.items = action.payload.items;
        state.lastUpdated = action.payload.fetchedAt;
        state.currentRequestId = null;
      })
      .addCase(fetchOutstandingData.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = "failed";
        state.error = (action.payload as string) || action.error.message || "Failed";
        state.currentRequestId = null;
      });
  },
});

export const { clearOutstanding } = outstandingSlice.actions;
export default outstandingSlice.reducer;
