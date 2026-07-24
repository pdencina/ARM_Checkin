"use client";

import { useState, useEffect } from "react";

const PIN_KEY = "fundacion-pin";
const VALID_PIN = "1234"; // Cambiar por env var si se prefiere

export default function FundacionLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PIN_KEY);
    if (stored === VALID_PIN) setAuthed(true);
    setMounted(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === VALID_PIN) {
      localStorage.setItem(PIN_KEY, pin);
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50" />;
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
        <form onSubmit={submit} className="w-full max-w-xs text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
              <span style={{ fontSize: 32 }}>🧸</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Play & Group</h1>
            <p className="text-sm text-gray-500 mt-1">Ingresa el PIN para continuar</p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            placeholder="• • • •"
            autoFocus
            className={`w-full rounded-xl border-2 px-4 py-3 text-center text-2xl tracking-[0.3em]
                       font-mono transition focus:outline-none focus:ring-2 focus:ring-amber-300
                       ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
          />

          {error && (
            <p className="mt-2 text-sm text-red-500">PIN incorrecto</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold
                       text-white transition hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {children}
    </div>
  );
}
