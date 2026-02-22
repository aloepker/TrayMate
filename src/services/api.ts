// services/api.ts

import { getAuthToken } from "./storage";

const BASE_URL = "https://traymate-auth.onrender.com";

async function getAuthHeaders() {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as any) : null;

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

/* ----------------------------- Helpers ----------------------------- */

/**
 * Some backends return:
 *   - [ ... ]  (plain array)
 * OR
 *   - { data: [ ... ] }
 * OR
 *   - { caregivers: [ ... ] } / { kitchenStaff: [ ... ] } etc
 *
 * This helper "unwraps" whichever structure comes back so our UI always gets an array.
 */
function unwrapList<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  return (
    data.caregivers ??
    data.kitchenStaff ??
    data.kitchen ??
    data.staff ??
    data.users ??
    data.items ??
    data.data ??
    data.content ??
    []
  );
}

/**
 * Backend might return allergies as:
 * - ["nuts", "dairy"]  OR "nuts, dairy"
 * This converts anything into a clean string[].
 */
function normalizeStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}


function ensureId(obj: any, fallback: string) {
  const raw = obj?.id ?? obj?._id ?? obj?.userId ?? obj?.email;
  const id = String(raw ?? "").trim();
  return id.length ? id : fallback;
}

/* ----------------------------- Types ----------------------------- */

export type Caregiver = {
  id: string;
  name: string;
  email: string;
};

export type KitchenStaff = {
  id: string;
  name: string;
  email: string;
  shift?: string;
};

export type Resident = {
  id: string;
  name: string; // UI field
  room: string; // UI field
  dietaryRestrictions: string[]; // UI field
  caregiverId?: string | null;
};


 // id, fullName, roomNumber, foodAllergies

type ResidentApi = {
  id: string | number;
  fullName: string;
  roomNumber: string;
  foodAllergies: any;
  caregiverId?: string | null;
};

/**
 * Maps backend Resident -> frontend Resident
 * so the dashboard can display correctly.
 */
function mapResident(api: ResidentApi): Resident {
  return {
    id: String(api.id),
    name: String(api.fullName ?? ""),
    room: String(api.roomNumber ?? ""),
    dietaryRestrictions: normalizeStringArray(api.foodAllergies),
    caregiverId: api.caregiverId ?? null,
  };
}

/* --------------------------- Caregivers -------------------------- */
/**
 * GET caregivers list for admin dashboard
 * Endpoint: /admin/caregivers
 * Backend fields: id, name, email
 */
export async function getCaregivers(): Promise<Caregiver[]> {
  const raw = await request<any>("/admin/caregivers");
  const list = unwrapList<any>(raw);

  return list.map((c: any) => {
    const email = String(c.email ?? "").trim();
    return {
      id: ensureId(c, email || `caregiver-${Math.random()}`),
      name: String(c.name ?? c.fullName ?? c.username ?? "").trim(),
      email,
    };
  });
}

/**
 * Creates a caregiver user account
 * Uses /auth/register (role-based)
 * Note: backend expects "fullName" in the register payload
 */
export function createCaregiver(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: payload.name,
      email: payload.email,
      password: payload.password,
      role: "ROLE_CAREGIVER",
    }),
  });
}

/* ------------------------- Kitchen Staff ------------------------- */
/**
 * GET kitchen staff list for admin dashboard
 * Endpoint: /admin/kitchen
 * Backend fields: id, name, email
 */
export async function getKitchenStaff(): Promise<KitchenStaff[]> {
  const raw = await request<any>("/admin/kitchen");
  const list = unwrapList<any>(raw);

  return list.map((k: any) => {
    const email = String(k.email ?? "").trim();
    return {
      id: ensureId(k, email || `kitchen-${Math.random()}`),
      name: String(k.name ?? k.fullName ?? k.username ?? "").trim(),
      email,
      shift: k.shift ? String(k.shift) : undefined,
    };
  });
}

/**
 * Creates a kitchen staff user account
 * Uses /auth/register (role-based)
 */
export function createKitchenStaff(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: payload.name,
      email: payload.email,
      password: payload.password,
      role: "ROLE_KITCHEN_STAFF",
    }),
  });
}

/* ---------------------------- Residents -------------------------- */
/**
 * GET resident list for admin dashboard
 * Endpoint: /admin/residents
 */
export async function getResidents(): Promise<Resident[]> {
  const raw = await request<any>("/admin/residents");
  const list = unwrapList<ResidentApi>(raw);
  return list.map(mapResident);
}

/**
 * Create resident
 * Endpoint used: /admin/residents
 * Payload must match backend fields:
 * fullName, roomNumber, foodAllergies
 */
export async function createResident(payload: {
  name: string;
  room: string;
  dietaryRestrictions: string[];
}): Promise<Resident> {
  const created = await request<ResidentApi>("/admin/residents", {
    method: "POST",
    body: JSON.stringify({
      fullName: payload.name,
      roomNumber: payload.room,
      foodAllergies: payload.dietaryRestrictions,
    }),
  });

  return mapResident(created);
}

/**
 * Assign resident to caregiver
 * Endpoint used: /admin/residents/:id/assign
 *
 * NOTE: If it returns 403, that’s almost always:
 * - role/permissions not allowed for this token, OR
 * - backend security config not allowing admin for this route
 * (Frontend is sending the token already)
 */
export async function assignResident(
  residentId: string,
  caregiverId: string | null
): Promise<Resident> {
  const updated = await request<ResidentApi>(
    `/admin/residents/${residentId}/assign`,
    {
      method: "PUT",
      body: JSON.stringify({ caregiverId }),
    }
  );

  return mapResident(updated);
}
