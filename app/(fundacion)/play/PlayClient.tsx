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

  const colors = ["#f59e0b", "#fb923c", "#10b981", "#ec4899", "#6366f1", "#facc15"];
  const particles: {
    x: number; y: number; w: number; h: number;
    color: string; vx: number; vy: number; rot: number; rotSpeed: number;
  }[] = [];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  let frame = 0;
  const maxFrames = 120;

  function draw() {
    if (frame >= maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-100">
          <span style={{ fontSize: 44 }}>🧸</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pantalla Play</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            Activa el sonido para recibir las notificaciones cuando llegue un niño.
          </p>
        </div>
        <button
          onClick={enableAudio}
          className="rounded-xl bg-amber-500 px-8 py-4 text-base font-semibold text-white
                     transition hover:bg-amber-600 flex items-center gap-2"
        >
          <i className="ti ti-volume" style={{ fontSize: 22 }} aria-hidden="true" />
          Activar sonido
        </button>
      </div>
    );
  }

  // ── Esperando ───────────────────────────────────────────
  if (!current) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 text-center px-4">
        {/* Indicador de conexión */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`} />
          <span className="text-xs text-gray-400">{connected ? "Conectado" : "Reconectando…"}</span>
        </div>

        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/80 shadow-sm">
          <span style={{ fontSize: 52 }}>🧸</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-700">Esperando niños…</h1>
          <p className="text-sm text-gray-400 mt-1">
            Cuando recepción avise, aparecerá aquí con sonido
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
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`} />
        <span className="text-xs text-gray-400">{connected ? "Conectado" : "Reconectando…"}</span>
      </div>

      {/* Badge cola */}
      {queue.length > 1 && (
        <div className="absolute top-5 left-5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
          +{queue.length - 1} en espera
        </div>
      )}

      {/* Contenido */}
      <div className="animate-bounce">
        <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-amber-100 mx-auto">
          <span style={{ fontSize: 64 }}>🧸</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">
          Llegó a recepción
        </p>
        <h1 className="text-5xl font-bold text-gray-800 md:text-6xl">
          {current.nombre}
        </h1>
        <p className="text-sm text-gray-400 mt-3">
          {new Date(current.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <button
        onClick={dismiss}
        className="mt-4 rounded-xl bg-amber-500 px-10 py-4 text-lg font-semibold text-white
                   transition hover:bg-amber-600 flex items-center gap-2"
      >
        <i className="ti ti-check" style={{ fontSize: 24 }} aria-hidden="true" />
        Entendido, voy!
      </button>
    </div>
  );
}
