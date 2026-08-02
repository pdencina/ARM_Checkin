"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SedeSelector, { useSede } from "../SedeSelector";

interface Notificacion {
  id: string;
  nombre: string;
  tipo: "llegada" | "retiro";
  confirmado_at: string | null;
  confirmado_por: string | null;
  created_at: string;
}

// ── Audio ──────────────────────────────────────────────────
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

function playChime(tipo: "llegada" | "retiro") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    function playNote(freq: number, time: number, duration: number, volume: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(volume * 0.2, time);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.6);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(time);
      osc2.stop(time + duration);
    }

    if (tipo === "llegada") {
      [523, 659, 784, 1047].forEach((freq, i) => {
        playNote(freq, now + i * 0.18, 0.8, 0.3);
      });
    } else {
      const notes = [880, 659, 784, 659];
      notes.forEach((freq, i) => {
        playNote(freq, now + i * 0.2, 0.6, 0.25);
      });
      notes.forEach((freq, i) => {
        playNote(freq, now + 1.0 + i * 0.2, 0.5, 0.15);
      });
    }
  } catch { /* ignore */ }
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function TVClient() {
  const supabase = createClient();
  const { sede, sedeNombre, selectSede } = useSede();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState("");

  // Reloj
  useEffect(() => {
    function updateClock() {
      setClock(new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }));
    }
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Wake Lock
  useEffect(() => {
    async function lock() {
      try {
        if ("wakeLock" in navigator) await (navigator as any).wakeLock.request("screen");
      } catch { /* ignore */ }
    }
    if (audioEnabled) lock();
    function handleVisibility() {
      if (document.visibilityState === "visible" && audioEnabled) lock();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [audioEnabled]);

  // Cargar notificaciones del día
  useEffect(() => {
    async function load() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("notificaciones")
        .select("id, nombre, tipo, confirmado_at, confirmado_por, created_at")
        .eq("sede", sede || "puente-alto")
        .gte("created_at", hoy.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotificaciones(data as Notificacion[]);
    }
    load();
  }, [sede]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("notificaciones-tv")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          const nuevo = payload.new as Notificacion;
          setNotificaciones((prev) => [nuevo, ...prev].slice(0, 20));
          if (audioEnabled) playChime(nuevo.tipo);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificaciones" },
        (payload) => {
          const updated = payload.new as Notificacion;
          setNotificaciones((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [audioEnabled]);

  // Broadcast insistir
  useEffect(() => {
    const channel = supabase
      .channel("play-insistir")
      .on("broadcast", { event: "insistir" }, (payload: any) => {
        if (audioEnabled) playChime(payload.payload.tipo);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [audioEnabled]);

  function enableAudio() {
    const ctx = getAudioContext();
    ctx.resume().then(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.01;
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    });
    setAudioEnabled(true);
  }

  // Separar
  const pendientes = notificaciones.filter((n) => !n.confirmado_at);
  const presentes = notificaciones.filter((n) => n.tipo === "llegada" && n.confirmado_at && !notificaciones.find((r) => r.tipo === "retiro" && r.nombre === n.nombre && r.confirmado_at));
  const retirados = notificaciones.filter((n) => n.tipo === "retiro" && n.confirmado_at);

  // ── Elegir sede ─────────────────────────────────────────
  if (!sede) {
    return <SedeSelector onSelect={selectSede} />;
  }

  // ── Activar pantalla ────────────────────────────────────
  if (!audioEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 text-center px-8">
        <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl p-12 shadow-2xl border border-white/60 max-w-lg w-full">
          <div className="mx-auto mb-4">
            <img src="/leon_logo_512.png" alt="Play & Group" className="w-20 h-20 mx-auto animate-float-slow" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-3">Pantalla Play</h1>
          <p className="text-lg text-gray-400 mb-8">
            Pantalla para la sala. Los papás ven el nombre de su hijo.
          </p>
          <button
            onClick={enableAudio}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500
                       px-8 py-5 text-xl font-bold text-white shadow-lg shadow-purple-300/40
                       transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.97]
                       flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🔊</span> Activar pantalla
          </button>
        </div>
      </div>
    );
  }

  // ── Vista TV principal: León al centro, niños a los lados ──
  return (
    <div className="flex min-h-screen flex-col px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src="/leon_logo_512.png" alt="Play & Group" className="w-10 h-10" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Fundación</p>
            <p className="text-lg leading-tight"><span className="font-black text-white">arm</span> <span className="font-medium text-white/70">global</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-white/80">{clock}</span>
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs font-semibold text-white/80">{connected ? "En vivo" : "..."}</span>
          </div>
        </div>
      </div>

      {/* Contenido: 3 columnas — Presentes | León | Pendientes/Retiros */}
      <div className="flex-1 flex items-stretch gap-4">

        {/* ═══ Columna izquierda: Niños presentes (en Play) ═══ */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
              En Play ({presentes.length})
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-auto">
            {presentes.length === 0 ? (
              <div className="rounded-2xl bg-white/10 px-4 py-6 text-center">
                <p className="text-sm text-white/30">Sin niños aún</p>
              </div>
            ) : (
              presentes.map((n) => (
                <div key={n.id} className="rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-md border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧒</span>
                    <span className="text-sm font-black text-gray-800 flex-1">{n.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      📥 Llegó {formatHora(n.created_at)}
                    </span>
                    {n.confirmado_por && (
                      <span className="text-[10px] text-gray-400">• {n.confirmado_por}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══ Centro: León mascota + notificaciones pendientes ═══ */}
        <div className="flex flex-col items-center justify-center w-72 shrink-0">
          {pendientes.length === 0 ? (
            /* Sin pendientes — león tranquilo */
            <div className="text-center">
              <img src="/leon_logo_512.png" alt="Play & Group" className="w-32 h-32 mx-auto animate-float-slow" />
              <h2 className="text-xl font-black text-white/80 mt-4">Play & Group</h2>
              <p className="text-sm text-white/40 mt-1">{sedeNombre}</p>
            </div>
          ) : (
            /* Pendientes: león alerta + cards de aviso */
            <div className="text-center w-full">
              <img src="/leon_logo_512.png" alt="Play & Group" className="w-20 h-20 mx-auto animate-bounce mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-300 mb-3">
                🔔 {pendientes.length} {pendientes.length === 1 ? "aviso" : "avisos"}
              </p>
              <div className="space-y-2">
                {pendientes.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-2xl p-4 shadow-xl text-center animate-pulse-glow
                      ${n.tipo === "llegada"
                        ? "bg-white/95 border-2 border-purple-200"
                        : "bg-white/95 border-2 border-orange-200"}`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-wider
                      ${n.tipo === "llegada" ? "text-purple-400" : "text-orange-400"}`}>
                      {n.tipo === "llegada" ? "🧸 Bienvenido/a" : "👋 Ya vamos"}
                    </p>
                    <h3 className="text-2xl font-black text-gray-800 mt-1">{n.nombre}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{formatHora(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Columna derecha: Retirados (se fueron) ═══ */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
              Retirados ({retirados.length})
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-auto">
            {retirados.length === 0 ? (
              <div className="rounded-2xl bg-white/10 px-4 py-6 text-center">
                <p className="text-sm text-white/30">Nadie retirado aún</p>
              </div>
            ) : (
              retirados.map((n) => (
                <div key={n.id} className="rounded-2xl bg-white/70 backdrop-blur px-4 py-3 shadow-sm border border-orange-100/50 opacity-80">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👋</span>
                    <span className="text-sm font-bold text-gray-600 flex-1">{n.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-orange-500 font-semibold">
                      📤 Salió {formatHora(n.confirmado_at!)}
                    </span>
                    {n.confirmado_por && (
                      <span className="text-[10px] text-gray-400">• {n.confirmado_por}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center">
        <p className="text-[10px] text-white/20 font-medium">
          📍 {sedeNombre} • Fundación ARM Global
        </p>
      </div>
    </div>
  );
}
