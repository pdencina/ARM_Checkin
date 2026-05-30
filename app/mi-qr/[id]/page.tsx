import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import QRPageClient from "./QRPageClient";

export default async function MiQRPage({ params }: { params: { id: string } }) {
  // Usamos el cliente anon para leer solo el nombre del tutor (dato no sensible)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
