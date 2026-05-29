import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { MIN_COLOR, MIN_LABEL, type Ministerio } from "@/lib/types";
import WeeklyChart, { type WeeklyStat } from "./WeeklyChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireModule("dashboard");
  const supabase = createClient();

  // Servicio activo
  const { data: servicios } = await supabase
    .from("services").select("*").eq("activo", true)
    .order("fecha", { ascending: false }).limit(1);
  const servicio = servicios?.[0] ?? null;

  // Presentes ahora
  let presentes: any[] = [];
  if (servicio) {
    const { data } = await supabase
      .from("checkins")
      .select("id, codigo_seguridad, checkin_at, child:children(nombre, apellido, ministerio, alergias)")
      .eq("service_id", servicio.id).eq("estado", "checked_in")
      .order("checkin_at", { ascending: false });
    presentes = data ?? [];
  }

  const byMin = (m: Ministerio) => presentes.filter((p) => p.child?.ministerio === m).length;

  // Estadísticas semanales (últimos 6 servicios)
  const { data: recentSvcs } = await supabase
    .from("services").select("id, nombre, fecha")
    .order("fecha", { ascending: false }).limit(6);

  const svcIds = (recentSvcs ?? []).map((s: any) => s.id);
  let weeklyStats: WeeklyStat[] = [];

  if (svcIds.length > 0) {
    const { data: wkCheckins } = await supabase
      .from("checkins")
      .select("service_id, child:children(ministerio)")
      .in("service_id", svcIds);

    const statsMap: Record<string, WeeklyStat> = {};
    for (const s of recentSvcs ?? []) {
      statsMap[s.id] = { id: s.id, nombre: s.nombre, fecha: s.fecha, kids: 0, tweens: 0, sensorial: 0 };
    }
    for (const c of wkCheckins ?? []) {
      const m = (c as any).child?.ministerio as Ministerio | undefined;
      if (m && statsMap[(c as any).service_id]) {
        statsMap[(c as any).service_id][m]++;
      }
    }
    weeklyStats = Object.values(statsMap);
  }

  // Cobertura de voluntarios del servicio activo
  let volCoverage: { ministerio: string; confirmados: number }[] = [];
  if (servicio) {
    const { data: svols } = await supabase
      .from("service_volunteers")
      .select("ministerio, estado")
      .eq("service_id", servicio.id);
    if (svols) {
      const map: Record<string, number> = {};
      for (const v of svols.filter((v: any) => v.estado === "confirmado")) {
        map[v.ministerio] = (map[v.ministerio] || 0) + 1;
      }
      volCoverage = Object.entries(map).map(([ministerio, confirmados]) => ({ ministerio, confirmados }));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inicio</h1>
          <p className="text-muted">
            {servicio ? (<>Servicio activo: <span className="font-medium text-ink">{servicio.nombre}</span></>) : "Sin servicio activo. Crea uno en Servicios."}
          </p>
        </div>
        <Link href="/checkin" className="btn-brand">Ir a check-in</Link>
      </div>

      {/* Stats por ministerio */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Presentes ahora" value={presentes.length} />
        <StatCard label="Kids" value={byMin("kids")} min="kids" />
        <StatCard label="Tweens" value={byMin("tweens")} min="tweens" />
        <StatCard label="Sensorial" value={byMin("sensorial")} min="sensorial" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        {/* Gráfico semanal */}
        <div className="card p-5">
          <p className="mb-4 font-medium">Asistencia · últimos 6 servicios</p>
          <WeeklyChart data={weeklyStats} />
        </div>

        {/* Voluntarios + alertas */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">Voluntarios confirmados hoy</p>
              <Link href="/voluntarios" className="text-sm text-brand-dark hover:underline">Ver todos</Link>
            </div>
            {volCoverage.length === 0 ? (
              <p className="text-sm text-muted">Sin asignaciones para este servicio.</p>
            ) : (
              <div className="space-y-2">
                {(["kids","tweens","sensorial"] as Ministerio[]).map((m) => {
                  const n = volCoverage.find((v) => v.ministerio === m)?.confirmados ?? 0;
                  const col = MIN_COLOR[m];
                  return (
                    <div key={m} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                        {MIN_LABEL[m]}
                      </span>
                      <span className={`badge ${col.bg} ${col.text}`}>{n} confirmado{n !== 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Niños en sala */}
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3 font-medium">
              Niños en sala ahora
            </div>
            {presentes.length === 0 ? (
              <p className="px-5 py-6 text-center text-muted">Aún no hay nadie.</p>
            ) : (
              <ul className="divide-y divide-line">
                {presentes.slice(0, 8).map((p) => {
                  const m = p.child?.ministerio as Ministerio;
                  const col = m ? MIN_COLOR[m] : null;
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                      {col && <span className={`badge ${col.bg} ${col.text} text-xs`}>{MIN_LABEL[m]}</span>}
                      <span className="font-medium">{p.child?.nombre} {p.child?.apellido}</span>
                      {p.child?.alergias && <span className="badge bg-red-50 text-red-700 text-xs">⚠ {p.child.alergias}</span>}
                      <span className="ml-auto font-mono text-sm tracking-widest text-muted">{p.codigo_seguridad}</span>
                    </li>
                  );
                })}
                {presentes.length > 8 && <li className="px-5 py-2 text-center text-sm text-muted">…y {presentes.length - 8} más</li>}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, min }: { label: string; value: number; min?: Ministerio }) {
  const col = min ? MIN_COLOR[min] : null;
  return (
    <div className={`rounded-xl2 px-5 py-4 ${col ? `${col.bg}` : "border border-line bg-white"}`}>
      <p className={`text-sm ${col ? col.text : "text-muted"}`}>{label}</p>
      <p className={`text-3xl font-semibold ${col ? col.text : ""}`}>{value}</p>
    </div>
  );
}
