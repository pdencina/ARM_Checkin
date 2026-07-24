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
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setSent(true);
      setTimeout(() => setSent(false), 600);
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
      <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-lg px-3 py-1.5 shadow-lg border border-white/50">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <span className="text-xs font-semibold text-gray-600">{connected ? "Conectado" : "Sin conexión"}</span>
      </div>

      {/* Card principal con efecto glassmorphism */}
      <div className={`w-full max-w-md rounded-[2rem] bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/60
                       transition-all duration-300 ${sent ? "scale-[1.02] shadow-emerald-200/50" : ""}`}>
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center shadow-sm animate-float-slow">
            <span className="text-3xl">🎈</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Recepción</h1>
          <p className="text-sm text-gray-400 mt-1">Notifica a Play que llegó un niño 🌟</p>
        </div>

        {/* Input */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
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
            className="w-full rounded-2xl border-2 border-purple-100 bg-purple-50/50 px-5 py-4 text-lg
                       text-gray-800 placeholder:text-gray-300 font-medium
                       focus:outline-none focus:ring-4 focus:ring-purple-200/60 focus:border-purple-300 focus:bg-white
                       transition-all duration-200 disabled:opacity-50"
            disabled={busy}
          />
        </div>

        {/* Botón Avisar */}
        <button
          onClick={enviar}
          disabled={busy || !nombre.trim()}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500
                     px-5 py-4 text-lg font-bold text-white
                     shadow-lg shadow-purple-300/40
                     transition-all duration-200 hover:shadow-xl hover:shadow-purple-300/60 hover:scale-[1.02]
                     active:scale-[0.97]
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg
                     flex items-center justify-center gap-2"
        >
          {busy ? (
            <span className="animate-spin text-xl">✨</span>
          ) : (
            <>
              <span className="text-xl">📣</span> Avisar a Play
            </>
          )}
        </button>

        {/* Feedback */}
        {feedback && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold text-center animate-pop-in
            ${feedback.type === "ok"
              ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-100"
              : "bg-red-50 text-red-600 border border-red-100"}`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Link a Play */}
        <div className="mt-5 text-center">
          <a href="/play" className="text-xs font-medium text-purple-300 hover:text-purple-500 transition-colors">
            Abrir pantalla de Play →
          </a>
        </div>
      </div>

      {/* Historial del día */}
      {historial.length > 0 && (
        <div className="w-full max-w-md mt-6 animate-slide-up">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-3 px-2">
            Hoy — {historial.length} {historial.length === 1 ? "niño" : "niños"}
          </h2>
          <div className="space-y-2">
            {historial.slice(0, 6).map((n, i) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-lg px-4 py-3 shadow-md border border-white/50
                           transition-all hover:scale-[1.01] hover:shadow-lg"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <span className="text-sm">👶</span>
                </div>
                <span className="flex-1 text-sm font-bold text-gray-700">{n.nombre}</span>
                <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">{formatHora(n.created_at)}</span>
              </div>
            ))}
            {historial.length > 6 && (
              <p className="text-center text-xs text-white/40 pt-1 font-medium">
                +{historial.length - 6} más hoy
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
