import { getAccess } from "@/lib/access";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();

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
