"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULES, type ProfileRow, type RoleRow, type RolePermission } from "@/lib/permissions";

export default function UsuariosClient() {
  const supabase = createClient();
  const [tab, setTab] = useState<"usuarios" | "permisos">("usuarios");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [perms, setPerms] = useState<RolePermission[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id ?? null);
    const [{ data: p }, { data: r }, { data: rp }] = await Promise.all([
      supabase.from("profiles").select("id, nombre, email, rol, activo").order("email"),
      supabase.from("roles").select("slug, nombre, es_admin").order("slug"),
      supabase.from("role_permissions").select("rol, modulo, ver, gestionar"),
    ]);
    setProfiles(p ?? []);
    setRoles(r ?? []);
    setPerms(rp ?? []);
  }
  useEffect(() => {
    loadAll();
  }, []);

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 2200);
  }

  async function cambiarRol(id: string, rol: string) {
    setProfiles((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
    const { error } = await supabase.from("profiles").update({ rol }).eq("id", id);
    flash(error ? "Error al cambiar rol" : "Rol actualizado ✓");
  }

  async function toggleActivo(id: string, activo: boolean) {
    setProfiles((prev) => prev.map((u) => (u.id === id ? { ...u, activo } : u)));
    const { error } = await supabase.from("profiles").update({ activo }).eq("id", id);
    flash(error ? "Error" : activo ? "Usuario activado ✓" : "Usuario desactivado ✓");
  }

  function getPerm(rol: string, modulo: string) {
    return perms.find((p) => p.rol === rol && p.modulo === modulo) ?? { rol, modulo, ver: false, gestionar: false };
  }

  async function setPerm(rol: string, modulo: string, campo: "ver" | "gestionar", val: boolean) {
    const cur = getPerm(rol, modulo);
    const next = { ...cur, [campo]: val };
    // gestionar implica ver; quitar ver quita gestionar
    if (campo === "gestionar" && val) next.ver = true;
    if (campo === "ver" && !val) next.gestionar = false;

    setPerms((prev) => {
      const without = prev.filter((p) => !(p.rol === rol && p.modulo === modulo));
      return [...without, next];
    });
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ rol, modulo, ver: next.ver, gestionar: next.gestionar }, { onConflict: "rol,modulo" });
    flash(error ? "Error al guardar permiso" : "Permiso guardado ✓");
  }

  const rolesEditables = roles.filter((r) => !r.es_admin);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Usuarios y permisos</h1>
      <p className="mb-5 text-muted">Asigna roles a tu equipo y define qué puede hacer cada rol.</p>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setTab("usuarios")}
          className={`btn ${tab === "usuarios" ? "btn-brand" : "btn-ghost"}`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setTab("permisos")}
          className={`btn ${tab === "permisos" ? "btn-brand" : "btn-ghost"}`}
        >
          Permisos por rol
        </button>
      </div>

      {tab === "usuarios" && (
        <div className="space-y-2">
          {profiles.map((u) => {
            const esYo = u.id === meId;
            return (
              <div key={u.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.nombre || u.email}</p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                </div>

                <select
                  className="field max-w-[10rem]"
                  value={u.rol}
                  disabled={esYo}
                  onChange={(e) => cambiarRol(u.id, e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.nombre}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => toggleActivo(u.id, !u.activo)}
                  disabled={esYo}
                  className={`badge ${u.activo ? "bg-kids-soft text-kids-ink" : "bg-line text-muted"} ${
                    esYo ? "opacity-50" : ""
                  }`}
                >
                  {u.activo ? "Activo" : "Inactivo"}
                </button>
              </div>
            );
          })}

          <div className="card mt-4 bg-paper/50 p-4 text-sm text-muted">
            <p className="mb-1 font-medium text-ink">¿Falta alguien?</p>
            Por seguridad, las cuentas se crean en Supabase → Authentication → Users (con su email y
            contraseña). Una vez creadas aparecen aquí automáticamente para asignarles un rol.
          </div>
        </div>
      )}

      {tab === "permisos" && (
        <div className="space-y-5">
          {rolesEditables.map((r) => (
            <div key={r.slug} className="card overflow-hidden">
              <div className="border-b border-line px-5 py-3 font-medium">{r.nombre}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="px-5 py-2 font-medium">Módulo</th>
                    <th className="px-3 py-2 text-center font-medium">Ver</th>
                    <th className="px-3 py-2 text-center font-medium">Gestionar</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => {
                    const p = getPerm(r.slug, m.key);
                    return (
                      <tr key={m.key} className="border-t border-line">
                        <td className="px-5 py-2">
                          {m.icon} {m.label}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-brand"
                            checked={p.ver}
                            onChange={(e) => setPerm(r.slug, m.key, "ver", e.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-brand"
                            checked={p.gestionar}
                            onChange={(e) => setPerm(r.slug, m.key, "gestionar", e.target.checked)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          <div className="card bg-paper/50 p-4 text-sm text-muted">
            <span className="font-medium text-ink">Administrador</span> siempre tiene acceso total; no
            requiere configuración. "Gestionar" incluye crear, editar y eliminar dentro del módulo.
          </div>
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
