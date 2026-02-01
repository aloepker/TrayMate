// services/api.ts

import { setAuth, getAuthToken } from "@/services/storage";

const BASE_URL = "https://traymate-auth.onrender.com";

// async function getAuthHeaders() {
//   const token = await SecureStore.getItemAsync("auth_token");

//   return {
//     "Content-Type": "application/json",
//     Accept: "application/json",
//     ...(token ? { Authorization: `Bearer ${token}` } : {}),
//   };
// }
async function getAuthHeaders() {
  const token = await getAuthToken();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generic request helper:
 * - Adds JSON headers
 * - Parses JSON safely
 * - Throws human-readable errors
 */

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
  name: string;
  room: string;
  dietaryRestrictions: string[];
  caregiverId?: string | null;
};

/* --------------------------- Caregivers -------------------------- */
// Adjust routes if your backend uses /api/caregivers etc.

export function getCaregivers() {
  return request<Caregiver[]>("/caregivers");
}

export function createCaregiver(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      role: "ROLE_CAREGIVER",
    }),
  });
}

/* ------------------------- Kitchen Staff ------------------------- */
export function getKitchenStaff() {
  return request<KitchenStaff[]>("/kitchen-staff");
}

export function createKitchenStaff(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      role: "ROLE_KITCHEN",
    }),
  });
}


/* ---------------------------- Residents -------------------------- */
export function getResidents() {
  return request<Resident[]>("/residents");
}

export function createResident(payload: {
  name: string;
  room: string;
  dietaryRestrictions: string[];
}) {
  return request<Resident>("/residents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function assignResident(residentId: string, caregiverId: string | null) {
  return request<Resident>(`/residents/${residentId}/assign`, {
    method: "PUT",
    body: JSON.stringify({ caregiverId }),
  });
}
