"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    // Pequeña espera para que la cookie de sesión se propague antes de navegar
    // (evita el loop de login con Supabase + middleware).
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 400);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl2 bg-brand-soft text-2xl">
            🧒
          </div>
          <h1 className="text-xl font-semibold">ARM Kids &amp; Tweens</h1>
          <p className="text-sm text-muted">Estación de check-in</p>
        </div>

        <label className="mb-1 block text-sm font-medium">Correo</label>
        <input
          className="field mb-4"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@armerch.com"
        />

        <label className="mb-1 block text-sm font-medium">Contraseña</label>
        <input
          className="field mb-5"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="••••••••"
        />

        {error && <p className="mb-4 text-sm text-brand-dark">{error}</p>}

        <button className="btn-brand w-full" onClick={onSubmit} disabled={loading}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </div>
    </main>
  );
}
