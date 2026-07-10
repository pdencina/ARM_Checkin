"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";
import { MIN_COLOR, MIN_LABEL, type Child, type Guardian, type Ministerio, type Service } from "@/lib/types";
import dynamic from "next/dynamic";

const QRScanner = dynamic(() => import("@/components/QRScanner"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><p className="text-white">Cargando cámara…</p></div>,
});

export default function LlamarClient({ servicios }: { servicios: Service[] }) {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [serviceId, setServiceId] = useState(servicios[0]?.id ?? "");
  const [showScanner, setShowScanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastCall, setLastCall] = useState<{ guardian: Guardian; children: Child[] } | null>(null);

  const handleScan = useCallback(async (guardianId: string) => {
    setShowScanner(false);
    if (!serviceId) { toast("No hay servicio activo.", "error"); return; }
    
    setBusy(true);
    try {
      // Get guardian info
      const { data: guardian } = await supabase.from("guardians").select("*").eq("id", guardianId).single();
      if (!guardian) { toast("Familia no encontrada.", "error"); setBusy(false); return; }

      // Get children
      const { data: gcData } = await supabase
        .from("guardian_children")
        .select("child:children(*)")
        .eq("guardian_id", guardianId);
      const children: Child[] = (gcData ?? []).map((r: any) => r.child).filter((c: any) => c && c.activo);

      // Create pickup call
      const { error } = await supabase.rpc("do_pickup_call", {
        p_guardian_id: guardianId,
        p_service_id: serviceId,
      });

      if (error) throw error;

      // Success feedback
      playSuccess();
      setLastCall({ guardian: guardian as Guardian, children });
      toast(`✅ Llamado enviado para familia ${guardian.apellido}`, "success");

      // Auto-reset after 5 seconds
      setTimeout(() => setLastCall(null), 5000);
    } catch (e: any) {
      toast("Error: " + (e.message ?? "intenta nuevamente."), "error");
    } finally {
      setBusy(false);
    }
  }, [serviceId, supabase]);

  function playSuccess() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      gain.gain.value = 0.4;
      osc.frequency.value = 523; // C5
      osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 150); // E5
      setTimeout(() => { osc.frequency.value = 784; }, 300); // G5
      setTimeout(() => { osc.stop(); ctx.close(); }, 500);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Llamar para retiro</h1>
      <p className="mb-5 text-muted">Escanea el QR familiar para notificar a la sala que el papá llegó.</p>

      {/* Service selector */}
      <div className="mb-5">
        <label className="mb-1 block text-sm font-medium">Encuentro activo</label>
        <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {servicios.length === 0 && <option value="">— Sin servicios activos —</option>}
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre} · {s.fecha} · {s.campus}</option>
          ))}
        </select>
      </div>

      {/* Scan button */}
      {!lastCall && (
        <button
          onClick={() => setShowScanner(true)}
          disabled={busy || !serviceId}
          className="btn-brand w-full py-6 text-xl flex items-center justify-center gap-3"
        >
          <i className="ti ti-qrcode" style={{ fontSize: 32 }} aria-hidden="true" />
          {busy ? "Enviando llamado…" : "Escanear QR del papá"}
        </button>
      )}

      {/* Success confirmation */}
      {lastCall && (
        <div className="card p-6 text-center border-2 border-kids">
          <div className="mb-3 text-4xl">✅</div>
          <p className="text-xl font-bold mb-2">
            ¡Llamado enviado!
          </p>
          <p className="text-lg text-muted mb-4">
            Familia <span className="font-semibold text-ink">{lastCall.guardian.nombre} {lastCall.guardian.apellido}</span>
          </p>
          <div className="space-y-2 mb-4">
            {lastCall.children.map((c) => {
              const col = MIN_COLOR[c.ministerio];
              return (
                <div key={c.id} className={`flex items-center justify-center gap-2 rounded-xl2 p-2 ${col.bg}`}>
                  <span className={`h-2.5 w-2.5 rounded-full`} style={{ background: col.hex }} />
                  <span className={`font-medium ${col.text}`}>{c.nombre} {c.apellido}</span>
                  <span className={`badge ${col.bg} ${col.text} text-xs border border-current`}>{MIN_LABEL[c.ministerio]}</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted">La pantalla de la sala ya muestra este llamado</p>
          <button className="btn-brand mt-4 w-full" onClick={() => { setLastCall(null); setShowScanner(true); }}>
            Escanear siguiente familia
          </button>
        </div>
      )}

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
