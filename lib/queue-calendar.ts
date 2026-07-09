import type { PostQueueItem, QueueStatus } from "@/lib/types";

export const queueStatuses: QueueStatus[] = ["Ready", "Scheduled", "Posted", "Replied", "Archived"];

export function normalizeQueueStatus(status?: string): QueueStatus {
  const match = queueStatuses.find(
    (item) => item.toLowerCase() === String(status ?? "").toLowerCase()
  );
  return match ?? "Ready";
}

export function queueContentType(item: PostQueueItem) {
  return item.contentType === "Reply" ? "Reply" : "Post";
}

export function calendarItemDate(item: PostQueueItem) {
  const status = normalizeQueueStatus(item.status);
  if ((status === "Posted" || status === "Replied") && item.postedAt) return item.postedAt;
  return item.plannedAt || item.postedAt || "";
}

export function scheduledCalendarItems(queue: PostQueueItem[]) {
  return queue
    .filter((item) => {
      const status = normalizeQueueStatus(item.status);
      return Boolean(calendarItemDate(item)) && status !== "Archived";
    })
    .sort((a, b) => new Date(calendarItemDate(a)).getTime() - new Date(calendarItemDate(b)).getTime());
}

export function calendarDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTodayDate(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return calendarDateKey(value) === calendarDateKey(new Date().toISOString());
}

export function isThisWeekDate(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

export function isWithinLastDays(value?: string, days = 7) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - days + 1);
  return date >= start && date <= now;
}

export function calendarDaysForMonth(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<Date | null> = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    days.push(null);
  }
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

export function groupQueueItemsByDate(items: PostQueueItem[]) {
  const groups = new Map<string, PostQueueItem[]>();
  items.forEach((item) => {
    const date = calendarItemDate(item);
    if (!date) return;
    const key = calendarDateKey(date);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return Array.from(groups.entries())
    .map(([date, groupItems]) => ({
      date,
      items: groupItems.sort((a, b) => new Date(calendarItemDate(a)).getTime() - new Date(calendarItemDate(b)).getTime())
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
