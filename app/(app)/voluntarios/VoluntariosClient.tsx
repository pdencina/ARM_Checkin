"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_COLOR, MIN_LABEL, type Ministerio, type Service, type Volunteer, type ServiceVolunteer } from "@/lib/types";

const AREAS: Ministerio[] = ["kids", "tweens", "sensorial"];

export default function VoluntariosClient() {
  const supabase = createClient();
  const [tab, setTab] = useState<"directorio" | "servicio">("directorio");
  const [vols, setVols] = useState<Volunteer[]>([]);
  const [svols, setSvols] = useState<(ServiceVolunteer & { volunteer: Volunteer })[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [nv, setNv] = useState({ nombre: "", apellido: "", telefono: "", email: "", notas: "", areas: [] as string[] });
  const [adding, setAdding] = useState<{ ministerio: Ministerio; volId: string; rol: "lider" | "servidor" } | null>(null);

  async function loadVols() {
    const { data } = await supabase.from("volunteers").select("*").order("apellido");
    setVols(data ?? []);
  }
  async function loadServices() {
    const { data } = await supabase.from("services").select("*").order("fecha", { ascending: false }).limit(10);
    setServices(data ?? []);
    if (data?.length && !serviceId) setServiceId(data[0].id);
  }
  async function loadSvols(sid: string) {
    if (!sid) return;
    const { data } = await supabase
      .from("service_volunteers")
      .select("*, volunteer:volunteers(*)")
      .eq("service_id", sid)
      .order("ministerio");
    setSvols((data as any) ?? []);
  }

  useEffect(() => { loadVols(); loadServices(); }, []);
  useEffect(() => { if (serviceId) loadSvols(serviceId); }, [serviceId]);

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(null), 2000); }

  async function saveVol() {
    if (!nv.nombre || !nv.apellido) return;
    const { error } = await supabase.from("volunteers").insert({
      nombre: nv.nombre, apellido: nv.apellido,
      telefono: nv.telefono || null, email: nv.email || null,
      notas: nv.notas || null, areas: nv.areas,
    });
    if (error) return flash("Error: " + error.message);
    setNv({ nombre: "", apellido: "", telefono: "", email: "", notas: "", areas: [] });
    flash("Voluntario agregado ✓");
    loadVols();
  }

  async function toggleArea(a: string) {
    setNv((p) => ({ ...p, areas: p.areas.includes(a) ? p.areas.filter((x) => x !== a) : [...p.areas, a] }));
  }

  async function toggleVolActivo(v: Volunteer) {
    await supabase.from("volunteers").update({ activo: !v.activo }).eq("id", v.id);
    loadVols();
  }

  async function assignVol() {
    if (!adding || !serviceId) return;
    const { error } = await supabase.from("service_volunteers").upsert({
      service_id: serviceId, volunteer_id: adding.volId,
      ministerio: adding.ministerio, rol: adding.rol, estado: "confirmado",
    }, { onConflict: "service_id,volunteer_id,ministerio" });
    if (error) { flash("Error: " + error.message); return; }
    setAdding(null);
    flash("Voluntario asignado ✓");
    loadSvols(serviceId);
  }

  async function updateEstado(id: string, estado: "pendiente" | "confirmado" | "ausente") {
    await supabase.from("service_volunteers").update({ estado }).eq("id", id);
    loadSvols(serviceId);
  }

  async function removeSvol(id: string) {
    await supabase.from("service_volunteers").delete().eq("id", id);
    flash("Eliminado ✓");
    loadSvols(serviceId);
  }

  const svolsByMin = (m: Ministerio) => svols.filter((v) => v.ministerio === m);
  const availableFor = (m: Ministerio) => vols.filter((v) => v.activo && v.areas.includes(m) && !svols.find((sv) => sv.volunteer_id === v.id && sv.ministerio === m));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Voluntarios</h1>
      <p className="mb-5 text-muted">Gestiona tu equipo de servidores y asígnalos a cada servicio.</p>

      <div className="mb-5 flex gap-2">
        {(["directorio", "servicio"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? "btn-brand" : "btn-ghost"}`}>
            {t === "directorio" ? "Directorio" : "Por servicio"}
          </button>
        ))}
      </div>

      {tab === "directorio" && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="mb-3 font-medium">Agregar voluntario</p>
            <div className="grid grid-cols-2 gap-2">
              <input className="field" placeholder="Nombre" value={nv.nombre} onChange={(e) => setNv({ ...nv, nombre: e.target.value })} />
              <input className="field" placeholder="Apellido" value={nv.apellido} onChange={(e) => setNv({ ...nv, apellido: e.target.value })} />
              <input className="field" placeholder="Teléfono" value={nv.telefono} onChange={(e) => setNv({ ...nv, telefono: e.target.value })} />
              <input className="field" placeholder="Email" value={nv.email} onChange={(e) => setNv({ ...nv, email: e.target.value })} />
              <input className="field col-span-2" placeholder="Notas (opcional)" value={nv.notas} onChange={(e) => setNv({ ...nv, notas: e.target.value })} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-sm font-medium">Áreas:</p>
              {AREAS.map((a) => {
                const col = MIN_COLOR[a];
                const on = nv.areas.includes(a);
                return (
                  <button key={a} onClick={() => toggleArea(a)}
                    className={`badge transition ${on ? `${col.bg} ${col.text}` : "bg-line text-muted"}`}>
                    {MIN_LABEL[a]}
                  </button>
                );
              })}
            </div>
            <button className="btn-brand mt-3" onClick={saveVol}>Guardar</button>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3 font-medium">
              {vols.length} voluntario{vols.length !== 1 ? "s" : ""}
            </div>
            {vols.length === 0 && <p className="px-5 py-8 text-center text-muted">Sin voluntarios aún.</p>}
            <ul className="divide-y divide-line">
              {vols.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{v.nombre} {v.apellido}</p>
                    <p className="text-sm text-muted">{v.telefono}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {v.areas.map((a) => {
                      const col = MIN_COLOR[a as Ministerio];
                      return col ? <span key={a} className={`badge ${col.bg} ${col.text} text-xs`}>{MIN_LABEL[a as Ministerio]}</span> : null;
                    })}
                  </div>
                  <button onClick={() => toggleVolActivo(v)}
                    className={`badge ${v.activo ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"}`}>
                    {v.activo ? "Activo" : "Inactivo"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "servicio" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Servicio</label>
            <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} · {s.fecha}</option>
              ))}
            </select>
          </div>

          {AREAS.map((m) => {
            const col = MIN_COLOR[m];
            const list = svolsByMin(m);
            const available = availableFor(m);
            return (
              <div key={m} className="card overflow-hidden">
                <div className={`flex items-center justify-between border-b border-line px-5 py-3`}>
                  <span className={`badge ${col.bg} ${col.text} font-medium`}>{MIN_LABEL[m]}</span>
                  <span className="text-sm text-muted">{list.filter((v) => v.estado === "confirmado").length} confirmados</span>
                </div>

                {list.length === 0 && <p className="px-5 py-3 text-sm text-muted">Sin asignaciones para esta área.</p>}
                <ul className="divide-y divide-line">
                  {list.map((sv) => (
                    <li key={sv.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{sv.volunteer?.nombre} {sv.volunteer?.apellido}</p>
                        <p className="text-xs text-muted capitalize">{sv.rol}</p>
                      </div>
                      <select
                        className="field max-w-[130px] text-sm py-1.5"
                        value={sv.estado}
                        onChange={(e) => updateEstado(sv.id, e.target.value as any)}>
                        <option value="confirmado">Confirmado</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="ausente">Ausente</option>
                      </select>
                      <button onClick={() => removeSvol(sv.id)} className="text-sm text-muted hover:text-brand-dark">✕</button>
                    </li>
                  ))}
                </ul>

                {adding?.ministerio === m ? (
                  <div className="flex gap-2 border-t border-line p-4">
                    <select className="field flex-1" value={adding.volId} onChange={(e) => setAdding({ ...adding, volId: e.target.value })}>
                      <option value="">Seleccionar voluntario…</option>
                      {available.map((v) => <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>)}
                    </select>
                    <select className="field max-w-[110px]" value={adding.rol} onChange={(e) => setAdding({ ...adding, rol: e.target.value as any })}>
                      <option value="servidor">Servidor</option>
                      <option value="lider">Líder</option>
                    </select>
                    <button className="btn-brand" onClick={assignVol} disabled={!adding.volId}>Asignar</button>
                    <button className="btn-ghost" onClick={() => setAdding(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button
                    className="flex w-full items-center gap-2 border-t border-line px-5 py-3 text-sm text-muted hover:bg-paper"
                    onClick={() => setAdding({ ministerio: m, volId: "", rol: "servidor" })}>
                    + Agregar voluntario a {MIN_LABEL[m]}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {msg && (
        <p className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl2 bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {msg}
        </p>
      )}
    </div>
  );
}
