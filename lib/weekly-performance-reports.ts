import { campaignForQueueItem, mediaTypeForQueueItem } from "@/lib/performance-insights";
import { engagementTotal, metricNumber } from "@/lib/performance-metrics";
import { uniqueLabels } from "@/lib/planning-utils";
import type { Campaign, Platform, PostQueueItem } from "@/lib/types";

export type WeeklyPerformanceChannel = {
  platform: Platform;
  impressions: number;
  engagementRate: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  itemCount: number;
};

export type WeeklyPerformanceReport = {
  id: string;
  title: string;
  channels: Platform[];
  dateLabel: string;
  timeLabel: string;
  mediaName: string;
  mediaType: string;
  mediaPreviewUrl: string;
  totalImpressions: number;
  totalEngagements: number;
  averageEngagementRate: number;
  totalClicks: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  channelBreakdown: WeeklyPerformanceChannel[];
  takeaways: string;
  items: PostQueueItem[];
};

function reportDateParts(value?: string) {
  if (!value) {
    return { dateLabel: "No date", timeLabel: "No time" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: value, timeLabel: "No time" };
  }
  return {
    dateLabel: date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
    timeLabel: date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  };
}

function reportGroupingKey(item: PostQueueItem) {
  return [
    item.campaignId || item.campaignName,
    item.mediaAssetId || item.mediaAssetName || "no-media"
  ].join("::");
}

function defaultReportTakeaways(report: Omit<WeeklyPerformanceReport, "takeaways">) {
  const strongest = [...report.channelBreakdown].sort((a, b) => b.impressions - a.impressions)[0];
  const mediaNote = report.mediaType === "Text-only"
    ? "text-only post; pair a future version with stronger visual proof if useful"
    : `${report.mediaType.toLowerCase()} asset gave the post a clear visual anchor`;

  return [
    strongest ? `- strongest channel: ${strongest.platform} with ${strongest.impressions} impressions` : "- add channel metrics to identify the strongest platform",
    `- average engagement rate: ${report.averageEngagementRate.toFixed(2)}%`,
    `- ${mediaNote}`,
    "- next step: repurpose the clearest takeaway into one native follow-up"
  ].join("\n");
}

export function buildWeeklyPerformanceReports(
  items: PostQueueItem[],
  campaigns: Campaign[],
  savedNotes: Record<string, string>
): WeeklyPerformanceReport[] {
  const groups = new Map<string, PostQueueItem[]>();

  items.forEach((item) => {
    const key = reportGroupingKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.entries())
    .map(([id, groupItems]) => {
      const sortedItems = [...groupItems].sort(
        (a, b) =>
          new Date(a.postedAt || a.updatedAt || a.createdAt).getTime() -
          new Date(b.postedAt || b.updatedAt || b.createdAt).getTime()
      );
      const firstItem = sortedItems[0];
      const campaign = firstItem ? campaignForQueueItem(firstItem, campaigns) : undefined;
      const channels = uniqueLabels(sortedItems.map((item) => item.platform)) as Platform[];
      const totalImpressions = sortedItems.reduce((sum, item) => sum + metricNumber(item.metrics?.impressions), 0);
      const totalEngagements = sortedItems.reduce((sum, item) => sum + engagementTotal(item), 0);
      const totalClicks = sortedItems.reduce((sum, item) => sum + metricNumber(item.metrics?.clicks), 0);
      const totalLikes = sortedItems.reduce((sum, item) => sum + metricNumber(item.metrics?.likes), 0);
      const totalComments = sortedItems.reduce((sum, item) => sum + metricNumber(item.metrics?.comments), 0);
      const totalShares = sortedItems.reduce((sum, item) => sum + metricNumber(item.metrics?.shares), 0);
      const totalSaves = sortedItems.reduce((sum, item) => sum + metricNumber(item.metrics?.saves), 0);
      const averageEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
      const mediaPreviewUrl =
        sortedItems.find((item) => item.mediaPublicUrl)?.mediaPublicUrl ||
        campaign?.mediaContext?.publicUrl ||
        "";
      const mediaName =
        sortedItems.find((item) => item.mediaAssetName)?.mediaAssetName ||
        campaign?.mediaContext?.assetName ||
        campaign?.mediaContext?.filename ||
        (sortedItems.some((item) => item.mediaUsed) ? "Attached media" : "No creative asset");
      const mediaType = sortedItems.some((item) => item.mediaUsed)
        ? mediaTypeForQueueItem(firstItem, campaign)
        : "Text-only";
      const postedAt = firstItem?.postedAt || firstItem?.updatedAt || firstItem?.createdAt;
      const { dateLabel, timeLabel } = reportDateParts(postedAt);
      const channelBreakdown = channels.map((platform) => {
        const platformItems = sortedItems.filter((item) => item.platform === platform);
        const impressions = platformItems.reduce((sum, item) => sum + metricNumber(item.metrics?.impressions), 0);
        const interactions = platformItems.reduce((sum, item) => sum + engagementTotal(item), 0);
        return {
          platform,
          impressions,
          engagementRate: impressions > 0 ? (interactions / impressions) * 100 : 0,
          clicks: platformItems.reduce((sum, item) => sum + metricNumber(item.metrics?.clicks), 0),
          likes: platformItems.reduce((sum, item) => sum + metricNumber(item.metrics?.likes), 0),
          comments: platformItems.reduce((sum, item) => sum + metricNumber(item.metrics?.comments), 0),
          shares: platformItems.reduce((sum, item) => sum + metricNumber(item.metrics?.shares), 0),
          saves: platformItems.reduce((sum, item) => sum + metricNumber(item.metrics?.saves), 0),
          itemCount: platformItems.length
        };
      });
      const reportWithoutTakeaways = {
        id,
        title: firstItem?.campaignName || campaign?.name || "Imported performance report",
        channels,
        dateLabel,
        timeLabel,
        mediaName,
        mediaType,
        mediaPreviewUrl,
        totalImpressions,
        totalEngagements,
        averageEngagementRate,
        totalClicks,
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        channelBreakdown,
        items: sortedItems
      };

      return {
        ...reportWithoutTakeaways,
        takeaways: savedNotes[id] ?? defaultReportTakeaways(reportWithoutTakeaways)
      };
    })
    .sort((a, b) => b.totalImpressions - a.totalImpressions || b.totalEngagements - a.totalEngagements);
}
