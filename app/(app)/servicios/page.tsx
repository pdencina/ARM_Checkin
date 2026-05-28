"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/types";

export default function ServiciosPage() {
  const supabase = createClient();
  const [list, setList] = useState<Service[]>([]);
  const [s, setS] = useState({ nombre: "", fecha: "", hora: "" });

  async function load() {
    const { data } = await supabase.from("services").select("*").order("fecha", { ascending: false });
    setList(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!s.nombre || !s.fecha) return;
    await supabase.from("services").insert({
      nombre: s.nombre,
      fecha: s.fecha,
      hora: s.hora || null,
    });
    setS({ nombre: "", fecha: "", hora: "" });
    load();
  }

  async function toggle(svc: Service) {
    await supabase.from("services").update({ activo: !svc.activo }).eq("id", svc.id);
    load();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Servicios</h1>

      <div className="card mb-6 p-5">
        <p className="mb-3 font-medium">Nuevo servicio</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="field col-span-2" placeholder="Nombre (ej. Culto Domingo AM)" value={s.nombre} onChange={(e) => setS({ ...s, nombre: e.target.value })} />
          <input className="field" type="date" value={s.fecha} onChange={(e) => setS({ ...s, fecha: e.target.value })} />
          <input className="field" type="time" value={s.hora} onChange={(e) => setS({ ...s, hora: e.target.value })} />
        </div>
        <button className="btn-brand mt-3" onClick={add}>
          Crear servicio
        </button>
      </div>

      <div className="space-y-2">
        {list.map((svc) => (
          <div key={svc.id} className="card flex items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <p className="font-medium">{svc.nombre}</p>
              <p className="text-sm text-muted">
                {svc.fecha} {svc.hora && `· ${svc.hora}`}
              </p>
            </div>
            <button
              onClick={() => toggle(svc)}
              className={`badge ${svc.activo ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"}`}
            >
              {svc.activo ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
