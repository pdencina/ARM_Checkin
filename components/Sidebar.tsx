"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NavItem } from "@/lib/permissions";

/* Módulos que van en la sección "Administración" */
const ADMIN_KEYS = ["servicios", "campuses", "usuarios", "panoramica"];

export default function Sidebar({
  nav, email, rolNombre, campusNombre, isSuperAdmin,
}: {
  nav: NavItem[]; email: string; rolNombre: string;
  campusNombre: string | null; isSuperAdmin: boolean;
}) {
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const ministerioNav = nav.filter((n) => !ADMIN_KEYS.includes(n.key));
  const adminNav       = nav.filter((n) => ADMIN_KEYS.includes(n.key));

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <aside className="no-print flex w-56 shrink-0 flex-col border-r border-line bg-white">
      {/* Logo */}
      <div className="border-b border-line px-4 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand">
            <i className="ti ti-triangle text-white" style={{ fontSize: 14 }} aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-ink">ARM Kids</p>
            <p className="text-xs text-muted">&amp; Tweens</p>
          </div>
        </div>

        {/* Campus badge */}
        {campusNombre && (
          <div className="flex items-center gap-2 rounded-xl2 bg-brand-soft px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-kids" />
            <span className="truncate text-xs font-medium text-brand">{campusNombre}</span>
          </div>
        )}
        {isSuperAdmin && !campusNombre && (
          <div className="flex items-center gap-2 rounded-xl2 bg-tweens-soft px-2.5 py-1.5">
            <i className="ti ti-globe text-tweens" style={{ fontSize: 13 }} aria-hidden="true" />
            <span className="text-xs font-medium text-tweens-ink">Todos los campus</span>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
        {ministerioNav.length > 0 && (
          <>
            <span className="section-label">Ministerio</span>
            {ministerioNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href} />
            ))}
          </>
        )}
        {adminNav.length > 0 && (
          <>
            <span className="section-label">Administración</span>
            {adminNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href} />
            ))}
          </>
        )}
      </nav>

      {/* Footer usuario */}
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{email}</p>
            <p className="text-[10px] text-muted">{rolNombre}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="rounded text-muted hover:text-ink transition"
          >
            <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-r-xl2 border-l-2 px-2.5 py-2 text-sm transition
        ${active
          ? "border-l-brand bg-brand-soft font-medium text-brand"
          : "border-l-transparent text-muted hover:bg-paper hover:text-ink"
        }`}
    >
      <i className={`ti ${item.icon}`} style={{ fontSize: 17, width: 18, textAlign: "center" }} aria-hidden="true" />
      {item.label}
    </Link>
  );
}
