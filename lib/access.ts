import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES, type NavItem } from "@/lib/permissions";

export interface Access {
  userId: string;
  email: string;
  hasProfile: boolean;
  activo: boolean;
  rol: string | null;
  rolNombre: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  campusId: string | null;
  campusNombre: string | null;
  perms: Record<string, { ver: boolean; gestionar: boolean }>;
  can: (modulo: string, gestionar?: boolean) => boolean;
  nav: NavItem[];
}

export async function getAccess(): Promise<Access | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, email, rol, activo, campus_id")
    .eq("id", user.id)
    .single();

  const base = { userId: user.id, email: user.email ?? "" };

  if (!profile || !profile.activo) {
    return { ...base, hasProfile: !!profile, activo: profile?.activo ?? false,
      rol: profile?.rol ?? null, rolNombre: null, isAdmin: false, isSuperAdmin: false,
      campusId: null, campusNombre: null, perms: {}, can: () => false, nav: [] };
  }

  const [{ data: rolRow }, { data: campusRow }] = await Promise.all([
    supabase.from("roles").select("nombre, es_admin").eq("slug", profile.rol).single(),
    profile.campus_id
      ? supabase.from("campuses").select("nombre").eq("id", profile.campus_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const isSuperAdmin = profile.rol === "super_admin";
  const isAdmin = rolRow?.es_admin === true;
  const rolNombre = rolRow?.nombre ?? profile.rol;
  const campusNombre = (campusRow as any)?.nombre ?? null;

  const perms: Record<string, { ver: boolean; gestionar: boolean }> = {};
  if (!isAdmin) {
    const { data: rows } = await supabase
      .from("role_permissions").select("modulo, ver, gestionar").eq("rol", profile.rol);
    for (const r of rows ?? []) perms[r.modulo] = { ver: r.ver, gestionar: r.gestionar };
  }

  // Super admin: panorámica y campuses siempre permitidos
  if (isSuperAdmin) {
    perms["panoramica"] = { ver: true, gestionar: true };
    perms["campuses"]   = { ver: true, gestionar: true };
  }

  const can = (modulo: string, gestionar = false) =>
    isSuperAdmin || isAdmin ||
    (!!perms[modulo]?.ver && (!gestionar || !!perms[modulo]?.gestionar));

  const nav = MODULES.filter((m) => {
    if (m.key === "panoramica") return isSuperAdmin;
    if (m.key === "campuses")   return isSuperAdmin;
    return can(m.key);
  }).map((m) => ({ key: m.key, label: m.label, href: m.href, icon: m.icon }));

  return { ...base, hasProfile: true, activo: true, rol: profile.rol, rolNombre,
    isAdmin, isSuperAdmin, campusId: profile.campus_id, campusNombre, perms, can, nav };
}

export async function requireModule(modulo: string, gestionar = false): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (!access.can(modulo, gestionar)) redirect(access.nav[0]?.href ?? "/dashboard");
  return access;
}
