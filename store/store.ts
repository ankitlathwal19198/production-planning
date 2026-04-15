import { configureStore } from "@reduxjs/toolkit";
import outstandingReducer from "./slices/outstandingDataSlice";
import salesOrderReducer from "./slices/salesOrderSlice";
import usersReducer from "./slices/usersSlice";
import planningDataReducer from "./slices/planningDataSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      outstandingStock: outstandingReducer,
      salesOrder: salesOrderReducer,
      users: usersReducer,
      planningData: planningDataReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
