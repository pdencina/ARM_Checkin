import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import QRPageClient from "./QRPageClient";

export default async function MiQRPage({ params }: { params: { id: string } }) {
  // Server component: usamos service role key para leer el tutor sin restricción de RLS.
  // Esta key NUNCA llega al browser — solo existe en el servidor de Vercel.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, nombre, apellido")
    .eq("id", params.id)
    .single();

  if (!guardian) notFound();

  return (
    <QRPageClient
      guardianId={guardian.id}
      nombre={guardian.nombre}
      apellido={guardian.apellido}
    />
  );
}
