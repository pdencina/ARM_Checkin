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
  perms: Record<string, { ver: boolean; gestionar: boolean }>;
  can: (modulo: string, gestionar?: boolean) => boolean;
  nav: NavItem[];
}

export async function getAccess(): Promise<Access | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, email, rol, activo, roles(nombre, es_admin)")
    .eq("id", user.id)
    .single();

  const base = {
    userId: user.id,
    email: user.email ?? "",
  };

  if (!profile || !profile.activo) {
    return {
      ...base,
      hasProfile: !!profile,
      activo: profile?.activo ?? false,
      rol: profile?.rol ?? null,
      rolNombre: null,
      isAdmin: false,
      perms: {},
      can: () => false,
      nav: [],
    };
  }

  const rolesRel = (profile as any).roles;
  const isAdmin = rolesRel?.es_admin === true;
  const rolNombre = rolesRel?.nombre ?? profile.rol;

  const perms: Record<string, { ver: boolean; gestionar: boolean }> = {};
  if (!isAdmin) {
    const { data: rows } = await supabase
      .from("role_permissions")
      .select("modulo, ver, gestionar")
      .eq("rol", profile.rol);
    for (const r of rows ?? []) {
      perms[r.modulo] = { ver: r.ver, gestionar: r.gestionar };
    }
  }

  const can = (modulo: string, gestionar = false) =>
    isAdmin || (!!perms[modulo]?.ver && (!gestionar || !!perms[modulo]?.gestionar));

  const nav = MODULES.filter((m) => can(m.key)).map((m) => ({
    key: m.key,
    label: m.label,
    href: m.href,
    icon: m.icon,
  }));

  return {
    ...base,
    hasProfile: true,
    activo: true,
    rol: profile.rol,
    rolNombre,
    isAdmin,
    perms,
    can,
    nav,
  };
}

/** Guarda una página: redirige si no hay acceso al módulo. */
export async function requireModule(modulo: string, gestionar = false): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (!access.can(modulo, gestionar)) {
    // Si no puede ver este módulo, lo mandamos al primero permitido (o a dashboard).
    const fallback = access.nav[0]?.href ?? "/dashboard";
    redirect(fallback);
  }
  return access;
}
