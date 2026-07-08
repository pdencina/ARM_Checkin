import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  if (!access) redirect("/login");

  if (access.nav.length === 0) {
    async function logout() {
      "use server";
      const supabase = createClient();
      await supabase.auth.signOut();
      redirect("/login");
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="card max-w-md px-7 py-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl3 bg-brand-soft">
            <i className="ti ti-lock text-brand" style={{ fontSize: 22 }} aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-lg font-semibold">
            {!access.hasProfile ? "Sin rol asignado" : !access.activo ? "Cuenta desactivada" : "Sin acceso"}
          </h1>
          <p className="mb-5 text-sm text-muted">
            {!access.activo
              ? "Un administrador debe reactivar tu cuenta."
              : "Pídele a un administrador que te asigne un rol."}
          </p>
          <p className="mb-6 rounded-xl2 bg-paper px-3 py-2 font-mono text-xs text-muted">{access.email}</p>
          <form action={logout}>
            <button className="btn-ghost w-full">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar
        nav={access.nav}
        email={access.email}
        rolNombre={access.rolNombre ?? ""}
        campusNombre={access.campusNombre}
        isSuperAdmin={access.isSuperAdmin}
      />
      <main className="min-w-0 flex-1 px-6 py-7 transition-all duration-200 md:px-10">
        {children}
      </main>
    </div>
  );
}
