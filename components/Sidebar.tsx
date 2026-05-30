"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NavItem } from "@/lib/permissions";

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

  // Separar panorámica/campuses del resto
  const globalNav = nav.filter((n) => ["panoramica","campuses"].includes(n.key));
  const campusNav = nav.filter((n) => !["panoramica","campuses"].includes(n.key));

  return (
    <aside className="no-print flex w-60 shrink-0 flex-col border-r border-line bg-white px-3 py-5">
      <div className="mb-5 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl2 bg-brand-soft">🧒</span>
        <div className="leading-tight min-w-0">
          <p className="font-semibold">ARM Kids</p>
          <p className="truncate text-xs text-muted">&amp; Tweens</p>
        </div>
      </div>

      {/* Campus badge */}
      {campusNombre && (
        <div className="mb-4 mx-2 flex items-center gap-2 rounded-xl2 bg-paper px-3 py-2">
          <span className="text-base">🏢</span>
          <span className="truncate text-xs font-medium text-muted">{campusNombre}</span>
        </div>
      )}
      {isSuperAdmin && !campusNombre && (
        <div className="mb-4 mx-2 flex items-center gap-2 rounded-xl2 bg-tweens-soft px-3 py-2">
          <span className="text-base">🌐</span>
          <span className="text-xs font-medium text-tweens-ink">Todos los campus</span>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {/* Global (panorámica + campus) — solo super admin */}
        {globalNav.length > 0 && (
          <>
            {globalNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-sm font-medium transition ${active ? "bg-tweens-soft text-tweens-ink" : "text-ink hover:bg-paper"}`}>
                  <span className="text-lg">{item.icon}</span>{item.label}
                </Link>
              );
            })}
            {campusNav.length > 0 && (
              <div className="my-2 flex items-center gap-2 px-2">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-muted">Mi campus</span>
                <div className="h-px flex-1 bg-line" />
              </div>
            )}
          </>
        )}

        {/* Campus nav */}
        {campusNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-sm font-medium transition ${active ? "bg-brand-soft text-brand-dark" : "text-ink hover:bg-paper"}`}>
              <span className="text-lg">{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-line pt-4">
        {rolNombre && (
          <span className={`mb-2 ml-2 inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${isSuperAdmin ? "bg-tweens-soft text-tweens-ink" : "bg-paper text-muted"}`}>
            {rolNombre}
          </span>
        )}
        <p className="truncate px-2 text-xs text-muted">{email}</p>
        <button onClick={logout} className="mt-2 w-full rounded-xl2 px-3 py-2 text-left text-sm text-muted hover:bg-paper">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
