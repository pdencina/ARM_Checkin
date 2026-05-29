import { requireModule } from "@/lib/access";
import ReportesClient from "./ReportesClient";
export const dynamic = "force-dynamic";
export default async function ReportesPage() {
  await requireModule("reportes");
  return <ReportesClient />;
}
