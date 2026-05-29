"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_LABEL } from "@/lib/types";

interface Row {
  id: string;
  codigo_seguridad: string;
  checkin_at: string;
  child: { nombre: string; apellido: string; ministerio: "kids" | "tweens"; alergias: string | null };
  guardian: { nombre: string; apellido: string };
}

export default function PrintPage({ params }: { params: { ids: string } }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = decodeURIComponent(params.ids).split(",").filter(Boolean);
    (async () => {
      const { data } = await supabase
        .from("checkins")
        .select(
          "id, codigo_seguridad, checkin_at, child:children(nombre, apellido, ministerio, alergias), guardian:guardians!checkin_guardian_id(nombre, apellido)"
        )
        .in("id", ids);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [params.ids, supabase]);

  useEffect(() => {
    if (!loading && rows.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, rows.length]);

  if (loading) return <p style={{ padding: 24 }}>Cargando etiquetas…</p>;
  if (rows.length === 0) return <p style={{ padding: 24 }}>No se encontraron check-ins.</p>;

  const fecha = new Date(rows[0].checkin_at).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
  const familia = rows[0].guardian;

  return (
    <div className="print-wrap" style={{ background: "#f0ece4", minHeight: "100vh", padding: "16px 0" }}>
      <div className="no-print" style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => window.print()} className="btn-brand">
          🖨️ Imprimir
        </button>
        <p style={{ marginTop: 8, fontSize: 13, color: "#8A8178" }}>
          Se imprime automáticamente. Si no, usa el botón.
        </p>
      </div>

      {rows.map((r) => (
        <ChildLabel key={r.id} row={r} fecha={fecha} />
      ))}

      <ParentLabel familia={familia} rows={rows} fecha={fecha} />
    </div>
  );
}

const frame: React.CSSProperties = {
  width: "62mm",
  height: "50mm",
  boxSizing: "border-box",
  background: "#fff",
  margin: "0 auto 10px",
  overflow: "hidden",
  border: "2pt solid #000",
  borderRadius: "2mm",
  display: "flex",
  flexDirection: "column",
};

function ChildLabel({ row, fecha }: { row: Row; fecha: string }) {
  return (
    <div className="label" style={frame}>
      {/* Encabezado compacto en una sola línea */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "1.5mm 3mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
          <span
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: "1px",
              padding: "0 1mm",
              fontSize: "7pt",
              fontWeight: 700,
            }}
          >
            ARM
          </span>
          <span style={{ fontSize: "12pt", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {MIN_LABEL[row.child.ministerio]}
          </span>
        </span>
        <span style={{ fontSize: "8pt" }}>{fecha}</span>
      </div>

      {/* Cuerpo: nombre + (alergia) + código, repartido en el alto */}
      <div
        style={{
          padding: "1.5mm 3mm 2mm",
          textAlign: "center",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1.5mm",
        }}
      >
        <div>
          <div style={{ fontSize: "24pt", fontWeight: 700, lineHeight: 1 }}>{row.child.nombre}</div>
          <div style={{ fontSize: "11pt", color: "#333", lineHeight: 1.1 }}>{row.child.apellido}</div>
        </div>

        {row.child.alergias && (
          <div
            style={{
              border: "1pt solid #000",
              fontWeight: 700,
              fontSize: "9pt",
              padding: "0.8mm 2mm",
              borderRadius: "1.5mm",
            }}
          >
            ⚠ ALERGIA: {row.child.alergias.toUpperCase()}
          </div>
        )}

        <div
          style={{
            border: "1.5pt solid #000",
            borderRadius: "1.5mm",
            padding: "0.8mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2mm",
          }}
        >
          <span style={{ fontSize: "7pt", color: "#555", letterSpacing: "0.5px" }}>CÓDIGO</span>
          <span style={{ fontFamily: "monospace", fontSize: "24pt", fontWeight: 700, letterSpacing: "3px", lineHeight: 1 }}>
            {row.codigo_seguridad}
          </span>
        </div>
      </div>
    </div>
  );
}

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
    <div className="label" style={frame}>
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "1.5mm 3mm",
          fontSize: "10pt",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        🎟 COMPROBANTE DE RETIRO
      </div>
      <div style={{ padding: "1.5mm 3mm 2mm", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "8.5pt", color: "#444", marginBottom: "1mm" }}>
          Familia {familia.apellido} · {fecha}
        </div>
        <div style={{ flex: 1 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "0.75pt solid #000",
                padding: "1mm 0",
              }}
            >
              <span style={{ fontSize: "10pt", display: "flex", alignItems: "center", gap: "1.5mm" }}>
                <span style={{ fontSize: "7pt", fontWeight: 700, border: "0.75pt solid #000", borderRadius: "1px", padding: "0 0.8mm" }}>
                  {MIN_LABEL[r.child.ministerio].charAt(0)}
                </span>
                {r.child.nombre} {r.child.apellido}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "13pt",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  border: "1pt solid #000",
                  borderRadius: "1.5mm",
                  padding: "0.3mm 2mm",
                }}
              >
                {r.codigo_seguridad}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "7pt", color: "#444", marginTop: "1mm", lineHeight: 1.3, borderTop: "0.75pt solid #000", paddingTop: "1mm" }}>
          Conserva este comprobante. El código debe coincidir con el del niño para retirarlo.
        </div>
      </div>
    </div>
  );
}
