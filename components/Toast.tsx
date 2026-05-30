"use client";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: number;
  msg: string;
  type: ToastType;
}

const CONFIG: Record<ToastType, { icon: string; border: string; iconColor: string }> = {
  success: { icon: "ti-circle-check",    border: "border-l-kids",      iconColor: "text-kids"      },
  error:   { icon: "ti-circle-x",        border: "border-l-sensorial", iconColor: "text-sensorial" },
  info:    { icon: "ti-info-circle",     border: "border-l-brand-blue",iconColor: "text-brand-blue"},
  warning: { icon: "ti-alert-triangle",  border: "border-l-tweens",    iconColor: "text-tweens"    },
};

function SingleToast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const cfg = CONFIG[toast.type];

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 280);
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 rounded-xl3 bg-white
        border border-line border-l-4 ${cfg.border}
        px-4 py-3 pr-3 shadow-sm
        transition-all duration-280
        ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
      `}
      style={{ minWidth: 260, maxWidth: 360, pointerEvents: "all" }}
    >
      <i className={`ti ${cfg.icon} ${cfg.iconColor} mt-0.5 shrink-0`} style={{ fontSize: 18 }} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-ink leading-snug">{toast.msg}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 280); }}
        className="mt-0.5 shrink-0 text-muted hover:text-ink"
        aria-label="Cerrar"
      >
        <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
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
        <SingleToast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
