"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_COLOR, MIN_LABEL, type AuthorizedPickup, type Ministerio } from "@/lib/types";

interface CheckoutRow {
  id: string; codigo_seguridad: string; checkin_guardian_id: string;
  child: { id: string; nombre: string; apellido: string; ministerio: Ministerio; alergias: string | null; condiciones: string | null; medicamentos: string | null; contacto_emergencia_nombre: string | null; contacto_emergencia_telefono: string | null; };
  guardian: { nombre: string; apellido: string; telefono: string | null; };
  pickups?: AuthorizedPickup[];
}

export default function CheckoutClient() {
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [checkoutNombre, setCheckoutNombre] = useState<Record<string, string>>({});

  async function buscar() {
    const code = codigo.trim().toUpperCase();
    setMsg(null); setSearched(true);
    if (!code) return;
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, codigo_seguridad, checkin_guardian_id, child:children(id, nombre, apellido, ministerio, alergias, condiciones, medicamentos, contacto_emergencia_nombre, contacto_emergencia_telefono), guardian:guardians!checkin_guardian_id(nombre, apellido, telefono)")
      .eq("estado", "checked_in").eq("codigo_seguridad", code);

    if (!checkins?.length) { setRows([]); return; }

    // Cargar autorizados para cada niño
    const childIds = checkins.map((c: any) => c.child?.id).filter(Boolean);
    const { data: pickups } = await supabase
      .from("authorized_pickups")
      .select("*").in("child_id", childIds).eq("activo", true);

    const pickupMap: Record<string, AuthorizedPickup[]> = {};
    for (const p of pickups ?? []) {
      if (!pickupMap[p.child_id]) pickupMap[p.child_id] = [];
      pickupMap[p.child_id].push(p);
    }

    setRows((checkins as any).map((c: any) => ({
      ...c, pickups: pickupMap[c.child?.id] ?? [],
    })));
  }

  async function retirar(row: CheckoutRow) {
    const nombre = checkoutNombre[row.id] ?? "";
    setMsg(null);
    const { error } = await supabase.rpc("do_checkout", {
      p_checkin_id: row.id,
      p_codigo: codigo.trim().toUpperCase(),
      p_guardian_id: row.checkin_guardian_id,
      p_checkout_nombre: nombre || null,
    });
    if (error) { setMsg("❌ " + error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setMsg(`✅ ${row.child.nombre} ${row.child.apellido} retirado.`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Retiro</h1>
      <p className="mb-5 text-muted">Ingresa el código del comprobante y verifica quién retira.</p>

      <div className="mb-4 flex gap-2">
        <input className="field text-center font-mono text-2xl tracking-[0.3em]" placeholder="CÓDIGO"
          maxLength={6} value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button className="btn-brand" onClick={buscar}>Verificar</button>
      </div>

      {searched && rows.length === 0 && (
        <p className="rounded-xl2 bg-red-50 px-4 py-3 text-center text-red-700">
          No hay ningún niño presente con ese código.
        </p>
      )}

      <div className="space-y-4">
        {rows.map((r) => {
          const col = MIN_COLOR[r.child.ministerio];
          const hasPickups = (r.pickups?.length ?? 0) > 0;
          const hasMedical = r.child.condiciones || r.child.medicamentos || r.child.contacto_emergencia_nombre;

          return (
            <div key={r.id} className="card overflow-hidden">
              {/* Header */}
              <div className={`flex items-center gap-3 px-5 py-3 ${col.bg}`}>
                <span className={`badge ${col.bg} ${col.text} border border-current`}>{MIN_LABEL[r.child.ministerio]}</span>
                <p className={`text-lg font-semibold ${col.text}`}>{r.child.nombre} {r.child.apellido}</p>
                <span className={`ml-auto font-mono font-bold tracking-widest ${col.text}`}>{r.codigo_seguridad}</span>
              </div>

              <div className="p-5 space-y-4">
                {/* Alergias / médico */}
                {(r.child.alergias || hasMedical) && (
                  <div className="space-y-1.5">
                    {r.child.alergias && (
                      <div className="flex items-center gap-2 rounded-xl2 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">
                        ⚠️ Alergia: {r.child.alergias}
                      </div>
                    )}
                    {r.child.condiciones && (
                      <div className="rounded-xl2 bg-paper px-3 py-2 text-sm">
                        <span className="font-medium">Condición:</span> {r.child.condiciones}
                      </div>
                    )}
                    {r.child.medicamentos && (
                      <div className="rounded-xl2 bg-paper px-3 py-2 text-sm">
                        <span className="font-medium">Medicamentos:</span> {r.child.medicamentos}
                      </div>
                    )}
                    {r.child.contacto_emergencia_nombre && (
                      <div className="rounded-xl2 bg-paper px-3 py-2 text-sm">
                        <span className="font-medium">Emergencia:</span> {r.child.contacto_emergencia_nombre} {r.child.contacto_emergencia_telefono && `· ${r.child.contacto_emergencia_telefono}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Autorizados de retiro */}
                <div>
                  <p className="mb-2 text-sm font-medium text-muted">Autorizados para retirar</p>
                  {!hasPickups ? (
                    <div className="rounded-xl2 bg-paper px-3 py-2 text-sm text-muted">
                      Tutor registrado: {r.guardian.nombre} {r.guardian.apellido}
                      {r.guardian.telefono && <span className="ml-2 text-muted">· {r.guardian.telefono}</span>}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 rounded-xl2 bg-paper px-3 py-2 text-sm">
                        <span className="font-medium">{r.guardian.nombre} {r.guardian.apellido}</span>
                        <span className="text-muted">(tutor principal)</span>
                      </div>
                      {r.pickups!.map((p) => (
                        <button key={p.id}
                          onClick={() => setCheckoutNombre((prev) => ({ ...prev, [r.id]: `${p.nombre} ${p.apellido}` }))}
                          className={`flex w-full items-center gap-2 rounded-xl2 px-3 py-2 text-left text-sm transition ${checkoutNombre[r.id] === `${p.nombre} ${p.apellido}` ? "bg-kids-soft ring-1 ring-kids" : "bg-paper hover:bg-line"}`}>
                          <span className="font-medium">{p.nombre} {p.apellido}</span>
                          {p.parentesco && <span className="text-muted">· {p.parentesco}</span>}
                          {p.telefono && <span className="ml-auto text-muted">{p.telefono}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quién retira (freeform) */}
                <div>
                  <p className="mb-1 text-sm font-medium text-muted">Confirmar quién retira</p>
                  <input className="field text-sm" placeholder="Nombre de quien retira (opcional)"
                    value={checkoutNombre[r.id] ?? ""}
                    onChange={(e) => setCheckoutNombre((prev) => ({ ...prev, [r.id]: e.target.value }))} />
                </div>

                <button className="btn-brand w-full" onClick={() => retirar(r)}>
                  ✅ Confirmar retiro
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {msg && <p className="mt-4 text-center font-medium">{msg}</p>}
    </div>
  );
}
