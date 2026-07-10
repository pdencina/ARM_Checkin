"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_COLOR, MIN_LABEL, type Ministerio } from "@/lib/types";

interface PickupCall {
  id: string;
  estado: "pendiente" | "en_camino" | "entregado" | "cancelado";
  created_at: string;
  guardian: { id: string; nombre: string; apellido: string };
  children: { id: string; nombre: string; apellido: string; ministerio: Ministerio }[];
}

export default function PantallaClient() {
  const supabase = createClient();
  const [calls, setCalls] = useState<PickupCall[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [services, setServices] = useState<{ id: string; nombre: string; campus: string }[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<Ministerio | "todos">("todos");
  const prevCountRef = useRef(0);

  // Load active services
  useEffect(() => {
    supabase.from("services").select("id, nombre, campus")
      .eq("activo", true).order("fecha", { ascending: false })
      .then(({ data }: any) => {
        setServices(data ?? []);
        if (data?.length && !serviceId) setServiceId(data[0].id);
      });
  }, []);

  // Load calls and subscribe to realtime
  useEffect(() => {
    if (!serviceId) return;

    // Initial load
    loadCalls();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pickup-calls")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_calls",
          filter: `service_id=eq.${serviceId}`,
        },
        () => {
          // Reload on any change
          loadCalls();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId]);

  async function loadCalls() {
    if (!serviceId) return;
    const res = await fetch(`/api/pickup-call?service_id=${serviceId}`);
    const data = await res.json();
    const newCalls: PickupCall[] = data.calls ?? [];

    // Play sound if new calls arrived
    if (newCalls.length > prevCountRef.current) {
      playAlert();
    }
    prevCountRef.current = newCalls.length;
    setCalls(newCalls);
  }

  function playAlert() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      gain.gain.value = 0.5;

      // Ding-dong pattern
      osc.frequency.value = 880;
      osc.start();
      setTimeout(() => { osc.frequency.value = 660; }, 200);
      setTimeout(() => { osc.frequency.value = 880; }, 400);
      setTimeout(() => { osc.stop(); ctx.close(); }, 600);
    } catch {}
  }

  async function marcarEnCamino(callId: string) {
    await supabase.from("pickup_calls")
      .update({ estado: "en_camino" })
      .eq("id", callId);
    loadCalls();
  }

  async function marcarEntregado(callId: string) {
    await supabase.from("pickup_calls")
      .update({ estado: "entregado", atendido_at: new Date().toISOString() })
      .eq("id", callId);
    loadCalls();
  }

  const filteredCalls = filter === "todos"
    ? calls
    : calls.filter((c) => c.children.some((ch) => ch.ministerio === filter));

  const tiempoEspera = (created: string) => {
    const diff = Math.floor((Date.now() - new Date(created).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m`;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
            <i className="ti ti-triangle text-white" style={{ fontSize: 18 }} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Retiro de niños</h1>
            <p className="text-sm text-white/60">
              {services.find((s) => s.id === serviceId)?.nombre ?? "Sin servicio"}
              {" · "}
              {services.find((s) => s.id === serviceId)?.campus ?? ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {connected ? "En vivo" : "Conectando…"}
          </div>

          {/* Service selector */}
          {services.length > 1 && (
            <select
              className="rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm text-white"
              value={serviceId ?? ""}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {services.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.campus}</option>)}
            </select>
          )}

          {/* Filter by ministry */}
          <div className="flex gap-1">
            {(["todos", "kids", "tweens", "sensorial"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilter(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition
                  ${filter === m ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
              >
                {m === "todos" ? "Todos" : MIN_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="mb-6 flex items-center gap-6">
        <div className="rounded-xl bg-white/5 border border-white/10 px-5 py-3">
          <p className="text-xs text-white/50 uppercase tracking-wider">En espera</p>
          <p className="text-4xl font-bold">{filteredCalls.filter((c) => c.estado === "pendiente").length}</p>
        </div>
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-3">
          <p className="text-xs text-yellow-400/70 uppercase tracking-wider">En camino</p>
          <p className="text-4xl font-bold text-yellow-400">{filteredCalls.filter((c) => c.estado === "en_camino").length}</p>
        </div>
      </div>

      {/* Calls grid */}
      {filteredCalls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <i className="ti ti-bell-off" style={{ fontSize: 64 }} aria-hidden="true" />
          <p className="mt-4 text-lg">Sin llamados pendientes</p>
          <p className="text-sm">Cuando un papá escanee su QR, aparecerá aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCalls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              tiempo={tiempoEspera(call.created_at)}
              onEnCamino={() => marcarEnCamino(call.id)}
              onEntregado={() => marcarEntregado(call.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CallCard({
  call,
  tiempo,
  onEnCamino,
  onEntregado,
}: {
  call: PickupCall;
  tiempo: string;
  onEnCamino: () => void;
  onEntregado: () => void;
}) {
  const isPendiente = call.estado === "pendiente";
  const isEnCamino = call.estado === "en_camino";

  return (
    <div
      className={`rounded-2xl border p-5 transition-all animate-in
        ${isPendiente
          ? "bg-white/5 border-white/20 animate-pulse-slow"
          : "bg-yellow-500/10 border-yellow-500/30"
        }`}
      style={{ animation: isPendiente ? "pulse-glow 2s ease-in-out infinite" : undefined }}
    >
      {/* Guardian name */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xl font-bold">
          {call.guardian.nombre} {call.guardian.apellido}
        </p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium
          ${isPendiente ? "bg-white/10 text-white/70" : "bg-yellow-500/20 text-yellow-300"}`}>
          {isPendiente ? `⏳ ${tiempo}` : "🚶 En camino"}
        </span>
      </div>

      {/* Children */}
      <div className="space-y-1.5 mb-4">
        {call.children.map((child) => {
          const col = MIN_COLOR[child.ministerio];
          return (
            <div key={child.id} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: col.hex }}
              />
              <span className="text-sm font-medium">{child.nombre} {child.apellido}</span>
              <span className="text-xs text-white/50">{MIN_LABEL[child.ministerio]}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isPendiente && (
          <button
            onClick={onEnCamino}
            className="flex-1 rounded-xl bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400 transition"
          >
            🚶 En camino
          </button>
        )}
        <button
          onClick={onEntregado}
          className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-black hover:bg-green-400 transition"
        >
          ✅ Entregado
        </button>
      </div>
    </div>
  );
}
