"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";
import { MIN_COLOR, MIN_LABEL, edad, waLink, type Child, type Guardian, type Ministerio, type Service } from "@/lib/types";

interface CheckinResult { id: string; codigo: string; childNombre: string; ministerio: Ministerio; primeraVez: boolean; }

export default function CheckinStation({ servicios }: { servicios: Service[] }) {
  const supabase = createClient();
  const [serviceId, setServiceId] = useState(servicios[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toasts, toast, dismiss } = useToast();
  const [busy, setBusy] = useState(false);
  const [printIds, setPrintIds] = useState<string | null>(null);
  const [results, setResults] = useState<CheckinResult[] | null>(null);
  const step = results ? 3 : guardian ? 2 : 1;

  /* Carga familia directamente por ID (desde QR escaneado o URL param ?g=) */
  async function loadFamilyById(id: string) {
    setResults(null); setGuardian(null); setChildren([]);
    const { data } = await supabase.from("guardians").select("*").eq("id", id).single();
    if (data) await elegirFamilia(data as Guardian);
  }

  /* Detectar URL param ?g=<guardianId> al cargar la página */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gId = params.get("g");
    if (gId) loadFamilyById(gId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscar() {
    setResults(null); setGuardian(null); setChildren([]);
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
    const hijos: Child[] = (data ?? []).map((r: any) => r.child as Child).filter((c: any) => c && c.activo);
    setChildren(hijos);
    setSelected(new Set(hijos.map((c) => c.id)));
  }

  function toggle(id: string) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  }

  function reset() { setGuardian(null); setChildren([]); setSelected(new Set()); setQuery(""); setGuardians([]); setResults(null); }

  async function registrar() {
    if (!serviceId || !guardian || selected.size === 0) return;
    setBusy(true);
    try {
      const res: CheckinResult[] = [];
      const ids: string[] = [];
      for (const childId of Array.from(selected)) {
        const child = children.find((c) => c.id === childId);
        const { data, error } = await supabase.rpc("do_checkin", {
          p_child_id: childId, p_service_id: serviceId, p_guardian_id: guardian.id,
        });
        if (error) throw error;
        if (data?.id) {
          ids.push(data.id);
          res.push({ id: data.id, codigo: data.codigo_seguridad, childNombre: child?.nombre ?? "", ministerio: child?.ministerio ?? "kids", primeraVez: data.primera_vez });
        }
      }
      setPrintIds(ids.join(","));
      setResults(res);
      setGuardian({ ...guardian }); // keep guardian for WhatsApp
      setChildren(children);
    } catch (e: any) {
      toast("Error al registrar: " + (e.message ?? "intenta nuevamente."), "error");
    } finally { setBusy(false); }
  }

  function buildWhatsApp(): string | null {
    if (!guardian || !results || results.length === 0) return null;
    if (!guardian.telefono) return null;
    const lineas = results.map((r) => `• ${r.childNombre}${r.primeraVez ? " ⭐ (¡primera vez!)" : ""} — Código: *${r.codigo}* (${MIN_LABEL[r.ministerio]})`).join("\n");
    const msg = `¡Hola ${guardian.nombre}! ✅ Check-in realizado en ARM Kids & Tweens.\n\n${lineas}\n\nGuarda este mensaje para retirarlos. ¡Que disfrutes el servicio! 🙌`;
    const phone = guardian.telefono.replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  const waHref = buildWhatsApp();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Check-in</h1>
      <p className="mb-5 text-muted">Busca la familia, elige a los niños e imprime.</p>

      <div className="mb-6 flex items-center gap-2">
        {[{n:1,label:"Buscar"},{n:2,label:"Elegir niños"},{n:3,label:"Listo"}].map(({n,label},i,arr) => (
          <><Step key={n} n={n} label={label} active={step===n} done={step>n} />{i<arr.length-1 && <span className="h-px flex-1 bg-line" />}</>
        ))}
      </div>

      {/* Paso 3: confirmación + WhatsApp */}
      {results && (
        <div className="card p-5">
          <p className="mb-4 text-lg font-semibold">✅ ¡Listo! {results.length} niño(s) registrado(s)</p>
          <div className="mb-4 space-y-2">
            {results.map((r) => {
              const col = MIN_COLOR[r.ministerio];
              return (
                <div key={r.id} className={`flex items-center gap-3 rounded-xl2 p-3 ${col.bg}`}>
                  {r.primeraVez && <span className="badge bg-brand-soft text-brand-dark text-xs">⭐ Primera vez</span>}
                  <span className={`font-medium ${col.text}`}>{r.childNombre}</span>
                  <span className={`badge ${col.bg} ${col.text} border border-current`}>{MIN_LABEL[r.ministerio]}</span>
                  <span className={`ml-auto font-mono font-bold tracking-widest ${col.text}`}>{r.codigo}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer"
                className="btn flex-1 border border-line bg-white text-ink hover:bg-paper gap-2">
                📲 Enviar WhatsApp a {guardian?.nombre}
              </a>
            )}
            <button className="btn-ghost" onClick={reset}>Nuevo check-in</button>
          </div>
        </div>
      )}

      {/* Paso 1: buscar */}
      {!results && !guardian && (
        <>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Encuentro</label>
            <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {servicios.length === 0 && <option value="">— Sin servicios activos —</option>}
              {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.fecha} {s.campus !== "Principal" ? `· ${s.campus}` : ""}</option>)}
            </select>
          </div>
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

      {/* Paso 2: elegir niños */}
      {!results && guardian && (
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
                    <i className={`ti ${on ? "ti-square-check" : "ti-square"} text-xl ${on ? col.text : "text-line"}`} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
          <button className="btn-brand mt-5 w-full text-base flex items-center justify-center gap-2" onClick={registrar} disabled={busy || selected.size === 0}>
              <i className="ti ti-printer" style={{fontSize:16}} aria-hidden="true" />
            {busy ? "Registrando…" : `Registrar e imprimir (${selected.size})`}
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {printIds && (
        <iframe key={printIds} title="impresion" src={`/print/${printIds}`}
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
