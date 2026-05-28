"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/checkin", label: "Check-in", icon: "🎟️" },
  { href: "/checkout", label: "Retiro", icon: "✅" },
  { href: "/familias", label: "Familias", icon: "👨‍👩‍👧" },
  { href: "/servicios", label: "Servicios", icon: "📅" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="no-print flex w-60 shrink-0 flex-col border-r border-line bg-white px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl2 bg-brand-soft">🧒</span>
        <div className="leading-tight">
          <p className="font-semibold">ARM Kids</p>
          <p className="text-xs text-muted">&amp; Tweens</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-brand-soft text-brand-dark" : "text-ink hover:bg-paper"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-line pt-4">
        <p className="truncate px-2 text-xs text-muted">{email}</p>
        <button
          onClick={logout}
          className="mt-2 w-full rounded-xl2 px-3 py-2 text-left text-sm text-muted hover:bg-paper"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
