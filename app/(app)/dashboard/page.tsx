import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { MIN_COLOR, MIN_LABEL, type Ministerio } from "@/lib/types";
import WeeklyChart, { type WeeklyStat } from "./WeeklyChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireModule("dashboard");
  const supabase = createClient();

  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;

  // Servicio activo
  const { data: svcData } = await supabase.from("services").select("*")
    .eq("activo", true).order("fecha", { ascending: false }).limit(1);
  const servicio = svcData?.[0] ?? null;

  // Presentes ahora
  let presentes: any[] = [];
  if (servicio) {
    const { data } = await supabase.from("checkins")
      .select("id, codigo_seguridad, primera_vez, checkin_at, child:children(nombre, apellido, ministerio, alergias)")
      .eq("service_id", servicio.id).eq("estado", "checked_in")
      .order("checkin_at", { ascending: false });
    presentes = data ?? [];
  }

  const byMin = (m: Ministerio) => presentes.filter((p) => p.child?.ministerio === m).length;
  const primeraVezHoy = presentes.filter((p) => p.primera_vez).length;

  // Tendencia mensual (últimos 4 meses)
  const hace4meses = new Date(hoy); hace4meses.setMonth(hoy.getMonth() - 3);
  const { data: mensualData } = await supabase.from("checkins")
    .select("checkin_at, child:children(ministerio)")
    .gte("checkin_at", hace4meses.toISOString());
  const meses: Record<string, { kids: number; tweens: number; sensorial: number }> = {};
  for (const c of mensualData ?? []) {
    const mes = (c as any).checkin_at?.slice(0, 7);
    const m = (c as any).child?.ministerio;
    if (!mes || !m) continue;
    if (!meses[mes]) meses[mes] = { kids: 0, tweens: 0, sensorial: 0 };
    meses[mes][m as Ministerio]++;
  }
  const tendencia = Object.entries(meses).sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes: mes.slice(0, 7), ...v }));

  // Estadísticas semanales (últimos 6 servicios)
  const { data: recentSvcs } = await supabase.from("services")
    .select("id, nombre, fecha").order("fecha", { ascending: false }).limit(6);
  const svcIds = (recentSvcs ?? []).map((s: any) => s.id);
  let weeklyStats: WeeklyStat[] = [];
  if (svcIds.length > 0) {
    const { data: wk } = await supabase.from("checkins")
      .select("service_id, child:children(ministerio)").in("service_id", svcIds);
    const map: Record<string, WeeklyStat> = {};
    for (const s of recentSvcs ?? []) map[s.id] = { id: s.id, nombre: s.nombre, fecha: s.fecha, kids: 0, tweens: 0, sensorial: 0 };
    for (const c of wk ?? []) {
      const m = (c as any).child?.ministerio as Ministerio;
      if (m && map[(c as any).service_id]) map[(c as any).service_id][m]++;
    }
    weeklyStats = Object.values(map);
  }

  // Cumpleaños este mes
  const { data: bdays } = await supabase.from("children")
    .select("nombre, apellido, fecha_nacimiento, ministerio")
    .eq("activo", true).not("fecha_nacimiento", "is", null);
  const cumpleMes = (bdays ?? []).filter((c: any) => {
    const m = parseInt(c.fecha_nacimiento?.slice(5, 7) ?? "0");
    return m === mesActual;
  }).sort((a: any, b: any) => {
    const da = parseInt(a.fecha_nacimiento?.slice(8, 10) ?? "0");
    const db = parseInt(b.fecha_nacimiento?.slice(8, 10) ?? "0");
    return da - db;
  });

  // Alertas: niños sin check-in en los últimos 3 servicios
  const { data: svcs3 } = await supabase.from("services")
    .select("fecha").order("fecha", { ascending: false }).limit(3);
  const cutoff = svcs3?.[svcs3.length - 1]?.fecha ?? null;
  let ausentes: any[] = [];
  if (cutoff) {
    const { data: allChildren } = await supabase.from("children")
      .select("id, nombre, apellido, ministerio").eq("activo", true);
    const { data: recentCheckins } = await supabase.from("checkins")
      .select("child_id").gte("checkin_at", cutoff + "T00:00:00");
    const presenteIds = new Set((recentCheckins ?? []).map((c: any) => c.child_id));
    ausentes = (allChildren ?? []).filter((c: any) => !presenteIds.has(c.id)).slice(0, 5);
  }

  // Voluntarios del servicio activo
  let volCoverage: { ministerio: string; confirmados: number }[] = [];
  if (servicio) {
    const { data: svols } = await supabase.from("service_volunteers")
      .select("ministerio, estado").eq("service_id", servicio.id);
    if (svols) {
      const map: Record<string, number> = {};
      for (const v of svols.filter((v: any) => v.estado === "confirmado")) {
        map[v.ministerio] = (map[v.ministerio] || 0) + 1;
      }
      volCoverage = Object.entries(map).map(([ministerio, confirmados]) => ({ ministerio, confirmados }));
    }
  }

  const mesNombre = hoy.toLocaleDateString("es-CL", { month: "long" });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inicio</h1>
          <p className="text-muted">
            {servicio ? (<>Servicio activo: <span className="font-medium text-ink">{servicio.nombre}</span> · {servicio.campus}</>) : "Sin servicio activo."}
          </p>
        </div>
        <Link href="/checkin" className="btn-brand">Ir a check-in</Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Presentes" value={presentes.length} />
        <StatCard label="Kids" value={byMin("kids")} min="kids" />
        <StatCard label="Tweens" value={byMin("tweens")} min="tweens" />
        <StatCard label="Sensorial" value={byMin("sensorial")} min="sensorial" />
        <StatCard label="Primera vez" value={primeraVezHoy} accent />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <p className="mb-4 font-medium">Asistencia · últimos servicios</p>
          <WeeklyChart data={weeklyStats} />
        </div>

        <div className="card p-5">
          <p className="mb-4 font-medium">Tendencia mensual</p>
          {tendencia.length === 0 ? (
            <p className="text-sm text-muted">Sin datos aún.</p>
          ) : (
            <div className="space-y-3">
              {tendencia.map((t) => {
                const total = t.kids + t.tweens + t.sensorial;
                return (
                  <div key={t.mes}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium capitalize">{new Date(t.mes + "-01").toLocaleDateString("es-CL", { month: "long", year: "numeric" })}</span>
                      <span className="text-muted">{total} total</span>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-line">
                      {total > 0 && (
                        <>
                          <div style={{ width: `${Math.round((t.kids / total) * 100)}%`, background: MIN_COLOR.kids.hex }} />
                          <div style={{ width: `${Math.round((t.tweens / total) * 100)}%`, background: MIN_COLOR.tweens.hex }} />
                          <div style={{ width: `${Math.round((t.sensorial / total) * 100)}%`, background: MIN_COLOR.sensorial.hex }} />
                        </>
                      )}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-muted">
                      <span style={{ color: MIN_COLOR.kids.hex }}>Kids {t.kids}</span>
                      <span style={{ color: MIN_COLOR.tweens.hex }}>Tweens {t.tweens}</span>
                      <span style={{ color: MIN_COLOR.sensorial.hex }}>Sensorial {t.sensorial}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        {/* Cumpleaños */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium">🎂 Cumpleaños en {mesNombre}</p>
            <span className="badge bg-brand-soft text-brand-dark">{cumpleMes.length}</span>
          </div>
          {cumpleMes.length === 0 ? (
            <p className="text-sm text-muted">Sin cumpleaños este mes.</p>
          ) : (
            <ul className="space-y-1.5">
              {cumpleMes.slice(0, 6).map((c: any, i: number) => {
                const col = MIN_COLOR[c.ministerio as Ministerio];
                const dia = c.fecha_nacimiento?.slice(8, 10);
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={`badge ${col.bg} ${col.text} text-xs`}>{dia}</span>
                    <span className="font-medium">{c.nombre} {c.apellido}</span>
                    <span className={`ml-auto text-xs ${col.text}`}>{MIN_LABEL[c.ministerio as Ministerio]}</span>
                  </li>
                );
              })}
              {cumpleMes.length > 6 && <li className="text-xs text-muted">+{cumpleMes.length - 6} más</li>}
            </ul>
          )}
        </div>

        {/* Alertas de ausencia */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium">⚠️ Sin asistir (3+ servicios)</p>
            <Link href="/reportes?tab=ausentes" className="text-xs text-brand-dark hover:underline">Ver todos</Link>
          </div>
          {ausentes.length === 0 ? (
            <p className="text-sm text-muted">Todos asistiendo regularmente.</p>
          ) : (
            <ul className="space-y-1.5">
              {ausentes.map((c: any) => {
                const col = MIN_COLOR[c.ministerio as Ministerio];
                return (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <span>{c.nombre} {c.apellido}</span>
                    <span className={`ml-auto badge text-xs ${col.bg} ${col.text}`}>{MIN_LABEL[c.ministerio as Ministerio]}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Voluntarios */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium">🤝 Voluntarios hoy</p>
            <Link href="/voluntarios" className="text-xs text-brand-dark hover:underline">Gestionar</Link>
          </div>
          {volCoverage.length === 0 ? (
            <p className="text-sm text-muted">Sin asignaciones para hoy.</p>
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
      </div>

      {/* Niños en sala */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="font-medium">Niños en sala ahora</p>
          {primeraVezHoy > 0 && (
            <span className="badge bg-brand-soft text-brand-dark">⭐ {primeraVezHoy} primera vez</span>
          )}
        </div>
        {presentes.length === 0 ? (
          <p className="px-5 py-6 text-center text-muted">Aún no hay nadie.</p>
        ) : (
          <ul className="divide-y divide-line">
            {presentes.map((p) => {
              const m = p.child?.ministerio as Ministerio;
              const col = m ? MIN_COLOR[m] : null;
              return (
                <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                  {p.primera_vez && <span className="text-xs text-brand-dark font-medium">⭐ Nuevo</span>}
                  {col && <span className={`badge ${col.bg} ${col.text} text-xs`}>{MIN_LABEL[m]}</span>}
                  <span className="font-medium">{p.child?.nombre} {p.child?.apellido}</span>
                  {p.child?.alergias && <span className="badge bg-red-50 text-red-700 text-xs">⚠ {p.child.alergias}</span>}
                  <span className="ml-auto font-mono text-sm tracking-widest text-muted">{p.codigo_seguridad}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, min, accent }: { label: string; value: number; min?: Ministerio; accent?: boolean }) {
  const col = min ? MIN_COLOR[min] : null;
  const cls = col ? `${col.bg}` : accent ? "bg-brand-soft" : "border border-line bg-white";
  const textCls = col ? col.text : accent ? "text-brand-dark" : "text-muted";
  return (
    <div className={`rounded-xl2 px-4 py-4 ${cls}`}>
      <p className={`text-sm ${textCls}`}>{label}</p>
      <p className={`text-3xl font-semibold ${col ? col.text : accent ? "text-brand-dark" : ""}`}>{value}</p>
    </div>
  );
}
