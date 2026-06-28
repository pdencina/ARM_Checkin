"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_COLOR, MIN_LABEL, type Ministerio } from "@/lib/types";

type Tab = "asistencia" | "primeravez" | "ausentes" | "cumpleanos";

export default function ReportesClient() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("asistencia");
  const [loading, setLoading] = useState(false);

  // --- Asistencia ---
  const [servicios, setServicios] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [asistencia, setAsistencia] = useState<any[]>([]);

  // --- Primera vez ---
  const [primeraVez, setPrimeraVez] = useState<any[]>([]);

  // --- Ausentes ---
  const [ausentes, setAusentes] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(3);

  // --- Cumpleaños ---
  const [cumpleanos, setCumpleanos] = useState<any[]>([]);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    supabase.from("services").select("id, nombre, fecha, campus").order("fecha", { ascending: false }).limit(20)
      .then(({ data }: any) => { setServicios(data ?? []); if (data?.length) setServiceId(data[0].id); });
  }, []);

  useEffect(() => { if (tab === "asistencia" && serviceId) loadAsistencia(); }, [serviceId, tab]);
  useEffect(() => { if (tab === "primeravez") loadPrimeraVez(); }, [tab]);
  useEffect(() => { if (tab === "ausentes") loadAusentes(); }, [tab, threshold]);
  useEffect(() => { if (tab === "cumpleanos") loadCumpleanos(); }, [tab, mesFiltro]);

  async function loadAsistencia() {
    setLoading(true);
    const { data } = await supabase.from("checkins")
      .select("id, codigo_seguridad, primera_vez, checkin_at, checkout_at, estado, checkout_nombre, child:children(nombre, apellido, ministerio, alergias), guardian:guardians!checkin_guardian_id(nombre, apellido, telefono)")
      .eq("service_id", serviceId).order("checkin_at");
    setAsistencia(data ?? []);
    setLoading(false);
  }

  async function loadPrimeraVez() {
    setLoading(true);
    const { data } = await supabase.from("checkins")
      .select("id, checkin_at, child:children(nombre, apellido, ministerio, fecha_nacimiento), guardian:guardians!checkin_guardian_id(nombre, apellido, telefono), service:services(nombre, fecha)")
      .eq("primera_vez", true).order("checkin_at", { ascending: false }).limit(50);
    setPrimeraVez(data ?? []);
    setLoading(false);
  }

  async function loadAusentes() {
    setLoading(true);
    const { data: svcs } = await supabase.from("services").select("fecha").order("fecha", { ascending: false }).limit(threshold);
    const cutoff = svcs?.[svcs.length - 1]?.fecha;
    const { data: allChildren } = await supabase.from("children").select("id, nombre, apellido, ministerio, fecha_nacimiento").eq("activo", true);
    if (!cutoff) { setAusentes(allChildren ?? []); setLoading(false); return; }
    const { data: recent } = await supabase.from("checkins").select("child_id").gte("checkin_at", cutoff + "T00:00:00");
    const presenteIds = new Set((recent ?? []).map((c: any) => c.child_id));
    setAusentes((allChildren ?? []).filter((c: any) => !presenteIds.has(c.id)));
    setLoading(false);
  }

  async function loadCumpleanos() {
    setLoading(true);
    const { data } = await supabase.from("children").select("nombre, apellido, fecha_nacimiento, ministerio").eq("activo", true).not("fecha_nacimiento", "is", null);
    const filtered = (data ?? []).filter((c: any) => parseInt(c.fecha_nacimiento?.slice(5, 7) ?? "0") === mesFiltro)
      .sort((a: any, b: any) => parseInt(a.fecha_nacimiento?.slice(8, 10)) - parseInt(b.fecha_nacimiento?.slice(8, 10)));
    setCumpleanos(filtered);
    setLoading(false);
  }

  function exportCSV(rows: any[], cols: { key: string; label: string }[], filename: string) {
    const header = cols.map((c) => c.label).join(",");
    const body = rows.map((r) => cols.map((c) => `"${(c.key.split(".").reduce((o, k) => o?.[k], r) ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "asistencia", label: "Asistencia", icon: "📋" },
    { key: "primeravez", label: "Primera vez", icon: "⭐" },
    { key: "ausentes", label: "Ausentes", icon: "⚠️" },
    { key: "cumpleanos", label: "Cumpleaños", icon: "🎂" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold">Reportes</h1>
      <p className="mb-5 text-muted">Consulta y exporta datos del ministerio.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? "btn-brand" : "btn-ghost"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ASISTENCIA */}
      {tab === "asistencia" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-sm font-medium">Servicio</label>
              <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.fecha} {s.campus !== "Principal" ? `· ${s.campus}` : ""}</option>)}
              </select>
            </div>
            <button className="btn-ghost" onClick={() => exportCSV(asistencia,
              [{ key: "child.nombre", label: "Nombre" }, { key: "child.apellido", label: "Apellido" }, { key: "child.ministerio", label: "Ministerio" }, { key: "guardian.nombre", label: "Tutor" }, { key: "guardian.telefono", label: "Teléfono" }, { key: "primera_vez", label: "Primera vez" }, { key: "estado", label: "Estado" }, { key: "checkin_at", label: "Ingreso" }, { key: "checkout_at", label: "Retiro" }],
              `asistencia-${serviceId}.csv`)}>
              ⬇ Exportar CSV
            </button>
          </div>

          <div className="flex gap-4 text-sm text-muted">
            <span>Total: <b className="text-ink">{asistencia.length}</b></span>
            {(["kids","tweens","sensorial"] as Ministerio[]).map((m) => {
              const n = asistencia.filter((c) => c.child?.ministerio === m).length;
              const col = MIN_COLOR[m];
              return <span key={m} className={`${col.text}`}>{MIN_LABEL[m]}: <b>{n}</b></span>;
            })}
            <span className="text-brand-dark">⭐ Primera vez: <b className="text-ink">{asistencia.filter((c) => c.primera_vez).length}</b></span>
          </div>

          {loading ? <p className="text-muted">Cargando…</p> : (
            <div className="card overflow-hidden">
              {asistencia.length === 0 ? <p className="px-5 py-8 text-center text-muted">Sin registros para este servicio.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-line text-left text-muted">
                    <th className="px-4 py-2">Niño</th><th className="px-3 py-2">Ministerio</th><th className="px-3 py-2">Tutor</th><th className="px-3 py-2">Estado</th>
                  </tr></thead>
                  <tbody>
                    {asistencia.map((c) => {
                      const col = c.child?.ministerio ? MIN_COLOR[c.child.ministerio as Ministerio] : null;
                      return (
                        <tr key={c.id} className="border-t border-line hover:bg-paper">
                          <td className="px-4 py-2 font-medium">
                            {c.primera_vez && <span className="mr-1 text-xs text-brand-dark">⭐</span>}
                            {c.child?.nombre} {c.child?.apellido}
                          </td>
                          <td className="px-3 py-2">
                            {col && <span className={`badge ${col.bg} ${col.text} text-xs`}>{MIN_LABEL[c.child.ministerio as Ministerio]}</span>}
                          </td>
                          <td className="px-3 py-2 text-muted">{c.guardian?.nombre} {c.guardian?.apellido}</td>
                          <td className="px-3 py-2">
                            <span className={`badge text-xs ${c.estado === "checked_in" ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"}`}>
                              {c.estado === "checked_in" ? "En sala" : "Retirado"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* PRIMERA VEZ */}
      {tab === "primeravez" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted text-sm">{primeraVez.length} visitas de primera vez registradas</p>
            <button className="btn-ghost" onClick={() => exportCSV(primeraVez,
              [{ key: "child.nombre", label: "Nombre" }, { key: "child.apellido", label: "Apellido" }, { key: "child.ministerio", label: "Ministerio" }, { key: "guardian.nombre", label: "Tutor" }, { key: "guardian.telefono", label: "Teléfono" }, { key: "service.nombre", label: "Encuentro" }, { key: "checkin_at", label: "Fecha" }],
              "primera-vez.csv")}>⬇ Exportar CSV</button>
          </div>
          {loading ? <p className="text-muted">Cargando…</p> : (
            <div className="card overflow-hidden">
              {primeraVez.length === 0 ? <p className="px-5 py-8 text-center text-muted">Sin registros.</p> : (
                <ul className="divide-y divide-line">
                  {primeraVez.map((c) => {
                    const col = c.child?.ministerio ? MIN_COLOR[c.child.ministerio as Ministerio] : null;
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        {col && <span className={`badge ${col.bg} ${col.text} text-xs`}>{MIN_LABEL[c.child.ministerio as Ministerio]}</span>}
                        <div className="flex-1">
                          <p className="font-medium">{c.child?.nombre} {c.child?.apellido}</p>
                          <p className="text-xs text-muted">Tutor: {c.guardian?.nombre} {c.guardian?.apellido} {c.guardian?.telefono && `· ${c.guardian.telefono}`}</p>
                        </div>
                        <div className="text-right text-xs text-muted">
                          <p>{c.service?.nombre}</p>
                          <p>{new Date(c.checkin_at).toLocaleDateString("es-CL")}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* AUSENTES */}
      {tab === "ausentes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium">Sin asistir en los últimos</label>
            <select className="field max-w-[100px]" value={threshold} onChange={(e) => setThreshold(+e.target.value)}>
              {[2,3,4,6,8].map((n) => <option key={n} value={n}>{n} servicios</option>)}
            </select>
            <span className="text-muted text-sm">→ {ausentes.length} niños</span>
            <button className="btn-ghost ml-auto" onClick={() => exportCSV(ausentes,
              [{ key: "nombre", label: "Nombre" }, { key: "apellido", label: "Apellido" }, { key: "ministerio", label: "Ministerio" }],
              "ausentes.csv")}>⬇ Exportar CSV</button>
          </div>
          {loading ? <p className="text-muted">Cargando…</p> : (
            <div className="card overflow-hidden">
              {ausentes.length === 0 ? <p className="px-5 py-8 text-center text-muted">Todos asistiendo regularmente. 🎉</p> : (
                <ul className="divide-y divide-line">
                  {ausentes.map((c: any) => {
                    const col = MIN_COLOR[c.ministerio as Ministerio];
                    return (
                      <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={`badge ${col.bg} ${col.text} text-xs`}>{MIN_LABEL[c.ministerio as Ministerio]}</span>
                        <span className="font-medium">{c.nombre} {c.apellido}</span>
                        {c.fecha_nacimiento && <span className="text-xs text-muted ml-auto">{new Date(c.fecha_nacimiento).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* CUMPLEAÑOS */}
      {tab === "cumpleanos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select className="field max-w-[180px]" value={mesFiltro} onChange={(e) => setMesFiltro(+e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleDateString("es-CL", { month: "long" })}</option>
              ))}
            </select>
            <span className="text-muted text-sm">→ {cumpleanos.length} niños cumplen años</span>
            <button className="btn-ghost ml-auto" onClick={() => exportCSV(cumpleanos,
              [{ key: "nombre", label: "Nombre" }, { key: "apellido", label: "Apellido" }, { key: "ministerio", label: "Ministerio" }, { key: "fecha_nacimiento", label: "Cumpleaños" }],
              "cumpleanos.csv")}>⬇ Exportar CSV</button>
          </div>
          {loading ? <p className="text-muted">Cargando…</p> : (
            <div className="card overflow-hidden">
              {cumpleanos.length === 0 ? <p className="px-5 py-8 text-center text-muted">Sin cumpleaños ese mes.</p> : (
                <ul className="divide-y divide-line">
                  {cumpleanos.map((c: any, i: number) => {
                    const col = MIN_COLOR[c.ministerio as Ministerio];
                    const dia = c.fecha_nacimiento?.slice(8, 10);
                    const year = new Date().getFullYear();
                    const bday = new Date(c.fecha_nacimiento);
                    const age = year - bday.getFullYear();
                    return (
                      <li key={i} className="flex items-center gap-3 px-5 py-3">
                        <span className={`badge ${col.bg} ${col.text} font-mono`}>{dia}</span>
                        <span className="font-medium">{c.nombre} {c.apellido}</span>
                        <span className={`badge ${col.bg} ${col.text} text-xs ml-auto`}>{MIN_LABEL[c.ministerio as Ministerio]}</span>
                        <span className="text-xs text-muted">{age} años</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
