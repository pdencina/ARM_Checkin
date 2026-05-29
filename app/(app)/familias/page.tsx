import { requireModule } from "@/lib/access";
import FamiliasClient from "./FamiliasClient";

export const dynamic = "force-dynamic";

export default async function FamiliasPage() {
  await requireModule("familias");
  return <FamiliasClient />;
}
