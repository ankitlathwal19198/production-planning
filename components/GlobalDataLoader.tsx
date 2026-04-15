"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { loadAllData } from "@/components/loadAllData";

export default function GlobalDataLoader() {
  const dispatch = useDispatch();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    // app load fetch
    loadAllData(dispatch as any, { force: true }).catch((e) => {
      // optional: log only (no toast)
      console.error("Global loadAllData failed:", e);
    });
  }, [dispatch]);

  return null;
}
