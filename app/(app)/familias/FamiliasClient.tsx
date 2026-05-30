"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";
import { MIN_COLOR, MIN_LABEL, type AuthorizedPickup, type Child, type Guardian, type Ministerio } from "@/lib/types";

export default function FamiliasClient() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [children, setChildren] = useState<Record<string, Child[]>>({});
  const [pickups, setPickups] = useState<Record<string, AuthorizedPickup[]>>({});
  const [childTab, setChildTab] = useState<Record<string, "info" | "medico" | "autorizados">>({});
  const [g, setG] = useState({ nombre: "", apellido: "", telefono: "", email: "" });

  async function loadGuardians() {
    const { data } = await supabase.from("guardians").select("*").order("apellido");
    setGuardians(data ?? []);
  }
  useEffect(() => { loadGuardians(); }, []);

  async function addGuardian() {
    if (!g.nombre || !g.apellido) return;
    const { error } = await supabase.from("guardians").insert({ nombre: g.nombre, apellido: g.apellido, telefono: g.telefono || null, email: g.email || null });
    if (error) { toast("Error al agregar familia.", "error"); return; }
    setG({ nombre: "", apellido: "", telefono: "", email: "" });
    toast("Familia agregada exitosamente.", "success");
    loadGuardians();
  }

  async function loadChildren(gid: string) {
    const { data } = await supabase.from("guardian_children").select("child:children(*)").eq("guardian_id", gid);
    setChildren((p) => ({ ...p, [gid]: (data ?? []).map((r: any) => r.child).filter(Boolean) }));
  }

  async function loadPickups(childId: string) {
    const { data } = await supabase.from("authorized_pickups").select("*").eq("child_id", childId).eq("activo", true);
    setPickups((p) => ({ ...p, [childId]: data ?? [] }));
  }

  async function expand(gid: string) {
    if (open === gid) return setOpen(null);
    setOpen(gid);
    if (!children[gid]) await loadChildren(gid);
  }


  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Familias</h1>

      <div className="card mb-6 p-5">
        <p className="mb-3 font-medium">Nueva familia</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder="Nombre" value={g.nombre} onChange={(e) => setG({ ...g, nombre: e.target.value })} />
          <input className="field" placeholder="Apellido" value={g.apellido} onChange={(e) => setG({ ...g, apellido: e.target.value })} />
          <input className="field" placeholder="Teléfono" value={g.telefono} onChange={(e) => setG({ ...g, telefono: e.target.value })} />
          <input className="field" placeholder="Email" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} />
        </div>
        <button className="btn-brand mt-3" onClick={addGuardian}>Agregar familia</button>
      </div>

      <div className="space-y-2">
        {guardians.map((gu) => (
          <div key={gu.id} className="card overflow-hidden">
            {/* Fila de la familia */}
            <div className="flex items-center">
              <button onClick={() => expand(gu.id)} className="flex flex-1 items-center gap-3 px-5 py-3 text-left hover:bg-paper">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-medium text-brand-dark">
                  {gu.nombre.charAt(0)}{gu.apellido.charAt(0)}
                </div>
                <span className="flex-1 font-medium">{gu.nombre} {gu.apellido}</span>
                <span className="text-sm text-muted">{gu.telefono}</span>
              </button>
              {/* Botón QR */}
              <button
                onClick={() => setQrOpen(qrOpen === gu.id ? null : gu.id)}
                title="Ver QR familiar"
                aria-label="Ver QR familiar"
                className={`mr-3 flex h-8 w-8 items-center justify-center rounded-xl2 border transition
                  ${qrOpen === gu.id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-muted hover:border-brand hover:text-brand"
                  }`}
              >
                <i className="ti ti-qrcode" style={{ fontSize: 17 }} aria-hidden="true" />
              </button>
            </div>

            {/* Panel QR */}
            {qrOpen === gu.id && (
              <div className="border-t border-line bg-paper/60 px-5 py-4">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="flex flex-col items-center gap-2">
                    <QRCodeDisplay guardianId={gu.id} nombre={gu.nombre} size={160} />
                    <p className="max-w-[160px] text-center text-xs text-muted">
                      Presenta este QR en la entrada del encuentro
                    </p>
                  </div>
                  <div className="flex flex-col justify-center gap-3 pt-1">
                    <div>
                      <p className="font-medium text-ink">
                        QR de {gu.nombre} {gu.apellido}
                      </p>
                      <p className="mt-1 max-w-[220px] text-xs text-muted">
                        Al escanear este código en la estación de check-in, los hijos de esta familia se cargan automáticamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sección expandida de niños */}
            {open === gu.id && (
              <div className="border-t border-line bg-paper/40 px-5 py-4 space-y-3">
                {(children[gu.id] ?? []).map((c) => {
                  const col = MIN_COLOR[c.ministerio];
                  const tab = childTab[c.id] ?? "info";
                  return (
                    <div key={c.id} className="rounded-xl2 border border-line bg-white overflow-hidden">
                      <div className={`flex items-center gap-2 px-4 py-2.5 ${col.bg}`}>
                        <span className={`badge ${col.bg} ${col.text} border border-current text-xs`}>{MIN_LABEL[c.ministerio]}</span>
                        <span className={`font-medium ${col.text}`}>{c.nombre} {c.apellido}</span>
                        <div className="ml-auto flex gap-1">
                          {(["info","medico","autorizados"] as const).map((t) => (
                            <button key={t}
                              onClick={() => { setChildTab((p) => ({ ...p, [c.id]: t })); if (t === "autorizados" && !pickups[c.id]) loadPickups(c.id); }}
                              className={`rounded px-2 py-0.5 text-xs font-medium transition ${tab === t ? "bg-white shadow-sm" : "opacity-60 hover:opacity-100"}`}>
                              {t === "info" ? "Info" : t === "medico" ? "Médico" : "Autorizados"}
                            </button>
                          ))}
                        </div>
                      </div>
                      {tab === "info" && <ChildInfo child={c} onSave={() => loadChildren(gu.id)} />}
                      {tab === "medico" && <ChildMedico child={c} onSave={() => loadChildren(gu.id)} />}
                      {tab === "autorizados" && <ChildAutorizados child={c} pickups={pickups[c.id] ?? []} onSave={() => loadPickups(c.id)} />}
                    </div>
                  );
                })}
                <AddChild guardianId={gu.id} onAdded={() => loadChildren(gu.id)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function ChildInfo({ child, onSave }: { child: Child; onSave: () => void }) {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [v, setV] = useState({ nombre: child.nombre, apellido: child.apellido, fecha_nacimiento: child.fecha_nacimiento ?? "", ministerio: child.ministerio, alergias: child.alergias ?? "" });
  async function save() {
    const { error } = await supabase.from("children").update({ nombre: v.nombre, apellido: v.apellido, fecha_nacimiento: v.fecha_nacimiento || null, ministerio: v.ministerio, alergias: v.alergias || null }).eq("id", child.id);
    error ? toast("Error al guardar.", "error") : toast("Información guardada.", "success");
    onSave();
  }
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      <input className="field" placeholder="Nombre" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} />
      <input className="field" placeholder="Apellido" value={v.apellido} onChange={(e) => setV({ ...v, apellido: e.target.value })} />
      <input className="field" type="date" value={v.fecha_nacimiento} onChange={(e) => setV({ ...v, fecha_nacimiento: e.target.value })} />
      <select className="field" value={v.ministerio} onChange={(e) => setV({ ...v, ministerio: e.target.value as Ministerio })}>
        <option value="kids">Kids</option><option value="tweens">Tweens</option><option value="sensorial">Sensorial</option>
      </select>
      <input className="field col-span-2" placeholder="Alergias" value={v.alergias} onChange={(e) => setV({ ...v, alergias: e.target.value })} />
      <button className="btn-ghost col-span-2" onClick={save}>Guardar cambios</button>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function ChildMedico({ child, onSave }: { child: Child; onSave: () => void }) {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [v, setV] = useState({ condiciones: child.condiciones ?? "", medicamentos: child.medicamentos ?? "", contacto_emergencia_nombre: child.contacto_emergencia_nombre ?? "", contacto_emergencia_telefono: child.contacto_emergencia_telefono ?? "" });
  async function save() {
    const { error } = await supabase.from("children").update({ condiciones: v.condiciones || null, medicamentos: v.medicamentos || null, contacto_emergencia_nombre: v.contacto_emergencia_nombre || null, contacto_emergencia_telefono: v.contacto_emergencia_telefono || null }).eq("id", child.id);
    error ? toast("Error al guardar ficha médica.", "error") : toast("Ficha médica guardada.", "success");
    onSave();
  }
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      <textarea className="field col-span-2 resize-none" rows={2} placeholder="Condiciones médicas" value={v.condiciones} onChange={(e) => setV({ ...v, condiciones: e.target.value })} />
      <textarea className="field col-span-2 resize-none" rows={2} placeholder="Medicamentos" value={v.medicamentos} onChange={(e) => setV({ ...v, medicamentos: e.target.value })} />
      <input className="field" placeholder="Contacto emergencia (nombre)" value={v.contacto_emergencia_nombre} onChange={(e) => setV({ ...v, contacto_emergencia_nombre: e.target.value })} />
      <input className="field" placeholder="Teléfono emergencia" value={v.contacto_emergencia_telefono} onChange={(e) => setV({ ...v, contacto_emergencia_telefono: e.target.value })} />
      <button className="btn-ghost col-span-2" onClick={save}>Guardar ficha médica</button>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function ChildAutorizados({ child, pickups, onSave }: { child: Child; pickups: AuthorizedPickup[]; onSave: () => void }) {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [np, setNp] = useState({ nombre: "", apellido: "", telefono: "", parentesco: "" });
  async function add() {
    if (!np.nombre || !np.apellido) return;
    const { error } = await supabase.from("authorized_pickups").insert({ child_id: child.id, nombre: np.nombre, apellido: np.apellido, telefono: np.telefono || null, parentesco: np.parentesco || null });
    if (error) { toast("Error al agregar autorizado.", "error"); return; }
    setNp({ nombre: "", apellido: "", telefono: "", parentesco: "" });
    toast("Autorizado agregado exitosamente.", "success");
    onSave();
  }
  async function remove(id: string) {
    await supabase.from("authorized_pickups").update({ activo: false }).eq("id", id);
    toast("Autorizado eliminado.", "warning");
    onSave();
  }
  return (
    <div className="p-4 space-y-3">
      <div className="space-y-1.5">
        {pickups.length === 0 && <p className="text-sm text-muted">Sin autorizados adicionales.</p>}
        {pickups.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl2 bg-paper px-3 py-2 text-sm">
            <span className="font-medium">{p.nombre} {p.apellido}</span>
            {p.parentesco && <span className="text-muted">· {p.parentesco}</span>}
            {p.telefono && <span className="text-muted ml-auto">{p.telefono}</span>}
            <button onClick={() => remove(p.id)} className="ml-2 text-brand-dark hover:text-brand text-xs">✕</button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
        <input className="field" placeholder="Nombre" value={np.nombre} onChange={(e) => setNp({ ...np, nombre: e.target.value })} />
        <input className="field" placeholder="Apellido" value={np.apellido} onChange={(e) => setNp({ ...np, apellido: e.target.value })} />
        <input className="field" placeholder="Teléfono" value={np.telefono} onChange={(e) => setNp({ ...np, telefono: e.target.value })} />
        <input className="field" placeholder="Parentesco (ej. abuela)" value={np.parentesco} onChange={(e) => setNp({ ...np, parentesco: e.target.value })} />
        <button className="btn-ghost col-span-2" onClick={add}>Agregar autorizado</button>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function AddChild({ guardianId, onAdded }: { guardianId: string; onAdded: () => void }) {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [show, setShow] = useState(false);
  const [c, setC] = useState({ nombre: "", apellido: "", fecha_nacimiento: "", ministerio: "kids" as Ministerio, alergias: "" });
  async function add() {
    if (!c.nombre || !c.apellido) return;
    const { data: child, error } = await supabase.from("children").insert({ nombre: c.nombre, apellido: c.apellido, fecha_nacimiento: c.fecha_nacimiento || null, ministerio: c.ministerio, alergias: c.alergias || null }).select().single();
    if (error || !child) { toast("Error al guardar niño.", "error"); return; }
    await supabase.from("guardian_children").insert({ guardian_id: guardianId, child_id: child.id, es_principal: true });
    setC({ nombre: "", apellido: "", fecha_nacimiento: "", ministerio: "kids", alergias: "" });
    setShow(false);
    toast("Niño agregado exitosamente.", "success");
    onAdded();
  }
  if (!show) return <button className="btn-ghost w-full" onClick={() => setShow(true)}>Agregar niño</button>;
  return (
    <div className="rounded-xl2 border border-line bg-white p-4 grid grid-cols-2 gap-2">
      <input className="field" placeholder="Nombre" value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} />
      <input className="field" placeholder="Apellido" value={c.apellido} onChange={(e) => setC({ ...c, apellido: e.target.value })} />
      <input className="field" type="date" value={c.fecha_nacimiento} onChange={(e) => setC({ ...c, fecha_nacimiento: e.target.value })} />
      <select className="field" value={c.ministerio} onChange={(e) => setC({ ...c, ministerio: e.target.value as Ministerio })}>
        <option value="kids">Kids</option><option value="tweens">Tweens</option><option value="sensorial">Sensorial</option>
      </select>
      <input className="field col-span-2" placeholder="Alergias" value={c.alergias} onChange={(e) => setC({ ...c, alergias: e.target.value })} />
      <div className="col-span-2 flex gap-2">
        <button className="btn-brand flex-1" onClick={add}>Guardar niño</button>
        <button className="btn-ghost" onClick={() => setShow(false)}>Cancelar</button>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
