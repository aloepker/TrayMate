/**
 * usePendingAutoOrders.ts
 * ──────────────────────────────────────────────────────────────────────
 * Polls the user's inbox for `[PENDING-AUTO-ORDER]` messages and pops
 * an Alert with Confirm / Deny buttons when one arrives. Used by both
 * the caregiver and admin dashboards.
 *
 * On Confirm — calls the backend directly to place the order on behalf
 * of the resident, then marks the conversation read so the popup
 * doesn't reappear next poll.
 *
 * On Deny — just marks the conversation read.
 *
 * Notification dedupe is by chat senderId: each pending alert from
 * resident X collapses to a single popup per session, so a slow or
 * stuck poll can't spam the staff member.
 */
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { getChats, deleteConversation } from "../../services/api";
import {
  decodePendingAutoOrder,
  confirmPendingAutoOrder,
  AUTO_ORDER_PREFIX,
} from "../../services/autoOrderRequest";

/**
 * Mark a conversation as read by deleting it. Backend doesn't expose a
 * "mark read" endpoint per-conversation; deleting is destructive so we
 * skip it for now and just rely on the in-session ref to suppress
 * duplicate popups. (If we add a proper read endpoint later, swap it in.)
 */
async function dismissChatLocally(_senderId: string): Promise<void> {
  // No-op for now — see comment above. Kept as a function so callers
  // don't change when we wire up a real "mark read" endpoint.
  return;
}

const POLL_INTERVAL_MS = 15_000; // 15 seconds — good balance of freshness vs server load

export function usePendingAutoOrders(enabled: boolean = true): void {
  // In-session lock: senderIds of chats whose pending alert we've already
  // popped this session. Prevents the alert from re-showing every poll
  // while the staff member is mid-decision.
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const checkInbox = async () => {
      try {
        const chats = await getChats();
        if (cancelled) return;

        for (const chat of chats) {
          if (cancelled) break;
          if (chat.isRead) continue;
          if (!chat.content?.startsWith(AUTO_ORDER_PREFIX)) continue;

          // Use senderId as the dedupe key — one pending alert per
          // resident per session is plenty. If the resident sends a
          // second pending message for a different period, it'll have
          // a fresh chat preview but the same senderId; the alert
          // won't re-pop until we restart. Acceptable for v1.
          if (handledRef.current.has(chat.senderId)) continue;

          const req = decodePendingAutoOrder(chat.content);
          if (!req) continue;

          handledRef.current.add(chat.senderId);

          const itemBullets = req.items.map((i) => `• ${i.name}`).join("\n");
          Alert.alert(
            "Pending Auto-Order",
            `${req.residentName} hasn't ordered ${req.period} yet.\n\n${itemBullets}\n\nPlace this order on their behalf?`,
            [
              {
                text: "Deny",
                style: "cancel",
                onPress: () => {
                  // Release the in-session lock so a future request from
                  // the same resident can still surface; just don't act
                  // on this one.
                  handledRef.current.delete(chat.senderId);
                  dismissChatLocally(chat.senderId).catch(() => {});
                },
              },
              {
                text: "Confirm & Place",
                onPress: async () => {
                  try {
                    await confirmPendingAutoOrder(req);
                    Alert.alert(
                      "Order Placed",
                      `${req.period} placed for ${req.residentName}: ${req.items.map((i) => i.name).join(", ")}`,
                    );
                  } catch (err: any) {
                    handledRef.current.delete(chat.senderId);
                    Alert.alert(
                      "Could not place order",
                      err?.message ?? "Please try again or place manually.",
                    );
                  }
                },
              },
            ],
            { cancelable: false },
          );
        }
      } catch {
        // Silent — polling is best-effort. Next tick will retry.
      }
    };

    // Run immediately, then on the interval.
    checkInbox();
    const id = setInterval(checkInbox, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);
}
