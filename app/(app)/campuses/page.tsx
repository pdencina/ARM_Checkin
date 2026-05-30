import { requireModule } from "@/lib/access";
import CampusesClient from "./CampusesClient";

export const dynamic = "force-dynamic";

export default async function CampusesPage() {
  const access = await requireModule("campuses", true);
  return <CampusesClient isSuperAdmin={access.isSuperAdmin} />;
}
