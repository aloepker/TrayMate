/**
 * autoOrderRequest.ts
 * ──────────────────────────────────────────────────────────────────────
 * Pending auto-order broadcast + confirmation flow.
 *
 * When a resident's tablet detects that 15 minutes have passed into a
 * meal period without an order, the resident sees a local "Confirm
 * Auto-Order" Alert. On top of that, we broadcast a structured message
 * to all of the resident's assigned caregivers AND every admin user, so
 * staff can also confirm or deny from their dashboards if the resident
 * is unable or unavailable to act.
 *
 * Why messages? They reuse the existing /messages infrastructure so we
 * don't need any new backend endpoints — caregivers and admins already
 * poll their inbox; we just teach the inbox to recognise our prefix and
 * surface a popup with action buttons.
 *
 * Wire format (single line, prefix + JSON):
 *   [PENDING-AUTO-ORDER] {"residentId":"123","residentName":"Bobby",...}
 */
import {
  sendMessage,
  getMessageUsers,
  getMe,
  placeOrderApi,
  type MessageUser,
} from "./api";

export const AUTO_ORDER_PREFIX = "[PENDING-AUTO-ORDER]";

export type PendingAutoOrder = {
  residentId: string;
  residentName: string;
  period: string;          // "Breakfast" | "Lunch" | "Dinner"
  date: string;            // YYYY-MM-DD
  items: Array<{ id: string | number; name: string; mealPeriod?: string }>;
};

/** Build the wire-format string for a pending auto-order request. */
export function encodePendingAutoOrder(req: PendingAutoOrder): string {
  return `${AUTO_ORDER_PREFIX} ${JSON.stringify(req)}`;
}

/**
 * Parse a message body. Returns null if it isn't a pending auto-order
 * message (so callers can treat the rest as plain text).
 */
export function decodePendingAutoOrder(body: string): PendingAutoOrder | null {
  if (!body || !body.startsWith(AUTO_ORDER_PREFIX)) return null;
  const json = body.slice(AUTO_ORDER_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(json);
    if (!parsed?.residentId || !parsed?.period || !Array.isArray(parsed?.items)) return null;
    return parsed as PendingAutoOrder;
  } catch {
    return null;
  }
}

/**
 * Send the pending auto-order request to all assigned caregivers and
 * every admin user. Best-effort — message sends are independent so one
 * failure doesn't take down the others.
 */
export async function broadcastPendingAutoOrder(
  req: PendingAutoOrder,
  assignedCaregiverIds: string[],
): Promise<void> {
  const body = encodePendingAutoOrder(req);

  // Get the current user's id so we can exclude them from the fan-out.
  // Without this, an admin viewing as a resident receives their OWN
  // request message and gets the "different admin needed" confusion.
  let currentUserId: string | null = null;
  try {
    const me = await getMe();
    currentUserId = String(me.id);
  } catch {
    // If /auth/me fails, we just don't dedupe. Better to over-notify
    // than block the broadcast entirely.
  }

  const isSelf = (id: string) =>
    currentUserId !== null && String(id) === currentUserId;

  // Caregiver fan-out — skip self, in parallel, swallow individual failures.
  const cgSends = assignedCaregiverIds
    .filter((id) => !isSelf(id))
    .map((id) => sendMessage(id, body).catch(() => {}));

  // Admin fan-out — fetch the full user list once and pick admins.
  let admins: MessageUser[] = [];
  try {
    const users = await getMessageUsers();
    admins = users.filter((u) => u.role === "ROLE_ADMIN" && !isSelf(u.id));
  } catch {
    // If the user list is unavailable, just skip admins. Caregivers
    // still get the alert.
  }
  const adminSends = admins.map((u) =>
    sendMessage(u.id, body).catch(() => {}),
  );

  await Promise.all([...cgSends, ...adminSends]);
}

/**
 * Place the order on behalf of a resident. Used by caregivers/admins
 * after they tap "Confirm" in the dashboard popup. Bypasses the local
 * cart — calls the backend directly with the meal IDs we encoded in
 * the message body.
 */
export async function confirmPendingAutoOrder(req: PendingAutoOrder): Promise<void> {
  const mealIds = req.items.map((i) => String(i.id)).filter(Boolean).join(",");
  await placeOrderApi({
    date: req.date,
    mealOfDay: req.period,
    userId: req.residentId,
    status: "pending",
    mealItemsIdNumbers: mealIds,
  });
}
