import { requireModule } from "@/lib/access";
import ServiciosClient from "./ServiciosClient";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  await requireModule("servicios");
  return <ServiciosClient />;
}
