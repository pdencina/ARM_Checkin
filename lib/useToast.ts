import { useCallback, useState } from "react";
import type { ToastData, ToastType } from "@/components/Toast";

let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((msg: string, type: ToastType = "success") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, msg, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
