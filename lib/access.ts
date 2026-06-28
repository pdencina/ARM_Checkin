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

// Demo mode: return a super admin with full access
export async function getAccess(): Promise<Access> {
  const nav = MODULES.map((m) => ({ key: m.key, label: m.label, href: m.href, icon: m.icon }));
  return {
    userId: "demo-user",
    email: "admin@armglobal.org",
    hasProfile: true,
    activo: true,
    rol: "super_admin",
    rolNombre: "Super Admin",
    isAdmin: true,
    isSuperAdmin: true,
    campusId: null,
    campusNombre: null,
    perms: {},
    can: () => true,
    nav,
  };
}

export async function requireModule(_modulo: string, _gestionar = false): Promise<Access> {
  return getAccess();
}
