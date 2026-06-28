"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Demo mode: skip login entirely
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl3 bg-brand shadow-sm">
            <i className="ti ti-triangle text-white" style={{ fontSize: 22 }} aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-ink">ARM Check-in</h1>
            <p className="text-sm text-muted">Redirigiendo…</p>
          </div>
        </div>
      </div>
    </main>
  );
}
