"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/permissions";

const ADMIN_KEYS = ["servicios", "campuses", "usuarios", "panoramica"];
const STORAGE_KEY = "arm-sidebar-open";

export default function Sidebar({
  nav, email, rolNombre, campusNombre, isSuperAdmin,
}: {
  nav: NavItem[]; email: string; rolNombre: string;
  campusNombre: string | null; isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setOpen(stored === "true");
    setMounted(true);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  function logout() {
    // Demo mode: just reload
    window.location.href = "/dashboard";
  }

  const ministerioNav = nav.filter((n) => !ADMIN_KEYS.includes(n.key));
  const adminNav       = nav.filter((n) => ADMIN_KEYS.includes(n.key));
  const initials       = email.slice(0, 2).toUpperCase();

  // Evitar flash de layout antes de leer localStorage
  if (!mounted) return (
    <aside className="no-print w-56 shrink-0 border-r border-line bg-white" />
  );

  return (
    <aside
      className={`no-print flex shrink-0 flex-col border-r border-line bg-white
                  transition-all duration-200 ease-in-out
                  ${open ? "w-56" : "w-[52px]"}`}
    >
      {/* ── Logo + Toggle ─────────────────────────── */}
      <div className={`flex items-center border-b border-line transition-all duration-200
                       ${open ? "gap-2.5 px-4 py-4" : "flex-col gap-2 px-1.5 py-3"}`}>

        {open ? (
          /* Expandido: logo + texto + botón */
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand">
              <i className="ti ti-triangle text-white" style={{ fontSize: 14 }} aria-hidden="true" />
            </div>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-semibold tracking-tight text-ink">ARM Check-in</p>
            </div>
            <button
              onClick={toggle}
              aria-label="Colapsar menú"
              title="Colapsar"
              className="rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-ink"
            >
              <i className="ti ti-layout-sidebar-left-collapse" style={{ fontSize: 17 }} aria-hidden="true" />
            </button>
          </>
        ) : (
          /* Colapsado: solo logo mark + botón expandir */
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
              <i className="ti ti-triangle text-white" style={{ fontSize: 14 }} aria-hidden="true" />
            </div>
            <button
              onClick={toggle}
              aria-label="Expandir menú"
              title="Expandir"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-paper hover:text-ink"
            >
              <i className="ti ti-layout-sidebar-right-collapse" style={{ fontSize: 17 }} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* ── Campus badge (solo cuando expandido) ─── */}
      {open && (
        <div className="px-4 pt-3 pb-1">
          {campusNombre ? (
            <div className="flex items-center gap-1.5 rounded-xl2 bg-brand-soft px-2 py-1">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kids" />
              <span className="truncate text-[11px] font-medium text-brand">{campusNombre}</span>
            </div>
          ) : isSuperAdmin ? (
            <div className="flex items-center gap-1.5 rounded-xl2 bg-tweens-soft px-2 py-1">
              <i className="ti ti-globe text-tweens" style={{ fontSize: 13 }} aria-hidden="true" />
              <span className="text-[11px] font-medium text-tweens-ink">Todos los campus</span>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Dot campus cuando colapsado ─────────── */}
      {!open && campusNombre && (
        <div className="flex justify-center py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-kids" title={campusNombre} />
        </div>
      )}

      {/* ── Navegación ───────────────────────────── */}
      <nav className={`flex flex-1 flex-col py-2 ${open ? "px-2 gap-0.5" : "px-1.5 gap-0.5"}`}>

        {ministerioNav.length > 0 && (
          <>
            {open && <span className="section-label">Ministerio</span>}
            {ministerioNav.map((item) => (
              <RailItem
                key={item.href}
                item={item}
                active={pathname === item.href}
                open={open}
              />
            ))}
          </>
        )}

        {adminNav.length > 0 && (
          <>
            {open
              ? <span className="section-label mt-1">Administración</span>
              : <div className="my-1 mx-auto h-px w-6 bg-line" />
            }
            {adminNav.map((item) => (
              <RailItem
                key={item.href}
                item={item}
                active={pathname === item.href}
                open={open}
              />
            ))}
          </>
        )}
      </nav>

      {/* ── Footer usuario ───────────────────────── */}
      <div className={`border-t border-line transition-all duration-200
                       ${open ? "px-3 py-3" : "px-1.5 py-3"}`}>
        {open ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                            bg-brand-soft text-[11px] font-semibold text-brand">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{email}</p>
              <p className="text-[10px] text-muted">{rolNombre}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="rounded p-1 text-muted transition hover:text-ink"
            >
              <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-lg
                       bg-brand-soft text-[11px] font-semibold text-brand
                       hover:bg-brand hover:text-white transition"
            aria-label="Cerrar sesión"
            title={`${email} — Cerrar sesión`}
          >
            {initials}
          </button>
        )}
      </div>
    </aside>
  );
}

/* ── Rail nav item ─────────────────────────────────────────── */
function RailItem({
  item, active, open,
}: {
  item: NavItem; active: boolean; open: boolean;
}) {
  const base = `flex items-center transition-all duration-150 text-sm
    border-l-2 cursor-pointer select-none`;

  const activeClass = "border-l-[3px] border-l-brand bg-brand-soft text-brand font-medium";
  const idleClass   = "border-l-[3px] border-l-transparent text-muted hover:bg-paper hover:text-ink";

  if (open) {
    return (
      <Link
        href={item.href}
        className={`${base} ${active ? activeClass : idleClass}
                    gap-2.5 rounded-r-xl2 px-2.5 py-2`}
      >
        <i className={`ti ${item.icon} shrink-0`} style={{ fontSize: 17, width: 18, textAlign: "center" }} aria-hidden="true" />
        {item.label}
      </Link>
    );
  }

  /* Colapsado: solo ícono centrado, tooltip nativo */
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      className={`${base} ${active ? activeClass : idleClass}
                  h-9 w-full justify-center rounded-r-lg`}
    >
      <i className={`ti ${item.icon}`} style={{ fontSize: 19 }} aria-hidden="true" />
    </Link>
  );
}
