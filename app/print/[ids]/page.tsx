"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_LABEL, type Ministerio } from "@/lib/types";

interface Row {
  id: string;
  codigo_seguridad: string;
  checkin_at: string;
  primera_vez: boolean;
  child: { nombre: string; apellido: string; ministerio: Ministerio; alergias: string | null };
  guardian: { nombre: string; apellido: string };
}

export default function PrintPage({ params }: { params: { ids: string } }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = decodeURIComponent(params.ids).split(",").filter(Boolean);
    (async () => {
      const { data } = await supabase
        .from("checkins")
        .select(
          "id, codigo_seguridad, checkin_at, primera_vez, child:children(nombre, apellido, ministerio, alergias), guardian:guardians!checkin_guardian_id(nombre, apellido)"
        )
        .in("id", ids);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [params.ids, supabase]);

  // Generate QR codes
  useEffect(() => {
    if (rows.length === 0) return;
    import("qrcode").then((QR) => {
      const promises = rows.map(async (r) => {
        const url = await QR.toDataURL(r.codigo_seguridad, {
          width: 120,
          margin: 1,
          color: { dark: "#000000", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
        return { id: r.id, url };
      });
      Promise.all(promises).then((results) => {
        const map: Record<string, string> = {};
        results.forEach((r) => { map[r.id] = r.url; });
        setQrUrls(map);
      });
    });
  }, [rows]);

  // Auto-print when ready
  useEffect(() => {
    if (!loading && rows.length > 0 && Object.keys(qrUrls).length === rows.length) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [loading, rows.length, qrUrls]);

  if (loading) return <p style={{ padding: 24 }}>Cargando etiquetas…</p>;
  if (rows.length === 0) return <p style={{ padding: 24 }}>No se encontraron check-ins.</p>;

  const fecha = new Date(rows[0].checkin_at).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
  const familia = rows[0].guardian;

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-wrap">
        {/* Preview controls (hidden on print) */}
        <div className="no-print" style={{ textAlign: "center", padding: "16px", background: "#f5f3ef" }}>
          <button onClick={() => window.print()} className="btn-brand">
            🖨️ Imprimir etiquetas
          </button>
          <p style={{ marginTop: 8, fontSize: 13, color: "#8A8178" }}>
            Configurar impresora: Rollo DK-2205 (62mm) · Sin márgenes · Ajuste automático
          </p>
        </div>

        {/* Child labels */}
        {rows.map((r) => (
          <ChildLabel key={r.id} row={r} fecha={fecha} qrUrl={qrUrls[r.id]} />
        ))}

        {/* Parent receipt label */}
        <ParentLabel familia={familia} rows={rows} fecha={fecha} />
      </div>
    </>
  );
}

/* ─── Print CSS ─────────────────────────────────────────────── */
const printStyles = `
  @page {
    size: 62mm auto;
    margin: 0;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 62mm;
    }
    .no-print { display: none !important; }
    .label {
      page-break-after: always;
      page-break-inside: avoid;
      border: none !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    .label:last-child {
      page-break-after: auto;
    }
  }
  @media screen {
    .print-wrap {
      background: #e8e4dc;
      min-height: 100vh;
      padding: 16px 0;
    }
    .label {
      margin: 12px auto !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
  }
`;

/* ─── Styles ────────────────────────────────────────────────── */
const labelFrame: React.CSSProperties = {
  width: "62mm",
  boxSizing: "border-box",
  background: "#fff",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const MIN_BG: Record<Ministerio, string> = {
  kids: "#1D9E75",
  tweens: "#7F77DD",
  sensorial: "#D85A30",
};

/* ─── Child Label Component ─────────────────────────────────── */
function ChildLabel({ row, fecha, qrUrl }: { row: Row; fecha: string; qrUrl?: string }) {
  const bgColor = MIN_BG[row.child.ministerio];

  return (
    <div className="label" style={labelFrame}>
      {/* Header bar with ministry color */}
      <div
        style={{
          background: bgColor,
          color: "#fff",
          padding: "2mm 3mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11pt", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          ARM {MIN_LABEL[row.child.ministerio]}
        </span>
        <span style={{ fontSize: "8pt", opacity: 0.9 }}>{fecha}</span>
      </div>

      {/* Body */}
      <div style={{ padding: "2.5mm 3mm 3mm", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5mm" }}>
        {/* Name */}
        <div>
          <div style={{ fontSize: "26pt", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.5px" }}>
            {row.child.nombre}
          </div>
          <div style={{ fontSize: "12pt", color: "#444", lineHeight: 1.2, marginTop: "0.5mm" }}>
            {row.child.apellido}
          </div>
        </div>

        {/* First time badge */}
        {row.primera_vez && (
          <div style={{ fontSize: "8pt", fontWeight: 700, color: bgColor, letterSpacing: "0.5px" }}>
            ⭐ PRIMERA VEZ
          </div>
        )}

        {/* Allergy warning */}
        {row.child.alergias && (
          <div
            style={{
              border: "2pt solid #C00",
              background: "#FFF5F5",
              color: "#C00",
              fontWeight: 700,
              fontSize: "9pt",
              padding: "1mm 2mm",
              borderRadius: "1.5mm",
              letterSpacing: "0.3px",
            }}
          >
            ⚠️ ALERGIA: {row.child.alergias.toUpperCase()}
          </div>
        )}

        {/* QR + Code section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3mm",
            marginTop: "1mm",
            padding: "1.5mm",
            border: "1.5pt solid #222",
            borderRadius: "2mm",
          }}
        >
          {qrUrl && (
            <img
              src={qrUrl}
              alt="QR"
              style={{ width: "14mm", height: "14mm", imageRendering: "pixelated" }}
            />
          )}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "6.5pt", color: "#666", letterSpacing: "0.5px", marginBottom: "0.3mm" }}>
              CÓDIGO RETIRO
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "20pt", fontWeight: 800, letterSpacing: "2px", lineHeight: 1 }}>
              {row.codigo_seguridad}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Parent Receipt Label ──────────────────────────────────── */
function ParentLabel({
  familia,
  rows,
  fecha,
}: {
  familia: { nombre: string; apellido: string };
  rows: Row[];
  fecha: string;
}) {
  return (
    <div className="label" style={labelFrame}>
      {/* Header */}
      <div
        style={{
          background: "#222",
          color: "#fff",
          padding: "2mm 3mm",
          fontSize: "10pt",
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>🎟 COMPROBANTE</span>
        <span style={{ fontSize: "8pt", opacity: 0.8 }}>{fecha}</span>
      </div>

      {/* Body */}
      <div style={{ padding: "2mm 3mm 3mm", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "9pt", color: "#555", marginBottom: "1.5mm" }}>
          Familia <strong>{familia.nombre} {familia.apellido}</strong>
        </div>

        {/* Children list */}
        <div style={{ flex: 1 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "0.75pt solid #ddd",
                padding: "1.5mm 0",
              }}
            >
              <span style={{ fontSize: "10pt", display: "flex", alignItems: "center", gap: "1.5mm" }}>
                <span
                  style={{
                    fontSize: "7pt",
                    fontWeight: 700,
                    background: MIN_BG[r.child.ministerio],
                    color: "#fff",
                    borderRadius: "1mm",
                    padding: "0.3mm 1.2mm",
                  }}
                >
                  {MIN_LABEL[r.child.ministerio].charAt(0)}
                </span>
                <strong>{r.child.nombre}</strong> {r.child.apellido}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "12pt",
                  fontWeight: 700,
                  letterSpacing: "1px",
                }}
              >
                {r.codigo_seguridad}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: "7pt",
            color: "#666",
            marginTop: "1.5mm",
            lineHeight: 1.3,
            borderTop: "0.75pt solid #ddd",
            paddingTop: "1.5mm",
          }}
        >
          Presenta este comprobante para retirar. El código debe coincidir con la etiqueta del niño.
        </div>
      </div>
    </div>
  );
}
