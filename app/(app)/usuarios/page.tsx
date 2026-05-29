import { requireModule } from "@/lib/access";
import UsuariosClient from "./UsuariosClient";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requireModule("usuarios", true);
  return <UsuariosClient />;
}
