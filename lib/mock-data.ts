import type { Guardian, Child, Service, Checkin, Volunteer, ServiceVolunteer, AuthorizedPickup, Campus } from "./types";

// ── IDs ────────────────────────────────────────────────
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ── Campuses ───────────────────────────────────────────
export const MOCK_CAMPUSES: Campus[] = [
  { id: id(100), nombre: "ARM Santiago Centro", pais: "Chile", ciudad: "Santiago", activo: true, created_at: "2024-01-01" },
  { id: id(101), nombre: "ARM Buenos Aires", pais: "Argentina", ciudad: "Buenos Aires", activo: true, created_at: "2024-02-01" },
  { id: id(102), nombre: "ARM Montevideo", pais: "Uruguay", ciudad: "Montevideo", activo: true, created_at: "2024-03-01" },
];

// ── Guardians ──────────────────────────────────────────
export const MOCK_GUARDIANS: Guardian[] = [
  { id: id(1), nombre: "Carlos", apellido: "González", telefono: "+56912345678", email: "carlos@email.com", created_at: "2024-01-10" },
  { id: id(2), nombre: "María", apellido: "López", telefono: "+56987654321", email: "maria@email.com", created_at: "2024-01-15" },
  { id: id(3), nombre: "Roberto", apellido: "Martínez", telefono: "+56911112222", email: "roberto@email.com", created_at: "2024-02-01" },
  { id: id(4), nombre: "Ana", apellido: "Fernández", telefono: "+56933334444", email: "ana@email.com", created_at: "2024-02-10" },
  { id: id(5), nombre: "Pedro", apellido: "Sánchez", telefono: "+56955556666", email: "pedro@email.com", created_at: "2024-03-01" },
];

// ── Children ───────────────────────────────────────────
export const MOCK_CHILDREN: Child[] = [
  { id: id(10), nombre: "Sofía", apellido: "González", fecha_nacimiento: "2018-06-15", ministerio: "kids", alergias: null, notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-01-10" },
  { id: id(11), nombre: "Mateo", apellido: "González", fecha_nacimiento: "2015-03-22", ministerio: "tweens", alergias: "Nueces", notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: "Abuela Rosa", contacto_emergencia_telefono: "+56999887766", foto_url: null, activo: true, created_at: "2024-01-10" },
  { id: id(12), nombre: "Isabella", apellido: "López", fecha_nacimiento: "2020-11-05", ministerio: "sensorial", alergias: null, notas_medicas: null, condiciones: "TEA leve", medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-01-15" },
  { id: id(13), nombre: "Lucas", apellido: "López", fecha_nacimiento: "2017-06-30", ministerio: "kids", alergias: "Maní", notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-01-15" },
  { id: id(14), nombre: "Valentina", apellido: "Martínez", fecha_nacimiento: "2016-09-12", ministerio: "tweens", alergias: null, notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-02-01" },
  { id: id(15), nombre: "Emilia", apellido: "Fernández", fecha_nacimiento: "2019-01-20", ministerio: "kids", alergias: null, notas_medicas: null, condiciones: null, medicamentos: "Inhalador", contacto_emergencia_nombre: "Tía Claudia", contacto_emergencia_telefono: "+56977665544", foto_url: null, activo: true, created_at: "2024-02-10" },
  { id: id(16), nombre: "Tomás", apellido: "Fernández", fecha_nacimiento: "2021-06-08", ministerio: "sensorial", alergias: null, notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-02-10" },
  { id: id(17), nombre: "Martín", apellido: "Sánchez", fecha_nacimiento: "2017-12-01", ministerio: "kids", alergias: null, notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-03-01" },
  { id: id(18), nombre: "Agustina", apellido: "Sánchez", fecha_nacimiento: "2014-06-25", ministerio: "tweens", alergias: "Lactosa", notas_medicas: null, condiciones: null, medicamentos: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, foto_url: null, activo: true, created_at: "2024-03-01" },
];

// ── Guardian-Children mapping ──────────────────────────
export const MOCK_GUARDIAN_CHILDREN: { guardian_id: string; child_id: string; es_principal: boolean }[] = [
  { guardian_id: id(1), child_id: id(10), es_principal: true },
  { guardian_id: id(1), child_id: id(11), es_principal: true },
  { guardian_id: id(2), child_id: id(12), es_principal: true },
  { guardian_id: id(2), child_id: id(13), es_principal: true },
  { guardian_id: id(3), child_id: id(14), es_principal: true },
  { guardian_id: id(4), child_id: id(15), es_principal: true },
  { guardian_id: id(4), child_id: id(16), es_principal: true },
  { guardian_id: id(5), child_id: id(17), es_principal: true },
  { guardian_id: id(5), child_id: id(18), es_principal: true },
];

// ── Services ───────────────────────────────────────────
export const MOCK_SERVICES: Service[] = [
  { id: id(50), nombre: "Encuentro Domingo AM", fecha: "2026-06-22", hora: "10:00", activo: true, campus: "ARM Santiago Centro", campus_id: id(100), es_recurrente: true, dia_semana: 0, hora_default: "10:00", created_at: "2024-01-01" },
  { id: id(51), nombre: "Encuentro Domingo PM", fecha: "2026-06-22", hora: "18:00", activo: false, campus: "ARM Santiago Centro", campus_id: id(100), es_recurrente: true, dia_semana: 0, hora_default: "18:00", created_at: "2024-01-01" },
  { id: id(52), nombre: "Encuentro Sábado", fecha: "2026-06-21", hora: "17:00", activo: true, campus: "ARM Buenos Aires", campus_id: id(101), es_recurrente: true, dia_semana: 6, hora_default: "17:00", created_at: "2024-02-01" },
  { id: id(53), nombre: "Encuentro Domingo", fecha: "2026-06-15", hora: "10:00", activo: false, campus: "ARM Santiago Centro", campus_id: id(100), es_recurrente: true, dia_semana: 0, hora_default: "10:00", created_at: "2024-01-01" },
  { id: id(54), nombre: "Encuentro Domingo", fecha: "2026-06-08", hora: "10:00", activo: false, campus: "ARM Santiago Centro", campus_id: id(100), es_recurrente: true, dia_semana: 0, hora_default: "10:00", created_at: "2024-01-01" },
  { id: id(55), nombre: "Encuentro Domingo", fecha: "2026-06-01", hora: "10:00", activo: false, campus: "ARM Santiago Centro", campus_id: id(100), es_recurrente: true, dia_semana: 0, hora_default: "10:00", created_at: "2024-01-01" },
];

// ── Checkins (current service, some checked in) ────────
export const MOCK_CHECKINS: (Checkin & { child?: Child; guardian?: Guardian })[] = [
  { id: id(200), child_id: id(10), service_id: id(50), checkin_guardian_id: id(1), checkout_guardian_id: null, codigo_seguridad: "ABC123", estado: "checked_in", checkin_at: "2026-06-22T10:05:00", checkout_at: null, primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[0], guardian: MOCK_GUARDIANS[0] },
  { id: id(201), child_id: id(11), service_id: id(50), checkin_guardian_id: id(1), checkout_guardian_id: null, codigo_seguridad: "ABC123", estado: "checked_in", checkin_at: "2026-06-22T10:05:00", checkout_at: null, primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[1], guardian: MOCK_GUARDIANS[0] },
  { id: id(202), child_id: id(12), service_id: id(50), checkin_guardian_id: id(2), checkout_guardian_id: null, codigo_seguridad: "XYZ789", estado: "checked_in", checkin_at: "2026-06-22T10:12:00", checkout_at: null, primera_vez: true, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[2], guardian: MOCK_GUARDIANS[1] },
  { id: id(203), child_id: id(13), service_id: id(50), checkin_guardian_id: id(2), checkout_guardian_id: null, codigo_seguridad: "XYZ789", estado: "checked_in", checkin_at: "2026-06-22T10:12:00", checkout_at: null, primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[3], guardian: MOCK_GUARDIANS[1] },
  { id: id(204), child_id: id(15), service_id: id(50), checkin_guardian_id: id(4), checkout_guardian_id: null, codigo_seguridad: "DEF456", estado: "checked_in", checkin_at: "2026-06-22T10:20:00", checkout_at: null, primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[5], guardian: MOCK_GUARDIANS[3] },
  { id: id(205), child_id: id(17), service_id: id(50), checkin_guardian_id: id(5), checkout_guardian_id: null, codigo_seguridad: "GHI321", estado: "checked_in", checkin_at: "2026-06-22T10:25:00", checkout_at: null, primera_vez: true, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[7], guardian: MOCK_GUARDIANS[4] },
  // Historical checkins for previous services
  { id: id(210), child_id: id(10), service_id: id(53), checkin_guardian_id: id(1), checkout_guardian_id: id(1), codigo_seguridad: "OLD001", estado: "checked_out", checkin_at: "2026-06-15T10:05:00", checkout_at: "2026-06-15T12:00:00", primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[0], guardian: MOCK_GUARDIANS[0] },
  { id: id(211), child_id: id(11), service_id: id(53), checkin_guardian_id: id(1), checkout_guardian_id: id(1), codigo_seguridad: "OLD001", estado: "checked_out", checkin_at: "2026-06-15T10:05:00", checkout_at: "2026-06-15T12:00:00", primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[1], guardian: MOCK_GUARDIANS[0] },
  { id: id(212), child_id: id(14), service_id: id(53), checkin_guardian_id: id(3), checkout_guardian_id: id(3), codigo_seguridad: "OLD002", estado: "checked_out", checkin_at: "2026-06-15T10:10:00", checkout_at: "2026-06-15T12:05:00", primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[4], guardian: MOCK_GUARDIANS[2] },
  { id: id(213), child_id: id(15), service_id: id(54), checkin_guardian_id: id(4), checkout_guardian_id: id(4), codigo_seguridad: "OLD003", estado: "checked_out", checkin_at: "2026-06-08T10:15:00", checkout_at: "2026-06-08T12:10:00", primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[5], guardian: MOCK_GUARDIANS[3] },
  { id: id(214), child_id: id(10), service_id: id(54), checkin_guardian_id: id(1), checkout_guardian_id: id(1), codigo_seguridad: "OLD004", estado: "checked_out", checkin_at: "2026-06-08T10:05:00", checkout_at: "2026-06-08T12:00:00", primera_vez: false, checkout_nombre: null, campus_id: id(100), child: MOCK_CHILDREN[0], guardian: MOCK_GUARDIANS[0] },
];

// ── Volunteers ─────────────────────────────────────────
export const MOCK_VOLUNTEERS: Volunteer[] = [
  { id: id(30), nombre: "Daniela", apellido: "Rojas", telefono: "+56944445555", email: "daniela@email.com", areas: ["kids", "tweens"], notas: null, activo: true, campus_id: id(100), created_at: "2024-01-05" },
  { id: id(31), nombre: "Felipe", apellido: "Muñoz", telefono: "+56966667777", email: "felipe@email.com", areas: ["kids"], notas: "Líder zona kids", activo: true, campus_id: id(100), created_at: "2024-01-10" },
  { id: id(32), nombre: "Camila", apellido: "Torres", telefono: "+56988889999", email: "camila@email.com", areas: ["sensorial"], notas: null, activo: true, campus_id: id(100), created_at: "2024-02-01" },
  { id: id(33), nombre: "Andrés", apellido: "Vargas", telefono: "+56911223344", email: "andres@email.com", areas: ["tweens", "kids"], notas: null, activo: true, campus_id: id(100), created_at: "2024-02-15" },
  { id: id(34), nombre: "Javiera", apellido: "Silva", telefono: "+56955667788", email: "javiera@email.com", areas: ["sensorial", "kids"], notas: null, activo: false, campus_id: id(100), created_at: "2024-03-01" },
];

// ── Service Volunteers ─────────────────────────────────
export const MOCK_SERVICE_VOLUNTEERS: (ServiceVolunteer & { volunteer?: Volunteer })[] = [
  { id: id(40), service_id: id(50), volunteer_id: id(30), ministerio: "kids", rol: "lider", estado: "confirmado", created_at: "2024-06-20", volunteer: MOCK_VOLUNTEERS[0] },
  { id: id(41), service_id: id(50), volunteer_id: id(31), ministerio: "kids", rol: "servidor", estado: "confirmado", created_at: "2024-06-20", volunteer: MOCK_VOLUNTEERS[1] },
  { id: id(42), service_id: id(50), volunteer_id: id(32), ministerio: "sensorial", rol: "lider", estado: "confirmado", created_at: "2024-06-20", volunteer: MOCK_VOLUNTEERS[2] },
  { id: id(43), service_id: id(50), volunteer_id: id(33), ministerio: "tweens", rol: "servidor", estado: "pendiente", created_at: "2024-06-20", volunteer: MOCK_VOLUNTEERS[3] },
];

// ── Authorized Pickups ─────────────────────────────────
export const MOCK_PICKUPS: AuthorizedPickup[] = [
  { id: id(60), child_id: id(10), nombre: "Rosa", apellido: "Díaz", telefono: "+56999887766", parentesco: "Abuela", activo: true, created_at: "2024-01-12" },
  { id: id(61), child_id: id(11), nombre: "Rosa", apellido: "Díaz", telefono: "+56999887766", parentesco: "Abuela", activo: true, created_at: "2024-01-12" },
  { id: id(62), child_id: id(13), nombre: "Jorge", apellido: "López", telefono: "+56911002233", parentesco: "Tío", activo: true, created_at: "2024-01-20" },
];

// ── Profiles (for users view) ──────────────────────────
export const MOCK_PROFILES = [
  { id: id(80), nombre: "Admin Demo", email: "admin@armglobal.org", rol: "super_admin", activo: true, campus_id: null },
  { id: id(81), nombre: "Líder Santiago", email: "lider@armchile.org", rol: "lider", activo: true, campus_id: id(100) },
  { id: id(82), nombre: "Servidor Kids", email: "servidor@armchile.org", rol: "servidor", activo: true, campus_id: id(100) },
];

// ── Roles ──────────────────────────────────────────────
export const MOCK_ROLES = [
  { slug: "super_admin", nombre: "Super Admin", es_admin: true },
  { slug: "admin", nombre: "Administrador", es_admin: true },
  { slug: "lider", nombre: "Líder", es_admin: false },
  { slug: "servidor", nombre: "Servidor", es_admin: false },
];

// ── Role Permissions ───────────────────────────────────
export const MOCK_ROLE_PERMISSIONS = [
  { rol: "lider", modulo: "dashboard", ver: true, gestionar: true },
  { rol: "lider", modulo: "checkin", ver: true, gestionar: true },
  { rol: "lider", modulo: "checkout", ver: true, gestionar: true },
  { rol: "lider", modulo: "familias", ver: true, gestionar: true },
  { rol: "lider", modulo: "voluntarios", ver: true, gestionar: true },
  { rol: "lider", modulo: "reportes", ver: true, gestionar: false },
  { rol: "lider", modulo: "servicios", ver: true, gestionar: true },
  { rol: "servidor", modulo: "dashboard", ver: true, gestionar: false },
  { rol: "servidor", modulo: "checkin", ver: true, gestionar: true },
  { rol: "servidor", modulo: "checkout", ver: true, gestionar: true },
  { rol: "servidor", modulo: "familias", ver: true, gestionar: false },
];
