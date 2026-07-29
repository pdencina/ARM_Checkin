"use client";

import { useState, useEffect } from "react";

const PIN_KEY = "fundacion-pin-ok";

function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Flores lila/margaritas */}
      <svg className="absolute top-[5%] left-[3%] w-28 h-28 opacity-20 animate-float-slow" viewBox="0 0 100 100" fill="none">
        <path d="M50 10C53 25 60 30 50 50C40 30 47 25 50 10Z" fill="#b4b8f8"/>
        <path d="M50 90C47 75 40 70 50 50C60 70 53 75 50 90Z" fill="#b4b8f8"/>
        <path d="M10 50C25 47 30 40 50 50C30 60 25 53 10 50Z" fill="#b4b8f8"/>
        <path d="M90 50C75 53 70 60 50 50C70 40 75 47 90 50Z" fill="#b4b8f8"/>
        <path d="M22 22C35 30 38 37 50 50C37 38 30 35 22 22Z" fill="#b4b8f8"/>
        <path d="M78 78C65 70 62 63 50 50C63 62 70 65 78 78Z" fill="#b4b8f8"/>
        <path d="M78 22C70 35 63 38 50 50C62 37 65 30 78 22Z" fill="#b4b8f8"/>
        <path d="M22 78C30 65 37 62 50 50C38 63 35 70 22 78Z" fill="#b4b8f8"/>
      </svg>

      <svg className="absolute bottom-[10%] right-[8%] w-36 h-36 opacity-15 animate-float-med" viewBox="0 0 100 100" fill="none">
        <path d="M50 10C53 25 60 30 50 50C40 30 47 25 50 10Z" fill="#c7cafe"/>
        <path d="M50 90C47 75 40 70 50 50C60 70 53 75 50 90Z" fill="#c7cafe"/>
        <path d="M10 50C25 47 30 40 50 50C30 60 25 53 10 50Z" fill="#c7cafe"/>
        <path d="M90 50C75 53 70 60 50 50C70 40 75 47 90 50Z" fill="#c7cafe"/>
        <path d="M22 22C35 30 38 37 50 50C37 38 30 35 22 22Z" fill="#c7cafe"/>
        <path d="M78 78C65 70 62 63 50 50C63 62 70 65 78 78Z" fill="#c7cafe"/>
        <path d="M78 22C70 35 63 38 50 50C62 37 65 30 78 22Z" fill="#c7cafe"/>
        <path d="M22 78C30 65 37 62 50 50C38 63 35 70 22 78Z" fill="#c7cafe"/>
      </svg>

      <svg className="absolute top-[55%] left-[75%] w-20 h-20 opacity-20 animate-float-fast" viewBox="0 0 100 100" fill="none">
        <path d="M50 10C53 25 60 30 50 50C40 30 47 25 50 10Z" fill="#d4d7fc"/>
        <path d="M50 90C47 75 40 70 50 50C60 70 53 75 50 90Z" fill="#d4d7fc"/>
        <path d="M10 50C25 47 30 40 50 50C30 60 25 53 10 50Z" fill="#d4d7fc"/>
        <path d="M90 50C75 53 70 60 50 50C70 40 75 47 90 50Z" fill="#d4d7fc"/>
        <path d="M22 22C35 30 38 37 50 50C37 38 30 35 22 22Z" fill="#d4d7fc"/>
        <path d="M78 78C65 70 62 63 50 50C63 62 70 65 78 78Z" fill="#d4d7fc"/>
      </svg>

      {/* Rizos/espirales verdes */}
      <svg className="absolute top-[15%] right-[5%] w-24 h-40 opacity-25 animate-float-med" viewBox="0 0 60 100" fill="none">
        <path d="M30 5C45 15 50 30 40 40C30 50 25 45 30 35C35 25 45 30 40 45C35 60 25 55 30 50C35 45 45 50 40 65C35 80 25 75 30 70C35 65 45 70 40 85C38 92 32 95 30 95" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none"/>
      </svg>

      <svg className="absolute bottom-[20%] left-[8%] w-20 h-32 opacity-20 animate-float-slow" viewBox="0 0 60 100" fill="none">
        <path d="M30 5C45 15 50 30 40 40C30 50 25 45 30 35C35 25 45 30 40 45C35 60 25 55 30 50C35 45 45 50 40 65C35 80 28 78 30 75" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      </svg>

      <svg className="absolute top-[40%] left-[50%] w-16 h-28 opacity-15 animate-float-fast" viewBox="0 0 60 100" fill="none">
        <path d="M30 10C42 18 46 30 38 38C30 46 26 42 30 34C34 26 42 30 38 42C34 54 28 50 30 46C34 42 42 46 38 58" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" fill="none"/>
      </svg>

      {/* Bolitas pequeñas decorativas */}
      <div className="absolute top-[25%] left-[45%] h-3 w-3 rounded-full bg-yellow-300/30 animate-twinkle" />
      <div className="absolute top-[75%] left-[30%] h-4 w-4 rounded-full bg-pink-300/25 animate-twinkle-delay" />
      <div className="absolute top-[10%] left-[60%] h-2.5 w-2.5 rounded-full bg-emerald-300/30 animate-twinkle" />
      <div className="absolute bottom-[5%] right-[25%] h-3.5 w-3.5 rounded-full bg-violet-300/25 animate-float-fast" />
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
    if (stored === "true") setAuthed(true);
    setMounted(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem(PIN_KEY, "true");
        setAuthed(true);
        setError(false);
      } else {
        setError(true);
        setPin("");
      }
    } catch {
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
            <div className="mx-auto mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-800">Fundación</p>
              <p className="text-xl leading-tight"><span className="font-black text-gray-900">arm</span> <span className="font-medium text-gray-700">global</span></p>
            </div>
            <h1 className="text-2xl font-black text-gray-800">Play & Group</h1>
            <p className="text-sm text-gray-400 mt-1">Pon el PIN para entrar 🔑</p>
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
            <p className="mt-2 text-sm text-red-500 font-medium">Ese no es 😅 intenta de nuevo</p>
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
