"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notificacion {
  id: string;
  nombre: string;
  created_at: string;
}

export default function RecepcionClient() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [historial, setHistorial] = useState<Notificacion[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
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
    setFeedback(null);
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .insert({ nombre: trimmed })
        .select("id, nombre, created_at")
        .single();
      if (error) throw error;
      setHistorial((prev) => [data, ...prev]);
      setNombre("");
      setFeedback({ msg: `✓ Avisado: ${trimmed}`, type: "ok" });
      inputRef.current?.focus();
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback({ msg: "Error: " + (e.message ?? "intenta nuevamente."), type: "err" });
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
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100">
          <i className="ti ti-door-enter text-purple-600" style={{ fontSize: 28 }} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Recepción</h1>
        <p className="text-sm text-gray-500 mt-1">Avisa a Play que llegó un niño</p>
      </div>

      {/* Input */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300
                       disabled:opacity-50"
            disabled={busy}
          />
          <button
            onClick={enviar}
            disabled={busy || !nombre.trim()}
            className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white
                       transition hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-2 whitespace-nowrap"
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
        <p className="text-xs text-gray-400 mt-2">Presiona Enter para enviar rápido</p>

        {/* Feedback inline */}
        {feedback && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium
            ${feedback.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Historial del día */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
          <i className="ti ti-history" style={{ fontSize: 15 }} aria-hidden="true" />
          Enviados hoy ({historial.length})
        </h2>

        {historial.length === 0 ? (
          <div className="rounded-2xl bg-white/60 border border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
            <i className="ti ti-inbox text-2xl mb-2 block opacity-40" aria-hidden="true" />
            No se han enviado avisos hoy
          </div>
        ) : (
          <div className="space-y-2">
            {historial.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-gray-100 shadow-xs"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50">
                  <i className="ti ti-user text-purple-500" style={{ fontSize: 14 }} aria-hidden="true" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800">{n.nombre}</span>
                <span className="text-xs text-gray-400">{formatHora(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
