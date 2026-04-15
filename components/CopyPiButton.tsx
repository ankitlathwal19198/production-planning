"use client";

import { useState } from "react";

export default function CopyPiButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onCopy() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/copy-pi", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed");
      setMsg(`Done. Rows written: ${data.written}`);
    } catch (e: any) {
      setMsg(e.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onCopy} disabled={loading}>
        {loading ? "Copying..." : "Copy Data"}
      </button>
      {msg ? <p>{msg}</p> : null}
    </div>
  );
}
