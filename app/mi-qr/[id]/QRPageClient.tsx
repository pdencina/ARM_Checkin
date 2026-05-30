"use client";

import { useState } from "react";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function QRPageClient({
  guardianId,
  nombre,
  apellido,
}: {
  guardianId: string;
  nombre: string;
  apellido: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4F6F9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "0.5px solid #E3E7EE",
          width: "100%",
          maxWidth: 360,
          overflow: "hidden",
        }}
      >
        {/* Header ARM */}
        <div
          style={{
            background: "#1A3A5C",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="ti ti-triangle" style={{ fontSize: 14, color: "#fff" }} aria-hidden="true" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "-0.2px" }}>
              ARM Check-in
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
              Acceso familiar
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: "#1A2433" }}>
            Familia {apellido}
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#7A8799" }}>
            Hola {nombre} — este es tu código de acceso
          </p>

          {/* QR */}
          <div
            style={{
              display: "inline-flex",
              padding: 12,
              background: "#fff",
              borderRadius: 12,
              border: "0.5px solid #E3E7EE",
              marginBottom: 20,
            }}
          >
            <QRCodeDisplay guardianId={guardianId} nombre={nombre} size={200} />
          </div>

          {/* Instrucción */}
          <div
            style={{
              background: "#EBF2FA",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#1A3A5C", fontWeight: 500 }}>
              Cómo usarlo
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#3B5A80", lineHeight: 1.5 }}>
              Muestra este código en la entrada del encuentro. El staff lo escaneará y tus hijos
              aparecerán automáticamente para el check-in.
            </p>
          </div>

          {/* Tip: guardar */}
          <div
            style={{
              border: "0.5px dashed #E3E7EE",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#7A8799", lineHeight: 1.5 }}>
              <strong style={{ color: "#1A2433" }}>Tip:</strong> guarda esta página en favoritos o
              en la pantalla de inicio de tu teléfono para tenerla siempre a mano.
            </p>
          </div>

          {/* Botón copiar link */}
          <button
            onClick={copyLink}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: copied ? "#E3F5EE" : "#F4F6F9",
              border: `0.5px solid ${copied ? "#0A8F63" : "#E3E7EE"}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: copied ? "#065E41" : "#7A8799",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all .15s",
            }}
          >
            <i
              className={`ti ${copied ? "ti-check" : "ti-copy"}`}
              style={{ fontSize: 16 }}
              aria-hidden="true"
            />
            {copied ? "¡Link copiado!" : "Copiar link para compartir"}
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "0.5px solid #E3E7EE",
            padding: "12px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: "#B0B8C4" }}>
            ARM Global · Sistema de check-in ministerial
          </p>
        </div>
      </div>
    </main>
  );
}
