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
  kids: { bar: "#0F9E78", soft: "#E1F5EE" },
  tweens: { bar: "#6D5BD0", soft: "#EEEDFE" },
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
    <div style={{ background: "#f0ece4", minHeight: "100vh", padding: "16px 0" }}>
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
  minHeight: "75mm",
  boxSizing: "border-box",
  background: "#fff",
  margin: "0 auto 12px",
  overflow: "hidden",
  border: "1px solid #ddd",
};

function ChildLabel({ row, fecha }: { row: Row; fecha: string }) {
  const c = COLOR[row.child.ministerio];
  return (
    <div className="label" style={frame}>
      <div
        style={{
          background: c.bar,
          color: "#fff",
          padding: "2.5mm 4mm",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11pt",
          fontWeight: 600,
        }}
      >
        <span>ARM {MIN_LABEL[row.child.ministerio]}</span>
        <span>{fecha}</span>
      </div>
      <div style={{ padding: "4mm" }}>
        <div style={{ fontSize: "9pt", color: "#888" }}>Nombre</div>
        <div style={{ fontSize: "26pt", fontWeight: 700, lineHeight: 1.05 }}>{row.child.nombre}</div>
        <div style={{ fontSize: "13pt", color: "#555", marginBottom: "3mm" }}>{row.child.apellido}</div>

        {row.child.alergias && (
          <div
            style={{
              background: "#fde8e8",
              color: "#a32d2d",
              fontWeight: 700,
              fontSize: "10pt",
              padding: "2mm 3mm",
              borderRadius: 6,
              marginBottom: "3mm",
            }}
          >
            ⚠️ Alergia: {row.child.alergias}
          </div>
        )}

        <div style={{ borderTop: "1px solid #eee", paddingTop: "2.5mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "9pt", color: "#888" }}>Código</span>
          <span style={{ fontFamily: "monospace", fontSize: "30pt", fontWeight: 700, letterSpacing: "3px" }}>
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
      <div style={{ background: "#2B2622", color: "#fff", padding: "2.5mm 4mm", fontSize: "11pt", fontWeight: 600 }}>
        🎟️ Comprobante de retiro
      </div>
      <div style={{ padding: "4mm" }}>
        <div style={{ fontSize: "10pt", color: "#666", marginBottom: "2mm" }}>
          Familia {familia.apellido} · {fecha}
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #eee",
              padding: "2mm 0",
            }}
          >
            <span style={{ fontSize: "12pt" }}>
              {r.child.nombre} {r.child.apellido}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "16pt",
                fontWeight: 700,
                letterSpacing: "2px",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "1mm 2.5mm",
              }}
            >
              {r.codigo_seguridad}
            </span>
          </div>
        ))}
        <div style={{ fontSize: "8.5pt", color: "#888", marginTop: "3mm", lineHeight: 1.4 }}>
          Conserva este comprobante. El código debe coincidir con el del niño para poder retirarlo.
        </div>
      </div>
    </div>
  );
}
