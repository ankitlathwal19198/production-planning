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
};

const initialState: OutstandingDataState = {
  items: [],
  status: "idle",
  error: null,
  lastUpdated: null,
};

const TTL_MS = 0;

export const fetchOutstandingData = createAsyncThunk<
  { items: OutstandingData[]; fetchedAt: string },
  { force?: boolean } | void,
  { state: any; rejectValue: string }
>(
  "outstanding/fetchOutstandingData",
  async (_arg, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/outstanding-stock", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Outstanding Data API failed (${res.status}): ${t.slice(0, 120)}`);
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
      return rejectWithValue(e?.message || "Failed to fetch outstanding data");
    }
  },
  {
    condition: (arg, { getState }) => {
      const force = !!(arg as any)?.force;
      if (force) return true; // ✅ allow force refetch

      const state = getState();
      const s: OutstandingDataState = state.outstanding;

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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutstandingData.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchOutstandingData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.lastUpdated = action.payload.fetchedAt;
      })
      .addCase(fetchOutstandingData.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || action.error.message || "Failed";
      });
  },
});

export const { clearOutstanding } = outstandingSlice.actions;
export default outstandingSlice.reducer;