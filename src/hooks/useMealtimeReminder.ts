/**
 * useMealtimeReminder
 * ------------------------------------------------------------------
 * Polls the clock every 60 seconds and surfaces a mealtime reminder
 * when a resident hasn't ordered for an upcoming meal period.
 *
 * Each reminder only fires once per phase per day (tracked by an
 * in-memory Set + optional AsyncStorage persistence via `persistKey`).
 *
 * A `buildText` callback is required so that localised title/body
 * strings can be built by the caller (e.g. homeScreen) where the
 * `t` translation object is available.
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

type BuildText = (
  period: MealPeriod,
  phase: 'pre' | 'now',
  minutesUntilStart: number,
) => { title: string; body: string };

export function useMealtimeReminder(
  orders: ReadonlyArray<OrderLike | any>,
  residentName: string,
  enabled: boolean = true,
  buildText?: BuildText,
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

      let title: string;
      let body: string;

      if (buildText) {
        const texts = buildText(built.period, built.phase, built.minutesUntilStart);
        title = texts.title;
        body = texts.body;
      } else {
        // Fallback English strings when no buildText callback is provided
        title =
          built.phase === 'pre'
            ? `${built.period} in ${built.minutesUntilStart} min`
            : `${built.period} time!`;
        body =
          built.phase === 'pre'
            ? `${residentName}, tap to choose your ${built.period.toLowerCase()} meal before it starts.`
            : `${residentName}, you haven't ordered ${built.period.toLowerCase()} yet. Tap to browse.`;
      }

      setReminder({ period: built.period, title, body, emoji: built.emoji, key });
    };

    // Check immediately on mount, then every 60s
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [orders, residentName, enabled, buildText]);

  return { reminder, dismiss };
}
