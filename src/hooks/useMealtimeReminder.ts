/**
 * useMealtimeReminder
 * ------------------------------------------------------------------
 * Polls the clock every 60 seconds and surfaces a mealtime reminder
 * when a resident hasn't ordered for an upcoming meal period.
 *
 * Each reminder only fires once per phase per day (tracked by an
 * in-memory Set + optional AsyncStorage persistence via `persistKey`).
 */
import { useEffect, useState, useRef, useCallback } from "react";
import {
  buildReminder,
  getReminderKey,
  MealPeriod,
} from "../services/mealtimeReminderService";

interface Reminder {
  period: MealPeriod;
  title: string;
  body: string;
  emoji: string;
  key: string;
}

// Accepts any order-shaped object — we only read placedAt, items[].mealPeriod, status
type OrderLike = {
  placedAt: Date | string;
  items: ReadonlyArray<{ mealPeriod?: string } | any>;
  status: string;
};

export function useMealtimeReminder(
  orders: ReadonlyArray<OrderLike | any>,
  residentName: string,
  enabled: boolean = true,
) {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const firedKeys = useRef<Set<string>>(new Set());

  // Dismiss = mark as fired so it doesn't come back for this phase/day
  const dismiss = useCallback(() => {
    if (reminder) firedKeys.current.add(reminder.key);
    setReminder(null);
  }, [reminder]);

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const now = new Date();
      const built = buildReminder(orders, residentName, now);
      if (!built) {
        setReminder(null);
        return;
      }
      const key = getReminderKey(built.period, now);
      if (firedKeys.current.has(key)) return; // already shown+dismissed

      setReminder({ ...built, key });
    };

    // Check immediately on mount, then every 60s
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [orders, residentName, enabled]);

  return { reminder, dismiss };
}
