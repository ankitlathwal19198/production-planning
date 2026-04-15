import type { AppDispatch } from "@/store/store"; // adjust path
// ✅ import your thunks
import { fetchOutstandingData } from "@/store/slices/outstandingDataSlice";
import { fetchSalesOrder } from "@/store/slices/salesOrderSlice";
import { fetchUsers } from "@/store/slices/usersSlice";
import { fetchPlannedData } from "@/store/slices/planningDataSlice";
// add more thunks here

type LoadAllDataOptions = {
  force?: boolean;
};

export async function loadAllData(dispatch: AppDispatch, opts: LoadAllDataOptions = {}) {
  const { force = false } = opts;

  // IMPORTANT: unwrap() makes Promise.all fail if any thunk rejects
  await Promise.all([
    dispatch(fetchOutstandingData({ force })).unwrap(),
    dispatch(fetchSalesOrder({ force })).unwrap(),
    dispatch(fetchUsers()).unwrap(),
    dispatch(fetchPlannedData()).unwrap(),
  ]);
}
