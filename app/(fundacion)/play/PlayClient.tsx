"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notificacion {
  id: string;
  nombre: string;
  created_at: string;
}

// ── Confetti canvas ────────────────────────────────────────
function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#60a5fa", "#fb923c"];
  const particles: {
    x: number; y: number; w: number; h: number;
    color: string; vx: number; vy: number; rot: number; rotSpeed: number;
  }[] = [];

  for (let i = 0; i < 180; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 5 + 3,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }

  let frame = 0;
  const maxFrames = 140;

  function draw() {
    if (frame >= maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rot += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - frame / maxFrames;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Sonido campanita (Web Audio API) ──────────────────────
function playChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 830;
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 1100;
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.value = 1320;
    gain3.gain.setValueAtTime(0.3, now + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc3.connect(gain3).connect(ctx.destination);
    osc3.start(now + 0.3);
    osc3.stop(now + 0.8);

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Silently ignore
  }
}

export default function PlayClient() {
  const supabase = createClient();
  const [queue, setQueue] = useState<Notificacion[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function enableAudio() {
    const ctx = new AudioContext();
    ctx.resume().then(() => ctx.close());
    setAudioEnabled(true);
  }

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
          if (audioEnabled) playChime();
          if (canvasRef.current) launchConfetti(canvasRef.current);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioEnabled]);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const current = queue[0] ?? null;

  // ── Overlay activar sonido ──────────────────────────────
  if (!audioEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 text-center px-4">
        <div className="rounded-3xl bg-white/90 backdrop-blur p-10 shadow-2xl max-w-sm w-full">
          <span className="text-6xl block mb-4">🔔</span>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pantalla Play</h1>
          <p className="text-sm text-gray-400 mb-6">
            Activa el sonido para escuchar cuando llegue un niño a recepción.
          </p>
          <button
            onClick={enableAudio}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400
                       px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200/50
                       transition hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                       flex items-center justify-center gap-2"
          >
            <span>🔊</span> Activar sonido
          </button>
        </div>
      </div>
    );
  }

  // ── Esperando ───────────────────────────────────────────
  if (!current) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 text-center px-4">
        {/* Indicador de conexión */}
        <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 shadow-sm">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
          <span className="text-xs font-medium text-gray-600">{connected ? "Conectado" : "Reconectando…"}</span>
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur p-12 shadow-xl">
          <span className="text-7xl block mb-4 animate-pulse">🧸</span>
          <h1 className="text-2xl font-bold text-gray-700">Esperando niños…</h1>
          <p className="text-sm text-gray-400 mt-2">
            Cuando recepción avise, aparecerá aquí con sonido 🎵
          </p>
        </div>
      </div>
    );
  }

  // ── Notificación activa ─────────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />

      {/* Indicador conexión */}
      <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 shadow-sm z-10">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
        <span className="text-xs font-medium text-gray-600">{connected ? "Conectado" : "Reconectando…"}</span>
      </div>

      {/* Badge cola */}
      {queue.length > 1 && (
        <div className="fixed top-4 left-4 rounded-full bg-white/90 backdrop-blur px-4 py-2 shadow-sm z-10">
          <span className="text-xs font-bold text-gray-700">+{queue.length - 1} en espera</span>
        </div>
      )}

      {/* Card de notificación */}
      <div className="rounded-3xl bg-white/95 backdrop-blur p-10 shadow-2xl max-w-lg w-full animate-in">
        <div className="mb-4">
          <span className="text-6xl block animate-bounce">🎉</span>
        </div>

        <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-3">
          ¡Llegó a recepción!
        </p>
        <h1 className="text-5xl font-black text-gray-800 md:text-6xl leading-tight">
          {current.nombre}
        </h1>
        <p className="text-sm text-gray-400 mt-3 font-medium">
          {new Date(current.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>

        <button
          onClick={dismiss}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400
                     px-8 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-200/50
                     transition hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                     flex items-center justify-center gap-2"
        >
          <span>✅</span> Entendido, voy!
        </button>
      </div>
    </div>
  );
}
