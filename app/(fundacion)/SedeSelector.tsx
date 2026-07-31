"use client";

import { useState, useEffect } from "react";

const SEDES = [
  { id: "puente-alto", nombre: "Puente Alto", emoji: "🏔️" },
  { id: "santiago", nombre: "Santiago", emoji: "🏙️" },
  { id: "punta-arenas", nombre: "Punta Arenas", emoji: "🐧" },
];

const SEDE_KEY = "play-sede";

export function useSede() {
  const [sede, setSede] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SEDE_KEY);
    if (saved) setSede(saved);
  }, []);

  function selectSede(id: string) {
    localStorage.setItem(SEDE_KEY, id);
    setSede(id);
  }

  function clearSede() {
    localStorage.removeItem(SEDE_KEY);
    setSede(null);
  }

  const sedeNombre = SEDES.find((s) => s.id === sede)?.nombre ?? "";

  return { sede, sedeNombre, selectSede, clearSede };
}

export default function SedeSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/60 max-w-sm w-full">
        <div className="mx-auto mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Fundación</p>
          <p className="text-lg leading-tight"><span className="font-black text-gray-800">arm</span> <span className="font-medium text-gray-600">global</span></p>
        </div>
        <h1 className="text-xl font-black text-gray-800 mb-2">¿En qué sede estás?</h1>
        <p className="text-sm text-gray-400 mb-6">Elige tu sede para ver solo tus niños</p>
        <div className="space-y-2">
          {SEDES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="w-full rounded-2xl bg-gradient-to-r from-white to-gray-50 border-2 border-gray-100
                         px-5 py-4 text-left transition-all hover:border-purple-200 hover:shadow-md hover:scale-[1.01]
                         active:scale-[0.98] flex items-center gap-3"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-sm font-bold text-gray-700">{s.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
