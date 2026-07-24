"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notificacion {
  id: string;
  nombre: string;
  created_at: string;
}

// ── Confetti explosivo ─────────────────────────────────────
function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa", "#fb923c", "#f87171"];
  const shapes = ["rect", "circle", "triangle"];
  const particles: {
    x: number; y: number; w: number; h: number;
    color: string; shape: string; vx: number; vy: number; rot: number; rotSpeed: number;
  }[] = [];

  // Explotar desde el centro
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    particles.push({
      x: cx,
      y: cy,
      w: Math.random() * 10 + 4,
      h: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.4,
    });
  }

  let frame = 0;
  const maxFrames = 160;

  function draw() {
    if (frame >= maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.99; // drag
      p.rot += p.rotSpeed;

      const alpha = 1 - frame / maxFrames;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(0, -p.w / 2);
        ctx.lineTo(-p.w / 2, p.w / 2);
        ctx.lineTo(p.w / 2, p.w / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    frame++;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Sonido campanita alegre ───────────────────────────────
// Usa un AudioContext persistente que se desbloquea con interacción del usuario
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

function playChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Acorde alegre (C-E-G-C alto)
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
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
    // Desbloquear el AudioContext con la interacción del usuario
    const ctx = getAudioContext();
    ctx.resume().then(() => {
      // Reproducir un sonido corto silencioso para confirmar desbloqueo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.01; // casi inaudible
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    });
    setAudioEnabled(true);
  }

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

  const dismiss = useCallback(async () => {
    const current = queue[0];
    if (current) {
      // Marcar como confirmado en Supabase
      await supabase
        .from("notificaciones")
        .update({ confirmado_at: new Date().toISOString() })
        .eq("id", current.id);
    }
    setQueue((prev) => prev.slice(1));
  }, [queue]);

  const current = queue[0] ?? null;

  // ── Overlay activar sonido ──────────────────────────────
  if (!audioEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 text-center px-4">
        <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl p-10 shadow-2xl border border-white/60 max-w-sm w-full animate-slide-up">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center animate-float-slow">
            <span className="text-4xl">🎵</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Pantalla Play</h1>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Activa el sonido para escuchar cuando llegue un niño 🧸
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

        {/* Indicador de conexión */}
        <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-lg px-3 py-1.5 shadow-lg border border-white/50">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-xs font-semibold text-gray-600">{connected ? "Conectado" : "Reconectando…"}</span>
        </div>

        <div className="rounded-[2rem] bg-white/80 backdrop-blur-xl p-14 shadow-xl border border-white/50">
          <div className="animate-float-med mx-auto mb-5">
            <span className="text-8xl block">🧸</span>
          </div>
          <h1 className="text-2xl font-black text-gray-700">Esperando niños…</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Cuando recepción avise, aparecerá aquí con sonido y confetti 🎉
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
      <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-lg px-3 py-1.5 shadow-lg border border-white/50 z-10">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <span className="text-xs font-semibold text-gray-600">{connected ? "Conectado" : "Reconectando…"}</span>
      </div>

      {/* Badge cola */}
      {queue.length > 1 && (
        <div className="fixed top-4 left-4 rounded-full bg-white/90 backdrop-blur-lg px-4 py-2 shadow-lg border border-white/50 z-10">
          <span className="text-xs font-bold text-purple-600">🔔 +{queue.length - 1} en espera</span>
        </div>
      )}

      {/* Card de notificación */}
      <div className="rounded-[2rem] bg-white/95 backdrop-blur-xl p-10 shadow-2xl border border-white/60 max-w-lg w-full animate-pop-in animate-pulse-glow">
        <div className="mb-5">
          <span className="text-7xl block animate-bounce">🎉</span>
        </div>

        <p className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] mb-3">
          ¡Llegó a recepción!
        </p>
        <h1 className="text-5xl font-black text-gray-800 md:text-6xl leading-tight bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
          {current.nombre}
        </h1>
        <p className="text-sm text-gray-400 mt-3 font-semibold">
          🕐 {new Date(current.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>

        <button
          onClick={dismiss}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500
                     px-8 py-5 text-xl font-black text-white shadow-lg shadow-purple-300/40
                     transition-all hover:shadow-xl hover:shadow-purple-300/60 hover:scale-[1.02] active:scale-[0.95]
                     flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🙋‍♀️</span> ¡Voy por él!
        </button>
      </div>
    </div>
  );
}
