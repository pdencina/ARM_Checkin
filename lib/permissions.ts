/* Íconos: clases Tabler outline (se renderizan como <i class="ti {icon}"> en el Sidebar) */
export const MODULES = [
  { key: "panoramica",  label: "Panorámica",  href: "/panoramica",  icon: "ti-globe"            },
  { key: "dashboard",   label: "Inicio",       href: "/dashboard",   icon: "ti-layout-dashboard" },
  { key: "checkin",     label: "Check-in",     href: "/checkin",     icon: "ti-ticket"           },
  { key: "checkout",    label: "Check-out",    href: "/checkout",    icon: "ti-door-exit"        },
  { key: "llamar",     label: "Llamar",       href: "/llamar",      icon: "ti-bell-ringing"     },
  { key: "familias",    label: "Familias",     href: "/familias",    icon: "ti-users-group"      },
  { key: "voluntarios", label: "Voluntarios",  href: "/voluntarios", icon: "ti-heart-handshake"  },
  { key: "reportes",    label: "Reportes",     href: "/reportes",    icon: "ti-chart-bar"        },
  { key: "servicios",   label: "Encuentros",    href: "/servicios",   icon: "ti-calendar-event"   },
  { key: "campuses",    label: "Campus",       href: "/campuses",    icon: "ti-building"         },
  { key: "usuarios",    label: "Usuarios",     href: "/usuarios",    icon: "ti-key"              },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export interface RolePermission { rol: string; modulo: string; ver: boolean; gestionar: boolean; }
export interface ProfileRow { id: string; nombre: string | null; email: string | null; rol: string; activo: boolean; campus_id: string | null; }
export interface RoleRow { slug: string; nombre: string; es_admin: boolean; }
export interface NavItem { key: string; label: string; href: string; icon: string; }
