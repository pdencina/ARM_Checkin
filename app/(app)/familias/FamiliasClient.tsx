"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_LABEL, type Child, type Guardian, type Ministerio } from "@/lib/types";

export default function FamiliasClient() {
  const supabase = createClient();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [children, setChildren] = useState<Record<string, Child[]>>({});

  const [g, setG] = useState({ nombre: "", apellido: "", telefono: "", email: "" });

  async function loadGuardians() {
    const { data } = await supabase.from("guardians").select("*").order("apellido");
    setGuardians(data ?? []);
  }
  useEffect(() => {
    loadGuardians();
  }, []);

  async function addGuardian() {
    if (!g.nombre || !g.apellido) return;
    await supabase.from("guardians").insert({
      nombre: g.nombre,
      apellido: g.apellido,
      telefono: g.telefono || null,
      email: g.email || null,
    });
    setG({ nombre: "", apellido: "", telefono: "", email: "" });
    loadGuardians();
  }

  async function loadChildren(gid: string) {
    const { data } = await supabase
      .from("guardian_children")
      .select("child:children(*)")
      .eq("guardian_id", gid);
    setChildren((p) => ({ ...p, [gid]: (data ?? []).map((r: any) => r.child).filter(Boolean) }));
  }

  function expand(gid: string) {
    if (open === gid) return setOpen(null);
    setOpen(gid);
    if (!children[gid]) loadChildren(gid);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Familias</h1>

      <div className="card mb-6 p-5">
        <p className="mb-3 font-medium">Nueva familia (tutor)</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder="Nombre" value={g.nombre} onChange={(e) => setG({ ...g, nombre: e.target.value })} />
          <input className="field" placeholder="Apellido" value={g.apellido} onChange={(e) => setG({ ...g, apellido: e.target.value })} />
          <input className="field" placeholder="Teléfono" value={g.telefono} onChange={(e) => setG({ ...g, telefono: e.target.value })} />
          <input className="field" placeholder="Email (opcional)" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} />
        </div>
        <button className="btn-brand mt-3" onClick={addGuardian}>
          Agregar familia
        </button>
      </div>

      <div className="space-y-2">
        {guardians.map((gu) => (
          <div key={gu.id} className="card overflow-hidden">
            <button onClick={() => expand(gu.id)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-paper">
              <span className="font-medium">
                {gu.nombre} {gu.apellido}
              </span>
              <span className="text-sm text-muted">{gu.telefono}</span>
            </button>
            {open === gu.id && (
              <div className="border-t border-line bg-paper/40 px-5 py-4">
                <ChildList childrenList={children[gu.id] ?? []} />
                <AddChild
                  guardianId={gu.id}
                  onAdded={() => loadChildren(gu.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChildList({ childrenList }: { childrenList: Child[] }) {
  if (childrenList.length === 0) return <p className="mb-3 text-sm text-muted">Sin niños aún.</p>;
  return (
    <div className="mb-3 space-y-1">
      {childrenList.map((c) => (
        <div key={c.id} className="flex items-center gap-2 text-sm">
          <span className={`badge ${c.ministerio === "kids" ? "bg-kids-soft text-kids-ink" : "bg-tweens-soft text-tweens-ink"}`}>
            {MIN_LABEL[c.ministerio]}
          </span>
          <span className="font-medium">
            {c.nombre} {c.apellido}
          </span>
          {c.alergias && <span className="text-red-700">⚠️ {c.alergias}</span>}
        </div>
      ))}
    </div>
  );
}

function AddChild({ guardianId, onAdded }: { guardianId: string; onAdded: () => void }) {
  const supabase = createClient();
  const [c, setC] = useState({
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    ministerio: "kids" as Ministerio,
    alergias: "",
  });

  async function add() {
    if (!c.nombre || !c.apellido) return;
    const { data: child, error } = await supabase
      .from("children")
      .insert({
        nombre: c.nombre,
        apellido: c.apellido,
        fecha_nacimiento: c.fecha_nacimiento || null,
        ministerio: c.ministerio,
        alergias: c.alergias || null,
      })
      .select()
      .single();
    if (error || !child) return;
    await supabase.from("guardian_children").insert({
      guardian_id: guardianId,
      child_id: child.id,
      es_principal: true,
    });
    setC({ nombre: "", apellido: "", fecha_nacimiento: "", ministerio: "kids", alergias: "" });
    onAdded();
  }

  return (
    <div className="rounded-xl2 border border-line bg-white p-3">
      <p className="mb-2 text-sm font-medium">Agregar niño</p>
      <div className="grid grid-cols-2 gap-2">
        <input className="field" placeholder="Nombre" value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} />
        <input className="field" placeholder="Apellido" value={c.apellido} onChange={(e) => setC({ ...c, apellido: e.target.value })} />
        <input className="field" type="date" value={c.fecha_nacimiento} onChange={(e) => setC({ ...c, fecha_nacimiento: e.target.value })} />
        <select className="field" value={c.ministerio} onChange={(e) => setC({ ...c, ministerio: e.target.value as Ministerio })}>
          <option value="kids">Kids</option>
          <option value="tweens">Tweens</option>
        </select>
        <input className="field col-span-2" placeholder="Alergias (opcional)" value={c.alergias} onChange={(e) => setC({ ...c, alergias: e.target.value })} />
      </div>
      <button className="btn-ghost mt-2" onClick={add}>
        Guardar niño
      </button>
    </div>
  );
}
