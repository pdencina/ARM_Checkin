import { notFound } from "next/navigation";
import { MOCK_GUARDIANS } from "@/lib/mock-data";
import QRPageClient from "./QRPageClient";

export default async function MiQRPage({ params }: { params: { id: string } }) {
  // Demo mode: find guardian in mock data
  const guardian = MOCK_GUARDIANS.find((g) => g.id === params.id);

  if (!guardian) notFound();

  const hasCredential = !!(guardian.email || guardian.telefono);

  return (
    <QRPageClient
      guardianId={guardian.id}
      nombre={guardian.nombre}
      apellido={guardian.apellido}
      hasCredential={hasCredential}
    />
  );
}
