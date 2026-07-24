"use client";

import { useState, useEffect } from "react";

const PIN_KEY = "fundacion-pin";
const VALID_PIN = "1234"; // Cambiar por env var si se prefiere

function BgDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Burbujas decorativas */}
      <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-xl" />
      <div className="absolute top-1/3 -left-16 h-64 w-64 rounded-full bg-white/5 blur-lg" />
      <div className="absolute bottom-10 right-1/4 h-48 w-48 rounded-full bg-white/10 blur-lg" />
      <div className="absolute top-10 left-1/3 h-32 w-32 rounded-full bg-white/5 blur-md" />
    </div>
  );
}

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
    return <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-teal-400" />;
  }

  if (!authed) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500 via-purple-500 to-teal-400 px-4">
        <BgDecoration />
        <form onSubmit={submit} className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
          <div className="mb-6">
            <span className="text-5xl block mb-3">🏫</span>
            <h1 className="text-2xl font-bold text-gray-800">Play & Group</h1>
            <p className="text-sm text-gray-400 mt-1">Ingresa el PIN para continuar</p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            placeholder="• • • •"
            autoFocus
            className={`w-full rounded-2xl border-2 px-4 py-4 text-center text-2xl tracking-[0.3em]
                       font-mono transition focus:outline-none focus:ring-4 focus:ring-emerald-200
                       ${error ? "border-red-300 bg-red-50 shake" : "border-gray-100 bg-gray-50"}`}
          />

          {error && (
            <p className="mt-2 text-sm text-red-500 font-medium">PIN incorrecto, intenta de nuevo</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400
                       px-4 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200/50
                       transition hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Entrar 🎉
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-teal-400">
      <BgDecoration />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
