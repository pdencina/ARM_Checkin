"use client";
import { MIN_COLOR, type Ministerio } from "@/lib/types";

export interface WeeklyStat {
  id: string; nombre: string; fecha: string;
  kids: number; tweens: number; sensorial: number;
}

export default function WeeklyChart({ data }: { data: WeeklyStat[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.kids, d.tweens, d.sensorial]), 1);
  const min: Ministerio[] = ["kids", "tweens", "sensorial"];

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        {min.map((m) => (
          <span key={m} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MIN_COLOR[m].hex }} />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {[...data].reverse().map((s) => (
          <div key={s.id} className="flex items-start gap-3">
            <div className="w-28 shrink-0 pt-0.5">
              <p className="truncate text-xs font-medium">{s.nombre}</p>
              <p className="text-xs text-muted">{s.fecha}</p>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {min.map((m) => {
                const val = s[m] as number;
                const pct = Math.round((val / maxVal) * 100);
                return (
                  <div key={m} className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-line">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: MIN_COLOR[m].hex }}
                      />
                    </div>
                    <span className="w-5 text-right text-xs text-muted">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-center text-sm text-muted">Sin servicios registrados aún.</p>
        )}
      </div>
    </div>
  );
}
