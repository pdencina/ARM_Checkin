import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccess();
  if (!access) redirect("/login");

  // Usuario autenticado pero sin rol asignado o desactivado
  if (access.nav.length === 0) {
    return <SinAcceso email={access.email} activo={access.activo} hasProfile={access.hasProfile} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar nav={access.nav} email={access.email} rolNombre={access.rolNombre ?? ""} />
      <main className="flex-1 px-6 py-7 md:px-10">{children}</main>
    </div>
  );
}

async function SinAcceso({
  email,
  activo,
  hasProfile,
}: {
  email: string;
  activo: boolean;
  hasProfile: boolean;
}) {
  async function logout() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl2 bg-brand-soft text-2xl">
          🔒
        </div>
        <h1 className="mb-2 text-xl font-semibold">
          {!hasProfile
            ? "Tu cuenta aún no tiene un rol"
            : !activo
            ? "Tu cuenta está desactivada"
            : "Sin acceso"}
        </h1>
        <p className="mb-5 text-muted">
          {!activo
            ? "Un administrador debe reactivar tu cuenta para que puedas ingresar."
            : "Pídele a un administrador que te asigne un rol con permisos."}
        </p>
        <p className="mb-5 text-sm text-muted">{email}</p>
        <form action={logout}>
          <button className="btn-ghost w-full">Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
