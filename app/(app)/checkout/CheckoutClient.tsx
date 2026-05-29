"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_LABEL } from "@/lib/types";

interface Row {
  id: string;
  codigo_seguridad: string;
  checkin_guardian_id: string;
  child: { nombre: string; apellido: string; ministerio: "kids" | "tweens"; alergias: string | null };
}

export default function CheckoutClient() {
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function buscar() {
    const code = codigo.trim().toUpperCase();
    setMsg(null);
    setSearched(true);
    if (!code) return;
    const { data } = await supabase
      .from("checkins")
      .select("id, codigo_seguridad, checkin_guardian_id, child:children(nombre, apellido, ministerio, alergias)")
      .eq("estado", "checked_in")
      .eq("codigo_seguridad", code);
    setRows((data as any) ?? []);
  }

  async function retirar(row: Row) {
    setMsg(null);
    const { error } = await supabase.rpc("do_checkout", {
      p_checkin_id: row.id,
      p_codigo: codigo.trim().toUpperCase(),
      p_guardian_id: row.checkin_guardian_id,
    });
    if (error) {
      setMsg("❌ " + error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setMsg(`✅ ${row.child.nombre} ${row.child.apellido} retirado correctamente.`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Retiro</h1>
      <p className="mb-5 text-muted">Ingresa el código del comprobante del padre.</p>

      <div className="mb-4 flex gap-2">
        <input
          className="field text-center font-mono text-2xl tracking-[0.3em]"
          placeholder="CÓDIGO"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
        />
        <button className="btn-brand" onClick={buscar}>
          Verificar
        </button>
      </div>

      {searched && rows.length === 0 && (
        <p className="rounded-xl2 bg-red-50 px-4 py-3 text-center text-red-700">
          No hay ningún niño presente con ese código.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="card flex items-center gap-3 p-4">
            <span
              className={`badge ${
                r.child.ministerio === "kids" ? "bg-kids-soft text-kids-ink" : "bg-tweens-soft text-tweens-ink"
              }`}
            >
              {MIN_LABEL[r.child.ministerio]}
            </span>
            <div className="flex-1">
              <p className="font-medium">
                {r.child.nombre} {r.child.apellido}
              </p>
              {r.child.alergias && <p className="text-sm text-red-700">⚠️ {r.child.alergias}</p>}
            </div>
            <button className="btn-brand" onClick={() => retirar(r)}>
              Entregar niño
            </button>
          </div>
        ))}
      </div>

      {msg && <p className="mt-4 text-center font-medium">{msg}</p>}
    </div>
  );
}
