export const MODULES = [
  { key: "panoramica",  label: "Panorámica",   href: "/panoramica",  icon: "🌐" },
  { key: "dashboard",   label: "Inicio",        href: "/dashboard",   icon: "🏠" },
  { key: "checkin",     label: "Check-in",      href: "/checkin",     icon: "🎟️" },
  { key: "checkout",    label: "Retiro",        href: "/checkout",    icon: "✅" },
  { key: "familias",    label: "Familias",      href: "/familias",    icon: "👨‍👩‍👧" },
  { key: "voluntarios", label: "Voluntarios",   href: "/voluntarios", icon: "🤝" },
  { key: "reportes",    label: "Reportes",      href: "/reportes",    icon: "📊" },
  { key: "servicios",   label: "Servicios",     href: "/servicios",   icon: "📅" },
  { key: "campuses",    label: "Campus",        href: "/campuses",    icon: "🏢" },
  { key: "usuarios",    label: "Usuarios",      href: "/usuarios",    icon: "🔑" },
] as const;
export type ModuleKey = (typeof MODULES)[number]["key"];
export interface RolePermission { rol: string; modulo: string; ver: boolean; gestionar: boolean; }
export interface ProfileRow { id: string; nombre: string | null; email: string | null; rol: string; activo: boolean; campus_id: string | null; }
export interface RoleRow { slug: string; nombre: string; es_admin: boolean; }
export interface NavItem { key: string; label: string; href: string; icon: string; }
