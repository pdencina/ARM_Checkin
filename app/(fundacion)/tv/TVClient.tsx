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

    if (tipo === "llegada") {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.4, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.6);
      });
    } else {
      for (let rep = 0; rep < 2; rep++) {
        const offset = rep * 0.5;
        [880, 880, 1100].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square"; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, now + offset + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + i * 0.12 + 0.1);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + offset + i * 0.12); osc.stop(now + offset + i * 0.12 + 0.1);
        });
      }
    }
  } catch { /* ignore */ }
}

export default function TVClient() {
  const supabase = createClient();
  const [pendientes, setPendientes] = useState<Notificacion[]>([]);
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
        if ("wakeLock" in navigator) {
          await (navigator as any).wakeLock.request("screen");
        }
      } catch { /* ignore */ }
    }
    if (audioEnabled) lock();
    function handleVisibility() {
      if (document.visibilityState === "visible" && audioEnabled) lock();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [audioEnabled]);

  // Cargar pendientes del día
  useEffect(() => {
    async function loadPendientes() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("notificaciones")
        .select("id, nombre, tipo, confirmado_at, created_at")
        .is("confirmado_at", null)
        .gte("created_at", hoy.toISOString())
        .order("created_at", { ascending: true });
      if (data) setPendientes(data as Notificacion[]);
    }
    loadPendientes();
  }, []);

  // Realtime: nuevas notificaciones + confirmaciones
  useEffect(() => {
    const channel = supabase
      .channel("notificaciones-tv")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          const nuevo = payload.new as Notificacion;
          setPendientes((prev) => [...prev, nuevo]);
          if (audioEnabled) playChime(nuevo.tipo);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificaciones" },
        (payload) => {
          const updated = payload.new as Notificacion;
          if (updated.confirmado_at) {
            // Quitar de pendientes cuando la tía confirma desde su celular
            setPendientes((prev) => prev.filter((n) => n.id !== updated.id));
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [audioEnabled]);

  // Escuchar "insistir" desde recepción (broadcast efímero)
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

  // ── Activar sonido ──────────────────────────────────────
  if (!audioEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 text-center px-8">
        <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl p-12 shadow-2xl border border-white/60 max-w-lg w-full">
          <div className="mx-auto mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500">Fundación</p>
            <p className="text-3xl leading-tight"><span className="font-black text-gray-800">arm</span> <span className="font-medium text-gray-600">global</span></p>
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-3">Modo TV</h1>
          <p className="text-lg text-gray-400 mb-8">
            Pantalla para la sala de Play. Muestra los avisos en grande.<br/>
            La tía confirma desde su celular.
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

  // ── Vista TV principal ──────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">Fundación</p>
          <p className="text-lg leading-tight"><span className="font-black text-white">arm</span> <span className="font-medium text-white/70">global</span></p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-white/80">{clock}</span>
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs font-semibold text-white/80">{connected ? "En vivo" : "..."}</span>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {pendientes.length === 0 ? (
        /* Nada pendiente */
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-9xl block mb-6">🧸</span>
          <h1 className="text-4xl font-black text-white/90">Todo tranqui</h1>
          <p className="text-xl text-white/50 mt-2">Esperando avisos de recepción...</p>
        </div>
      ) : (
        /* Lista de pendientes en grande */
        <div className="flex-1 flex flex-col gap-4 justify-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/40 text-center mb-2">
            {pendientes.length} {pendientes.length === 1 ? "niño pendiente" : "niños pendientes"}
          </p>
          <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto w-full">
            {pendientes.map((n) => (
              <div
                key={n.id}
                className={`rounded-3xl p-6 shadow-xl border flex items-center gap-5
                  ${n.tipo === "llegada"
                    ? "bg-white/95 border-purple-100"
                    : "bg-white/95 border-orange-100"}`}
              >
                <span className="text-5xl">
                  {n.tipo === "llegada" ? "🧸" : "👋"}
                </span>
                <div className="flex-1">
                  <p className={`text-xs font-black uppercase tracking-wider mb-1
                    ${n.tipo === "llegada" ? "text-purple-400" : "text-orange-400"}`}>
                    {n.tipo === "llegada" ? "Dejaron en recepción" : "Vienen a buscarlo"}
                  </p>
                  <h2 className="text-4xl font-black text-gray-800">{n.nombre}</h2>
                </div>
                <div className="text-right">
                  <span className="text-lg text-gray-400 font-semibold">
                    {new Date(n.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <p className="text-xs font-bold text-amber-500 mt-1 animate-pulse">Esperando tía...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
