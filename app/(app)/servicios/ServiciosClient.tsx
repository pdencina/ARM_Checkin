"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";
import type { Service } from "@/lib/types";

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

export default function ServiciosClient() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [list, setList] = useState<Service[]>([]);
  const [s, setS] = useState({ nombre: "", fecha: "", hora: "", campus: "Principal", es_recurrente: false, dia_semana: 0 });

  async function load() {
    const { data } = await supabase.from("services").select("*").order("fecha", { ascending: false });
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!s.nombre || !s.fecha) return;
    await supabase.from("services").insert({
      nombre: s.nombre, fecha: s.fecha, hora: s.hora || null,
      campus: s.campus || "Principal",
      es_recurrente: s.es_recurrente, dia_semana: s.es_recurrente ? s.dia_semana : null,
    });
    setS({ nombre: "", fecha: "", hora: "", campus: "Principal", es_recurrente: false, dia_semana: 0 });
    toast("Servicio creado exitosamente.", "success");
    load();
  }

  async function toggle(svc: Service) {
    await supabase.from("services").update({ activo: !svc.activo }).eq("id", svc.id);
    toast(svc.activo ? "Servicio desactivado." : "Servicio activado.", svc.activo ? "warning" : "success");
    load();
  }

  async function crearProximo(svc: Service) {
    if (svc.dia_semana === null) return;
    const base = new Date(svc.fecha + "T12:00:00");
    const diff = (svc.dia_semana - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + diff);
    const proxFecha = base.toISOString().slice(0, 10);
    const existe = list.find((x) => x.fecha === proxFecha && x.nombre === svc.nombre);
    if (existe) { toast("Ya existe un servicio con ese nombre y fecha.", "warning"); return; }
    await supabase.from("services").insert({
      nombre: svc.nombre, fecha: proxFecha, hora: svc.hora_default ?? svc.hora,
      campus: svc.campus, es_recurrente: true, dia_semana: svc.dia_semana,
    });
    toast("Próximo servicio creado.", "success");
    load();
  }

  const campuses = Array.from(new Set(list.map((x) => x.campus).filter(Boolean)));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Servicios</h1>

      <div className="card mb-6 p-5">
        <p className="mb-3 font-medium">Nuevo servicio</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="field col-span-2" placeholder="Nombre (ej. Culto Domingo AM)" value={s.nombre} onChange={(e) => setS({ ...s, nombre: e.target.value })} />
          <input className="field" type="date" value={s.fecha} onChange={(e) => setS({ ...s, fecha: e.target.value })} />
          <input className="field" type="time" value={s.hora} onChange={(e) => setS({ ...s, hora: e.target.value })} />
          <input className="field col-span-2" list="campuses-list" placeholder="Campus (ej. Principal, Sur, Norte)" value={s.campus} onChange={(e) => setS({ ...s, campus: e.target.value })} />
          <datalist id="campuses-list">{campuses.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.es_recurrente} onChange={(e) => setS({ ...s, es_recurrente: e.target.checked })} className="h-4 w-4 accent-brand" />
          Servicio recurrente (permite crear próximas fechas con un clic)
        </label>
        {s.es_recurrente && (
          <div className="mt-2">
            <label className="mb-1 block text-sm text-muted">Día de la semana</label>
            <div className="flex gap-1">
              {DIAS.map((d, i) => (
                <button key={i} onClick={() => setS({ ...s, dia_semana: i })}
                  className={`flex-1 rounded-xl2 py-1.5 text-xs font-medium transition ${s.dia_semana === i ? "bg-brand text-white" : "bg-paper text-muted hover:bg-line"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="btn-brand mt-3" onClick={add}>Crear servicio</button>
      </div>

      <div className="space-y-2">
        {list.map((svc) => (
          <div key={svc.id} className="card flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{svc.nombre}</p>
                {svc.es_recurrente && <span className="badge bg-paper text-muted text-xs">🔁 {DIAS[svc.dia_semana ?? 0]}</span>}
              </div>
              <p className="text-sm text-muted">
                {svc.fecha} {svc.hora && `· ${svc.hora}`} {svc.campus !== "Principal" && `· ${svc.campus}`}
              </p>
            </div>
            {svc.es_recurrente && svc.activo && (
              <button onClick={() => crearProximo(svc)} className="btn-ghost text-xs py-1.5">
                + Próximo {DIAS[svc.dia_semana ?? 0]}
              </button>
            )}
            <button onClick={() => toggle(svc)}
              className={`badge ${svc.activo ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"}`}>
              {svc.activo ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
