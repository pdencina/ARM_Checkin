"use client";
import { useState } from "react";
import Link from "next/link";
import { MIN_COLOR, type Ministerio } from "@/lib/types";

interface Campus { id: string; nombre: string; pais: string; ciudad: string | null; }
interface Props {
  campuses: Campus[];
  servicios: any[];
  presentes: any[];
  primeraVezHoy: any[];
  recientes: any[];
  svols: any[];
  svcByCampus: Record<string, any>;
}

const FLAG: Record<string, string> = {
  Chile: "🇨🇱", Argentina: "🇦🇷", Uruguay: "🇺🇾", Venezuela: "🇻🇪",
  Colombia: "🇨🇴", Perú: "🇵🇪", México: "🇲🇽",
};

export default function PanoramicaClient({ campuses, servicios, presentes, primeraVezHoy, recientes, svols, svcByCampus }: Props) {
  const [sort, setSort] = useState<"nombre"|"presentes"|"total">("presentes");

  // Construir stats por campus
  const stats = campuses.map((c) => {
    const svc = svcByCampus[c.id];
    const pCount = presentes.filter((p) => p.campus_id === c.id);
    const kids = pCount.filter((p) => p.child?.ministerio === "kids").length;
    const tweens = pCount.filter((p) => p.child?.ministerio === "tweens").length;
    const sensorial = pCount.filter((p) => p.child?.ministerio === "sensorial").length;
    const pzHoy = primeraVezHoy.filter((p) => p.campus_id === c.id).length;
    const total30 = recientes.filter((p) => p.campus_id === c.id).length;
    const voluntarios = svc ? svols.filter((sv) => sv.service_id === svc.id).length : 0;
    return { campus: c, svc, total: pCount.length, kids, tweens, sensorial, pzHoy, total30, voluntarios };
  });

  const sorted = [...stats].sort((a, b) => {
    if (sort === "nombre") return a.campus.nombre.localeCompare(b.campus.nombre);
    if (sort === "presentes") return b.total - a.total;
    return b.total30 - a.total30;
  });

  const globalTotal = stats.reduce((s, c) => s + c.total, 0);
  const globalKids = stats.reduce((s, c) => s + c.kids, 0);
  const globalTweens = stats.reduce((s, c) => s + c.tweens, 0);
  const globalSensorial = stats.reduce((s, c) => s + c.sensorial, 0);
  const globalPZ = stats.reduce((s, c) => s + c.pzHoy, 0);
  const globalTotal30 = stats.reduce((s, c) => s + c.total30, 0);
  const campusActivos = stats.filter((s) => s.svc).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panorámica global 🌐</h1>
          <p className="text-muted">Vista en tiempo real de todos los campus de ARM.</p>
        </div>
        <Link href="/campuses" className="btn-ghost text-sm">Gestionar campus →</Link>
      </div>

      {/* Stats globales */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <GlobalStat label="Presentes ahora" value={globalTotal} big />
        <GlobalStat label="Kids" value={globalKids} color={MIN_COLOR.kids.hex} />
        <GlobalStat label="Tweens" value={globalTweens} color={MIN_COLOR.tweens.hex} />
        <GlobalStat label="Sensorial" value={globalSensorial} color={MIN_COLOR.sensorial.hex} />
        <GlobalStat label="Primera vez hoy" value={globalPZ} star />
        <GlobalStat label="Últ. 30 días" value={globalTotal30} />
      </div>

      {/* Ordenar */}
      <div className="mb-4 flex items-center gap-3">
        <p className="text-sm text-muted">{campusActivos} campus con servicio activo · {campuses.length} total</p>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted">Ordenar por</span>
          {(["presentes","total","nombre"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className={`badge cursor-pointer ${sort === s ? "bg-tweens-soft text-tweens-ink" : "bg-line text-muted"}`}>
              {s === "presentes" ? "Presentes" : s === "total" ? "Últimos 30d" : "Nombre"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards por campus */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map(({ campus, svc, total, kids, tweens, sensorial, pzHoy, total30, voluntarios }) => (
          <div key={campus.id} className={`card overflow-hidden transition ${total > 0 ? "ring-1 ring-kids/30" : ""}`}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-line px-5 py-3">
              <span className="text-2xl">{FLAG[campus.pais] ?? "🌍"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{campus.nombre}</p>
                <p className="text-xs text-muted">{campus.ciudad ?? campus.pais}</p>
              </div>
              {svc ? (
                <span className="badge bg-kids-soft text-kids-ink text-xs">🟢 Activo</span>
              ) : (
                <span className="badge bg-line text-muted text-xs">Sin servicio</span>
              )}
            </div>

            {/* Stats */}
            <div className="px-5 py-4">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-4xl font-semibold">{total}</span>
                <span className="text-muted text-sm">presentes ahora</span>
                {pzHoy > 0 && <span className="ml-auto badge bg-brand-soft text-brand-dark text-xs">⭐ {pzHoy} nuevos</span>}
              </div>

              {total > 0 && (
                <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-line">
                  {kids > 0 && <div style={{ width: `${Math.round((kids/total)*100)}%`, background: MIN_COLOR.kids.hex }} />}
                  {tweens > 0 && <div style={{ width: `${Math.round((tweens/total)*100)}%`, background: MIN_COLOR.tweens.hex }} />}
                  {sensorial > 0 && <div style={{ width: `${Math.round((sensorial/total)*100)}%`, background: MIN_COLOR.sensorial.hex }} />}
                </div>
              )}

              <div className="flex gap-4 text-xs text-muted">
                <span style={{ color: MIN_COLOR.kids.hex }}>Kids {kids}</span>
                <span style={{ color: MIN_COLOR.tweens.hex }}>Tweens {tweens}</span>
                <span style={{ color: MIN_COLOR.sensorial.hex }}>Sensorial {sensorial}</span>
                <span className="ml-auto">{voluntarios} voluntarios</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-line bg-paper/50 px-5 py-2 text-xs text-muted">
              {svc ? <span>Servicio: {svc.nombre}</span> : <span>Sin servicio activo hoy</span>}
              <span>{total30} check-ins (30d)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlobalStat({ label, value, big, star, color }: {
  label: string; value: number; big?: boolean; star?: boolean; color?: string;
}) {
  return (
    <div className="rounded-xl2 bg-white border border-line px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-semibold ${big ? "text-3xl" : "text-2xl"}`} style={color ? { color } : undefined}>
        {star && value > 0 && "⭐ "}{value}
      </p>
    </div>
  );
}
