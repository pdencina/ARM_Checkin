"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";
import { MIN_COLOR, MIN_LABEL, edad, type Child, type Guardian, type Ministerio, type Service } from "@/lib/types";
import dynamic from "next/dynamic";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

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
  const [showScanner, setShowScanner] = useState(false);
  const [autoMode, setAutoMode] = useState(true); // Auto-register all kids on QR scan
  const step = results ? 3 : guardian ? 2 : 1;

  // ── Sound feedback ───────────────────────────────────────
  function playSound(type: "success" | "error") {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === "success") {
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.frequency.value = 1100; }, 100);
        setTimeout(() => { osc.stop(); ctx.close(); }, 250);
      } else {
        osc.frequency.value = 300;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      }
    } catch {}
  }

  // ── Load family by ID (from QR scan) ────────────────────
  const loadFamilyById = useCallback(async (id: string) => {
    setResults(null); setGuardian(null); setChildren([]); setShowScanner(false);
    const { data } = await supabase.from("guardians").select("*").eq("id", id).single();
    if (data) {
      await elegirFamilia(data as Guardian, true);
    } else {
      playSound("error");
      toast("QR no reconocido. Busca manualmente.", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, autoMode]);

  // ── Detect URL param ?g=<guardianId> on mount ───────────
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

  async function elegirFamilia(g: Guardian, fromQR = false) {
    setGuardian(g); setGuardians([]); setSelected(new Set());
    const { data } = await supabase.from("guardian_children").select("child:children(*)")
      .eq("guardian_id", g.id);
    const hijos: Child[] = (data ?? []).map((r: any) => r.child as Child).filter((c: any) => c && c.activo);
    setChildren(hijos);
    setSelected(new Set(hijos.map((c) => c.id)));

    // Auto-mode: if scanned via QR and all kids are pre-selected, register immediately
    if (fromQR && autoMode && hijos.length > 0 && serviceId) {
      // Small delay so UI renders the family before registering
      setTimeout(() => registrarAuto(g, hijos), 300);
    }
  }

  function toggle(id: string) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  }

  function reset() {
    setGuardian(null); setChildren([]); setSelected(new Set());
    setQuery(""); setGuardians([]); setResults(null); setPrintIds(null);
  }

  // ── Auto-register (from QR scan) ───────────────────────
  async function registrarAuto(g: Guardian, hijos: Child[]) {
    if (!serviceId || hijos.length === 0) return;
    setBusy(true);
    try {
      const res: CheckinResult[] = [];
      const ids: string[] = [];
      for (const child of hijos) {
        const { data, error } = await supabase.rpc("do_checkin", {
          p_child_id: child.id, p_service_id: serviceId, p_guardian_id: g.id,
        });
        if (error) throw error;
        if (data?.id) {
          ids.push(data.id);
          res.push({ id: data.id, codigo: data.codigo_seguridad, childNombre: child.nombre, ministerio: child.ministerio, primeraVez: data.primera_vez });
        }
      }
      setPrintIds(ids.join(","));
      setResults(res);
      playSound("success");
      toast(`✅ ${res.length} niño(s) registrado(s)`, "success");
    } catch (e: any) {
      playSound("error");
      toast("Error: " + (e.message ?? "intenta nuevamente."), "error");
    } finally { setBusy(false); }
  }

  // ── Manual register ─────────────────────────────────────
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
      playSound("success");
      toast(`✅ ${res.length} niño(s) registrado(s)`, "success");
    } catch (e: any) {
      playSound("error");
      toast("Error: " + (e.message ?? "intenta nuevamente."), "error");
    } finally { setBusy(false); }
  }

  // ── WhatsApp link builder ───────────────────────────────
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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Check-in</h1>
          <p className="text-muted">Escanea el QR o busca la familia.</p>
        </div>
        {/* Auto-mode toggle */}
        <label className="flex items-center gap-2 rounded-xl2 border border-line px-3 py-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)}
            className="h-4 w-4 accent-brand" />
          <span className="text-muted">Auto</span>
          <i className="ti ti-bolt text-brand" style={{ fontSize: 16 }} aria-hidden="true" />
        </label>
      </div>

      {/* Steps indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[{n:1,label:"Buscar"},{n:2,label:"Elegir niños"},{n:3,label:"Listo"}].map(({n,label},i,arr) => (
          <><Step key={n} n={n} label={label} active={step===n} done={step>n} />{i<arr.length-1 && <span className="h-px flex-1 bg-line" />}</>
        ))}
      </div>

      {/* ═══ STEP 3: Confirmation ═══ */}
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
          <div className="flex flex-wrap gap-2">
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer"
                className="btn flex-1 border border-line bg-white text-ink hover:bg-paper gap-2">
                📲 WhatsApp a {guardian?.nombre}
              </a>
            )}
            {printIds && (
              <button onClick={() => window.open(`/print/${printIds}`, "_blank")}
                className="btn flex-1 border border-line bg-white text-ink hover:bg-paper gap-2">
                🖨️ Re-imprimir
              </button>
            )}
            <button className="btn-brand flex-1" onClick={reset}>
              <i className="ti ti-scan" style={{fontSize:16}} aria-hidden="true" /> Siguiente familia
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 1: Search ═══ */}
      {!results && !guardian && (
        <>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Encuentro</label>
            <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {servicios.length === 0 && <option value="">— Sin servicios activos —</option>}
              {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.fecha} {s.campus !== "Principal" ? `· ${s.campus}` : ""}</option>)}
            </select>
          </div>

          {/* QR Scanner button - big and prominent */}
          <button
            onClick={() => setShowScanner(true)}
            className="btn-brand mb-4 w-full py-4 text-lg flex items-center justify-center gap-3"
          >
            <i className="ti ti-qrcode" style={{ fontSize: 24 }} aria-hidden="true" />
            Escanear QR familiar
          </button>

          {/* Manual search */}
          <div className="mb-4 flex gap-2">
            <input className="field" placeholder="O busca por apellido / teléfono…" value={query}
              onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
            <button className="btn-ghost" onClick={buscar}>Buscar</button>
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

      {/* ═══ STEP 2: Select children ═══ */}
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

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={(id) => loadFamilyById(id)}
          onClose={() => setShowScanner(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Hidden print iframe */}
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
