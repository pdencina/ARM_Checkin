"use client";
import { useState } from "react";

export default function DebugPin() {
  const [result, setResult] = useState<string>("Esperando...");
  const [loading, setLoading] = useState(false);

  async function test() {
    setLoading(true);
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "2312" }),
      });
      const data = await res.json();
      setResult(`Status: ${res.status} | Respuesta: ${JSON.stringify(data)}`);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 40, fontFamily: "monospace", fontSize: 14 }}>
      <h1>Debug PIN</h1>
      <button onClick={test} disabled={loading} style={{ padding: "10px 20px", marginTop: 20 }}>
        {loading ? "Probando..." : "Probar PIN 2312"}
      </button>
      <pre style={{ marginTop: 20, background: "#f0f0f0", padding: 16, borderRadius: 8 }}>
        {result}
      </pre>
      <p style={{ marginTop: 10, color: "#999" }}>
        Si dice valid: true → el PIN funciona server-side.<br/>
        Si dice valid: false → hay un problema con la env var.
      </p>
    </div>
  );
}
