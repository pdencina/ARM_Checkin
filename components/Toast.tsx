"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: number;
  msg: string;
  type: ToastType;
}

const ICONS: Record<ToastType, string> = {
  success: "ti-circle-check",
  error:   "ti-circle-x",
  info:    "ti-info-circle",
  warning: "ti-alert-triangle",
};

const STYLES: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: "bg-white",  icon: "text-kids",       border: "border-l-4 border-l-kids" },
  error:   { bg: "bg-white",  icon: "text-brand-dark",  border: "border-l-4 border-l-brand" },
  info:    { bg: "bg-white",  icon: "text-tweens",      border: "border-l-4 border-l-tweens" },
  warning: { bg: "bg-white",  icon: "text-sensorial",   border: "border-l-4 border-l-sensorial" },
};

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const s = STYLES[toast.type];

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 rounded-xl2 shadow-lg px-4 py-3 pr-3
        border border-line ${s.bg} ${s.border}
        transition-all duration-300
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
      `}
      style={{ minWidth: 260, maxWidth: 380, pointerEvents: "all" }}
    >
      <i className={`ti ${ICONS[toast.type]} ${s.icon} text-xl shrink-0 mt-0.5`} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-ink leading-snug">{toast.msg}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="text-muted hover:text-ink mt-0.5 shrink-0"
        aria-label="Cerrar"
      >
        <i className="ti ti-x text-sm" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="no-print fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      style={{ pointerEvents: "none" }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
