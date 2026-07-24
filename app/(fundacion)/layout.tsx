"use client";

import { useState, useEffect } from "react";

const PIN_KEY = "fundacion-pin";
const VALID_PIN = "1234";

function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Formas flotantes animadas */}
      <div className="absolute top-[10%] left-[5%] h-20 w-20 rounded-full bg-pink-300/20 animate-float-slow" />
      <div className="absolute top-[60%] left-[80%] h-32 w-32 rounded-full bg-yellow-300/20 animate-float-med" />
      <div className="absolute top-[30%] right-[10%] h-16 w-16 rounded-full bg-teal-300/20 animate-float-fast" />
      <div className="absolute bottom-[15%] left-[20%] h-24 w-24 rounded-full bg-purple-300/15 animate-float-med" />
      <div className="absolute top-[5%] right-[30%] h-14 w-14 rounded-full bg-emerald-300/20 animate-float-slow" />
      <div className="absolute bottom-[30%] right-[5%] h-20 w-20 rounded-full bg-orange-300/15 animate-float-fast" />
      {/* Estrellas sutiles */}
      <div className="absolute top-[20%] left-[40%] text-2xl opacity-20 animate-twinkle">✦</div>
      <div className="absolute top-[70%] left-[60%] text-xl opacity-15 animate-twinkle-delay">✦</div>
      <div className="absolute top-[45%] left-[15%] text-lg opacity-20 animate-twinkle">✦</div>
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
    return <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400" />;
  }

  if (!authed) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 px-4">
        <FloatingShapes />
        <form onSubmit={submit} className="relative z-10 w-full max-w-sm rounded-[2rem] bg-white/95 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="mb-6">
            <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-200 to-orange-200 flex items-center justify-center shadow-inner">
              <span className="text-3xl">🧸</span>
            </div>
            <h1 className="text-2xl font-black text-gray-800">Play & Group</h1>
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
                       font-mono transition-all focus:outline-none focus:ring-4 focus:ring-purple-200
                       ${error ? "border-red-300 bg-red-50 animate-shake" : "border-gray-100 bg-gray-50/80"}`}
          />

          {error && (
            <p className="mt-2 text-sm text-red-500 font-medium">PIN incorrecto 😅</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500
                       px-4 py-4 text-base font-bold text-white shadow-lg shadow-purple-300/40
                       transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Entrar ✨
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400">
      <FloatingShapes />
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-med {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes twinkle-delay {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pop-in {
          0% { opacity: 0; transform: scale(0.8); }
          50% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(52, 211, 153, 0.3); }
          50% { box-shadow: 0 0 40px rgba(52, 211, 153, 0.6); }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-med { animation: float-med 4s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 3s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-twinkle-delay { animation: twinkle-delay 4s ease-in-out infinite 1s; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        .animate-pop-in { animation: pop-in 0.4s ease-out; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
