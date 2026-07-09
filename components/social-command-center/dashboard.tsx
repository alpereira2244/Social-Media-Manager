"use client";

import { useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InsightStat, Metric, Pill } from "@/components/social-command-center/common-ui";
import type { StorageMode } from "@/lib/supabase/persistence";
import { formatShortDateTime } from "@/lib/date-format";
import { metricsHaveValues } from "@/lib/performance-metrics";
import { buildWeeklyContentPlan, firstBrainTheme, mostRepeatedLabel, uniqueLabels, type WeeklyPlanSlot } from "@/lib/planning-utils";
import { campaignForQueueItem, performanceInsights, type PerformanceSuggestion } from "@/lib/performance-insights";
import { calendarItemDate, isThisWeekDate, isTodayDate, normalizeQueueStatus, queueContentType, scheduledCalendarItems } from "@/lib/queue-calendar";
import { cn } from "@/lib/utils";
import type {
  ActivityLogItem,
  BrandVoiceProfile,
  Campaign,
  ContentAngle,
  LibrarySource,
  MediaAsset,
  Opportunity,
  OpportunityPlatform,
  Platform,
  PostQueueItem,
  Profile,
  ReviewFeedback,
  ReviewWorkflowStatus,
  SimpleStyleChip,
  SocialConnection,
  SourceCapture,
  SourceInboxHistoryItem
} from "@/lib/types";

const platforms: Platform[] = ["LinkedIn", "X", "Instagram", "TikTok"];

type Screen =
  | "Dashboard"
  | "Source Inbox"
  | "Opportunity Inbox"
  | "Profiles"
  | "Company Knowledge"
  | "Media Library"
  | "Brand Voice Rules"
  | "New Campaign"
  | "Repurpose"
  | "Content Library"
  | "Ready to Post"
  | "Content Calendar"
  | "Review Drafts"
  | "Analytics"
  | "Connections";

type ReviewQueueFilter =
  | "All drafts"
  | "Sent for review"
  | "Changes requested"
  | "Revised"
  | "Manager approved / ready"
  | "Ready to Post / Ready to Reply"
  | "Archived";

const contentAngles: ContentAngle[] = [
  "Founder build-in-public",
  "Deployment win",
  "Company update",
  "Customer proof",
  "Product launch",
  "Behind the scenes",
  "Industry POV",
  "Technical explanation",
  "Recruiting",
  "Event recap",
  "Other"
];

function countReviewItems(campaigns: Campaign[], opportunities: Opportunity[], status: ReviewWorkflowStatus) {
  const postCount = campaigns.reduce(
    (total, campaign) => total + campaign.posts.filter((post) => post.review?.status === status).length,
    0
  );
  const replyCount = opportunities.reduce(
    (total, opportunity) =>
      total + (opportunity.replyDrafts ?? []).filter((reply) => reply.review?.status === status).length,
    0
  );
  return postCount + replyCount;
}

function countApprovedNotQueued(campaigns: Campaign[], opportunities: Opportunity[], postQueue: PostQueueItem[]) {
  const queuedIds = new Set(postQueue.map((item) => item.generatedPostId));
  const approvalStatuses: ReviewWorkflowStatus[] = ["Approved", "Manager approved", "Manager marked ready to post"];
  const postCount = campaigns.reduce(
    (total, campaign) =>
      total + campaign.posts.filter((post) => approvalStatuses.includes(post.review?.status as ReviewWorkflowStatus) && !queuedIds.has(post.id)).length,
    0
  );
  const replyCount = opportunities.reduce(
    (total, opportunity) =>
      total +
      (opportunity.replyDrafts ?? []).filter((reply) => approvalStatuses.includes(reply.review?.status as ReviewWorkflowStatus) && !queuedIds.has(reply.id)).length,
    0
  );
  return postCount + replyCount;
}

export function Dashboard({
  campaigns,
  activeCampaignId,
  setActiveCampaignId,
  setScreen,
  deleteCampaign,
  repurposeCampaign,
  resetLocalData,
  approvedCount,
  rejectedCount,
  draftCount,
  profileCount,
  profiles,
  brandVoice,
  librarySourceCount,
  readyQueueCount,
  opportunities,
  postQueue,
  librarySources,
  mediaAssets,
  sourceInboxHistory,
  sourceCaptures,
  activityLog,
  reviewFeedback,
  undoLastActivity,
  socialConnections,
  applyMediaAsset,
  setCampaignName,
  setIntent,
  setIdea,
  setSelectedPlatforms,
  setContentAngle,
  setSimpleStyleChips,
  storageMode,
  loadDemoData,
  clearDemoData,
  showDemoData,
  hideDemoData,
  showDemoDataAgain,
  startNewPost,
  openReviewQueue
}: {
  campaigns: Campaign[];
  activeCampaignId: string;
  setActiveCampaignId: (id: string) => void;
  setScreen: (screen: Screen) => void;
  deleteCampaign: (id: string) => void;
  repurposeCampaign: (campaign: Campaign) => void;
  resetLocalData: () => void;
  approvedCount: number;
  rejectedCount: number;
  draftCount: number;
  profileCount: number;
  profiles: Profile[];
  brandVoice: BrandVoiceProfile;
  librarySourceCount: number;
  readyQueueCount: number;
  opportunities: Opportunity[];
  postQueue: PostQueueItem[];
  librarySources: LibrarySource[];
  mediaAssets: MediaAsset[];
  sourceInboxHistory: SourceInboxHistoryItem[];
  sourceCaptures: SourceCapture[];
  activityLog: ActivityLogItem[];
  reviewFeedback: ReviewFeedback[];
  undoLastActivity: () => void;
  socialConnections: SocialConnection[];
  applyMediaAsset: (asset: MediaAsset) => void;
  setCampaignName: (value: string) => void;
  setIntent: (value: string) => void;
  setIdea: (value: string) => void;
  setSelectedPlatforms: (platforms: Platform[]) => void;
  setContentAngle: (angle: ContentAngle | "") => void;
  setSimpleStyleChips: (chips: SimpleStyleChip[]) => void;
  storageMode: StorageMode;
  loadDemoData: () => void;
  clearDemoData: () => void;
  showDemoData: boolean;
  hideDemoData: () => void;
  showDemoDataAgain: () => void;
  startNewPost: () => void;
  openReviewQueue: (filter?: ReviewQueueFilter) => void;
}) {
  const [weeklyPlanVersion, setWeeklyPlanVersion] = useState(0);
  const [dismissedWeeklySlots, setDismissedWeeklySlots] = useState<string[]>([]);
  const [dashboardTab, setDashboardTab] = useState<"Today" | "This Week" | "Activity" | "System">("Today");
  const upcomingPosts = scheduledCalendarItems(postQueue).slice(0, 3);
  const newCaptures = sourceCaptures.filter((capture) => capture.status === "New").length;
  const openOpportunities = opportunities.filter((item) => item.status === "New").length;
  const highUrgencyOpportunities = opportunities.filter((item) => item.urgency === "High" && item.status !== "Archived" && item.status !== "Posted").length;
  const draftedOpportunities = opportunities.filter((item) => item.status === "Drafted").length;
  const insights = performanceInsights(postQueue, campaigns);
  const readyPosts = postQueue.filter(
    (item) => queueContentType(item) === "Post" && normalizeQueueStatus(item.status) === "Ready"
  );
  const readyReplies = postQueue.filter(
    (item) => queueContentType(item) === "Reply" && normalizeQueueStatus(item.status) === "Ready"
  );
  const scheduledToday = postQueue.filter((item) => {
    const status = normalizeQueueStatus(item.status);
    return status !== "Archived" && Boolean(calendarItemDate(item)) && isTodayDate(calendarItemDate(item));
  });
  const draftsNeedingReview = campaigns.reduce(
    (total, campaign) => total + campaign.posts.filter((post) => post.status === "draft").length,
    0
  );
  const sentForReviewCount = countReviewItems(campaigns, opportunities, "Sent for review") + countReviewItems(campaigns, opportunities, "Needs review");
  const revisedReviewCount = countReviewItems(campaigns, opportunities, "Revised");
  const changesRequestedCount = countReviewItems(campaigns, opportunities, "Changes requested");
  const approvedNotQueuedCount = countApprovedNotQueued(campaigns, opportunities, postQueue);
  const unresolvedManagerFeedback = reviewFeedback.filter((feedback) => feedback.status !== "resolved");
  const managerChangesRequestedCount = unresolvedManagerFeedback.filter((feedback) => feedback.status === "changes_requested").length;
  const managerApprovedCount = unresolvedManagerFeedback.filter((feedback) => feedback.status === "approved").length;
  const managerReadyToPostCount = unresolvedManagerFeedback.filter((feedback) => feedback.status === "ready_to_post").length;
  const managerFeedbackCount = unresolvedManagerFeedback.length;
  const postedWithoutMetrics = postQueue.filter(
    (item) =>
      queueContentType(item) === "Post" &&
      normalizeQueueStatus(item.status) === "Posted" &&
      !metricsHaveValues(item.metrics)
  );
  const createdPostToday = campaigns.some((campaign) => isTodayDate(campaign.createdAt));
  const suggestedNextPost = insights.suggestions[0];
  const recentInsight = insights.metricItems.length > 0
    ? insights.working[0]
    : "Add metrics to posted items to start the learning loop.";
  const activeBrainSources = librarySources.filter((source) => source.reviewStatus !== "Save only");
  const suggestedBrainTheme = firstBrainTheme(activeBrainSources);
  const topPerformingPost = insights.topByInteractions[0] || insights.topByImpressions[0];
  const weeklyQueueItems = postQueue.filter((item) => {
    const date = calendarItemDate(item) || item.createdAt;
    return isThisWeekDate(date) && normalizeQueueStatus(item.status) !== "Archived";
  });
  const weeklyPlatforms = uniqueLabels(weeklyQueueItems.map((item) => item.platform));
  const weeklyMix = uniqueLabels(
    weeklyQueueItems
      .map((item) => item.contentAngle || campaignForQueueItem(item, campaigns)?.contentAngle)
      .filter(Boolean) as string[]
  );
  const postingPlanActions = [
    readyPosts[0] && {
      title: "Publish a queued post",
      reason: `${readyPosts[0].campaignName} is already approved and waiting for manual publishing.`,
      platform: readyPosts[0].platform,
      relatedItem: readyPosts[0].campaignName,
      priority: "High" as const,
      actionLabel: "Open Publish Queue",
      onAction: () => setScreen("Ready to Post")
    },
    readyReplies[0] && {
      title: "Send a queued reply",
      reason: `${readyReplies[0].campaignName} is approved and ready to copy into the platform.`,
      platform: readyReplies[0].platform,
      relatedItem: readyReplies[0].opportunityTitle || readyReplies[0].campaignName,
      priority: "High" as const,
      actionLabel: "Go to Ready to Reply",
      onAction: () => setScreen("Ready to Post")
    },
    opportunities.find((item) => item.urgency === "High" && item.status !== "Archived" && item.status !== "Posted") && {
      title: "Reply to a high-priority opportunity",
      reason: "High-urgency opportunities should be reviewed while the context is still fresh.",
      platform: opportunities.find((item) => item.urgency === "High" && item.status !== "Archived" && item.status !== "Posted")?.platform || "LinkedIn",
      relatedItem: opportunities.find((item) => item.urgency === "High" && item.status !== "Archived" && item.status !== "Posted")?.title,
      priority: "High" as const,
      actionLabel: "Review Opportunities",
      onAction: () => setScreen("Opportunity Inbox")
    },
    suggestedNextPost && {
      title: "Create a post from a performance insight",
      reason: "Manual metrics are starting to show a direction worth testing again.",
      platform: suggestedNextPost.platform,
      relatedItem: suggestedNextPost.contentAngle || "Performance insight",
      priority: "Medium" as const,
      actionLabel: "Create from insight",
      onAction: () => generateFromInsight(suggestedNextPost)
    },
    suggestedBrainTheme && {
      title: "Create a post from a Conduit Brain theme",
      reason: `Company Knowledge has source material around ${suggestedBrainTheme}.`,
      platform: "LinkedIn" as Platform,
      relatedItem: suggestedBrainTheme,
      priority: "Medium" as const,
      actionLabel: "Create from theme",
      onAction: () => createFromBrainTheme(suggestedBrainTheme)
    },
    topPerformingPost && {
      title: "Repurpose a high-performing post",
      reason: `${topPerformingPost.campaignName} has the strongest performance signal in the current metrics.`,
      platform: topPerformingPost.platform,
      relatedItem: topPerformingPost.campaignName,
      priority: "Medium" as const,
      actionLabel: "Open Content Library",
      onAction: () => setScreen("Content Library")
    },
    postedWithoutMetrics[0] && {
      title: "Add metrics to recently posted content",
      reason: "More complete metrics make the learning loop and future recommendations sharper.",
      platform: postedWithoutMetrics[0].platform,
      relatedItem: postedWithoutMetrics[0].campaignName,
      priority: "Low" as const,
      actionLabel: "Open Analytics",
      onAction: () => setScreen("Analytics")
    }
  ].filter(Boolean).slice(0, 5) as PostingPlanAction[];
  const weeklyPlanSlots = buildWeeklyContentPlan({
    queue: postQueue,
    campaigns,
    opportunities,
    librarySources,
    mediaAssets,
    version: weeklyPlanVersion
  }).filter((slot) => !dismissedWeeklySlots.includes(slot.id));
  const weeklyPlanPlatforms = uniqueLabels(weeklyPlanSlots.map((slot) => slot.platform));
  const weeklyPlanAngles = uniqueLabels(weeklyPlanSlots.map((slot) => slot.contentAngle));
  const weeklyPlanGaps = contentAngles
    .filter((angle) =>
      ["Company update", "Founder build-in-public", "Industry POV", "Behind the scenes", "Customer proof", "Technical explanation"].includes(angle)
    )
    .filter((angle) => !weeklyPlanAngles.includes(angle))
    .slice(0, 3);
  const overusedWeeklyPlatform = mostRepeatedLabel(weeklyPlanSlots.map((slot) => slot.platform), 4);
  const overusedWeeklyAngle = mostRepeatedLabel(weeklyPlanSlots.map((slot) => slot.contentAngle), 3);
  const recommendedAction = (() => {
    if (changesRequestedCount > 0) {
      return {
        title: "Handle requested changes",
        description: `${changesRequestedCount} draft${changesRequestedCount === 1 ? " has" : "s have"} founder/team feedback to address.`,
        actionLabel: "Open Review",
        onClick: () => openReviewQueue("Changes requested")
      };
    }
    if (managerChangesRequestedCount > 0) {
      return {
        title: "Review manager changes",
        description: `${managerChangesRequestedCount} manager note${managerChangesRequestedCount === 1 ? "" : "s"} requested edits before publishing.`,
        actionLabel: "Open Publish Queue",
        onClick: () => setScreen("Ready to Post")
      };
    }
    if (managerReadyToPostCount > 0) {
      return {
        title: "Move manager-ready content",
        description: `${managerReadyToPostCount} item${managerReadyToPostCount === 1 ? " is" : "s are"} marked ready to post by a manager.`,
        actionLabel: "Open Review Queue",
        onClick: () => openReviewQueue("Manager approved / ready")
      };
    }
    if (managerApprovedCount > 0) {
      return {
        title: "Queue manager-approved content",
        description: `${managerApprovedCount} manager approval${managerApprovedCount === 1 ? "" : "s"} can be reviewed before manual publishing.`,
        actionLabel: "Open Review Queue",
        onClick: () => openReviewQueue("Manager approved / ready")
      };
    }
    if (sentForReviewCount > 0) {
      return {
        title: "Review pending drafts",
        description: `${sentForReviewCount} draft${sentForReviewCount === 1 ? " is" : "s are"} currently sent for review.`,
        actionLabel: "Open Review",
        onClick: () => openReviewQueue("Sent for review")
      };
    }
    if (approvedNotQueuedCount > 0) {
      return {
        title: "Move approved items to queue",
        description: `${approvedNotQueuedCount} reviewed item${approvedNotQueuedCount === 1 ? " is" : "s are"} approved but not queued yet.`,
        actionLabel: "Open Review",
        onClick: () => openReviewQueue("Manager approved / ready")
      };
    }
    if (newCaptures > 0) {
      return {
        title: "Review new captures",
        description: `${newCaptures} browser capture${newCaptures === 1 ? " is" : "s are"} waiting for AI triage in Intake.`,
        actionLabel: "Open Intake",
        onClick: () => setScreen("Source Inbox")
      };
    }
    if (openOpportunities > 0) {
      return {
        title: "Review new opportunities",
        description: `${openOpportunities} new opportunity${openOpportunities === 1 ? "" : "ies"} could become a post or reply.`,
        actionLabel: "Review Opportunities",
        onClick: () => setScreen("Opportunity Inbox")
      };
    }
    if (readyReplies.length > 0) {
      return {
        title: "Send queued replies",
        description: `${readyReplies.length} approved repl${readyReplies.length === 1 ? "y is" : "ies are"} ready to copy and send manually.`,
        actionLabel: "Go to Ready to Reply",
        onClick: () => setScreen("Ready to Post")
      };
    }
    if (readyPosts.length > 0) {
      return {
        title: "Publish ready posts",
        description: `${readyPosts.length} approved post${readyPosts.length === 1 ? " is" : "s are"} waiting in the manual queue.`,
        actionLabel: "Open Publish Queue",
        onClick: () => setScreen("Ready to Post")
      };
    }
    if (draftsNeedingReview > 0) {
      return {
        title: "Review drafts",
        description: `${draftsNeedingReview} draft${draftsNeedingReview === 1 ? " needs" : "s need"} a decision before publishing.`,
        actionLabel: "Open Review",
        onClick: () => setScreen("Review Drafts")
      };
    }
    if (draftsNeedingReview === 0) {
      return {
        title: "Create a post",
        description: "No drafts are waiting for review. Start the next Conduit post.",
        actionLabel: "Create a post",
        onClick: startNewPost
      };
    }
    if (suggestedNextPost) {
      return {
        title: "Create from performance insight",
        description: suggestedNextPost.idea,
        actionLabel: "Create from insight",
        onClick: () => generateFromInsight(suggestedNextPost)
      };
    }
    return {
      title: "Open Dashboard",
      description: "Everything looks calm. Check the dashboard again when new work comes in.",
      actionLabel: "Stay here",
      onClick: () => setScreen("Dashboard")
    };
  })();
  const dailyChecklist = [
    { label: "Check opportunities", complete: openOpportunities === 0, action: () => setScreen("Opportunity Inbox") },
    { label: "Review drafts", complete: draftsNeedingReview === 0, action: () => setScreen("Review Drafts") },
    { label: "Publish ready posts/replies", complete: readyPosts.length + readyReplies.length === 0, action: () => setScreen("Ready to Post") },
    { label: "Add metrics", complete: postedWithoutMetrics.length === 0, action: () => setScreen("Ready to Post") },
    { label: "Create one new post", complete: createdPostToday, action: startNewPost }
  ];
  const workspaceReadiness = buildWorkspaceReadiness({
    profiles,
    brandVoice,
    librarySources,
    mediaAssets,
    sourceInboxHistory,
    opportunities,
    postQueue,
    socialConnections,
    campaigns,
    storageMode
  });

  function handleReadinessAction(actionId: WorkspaceReadinessActionId) {
    if (actionId === "create-profile") {
      setScreen("Profiles");
      return;
    }
    if (actionId === "add-knowledge") {
      setScreen("Source Inbox");
      return;
    }
    if (actionId === "review-brand") {
      setScreen("Brand Voice Rules");
      return;
    }
    if (actionId === "upload-media") {
      setScreen("Media Library");
      return;
    }
    if (actionId === "create-post") {
      startNewPost();
      return;
    }
    if (actionId === "add-metrics") {
      setScreen("Ready to Post");
      return;
    }
    if (actionId === "load-demo") {
      loadDemoData();
      return;
    }
    if (actionId === "connections") {
      setScreen("Connections");
    }
  }

  function generateFromInsight(suggestion: PerformanceSuggestion) {
    setCampaignName("Performance insight brief");
    setIntent(suggestion.idea);
    setIdea([
      suggestion.idea,
      "Use manually entered performance data as direction. Keep facts grounded in Conduit Company Knowledge."
    ].join("\n\n"));
    setSelectedPlatforms([suggestion.platform]);
    setContentAngle(suggestion.contentAngle || "Company update");
    setSimpleStyleChips(suggestion.styleChips.length > 0 ? suggestion.styleChips : ["Conduit default"]);
    setScreen("New Campaign");
  }

  function createFromBrainTheme(theme: string) {
    setCampaignName(`${theme} brief`);
    setIntent(`Create a Conduit post about ${theme}, grounded in Company Knowledge.`);
    setIdea([
      `Use the Conduit Brain theme "${theme}" as the starting point.`,
      "Keep the post specific, practical, and grounded in Company Knowledge."
    ].join("\n\n"));
    setSelectedPlatforms(["LinkedIn"]);
    setContentAngle("Industry POV");
    setSimpleStyleChips(["Conduit default"]);
    setScreen("New Campaign");
  }

  function createFromOpportunity(opportunity: Opportunity) {
    const suggestedPlatform = opportunity.analysis?.suggestedPlatforms?.find((platform): platform is Platform =>
      platforms.includes(platform as Platform)
    ) || (platforms.includes(opportunity.platform as Platform) ? opportunity.platform as Platform : "LinkedIn");
    const idea = opportunity.analysis?.suggestedFirstDraftIdea || opportunity.analysis?.suggestedConduitAngle || opportunity.pastedText || opportunity.title;
    setCampaignName(`Opportunity: ${opportunity.title}`.slice(0, 80));
    setIntent(idea);
    setIdea([
      `Opportunity: ${opportunity.title}`,
      opportunity.sourceUrl ? `Source: ${opportunity.sourceUrl}` : "",
      opportunity.pastedText || opportunity.notes || "",
      opportunity.analysis?.whyItMatters ? `Why it matters: ${opportunity.analysis.whyItMatters}` : ""
    ].filter(Boolean).join("\n\n"));
    setSelectedPlatforms([suggestedPlatform]);
    setContentAngle("Industry POV");
    setSimpleStyleChips(["Conduit default"]);
    setScreen("New Campaign");
  }

  function createFromWeeklySlot(slot: WeeklyPlanSlot) {
    if (slot.sourceType === "Opportunity" && slot.relatedId) {
      const opportunity = opportunities.find((item) => item.id === slot.relatedId);
      if (opportunity) {
        createFromOpportunity(opportunity);
        return;
      }
    }
    if (slot.sourceType === "Conduit Brain theme") {
      createFromBrainTheme(slot.sourceLabel);
      return;
    }
    if (slot.sourceType === "Performance insight") {
      setCampaignName("Performance insight brief");
      setIntent(slot.sourceLabel);
      setIdea([
        slot.sourceLabel,
        "Use manually entered performance data as direction. Keep facts grounded in Conduit Company Knowledge."
      ].join("\n\n"));
      setSelectedPlatforms([slot.platform]);
      setContentAngle(slot.contentAngle);
      setSimpleStyleChips(["Conduit default"]);
      setScreen("New Campaign");
      return;
    }
    if (slot.sourceType === "Media Library asset" && slot.relatedId) {
      const asset = mediaAssets.find((item) => item.id === slot.relatedId);
      if (asset) {
        applyMediaAsset(asset);
        setCampaignName(`${asset.filename} post`);
        setIntent(`Create a Conduit post using ${asset.filename} as the visual context.`);
        setIdea(asset.description || asset.notes || `Use ${asset.filename} as the media proof point.`);
        setSelectedPlatforms([slot.platform]);
        setContentAngle(slot.contentAngle);
        setScreen("New Campaign");
        return;
      }
    }
    startNewPost();
  }

  function handleWeeklySlotAction(slot: WeeklyPlanSlot) {
    if (slot.sourceType === "Ready to Post item" || slot.status === "Ready") {
      setScreen("Ready to Post");
      return;
    }
    if (slot.sourceType === "Repurpose candidate") {
      setScreen("Content Library");
      return;
    }
    if (slot.status === "Scheduled" || slot.status === "Posted") {
      setScreen("Content Calendar");
      return;
    }
    createFromWeeklySlot(slot);
  }

  function weeklySlotActionLabel(slot: WeeklyPlanSlot) {
    if (slot.status === "Scheduled" || slot.status === "Posted") return "Open Calendar";
    if (slot.sourceType === "Ready to Post item") return slot.status === "Ready" ? "Schedule ready item" : "Use ready post";
    if (slot.sourceType === "Repurpose candidate") return "Repurpose existing post";
    return "Create post";
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-teal-100 bg-teal-50 p-3 text-teal-950">
            <p className="text-xs font-extrabold uppercase tracking-wide">Recommended next action</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">{recommendedAction.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-teal-900">{recommendedAction.description}</p>
            <p className="mt-2 text-xs font-bold text-teal-800">Why: highest-priority active item in the workspace.</p>
            <Button className="mt-3" onClick={recommendedAction.onClick}>
              {recommendedAction.actionLabel}
            </Button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Today&apos;s work summary</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <InsightStat label="Ready posts" value={String(readyPosts.length)} />
              <InsightStat label="Ready replies" value={String(readyReplies.length)} />
              <InsightStat label="Review items" value={String(sentForReviewCount + revisedReviewCount + changesRequestedCount)} />
              <InsightStat label="New captures" value={String(newCaptures)} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Workspace readiness</p>
            <p className="mt-2 text-3xl font-extrabold">{workspaceReadiness.score}/100</p>
            <p className="mt-1 text-sm font-bold text-primary">{workspaceReadiness.label}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {storageMode === "supabase" ? "Shared workspace connected." : "Local dev mode."}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setScreen("Source Inbox")}>Open Intake</Button>
          <Button size="sm" variant="secondary" onClick={() => setScreen("Opportunity Inbox")}>Opportunities</Button>
          <Button size="sm" onClick={startNewPost}>Create Post</Button>
          <Button size="sm" variant="secondary" onClick={() => setScreen("Review Drafts")}>Review</Button>
          <Button size="sm" variant="secondary" onClick={() => setScreen("Content Calendar")}>Plan Calendar</Button>
          <Button size="sm" variant="secondary" onClick={() => setScreen("Analytics")}>Learn from Performance</Button>
        </div>
        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-700">
            <span>Demo data and setup shortcuts</span>
            <span className="text-xs text-muted-foreground">{showDemoData ? "Visible" : "Hidden"}</span>
          </summary>
          <div className="mt-3 flex flex-col justify-between gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              Demo controls stay here so the default dashboard focuses on today&apos;s work.
            </p>
            <div className="flex flex-wrap gap-2">
              {showDemoData ? (
                <Button size="sm" variant="secondary" onClick={hideDemoData}>
                  Hide demo data
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={showDemoDataAgain}>
                  Show demo data
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={clearDemoData}>
                Clear demo data
              </Button>
            </div>
          </div>
        </details>
      </Card>

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
        {(["Today", "This Week", "Activity", "System"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setDashboardTab(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-extrabold transition",
              dashboardTab === tab ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {dashboardTab === "Today" && (
        <>
      <DashboardSectionLabel
        title="Today at a glance"
        description="Recommended next action, review items, ready work, scheduled items, and the daily loop."
      />
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Daily Command Center</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">Today at a glance</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              The highest-signal items that need attention today across opportunities, drafts, publishing, replies, and performance.
            </p>
          </div>
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <p className="text-xs font-extrabold uppercase tracking-wide">Recommended next action</p>
            <p className="mt-1 font-bold">{recommendedAction.title}</p>
            <p className="mt-1 max-w-md text-xs leading-5">{recommendedAction.description}</p>
            <Button className="mt-3" size="sm" onClick={recommendedAction.onClick}>
              {recommendedAction.actionLabel}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <TodayActionCard
            title="Publish Queue: Posts"
            value={readyPosts.length}
            description="Approved posts waiting for manual publishing."
            actionLabel="Open Publish Queue"
            onAction={() => setScreen("Ready to Post")}
          />
          <TodayActionCard
            title="Ready to Reply"
            value={readyReplies.length}
            description="Approved replies waiting to be copied and sent."
            actionLabel="Go to Ready to Reply"
            onAction={() => setScreen("Ready to Post")}
          />
          <TodayActionCard
            title="Scheduled today"
            value={scheduledToday.length}
            description="Posts or replies planned or posted for today."
            actionLabel="Open Calendar"
            onAction={() => setScreen("Content Calendar")}
          />
          <TodayActionCard
            title="Changes requested"
            value={changesRequestedCount + managerChangesRequestedCount}
            description="Reviewed items with feedback that should be addressed before publishing."
            actionLabel="Review feedback"
            onAction={() => openReviewQueue("Changes requested")}
          />
          <TodayActionCard
            title="New opportunities"
            value={openOpportunities}
            description="New inputs that may become posts or replies."
            actionLabel="Review Opportunities"
            onAction={() => setScreen("Opportunity Inbox")}
          />
          <TodayActionCard
            title="New captures"
            value={newCaptures}
            description="Browser captures waiting for triage and routing."
            actionLabel="Open Intake"
            onAction={() => setScreen("Source Inbox")}
          />
        </div>

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">
            More dashboard signals
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <TodayActionCard
              title="High-priority opportunities"
              value={highUrgencyOpportunities}
              description="Urgent opportunities still in the active workflow."
              actionLabel="Review Opportunities"
              onAction={() => setScreen("Opportunity Inbox")}
            />
            <TodayActionCard
              title="Drafts needing review"
              value={draftsNeedingReview}
              description="Generated drafts that still need a decision."
              actionLabel="Open Review"
              onAction={() => openReviewQueue("All drafts")}
            />
            <TodayActionCard
              title="Needs review"
              value={sentForReviewCount}
              description="Posts or replies sent for manager or team review."
              actionLabel="Open Review"
              onAction={() => openReviewQueue("Sent for review")}
            />
            <TodayActionCard
              title="Revised drafts"
              value={revisedReviewCount}
              description="Updated drafts available for another review pass."
              actionLabel="Review revisions"
              onAction={() => openReviewQueue("Revised")}
            />
            <TodayActionCard
              title="Manager feedback"
              value={managerFeedbackCount}
              description="Comments, approvals, or suggested edits from shared review links."
              actionLabel="Open Review Queue"
              onAction={() => openReviewQueue("All drafts")}
            />
            <TodayActionCard
              title="Manager ready"
              value={managerReadyToPostCount}
              description="Items marked ready to post by a manager."
              actionLabel="Move to Ready"
              onAction={() => openReviewQueue("Manager approved / ready")}
            />
            <TodayActionCard
              title="Approved, not queued"
              value={approvedNotQueuedCount}
              description="Founder-approved items waiting to move into the manual queue."
              actionLabel="Queue approved"
              onAction={() => openReviewQueue("Manager approved / ready")}
            />
            <TodayActionCard
              title="Recent performance insight"
              value={insights.metricItems.length}
              description={recentInsight}
              actionLabel="Open Analytics"
              onAction={() => setScreen("Analytics")}
            />
            <TodayActionCard
              title="Suggested next post"
              value={suggestedNextPost ? 1 : 0}
              description={suggestedNextPost?.idea || "Add metrics to posted items to unlock suggestions."}
              actionLabel={suggestedNextPost ? "Create from insight" : "Create a post"}
              onAction={suggestedNextPost ? () => generateFromInsight(suggestedNextPost) : startNewPost}
            />
          </div>
        </details>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h4 className="font-bold">Daily workflow</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                A lightweight loop for keeping Conduit social moving.
              </p>
            </div>
            <Pill>{dailyChecklist.filter((item) => item.complete).length} of {dailyChecklist.length} done</Pill>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {dailyChecklist.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                  item.complete
                    ? "border-teal-100 bg-white text-teal-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:bg-teal-50"
                )}
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                  item.complete ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                )}>
                  {item.complete ? <Check size={13} /> : ""}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

        </>
      )}

      {dashboardTab === "This Week" && (
        <>
      <DashboardSectionLabel
        title="This week"
        description="Plan the week from ready items, opportunities, performance signals, media, and Conduit Brain themes."
      />
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Posting priorities</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">Suggested posting plan</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              A lightweight plan for today or this week based on ready posts, replies, opportunities, performance signals, and Conduit Brain source material.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setScreen("Content Calendar")}>
            Open Calendar
          </Button>
        </div>

        {postingPlanActions.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
            Add opportunities, ready posts, or metrics and the app will suggest a posting plan.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {postingPlanActions.map((action) => (
              <PostingPlanCard key={`${action.title}-${action.relatedItem ?? action.platform}`} action={action} />
            ))}
          </div>
        )}

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h4 className="font-bold">Weekly balance</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Quick check on whether the week has enough posts, replies, platforms, and content mix.
              </p>
            </div>
            <Pill>{weeklyPlatforms.length} platform{weeklyPlatforms.length === 1 ? "" : "s"} represented</Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <InsightStat label="Posts ready" value={String(readyPosts.length)} />
            <InsightStat label="Replies ready" value={String(readyReplies.length)} />
            <InsightStat label="Opportunities waiting" value={String(openOpportunities + highUrgencyOpportunities)} />
            <InsightStat label="Platforms this week" value={weeklyPlatforms.length > 0 ? weeklyPlatforms.join(", ") : "None yet"} />
            <InsightStat label="Content mix" value={weeklyMix.length > 0 ? weeklyMix.slice(0, 3).join(", ") : "No mix yet"} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Weekly planner</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">Weekly Content Plan</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Suggested slots for the next 7 days. The plan builds around scheduled posts and uses ready items, opportunities, performance signals, media, and Conduit Brain themes to fill gaps.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setWeeklyPlanVersion((current) => current + 1);
              setDismissedWeeklySlots([]);
            }}
          >
            Generate weekly plan
          </Button>
        </div>

        {weeklyPlanSlots.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
            Add Ready to Post items, opportunities, media, or metrics to improve the weekly plan.
          </p>
        ) : (
          <details className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer font-bold">
              View {weeklyPlanSlots.length} suggested slot{weeklyPlanSlots.length === 1 ? "" : "s"}
            </summary>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {weeklyPlanSlots.map((slot) => (
                <WeeklyPlanSlotCard
                  key={slot.id}
                  slot={slot}
                  actionLabel={weeklySlotActionLabel(slot)}
                  onAction={() => handleWeeklySlotAction(slot)}
                  onDismiss={() => setDismissedWeeklySlots((current) => [...current, slot.id])}
                />
              ))}
            </div>
          </details>
        )}

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h4 className="font-bold">Weekly balance summary</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                A simple read on coverage, mix, and planning gaps.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setScreen("Content Calendar")}>
              Open Calendar
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <InsightStat label="Platforms covered" value={weeklyPlanPlatforms.length > 0 ? weeklyPlanPlatforms.join(", ") : "None yet"} />
            <InsightStat label="Angles covered" value={weeklyPlanAngles.length > 0 ? weeklyPlanAngles.slice(0, 4).join(", ") : "None yet"} />
            <InsightStat label="Ready posts available" value={String(readyPosts.length)} />
            <InsightStat label="Gaps to fill" value={weeklyPlanGaps.length > 0 ? weeklyPlanGaps.join(", ") : "Balanced enough"} />
            <InsightStat
              label="Mix warning"
              value={overusedWeeklyPlatform ? `${overusedWeeklyPlatform} is heavy this week` : overusedWeeklyAngle ? `${overusedWeeklyAngle} is heavy this week` : "No obvious overuse"}
            />
          </div>
        </div>
      </Card>

        </>
      )}

      {dashboardTab === "Activity" && (
        <>
      <DashboardSectionLabel
        title="Recent activity"
        description="Recent briefs, open opportunities, and upcoming planned items."
      />
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Activity Log</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Recent saves, routes, approvals, queue changes, and recoverable actions.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={undoLastActivity}>
            Undo last safe action
          </Button>
        </div>
        {activityLog.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
            Activity will appear here as sources are routed, posts are approved, items are scheduled, archived, hidden, or marked done.
          </p>
        ) : (
          <div className="mt-4 grid gap-2">
            {activityLog.slice(0, 12).map((activity) => (
              <div key={activity.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Pill>{activity.actionType}</Pill>
                    <Pill>{activity.status}</Pill>
                    {activity.destination && <Pill>{activity.destination}</Pill>}
                  </div>
                  <p className="mt-2 font-bold">{activity.title}</p>
                  <p className="mt-1 text-muted-foreground">{activity.summary}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{formatShortDateTime(activity.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Drafts across briefs" value={draftCount} />
        <Metric label="Approved across briefs" value={approvedCount} />
        <Metric label="Rejected across briefs" value={rejectedCount} />
        <Metric label="Saved profiles" value={profileCount} />
        <Metric label="Ready to post" value={readyQueueCount} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Recent briefs</h3>
              <p className="text-sm text-muted-foreground">
                Plan Conduit posts, founder-led updates, and repurposed content from one workflow.
              </p>
            </div>
            <Button onClick={() => setScreen("New Campaign")}>
              <Plus size={16} /> New
            </Button>
          </div>
          <div className="grid gap-3">
            {campaigns.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
                No posts yet. Create a post to generate drafts.
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={cn(
                    "rounded-lg border p-4 shadow-sm transition hover:border-primary hover:bg-teal-50",
                    activeCampaignId === campaign.id
                      ? "border-primary bg-teal-50"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <button
                    onClick={() => setActiveCampaignId(campaign.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{campaign.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill>{campaign.campaignType ?? "Original"}</Pill>
                          {campaign.repurposedFrom && (
                            <Pill>From: {campaign.repurposedFrom.label}</Pill>
                          )}
                          {campaign.opportunityTitle && (
                            <Pill>Opportunity: {campaign.opportunityTitle}</Pill>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{campaign.idea}</p>
                        {campaign.profileName && (
                          <p className="mt-2 text-sm font-semibold text-primary">
                            Profile: {campaign.profileName} · {campaign.profileType}
                          </p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                        {campaign.createdAt}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.platforms.map((platform) => (
                        <Pill key={platform}>{platform}</Pill>
                      ))}
                    </div>
                  </button>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => repurposeCampaign(campaign)}
                    >
                      Repurpose brief
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      Delete brief
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Open opportunities</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Things Conduit may want to act on: trends, mentions, replies, competitor posts, news, and customer moments.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setScreen("Opportunity Inbox")}>
                Open inbox
              </Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Metric label="New" value={openOpportunities} />
              <Metric label="High urgency" value={highUrgencyOpportunities} />
              <Metric label="Drafted" value={draftedOpportunities} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Upcoming posts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Next scheduled or planned Ready to Post items.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setScreen("Content Calendar")}>
                Open calendar
              </Button>
            </div>
            {upcomingPosts.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
                Schedule a Ready to Post item and it will appear here.
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {upcomingPosts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScreen("Content Calendar")}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-primary hover:bg-teal-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold">{item.campaignName}</p>
                      <Pill>{item.platform}</Pill>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {formatShortDateTime(calendarItemDate(item))} · {item.profileName || "No profile"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
        </>
      )}

      {dashboardTab === "System" && (
        <>
          <DashboardSectionLabel
            title="System status"
            description="Readiness, demo controls, and local development status stay here when you need them."
          />
          <div className="grid gap-5 lg:grid-cols-2">
          <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-bold">Recommended demo flow</summary>
            <div className="mt-4 grid gap-2">
              {[
                "Load demo data",
                "Create Post",
                "Review Drafts",
                "Approve one",
                "Ready to Post",
                "Repurpose content"
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-sm font-bold shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-bold">Demo mode</summary>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-primary">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Load sample data</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Load labeled sample profiles, Company Knowledge items, Brand Voice Rules, a content brief, and approved examples for presentations.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={loadDemoData}>
                <Sparkles size={16} /> Load demo data
              </Button>
              {showDemoData ? (
                <Button variant="secondary" onClick={hideDemoData}>
                  Hide demo data from views
                </Button>
              ) : (
                <Button variant="secondary" onClick={showDemoDataAgain}>
                  Show demo data
                </Button>
              )}
              <Button variant="secondary" onClick={clearDemoData}>
                Clear demo data
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo data is clearly labeled and will not duplicate if loaded more than once. Hide keeps demo records saved; clear removes only demo-labeled records.
            </p>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-bold">Workflow</summary>
            <div className="mt-4 grid gap-3">
              {[
                "Create a profile for the person, team, or company",
                "Add Company Knowledge inputs",
                "Review global Brand Voice Rules",
                "Create a post from a main idea or media",
                "Edit, approve, or reject generated posts"
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-sm font-bold shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </details>

          <DashboardSectionLabel
            title="Workspace details"
            description="Setup checklist, connection state, and local testing controls."
          />
          <WorkspaceReadinessCard
            readiness={workspaceReadiness}
            onAction={handleReadinessAction}
          />
          <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-bold">App status</summary>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-muted-foreground">Data mode</span>
                <span className="font-bold">
                  {storageMode === "supabase" ? "Shared workspace" : "Local browser"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-muted-foreground">Company Knowledge</span>
                <span className="font-bold">{librarySourceCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-muted-foreground">Ready to post</span>
                <span className="font-bold">{readyQueueCount}</span>
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-bold">Local testing</summary>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This only clears local test data in this browser. It does not affect files, OpenAI, or shared workspace data.
            </p>
            {storageMode === "supabase" && (
              <p className="mt-2 text-sm font-semibold text-primary">
                Shared data is connected, so this does not delete database records.
              </p>
            )}
            <Button className="mt-4" variant="danger" onClick={resetLocalData}>
              Reset local test data
            </Button>
          </details>
          </div>
        </>
      )}
    </div>
  );
}

function TodayActionCard({
  title,
  value,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  value: number;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-36 flex-col justify-between rounded-lg border border-slate-200 bg-white p-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-slate-700">{title}</p>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700">
            {value}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Button className="mt-3 w-full justify-center" size="sm" variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function DashboardSectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-extrabold uppercase tracking-widest text-primary">{title}</p>
      <p className="text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

type WorkspaceReadinessStatus = "Ready" | "Needs setup" | "Optional" | "Warning";
type WorkspaceReadinessActionId =
  | "create-profile"
  | "add-knowledge"
  | "review-brand"
  | "upload-media"
  | "create-post"
  | "add-metrics"
  | "load-demo"
  | "connections";

type WorkspaceReadinessItem = {
  category: string;
  status: WorkspaceReadinessStatus;
  detail: string;
  weight: number;
  actionId?: WorkspaceReadinessActionId;
  actionLabel?: string;
};

type WorkspaceReadiness = {
  score: number;
  label: "Needs setup" | "Usable" | "Demo ready" | "Production ready";
  demoReady: boolean;
  items: WorkspaceReadinessItem[];
  actions: {
    id: WorkspaceReadinessActionId;
    label: string;
  }[];
};

function WorkspaceReadinessCard({
  readiness,
  onAction
}: {
  readiness: WorkspaceReadiness;
  onAction: (actionId: WorkspaceReadinessActionId) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Workspace readiness
          </p>
          <h3 className="mt-1 text-lg font-bold">Setup checklist</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            A quick read on whether the workspace is ready to generate, review, post manually, and demo.
          </p>
        </div>
        <div className="min-w-44 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Readiness
            </span>
            <span className="text-lg font-extrabold">{readiness.score}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                "h-full rounded-full",
                readiness.score >= 85
                  ? "bg-teal-600"
                  : readiness.score >= 60
                    ? "bg-emerald-500"
                    : readiness.score >= 35
                      ? "bg-amber-500"
                      : "bg-rose-500"
              )}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-foreground">{readiness.label}</p>
          {readiness.demoReady && (
            <p className="mt-1 text-xs font-semibold text-primary">Demo data detected.</p>
          )}
        </div>
      </div>

      <details className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-bold">View detailed setup checklist</summary>
        <div className="mt-4 grid gap-2">
          {readiness.items.map((item) => (
            <div
              key={item.category}
              className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-sm font-bold">{item.category}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <ReadinessStatusPill status={item.status} />
                {item.actionId && item.actionLabel && (
                  <Button size="sm" variant="secondary" onClick={() => onAction(item.actionId!)}>
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold">Next actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {readiness.actions.length === 0 ? (
            <Pill>Workspace looks ready</Pill>
          ) : (
            readiness.actions.map((action) => (
              <Button key={action.id} size="sm" variant="secondary" onClick={() => onAction(action.id)}>
                {action.label}
              </Button>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function ReadinessStatusPill({ status }: { status: WorkspaceReadinessStatus }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold",
        status === "Ready" && "bg-teal-100 text-teal-800",
        status === "Needs setup" && "bg-rose-100 text-rose-800",
        status === "Warning" && "bg-amber-100 text-amber-800",
        status === "Optional" && "bg-slate-100 text-slate-700"
      )}
    >
      {status}
    </span>
  );
}

function buildWorkspaceReadiness({
  profiles,
  brandVoice,
  librarySources,
  mediaAssets,
  sourceInboxHistory,
  opportunities,
  postQueue,
  socialConnections,
  campaigns,
  storageMode
}: {
  profiles: Profile[];
  brandVoice: BrandVoiceProfile;
  librarySources: LibrarySource[];
  mediaAssets: MediaAsset[];
  sourceInboxHistory: SourceInboxHistoryItem[];
  opportunities: Opportunity[];
  postQueue: PostQueueItem[];
  socialConnections: SocialConnection[];
  campaigns: Campaign[];
  storageMode: StorageMode;
}): WorkspaceReadiness {
  const hasConduitProfile = profiles.some((profile) => profile.name.trim().toLowerCase().includes("conduit"));
  const activeKnowledgeSources = librarySources.filter((source) => source.reviewStatus !== "Save only");
  const hasBrandRules = Boolean(
    brandVoice.tone.trim() ||
    brandVoice.style.trim() ||
    brandVoice.audience.trim() ||
    brandVoice.avoid.trim()
  );
  const readyQueueItems = postQueue.filter((item) => normalizeQueueStatus(item.status) === "Ready");
  const postedItems = postQueue.filter((item) => normalizeQueueStatus(item.status) === "Posted" || normalizeQueueStatus(item.status) === "Replied");
  const metricItems = postedItems.filter((item) => metricsHaveValues(item.metrics));
  const instagramSandbox = socialConnections.find((connection) => connection.provider === "instagram" && connection.isSandbox);
  const demoReady = [
    ...profiles.map((profile) => profile.name),
    ...librarySources.map((source) => source.name),
    ...campaigns.map((campaign) => campaign.name),
    ...postQueue.map((item) => item.campaignName)
  ].some((label) => label.toLowerCase().includes("demo"));

  const items: WorkspaceReadinessItem[] = [
    {
      category: "Profile setup",
      status: hasConduitProfile ? "Ready" : profiles.length > 0 ? "Warning" : "Needs setup",
      detail: hasConduitProfile
        ? "Conduit profile exists and can be used as the default posting account."
        : profiles.length > 0
          ? "Profiles exist, but no clear Conduit profile was found."
          : "Create or load a Conduit profile before generating production posts.",
      weight: 16,
      actionId: hasConduitProfile ? undefined : "create-profile",
      actionLabel: hasConduitProfile ? undefined : "Create Conduit profile"
    },
    {
      category: "Conduit Brain setup",
      status: activeKnowledgeSources.length > 0 ? "Ready" : "Needs setup",
      detail: activeKnowledgeSources.length > 0
        ? `${activeKnowledgeSources.length} active source${activeKnowledgeSources.length === 1 ? "" : "s"} feed the Conduit Brain.`
        : "Add website copy, docs, transcripts, or proof points as the truth layer.",
      weight: 16,
      actionId: activeKnowledgeSources.length > 0 ? undefined : "add-knowledge",
      actionLabel: activeKnowledgeSources.length > 0 ? undefined : "Add Brain source"
    },
    {
      category: "Voice & Guardrails setup",
      status: hasBrandRules ? "Ready" : "Needs setup",
      detail: hasBrandRules
        ? "Global writing guardrails are available for generated posts."
        : "Add basic voice rules so drafts avoid generic or off-brand language.",
      weight: 12,
      actionId: hasBrandRules ? undefined : "review-brand",
      actionLabel: hasBrandRules ? undefined : "Review guardrails"
    },
    {
      category: "Media Library setup",
      status: mediaAssets.length > 0 ? "Ready" : "Optional",
      detail: mediaAssets.length > 0
        ? `${mediaAssets.length} reusable media asset${mediaAssets.length === 1 ? "" : "s"} available.`
        : "Optional, but useful for better Instagram, LinkedIn, and behind-the-scenes posts.",
      weight: 6,
      actionId: mediaAssets.length > 0 ? undefined : "upload-media",
      actionLabel: mediaAssets.length > 0 ? undefined : "Upload media"
    },
    {
      category: "Intake ready",
      status: sourceInboxHistory.length > 0 || activeKnowledgeSources.length > 0 ? "Ready" : "Optional",
      detail: sourceInboxHistory.length > 0
        ? `${sourceInboxHistory.length} source intake item${sourceInboxHistory.length === 1 ? "" : "s"} classified or routed.`
        : "Ready to route links, docs, notes, transcripts, media, or raw ideas.",
      weight: 6,
      actionId: sourceInboxHistory.length > 0 ? undefined : "add-knowledge",
      actionLabel: sourceInboxHistory.length > 0 ? undefined : "Open Intake"
    },
    {
      category: "Opportunities ready",
      status: opportunities.length > 0 ? "Ready" : "Optional",
      detail: opportunities.length > 0
        ? `${opportunities.length} opportunit${opportunities.length === 1 ? "y is" : "ies are"} captured for posts or replies.`
        : "Optional manual social listening is available for trends, mentions, and reply ideas.",
      weight: 5
    },
    {
      category: "Publish Queue ready",
      status: readyQueueItems.length > 0 ? "Ready" : campaigns.length > 0 ? "Warning" : "Needs setup",
      detail: readyQueueItems.length > 0
        ? `${readyQueueItems.length} approved item${readyQueueItems.length === 1 ? " is" : "s are"} waiting in the manual queue.`
        : campaigns.length > 0
          ? "Drafts exist, but nothing is approved into the manual queue yet."
          : "Create and approve a post to test the manual publishing workflow.",
      weight: 12,
      actionId: readyQueueItems.length > 0 ? undefined : "create-post",
      actionLabel: readyQueueItems.length > 0 ? undefined : "Create first post"
    },
    {
      category: "Analytics / metrics ready",
      status: metricItems.length > 0 ? "Ready" : postedItems.length > 0 ? "Warning" : "Warning",
      detail: metricItems.length > 0
        ? `${metricItems.length} posted item${metricItems.length === 1 ? " has" : "s have"} manual metrics.`
        : postedItems.length > 0
          ? "Posted items exist, but metrics have not been added yet."
          : "Add metrics after manual publishing to unlock performance insights.",
      weight: 8,
      actionId: metricItems.length > 0 ? undefined : "add-metrics",
      actionLabel: metricItems.length > 0 ? undefined : "Add metrics"
    },
    {
      category: "Connections / integrations status",
      status: instagramSandbox ? "Optional" : "Optional",
      detail: instagramSandbox
        ? "Instagram sandbox is configured or in progress. Publishing remains disabled for safety."
        : storageMode === "supabase"
          ? "Manual workflow is production path. Connections can be checked when needed."
          : "Local mode is active. Shared workspace and integrations can be checked later.",
      weight: 4,
      actionId: "connections",
      actionLabel: "Check Connections"
    },
    {
      category: "Demo data status",
      status: demoReady ? "Ready" : "Optional",
      detail: demoReady
        ? "Demo ready: labeled sample data is available for a founder walkthrough."
        : "Load demo data for a presentation-ready workspace without deleting real data.",
      weight: 6,
      actionId: demoReady ? undefined : "load-demo",
      actionLabel: demoReady ? undefined : "Load demo data"
    }
  ];

  const statusValue: Record<WorkspaceReadinessStatus, number> = {
    Ready: 1,
    Optional: 0.75,
    Warning: 0.45,
    "Needs setup": 0
  };
  const totalWeight = items.reduce((total, item) => total + item.weight, 0);
  const earnedWeight = items.reduce((total, item) => total + item.weight * statusValue[item.status], 0);
  const score = Math.min(100, Math.max(0, Math.round((earnedWeight / totalWeight) * 100)));
  const label: WorkspaceReadiness["label"] = demoReady
    ? "Demo ready"
    : score >= 88 && storageMode === "supabase"
      ? "Production ready"
      : score >= 72
        ? "Demo ready"
        : score >= 48
          ? "Usable"
          : "Needs setup";
  const actionMap = new Map<WorkspaceReadinessActionId, string>();
  items.forEach((item) => {
    if (item.actionId && item.actionLabel) actionMap.set(item.actionId, item.actionLabel);
  });

  return {
    score,
    label,
    demoReady,
    items,
    actions: Array.from(actionMap.entries())
      .map(([id, label]) => ({ id, label }))
      .slice(0, 6)
  };
}

type PostingPlanAction = {
  title: string;
  reason: string;
  platform: Platform | OpportunityPlatform | "Multiple";
  relatedItem?: string;
  priority: "Low" | "Medium" | "High";
  actionLabel: string;
  onAction: () => void;
};

function PostingPlanCard({ action }: { action: PostingPlanAction }) {
  return (
    <div className="flex min-h-56 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{action.priority} priority</Pill>
          <Pill>{action.platform}</Pill>
        </div>
        <h4 className="mt-3 text-base font-extrabold text-slate-950">{action.title}</h4>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.reason}</p>
        {action.relatedItem && (
          <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            Related: {action.relatedItem}
          </p>
        )}
      </div>
      <Button className="mt-4 w-full justify-center" size="sm" onClick={action.onAction}>
        {action.actionLabel}
      </Button>
    </div>
  );
}

function WeeklyPlanSlotCard({
  slot,
  actionLabel,
  onAction,
  onDismiss
}: {
  slot: WeeklyPlanSlot;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill>{slot.status}</Pill>
            <Pill>{slot.platform}</Pill>
            <Pill>{slot.contentAngle}</Pill>
          </div>
          <h4 className="mt-3 text-base font-extrabold text-slate-950">
            {slot.dayLabel}, {slot.dateLabel}
          </h4>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {slot.postingAccount} · {slot.sourceType}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss suggestion
        </Button>
      </div>
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-bold">{slot.sourceLabel}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{slot.reason}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
        {(slot.sourceType === "Ready to Post item" || slot.status === "Ready") && (
          <Button size="sm" variant="secondary" onClick={onAction}>
            Use ready post
          </Button>
        )}
      </div>
    </div>
  );
}
