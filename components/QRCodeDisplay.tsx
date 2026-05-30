"use client";

import { useEffect, useState } from "react";

interface Props {
  guardianId: string;
  nombre: string;
  size?: number;
}

/**
 * Genera el QR que identifica a una familia.
 * El contenido codificado es la URL de check-in con ?g=<guardianId>
 * → compatible con USB scanner (tipea la URL) y cámara de iPhone/Android (abre la URL).
 */
export function buildQRContent(guardianId: string): string {
  // Usamos una ruta relativa si no tenemos la URL del host,
  // pero en producción qrcode.react necesita algo scaneable.
  // Lo construimos en runtime con window.location.origin.
  if (typeof window === "undefined") return `/checkin?g=${guardianId}`;
  return `${window.location.origin}/checkin?g=${guardianId}`;
}

export default function QRCodeDisplay({ guardianId, nombre, size = 180 }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QR) => {
      const data = buildQRContent(guardianId);
      QR.toDataURL(data, {
        width: size,
        margin: 2,
        color: { dark: "#1A3A5C", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) { setDataUrl(url); setLoading(false); }
      });
    });
    return () => { cancelled = true; };
  }, [guardianId, size]);

  if (loading) {
    return (
      <div
        className="animate-pulse rounded bg-paper"
        style={{ width: size, height: size }}
        aria-label="Cargando QR"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR de acceso — familia ${nombre}`}
      width={size}
      height={size}
      className="rounded-xl2"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
