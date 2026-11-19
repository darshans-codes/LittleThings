import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { daysUntil, type State } from "./model";

export function reminderDates(state: State, now = new Date()): Date[] {
  const dates = new Map<number, Date>();
  for (const p of state.people.filter((p) => !p.demo)) {
    const birthday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntil(p.birthday, now),
      9,
    );
    for (const offset of [state.reminderDays, 0]) {
      const d = new Date(birthday);
      d.setDate(d.getDate() - offset);
      if (d > now) dates.set(d.getTime(), d);
    }
  }
  return [...dates.values()]
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, 60);
}

let queue: Promise<unknown> = Promise.resolve();
export function syncReminders(
  state: State,
  askPermission = false,
): Promise<number> {
  const operation = queue
    .catch(() => {})
    .then(async () => {
      if (!Capacitor.isNativePlatform()) {
        if (askPermission)
          throw new Error(
            "Install the Android or iPhone app to enable device reminders.",
          );
        return 0;
      }
      let permission = await LocalNotifications.checkPermissions();
      if (askPermission && permission.display !== "granted")
        permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted") {
        if (askPermission)
          throw new Error(
            "Allow notifications in your phone’s settings to enable reminders.",
          );
        return 0;
      }
      const pending = await LocalNotifications.getPending();
      const ours = pending.notifications.filter(
        (n) => n.id >= 600000 && n.id < 600060,
      );
      if (ours.length)
        await LocalNotifications.cancel({
          notifications: ours.map((n) => ({ id: n.id })),
        });
      if (!state.remindersEnabled) return 0;
      const dates = reminderDates(state);
      if (dates.length)
        await LocalNotifications.schedule({
          notifications: dates.map((at, i) => ({
            id: 600000 + i,
            title: "A little celebration is coming",
            body: "Open Keepsake to prepare or review your birthday stories.",
            schedule: { at },
          })),
        });
      return dates.length;
    });
  queue = operation;
  return operation;
}
