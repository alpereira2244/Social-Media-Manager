import { normalizeQueueStatus } from "@/lib/queue-calendar";
import type { Platform, PostQueueItem, QueueStatus } from "@/lib/types";

export type QueueExecutionTab = "Active" | "Scheduled" | "Completed" | "Archived";

export const queueExecutionTabs: QueueExecutionTab[] = ["Active", "Scheduled", "Completed", "Archived"];

export const platformUrls: Record<Platform, string> = {
  Instagram: "https://www.instagram.com/",
  LinkedIn: "https://www.linkedin.com/",
  X: "https://x.com/",
  TikTok: "https://www.tiktok.com/"
};

export const manualPostingSteps: Record<Platform, string[]> = {
  Instagram: [
    "Download media",
    "Copy caption",
    "Open Instagram",
    "Upload media",
    "Paste caption",
    "Publish",
    "Paste live post URL",
    "Add metrics"
  ],
  LinkedIn: [
    "Copy post",
    "Open LinkedIn",
    "Create post",
    "Add media if applicable",
    "Publish",
    "Paste live post URL",
    "Add metrics"
  ],
  X: [
    "Copy post",
    "Open X",
    "Create post/thread",
    "Add media if applicable",
    "Publish",
    "Paste live post URL",
    "Add metrics"
  ],
  TikTok: [
    "Download video/media",
    "Copy caption",
    "Open TikTok",
    "Upload video",
    "Paste caption",
    "Publish",
    "Paste live post URL",
    "Add metrics"
  ]
};

export const manualReplySteps = [
  "Copy reply",
  "Open platform",
  "Find the source comment or post",
  "Paste reply",
  "Publish reply manually",
  "Paste live reply URL if available",
  "Mark replied"
];

export function toDateTimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function queueItemMatchesExecutionTab(item: PostQueueItem, tab: QueueExecutionTab) {
  const status = normalizeQueueStatus(item.status);
  if (item.hiddenFromQueue) return false;
  if (tab === "Active") return status === "Ready";
  if (tab === "Scheduled") return status === "Scheduled";
  if (tab === "Completed") return status === "Posted" || status === "Replied";
  return status === "Archived";
}

export function isDeletableQueueTestItem(item: PostQueueItem) {
  const text = [
    item.id,
    item.generatedPostId,
    item.campaignId,
    item.campaignName,
    item.profileId,
    item.profileName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Boolean(
    item.isSandbox ||
      text.includes("demo") ||
      text.includes("sandbox") ||
      text.includes("test") ||
      text.includes("local")
  );
}

export function queueCompletionStatus(isReply: boolean): QueueStatus {
  return isReply ? "Replied" : "Posted";
}
