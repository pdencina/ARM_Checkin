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

const COLOR = {
  kids: "#1D9E75",
  tweens: "#7F77DD",
};

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
  minHeight: "62mm",
  boxSizing: "border-box",
  background: "#fff",
  margin: "0 auto 12px",
  overflow: "hidden",
  border: "2.5pt solid #000",
  borderRadius: "3mm",
};

function ChildLabel({ row, fecha }: { row: Row; fecha: string }) {
  return (
    <div className="label" style={frame}>
      {/* Encabezado: negro sólido, ministerio destacado (nítido en térmica) */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "2.5mm 4mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Espacio reservado para el logo de ARM: reemplazar el recuadro por <img src="/logo.png" .../> */}
        <span style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
          <span
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: "2px",
              padding: "0.5mm 1.5mm",
              fontSize: "9pt",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            ARM
          </span>
          <span style={{ fontSize: "14pt", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
            {MIN_LABEL[row.child.ministerio]}
          </span>
        </span>
        <span style={{ fontSize: "9pt" }}>{fecha}</span>
      </div>

      <div style={{ padding: "3mm 4mm 4mm", textAlign: "center" }}>
        <div style={{ fontSize: "8pt", color: "#666", letterSpacing: "1px", textTransform: "uppercase" }}>
          Nombre
        </div>
        <div style={{ fontSize: "30pt", fontWeight: 700, lineHeight: 1, margin: "1mm 0" }}>
          {row.child.nombre}
        </div>
        <div style={{ fontSize: "13pt", color: "#333", marginBottom: "3mm" }}>{row.child.apellido}</div>

        {row.child.alergias && (
          <div
            style={{
              border: "1.5pt solid #000",
              fontWeight: 700,
              fontSize: "10pt",
              padding: "1.5mm 3mm",
              borderRadius: "2mm",
              marginBottom: "3mm",
            }}
          >
            ⚠ ALERGIA: {row.child.alergias.toUpperCase()}
          </div>
        )}

        <div
          style={{
            border: "2pt solid #000",
            borderRadius: "2mm",
            padding: "1.5mm",
          }}
        >
          <div style={{ fontSize: "8pt", color: "#666", letterSpacing: "1px" }}>CÓDIGO</div>
          <div style={{ fontFamily: "monospace", fontSize: "30pt", fontWeight: 700, letterSpacing: "4px", lineHeight: 1 }}>
            {row.codigo_seguridad}
          </div>
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
      <div style={{ background: "#000", color: "#fff", padding: "2.5mm 4mm", fontSize: "12pt", fontWeight: 700 }}>
        🎟 COMPROBANTE DE RETIRO
      </div>
      <div style={{ padding: "3mm 4mm 4mm" }}>
        <div style={{ fontSize: "10pt", color: "#444", marginBottom: "2mm" }}>
          Familia {familia.apellido} · {fecha}
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #000",
              padding: "2mm 0",
            }}
          >
            <span style={{ fontSize: "12pt", display: "flex", alignItems: "center", gap: "2mm" }}>
              <span style={{ fontSize: "8pt", fontWeight: 700, border: "1px solid #000", borderRadius: "2px", padding: "0 1mm" }}>
                {MIN_LABEL[r.child.ministerio].charAt(0)}
              </span>
              {r.child.nombre} {r.child.apellido}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "16pt",
                fontWeight: 700,
                letterSpacing: "2px",
                border: "1.5pt solid #000",
                borderRadius: "2mm",
                padding: "0.5mm 2.5mm",
              }}
            >
              {r.codigo_seguridad}
            </span>
          </div>
        ))}
        <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "3mm", lineHeight: 1.4, borderTop: "1px solid #000", paddingTop: "2mm" }}>
          Conserva este comprobante. El código debe coincidir con el del niño para poder retirarlo.
        </div>
      </div>
    </div>
  );
}
