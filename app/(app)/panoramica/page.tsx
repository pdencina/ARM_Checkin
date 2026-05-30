import { requireModule } from "@/lib/access";
import PanoramicaClient from "./PanoramicaClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PanoramicaPage() {
  await requireModule("panoramica");
  const supabase = createClient();

  // Cargar todos los campus activos
  const { data: campuses } = await supabase
    .from("campuses").select("id, nombre, pais, ciudad, activo").eq("activo", true).order("nombre");

  // Servicio activo por campus
  const { data: servicios } = await supabase
    .from("services").select("id, nombre, fecha, campus_id").eq("activo", true);

  // Presentes ahora (checked_in)
  const { data: presentes } = await supabase
    .from("checkins")
    .select("campus_id, child:children(ministerio)")
    .eq("estado", "checked_in");

  // Primera vez hoy
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: primeraVezHoy } = await supabase
    .from("checkins")
    .select("campus_id")
    .eq("primera_vez", true)
    .gte("checkin_at", hoy + "T00:00:00");

  // Check-ins por campus en los últimos 30 días
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const { data: recientes } = await supabase
    .from("checkins")
    .select("campus_id, checkin_at, child:children(ministerio)")
    .gte("checkin_at", hace30.toISOString());

  // Voluntarios confirmados hoy por campus
  const svcIds = (servicios ?? []).map((s: any) => s.id);
  let svols: any[] = [];
  if (svcIds.length > 0) {
    const { data } = await supabase
      .from("service_volunteers")
      .select("service_id, estado")
      .in("service_id", svcIds)
      .eq("estado", "confirmado");
    svols = data ?? [];
  }

  return (
    <PanoramicaClient
      campuses={campuses ?? []}
      servicios={servicios ?? []}
      presentes={presentes ?? []}
      primeraVezHoy={primeraVezHoy ?? []}
      recientes={recientes ?? []}
      svols={svols}
      svcByCampus={Object.fromEntries((servicios ?? []).map((s: any) => [s.campus_id, s]))}
    />
  );
}
