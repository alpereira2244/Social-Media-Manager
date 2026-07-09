"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InsightStat, Pill } from "@/components/social-command-center/common-ui";
import { formatShortDateTime } from "@/lib/date-format";
import { inferMediaKindFromUrl } from "@/lib/media-utils";
import { readLocalValue, writeLocalValue } from "@/lib/local-storage";
import { engagementRate, engagementTotal, metricNumber, metricsHaveValues, performanceRate } from "@/lib/performance-metrics";
import { performanceInsights, weeklyLearningReview, type PerformanceSuggestion } from "@/lib/performance-insights";
import { userFacingPostContent } from "@/lib/post-content";
import { buildWeeklyPerformanceReports, type WeeklyPerformanceReport } from "@/lib/weekly-performance-reports";
import { normalizeQueueStatus, queueContentType } from "@/lib/queue-calendar";
import { cn } from "@/lib/utils";
import type { Campaign, ContentAngle, LibrarySource, Platform, PostQueueItem, SimpleStyleChip } from "@/lib/types";

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

const platforms: Platform[] = ["LinkedIn", "X", "Instagram", "TikTok"];

const analyticsStorageKeys = {
  weeklyPerformanceReportNotes: "scc.weeklyPerformanceReportNotes"
};

export function Analytics({
  postQueue,
  campaigns,
  librarySources,
  setScreen,
  setCampaignName,
  setIntent,
  setIdea,
  setSelectedPlatforms,
  setContentAngle,
  setSimpleStyleChips
}: {
  postQueue: PostQueueItem[];
  campaigns: Campaign[];
  librarySources: LibrarySource[];
  setScreen: (screen: Screen) => void;
  setCampaignName: (value: string) => void;
  setIntent: (value: string) => void;
  setIdea: (value: string) => void;
  setSelectedPlatforms: (platforms: Platform[]) => void;
  setContentAngle: (angle: ContentAngle | "") => void;
  setSimpleStyleChips: (chips: SimpleStyleChip[]) => void;
}) {
  const [postTypeFilter, setPostTypeFilter] = useState<"All" | "Sandbox" | "Real">("All");
  const [showFullWeeklyReview, setShowFullWeeklyReview] = useState(false);
  const [expandedMetricItemId, setExpandedMetricItemId] = useState("");
  const [expandedWeeklyReportId, setExpandedWeeklyReportId] = useState("");
  const [weeklyReportNotes, setWeeklyReportNotes] = useState<Record<string, string>>(() =>
    readLocalValue<Record<string, string>>(analyticsStorageKeys.weeklyPerformanceReportNotes, {})
  );
  const analytics = queueAnalytics(postQueue);
  const insights = performanceInsights(postQueue, campaigns);
  const weeklyReview = weeklyLearningReview(postQueue, campaigns, librarySources);
  const allPostedItems = postQueue.filter((item) => normalizeQueueStatus(item.status) === "Posted" && queueContentType(item) === "Post");
  const repliedItems = postQueue.filter((item) => normalizeQueueStatus(item.status) === "Replied" && queueContentType(item) === "Reply");
  const publishedItems = postQueue.filter((item) => {
    const status = normalizeQueueStatus(item.status);
    return status === "Posted" || status === "Replied";
  });
  const filteredPublishedItems = publishedItems.filter(
    (item) =>
      postTypeFilter === "All" ||
      (postTypeFilter === "Sandbox" ? item.isSandbox : !item.isSandbox)
  );
  const metricItems = allPostedItems.filter((item) => metricsHaveValues(item.metrics));
  const weeklyPerformanceReports = buildWeeklyPerformanceReports(metricItems, campaigns, weeklyReportNotes);
  const totalEngagements = metricItems.reduce((sum, item) => sum + engagementTotal(item), 0);
  const hasMetrics = metricItems.length > 0;
  const recommendedAdjustment =
    weeklyReview.recommendedContentAngles[0]
      ? `Lean into ${weeklyReview.recommendedContentAngles[0]} with a concrete Conduit proof point.`
      : "Add metrics to posted items, then use the strongest signal to shape next week.";

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

  function updateWeeklyReportNotes(reportId: string, notes: string) {
    const nextNotes = { ...weeklyReportNotes, [reportId]: notes };
    setWeeklyReportNotes(nextNotes);
    writeLocalValue(analyticsStorageKeys.weeklyPerformanceReportNotes, nextNotes);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Analytics</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Learn from manually entered metrics. Real account analytics are not connected yet.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setScreen("Ready to Post")}>
            Update metrics
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["All", "Real", "Sandbox"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setPostTypeFilter(filter)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-bold",
                postTypeFilter === filter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {filter === "All" ? "All" : filter === "Sandbox" ? "Sandbox/test" : "Real"}
            </button>
          ))}
          <Pill>Real: {allPostedItems.filter((item) => !item.isSandbox).length}</Pill>
          <Pill>Sandbox: {allPostedItems.filter((item) => item.isSandbox).length}</Pill>
          <Pill>Replies: {repliedItems.length}</Pill>
        </div>
      </Card>

      <DashboardSectionLabel
        title="Overview"
        description="The shortest read on publishing activity and learning confidence."
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <InsightStat label="Total posted" value={String(analytics.totalPosted)} />
        <InsightStat label="Total replies" value={String(repliedItems.length)} />
        <InsightStat label="Impressions" value={String(analytics.totalImpressions)} />
        <InsightStat label="Engagements" value={String(totalEngagements)} />
        <InsightStat label="Best platform" value={analytics.bestPlatform} />
        <InsightStat label="Learning confidence" value={insights.confidence} />
      </div>
      {!hasMetrics && (
        <Card className="border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="font-bold">Add metrics to posted items to unlock performance insights.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Mark posts as posted, then add impressions and interactions manually. Those numbers power this page, the Dashboard suggested plan, and weekly learning.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setScreen("Ready to Post")}>Go to Ready to Post</Button>
            <Button variant="secondary" onClick={() => setScreen("Content Library")}>Open Content Library</Button>
          </div>
        </Card>
      )}

      <DashboardSectionLabel
        title="Performance Insights"
        description="What is working, what to post more of, what to improve, and suggested next posts."
      />
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Learning loop</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Insights are based on manually entered metrics for now. Once accounts are connected, this can update automatically.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Items with metrics</p>
            <p className="mt-1 text-2xl font-extrabold">{insights.metricItems.length}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <InsightCard title="What is working" items={insights.working.slice(0, 3)} />
          <InsightCard title="What to post more of" items={insights.postMore.slice(0, 3)} />
          <InsightCard title="What to improve" items={insights.improve.slice(0, 3)} />
          <InsightCard title="Potential risks / weak spots" items={insights.risks.slice(0, 2)} />
        </div>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold">Suggested next posts</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Use these as starting points, not automatic decisions.
              </p>
            </div>
            <Pill>{insights.suggestions.length}</Pill>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {insights.suggestions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-muted-foreground lg:col-span-3">
                Add metrics to at least one posted item to get suggested next posts.
              </p>
            ) : (
              insights.suggestions.map((suggestion) => (
                <div key={suggestion.idea} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{suggestion.platform}</Pill>
                    {suggestion.contentAngle && <Pill>{suggestion.contentAngle}</Pill>}
                    {suggestion.styleChips.map((chip) => <Pill key={chip}>{chip}</Pill>)}
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6">{suggestion.idea}</p>
                  <Button className="mt-4" size="sm" onClick={() => generateFromInsight(suggestion)}>
                    Generate from insight
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <details className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-bold">View rankings</summary>
          <div className="mt-4 grid gap-5 xl:grid-cols-2">
            <InsightRankingCard
              title="Top posts by engagement rate"
              items={insights.topByEngagementRate}
              metric={(item) => `${performanceRate(item).toFixed(1)}%`}
            />
            <InsightRankingCard
              title="Top posts by impressions"
              items={insights.topByImpressions}
              metric={(item) => `${metricNumber(item.metrics?.impressions)} impressions`}
            />
            <InsightRankingCard
              title="Top posts by interactions"
              items={insights.topByInteractions}
              metric={(item) => `${engagementTotal(item)} interactions`}
            />
            <InsightRankingCard
              title="Lowest performing posts"
              items={insights.lowestPerforming}
              metric={(item) =>
                metricNumber(item.metrics?.impressions) > 0
                  ? `${performanceRate(item).toFixed(1)}%`
                  : `${engagementTotal(item)} interactions`
              }
            />
          </div>
        </details>
      </Card>

      <DashboardSectionLabel
        title="Weekly Review"
        description="A compact last-7-days recap based on manually entered metrics."
      />
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Learning summary</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Last 7 days: {weeklyReview.postsPublished} post{weeklyReview.postsPublished === 1 ? "" : "s"} published, {weeklyReview.repliesSent} repl{weeklyReview.repliesSent === 1 ? "y" : "ies"} sent, {weeklyReview.totalImpressions} impressions.
            </p>
          </div>
          <Button onClick={() => setScreen("Dashboard")}>
            Use this to generate next week&apos;s plan
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InsightStat label="Best post" value={weeklyReview.bestPost?.campaignName ?? "Not enough data"} />
          <InsightStat label="Strongest platform" value={weeklyReview.bestPlatform?.label ?? "Not enough data"} />
          <InsightStat label="Recommended adjustment" value={recommendedAdjustment} />
          <InsightStat label="Review confidence" value={weeklyReview.confidence} />
        </div>
        {weeklyReview.metricItems.length < 3 && (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
            Add posted items and metrics to generate a stronger weekly review.
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowFullWeeklyReview((current) => !current)}
          className="mt-5 text-sm font-bold text-primary hover:text-teal-700"
        >
          {showFullWeeklyReview ? "Hide full weekly review" : "View full weekly review"}
        </button>
        {showFullWeeklyReview && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
              <InsightStat label="Posts published" value={String(weeklyReview.postsPublished)} />
              <InsightStat label="Replies sent" value={String(weeklyReview.repliesSent)} />
              <InsightStat label="Impressions" value={String(weeklyReview.totalImpressions)} />
              <InsightStat label="Likes" value={String(weeklyReview.totalLikes)} />
              <InsightStat label="Comments" value={String(weeklyReview.totalComments)} />
              <InsightStat label="Shares / reposts" value={String(weeklyReview.totalShares)} />
              <InsightStat label="Metric confidence" value={weeklyReview.confidence} />
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              <InsightCard title="What worked" items={weeklyReview.whatWorked} />
              <InsightCard title="What to improve" items={weeklyReview.whatToImprove} />
              <InsightCard title="What to post more of" items={weeklyReview.whatToPostMoreOf} />
              <InsightCard title="What to avoid next week" items={weeklyReview.whatToAvoid} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold">Suggested next-week adjustments</h4>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <InsightStat label="Platforms" value={weeklyReview.recommendedPlatforms.join(", ") || "Add more metrics"} />
                <InsightStat label="Content angles" value={weeklyReview.recommendedContentAngles.join(", ") || "Add more metrics"} />
                <InsightStat label="Brain themes" value={weeklyReview.recommendedBrainThemes.join(", ") || "Add Company Knowledge"} />
                <InsightStat label="Media types" value={weeklyReview.recommendedMediaTypes.join(", ") || "Try media-backed posts"} />
                <InsightStat
                  label="Repurpose"
                  value={weeklyReview.repurposeCandidates.map((item) => item.campaignName).join(", ") || "No clear winner yet"}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      <DashboardSectionLabel
        title="Weekly Performance Reports"
        description="Cross-platform report cards for the templates you were tracking manually."
      />
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Report builder</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              These reports group posted items by brief and media asset, then aggregate manual metrics across platforms. Use the notes field for weekly takeaways and next steps.
            </p>
          </div>
          <Pill>{weeklyPerformanceReports.length} report{weeklyPerformanceReports.length === 1 ? "" : "s"}</Pill>
        </div>
        {weeklyPerformanceReports.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="font-bold">Add metrics to posted items to generate weekly performance reports.</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Once a post is marked posted and has impressions or engagements, it can roll into a cross-platform report with channel breakdowns and takeaways.
            </p>
            <Button className="mt-4" onClick={() => setScreen("Ready to Post")}>Update posted metrics</Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {weeklyPerformanceReports.map((report) => (
              <WeeklyPerformanceReportCard
                key={report.id}
                report={report}
                isExpanded={expandedWeeklyReportId === report.id}
                onToggle={() => setExpandedWeeklyReportId(expandedWeeklyReportId === report.id ? "" : report.id)}
                onNotesChange={(notes) => updateWeeklyReportNotes(report.id, notes)}
              />
            ))}
          </div>
        )}
      </Card>

      <DashboardSectionLabel
        title="Posted Content"
        description="Compact history of posted posts and sent replies with manual metrics."
      />
      <Card className="p-5">
        <div className="grid gap-3">
          {filteredPublishedItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">No posted or replied items match this filter.</p>
              <p className="mt-2">Go to Ready to Post or Content Library to mark items complete and add metrics.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={() => setScreen("Ready to Post")}>Go to Ready to Post</Button>
                <Button variant="secondary" onClick={() => setScreen("Content Library")}>Open Content Library</Button>
              </div>
            </div>
          ) : (
            filteredPublishedItems.map((item) => {
              const contentType = queueContentType(item);
              const isExpanded = expandedMetricItemId === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Pill>{item.platform}</Pill>
                        <Pill>{contentType}</Pill>
                        <Pill>{formatShortDateTime(item.postedAt || item.updatedAt || item.createdAt)}</Pill>
                        <Pill>{item.isSandbox ? "Sandbox/test" : "Real"}</Pill>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6">
                        {userFacingPostContent(item.postCopy || item.content)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill>{metricNumber(item.metrics?.impressions)} impressions</Pill>
                        <Pill>{engagementTotal(item)} engagements</Pill>
                        <Pill>{engagementRate(item)} engagement rate</Pill>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setExpandedMetricItemId(isExpanded ? "" : item.id)}>
                        Details
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setScreen("Ready to Post")}>
                        Update metrics
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setScreen("Content Library")}>
                        Repurpose
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <InsightStat label="Likes" value={String(metricNumber(item.metrics?.likes))} />
                      <InsightStat label="Comments" value={String(metricNumber(item.metrics?.comments))} />
                      <InsightStat label="Shares" value={String(metricNumber(item.metrics?.shares))} />
                      <InsightStat label="Saves" value={String(metricNumber(item.metrics?.saves))} />
                      <InsightStat label="Clicks" value={String(metricNumber(item.metrics?.clicks))} />
                      <InsightStat label="Source" value={item.opportunityTitle || item.campaignName} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function DashboardSectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function queueAnalytics(queue: PostQueueItem[]) {
  const posted = queue.filter((item) => queueContentType(item) === "Post" && normalizeQueueStatus(item.status) === "Posted");
  const totalImpressions = posted.reduce((sum, item) => sum + metricNumber(item.metrics?.impressions), 0);
  const totalLikes = posted.reduce((sum, item) => sum + metricNumber(item.metrics?.likes), 0);
  const platformEngagement = platforms.map((platform) => ({
    platform,
    engagement: posted
      .filter((item) => item.platform === platform)
      .reduce((sum, item) => sum + engagementTotal(item), 0)
  }));
  const best = platformEngagement.sort((a, b) => b.engagement - a.engagement)[0];

  return {
    totalPosted: posted.length,
    totalImpressions,
    totalLikes,
    bestPlatform: best && best.engagement > 0 ? best.platform : "Not enough data",
    topPosts: [...posted].sort((a, b) => engagementTotal(b) - engagementTotal(a)).slice(0, 3)
  };
}

function WeeklyPerformanceReportCard({
  report,
  isExpanded,
  onToggle,
  onNotesChange
}: {
  report: WeeklyPerformanceReport;
  isExpanded: boolean;
  onToggle: () => void;
  onNotesChange: (notes: string) => void;
}) {
  const previewKind = inferMediaKindFromUrl(report.mediaPreviewUrl);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-600">Cross-platform weekly performance template</p>
          <h4 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{report.title}</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InsightStat label="Channels active" value={`[${report.channels.join(", ")}]`} />
            <InsightStat label="Post date" value={report.dateLabel} />
            <InsightStat label="Post time" value={report.timeLabel} />
          </div>
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-center text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Creative asset preview</p>
            <div className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
              {report.mediaPreviewUrl && previewKind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.mediaPreviewUrl} alt={report.mediaName} className="max-h-64 w-full object-contain" />
              ) : report.mediaPreviewUrl && previewKind === "video" ? (
                <video src={report.mediaPreviewUrl} controls className="max-h-64 w-full" />
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <p className="font-bold text-slate-700">{report.mediaName}</p>
                  <p className="mt-1">{report.mediaType}</p>
                </div>
              )}
            </div>
          </div>
          <label className="mt-5 block">
            <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Weekly takeaways & next steps</span>
            <textarea
              className="mt-2 min-h-40 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 shadow-sm"
              value={report.takeaways}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </label>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h4 className="text-xl font-extrabold tracking-tight">Aggregated key performance metrics</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Built from {report.items.length} posted item{report.items.length === 1 ? "" : "s"} with manual metrics.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={onToggle}>
              {isExpanded ? "Hide details" : "View details"}
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-extrabold text-blue-800">Total impressions / views</p>
              <p className="mt-3 text-5xl font-extrabold tracking-tight text-blue-700">[{report.totalImpressions}]</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-extrabold text-emerald-800">Average engagement rate</p>
              <p className="mt-3 text-5xl font-extrabold tracking-tight text-emerald-700">[{report.averageEngagementRate.toFixed(2)}%]</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h5 className="font-bold text-slate-700">Cross-platform engagement breakdown</h5>
            <div className="mt-4 grid gap-2 text-sm leading-6">
              <p>Clicks / Visits <strong>[{report.totalClicks}]</strong></p>
              <p>Likes / Reactions <strong>[{report.totalLikes}]</strong></p>
              <p>Comments / Reposts <strong>[{report.totalComments + report.totalShares}]</strong></p>
              <p>Saves <strong>[{report.totalSaves}]</strong></p>
            </div>
            <h5 className="mt-5 font-bold text-slate-700">Channel breakdown</h5>
            <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {report.channelBreakdown.map((channel) => (
                <p key={channel.platform}>
                  <strong className="text-slate-800">{channel.platform}:</strong> [{channel.impressions}] imp · [{channel.engagementRate.toFixed(2)}%] ER · [{channel.clicks}] clicks · [{channel.likes}] likes · [{channel.comments}] comments · [{channel.shares}] reposts/shares
                </p>
              ))}
            </div>
          </div>
          {isExpanded && (
            <div className="mt-5 grid gap-3">
              {report.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{item.platform}</Pill>
                    <Pill>{formatShortDateTime(item.postedAt || item.updatedAt || item.createdAt)}</Pill>
                    {item.livePostUrl && <Pill>Live URL saved</Pill>}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">{userFacingPostContent(item.postCopy || item.content)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="font-bold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function InsightRankingCard({
  title,
  items,
  metric
}: {
  title: string;
  items: PostQueueItem[];
  metric: (item: PostQueueItem) => string;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
            Add metrics to posted items to populate this view.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.campaignName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.platform} · {item.profileName || "No posting account"}
                  </p>
                </div>
                <Pill>{metric(item)}</Pill>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
                {userFacingPostContent(item.postCopy || item.content)}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
