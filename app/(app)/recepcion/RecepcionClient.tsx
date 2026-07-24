"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";

interface Notificacion {
  id: string;
  nombre: string;
  created_at: string;
}

export default function RecepcionClient() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [nombre, setNombre] = useState("");
  const [historial, setHistorial] = useState<Notificacion[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar historial del día
  useEffect(() => {
    async function load() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("notificaciones")
        .select("id, nombre, created_at")
        .gte("created_at", hoy.toISOString())
        .order("created_at", { ascending: false });
      if (data) setHistorial(data);
    }
    load();
  }, []);

  async function enviar() {
    const trimmed = nombre.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .insert({ nombre: trimmed })
        .select("id, nombre, created_at")
        .single();
      if (error) throw error;
      setHistorial((prev) => [data, ...prev]);
      setNombre("");
      toast(`Avisado: ${trimmed}`, "success");
      inputRef.current?.focus();
    } catch (e: any) {
      toast("Error al enviar: " + (e.message ?? "intenta nuevamente."), "error");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      enviar();
    }
  }

  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="mx-auto max-w-lg">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Recepción → Play</h1>
        <p className="text-sm text-muted mt-1">Avisa a las tías de Play que llegó un niño</p>
      </div>

      {/* Input */}
      <div className="card p-5 shadow-sm mb-6">
        <label className="block text-sm font-medium text-ink mb-2">
          Nombre del niño
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Mateo López"
            autoFocus
            className="input flex-1"
            disabled={busy}
          />
          <button
            onClick={enviar}
            disabled={busy || !nombre.trim()}
            className="btn-brand whitespace-nowrap"
          >
            {busy ? (
              <i className="ti ti-loader-2 animate-spin" style={{ fontSize: 18 }} />
            ) : (
              <>
                <i className="ti ti-bell-ringing" style={{ fontSize: 16 }} aria-hidden="true" />
                Avisar
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">Presiona Enter para enviar rápidamente</p>
      </div>

      {/* Historial del día */}
      <div>
        <h2 className="text-sm font-medium text-muted mb-3 flex items-center gap-1.5">
          <i className="ti ti-history" style={{ fontSize: 15 }} aria-hidden="true" />
          Enviados hoy ({historial.length})
        </h2>

        {historial.length === 0 ? (
          <div className="card px-5 py-8 text-center text-sm text-muted">
            <i className="ti ti-inbox text-2xl mb-2 block opacity-40" aria-hidden="true" />
            No se han enviado avisos hoy
          </div>
        ) : (
          <div className="space-y-1.5">
            {historial.map((n) => (
              <div
                key={n.id}
                className="card flex items-center gap-3 px-4 py-2.5 shadow-xs"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                  <i className="ti ti-user text-brand" style={{ fontSize: 14 }} aria-hidden="true" />
                </div>
                <span className="flex-1 text-sm font-medium text-ink">{n.nombre}</span>
                <span className="text-xs text-muted">{formatHora(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
