import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PlanningData } from "@/types";

type PlanningDataState = {
  items: PlanningData[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: PlanningDataState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchPlannedData = createAsyncThunk<PlanningData[]>(
  "plannedData/fetchPlannedData",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/planned-data", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch planned data");
      const data = (await res.json()) as PlanningData[];

      return data;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? "Unknown error") as any;
    }
  }
);

const plannedDataSlice = createSlice({
  name: "plannedData",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlannedData.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPlannedData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchPlannedData.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string) || action.error.message || "Failed";
      });
  },
});

export const {} = plannedDataSlice.actions;
export default plannedDataSlice.reducer;
