/**
 * notificationService.ts
 * ------------------------------------------------------------------
 * Wraps @notifee/react-native to schedule local mealtime reminders
 * that fire even when the app is closed.
 *
 * Call `initNotifications()` once on app start.
 * Call `scheduleMealtimeReminders()` whenever orders/state changes
 * to re-sync scheduled reminders (it clears + reschedules everything).
 * Call `cancelAllMealtimeReminders()` on logout or when disabled.
 */
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
  TimestampTrigger,
  RepeatFrequency,
} from "@notifee/react-native";
import { Platform } from "react-native";
import { MEAL_WINDOWS, MealPeriod } from "./mealtimeReminderService";

const CHANNEL_ID = "mealtime-reminders";
const CHANNEL_NAME = "Mealtime Reminders";
const REMINDER_ID_PREFIX = "mealtime-";

/** Ensure permissions + Android channel exist. Safe to call multiple times. */
export async function initNotifications(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const granted =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (Platform.OS === "android") {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: CHANNEL_NAME,
        importance: AndroidImportance.HIGH,
        sound: "default",
      });
    }

    return granted;
  } catch (err) {
    console.warn("[notifications] init failed:", err);
    return false;
  }
}

/**
 * Schedule a daily reminder 30 minutes before each meal window.
 * Cancels any previous mealtime reminders first, so this is safe to
 * re-run whenever settings change.
 *
 * @param residentName Shown in the notification body (optional).
 */
export async function scheduleMealtimeReminders(residentName: string = "You"): Promise<void> {
  try {
    await cancelAllMealtimeReminders();

    for (const window of MEAL_WINDOWS) {
      const reminderHour = Math.floor(window.reminderStart / 60);
      const reminderMinute = window.reminderStart % 60;

      const fireAt = nextOccurrence(reminderHour, reminderMinute);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: fireAt.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      };

      await notifee.createTriggerNotification(
        {
          id: `${REMINDER_ID_PREFIX}${window.period.toLowerCase()}`,
          title: `${window.emoji} ${window.period} in 30 minutes`,
          body: `${residentName}, don't forget to choose your ${window.period.toLowerCase()}!`,
          android: {
            channelId: CHANNEL_ID,
            pressAction: { id: "default" },
            smallIcon: "ic_launcher",
          },
          ios: {
            sound: "default",
          },
        },
        trigger,
      );
    }
  } catch (err) {
    console.warn("[notifications] schedule failed:", err);
  }
}

/** Cancel all scheduled mealtime reminders. */
export async function cancelAllMealtimeReminders(): Promise<void> {
  try {
    const ids = MEAL_WINDOWS.map((w) => `${REMINDER_ID_PREFIX}${w.period.toLowerCase()}`);
    await Promise.all(ids.map((id) => notifee.cancelTriggerNotification(id)));
  } catch (err) {
    console.warn("[notifications] cancel failed:", err);
  }
}

/**
 * Schedule a one-off mealtime-now reminder for a specific period if it
 * hasn't already passed today. Useful for catching a resident who hasn't
 * ordered yet AT meal start time.
 */
export async function scheduleMealStartReminder(period: MealPeriod, residentName: string): Promise<void> {
  try {
    const window = MEAL_WINDOWS.find((w) => w.period === period);
    if (!window) return;

    const hour = Math.floor(window.mealStart / 60);
    const minute = window.mealStart % 60;
    const fireAt = nextOccurrence(hour, minute);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireAt.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        id: `${REMINDER_ID_PREFIX}${period.toLowerCase()}-now`,
        title: `${window.emoji} ${period} time!`,
        body: `${residentName}, tap to pick your ${period.toLowerCase()} meal.`,
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: "default" },
          smallIcon: "ic_launcher",
        },
        ios: { sound: "default" },
      },
      trigger,
    );
  } catch (err) {
    console.warn("[notifications] schedule start failed:", err);
  }
}

/** Compute the next Date matching a given hour:minute (today if still upcoming, else tomorrow). */
function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const fire = new Date();
  fire.setHours(hour, minute, 0, 0);
  if (fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + 1);
  }
  return fire;
}

/** Fire an immediate notification — useful for debug/testing the pipeline. */
export async function testNotificationNow(): Promise<void> {
  try {
    await notifee.displayNotification({
      title: "🍽️ TrayMate test",
      body: "Notifications are working!",
      android: {
        channelId: CHANNEL_ID,
        smallIcon: "ic_launcher",
      },
    });
  } catch (err) {
    console.warn("[notifications] test failed:", err);
  }
}
