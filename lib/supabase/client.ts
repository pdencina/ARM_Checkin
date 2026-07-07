/* Mock Supabase client for demo (no real DB) */
import {
  MOCK_GUARDIANS, MOCK_CHILDREN, MOCK_GUARDIAN_CHILDREN,
  MOCK_SERVICES, MOCK_CHECKINS, MOCK_VOLUNTEERS,
  MOCK_SERVICE_VOLUNTEERS, MOCK_PICKUPS, MOCK_CAMPUSES,
  MOCK_PROFILES, MOCK_ROLES, MOCK_ROLE_PERMISSIONS,
} from "@/lib/mock-data";

type Row = Record<string, any>;

function getTable(name: string): Row[] {
  switch (name) {
    case "guardians": return JSON.parse(JSON.stringify(MOCK_GUARDIANS));
    case "children": return JSON.parse(JSON.stringify(MOCK_CHILDREN));
    case "guardian_children": return JSON.parse(JSON.stringify(
      MOCK_GUARDIAN_CHILDREN.map((gc) => ({
        ...gc, child: MOCK_CHILDREN.find((c) => c.id === gc.child_id) ?? null,
      }))
    ));
    case "services": return JSON.parse(JSON.stringify(MOCK_SERVICES));
    case "checkins": return JSON.parse(JSON.stringify(MOCK_CHECKINS));
    case "volunteers": return JSON.parse(JSON.stringify(MOCK_VOLUNTEERS));
    case "service_volunteers": return JSON.parse(JSON.stringify(
      MOCK_SERVICE_VOLUNTEERS.map((sv) => ({
        ...sv, volunteer: MOCK_VOLUNTEERS.find((v) => v.id === sv.volunteer_id) ?? null,
      }))
    ));
    case "authorized_pickups": return JSON.parse(JSON.stringify(MOCK_PICKUPS));
    case "campuses": return JSON.parse(JSON.stringify(MOCK_CAMPUSES));
    case "profiles": return JSON.parse(JSON.stringify(MOCK_PROFILES));
    case "roles": return JSON.parse(JSON.stringify(MOCK_ROLES));
    case "role_permissions": return JSON.parse(JSON.stringify(MOCK_ROLE_PERMISSIONS));
    default: return [];
  }
}

function buildQuery(tableName: string) {
  let rows = getTable(tableName);
  let singleMode = false;

  const resolve = () => {
    const result = singleMode ? (rows[0] ?? null) : rows;
    return Promise.resolve({ data: result, error: null });
  };

  const chain: any = {
    select(_fields?: string) { return chain; },
    eq(col: string, val: any) { rows = rows.filter((r) => r[col] === val); return chain; },
    neq(col: string, val: any) { rows = rows.filter((r) => r[col] !== val); return chain; },
    in(col: string, vals: any[]) { rows = rows.filter((r) => vals.includes(r[col])); return chain; },
    gte(col: string, val: any) { rows = rows.filter((r) => r[col] >= val); return chain; },
    lte(col: string, val: any) { rows = rows.filter((r) => r[col] <= val); return chain; },
    gt(col: string, val: any) { rows = rows.filter((r) => r[col] > val); return chain; },
    lt(col: string, val: any) { rows = rows.filter((r) => r[col] < val); return chain; },
    not(col: string, op: string, _val: any) {
      if (op === "is") rows = rows.filter((r) => r[col] !== null && r[col] !== undefined);
      return chain;
    },
    or(expr: string) {
      const parts = expr.split(",");
      const matchers = parts.map((p) => {
        const match = p.match(/^(\w+)\.ilike\.%(.+)%$/);
        if (match) return (r: Row) => String(r[match[1]] ?? "").toLowerCase().includes(match[2].toLowerCase());
        return () => true;
      });
      const allRows = getTable(tableName);
      rows = allRows.filter((r) => matchers.some((m) => m(r)));
      return chain;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      const asc = opts?.ascending ?? true;
      rows.sort((a, b) => {
        const va = a[col] ?? ""; const vb = b[col] ?? "";
        return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
      return chain;
    },
    limit(n: number) { rows = rows.slice(0, n); return chain; },
    single() { singleMode = true; return chain; },

    // Write operations — return immediately with success
    insert(_data: any) {
      return {
        select() {
          return {
            single() {
              return Promise.resolve({ data: { id: genId(), ...(_data || {}) }, error: null });
            },
            then(cb: any) { return Promise.resolve({ data: [{ id: genId(), ...(_data || {}) }], error: null }).then(cb); },
          };
        },
        then(cb: any) { return Promise.resolve({ data: null, error: null }).then(cb); },
      };
    },
    update(_data: any) {
      return {
        eq() { return Promise.resolve({ data: null, error: null }); },
        then(cb: any) { return Promise.resolve({ data: null, error: null }).then(cb); },
      };
    },
    upsert(_data: any, _opts?: any) { return Promise.resolve({ data: null, error: null }); },
    delete() {
      return {
        eq() { return Promise.resolve({ data: null, error: null }); },
        then(cb: any) { return Promise.resolve({ data: null, error: null }).then(cb); },
      };
    },

    // Make the chain thenable (await-able)
    then(onFulfilled?: any, onRejected?: any) {
      return resolve().then(onFulfilled, onRejected);
    },
  };

  return chain;
}

function genId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function createMockRpc(fnName: string, _params: any) {
  if (fnName === "do_checkin") {
    return Promise.resolve({
      data: {
        id: genId(),
        codigo_seguridad: genCode(),
        primera_vez: Math.random() > 0.7,
      },
      error: null,
    });
  }
  if (fnName === "do_checkout") {
    return Promise.resolve({ data: { success: true }, error: null });
  }
  return Promise.resolve({ data: null, error: null });
}

export function createClient() {
  return {
    from(table: string) { return buildQuery(table); },
    rpc(fn: string, params?: any) { return createMockRpc(fn, params); },
    auth: {
      getUser() { return Promise.resolve({ data: { user: { id: "demo-user", email: "admin@armglobal.org" } }, error: null }); },
      signInWithPassword(_creds: any) { return Promise.resolve({ data: {}, error: null }); },
      signOut() { return Promise.resolve({ error: null }); },
    },
  } as any;
}
