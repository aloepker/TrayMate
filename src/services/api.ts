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

  // Common for DELETE: backend returns 204 No Content
  if (res.status === 204) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return null as unknown as T;
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

 
  const looksLikeJson =
    text.trim().startsWith("{") || text.trim().startsWith("[");

  let data: any = null;

  if ((contentType.includes("application/json") || looksLikeJson) && text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  } else {
    // plain text like "Deleted" or empty string
    data = text || null;
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;
    const error = new Error(message) as Error & {
      status?: number;
      data?: any;
    };
    error.status = res.status;
    error.data = data;
    throw error;
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
 * - ["nuts", "dairy"]                              (plain array)
 * - "nuts, dairy"                                  (comma-separated string)
 * - [{ name: "nuts" }, { label: "dairy" }]         (array of objects)
 * This converts anything into a clean string[].
 */
function normalizeStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v == null) return "";
        if (typeof v === "string") return v.trim();
        if (typeof v === "object") {
          return String(v.name ?? v.label ?? v.value ?? v.title ?? "").trim();
        }
        return String(v).trim();
      })
      .filter(Boolean);
  }
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

/**
 * UPDATED Resident type
 *
 * Previously Resident only included:
 * id, name, room, dietaryRestrictions
 *
 * Expanded it so the caregiver dashboard can show
 * the real medical information collected in AddResidentModal:
 *
 * - medicalConditions
 * - foodAllergies
 * - medications
 *
 * These fields are displayed in the caregiver resident popup.
 */
export type Resident = {
  id: string;
  name: string;
  room: string;
  dietaryRestrictions: string[];
  medicalConditions: string[];
  foodAllergies: string[];
  medications: string[];
  caregiverId?: string | null;
};

/**
 * Notification object used by caregiver dashboard
 *
 * Represents alerts coming from the kitchen
 */
export type KitchenNotification = {
  id: string;
  residentId: string;
  message: string;
  status?: string;
  createdAt?: string;
  read?: boolean;
};


 // id, fullName, roomNumber, foodAllergies

type ResidentApi = {
  id: string | number;
  fullName?: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  roomNumber?: string | number;
  room?: string | number;


  dietaryRestrictions?: any;
  foodAllergies?: any;
  medicalConditions?: any;
  medications?: any;

  caregiverId?: string | null;
};

/**
 * Maps backend Resident -> frontend Resident
 * so the dashboard can display correctly.
 */
function mapResident(api: ResidentApi): Resident {
  const builtName = [api.firstName, api.middleName, api.lastName]
    .filter((part) => String(part ?? "").trim().length > 0)
    .join(" ")
    .trim();

  return {
    id: String(api.id),
    name: String(api.fullName ?? api.name ?? builtName ?? ""),
    room: String(api.roomNumber ?? api.room ?? ""),
    dietaryRestrictions: normalizeStringArray(api.dietaryRestrictions),
    medicalConditions: normalizeStringArray(api.medicalConditions),
    foodAllergies: normalizeStringArray(api.foodAllergies),
    medications: normalizeStringArray(api.medications),
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
 * GET caregiver's assigned residents
 * Endpoint: /caregiver/residents
 * This should return ONLY residents assigned to the logged-in caregiver.
 */
export async function getCaregiverResidents(): Promise<Resident[]> {
  const raw = await request<any>("/caregiver/residents");
  const list = unwrapList<ResidentApi>(raw);
  return list.map(mapResident);
}



/**
 * NEW: Caregiver Notifications
 *
 * GET /caregiver/notifications
 *
 * Returns alerts related to the caregiver's assigned residents.
 *
 * Example notifications:
 * - Kitchen order ready
 * - Meal preparation updates
 * - Dietary restriction alerts
 *
 * These are shown in the caregiver dashboard
 * notification bell icon.
 */

export async function getCaregiverNotifications(): Promise<KitchenNotification[]> {
  const raw = await request<any>("/caregiver/notifications");
  return unwrapList<KitchenNotification>(raw);
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
 * Update resident (EDIT)
 * Endpoint: PUT /admin/residents/{id}
 * Backend expects:
 *  - fullName
 *  - roomNumber
 *  - foodAllergies
 */
export async function updateResident(
  id: string,
  payload: {
    name: string;
    room: string;
    dietaryRestrictions: string[];
  }
): Promise<Resident> {
  const updated = await request<ResidentApi>(`/admin/residents/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      fullName: payload.name,
      roomNumber: payload.room,
      foodAllergies: payload.dietaryRestrictions,
    }),
  });

  return mapResident(updated);
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

/**
 * Delete entity (resident or user)
 *
 * Backend endpoint:
 * DELETE /admin/delete/{type}/{id}
 *
 * type:
 *   - "resident" for residents
 *   - "user" for caregiver + kitchen staff
 */
export async function deleteEntity(
  type: "resident" | "user",
  id: string
): Promise<void> {
  await request<void>(`/admin/delete/${type}/${id}`, {
    method: "DELETE",
  });
}

/* ========================= Meal Orders API ========================= */

/**
 * Shape returned by the backend for a single order.
 */
export type MealOrderResponse = {
  id: number;
  date: string;            // "YYYY-MM-DD"
  mealOfDay: string;       // "Breakfast" | "Lunch" | "Dinner"
  userId: string;
  status: string;          // "pending", etc.
  mealItemsIdNumbers: string; // comma-separated meal IDs, e.g. "3, 5, 6"
};

/**
 * Backend meal item (returned inside order history / search).
 */
export type BackendMealItem = {
  id: number;
  name: string;
  ingredients: string;
  description: string;
  imageUrl: string;
  mealtype: string;
  mealperiod: string;
  timeRange: string;
  allergenInfo: string;
  tags: string;
  available: boolean;
  seasonal: boolean;
  nutrition: string;
  calories: number;
  sodium: number;
  protein: number;
};

/**
 * Shape returned by history / search endpoints — order + resolved meals.
 */
export type MealOrderWithMeals = {
  order: MealOrderResponse;
  meals: BackendMealItem[];
};

/**
 * Error body returned on 409 conflict.
 */
export type MealOrderConflict = {
  errorCode: "PENDING_CONFLICT";
  message: string;
  data: MealOrderResponse;
};

/**
 * 1) Place an order.
 *    POST /mealOrders
 *    Returns 201 on success, throws with 409 body on conflict.
 */
export async function placeOrderApi(payload: {
  date: string;
  mealOfDay: string;
  userId: string;
  status?: string;
  mealItemsIdNumbers: string;
}): Promise<MealOrderResponse> {
  return request<MealOrderResponse>("/mealOrders", {
    method: "POST",
    body: JSON.stringify({
      date: payload.date,
      mealOfDay: payload.mealOfDay,
      userId: payload.userId,
      status: payload.status ?? "pending",
      mealItemsIdNumbers: payload.mealItemsIdNumbers,
    }),
  });
}

/**
 * 2) Replace an existing order.
 *    PUT /mealOrders/{orderId}
 */
export async function replaceOrderApi(
  orderId: number,
  payload: {
    date: string;
    mealOfDay: string;
    userId: string;
    status?: string;
    mealItemsIdNumbers: string;
  }
): Promise<MealOrderResponse> {
  return request<MealOrderResponse>(`/mealOrders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({
      date: payload.date,
      mealOfDay: payload.mealOfDay,
      userId: payload.userId,
      status: payload.status ?? "pending",
      mealItemsIdNumbers: payload.mealItemsIdNumbers,
    }),
  });
}

/**
 * 3) Get a resident's order history.
 *    GET /mealOrders/history/{userId}
 */
export async function getOrderHistoryApi(
  userId: string
): Promise<MealOrderWithMeals[]> {
  return request<MealOrderWithMeals[]>(`/mealOrders/history/${userId}`);
}

/**
 * 4) Delete a single order by backend ID.
 *    DELETE /mealOrders/{orderId}
 *    Returns 204 No Content on success.
 */
export async function deleteOrderApi(orderId: number): Promise<void> {
  await request<void>(`/mealOrders/${orderId}`, {
    method: "DELETE",
  });
}

/**
 * 5) Get all orders for a given date and meal period.
 *    GET /mealOrders/search?mealOfDay=X&date=YYYY-MM-DD
 */
export async function searchOrdersApi(
  mealOfDay: string,
  date: string
): Promise<MealOrderWithMeals[]> {
  return request<MealOrderWithMeals[]>(
    `/mealOrders/search?mealOfDay=${encodeURIComponent(mealOfDay)}&date=${encodeURIComponent(date)}`
  );
}



// ========================= MESSAGING API =========================

export type ChatPreview = {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

// GET chats (left side list)
export async function getChats(): Promise<ChatPreview[]> {
  return request<ChatPreview[]>("/messages/chats");
}

// GET conversation between users
export async function getConversation(otherUserId: string): Promise<Message[]> {
  return request<Message[]>(`/messages/conversation/${otherUserId}`);
}

// POST send message
export async function sendMessage(
  receiverId: string,
  content: string
): Promise<void> {
  await request<void>("/messages/send", {
    method: "POST",
    body: JSON.stringify({
      receiverId: Number(receiverId),
      content,
    }),
  });
}

// GET users available for messaging (e.g. to populate the "To" field)
export type MessageUser = {
  id: string;
  fullName: string;
  role: string;
};

export async function getMessageUsers(): Promise<MessageUser[]> {
  const raw = await request<any[]>("/messages/users");

  if (!Array.isArray(raw)) return [];

  return raw.map((user: any) => ({
    id: String(user.id),
    fullName: String(user.fullName ?? ""),
    role: String(user.role ?? ""),
  }));
}

export async function getMe(): Promise<{ id: string; fullName: string; role: string }> {
  const raw = await request<any>("/auth/me");
  return {
    id: String(raw.id),
    fullName: String(raw.fullName ?? ""),
    role: String(raw.role ?? ""),
  };
}
