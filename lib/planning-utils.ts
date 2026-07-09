import { platforms } from "@/lib/mock-data";
import { campaignForQueueItem, performanceInsights } from "@/lib/performance-insights";
import type { Campaign, ContentAngle, LibrarySource, MediaAsset, Opportunity, Platform, PostQueueItem } from "@/lib/types";
import { calendarDateKey, calendarItemDate, normalizeQueueStatus, queueContentType } from "@/lib/queue-calendar";

export type WeeklyPlanSourceType =
  | "Ready to Post item"
  | "Opportunity"
  | "Conduit Brain theme"
  | "Performance insight"
  | "Repurpose candidate"
  | "Media Library asset"
  | "Balanced filler";

export type WeeklyPlanStatus = "Suggested" | "Draft needed" | "Ready" | "Scheduled" | "Posted";

export type WeeklyPlanSlot = {
  id: string;
  isoDate: string;
  dayLabel: string;
  dateLabel: string;
  platform: Platform;
  postingAccount: string;
  contentAngle: ContentAngle;
  sourceType: WeeklyPlanSourceType;
  sourceLabel: string;
  relatedId?: string;
  reason: string;
  status: WeeklyPlanStatus;
};

export function uniqueLabels(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function firstBrainTheme(sources: LibrarySource[]) {
  for (const source of sources) {
    const theme = source.analysis?.keyThemes?.find(Boolean);
    if (theme) return theme;
    const topic = source.analysis?.commonTopics?.split(",").map((item) => item.trim()).find(Boolean);
    if (topic) return topic;
    const tag = source.tags?.find(Boolean);
    if (tag) return tag;
  }
  return "";
}

export function mostRepeatedLabel(values: string[], threshold: number) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value.trim()) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return Array.from(counts.entries()).find(([, count]) => count >= threshold)?.[0] || "";
}

export function nextSevenDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}

export function weeklyPlanDateLabels(date: Date) {
  return {
    isoDate: date.toISOString(),
    dayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
    dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  };
}

export function buildWeeklyContentPlan({
  queue,
  campaigns,
  opportunities,
  librarySources,
  mediaAssets,
  version
}: {
  queue: PostQueueItem[];
  campaigns: Campaign[];
  opportunities: Opportunity[];
  librarySources: LibrarySource[];
  mediaAssets: MediaAsset[];
  version: number;
}) {
  const dates = nextSevenDates();
  const startTime = new Date(dates[0]);
  startTime.setHours(0, 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setDate(startTime.getDate() + 7);
  const insights = performanceInsights(queue, campaigns);
  const activeBrainSources = librarySources.filter((source) => source.reviewStatus !== "Save only");
  const brainThemes = uniqueLabels(
    activeBrainSources.flatMap((source) => [
      ...(source.analysis?.keyThemes ?? []),
      source.analysis?.commonTopics?.split(",")[0] ?? "",
      ...(source.tags ?? [])
    ])
  );
  const readyPosts = queue.filter((item) => queueContentType(item) === "Post" && normalizeQueueStatus(item.status) === "Ready");
  const scheduledOrPosted = queue
    .filter((item) => {
      const date = calendarItemDate(item);
      if (!date) return false;
      const time = new Date(date).getTime();
      const status = normalizeQueueStatus(item.status);
      return status !== "Archived" && time >= startTime.getTime() && time < endTime.getTime();
    })
    .sort((a, b) => new Date(calendarItemDate(a)).getTime() - new Date(calendarItemDate(b)).getTime());
  const activeOpportunities = opportunities.filter((item) => item.status !== "Archived" && item.status !== "Posted");
  const candidateAngles: ContentAngle[] = [
    "Company update",
    "Founder build-in-public",
    "Industry POV",
    "Behind the scenes",
    "Customer proof",
    "Technical explanation",
    "Product launch"
  ];
  const candidatePlatforms: Platform[] = ["LinkedIn", "X", "Instagram", "LinkedIn", "TikTok", "X", "Instagram"];
  const candidates: Array<Omit<WeeklyPlanSlot, "id" | "isoDate" | "dayLabel" | "dateLabel">> = [
    ...readyPosts.map((item) => ({
      platform: item.platform,
      postingAccount: item.profileName || "Conduit",
      contentAngle: (item.contentAngle || campaignForQueueItem(item, campaigns)?.contentAngle || "Company update") as ContentAngle,
      sourceType: "Ready to Post item" as const,
      sourceLabel: item.campaignName,
      relatedId: item.id,
      reason: "Already approved. Schedule or publish it before creating more new drafts.",
      status: "Ready" as const
    })),
    ...activeOpportunities.map((item) => ({
      platform: (platforms.includes(item.platform as Platform) ? item.platform : "LinkedIn") as Platform,
      postingAccount: "Conduit",
      contentAngle: "Industry POV" as ContentAngle,
      sourceType: "Opportunity" as const,
      sourceLabel: item.title,
      relatedId: item.id,
      reason: item.analysis?.suggestedConduitAngle || "Turn this live opportunity into a post or reply while the context is fresh.",
      status: "Draft needed" as const
    })),
    ...insights.suggestions.map((suggestion) => ({
      platform: suggestion.platform,
      postingAccount: "Conduit",
      contentAngle: suggestion.contentAngle || "Company update",
      sourceType: "Performance insight" as const,
      sourceLabel: suggestion.idea,
      reason: "Manual metrics point to this as a useful next test.",
      status: "Draft needed" as const
    })),
    ...brainThemes.map((theme, index) => ({
      platform: index % 2 === 0 ? "LinkedIn" as Platform : "X" as Platform,
      postingAccount: "Conduit",
      contentAngle: index % 2 === 0 ? "Industry POV" as ContentAngle : "Technical explanation" as ContentAngle,
      sourceType: "Conduit Brain theme" as const,
      sourceLabel: theme,
      reason: `Use Company Knowledge around ${theme} to create a grounded post.`,
      status: "Draft needed" as const
    })),
    ...insights.topByInteractions.slice(0, 2).map((item) => ({
      platform: item.platform,
      postingAccount: item.profileName || "Conduit",
      contentAngle: (item.contentAngle || campaignForQueueItem(item, campaigns)?.contentAngle || "Company update") as ContentAngle,
      sourceType: "Repurpose candidate" as const,
      sourceLabel: item.campaignName,
      relatedId: item.id,
      reason: "This posted item has a performance signal worth adapting into another native post.",
      status: "Draft needed" as const
    })),
    ...mediaAssets.slice(0, 3).map((asset, index) => ({
      platform: index % 2 === 0 ? "Instagram" as Platform : "LinkedIn" as Platform,
      postingAccount: "Conduit",
      contentAngle: (asset.suggestedAngles?.[0] as ContentAngle) || "Behind the scenes",
      sourceType: "Media Library asset" as const,
      sourceLabel: asset.filename,
      relatedId: asset.id,
      reason: asset.description || "Use a reusable media asset as the visual proof point for a post.",
      status: "Draft needed" as const
    }))
  ];

  const slots: WeeklyPlanSlot[] = scheduledOrPosted.map((item, index) => {
    const date = new Date(calendarItemDate(item));
    const labels = weeklyPlanDateLabels(date);
    const status = normalizeQueueStatus(item.status);
    return {
      id: `existing-${item.id}`,
      ...labels,
      platform: item.platform,
      postingAccount: item.profileName || "Conduit",
      contentAngle: (item.contentAngle || campaignForQueueItem(item, campaigns)?.contentAngle || "Company update") as ContentAngle,
      sourceType: "Ready to Post item",
      sourceLabel: item.campaignName,
      relatedId: item.id,
      reason: index === 0 ? "Already on the calendar. The plan builds around this instead of overwriting it." : "Existing scheduled or posted item.",
      status: status === "Posted" || status === "Replied" ? "Posted" : status === "Scheduled" ? "Scheduled" : "Ready"
    };
  });

  const usedDates = new Set(slots.map((slot) => calendarDateKey(slot.isoDate)));
  const rotation = version % Math.max(candidates.length, 1);
  const rotatedCandidates = candidates.slice(rotation).concat(candidates.slice(0, rotation));
  let candidateIndex = 0;
  dates.forEach((date, dateIndex) => {
    if (slots.length >= 7) return;
    const dateKey = calendarDateKey(date.toISOString());
    if (usedDates.has(dateKey) && slots.length >= 5) return;
    const candidate = rotatedCandidates[candidateIndex] ?? {
      platform: candidatePlatforms[dateIndex % candidatePlatforms.length],
      postingAccount: "Conduit",
      contentAngle: candidateAngles[dateIndex % candidateAngles.length],
      sourceType: "Balanced filler" as const,
      sourceLabel: `${candidateAngles[dateIndex % candidateAngles.length]} idea`,
      reason: activeBrainSources.length > 0
        ? "Use an active Conduit Brain source to cover a useful angle this week."
        : "Create one grounded Conduit post so the week has a clear company-owned point of view.",
      status: "Suggested" as const
    };
    candidateIndex += 1;
    const labels = weeklyPlanDateLabels(date);
    slots.push({
      id: `${candidate.sourceType}-${candidate.relatedId ?? candidate.sourceLabel}-${dateKey}-${dateIndex}`,
      ...labels,
      ...candidate
    });
  });

  return slots
    .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime())
    .slice(0, 7);
}
