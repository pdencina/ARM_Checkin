"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notificacion {
  id: string;
  nombre: string;
  tipo: "llegada" | "retiro";
  confirmado_at: string | null;
  confirmado_por: string | null;
  created_at: string;
}

interface HorarioNino {
  id: string;
  nombre: string;
  hora_llegada: string;
  hora_salida: string | null;
  jornada: string;
  notas: string | null;
}

export default function RecepcionClient() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [historial, setHistorial] = useState<Notificacion[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [connected, setConnected] = useState(false);
  const [sent, setSent] = useState(false);
  const [popup, setPopup] = useState<{ nombre: string; tipo: "llegada" | "retiro"; tia: string | null } | null>(null);
  const [nombres, setNombres] = useState<string[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [semana, setSemana] = useState<{ dia: string; total: number }[]>([]);
  const [tab, setTab] = useState<"historial" | "stats">("historial");
  const [ultimoEnviado, setUltimoEnviado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "confirmados" | "llegadas" | "retiros">("todos");
  const [isStandalone, setIsStandalone] = useState(true);
  const [horarios, setHorarios] = useState<HorarioNino[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const sugRef = useRef<HTMLDivElement>(null);

  // Detectar si está en modo standalone (PWA instalada)
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Cargar nombres + horarios para autocompletado inteligente
  useEffect(() => {
    async function loadData() {
      // Cargar horarios de niños
      const { data: horariosData } = await supabase
        .from("horarios_ninos")
        .select("id, nombre, hora_llegada, hora_salida, jornada, notas")
        .eq("activo", true)
        .order("hora_llegada");
      if (horariosData) setHorarios(horariosData as HorarioNino[]);

      // Cargar nombres del historial + horarios para autocompletado
      const { data: histNombres } = await supabase
        .from("notificaciones")
        .select("nombre")
        .order("created_at", { ascending: false })
        .limit(500);

      const set = new Set<string>();
      (horariosData ?? []).forEach((h: any) => { if (h.nombre) set.add(h.nombre); });
      (histNombres ?? []).forEach((n: any) => { if (n.nombre) set.add(n.nombre); });

      setNombres(Array.from(set));
    }
    loadData();
  }, []);

  // Cargar datos semanales para estadísticas
  useEffect(() => {
    async function loadSemana() {
      const hoy = new Date();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes de esta semana
      lunes.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("notificaciones")
        .select("created_at")
        .gte("created_at", lunes.toISOString())
        .order("created_at");

      if (data) {
        const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        const conteo: number[] = [0, 0, 0, 0, 0, 0, 0];
        data.forEach((n: any) => {
          const d = new Date(n.created_at);
          const idx = (d.getDay() + 6) % 7; // 0=Lun, 6=Dom
          conteo[idx]++;
        });
        setSemana(dias.map((dia, i) => ({ dia, total: conteo[i] })));
      }
    }
    loadSemana();
  }, []);

  // Filtrar sugerencias al escribir (ordenadas por proximidad horaria)
  useEffect(() => {
    const q = nombre.trim().toLowerCase();
    if (q.length < 2) {
      setSugerencias([]);
      setShowSugerencias(false);
      return;
    }
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    // Filtrar nombres que coinciden
    const filtered = nombres.filter((n) => n.toLowerCase().includes(q));

    // Ordenar: los que tienen horario cercano a la hora actual primero
    const sorted = filtered.sort((a, b) => {
      const hA = horarios.find((h) => h.nombre.toLowerCase() === a.toLowerCase());
      const hB = horarios.find((h) => h.nombre.toLowerCase() === b.toLowerCase());
      if (!hA && !hB) return a.localeCompare(b, "es");
      if (!hA) return 1;
      if (!hB) return -1;
      const [hAh, hAm] = hA.hora_llegada.split(":").map(Number);
      const [hBh, hBm] = hB.hora_llegada.split(":").map(Number);
      const diffA = Math.abs(horaActual - (hAh * 60 + hAm));
      const diffB = Math.abs(horaActual - (hBh * 60 + hBm));
      return diffA - diffB;
    });

    setSugerencias(sorted.slice(0, 5));
    setShowSugerencias(sorted.length > 0);
  }, [nombre, nombres, horarios]);

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
        .select("id, nombre, tipo, confirmado_at, confirmado_por, created_at")
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
            prev.map((n) => (n.id === updated.id ? { ...n, confirmado_at: updated.confirmado_at, confirmado_por: updated.confirmado_por } : n))
          );
          // Mostrar popup de confirmación
          if (updated.confirmado_at) {
            setPopup({ nombre: updated.nombre, tipo: updated.tipo, tia: updated.confirmado_por });
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
        .select("id, nombre, tipo, confirmado_at, confirmado_por, created_at")
        .single();
      if (error) throw error;
      setHistorial((prev) => [data as Notificacion, ...prev]);
      setUltimoEnviado(trimmed);
      setNombre("");
      const label = tipo === "llegada" ? "Dejaron a" : "Buscan a";
      setFeedback({ msg: `${label} ${trimmed} — avisado ✓`, type: "ok" });
      setSent(true);
      setTimeout(() => setSent(false), 600);
      inputRef.current?.focus();
      setTimeout(() => setFeedback(null), 3000);
      // Disparar push notification (fire & forget)
      fetch("/api/push-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: trimmed, tipo }),
      }).catch(() => {});
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

  // Insistir: re-notificar a Play sin crear registro nuevo
  async function insistir(n: Notificacion) {
    // Usar Realtime Broadcast (canal efímero, no toca la BD)
    const channel = supabase.channel("play-insistir");
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "insistir",
      payload: { id: n.id, nombre: n.nombre, tipo: n.tipo },
    });
    supabase.removeChannel(channel);
    // También disparar push por si tiene el celu bloqueado
    fetch("/api/push-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: n.nombre, tipo: n.tipo }),
    }).catch(() => {});
    setFeedback({ msg: `🔔 Insistido: ${n.nombre}`, type: "ok" });
    setTimeout(() => setFeedback(null), 2000);
  }

  // Enviar directo con nombre y tipo (para repetir último)
  async function enviarDirecto(nombreDirecto: string, tipo: "llegada" | "retiro") {
    setBusy(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .insert({ nombre: nombreDirecto, tipo })
        .select("id, nombre, tipo, confirmado_at, confirmado_por, created_at")
        .single();
      if (error) throw error;
      setHistorial((prev) => [data as Notificacion, ...prev]);
      setUltimoEnviado(nombreDirecto);
      setNombre("");
      const label = tipo === "llegada" ? "Dejaron a" : "Buscan a";
      setFeedback({ msg: `${label} ${nombreDirecto} — avisado ✓`, type: "ok" });
      setSent(true);
      setTimeout(() => setSent(false), 600);
      setTimeout(() => setFeedback(null), 3000);
      // Disparar push notification (fire & forget)
      fetch("/api/push-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreDirecto, tipo }),
      }).catch(() => {});
    } catch (e: any) {
      setFeedback({ msg: "Error: " + (e.message ?? "intenta nuevamente."), type: "err" });
    } finally {
      setBusy(false);
    }
  }

  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  }

  function tiempoRespuesta(creado: string, confirmado: string) {
    const diff = Math.round((new Date(confirmado).getTime() - new Date(creado).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    const min = Math.floor(diff / 60);
    const seg = diff % 60;
    if (min < 60) return seg > 0 ? `${min}m ${seg}s` : `${min}m`;
    const hrs = Math.floor(min / 60);
    return `${hrs}h ${min % 60}m`;
  }

  // Stats del día
  const llegadasHoy = historial.filter((n) => n.tipo === "llegada").length;
  const retirosHoy = historial.filter((n) => n.tipo === "retiro").length;
  const confirmados = historial.filter((n) => n.confirmado_at);
  const tiempoPromedio = confirmados.length > 0
    ? Math.round(confirmados.reduce((acc, n) => {
        return acc + (new Date(n.confirmado_at!).getTime() - new Date(n.created_at).getTime()) / 1000;
      }, 0) / confirmados.length)
    : 0;
  const tiempoPromedioStr = tiempoPromedio < 60 ? `${tiempoPromedio}s` : `${Math.floor(tiempoPromedio / 60)}m ${tiempoPromedio % 60}s`;

  // Hora peak
  const horaPeak = (() => {
    if (historial.length === 0) return "-";
    const horas: Record<number, number> = {};
    historial.forEach((n) => {
      const h = new Date(n.created_at).getHours();
      horas[h] = (horas[h] || 0) + 1;
    });
    const max = Math.max(...Object.values(horas));
    const peakHour = Object.keys(horas).find((k) => horas[Number(k)] === max);
    return peakHour ? `${peakHour}:00` : "-";
  })();

  const semanaMax = Math.max(...semana.map((d) => d.total), 1);

  // Quién viene hoy: estado de cada niño
  const ahora = new Date();
  const horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();
  const diasSemana = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  const diaHoy = diasSemana[ahora.getDay()];

  const ninosHoy = horarios.map((h) => {
    const [hh, hm] = h.hora_llegada.split(":").map(Number);
    const llegadaMin = hh * 60 + hm;
    const salidaMin = h.hora_salida ? (() => { const [sh, sm] = h.hora_salida!.split(":").map(Number); return sh * 60 + sm; })() : null;

    // Verificar si ya fue registrado hoy
    const registroLlegada = historial.find((n) => n.nombre.toLowerCase() === h.nombre.toLowerCase() && n.tipo === "llegada");
    const registroRetiro = historial.find((n) => n.nombre.toLowerCase() === h.nombre.toLowerCase() && n.tipo === "retiro");

    let estado: "esperado" | "aqui" | "retirado" | "retrasado" = "esperado";
    if (registroRetiro) estado = "retirado";
    else if (registroLlegada) estado = "aqui";
    else if (horaActualMin > llegadaMin + 30) estado = "retrasado";

    return { ...h, llegadaMin, salidaMin, estado, registroLlegada, registroRetiro };
  });

  // Historial filtrado
  const historialFiltrado = historial.filter((n) => {
    if (filtro === "pendientes") return !n.confirmado_at;
    if (filtro === "confirmados") return !!n.confirmado_at;
    if (filtro === "llegadas") return n.tipo === "llegada";
    if (filtro === "retiros") return n.tipo === "retiro";
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Indicador de conexión */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-lg px-3 py-1.5 shadow-lg border border-white/50">
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
              {popup.tia ? `¡${popup.tia} va!` : popup.tipo === "llegada" ? "¡La tía va por él!" : "¡La tía lo lleva al hall!"}
            </p>
            <h2 className="text-4xl font-black text-gray-800 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {popup.nombre}
            </h2>
            <p className="text-sm text-gray-400 mt-3">Confirmado ✅</p>
            <p className="text-[10px] text-gray-300 mt-4">Toca para cerrar</p>
          </div>
        </div>
      )}

      {/* ═══ QUIÉN VIENE HOY ═══ */}
      {horarios.length > 0 && (
        <div className="w-full max-w-md mb-4 rounded-2xl bg-white/70 backdrop-blur-lg p-4 shadow-md border border-white/50">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
            📋 Hoy en Play
          </h2>
          <div className="grid grid-cols-2 gap-1.5">
            {ninosHoy.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl px-3 py-2 text-left transition-all cursor-pointer
                  ${n.estado === "aqui" ? "bg-emerald-50 border border-emerald-200" :
                    n.estado === "retirado" ? "bg-gray-50 border border-gray-200 opacity-50" :
                    n.estado === "retrasado" ? "bg-red-50 border border-red-200" :
                    "bg-white/80 border border-gray-100"}`}
                onClick={() => { setNombre(n.nombre); inputRef.current?.focus(); }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">
                    {n.estado === "aqui" ? "✅" :
                     n.estado === "retirado" ? "👋" :
                     n.estado === "retrasado" ? "⚠️" : "🕐"}
                  </span>
                  <span className="text-xs font-bold text-gray-700 truncate">{n.nombre}</span>
                </div>
                <span className="text-[9px] text-gray-400 block mt-0.5">
                  {n.estado === "aqui" ? "Está aquí" :
                   n.estado === "retirado" ? "Ya se fue" :
                   n.estado === "retrasado" ? `Esperado ${n.hora_llegada}` :
                   `Llega ~${n.hora_llegada}`}
                  {n.hora_salida && n.estado === "aqui" ? ` • Sale ~${n.hora_salida}` : ""}
                </span>
              </div>
            ))}
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

        {/* Botón repetir último */}
        {ultimoEnviado && !nombre.trim() && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { setNombre(ultimoEnviado); enviarDirecto(ultimoEnviado, "retiro"); }}
              disabled={busy}
              className="flex-1 rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5 text-xs font-bold text-orange-600
                         transition-all hover:bg-orange-100 hover:scale-[1.01] active:scale-[0.98]
                         disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <span>🔁</span> {ultimoEnviado} → Retiro
            </button>
            <button
              onClick={() => { setNombre(ultimoEnviado); enviarDirecto(ultimoEnviado, "llegada"); }}
              disabled={busy}
              className="flex-1 rounded-xl bg-purple-50 border border-purple-100 px-3 py-2.5 text-xs font-bold text-purple-600
                         transition-all hover:bg-purple-100 hover:scale-[1.01] active:scale-[0.98]
                         disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <span>🔁</span> {ultimoEnviado} → Llegada
            </button>
          </div>
        )}

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

        {/* Banner instalar PWA */}
        {!isStandalone && (
          <div className="mt-4 rounded-2xl bg-purple-50/80 px-4 py-3 border border-purple-100 text-left">
            <p className="text-[11px] font-bold text-purple-700 mb-1">📲 Tip: Instalar como app</p>
            <p className="text-[10px] text-purple-500 leading-relaxed">
              <span className="font-semibold">iPhone:</span> ⬆ Compartir → Agregar a inicio
              <br/>
              <span className="font-semibold">Android:</span> ⋮ Menú → Instalar app
            </p>
          </div>
        )}
      </div>

      {/* ═══ TABS + CONTENIDO ═══ */}
      {historial.length > 0 && (
        <div className="w-full max-w-md mt-6 animate-slide-up">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button
              onClick={() => setTab("historial")}
              className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all
                ${tab === "historial" ? "bg-white/80 text-gray-700 shadow-sm" : "text-white/50 hover:text-white/80"}`}
            >
              Historial ({historial.length})
            </button>
            <button
              onClick={() => setTab("stats")}
              className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all
                ${tab === "stats" ? "bg-white/80 text-gray-700 shadow-sm" : "text-white/50 hover:text-white/80"}`}
            >
              📊 Stats
            </button>
          </div>

          {/* Tab: Historial */}
          {tab === "historial" && (
            <div className="space-y-2">
              {/* Filtros */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {([
                  { key: "todos", label: "Todos" },
                  { key: "pendientes", label: "⏳ Pendientes" },
                  { key: "confirmados", label: "✅ Listos" },
                  { key: "llegadas", label: "🧸 Llegadas" },
                  { key: "retiros", label: "👋 Retiros" },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all
                      ${filtro === f.key
                        ? "bg-white/90 text-gray-700 shadow-sm"
                        : "bg-white/30 text-white/70 hover:bg-white/50"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {historialFiltrado.length === 0 ? (
                <div className="rounded-2xl bg-white/60 backdrop-blur px-5 py-6 text-center text-sm text-gray-400">
                  Nada por aquí con ese filtro
                </div>
              ) : (
                historialFiltrado.slice(0, 12).map((n, i) => (
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
                      {n.confirmado_at ? "✅" : n.tipo === "llegada" ? "🧸" : "👋"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-700 block truncate">{n.nombre}</span>
                    <span className="text-[10px] font-semibold text-gray-400">
                      {n.tipo === "llegada" ? "Lo dejaron • Tía va por él" : "Lo buscan • Tía lo trae"}
                      {n.confirmado_at && (
                        <span className="text-emerald-500 ml-1">
                          • {n.confirmado_por || "Confirmado"} en {tiempoRespuesta(n.created_at, n.confirmado_at)}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Hora + badge/insistir */}
                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-400 font-semibold block">{formatHora(n.created_at)}</span>
                    {!n.confirmado_at && (
                      <button
                        onClick={(e) => { e.stopPropagation(); insistir(n); }}
                        className={`inline-block mt-0.5 text-[9px] font-bold px-2 py-1 rounded-full transition-all
                          hover:scale-105 active:scale-95
                          ${n.tipo === "llegada"
                            ? "text-purple-600 bg-purple-100 hover:bg-purple-200"
                            : "text-orange-600 bg-orange-100 hover:bg-orange-200"}`}
                      >
                        🔔 Insistir
                      </button>
                    )}
                  </div>
                </div>
              ))
              )}
              {historialFiltrado.length > 12 && (
                <p className="text-center text-xs text-white/40 pt-1 font-medium">
                  +{historialFiltrado.length - 12} más
                </p>
              )}
            </div>
          )}

          {/* Tab: Stats */}
          {tab === "stats" && (
            <div className="space-y-4">
              {/* Resumen del día */}
              <div className="rounded-2xl bg-white/85 backdrop-blur-lg p-5 shadow-md border border-white/50">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Resumen de hoy</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-purple-50 p-3 text-center">
                    <span className="text-2xl font-black text-purple-600 block">{llegadasHoy}</span>
                    <span className="text-[10px] font-bold text-purple-400">Llegadas 🧸</span>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-3 text-center">
                    <span className="text-2xl font-black text-orange-600 block">{retirosHoy}</span>
                    <span className="text-[10px] font-bold text-orange-400">Retiros 👋</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <span className="text-2xl font-black text-emerald-600 block">{tiempoPromedioStr}</span>
                    <span className="text-[10px] font-bold text-emerald-400">Promedio resp.</span>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <span className="text-2xl font-black text-blue-600 block">{horaPeak}</span>
                    <span className="text-[10px] font-bold text-blue-400">Hora peak</span>
                  </div>
                </div>
              </div>

              {/* Gráfico semanal */}
              {semana.length > 0 && (
                <div className="rounded-2xl bg-white/85 backdrop-blur-lg p-5 shadow-md border border-white/50">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Esta semana</h3>
                  <div className="flex items-end justify-between gap-1.5 h-28">
                    {semana.map((d, i) => {
                      const height = semanaMax > 0 ? (d.total / semanaMax) * 100 : 0;
                      const isToday = i === (new Date().getDay() + 6) % 7;
                      return (
                        <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-500">{d.total || ""}</span>
                          <div
                            className={`w-full rounded-lg transition-all ${isToday
                              ? "bg-gradient-to-t from-purple-500 to-pink-400"
                              : "bg-gradient-to-t from-purple-200 to-pink-100"}`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <span className={`text-[9px] font-bold ${isToday ? "text-purple-600" : "text-gray-400"}`}>
                            {d.dia}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
