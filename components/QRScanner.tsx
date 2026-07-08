"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: any = null;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            // Extraer guardian ID de la URL escaneada
            // Formato esperado: https://domain.com/checkin?g=UUID
            let guardianId = decodedText;
            try {
              const url = new URL(decodedText);
              const gParam = url.searchParams.get("g");
              if (gParam) guardianId = gParam;
            } catch {
              // Si no es URL, usar el texto directo como ID
            }
            onScan(guardianId);
            try { scanner.stop().catch(() => {}); } catch {}
          },
          () => {} // ignore scan failures (no QR in frame)
        )
        .catch((err: any) => {
          setError("No se pudo acceder a la cámara. Verifica los permisos.");
          console.error("QR Scanner error:", err);
        });
    });

    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) { // SCANNING or PAUSED
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          // Scanner not running, ignore
        }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl2 bg-brand px-4 py-3 text-white">
          <span className="font-medium">📷 Escanear QR familiar</span>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/20">
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        {/* Camera view */}
        <div className="bg-black" ref={containerRef}>
          <div id="qr-reader" style={{ width: "100%" }} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="rounded-b-xl2 bg-white px-4 py-3 text-center text-sm text-muted">
          Apunta la cámara al QR de la familia
        </div>
      </div>
    </div>
  );
}
