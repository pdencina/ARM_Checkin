export type Ministerio = "kids" | "tweens";

export interface Guardian {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  created_at: string;
}

export interface Child {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  ministerio: Ministerio;
  alergias: string | null;
  notas_medicas: string | null;
  foto_url: string | null;
  activo: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  nombre: string;
  fecha: string;
  hora: string | null;
  activo: boolean;
  created_at: string;
}

export interface Checkin {
  id: string;
  child_id: string;
  service_id: string;
  checkin_guardian_id: string;
  checkout_guardian_id: string | null;
  codigo_seguridad: string;
  estado: "checked_in" | "checked_out";
  checkin_at: string;
  checkout_at: string | null;
}

export const MIN_LABEL: Record<Ministerio, string> = {
  kids: "Kids",
  tweens: "Tweens",
};

export function edad(fecha: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(fecha);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--;
  return e;
}
