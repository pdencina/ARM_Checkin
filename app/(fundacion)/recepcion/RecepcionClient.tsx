"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notificacion {
  id: string;
  nombre: string;
  tipo: "llegada" | "retiro";
  confirmado_at: string | null;
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
  const [popup, setPopup] = useState<{ nombre: string; tipo: "llegada" | "retiro" } | null>(null);
  const [nombres, setNombres] = useState<string[]>([]); // lista para autocompletado
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sugRef = useRef<HTMLDivElement>(null);

  // Cargar nombres de niños para autocompletado
  useEffect(() => {
    async function loadNombres() {
      // Traer de children (registrados en el sistema)
      const { data: children } = await supabase
        .from("children")
        .select("nombre")
        .eq("activo", true)
        .order("nombre");

      // Traer nombres únicos de notificaciones pasadas
      const { data: histNombres } = await supabase
        .from("notificaciones")
        .select("nombre")
        .order("created_at", { ascending: false })
        .limit(200);

      const set = new Set<string>();
      (children ?? []).forEach((c: any) => { if (c.nombre) set.add(c.nombre); });
      (histNombres ?? []).forEach((n: any) => { if (n.nombre) set.add(n.nombre); });

      setNombres(Array.from(set).sort((a, b) => a.localeCompare(b, "es")));
    }
    loadNombres();
  }, []);

  // Filtrar sugerencias al escribir
  useEffect(() => {
    const q = nombre.trim().toLowerCase();
    if (q.length < 2) {
      setSugerencias([]);
      setShowSugerencias(false);
      return;
    }
    const filtered = nombres.filter((n) => n.toLowerCase().includes(q)).slice(0, 5);
    setSugerencias(filtered);
    setShowSugerencias(filtered.length > 0);
  }, [nombre, nombres]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sugRef.current && !sugRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function seleccionarSugerencia(n: string) {
    setNombre(n);
    setShowSugerencias(false);
    inputRef.current?.focus();
  }

  // Cargar historial del día
  useEffect(() => {
    async function load() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("notificaciones")
        .select("id, nombre, tipo, confirmado_at, created_at")
        .gte("created_at", hoy.toISOString())
        .order("created_at", { ascending: false });
      if (data) {
        setHistorial(data as Notificacion[]);
        setConnected(true);
      }
    }
    load();
  }, []);

  // Escuchar UPDATEs de confirmación en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel("notificaciones-recepcion")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificaciones" },
        (payload) => {
          const updated = payload.new as Notificacion;
          setHistorial((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, confirmado_at: updated.confirmado_at } : n))
          );
          // Mostrar popup de confirmación
          if (updated.confirmado_at) {
            setPopup({ nombre: updated.nombre, tipo: updated.tipo });
            setTimeout(() => setPopup(null), 4000);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function enviar(tipo: "llegada" | "retiro") {
    const trimmed = nombre.trim();
    if (!trimmed) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .insert({ nombre: trimmed, tipo })
        .select("id, nombre, tipo, confirmado_at, created_at")
        .single();
      if (error) throw error;
      setHistorial((prev) => [data as Notificacion, ...prev]);
      setNombre("");
      const label = tipo === "llegada" ? "Dejaron a" : "Buscan a";
      setFeedback({ msg: `${label} ${trimmed} — avisado ✓`, type: "ok" });
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
      enviar("llegada");
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

      {/* ═══ POP-UP CONFIRMACIÓN DE LA TÍA ═══ */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4 animate-pop-in"
             onClick={() => setPopup(null)}>
          <div className="w-full max-w-sm rounded-[2rem] bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-emerald-100 text-center">
            <span className="text-6xl block mb-3">
              {popup.tipo === "llegada" ? "🙋‍♀️" : "🚶‍♀️"}
            </span>
            <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.15em] mb-2">
              {popup.tipo === "llegada" ? "¡La tía va por él!" : "¡La tía lo lleva al hall!"}
            </p>
            <h2 className="text-4xl font-black text-gray-800 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {popup.nombre}
            </h2>
            <p className="text-sm text-gray-400 mt-3">Confirmado ✅</p>
            <p className="text-[10px] text-gray-300 mt-4">Toca para cerrar</p>
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className={`w-full max-w-md rounded-[2rem] bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/60
                       transition-all duration-300 ${sent ? "scale-[1.02] shadow-emerald-200/50" : ""}`}>
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 animate-float-slow">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Fundación</p>
            <p className="text-lg leading-tight"><span className="font-black text-gray-800">arm</span> <span className="font-medium text-gray-600">global</span></p>
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Recepción</h1>
          <p className="text-sm text-gray-400 mt-1">Avísale a las tías que hay movimiento 💜</p>
        </div>

        {/* Input con autocompletado */}
        <div className="mb-5 relative">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
            ¿Cómo se llama?
          </label>
          <input
            ref={inputRef}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (sugerencias.length > 0) setShowSugerencias(true); }}
            placeholder="Ej: Sofía, Mateo..."
            autoFocus
            autoComplete="off"
            className="w-full rounded-2xl border-2 border-purple-100 bg-purple-50/50 px-5 py-4 text-lg
                       text-gray-800 placeholder:text-gray-300 font-medium
                       focus:outline-none focus:ring-4 focus:ring-purple-200/60 focus:border-purple-300 focus:bg-white
                       transition-all duration-200 disabled:opacity-50"
            disabled={busy}
          />

          {/* Dropdown sugerencias */}
          {showSugerencias && (
            <div ref={sugRef} className="absolute z-20 left-0 right-0 mt-1 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
              {sugerencias.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => seleccionarSugerencia(s)}
                  className="w-full px-5 py-3 text-left text-sm font-medium text-gray-700
                             hover:bg-purple-50 transition-colors flex items-center gap-2
                             border-b border-gray-50 last:border-b-0"
                >
                  <span className="text-base">👶</span>
                  <span dangerouslySetInnerHTML={{
                    __html: s.replace(
                      new RegExp(`(${nombre.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"),
                      '<span class="font-black text-purple-600">$1</span>'
                    )
                  }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dos botones: Llegada y Retiro */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => enviar("llegada")}
            disabled={busy || !nombre.trim()}
            className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500
                       px-4 py-4 text-sm font-bold text-white
                       shadow-lg shadow-purple-300/30
                       transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.97]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                       flex flex-col items-center gap-1"
          >
            <span className="text-xl">🧸</span>
            <span>Lo vienen a dejar</span>
            <span className="text-[10px] font-normal opacity-80">Que vengan a buscarlo</span>
          </button>

          <button
            onClick={() => enviar("retiro")}
            disabled={busy || !nombre.trim()}
            className="rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400
                       px-4 py-4 text-sm font-bold text-white
                       shadow-lg shadow-orange-200/30
                       transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.97]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                       flex flex-col items-center gap-1"
          >
            <span className="text-xl">👋</span>
            <span>Lo vienen a buscar</span>
            <span className="text-[10px] font-normal opacity-80">Que lo traigan al hall</span>
          </button>
        </div>

        <p className="text-[10px] text-gray-300 text-center mt-3">Enter = enviar como Llegada</p>

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

      {/* ═══ HISTORIAL DEL DÍA ═══ */}
      {historial.length > 0 && (
        <div className="w-full max-w-md mt-6 animate-slide-up">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-3 px-2">
            Hoy — {historial.length} movimientos
          </h2>
          <div className="space-y-2">
            {historial.slice(0, 12).map((n, i) => (
              <div
                key={n.id}
                className={`flex items-center gap-3 rounded-2xl backdrop-blur-lg px-4 py-3 shadow-md border
                           transition-all hover:scale-[1.01] hover:shadow-lg
                           ${n.confirmado_at
                             ? "bg-emerald-50/90 border-emerald-200/50"
                             : "bg-white/80 border-white/50"}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Ícono según tipo y estado */}
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0
                  ${n.confirmado_at
                    ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                    : n.tipo === "llegada"
                      ? "bg-gradient-to-br from-purple-100 to-pink-100"
                      : "bg-gradient-to-br from-orange-100 to-amber-100"}`}>
                  <span className="text-sm">
                    {n.confirmado_at
                      ? "✅"
                      : n.tipo === "llegada" ? "🧸" : "👋"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-700 block truncate">{n.nombre}</span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    {n.tipo === "llegada" ? "Lo dejaron • Tía va por él" : "Lo buscan • Tía lo trae"}
                    {n.confirmado_at && (
                      <span className="text-emerald-500 ml-1">
                        • Listo {formatHora(n.confirmado_at)}
                      </span>
                    )}
                  </span>
                </div>

                {/* Hora + badge */}
                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-400 font-semibold block">{formatHora(n.created_at)}</span>
                  {!n.confirmado_at && (
                    <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                      ${n.tipo === "llegada" ? "text-purple-500 bg-purple-50" : "text-orange-500 bg-orange-50"}`}>
                      Esperando
                    </span>
                  )}
                </div>
              </div>
            ))}
            {historial.length > 12 && (
              <p className="text-center text-xs text-white/40 pt-1 font-medium">
                +{historial.length - 12} más hoy
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
