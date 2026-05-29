"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_COLOR, MIN_LABEL, edad, type Child, type Guardian, type Ministerio, type Service } from "@/lib/types";

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
  const step = guardian ? 2 : 1;

  async function buscar() {
    setMsg(null); setGuardian(null); setChildren([]);
    const q = query.trim(); if (!q) return;
    const { data } = await supabase.from("guardians").select("*")
      .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,telefono.ilike.%${q}%`)
      .order("apellido").limit(10);
    setGuardians(data ?? []);
  }

  async function elegirFamilia(g: Guardian) {
    setGuardian(g); setGuardians([]); setSelected(new Set());
    const { data } = await supabase.from("guardian_children").select("child:children(*)")
      .eq("guardian_id", g.id);
    const hijos = (data ?? []).map((r: any) => r.child as Child).filter((c) => c && c.activo);
    setChildren(hijos);
    setSelected(new Set(hijos.map((c) => c.id)));
  }

  function toggle(id: string) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  }

  function reset() { setGuardian(null); setChildren([]); setSelected(new Set()); setQuery(""); setGuardians([]); }

  async function registrar() {
    if (!serviceId) return setMsg("Selecciona un servicio.");
    if (!guardian || selected.size === 0) return;
    setBusy(true); setMsg(null);
    try {
      const ids: string[] = [];
      for (const childId of Array.from(selected)) {
        const { data, error } = await supabase.rpc("do_checkin", {
          p_child_id: childId, p_service_id: serviceId, p_guardian_id: guardian.id,
        });
        if (error) throw error;
        if (data?.id) ids.push(data.id);
      }
      setPrintIds(ids.join(","));
      setMsg(`✅ ${ids.length} niño(s) registrados. Imprimiendo etiquetas…`);
      reset();
    } catch (e: any) {
      setMsg("Error: " + (e.message ?? "no se pudo registrar"));
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Check-in</h1>
      <p className="mb-5 text-muted">Busca la familia, elige a los niños e imprime.</p>

      <div className="mb-6 flex items-center gap-2">
        <Step n={1} label="Buscar familia" active={step === 1} done={step > 1} />
        <span className="h-px flex-1 bg-line" />
        <Step n={2} label="Elegir niños" active={step === 2} done={false} />
        <span className="h-px flex-1 bg-line" />
        <Step n={3} label="Imprimir" active={false} done={false} />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Servicio</label>
        <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {servicios.length === 0 && <option value="">— Sin servicios activos —</option>}
          {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.fecha}</option>)}
        </select>
      </div>

      {!guardian && (
        <>
          <div className="mb-4 flex gap-2">
            <input className="field" placeholder="Buscar por apellido o teléfono…" value={query}
              onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
            <button className="btn-brand" onClick={buscar}>Buscar</button>
          </div>
          {guardians.length > 0 && (
            <div className="card divide-y divide-line overflow-hidden">
              {guardians.map((g) => (
                <button key={g.id} onClick={() => elegirFamilia(g)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-medium text-brand-dark">
                    {g.nombre.charAt(0)}{g.apellido.charAt(0)}
                  </span>
                  <span className="font-medium">{g.nombre} {g.apellido}</span>
                  <span className="ml-auto text-sm text-muted">{g.telefono}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {guardian && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-medium text-brand-dark">
              {guardian.nombre.charAt(0)}{guardian.apellido.charAt(0)}
            </span>
            <div className="flex-1">
              <p className="font-semibold">{guardian.nombre} {guardian.apellido}</p>
              <p className="text-sm text-muted">{children.length} niño(s)</p>
            </div>
            <button className="text-sm text-muted hover:text-ink" onClick={reset}>← Cambiar</button>
          </div>

          {children.length === 0 ? (
            <p className="text-muted">Esta familia no tiene niños registrados.</p>
          ) : (
            <div className="space-y-2">
              {children.map((c) => {
                const on = selected.has(c.id);
                const col = MIN_COLOR[c.ministerio];
                const e = edad(c.fecha_nacimiento);
                return (
                  <button key={c.id} onClick={() => toggle(c.id)}
                    className={`flex w-full items-center gap-3 rounded-xl2 p-3 text-left transition ${on ? `${col.bg} ring-2 ${col.ring}` : "bg-paper ring-1 ring-line"}`}>
                    <span className={`h-3 w-3 rounded-full ${col.dot}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${on ? col.text : ""}`}>
                        {c.nombre} {c.apellido}
                        {e !== null && <span className="font-normal text-muted"> · {e} años</span>}
                      </p>
                      {c.alergias && <p className="text-sm text-red-700">⚠️ {c.alergias}</p>}
                    </div>
                    <span className={`badge ${col.bg} ${col.text}`}>{MIN_LABEL[c.ministerio]}</span>
                    <span className={`text-2xl ${on ? col.text : "text-line"}`}>{on ? "☑" : "☐"}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button className="btn-brand mt-5 w-full text-base" onClick={registrar} disabled={busy || selected.size === 0}>
            {busy ? "Registrando…" : `🖨️ Registrar e imprimir (${selected.size})`}
          </button>
        </div>
      )}

      {msg && <p className="mt-4 text-center text-sm font-medium text-ink">{msg}</p>}

      {printIds && (
        <iframe key={printIds} title="impresion-etiquetas" src={`/print/${printIds}`}
          style={{ position: "absolute", left: "-10000px", top: 0, width: "360px", height: "640px", border: 0 }}
          aria-hidden="true" />
      )}
    </div>
  );
}

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active || done ? "" : "opacity-40"}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${done ? "bg-kids text-white" : active ? "bg-brand text-white" : "bg-line text-muted"}`}>
        {done ? "✓" : n}
      </span>
      <span className="hidden text-sm font-medium sm:inline">{label}</span>
    </div>
  );
}
