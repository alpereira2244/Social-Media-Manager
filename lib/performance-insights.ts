import type { Campaign, ContentAngle, LibrarySource, Platform, PostQueueItem, SimpleStyleChip } from "@/lib/types";
import {
  engagementTotal,
  metricNumber,
  metricsHaveValues,
  performanceRate,
  performanceScore
} from "@/lib/performance-metrics";
import { inferMediaKindFromUrl } from "@/lib/media-utils";
import { isWithinLastDays, normalizeQueueStatus, queueContentType } from "@/lib/queue-calendar";
import { platforms } from "@/lib/mock-data";

export type PerformanceAggregate = {
  label: string;
  count: number;
  interactions: number;
  impressions: number;
  score: number;
};

export type PerformanceSuggestion = {
  idea: string;
  platform: Platform;
  contentAngle?: ContentAngle;
  styleChips: SimpleStyleChip[];
};

function uniquePerformanceLabels(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function aggregatePerformance(
  items: PostQueueItem[],
  getLabel: (item: PostQueueItem) => string | undefined
) {
  const groups = new Map<string, PerformanceAggregate>();

  items.forEach((item) => {
    const label = getLabel(item)?.trim() || "Uncategorized";
    const current = groups.get(label) ?? {
      label,
      count: 0,
      interactions: 0,
      impressions: 0,
      score: 0
    };
    current.count += 1;
    current.interactions += engagementTotal(item);
    current.impressions += metricNumber(item.metrics?.impressions);
    current.score += performanceScore(item);
    groups.set(label, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.score - a.score || b.interactions - a.interactions);
}

export function campaignForQueueItem(item: PostQueueItem, campaigns: Campaign[]) {
  return campaigns.find((campaign) => campaign.id === item.campaignId);
}

export function mediaTypeForQueueItem(item: PostQueueItem, campaign?: Campaign) {
  if (!item.mediaUsed && !campaign?.mediaContext) return "Text-only";
  const source =
    item.mediaPublicUrl ||
    item.mediaAssetName ||
    campaign?.mediaContext?.publicUrl ||
    campaign?.mediaContext?.filename ||
    "";
  const kind = inferMediaKindFromUrl(source);
  if (kind === "image") return "Image-backed";
  if (kind === "video") return "Video-backed";
  if (kind === "audio") return "Audio-backed";
  return "Media-backed";
}

export function performanceInsights(queue: PostQueueItem[], campaigns: Campaign[]) {
  const metricItems = queue.filter(
    (item) => queueContentType(item) === "Post" && normalizeQueueStatus(item.status) === "Posted" && metricsHaveValues(item.metrics)
  );
  const confidence = metricItems.length >= 10 ? "High" : metricItems.length >= 3 ? "Medium" : "Low";
  const byPlatform = aggregatePerformance(metricItems, (item) => item.platform);
  const byAngle = aggregatePerformance(metricItems, (item) => item.contentAngle || campaignForQueueItem(item, campaigns)?.contentAngle);
  const byAccount = aggregatePerformance(metricItems, (item) => item.profileName);
  const byStyle = aggregatePerformance(metricItems, (item) => {
    const campaign = campaignForQueueItem(item, campaigns);
    return campaign?.simpleStyleChips?.[0] || "Conduit default";
  });
  const byMediaType = aggregatePerformance(metricItems, (item) => {
    const campaign = campaignForQueueItem(item, campaigns);
    return mediaTypeForQueueItem(item, campaign);
  });
  const bestPlatform = byPlatform[0];
  const bestContentAngle = byAngle[0];
  const bestPostingAccount = byAccount[0];
  const bestStyleChip = byStyle[0];
  const bestMediaType = byMediaType[0];
  const topByEngagementRate = [...metricItems]
    .filter((item) => metricNumber(item.metrics?.impressions) > 0)
    .sort((a, b) => performanceRate(b) - performanceRate(a))
    .slice(0, 3);
  const topByImpressions = [...metricItems]
    .sort((a, b) => metricNumber(b.metrics?.impressions) - metricNumber(a.metrics?.impressions))
    .slice(0, 3);
  const topByInteractions = [...metricItems].sort((a, b) => engagementTotal(b) - engagementTotal(a)).slice(0, 3);
  const lowestPerforming = metricItems.length >= 3
    ? [...metricItems].sort((a, b) => performanceScore(a) - performanceScore(b)).slice(0, 3)
    : [];

  const working = metricItems.length === 0
    ? ["Add metrics to posted items to start the learning loop."]
    : [
        `${bestPlatform?.label ?? "A platform"} is leading based on the metrics entered so far.`,
        `${bestContentAngle?.label ?? "The strongest angle"} is getting the best response.`,
        bestMediaType?.label && bestMediaType.label !== "Text-only"
          ? `${bestMediaType.label} posts are showing useful signal.`
          : "Text-only posts can still work when the hook is specific."
      ];
  const postMore = [
    bestContentAngle?.label
      ? `Create another ${bestContentAngle.label.toLowerCase()} post with a specific operational proof point.`
      : "Create more posts with a clear angle and measurable context.",
    bestPostingAccount?.label
      ? `Use ${bestPostingAccount.label} when the idea benefits from that perspective.`
      : "Use the clearest posting account for the point being made.",
    bestMediaType?.label && bestMediaType.label !== "Text-only"
      ? `Pair strong posts with ${bestMediaType.label.toLowerCase()} visuals when available.`
      : "Try a media-backed post using workshop, robotics, or factory visuals."
  ];
  const improve = [
    "Track impressions and interactions on every posted item so comparisons get sharper.",
    "Give lower-performing posts a stronger first line and a more concrete operational detail.",
    "Repurpose winners before creating completely new angles."
  ];
  const risks = [
    confidence === "Low"
      ? "Learning confidence is low because there are fewer than 3 posted items with metrics."
      : "Keep checking that winning posts are supported by Company Knowledge, not just high-performing phrasing.",
    "Manual metrics can be uneven. Treat early signals as direction, not certainty.",
    "Avoid overreacting to sandbox/test posts when judging real audience performance."
  ];

  const suggestedPlatform = (bestPlatform?.label && platforms.includes(bestPlatform.label as Platform)
    ? bestPlatform.label
    : "LinkedIn") as Platform;
  const suggestedAngle = (bestContentAngle?.label && bestContentAngle.label !== "Uncategorized"
    ? bestContentAngle.label
    : "Company update") as ContentAngle;
  const suggestedStyle = (bestStyleChip?.label && bestStyleChip.label !== "Uncategorized"
    ? [bestStyleChip.label as SimpleStyleChip]
    : ["Conduit default" as SimpleStyleChip]);
  const topPost = topByInteractions[0] || topByImpressions[0];
  const suggestions: PerformanceSuggestion[] = metricItems.length === 0
    ? []
    : [
        {
          idea: `Create another ${suggestedAngle.toLowerCase()} post about what Conduit is proving in real industrial operations.`,
          platform: suggestedPlatform,
          contentAngle: suggestedAngle,
          styleChips: suggestedStyle
        },
        {
          idea: topPost
            ? `Repurpose the strongest ${topPost.platform} post into a native ${suggestedPlatform} draft without copying it word for word.`
            : "Repurpose the strongest posted idea into a platform-native follow-up.",
          platform: suggestedPlatform,
          contentAngle: suggestedAngle,
          styleChips: suggestedStyle
        },
        {
          idea: bestMediaType?.label && bestMediaType.label !== "Text-only"
            ? "Try another media-backed post that connects the visual to a concrete factory automation lesson."
            : "Try a media-backed post using a workshop, robot, hardware, or factory visual.",
          platform: "Instagram",
          contentAngle: "Behind the scenes",
          styleChips: ["More concise"]
        }
      ];

  return {
    metricItems,
    confidence,
    bestPlatform,
    bestContentAngle,
    bestPostingAccount,
    bestStyleChip,
    bestMediaType,
    topByEngagementRate,
    topByImpressions,
    topByInteractions,
    lowestPerforming,
    working,
    postMore,
    improve,
    risks,
    suggestions
  };
}

export function weeklyLearningReview(queue: PostQueueItem[], campaigns: Campaign[], librarySources: LibrarySource[]) {
  const publishedThisWeek = queue.filter(
    (item) =>
      queueContentType(item) === "Post" &&
      normalizeQueueStatus(item.status) === "Posted" &&
      isWithinLastDays(item.postedAt || item.updatedAt || item.createdAt, 7)
  );
  const repliesThisWeek = queue.filter(
    (item) =>
      queueContentType(item) === "Reply" &&
      normalizeQueueStatus(item.status) === "Replied" &&
      isWithinLastDays(item.postedAt || item.updatedAt || item.createdAt, 7)
  );
  const metricItems = publishedThisWeek.filter((item) => metricsHaveValues(item.metrics));
  const totalImpressions = metricItems.reduce((sum, item) => sum + metricNumber(item.metrics?.impressions), 0);
  const totalLikes = metricItems.reduce((sum, item) => sum + metricNumber(item.metrics?.likes), 0);
  const totalComments = metricItems.reduce((sum, item) => sum + metricNumber(item.metrics?.comments), 0);
  const totalShares = metricItems.reduce((sum, item) => sum + metricNumber(item.metrics?.shares), 0);
  const byPlatform = aggregatePerformance(metricItems, (item) => item.platform);
  const byContentAngle = aggregatePerformance(metricItems, (item) => item.contentAngle || campaignForQueueItem(item, campaigns)?.contentAngle);
  const byMediaType = aggregatePerformance(metricItems, (item) => mediaTypeForQueueItem(item, campaignForQueueItem(item, campaigns)));
  const rankedByPerformance = [...metricItems].sort((a, b) => performanceScore(b) - performanceScore(a));
  const bestPost = rankedByPerformance[0];
  const weakestPost = rankedByPerformance.length >= 2 ? rankedByPerformance[rankedByPerformance.length - 1] : undefined;
  const bestPlatform = byPlatform[0];
  const bestContentAngle = byContentAngle[0];
  const bestMediaType = byMediaType[0];
  const confidence = metricItems.length >= 10 ? "High" : metricItems.length >= 3 ? "Medium" : "Low";
  const activeBrainThemes = uniquePerformanceLabels(
    librarySources
      .filter((source) => source.reviewStatus !== "Save only")
      .flatMap((source) => [
        ...(source.analysis?.keyThemes ?? []),
        source.analysis?.commonTopics?.split(",")[0] ?? "",
        ...(source.tags ?? [])
      ])
  ).slice(0, 3);
  const recommendedPlatforms = uniquePerformanceLabels([
    bestPlatform?.label ?? "",
    metricItems.length === 0 ? "LinkedIn" : "",
    publishedThisWeek.some((item) => item.platform === "Instagram") ? "" : "Instagram"
  ]).slice(0, 3);
  const recommendedContentAngles = uniquePerformanceLabels([
    bestContentAngle?.label ?? "",
    "Founder build-in-public",
    activeBrainThemes.length > 0 ? "Industry POV" : "Company update"
  ]).slice(0, 3);
  const recommendedMediaTypes = uniquePerformanceLabels([
    bestMediaType?.label ?? "",
    "Image-backed",
    "Workshop or robotics visuals"
  ]).slice(0, 3);
  const repurposeCandidates = rankedByPerformance.slice(0, 3);

  const whatWorked = metricItems.length === 0
    ? ["No manual metrics were added in the last 7 days yet."]
    : [
        bestPlatform ? `${bestPlatform.label} had the strongest signal this week.` : "A clear platform winner has not emerged yet.",
        bestContentAngle ? `${bestContentAngle.label} was the strongest content angle.` : "Content angle data is still thin.",
        bestMediaType ? `${bestMediaType.label} gave the best media signal.` : "Media performance needs more data."
      ];
  const whatToImprove = [
    metricItems.length < publishedThisWeek.length
      ? "Add metrics to every posted item so the weekly review gets sharper."
      : "Keep metrics current after posting so comparisons stay useful.",
    weakestPost
      ? `Review "${weakestPost.campaignName}" for hook clarity, specificity, and media fit.`
      : "Use at least two posted items with metrics to identify weaker posts.",
    "Compare real posts separately from sandbox/test posts before making big decisions."
  ];
  const whatToPostMoreOf = [
    bestContentAngle
      ? `Post more ${bestContentAngle.label.toLowerCase()} content when it has concrete operational detail.`
      : "Post more specific operational examples tied to Conduit Brain themes.",
    bestMediaType && bestMediaType.label !== "Text-only"
      ? `Use more ${bestMediaType.label.toLowerCase()} posts when the visual directly supports the point.`
      : "Test one media-backed post with a workshop, robot, hardware, or factory visual.",
    repurposeCandidates[0]
      ? `Repurpose "${repurposeCandidates[0].campaignName}" into another native platform format.`
      : "Repurpose a winner once metrics identify one."
  ];
  const whatToAvoid = [
    "Avoid treating low-confidence data as a final answer.",
    weakestPost
      ? `Avoid repeating the framing from "${weakestPost.campaignName}" without a stronger hook or clearer proof.`
      : "Avoid generic company updates that do not include a concrete proof point.",
    "Avoid letting inspiration or trend references introduce unsupported Conduit claims."
  ];

  return {
    postsPublished: publishedThisWeek.length,
    repliesSent: repliesThisWeek.length,
    metricItems,
    totalImpressions,
    totalLikes,
    totalComments,
    totalShares,
    bestPost,
    weakestPost,
    bestPlatform,
    bestContentAngle,
    bestMediaType,
    confidence,
    whatWorked,
    whatToImprove,
    whatToPostMoreOf,
    whatToAvoid,
    recommendedPlatforms,
    recommendedContentAngles,
    recommendedBrainThemes: activeBrainThemes,
    recommendedMediaTypes,
    repurposeCandidates
  };
}
