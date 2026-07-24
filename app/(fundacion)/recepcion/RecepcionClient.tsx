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
  const [connected, setConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar historial del día + verificar conexión
  useEffect(() => {
    async function load() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("notificaciones")
        .select("id, nombre, created_at")
        .gte("created_at", hoy.toISOString())
        .order("created_at", { ascending: false });
      if (data) {
        setHistorial(data);
        setConnected(true);
      }
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
      setFeedback({ msg: `${trimmed} avisado ✓`, type: "ok" });
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Indicador de conexión */}
      <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 shadow-sm">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
        <span className="text-xs font-medium text-gray-600">{connected ? "Conectado" : "Sin conexión"}</span>
      </div>

      {/* Card principal */}
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="text-4xl block mb-2">🏫</span>
          <h1 className="text-2xl font-bold text-gray-800">Recepción</h1>
          <p className="text-sm text-gray-400 mt-1">Notifica a las tías de Play que llegó un niño</p>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Nombre del niño/a
          </label>
          <input
            ref={inputRef}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Sofía, Mateo..."
            autoFocus
            className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-5 py-4 text-base
                       text-gray-800 placeholder:text-gray-300
                       focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:border-emerald-300
                       transition disabled:opacity-50"
            disabled={busy}
          />
        </div>

        {/* Botón Avisar */}
        <button
          onClick={enviar}
          disabled={busy || !nombre.trim()}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400
                     px-5 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200/50
                     transition hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                     flex items-center justify-center gap-2"
        >
          {busy ? (
            <span className="animate-spin text-lg">⏳</span>
          ) : (
            <>
              <span>📣</span> Avisar a Play
            </>
          )}
        </button>

        {/* Feedback */}
        {feedback && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold text-center
            ${feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"}`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Link a Play */}
        <div className="mt-4 text-center">
          <a href="/play" className="text-xs text-gray-400 hover:text-gray-600 transition">
            Abrir pantalla de Play →
          </a>
        </div>
      </div>

      {/* Historial del día */}
      {historial.length > 0 && (
        <div className="w-full max-w-md mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3 px-2">
            Hoy ({historial.length})
          </h2>
          <div className="space-y-2">
            {historial.slice(0, 8).map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-sm"
              >
                <span className="text-lg">👶</span>
                <span className="flex-1 text-sm font-semibold text-gray-700">{n.nombre}</span>
                <span className="text-xs text-gray-400 font-medium">{formatHora(n.created_at)}</span>
              </div>
            ))}
            {historial.length > 8 && (
              <p className="text-center text-xs text-white/50 pt-1">
                +{historial.length - 8} más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
