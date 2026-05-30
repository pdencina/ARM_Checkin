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
    setTimeout(() => { window.location.href = "/dashboard"; }, 400);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl3 bg-brand shadow-sm">
            <i className="ti ti-triangle text-white" style={{ fontSize: 22 }} aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-ink">ARM Check-in</h1>
            <p className="text-sm text-muted">Sistema ministerial ARM Global</p>
          </div>
        </div>

        <div className="card px-6 py-7 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="section-label mb-1">Correo electrónico</label>
              <input
                className="field"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
              />
            </div>
            <div>
              <label className="section-label mb-1">Contraseña</label>
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl2 bg-sensorial-soft px-3 py-2 text-sm text-sensorial-ink">
              <i className="ti ti-alert-circle shrink-0" style={{ fontSize: 16 }} aria-hidden="true" />
              {error}
            </div>
          )}

          <button className="btn-brand mt-5 w-full" onClick={onSubmit} disabled={loading}>
            {loading ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </div>
      </div>
    </main>
  );
}
