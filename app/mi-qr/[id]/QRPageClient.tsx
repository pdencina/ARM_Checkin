"use client";

import { useEffect, useState } from "react";
import QRCodeDisplay from "@/components/QRCodeDisplay";

const STORAGE_KEY = (id: string) => `arm-qr-verified-${id}`;
const EXPIRY_DAYS = 30;

export default function QRPageClient({
  guardianId,
  nombre,
  apellido,
  hasCredential, // si el tutor tiene email o teléfono registrado
}: {
  guardianId: string;
  nombre: string;
  apellido: string;
  hasCredential: boolean;
}) {
  const [verified, setVerified] = useState(false);
  const [credential, setCredential] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);

  // Revisar si ya verificó antes (localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY(guardianId));
      if (stored) {
        const { expiry } = JSON.parse(stored);
        if (Date.now() < expiry) {
          setVerified(true);
        } else {
          localStorage.removeItem(STORAGE_KEY(guardianId));
        }
      }
    } catch {}
    setChecking(false);
  }, [guardianId]);

  async function verify() {
    if (!credential.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/verify-guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianId, credential: credential.trim() }),
      });
      const { valid } = await res.json();
      if (valid) {
        // Guardar verificación por 30 días
        localStorage.setItem(STORAGE_KEY(guardianId), JSON.stringify({
          expiry: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        }));
        setVerified(true);
      } else {
        setError("El dato ingresado no coincide con el registro de esta familia.");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const styles = {
    page: {
      minHeight: "100vh", background: "#F4F6F9",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    } as React.CSSProperties,
    card: {
      background: "#fff", borderRadius: 16, border: "0.5px solid #E3E7EE",
      width: "100%", maxWidth: 360, overflow: "hidden",
    } as React.CSSProperties,
    header: {
      background: "#1A3A5C", padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 10,
    } as React.CSSProperties,
    body: { padding: "24px 20px" } as React.CSSProperties,
    footer: {
      borderTop: "0.5px solid #E3E7EE", padding: "12px 20px", textAlign: "center" as const,
    } as React.CSSProperties,
  };

  if (checking) return <main style={styles.page}><div style={{ ...styles.card }}><div style={styles.header}><Header /></div></div></main>;

  return (
    <main style={styles.page}>
      <div style={styles.card}>

        {/* Header ARM */}
        <div style={styles.header}><Header /></div>

        <div style={styles.body}>
          <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: "#1A2433" }}>
            Familia {apellido}
          </p>

          {/* ── Estado: NO verificado ──────────────────── */}
          {!verified && (
            <>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#7A8799", lineHeight: 1.5 }}>
                Hola {nombre}, ingresa tu correo o teléfono registrado para ver tu código de acceso.
              </p>

              {hasCredential ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7A8799", marginBottom: 6 }}>
                      Correo o teléfono
                    </label>
                    <input
                      type="text"
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && verify()}
                      placeholder="ej. maria@gmail.com o +56 9 1234..."
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 12px", border: "0.5px solid #E3E7EE",
                        borderRadius: 8, fontSize: 14, color: "#1A2433",
                        background: "#F4F6F9", outline: "none",
                      }}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div style={{ background: "#FBF0E8", border: "0.5px solid #B34A0D", borderRadius: 8, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#B34A0D", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                      <p style={{ margin: 0, fontSize: 12, color: "#7A3208", lineHeight: 1.5 }}>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={verify}
                    disabled={loading || !credential.trim()}
                    style={{
                      width: "100%", padding: "11px 16px",
                      background: loading || !credential.trim() ? "#E3E7EE" : "#1A3A5C",
                      border: "none", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, color: loading || !credential.trim() ? "#7A8799" : "#fff",
                      cursor: loading || !credential.trim() ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all .15s",
                    }}
                  >
                    {loading ? (
                      <><i className="ti ti-loader-2" style={{ fontSize: 16 }} aria-hidden="true" />Verificando…</>
                    ) : (
                      <><i className="ti ti-shield-check" style={{ fontSize: 16 }} aria-hidden="true" />Ver mi QR</>
                    )}
                  </button>

                  <p style={{ margin: "12px 0 0", fontSize: 11, color: "#B0B8C4", textAlign: "center", lineHeight: 1.5 }}>
                    Tu dato solo se usa para verificar tu identidad. No se almacena ninguna información adicional.
                  </p>
                </>
              ) : (
                <div style={{ background: "#EBF2FA", borderRadius: 8, padding: "14px", textAlign: "center" }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 20, color: "#1A3A5C", display: "block", marginBottom: 8 }} aria-hidden="true" />
                  <p style={{ margin: 0, fontSize: 13, color: "#3B5A80", lineHeight: 1.5 }}>
                    Esta familia no tiene correo ni teléfono registrado. Pídele al staff que lo agregue en el sistema.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Estado: verificado ─────────────────────── */}
          {verified && (
            <>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#7A8799" }}>
                Hola {nombre} — este es tu código de acceso
              </p>

              {/* QR */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ padding: 12, background: "#fff", borderRadius: 12, border: "0.5px solid #E3E7EE" }}>
                  <QRCodeDisplay guardianId={guardianId} nombre={nombre} size={200} />
                </div>
              </div>

              {/* Instrucción */}
              <div style={{ background: "#EBF2FA", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1A3A5C", fontWeight: 500 }}>Cómo usarlo</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#3B5A80", lineHeight: 1.5 }}>
                  Muestra este QR en la entrada del encuentro. El staff lo escaneará y tus hijos aparecerán listos para el check-in.
                </p>
              </div>

              {/* Tip guardar */}
              <div style={{ border: "0.5px dashed #E3E7EE", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#7A8799", lineHeight: 1.5 }}>
                  <strong style={{ color: "#1A2433" }}>Tip:</strong> guarda esta página en favoritos o en la pantalla de inicio de tu teléfono para tenerla siempre a mano.
                </p>
              </div>

              {/* Copiar link */}
              <button
                onClick={copyLink}
                style={{
                  width: "100%", padding: "10px 16px",
                  background: copied ? "#E3F5EE" : "#F4F6F9",
                  border: `0.5px solid ${copied ? "#0A8F63" : "#E3E7EE"}`,
                  borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: copied ? "#065E41" : "#7A8799",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all .15s",
                }}
              >
                <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} style={{ fontSize: 16 }} aria-hidden="true" />
                {copied ? "¡Link copiado!" : "Copiar link para compartir"}
              </button>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <p style={{ margin: 0, fontSize: 11, color: "#B0B8C4" }}>
            ARM Global · Sistema de check-in ministerial
          </p>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <>
      <div style={{ width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="ti ti-triangle" style={{ fontSize: 14, color: "#fff" }} aria-hidden="true" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "-0.2px" }}>ARM Check-in</p>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Acceso familiar</p>
      </div>
    </>
  );
}
