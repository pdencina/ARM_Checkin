"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import SedeSelector, { useSede } from "../SedeSelector";

interface Notificacion {
  id: string;
  nombre: string;
  tipo: "llegada" | "retiro";
  confirmado_at: string | null;
  created_at: string;
}

// Helper para convertir VAPID key a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Confetti explosivo ─────────────────────────────────────
function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa", "#fb923c", "#f87171"];
  const particles: {
    x: number; y: number; w: number; h: number;
    color: string; vx: number; vy: number; rot: number; rotSpeed: number;
  }[] = [];

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    particles.push({
      x: cx, y: cy,
      w: Math.random() * 10 + 4, h: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
      rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.4,
    });
  }

  let frame = 0;
  const maxFrames = 160;

  function draw() {
    if (frame >= maxFrames) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.99; p.rot += p.rotSpeed;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = 1 - frame / maxFrames; ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    frame++;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Audio persistente ──────────────────────────────────────
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

    // Helper: nota tipo xilófono/campanita (sine + armónico suave)
    function playNote(freq: number, time: number, duration: number, volume: number) {
      // Fundamental
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);

      // Armónico suave (octava arriba, más bajo) — da brillo
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(volume * 0.2, time);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.6);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(time);
      osc2.stop(time + duration);

      // Tercer armónico sutil (da calidez)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.value = freq * 3;
      gain3.gain.setValueAtTime(volume * 0.05, time);
      gain3.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.3);
      osc3.connect(gain3).connect(ctx.destination);
      osc3.start(time);
      osc3.stop(time + duration);
    }

    if (tipo === "llegada") {
      // Melodía dulce ascendente tipo xilófono (Do-Mi-Sol-Do alto)
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        playNote(freq, now + i * 0.18, 0.8, 0.25);
      });
    } else {
      // Retiro: ding-dong cálido que se repite (campanitas descendentes)
      const notes = [880, 659, 784, 659];
      notes.forEach((freq, i) => {
        playNote(freq, now + i * 0.2, 0.6, 0.2);
      });
      // Segunda ronda más suave
      notes.forEach((freq, i) => {
        playNote(freq, now + 1.0 + i * 0.2, 0.5, 0.12);
      });
    }
  } catch { /* ignore */ }
}

export default function PlayClient() {
  const supabase = createClient();
  const { sede, sedeNombre, selectSede } = useSede();
  const [queue, setQueue] = useState<Notificacion[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [tia, setTia] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detectar si está en modo standalone (PWA instalada)
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    // Recuperar tía guardada
    const savedTia = localStorage.getItem("play-tia");
    if (savedTia) setTia(savedTia);
  }, []);

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
    // Suscribir a push notifications
    subscribeToPush();
    // Activar Wake Lock (pantalla siempre encendida)
    requestWakeLock();
  }

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        await (navigator as any).wakeLock.request("screen");
      }
    } catch { /* ignore */ }
  }

  // Re-adquirir Wake Lock si la pestaña vuelve a estar visible
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && audioEnabled) {
        requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [audioEnabled]);

  // Registrar Service Worker y suscribir a Push
  async function subscribeToPush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Pedir permiso
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // Suscribir
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Guardar en Supabase
      const subJson = subscription.toJSON();
      await supabase.from("push_subscriptions").upsert({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh ?? "",
        auth: subJson.keys?.auth ?? "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

    } catch (err) {
      console.warn("Push subscription failed:", err);
    }
  }

  // Cargar notificaciones pendientes (sin confirmar) del día
  useEffect(() => {
    async function loadPendientes() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("notificaciones")
        .select("id, nombre, tipo, confirmado_at, created_at")
        .is("confirmado_at", null)
        .eq("sede", sede || "puente-alto")
        .gte("created_at", hoy.toISOString())
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setQueue(data as Notificacion[]);
      }
    }
    loadPendientes();
  }, []);

  // Suscripción a Realtime
  useEffect(() => {
    const channel = supabase
      .channel("notificaciones-play")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          const nuevo = payload.new as Notificacion;
          setQueue((prev) => [...prev, nuevo]);
          if (audioEnabled) playChime(nuevo.tipo);
          if (canvasRef.current) launchConfetti(canvasRef.current);
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
        const { nombre, tipo } = payload.payload;
        if (audioEnabled) playChime(tipo);
        if (canvasRef.current) launchConfetti(canvasRef.current);
        // Si no está ya en la cola, agregarlo temporalmente para que se muestre
        setQueue((prev) => {
          const yaExiste = prev.some((n) => n.nombre === nombre && !n.confirmado_at);
          if (yaExiste) return prev; // ya está visible, solo sonó
          return prev; // no agregar duplicado, solo sonar
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [audioEnabled]);

  // Confirmar notificación actual
  const confirmar = useCallback(async () => {
    const current = queue[0];
    if (current) {
      await supabase
        .from("notificaciones")
        .update({ confirmado_at: new Date().toISOString(), confirmado_por: tia })
        .eq("id", current.id);
    }
    setQueue((prev) => prev.slice(1));
  }, [queue, tia]);

  const current = queue[0] ?? null;

  // ── Elegir sede ─────────────────────────────────────────
  if (!sede) {
    return <SedeSelector onSelect={selectSede} />;
  }

  // ── Elegir tía ──────────────────────────────────────────
  if (!tia) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
        <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl p-10 shadow-2xl border border-white/60 max-w-sm w-full animate-slide-up">
          <div className="mx-auto mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Fundación</p>
            <p className="text-lg leading-tight"><span className="font-black text-gray-800">arm</span> <span className="font-medium text-gray-600">global</span></p>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">¿Quién eres?</h1>
          <p className="text-sm text-gray-400 mb-6">Así sabemos quién confirma cada aviso</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setTia("Tía Cote"); localStorage.setItem("play-tia", "Tía Cote"); }}
              className="rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 p-5 text-center
                         transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]
                         border-2 border-transparent hover:border-purple-200"
            >
              <span className="text-4xl block mb-2">👩‍🦰</span>
              <span className="text-sm font-black text-gray-700">Tía Cote</span>
            </button>
            <button
              onClick={() => { setTia("Tía Cata"); localStorage.setItem("play-tia", "Tía Cata"); }}
              className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 p-5 text-center
                         transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]
                         border-2 border-transparent hover:border-orange-200"
            >
              <span className="text-4xl block mb-2">👩‍🦱</span>
              <span className="text-sm font-black text-gray-700">Tía Cata</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Overlay activar sonido ──────────────────────────────
  if (!audioEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 text-center px-4">
        <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl p-10 shadow-2xl border border-white/60 max-w-sm w-full animate-slide-up">
          <div className="mx-auto mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Fundación</p>
            <p className="text-lg leading-tight"><span className="font-black text-gray-800">arm</span> <span className="font-medium text-gray-600">global</span></p>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Pantalla Play</h1>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Toca el botón para que suene cuando te avisen desde recepción 🧸
          </p>
          <button
            onClick={enableAudio}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500
                       px-6 py-4 text-lg font-bold text-white shadow-lg shadow-purple-300/40
                       transition-all hover:shadow-xl hover:shadow-purple-300/60 hover:scale-[1.02] active:scale-[0.97]
                       flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔊</span> Activar sonido
          </button>
        </div>
      </div>
    );
  }

  // ── Esperando ───────────────────────────────────────────
  if (!current) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 text-center px-4">
        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />

        <div className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-lg px-3 py-1.5 shadow-lg border border-white/50">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-xs font-semibold text-gray-600">{connected ? "Conectado" : "Reconectando…"}</span>
        </div>

        <div className="rounded-[2rem] bg-white/80 backdrop-blur-xl p-14 shadow-xl border border-white/50">
          <div className="animate-float-med mx-auto mb-5">
            <span className="text-8xl block">🧸</span>
          </div>
          <h1 className="text-2xl font-black text-gray-700">Todo tranqui por acá…</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Cuando avisen de recepción va a sonar acá 🎉
          </p>
        </div>

        {/* Banner instalar PWA */}
        {!isStandalone && (
          <div className="mt-6 rounded-2xl bg-white/70 backdrop-blur-lg px-5 py-4 shadow-md border border-white/50 text-left max-w-xs">
            <p className="text-xs font-bold text-gray-700 mb-1">📲 Instalar en tu celu</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Para recibir notificaciones con pantalla bloqueada, agrega esta app a tu pantalla de inicio:
              <br/><br/>
              <span className="font-semibold text-gray-600">iPhone:</span> Toca <span className="inline-block px-1 bg-gray-100 rounded text-[10px]">⬆ Compartir</span> → <span className="inline-block px-1 bg-gray-100 rounded text-[10px]">Agregar a inicio</span>
              <br/>
              <span className="font-semibold text-gray-600">Android:</span> Menú <span className="inline-block px-1 bg-gray-100 rounded text-[10px]">⋮</span> → <span className="inline-block px-1 bg-gray-100 rounded text-[10px]">Instalar app</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Notificación activa ─────────────────────────────────
  const isLlegada = current.tipo === "llegada";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />

      {/* Indicador conexión */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-lg px-3 py-1.5 shadow-lg border border-white/50">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <span className="text-xs font-semibold text-gray-600">{connected ? "Conectado" : "Reconectando…"}</span>
      </div>

      {/* Badge cola */}
      {queue.length > 1 && (
        <div className="fixed top-4 left-4 rounded-full bg-white/90 backdrop-blur-lg px-4 py-2 shadow-lg border border-white/50 z-10">
          <span className="text-xs font-bold text-purple-600">🔔 +{queue.length - 1} más</span>
        </div>
      )}

      {/* Card de notificación */}
      <div className={`rounded-[2rem] backdrop-blur-xl p-10 shadow-2xl border max-w-lg w-full animate-pop-in animate-pulse-glow
                       ${isLlegada
                         ? "bg-white/95 border-purple-100"
                         : "bg-white/95 border-orange-100"}`}>
        <div className="mb-5">
          <span className="text-7xl block animate-bounce">
            {isLlegada ? "🎉" : "👋"}
          </span>
        </div>

        <p className={`text-xs font-black uppercase tracking-[0.2em] mb-3
                       ${isLlegada ? "text-purple-400" : "text-orange-400"}`}>
          {isLlegada ? "¡Dejaron un niño en recepción!" : "¡Vienen a buscar a un niño!"}
        </p>

        <h1 className={`text-5xl font-black md:text-6xl leading-tight bg-clip-text text-transparent
                        ${isLlegada
                          ? "bg-gradient-to-r from-violet-600 to-pink-500"
                          : "bg-gradient-to-r from-orange-500 to-amber-500"}`}>
          {current.nombre}
        </h1>

        <p className="text-sm text-gray-400 mt-3 font-medium">
          {isLlegada
            ? "Anda a buscarlo a la entrada 🚶‍♀️"
            : "Tráelo al hall que lo están esperando 🏠"}
        </p>

        <p className="text-xs text-gray-300 mt-2">
          🕐 {new Date(current.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>

        <button
          onClick={confirmar}
          className={`mt-8 w-full rounded-2xl px-8 py-5 text-xl font-black text-white
                     shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.95]
                     flex items-center justify-center gap-3
                     ${isLlegada
                       ? "bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 shadow-purple-300/40"
                       : "bg-gradient-to-r from-orange-400 to-amber-400 shadow-orange-200/40"}`}
        >
          {isLlegada ? (
            <><span className="text-2xl">🙋‍♀️</span> Ya voy!</>
          ) : (
            <><span className="text-2xl">🚶‍♀️</span> Ya lo llevo!</>
          )}
        </button>
      </div>
    </div>
  );
}
