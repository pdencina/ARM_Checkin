"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MiQRLandingPage() {
  const router = useRouter();
  const [credential, setCredential] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    if (!credential.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/find-guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credential.trim() }),
      });
      const { guardianId } = await res.json();
      if (guardianId) {
        router.push(`/mi-qr/${guardianId}`);
      } else {
        setError("No encontramos una familia registrada con ese dato. Verifica que el correo o teléfono sea el que entregaste al staff.");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#F4F6F9",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "0.5px solid #E3E7EE",
        width: "100%", maxWidth: 360, overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ background: "#1A3A5C", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-triangle" style={{ fontSize: 14, color: "#fff" }} aria-hidden="true" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "-0.2px" }}>ARM Check-in</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Portal de familias</p>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: "24px 20px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: "#1A2433" }}>
            Encuentra tu QR
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#7A8799", lineHeight: 1.5 }}>
            Ingresa el correo o teléfono que registraste con el staff para acceder a tu código de entrada.
          </p>

          {/* Input */}
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7A8799", marginBottom: 6 }}>
            Correo o teléfono
          </label>
          <input
            type="text"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="ej. maria@gmail.com o +56 9 1234 5678"
            autoComplete="off"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px", marginBottom: 12,
              border: "0.5px solid #E3E7EE", borderRadius: 8,
              fontSize: 14, color: "#1A2433",
              background: "#F4F6F9", outline: "none",
            }}
          />

          {/* Error */}
          {error && (
            <div style={{ background: "#FBF0E8", border: "0.5px solid #B34A0D", borderRadius: 8, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#B34A0D", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p style={{ margin: 0, fontSize: 12, color: "#7A3208", lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {/* Botón */}
          <button
            onClick={buscar}
            disabled={loading || !credential.trim()}
            style={{
              width: "100%", padding: "11px 16px",
              background: loading || !credential.trim() ? "#E3E7EE" : "#1A3A5C",
              border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 600,
              color: loading || !credential.trim() ? "#7A8799" : "#fff",
              cursor: loading || !credential.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s",
            }}
          >
            {loading ? (
              <><i className="ti ti-loader-2" style={{ fontSize: 16 }} aria-hidden="true" />Buscando…</>
            ) : (
              <><i className="ti ti-qrcode" style={{ fontSize: 16 }} aria-hidden="true" />Ver mi QR de acceso</>
            )}
          </button>

          {/* Nota */}
          <p style={{ margin: "16px 0 0", fontSize: 11, color: "#B0B8C4", textAlign: "center", lineHeight: 1.6 }}>
            ¿No tienes correo ni teléfono registrado?<br />
            Pídele al staff que actualice tus datos en el sistema.
          </p>
        </div>

        <div style={{ borderTop: "0.5px solid #E3E7EE", padding: "12px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#B0B8C4" }}>
            ARM Global · Sistema de check-in ministerial
          </p>
        </div>
      </div>
    </main>
  );
}
