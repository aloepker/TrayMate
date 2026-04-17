/**
 * Mealtime Reminder Service
 * ------------------------------------------------------------------
 * Pure logic for figuring out if it's time to nudge a resident/caregiver
 * about placing a meal order. No React, no side effects — easy to test.
 *
 * Meal windows (local time):
 *   Breakfast:  7:00 AM  ordering cutoff at 9:00 AM
 *   Lunch:     11:30 AM  ordering cutoff at 1:30 PM
 *   Dinner:     5:00 PM  ordering cutoff at 7:00 PM
 *
 * Reminders fire 30 minutes BEFORE the meal start, and again at start
 * if still not ordered. No reminder fires after the cutoff for that meal.
 */

export type MealPeriod = "Breakfast" | "Lunch" | "Dinner";

export interface MealWindow {
  period: MealPeriod;
  /** Reminder fires at this minute-of-day (e.g. 30 min before meal start) */
  reminderStart: number;
  /** Meal starts at this minute-of-day */
  mealStart: number;
  /** No more reminders after this minute-of-day */
  mealEnd: number;
  emoji: string;
}

// minute-of-day = hour * 60 + minute
const MIN = (h: number, m: number) => h * 60 + m;

export const MEAL_WINDOWS: MealWindow[] = [
  { period: "Breakfast", reminderStart: MIN(6, 30),  mealStart: MIN(7, 0),   mealEnd: MIN(9, 0),  emoji: "🌅" },
  { period: "Lunch",     reminderStart: MIN(11, 0),  mealStart: MIN(11, 30), mealEnd: MIN(13, 30), emoji: "🍽️" },
  { period: "Dinner",    reminderStart: MIN(16, 30), mealStart: MIN(17, 0),  mealEnd: MIN(19, 0),  emoji: "🌙" },
];

/** True if `date` is same calendar day as today. */
export function isSameDay(date: Date, today: Date = new Date()): boolean {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/** Returns the MealWindow that is currently in its reminder phase, or null. */
export function getActiveReminderWindow(now: Date = new Date()): MealWindow | null {
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  for (const w of MEAL_WINDOWS) {
    if (minuteOfDay >= w.reminderStart && minuteOfDay < w.mealEnd) {
      return w;
    }
  }
  return null;
}

/**
 * Given a set of today's orders (with placedAt + item period), returns
 * whether the resident has already ordered for the given meal period today.
 *
 * We look at the item meal period of the FIRST item — multi-period carts
 * are rare and if any item matches, we consider it covered.
 */
export function hasOrderedForPeriod(
  period: MealPeriod,
  orders: ReadonlyArray<{ placedAt: Date | string; items: ReadonlyArray<any>; status: string }>,
  now: Date = new Date(),
): boolean {
  return orders.some((o) => {
    if (o.status === "cancelled") return false;
    const placed = typeof o.placedAt === "string" ? new Date(o.placedAt) : o.placedAt;
    if (!isSameDay(placed, now)) return false;
    return o.items.some((item) => item.mealPeriod === period);
  });
}

/**
 * Returns a human-friendly reminder message for a meal window, or null
 * if no reminder should fire right now.
 *
 * @param orders Today's orders for the resident
 * @param residentName Display name used in the message
 * @param now Override for testing
 */
export function buildReminder(
  orders: ReadonlyArray<{ placedAt: Date | string; items: ReadonlyArray<any>; status: string }>,
  residentName: string,
  now: Date = new Date(),
): { period: MealPeriod; title: string; body: string; emoji: string } | null {
  const window = getActiveReminderWindow(now);
  if (!window) return null;
  if (hasOrderedForPeriod(window.period, orders, now)) return null;

  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const minutesUntilStart = window.mealStart - minuteOfDay;

  const title =
    minutesUntilStart > 0
      ? `${window.period} in ${minutesUntilStart} min`
      : `${window.period} time!`;

  const body =
    minutesUntilStart > 0
      ? `${residentName}, tap to choose your ${window.period.toLowerCase()} meal before it starts.`
      : `${residentName}, you haven't ordered ${window.period.toLowerCase()} yet. Tap to browse.`;

  return { period: window.period, title, body, emoji: window.emoji };
}

/**
 * De-dup key so the same reminder doesn't fire repeatedly.
 * Example: "Breakfast-2026-04-16-pre" (30-min warning)
 *          "Breakfast-2026-04-16-now" (meal-start reminder)
 */
export function getReminderKey(period: MealPeriod, now: Date = new Date()): string {
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const window = MEAL_WINDOWS.find((w) => w.period === period)!;
  const phase = minuteOfDay < window.mealStart ? "pre" : "now";
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `${period}-${date}-${phase}`;
}
