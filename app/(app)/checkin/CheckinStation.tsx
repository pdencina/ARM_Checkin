"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_LABEL, edad, type Child, type Guardian, type Service } from "@/lib/types";

export default function CheckinStation({ servicios }: { servicios: Service[] }) {
  const supabase = createClient();

  const [serviceId, setServiceId] = useState(servicios[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printIds, setPrintIds] = useState<string | null>(null);

  async function buscar() {
    setMsg(null);
    setGuardian(null);
    setChildren([]);
    const q = query.trim();
    if (!q) return;
    const { data } = await supabase
      .from("guardians")
      .select("*")
      .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,telefono.ilike.%${q}%`)
      .order("apellido")
      .limit(10);
    setGuardians(data ?? []);
  }

  async function elegirFamilia(g: Guardian) {
    setGuardian(g);
    setGuardians([]);
    setSelected(new Set());
    const { data } = await supabase
      .from("guardian_children")
      .select("child:children(*)")
      .eq("guardian_id", g.id);
    const hijos = (data ?? [])
      .map((r: any) => r.child as Child)
      .filter((c) => c && c.activo);
    setChildren(hijos);
    setSelected(new Set(hijos.map((c) => c.id)));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function registrar() {
    if (!serviceId) return setMsg("Selecciona un servicio.");
    if (!guardian || selected.size === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const ids: string[] = [];
      for (const childId of Array.from(selected)) {
        const { data, error } = await supabase.rpc("do_checkin", {
          p_child_id: childId,
          p_service_id: serviceId,
          p_guardian_id: guardian.id,
        });
        if (error) throw error;
        if (data?.id) ids.push(data.id);
      }
      setPrintIds(ids.join(","));
      setMsg(`✅ ${ids.length} niño(s) registrados. Imprimiendo etiquetas…`);
      setGuardian(null);
      setChildren([]);
      setSelected(new Set());
      setQuery("");
    } catch (e: any) {
      setMsg("Error: " + (e.message ?? "no se pudo registrar"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Check-in</h1>
      <p className="mb-5 text-muted">Busca la familia, selecciona a los niños e imprime.</p>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Servicio</label>
        <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {servicios.length === 0 && <option value="">— Sin servicios activos —</option>}
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} · {s.fecha}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          className="field"
          placeholder="Buscar por apellido o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
        />
        <button className="btn-ghost" onClick={buscar}>
          Buscar
        </button>
      </div>

      {guardians.length > 0 && (
        <div className="card mb-4 divide-y divide-line overflow-hidden">
          {guardians.map((g) => (
            <button
              key={g.id}
              onClick={() => elegirFamilia(g)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-paper"
            >
              <span className="font-medium">
                {g.nombre} {g.apellido}
              </span>
              <span className="text-sm text-muted">{g.telefono}</span>
            </button>
          ))}
        </div>
      )}

      {guardian && (
        <div className="card mb-4 p-5">
          <p className="mb-1 text-sm text-muted">Familia</p>
          <p className="mb-4 text-lg font-semibold">
            {guardian.nombre} {guardian.apellido}
          </p>

          {children.length === 0 ? (
            <p className="text-muted">Esta familia no tiene niños registrados.</p>
          ) : (
            <div className="space-y-2">
              {children.map((c) => {
                const on = selected.has(c.id);
                const e = edad(c.fecha_nacimiento);
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl2 border p-3 transition ${
                      on ? "border-brand bg-brand-soft/40" : "border-line"
                    }`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="h-5 w-5 accent-brand" />
                    <span className="font-medium">
                      {c.nombre} {c.apellido}
                    </span>
                    {e !== null && <span className="text-sm text-muted">· {e} años</span>}
                    <span
                      className={`badge ml-auto ${
                        c.ministerio === "kids" ? "bg-kids-soft text-kids-ink" : "bg-tweens-soft text-tweens-ink"
                      }`}
                    >
                      {MIN_LABEL[c.ministerio]}
                    </span>
                    {c.alergias && <span className="badge bg-red-50 text-red-700">⚠️ {c.alergias}</span>}
                  </label>
                );
              })}
            </div>
          )}

          <button className="btn-brand mt-5 w-full" onClick={registrar} disabled={busy || selected.size === 0}>
            {busy ? "Registrando…" : `🖨️ Registrar e imprimir (${selected.size})`}
          </button>
        </div>
      )}

      {msg && <p className="text-center text-sm font-medium text-ink">{msg}</p>}

      {printIds && (
        <iframe
          key={printIds}
          title="impresion-etiquetas"
          src={`/print/${printIds}`}
          style={{ position: "absolute", left: "-10000px", top: 0, width: "360px", height: "640px", border: 0 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
