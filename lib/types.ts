export type Ministerio = "kids" | "tweens" | "sensorial";

export interface Guardian {
  id: string; nombre: string; apellido: string; telefono: string | null; email: string | null; created_at: string;
}
export interface Child {
  id: string; nombre: string; apellido: string; fecha_nacimiento: string | null;
  ministerio: Ministerio; alergias: string | null; notas_medicas: string | null;
  condiciones: string | null; medicamentos: string | null;
  contacto_emergencia_nombre: string | null; contacto_emergencia_telefono: string | null;
  foto_url: string | null; activo: boolean; created_at: string;
}
export interface Service {
  id: string; nombre: string; fecha: string; hora: string | null; activo: boolean;
  campus: string; es_recurrente: boolean; dia_semana: number | null; hora_default: string | null;
  created_at: string;
}
export interface Checkin {
  id: string; child_id: string; service_id: string;
  checkin_guardian_id: string; checkout_guardian_id: string | null;
  codigo_seguridad: string; estado: "checked_in" | "checked_out";
  checkin_at: string; checkout_at: string | null;
  primera_vez: boolean; checkout_nombre: string | null;
}
export interface Volunteer {
  id: string; nombre: string; apellido: string; telefono: string | null;
  email: string | null; areas: string[]; notas: string | null; activo: boolean; created_at: string;
}
export interface ServiceVolunteer {
  id: string; service_id: string; volunteer_id: string; ministerio: Ministerio;
  rol: "lider" | "servidor"; estado: "pendiente" | "confirmado" | "ausente"; created_at: string;
}
export interface AuthorizedPickup {
  id: string; child_id: string; nombre: string; apellido: string;
  telefono: string | null; parentesco: string | null; activo: boolean; created_at: string;
}

export const MIN_LABEL: Record<Ministerio, string> = {
  kids: "Kids", tweens: "Tweens", sensorial: "Sensorial",
};
export const MIN_COLOR = {
  kids:      { bg: "bg-kids-soft",      text: "text-kids-ink",      ring: "ring-kids",      dot: "bg-kids",      hex: "#1D9E75" },
  tweens:    { bg: "bg-tweens-soft",    text: "text-tweens-ink",    ring: "ring-tweens",    dot: "bg-tweens",    hex: "#7F77DD" },
  sensorial: { bg: "bg-sensorial-soft", text: "text-sensorial-ink", ring: "ring-sensorial", dot: "bg-sensorial", hex: "#D85A30" },
};

export function edad(fecha: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(fecha); const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() - n.getMonth() < 0 || (hoy.getMonth() - n.getMonth() === 0 && hoy.getDate() < n.getDate())) e--;
  return e;
}

export function waLink(telefono: string | null, mensaje: string): string | null {
  if (!telefono) return null;
  const num = telefono.replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}
