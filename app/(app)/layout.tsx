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
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl2 bg-brand-soft text-2xl">🔒</div>
          <h1 className="mb-2 text-xl font-semibold">
            {!access.hasProfile ? "Tu cuenta aún no tiene un rol" : !access.activo ? "Tu cuenta está desactivada" : "Sin acceso"}
          </h1>
          <p className="mb-5 text-muted">
            {!access.activo ? "Un administrador debe reactivar tu cuenta." : "Pídele a un administrador que te asigne un rol."}
          </p>
          <p className="mb-5 text-sm text-muted">{access.email}</p>
          <form action={logout}><button className="btn-ghost w-full">Cerrar sesión</button></form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        nav={access.nav}
        email={access.email}
        rolNombre={access.rolNombre ?? ""}
        campusNombre={access.campusNombre}
        isSuperAdmin={access.isSuperAdmin}
      />
      <main className="flex-1 px-6 py-7 md:px-10">{children}</main>
    </div>
  );
}
