import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Users } from "@/types";

type UsersState = {
  items: Users[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: UsersState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchUsers = createAsyncThunk<Users[]>(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = (await res.json()) as Users[];

      // safety: if somehow allowed_users still comes as string, normalize here too
      const normalize = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String).filter(Boolean);
        const s = String(val).trim();
        if (!s) return [];
        const jsonLike = s.replace(/'/g, '"');
        try {
          const parsed = JSON.parse(jsonLike);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        } catch {}
        return s
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((x) => x.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
          .filter(Boolean);
      };

      return (data ?? []).map((u) => ({
        ...u,
        allowed_users: normalize((u as any).allowed_users),
      }));
    } catch (e: any) {
      return rejectWithValue(e?.message ?? "Unknown error") as any;
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUsers(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || action.error.message || "Failed";
      });
  },
});

export const { clearUsers } = usersSlice.actions;
export default usersSlice.reducer;
