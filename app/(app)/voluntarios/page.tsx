import { requireModule } from "@/lib/access";
import VoluntariosClient from "./VoluntariosClient";

export const dynamic = "force-dynamic";

export default async function VoluntariosPage() {
  await requireModule("voluntarios");
  return <VoluntariosClient />;
}
