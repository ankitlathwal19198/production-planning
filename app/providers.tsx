"use client";

import * as React from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  // important: create store once per browser session
  const storeRef = React.useRef<ReturnType<typeof makeStore> | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();

  return <Provider store={storeRef.current}>{children}</Provider>;
}
