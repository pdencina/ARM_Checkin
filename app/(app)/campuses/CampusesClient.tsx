"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";
import type { Campus } from "@/lib/types";

interface ProfileWithCampus {
  id: string; nombre: string | null; email: string | null;
  rol: string; activo: boolean; campus_id: string | null;
}

const PAISES = ["Chile","Argentina","Uruguay","Venezuela","Colombia","Perú","México"];

export default function CampusesClient({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [tab, setTab] = useState<"campuses"|"usuarios">("campuses");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithCampus[]>([]);
  const [stats, setStats] = useState<Record<string, { servicios: number; checkins: number }>>({});
  const [nc, setNc] = useState({ nombre: "", pais: "Chile", ciudad: "" });
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("campuses").select("*").order("nombre"),
      supabase.from("profiles").select("id, nombre, email, rol, activo, campus_id").order("email"),
    ]);
    setCampuses(c ?? []);
    setProfiles(p ?? []);

    // Stats por campus
    const { data: svcs } = await supabase.from("services").select("campus_id");
    const { data: cks } = await supabase.from("checkins").select("campus_id");
    const s: Record<string, { servicios: number; checkins: number }> = {};
    for (const sv of svcs ?? []) { if (sv.campus_id) { s[sv.campus_id] = s[sv.campus_id] ?? { servicios:0, checkins:0 }; s[sv.campus_id].servicios++; } }
    for (const ck of cks ?? []) { if (ck.campus_id) { s[ck.campus_id] = s[ck.campus_id] ?? { servicios:0, checkins:0 }; s[ck.campus_id].checkins++; } }
    setStats(s);
  }

  useEffect(() => { load(); }, []);

  async function addCampus() {
    if (!nc.nombre.trim()) return;
    const { error } = await supabase.from("campuses").insert({ nombre: nc.nombre.trim(), pais: nc.pais, ciudad: nc.ciudad || null });
    if (error) { toast("Error: " + error.message, "error"); return; }
    setNc({ nombre: "", pais: "Chile", ciudad: "" });
    toast("Campus creado exitosamente.", "success");
    load();
  }

  async function toggleCampus(c: Campus) {
    await supabase.from("campuses").update({ activo: !c.activo }).eq("id", c.id);
    toast(c.activo ? "Campus desactivado." : "Campus activado.", c.activo ? "warning" : "success");
    load();
  }

  async function assignCampus(profileId: string, campusId: string | null) {
    const { error } = await supabase.from("profiles").update({ campus_id: campusId || null }).eq("id", profileId);
    if (error) { toast("Error al asignar campus.", "error"); return; }
    setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, campus_id: campusId || null } : p));
    toast("Campus asignado.", "success");
  }

  const campusNombre = (id: string | null) => campuses.find((c) => c.id === id)?.nombre ?? "Sin campus";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold">Campus</h1>
      <p className="mb-5 text-muted">Gestiona los campus de ARM Global y asigna usuarios.</p>

      <div className="mb-5 flex gap-2">
        {(["campuses","usuarios"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab===t?"btn-brand":"btn-ghost"}`}>
            {t === "campuses" ? "🏢 Campus" : "👥 Asignar usuarios"}
          </button>
        ))}
      </div>

      {tab === "campuses" && (
        <div className="space-y-4">
          {/* Crear campus */}
          <div className="card p-5">
            <p className="mb-3 font-medium">Nuevo campus</p>
            <div className="grid grid-cols-3 gap-2">
              <input className="field col-span-3 sm:col-span-1" placeholder="Nombre (ej. ARM Buenos Aires)" value={nc.nombre} onChange={(e) => setNc({ ...nc, nombre: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addCampus()} />
              <select className="field" value={nc.pais} onChange={(e) => setNc({ ...nc, pais: e.target.value })}>
                {PAISES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input className="field" placeholder="Ciudad (opcional)" value={nc.ciudad} onChange={(e) => setNc({ ...nc, ciudad: e.target.value })} />
            </div>
            <button className="btn-brand mt-3" onClick={addCampus}>Crear campus</button>
          </div>

          {/* Lista de campus */}
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3 font-medium">{campuses.length} campus registrados</div>
            {campuses.map((c) => {
              const st = stats[c.id] ?? { servicios: 0, checkins: 0 };
              const usersCount = profiles.filter((p) => p.campus_id === c.id).length;
              const isOpen = expanded === c.id;
              return (
                <div key={c.id} className="border-t border-line">
                  <button onClick={() => setExpanded(isOpen ? null : c.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-paper">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl2 bg-tweens-soft text-lg">🏢</div>
                    <div className="flex-1">
                      <p className="font-medium">{c.nombre}</p>
                      <p className="text-sm text-muted">{c.ciudad ? `${c.ciudad}, ` : ""}{c.pais}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted">
                      <span>{usersCount} usuarios</span>
                      <span>{st.servicios} servicios</span>
                      <span>{st.checkins} check-ins</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleCampus(c); }}
                      className={`badge ${c.activo ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"}`}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </button>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line bg-paper/40 px-5 py-3">
                      <p className="mb-2 text-sm font-medium text-muted">Usuarios de este campus</p>
                      {profiles.filter((p) => p.campus_id === c.id).length === 0 ? (
                        <p className="text-sm text-muted">Sin usuarios asignados.</p>
                      ) : (
                        <div className="space-y-1">
                          {profiles.filter((p) => p.campus_id === c.id).map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-sm">
                              <span className="flex-1 truncate">{p.email}</span>
                              <span className="badge bg-paper text-muted text-xs capitalize">{p.rol}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3 font-medium">Asignar campus a cada usuario</div>
          <div className="divide-y divide-line">
            {profiles.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{p.nombre || p.email}</p>
                  <p className="truncate text-xs text-muted">{p.email} · <span className="capitalize">{p.rol}</span></p>
                </div>
                <select
                  className="field max-w-[200px]"
                  value={p.campus_id ?? ""}
                  onChange={(e) => assignCampus(p.id, e.target.value)}
                  disabled={p.rol === "super_admin"}
                >
                  <option value="">— Sin campus (global) —</option>
                  {campuses.filter((c) => c.activo).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
