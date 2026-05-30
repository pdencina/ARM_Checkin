"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULES, type ProfileRow, type RoleRow, type RolePermission } from "@/lib/permissions";
import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/Toast";

function genPassword() {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

export default function UsuariosClient() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [tab, setTab] = useState<"usuarios" | "permisos">("usuarios");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [perms, setPerms] = useState<RolePermission[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [nu, setNu] = useState({ email: "", password: "", rol: "lider", campus_id: "" });
  const [campuses, setCampuses] = useState<{id:string;nombre:string}[]>([]);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function loadAll() {
    const { data: camp } = await supabase.from("campuses").select("id, nombre").eq("activo", true).order("nombre");
    setCampuses(camp ?? []);
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id ?? null);
    const [{ data: p }, { data: r }, { data: rp }] = await Promise.all([
      supabase.from("profiles").select("id, nombre, email, rol, activo, campus_id").order("email"),
      supabase.from("roles").select("slug, nombre, es_admin").order("slug"),
      supabase.from("role_permissions").select("rol, modulo, ver, gestionar"),
    ]);
    setProfiles(p ?? []); setRoles(r ?? []); setPerms(rp ?? []);
  }
  useEffect(() => { loadAll(); }, []);

  async function createUser() {
    if (!nu.email || !nu.password) return toast("Email y contraseña requeridos.", "warning");
    setCreating(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nu.email, password: nu.password, rol: nu.rol, campus_id: nu.campus_id || null }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { toast("Error: " + (data.error ?? "no se pudo crear"), "error"); return; }
    toast(`Usuario ${nu.email} creado exitosamente.`, "success");
    setNu({ email: "", password: "", rol: "lider", campus_id: "" });
    setShowCreate(false);
    loadAll();
  }

  async function cambiarRol(id: string, rol: string) {
    setProfiles((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
    const { error } = await supabase.from("profiles").update({ rol }).eq("id", id);
    error ? toast("Error al cambiar rol.", "error") : toast("Rol actualizado correctamente.", "success");
  }

  async function toggleActivo(id: string, activo: boolean) {
    setProfiles((prev) => prev.map((u) => (u.id === id ? { ...u, activo } : u)));
    const { error } = await supabase.from("profiles").update({ activo }).eq("id", id);
    if (!error) toast(activo ? "Usuario activado." : "Usuario desactivado.", activo ? "success" : "warning");
  }

  function getPerm(rol: string, modulo: string) {
    return perms.find((p) => p.rol === rol && p.modulo === modulo) ?? { rol, modulo, ver: false, gestionar: false };
  }

  async function setPerm(rol: string, modulo: string, campo: "ver" | "gestionar", val: boolean) {
    const cur = getPerm(rol, modulo);
    const next = { ...cur, [campo]: val };
    if (campo === "gestionar" && val) next.ver = true;
    if (campo === "ver" && !val) next.gestionar = false;
    setPerms((prev) => [...prev.filter((p) => !(p.rol === rol && p.modulo === modulo)), next]);
    const { error } = await supabase.from("role_permissions")
      .upsert({ rol, modulo, ver: next.ver, gestionar: next.gestionar }, { onConflict: "rol,modulo" });
    error ? toast("Error al guardar permiso.", "error") : toast("Permiso guardado.", "success");
  }

  const rolesEditables = roles.filter((r) => !r.es_admin);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Usuarios y permisos</h1>
      <p className="mb-5 text-muted">Gestiona tu equipo y define qué puede hacer cada rol.</p>

      <div className="mb-5 flex gap-2">
        {(["usuarios","permisos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? "btn-brand" : "btn-ghost"}`}>
            {t === "usuarios" ? "Usuarios" : "Permisos por rol"}
          </button>
        ))}
      </div>

      {tab === "usuarios" && (
        <div className="space-y-2">
          {showCreate ? (
            <div className="card p-5">
              <p className="mb-3 font-medium">Nuevo usuario</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="field col-span-2" type="email" placeholder="Email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
                <div className="col-span-2 flex gap-2">
                  <input className="field flex-1" type="text" placeholder="Contraseña" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
                  <button className="btn-ghost shrink-0 text-xs" onClick={() => setNu({ ...nu, password: genPassword() })}>Generar</button>
                </div>
                <select className="field" value={nu.rol} onChange={(e) => setNu({ ...nu, rol: e.target.value })}>
                  {roles.map((r) => <option key={r.slug} value={r.slug}>{r.nombre}</option>)}
                </select>
                <select className="field" value={nu.campus_id} onChange={(e) => setNu({ ...nu, campus_id: e.target.value })}>
                  <option value="">— Sin campus (global) —</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {nu.password && (
                <p className="mt-2 rounded-xl2 bg-paper px-3 py-1.5 font-mono text-sm">
                  {nu.password}
                  <button className="ml-2 text-xs text-muted hover:text-ink" onClick={() => { navigator.clipboard.writeText(nu.password); toast("Contraseña copiada.", "info"); }}>copiar</button>
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button className="btn-brand" onClick={createUser} disabled={creating}>{creating ? "Creando…" : "Crear usuario"}</button>
                <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="btn-brand" onClick={() => setShowCreate(true)}>+ Nuevo usuario</button>
          )}
          {profiles.map((u) => {
            const esYo = u.id === meId;
            return (
              <div key={u.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.nombre || u.email}</p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                </div>
                <select className="field max-w-[10rem]" value={u.rol} disabled={esYo} onChange={(e) => cambiarRol(u.id, e.target.value)}>
                  {roles.map((r) => <option key={r.slug} value={r.slug}>{r.nombre}</option>)}
                </select>
                <select className="field" value={nu.campus_id} onChange={(e) => setNu({ ...nu, campus_id: e.target.value })}>
                  <option value="">— Sin campus (global) —</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button onClick={() => toggleActivo(u.id, !u.activo)} disabled={esYo}
                  className={`badge ${u.activo ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"} ${esYo ? "opacity-50" : ""}`}>
                  {u.activo ? "Activo" : "Inactivo"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "permisos" && (
        <div className="space-y-5">
          {rolesEditables.map((r) => (
            <div key={r.slug} className="card overflow-hidden">
              <div className="border-b border-line px-5 py-3 font-medium">{r.nombre}</div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted">
                  <th className="px-5 py-2 font-medium">Módulo</th>
                  <th className="px-3 py-2 text-center font-medium">Ver</th>
                  <th className="px-3 py-2 text-center font-medium">Gestionar</th>
                </tr></thead>
                <tbody>
                  {MODULES.map((m) => {
                    const p = getPerm(r.slug, m.key);
                    return (
                      <tr key={m.key} className="border-t border-line">
                        <td className="px-5 py-2">{m.icon} {m.label}</td>
                        <td className="px-3 py-2 text-center"><input type="checkbox" className="h-5 w-5 accent-brand" checked={p.ver} onChange={(e) => setPerm(r.slug, m.key, "ver", e.target.checked)} /></td>
                        <td className="px-3 py-2 text-center"><input type="checkbox" className="h-5 w-5 accent-brand" checked={p.gestionar} onChange={(e) => setPerm(r.slug, m.key, "gestionar", e.target.checked)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          <div className="card bg-paper/50 p-4 text-sm text-muted">
            <span className="font-medium text-ink">Administrador</span> siempre tiene acceso total. "Gestionar" incluye crear, editar y eliminar.
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
