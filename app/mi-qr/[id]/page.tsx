import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import QRPageClient from "./QRPageClient";

export default async function MiQRPage({ params }: { params: { id: string } }) {
  // Service role en el servidor — nunca llega al browser
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, nombre, apellido, email, telefono")
    .eq("id", params.id)
    .single();

  if (!guardian) notFound();

  // Solo pasamos si tiene algo con qué verificar
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
