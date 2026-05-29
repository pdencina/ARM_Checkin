import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { MIN_LABEL, type Ministerio } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireModule("dashboard");
  const supabase = createClient();

  const { data: servicios } = await supabase
    .from("services")
    .select("*")
    .eq("activo", true)
    .order("fecha", { ascending: false })
    .limit(1);

  const servicio = servicios?.[0] ?? null;

  let presentes: any[] = [];
  if (servicio) {
    const { data } = await supabase
      .from("checkins")
      .select("id, codigo_seguridad, checkin_at, child:children(nombre, apellido, ministerio, alergias)")
      .eq("service_id", servicio.id)
      .eq("estado", "checked_in")
      .order("checkin_at", { ascending: false });
    presentes = data ?? [];
  }

  const kids = presentes.filter((p) => p.child?.ministerio === "kids").length;
  const tweens = presentes.filter((p) => p.child?.ministerio === "tweens").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hola 👋</h1>
          <p className="text-muted">
            {servicio ? (
              <>
                Servicio activo: <span className="font-medium text-ink">{servicio.nombre}</span>
              </>
            ) : (
              "No hay un servicio activo. Crea uno en Servicios."
            )}
          </p>
        </div>
        <Link href="/checkin" className="btn-brand">
          Ir a check-in
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Presentes ahora" value={presentes.length} />
        <Stat label="Kids" value={kids} tone="kids" />
        <Stat label="Tweens" value={tweens} tone="tweens" />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3 font-medium">Niños en sala</div>
        {presentes.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted">Aún no hay niños registrados.</p>
        ) : (
          <ul className="divide-y divide-line">
            {presentes.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <Pill min={p.child?.ministerio} />
                <span className="font-medium">
                  {p.child?.nombre} {p.child?.apellido}
                </span>
                {p.child?.alergias && (
                  <span className="badge bg-red-50 text-red-700">⚠️ {p.child.alergias}</span>
                )}
                <span className="ml-auto font-mono text-sm tracking-widest text-muted">
                  {p.codigo_seguridad}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: Ministerio }) {
  const cls =
    tone === "kids"
      ? "bg-kids-soft text-kids-ink"
      : tone === "tweens"
      ? "bg-tweens-soft text-tweens-ink"
      : "bg-white border border-line";
  return (
    <div className={`rounded-xl2 px-5 py-4 ${cls}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Pill({ min }: { min?: Ministerio }) {
  if (!min) return null;
  const cls = min === "kids" ? "bg-kids-soft text-kids-ink" : "bg-tweens-soft text-tweens-ink";
  return <span className={`badge ${cls}`}>{MIN_LABEL[min]}</span>;
}
