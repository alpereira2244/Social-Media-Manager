"use client";

import { useMemo, useState } from "react";
import { Clipboard, Plus, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BriefItem, Metric, Pill } from "@/components/social-command-center/common-ui";
import { formatShortDateTime } from "@/lib/date-format";
import {
  contentEngagementRate,
  contentEngagementTotal,
  engagementRate,
  metricNumber,
  metricsHaveValues,
  sortContentItems
} from "@/lib/performance-metrics";
import { extractPostDetail, userFacingPostContent } from "@/lib/post-content";
import { normalizeQueueStatus, queueContentType } from "@/lib/queue-calendar";
import { uniqueStrings } from "@/lib/text-utils";
import { cn } from "@/lib/utils";
import type {
  ApprovedPostMemory,
  BrandSafetyCheck,
  Campaign,
  ContentAngle,
  ContentOrigin,
  GeneratedPost,
  Opportunity,
  OpportunityReplyDraft,
  Platform,
  PostQueueItem,
  PostStatus,
  Profile,
  QueueStatus,
  ReviewMetadata
} from "@/lib/types";

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

type ContentLibraryItem = {
  id: string;
  source: "generated" | "approved" | "queue" | "opportunity_reply";
  contentType?: "Post" | "Reply";
  postCopy: string;
  contentOrigin?: ContentOrigin;
  manualSourceContent?: string;
  platform: Platform;
  postingAccount: string;
  profileId?: string;
  campaignId: string;
  campaignName: string;
  contentAngle?: ContentAngle;
  intent?: string;
  status: PostStatus | QueueStatus;
  mediaUsed: boolean;
  mediaAssetId?: string;
  mediaAssetName?: string;
  mediaPublicUrl?: string;
  livePostUrl?: string;
  postedAt?: string;
  publishNotes?: string;
  isSandbox?: boolean;
  safetyStatus?: BrandSafetyCheck["status"];
  review?: ReviewMetadata;
  readinessScore?: number;
  metrics?: PostQueueItem["metrics"];
  createdAt: string;
  campaignType: "Original" | "Repurposed";
  opportunityTitle?: string;
  campaign?: Campaign;
  post?: GeneratedPost;
  queueItem?: PostQueueItem;
  approvedMemory?: ApprovedPostMemory;
  opportunity?: Opportunity;
  replyDraft?: OpportunityReplyDraft;
};

export function ContentLibrary({
  campaigns,
  approvedPosts,
  postQueue,
  opportunities,
  profiles,
  setScreen,
  updateQueueItem,
  moveApprovedToQueue,
  repurposePost,
  mediaPreviewUrl
}: {
  campaigns: Campaign[];
  approvedPosts: ApprovedPostMemory[];
  postQueue: PostQueueItem[];
  opportunities: Opportunity[];
  profiles: Profile[];
  setScreen: (screen: Screen) => void;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  moveApprovedToQueue: (memory: ApprovedPostMemory) => void;
  repurposePost: (campaign: Campaign, post: GeneratedPost) => void;
  mediaPreviewUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [mediaFilter, setMediaFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [postTypeFilter, setPostTypeFilter] = useState<"All" | "Sandbox" | "Real">("All");
  const [sortMode, setSortMode] = useState("Newest first");
  const [libraryTab, setLibraryTab] = useState("All");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [previewItemId, setPreviewItemId] = useState("");
  const [detailItemId, setDetailItemId] = useState("");
  const [copyState, setCopyState] = useState("");

  const items = useMemo(
    () => buildContentLibraryItems(campaigns, approvedPosts, postQueue, profiles, opportunities),
    [campaigns, approvedPosts, postQueue, profiles, opportunities]
  );
  const filteredItems = items.filter((item) => {
    const haystack = [
      item.postCopy,
      item.campaignName,
      item.intent,
      item.opportunityTitle,
      item.platform,
      item.postingAccount
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const matchesLibraryTab =
      libraryTab === "All" ||
      (libraryTab === "Drafts" && contentStatusLabel(item.status) === "Draft") ||
      (libraryTab === "Approved" && contentStatusLabel(item.status) === "Approved") ||
      (libraryTab === "Ready" && contentStatusLabel(item.status) === "Ready") ||
      (libraryTab === "Posted" && contentStatusLabel(item.status) === "Posted") ||
      (libraryTab === "Archived" && contentStatusLabel(item.status) === "Archived") ||
      (libraryTab === "Repurposed" && item.campaignType === "Repurposed") ||
      (libraryTab === "Top Performing" &&
        contentStatusLabel(item.status) === "Posted" &&
        contentEngagementTotal(item) > 0);
    return (
      matchesSearch &&
      matchesLibraryTab &&
      (statusFilter === "All" || item.status === statusFilter) &&
      (platformFilter === "All" || item.platform === platformFilter) &&
      (profileFilter === "All" || item.profileId === profileFilter || item.postingAccount === profileFilter) &&
      (campaignFilter === "All" || item.campaignId === campaignFilter) &&
      (mediaFilter === "All" ||
        (mediaFilter === "Created from media" ? Boolean(item.mediaAssetId) : mediaFilter === "Media used" ? item.mediaUsed : !item.mediaUsed)) &&
      (typeFilter === "All" || item.campaignType === typeFilter) &&
      (postTypeFilter === "All" ||
        (postTypeFilter === "Sandbox" ? item.isSandbox : !item.isSandbox))
    );
  }).sort((a, b) => sortContentItems(a, b, sortMode));
  const topPerforming = items
    .filter((item) => contentStatusLabel(item.status) === "Posted" && contentEngagementTotal(item) > 0)
    .sort((a, b) => contentEngagementTotal(b) - contentEngagementTotal(a))
    .slice(0, 3);
  const profileOptions = uniqueStrings(items.map((item) => item.profileId || item.postingAccount).filter(Boolean));
  const campaignOptions = campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name }));
  const detailItem = items.find((item) => item.id === detailItemId);
  const libraryTabs = ["All", "Drafts", "Approved", "Ready", "Posted", "Archived", "Repurposed", "Top Performing"];

  async function copyItem(item: ContentLibraryItem) {
    try {
      await navigator.clipboard.writeText(item.postCopy);
      setCopyState(item.id);
      window.setTimeout(() => setCopyState(""), 1200);
    } catch {
      setCopyState("");
    }
  }

  function previewPostForItem(item: ContentLibraryItem) {
    if (item.post && item.campaign) {
      return { post: item.post, campaign: item.campaign };
    }
    const profile = profiles.find((profileItem) => profileItem.id === item.profileId);
    const campaign: Campaign = {
      id: item.campaignId,
      name: item.campaignName,
      idea: "",
      intent: item.intent,
      contentAngle: item.contentAngle,
      campaignType: item.campaignType,
      platforms: [item.platform],
      posts: [],
      createdAt: item.createdAt,
      contentOrigin: item.contentOrigin,
      manualSourceContent: item.manualSourceContent,
      profileId: item.profileId,
      profileName: item.postingAccount,
      profileType: profile?.type,
      mediaContext: item.mediaUsed
        ? {
            filename: item.mediaAssetName,
            assetName: item.mediaAssetName,
            publicUrl: item.mediaPublicUrl,
            notes: item.publishNotes
          }
        : undefined
    };
    const post: GeneratedPost = {
      id: item.id,
      platform: item.platform,
      postCopy: item.postCopy,
      content: item.postCopy,
      status:
        item.status === "rejected"
          ? "rejected"
          : item.status === "draft"
            ? "draft"
            : "approved",
      score: item.readinessScore ?? 85,
      contentOrigin: item.contentOrigin,
      manualSourceContent: item.manualSourceContent,
      mediaUsed: item.mediaUsed,
      rationale: item.queueItem?.rationale,
      recommendedMediaUse: item.queueItem?.recommendedMediaUse,
      altText: item.queueItem?.altText,
      overlayText: item.queueItem?.overlayText,
      cta: item.queueItem?.cta,
      hashtags: item.queueItem?.hashtags,
      firstComment: item.queueItem?.firstComment,
      carouselIdeas: item.queueItem?.carouselIdeas,
      shotList: item.queueItem?.shotList,
      safetyCheck: item.queueItem?.safetyCheck,
      profileId: item.profileId,
      profileName: item.postingAccount,
      profileType: profile?.type
    };
    return { post, campaign };
  }

  function repurposeItem(item: ContentLibraryItem) {
    const preview = previewPostForItem(item);
    repurposePost(preview.campaign, preview.post);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Content Library</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Content Library is the permanent archive of everything created, approved, posted, archived, or repurposed.
            </p>
          </div>
          <Button onClick={() => setScreen("New Campaign")}>
            <Plus size={16} /> Create post
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {libraryTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setLibraryTab(tab);
                setStatusFilter("All");
              }}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-bold transition",
                libraryTab === tab
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search post copy, brief, intent, platform, account..."
          />
          <ContentFilter value={platformFilter} onChange={setPlatformFilter} options={["All", ...platforms]} />
          <ContentFilter value={statusFilter} onChange={setStatusFilter} options={["All", "draft", "approved", "Ready", "Scheduled", "Posted", "Replied", "Archived"]} />
          <ContentFilter value={sortMode} onChange={setSortMode} options={["Newest first", "Oldest first", "Highest engagement", "Highest impressions", "Highest readiness score"]} />
          <Button variant="secondary" onClick={() => setShowMoreFilters((current) => !current)}>
            {showMoreFilters ? "Hide filters" : "More filters"}
          </Button>
        </div>
        {showMoreFilters && (
          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            <ContentFilter value={profileFilter} onChange={setProfileFilter} options={["All", ...profileOptions]} />
            <ContentFilter value={campaignFilter} onChange={setCampaignFilter} options={["All", ...campaignOptions.map((item) => item.id)]} labels={{ All: "All briefs", ...Object.fromEntries(campaignOptions.map((item) => [item.id, item.name])) }} />
            <ContentFilter value={mediaFilter} onChange={setMediaFilter} options={["All", "Created from media", "Media used", "No media"]} />
            <ContentFilter value={typeFilter} onChange={setTypeFilter} options={["All", "Original", "Repurposed"]} />
            <ContentFilter value={postTypeFilter} onChange={(value) => setPostTypeFilter(value as typeof postTypeFilter)} options={["All", "Real", "Sandbox"]} labels={{ All: "All post types", Real: "Real posts only", Sandbox: "Sandbox/test" }} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={statusFilter === "Posted" ? "primary" : "secondary"} onClick={() => {
            setLibraryTab("All");
            setStatusFilter("Posted");
          }}>
            Posted
          </Button>
          <Button size="sm" variant={postTypeFilter === "Sandbox" ? "primary" : "secondary"} onClick={() => setPostTypeFilter("Sandbox")}>
            Sandbox/test
          </Button>
          <Button size="sm" variant={postTypeFilter === "Real" ? "primary" : "secondary"} onClick={() => setPostTypeFilter("Real")}>
            Real posts only
          </Button>
          <Button size="sm" variant={mediaFilter === "Created from media" ? "primary" : "secondary"} onClick={() => setMediaFilter("Created from media")}>
            Created from media
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length} content items.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Top performing</h3>
            <p className="mt-1 text-sm text-muted-foreground">Based on manual metrics from posted Ready to Post items.</p>
          </div>
          <Pill>{topPerforming.length} posted</Pill>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {topPerforming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground lg:col-span-3">
              Add metrics to posted items to see top performers.
            </p>
          ) : (
            topPerforming.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <Pill>{item.platform}</Pill>
                  <Pill>{contentEngagementTotal(item)} engagement</Pill>
                  {item.isSandbox && <Pill>Sandbox/test</Pill>}
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6">{item.postCopy}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {metricNumber(item.metrics?.impressions)} impressions · {contentEngagementRate(item)} engagement rate
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">Create, approve, or post content and it will appear here.</p>
          <Button className="mt-4" onClick={() => setScreen("New Campaign")}>Create a post</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => {
            const preview = previewPostForItem(item);
            const isPreviewing = previewItemId === item.id;
            return (
              <Card
                key={item.id}
                className={cn(
                  "p-4",
                  contentStatusLabel(item.status) === "Posted" && "border-teal-200 bg-teal-50/30",
                  contentStatusLabel(item.status) === "Draft" && "border-slate-200 bg-white"
                )}
              >
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Pill>{item.platform}</Pill>
                      <Pill>{item.contentType ?? (item.source === "opportunity_reply" ? "Reply" : "Post")}</Pill>
                      <Pill>{contentStatusLabel(item.status)}</Pill>
                      {item.contentOrigin && <Pill>{item.contentOrigin}</Pill>}
                      {item.isSandbox && <Pill>Sandbox/test</Pill>}
                      {item.mediaAssetId ? <Pill>Created from media</Pill> : item.mediaUsed && <Pill>Media used</Pill>}
                      {typeof item.readinessScore === "number" && <Pill>Readiness {item.readinessScore}/100</Pill>}
                      {contentStatusLabel(item.status) === "Posted" && metricsHaveValues(item.metrics) && (
                        <Pill>Used in insights</Pill>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6">{item.postCopy}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {item.postingAccount} · {item.campaignName} · {item.contentAngle || "No angle"} · {formatShortDateTime(item.postedAt || item.createdAt)}
                    </p>
                    {item.opportunityTitle && (
                      <p className="mt-2 text-sm font-semibold text-primary">
                        Created from opportunity: {item.opportunityTitle} · Type: {item.contentType ?? (item.source === "opportunity_reply" ? "Reply" : "Post")}
                      </p>
                    )}
                    {item.mediaAssetId && item.mediaAssetName && (
                      <p className="mt-2 text-sm font-semibold text-primary">
                        Created from media asset: {item.mediaAssetName}
                      </p>
                    )}
                    {contentStatusLabel(item.status) === "Posted" && (
                      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                        <BriefItem label="Live URL" value={item.livePostUrl || "No live URL saved"} />
                        <BriefItem label="Posted" value={formatShortDateTime(item.postedAt)} />
                      </div>
                    )}
                    {contentStatusLabel(item.status) === "Draft" && (
                      <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                        Draft only. Review and approve it when ready.
                      </p>
                    )}
                    {item.metrics && contentStatusLabel(item.status) === "Posted" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill>{metricNumber(item.metrics.impressions)} impressions</Pill>
                        <Pill>{metricNumber(item.metrics.likes)} likes</Pill>
                        <Pill>{metricNumber(item.metrics.comments)} comments</Pill>
                        <Pill>{metricNumber(item.metrics.shares)} shares</Pill>
                        <Pill>{metricNumber(item.metrics.saves)} saves</Pill>
                        <Pill>{metricNumber(item.metrics.clicks)} clicks</Pill>
                        <Pill>{contentEngagementRate(item)} engagement rate</Pill>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => copyItem(item)}>
                      <Clipboard size={14} /> {copyState === item.id ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPreviewItemId(isPreviewing ? "" : item.id)}>
                      {isPreviewing ? "Hide preview" : "Preview"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setDetailItemId(item.id)}>
                      Details
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => repurposeItem(item)}>
                      <Repeat2 size={14} /> Repurpose
                    </Button>
                    {item.approvedMemory && !item.queueItem && (
                      <Button size="sm" onClick={() => moveApprovedToQueue(item.approvedMemory!)}>
                        Move to Ready
                      </Button>
                    )}
                    {contentStatusLabel(item.status) === "Draft" && (
                      <Button size="sm" variant="secondary" onClick={() => setScreen("Review Drafts")}>
                        Review draft
                      </Button>
                    )}
                    {item.queueItem && normalizeQueueStatus(item.queueItem.status) !== "Archived" && (
                      <Button size="sm" variant="secondary" onClick={() => updateQueueItem(item.queueItem!.id, { status: "Archived" })}>
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
                {isPreviewing && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Pill>{preview.post.platform}</Pill>
                      <Pill>{preview.campaign.profileName || item.postingAccount}</Pill>
                      {preview.campaign.mediaContext?.filename && <Pill>Media: {preview.campaign.mediaContext.filename}</Pill>}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {userFacingPostContent(preview.post.postCopy || preview.post.content, preview.campaign, preview.post)}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {detailItem && (
        <ContentDetailPanel
          item={detailItem}
          preview={previewPostForItem(detailItem)}
          mediaPreviewUrl={mediaPreviewUrl}
          onClose={() => setDetailItemId("")}
          onCopy={() => copyItem(detailItem)}
          onOpenMediaLibrary={() => {
            setDetailItemId("");
            setScreen("Media Library");
          }}
          onRepurpose={() => repurposeItem(detailItem)}
        />
      )}
    </div>
  );
}

function ContentFilter({
  value,
  onChange,
  options,
  labels = {}
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-0 rounded-md border border-input bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option] ?? option}
        </option>
      ))}
    </select>
  );
}

function ContentDetailPanel({
  item,
  preview,
  mediaPreviewUrl,
  onClose,
  onCopy,
  onOpenMediaLibrary,
  onRepurpose
}: {
  item: ContentLibraryItem;
  preview: { post: GeneratedPost; campaign: Campaign };
  mediaPreviewUrl: string;
  onClose: () => void;
  onCopy: () => void;
  onOpenMediaLibrary: () => void;
  onRepurpose: () => void;
}) {
  const [tab, setTab] = useState("Overview");
  const details = supportingDetailsFromPost(preview.post);
  const tabs = ["Overview", "Post Copy", "Media", "Metrics", "Source Brief", "Repurpose"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 p-4">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Content details</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">{item.campaignName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.platform} · {item.postingAccount}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onCopy}>
              <Clipboard size={14} /> Copy
            </Button>
            <Button size="sm" onClick={onRepurpose}>
              <Repeat2 size={14} /> Repurpose
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 p-3">
          {tabs.map((itemTab) => (
            <button
              key={itemTab}
              type="button"
              onClick={() => setTab(itemTab)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold",
                tab === itemTab
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {itemTab}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "Overview" && (
            <div className="grid gap-3 md:grid-cols-2">
              <BriefItem label="Platform" value={item.platform} />
              <BriefItem label="Content type" value={item.contentType ?? (item.source === "opportunity_reply" ? "Reply" : "Post")} />
              <BriefItem label="Posting account" value={item.postingAccount} />
              <BriefItem label="Status" value={contentStatusLabel(item.status)} />
              <BriefItem label="Content brief" value={item.campaignName} />
              <BriefItem label="Created from opportunity" value={item.opportunityTitle || "No opportunity linked"} />
              <BriefItem label="Content angle" value={item.contentAngle || "No angle saved"} />
              <BriefItem label="Intent" value={item.intent || "No intent saved"} />
              <BriefItem label="Live URL" value={item.livePostUrl || "No live URL saved"} />
              <BriefItem label="Posted" value={formatShortDateTime(item.postedAt)} />
              <BriefItem label="Post type" value={item.isSandbox ? "Sandbox/test post" : "Real post"} />
              <BriefItem label="Readiness" value={typeof item.readinessScore === "number" ? `${item.readinessScore}/100` : "Not scored"} />
              <BriefItem label="Brand safety" value={item.safetyStatus || "Not checked"} />
              <BriefItem label="Review status" value={item.review?.status || "No review yet"} />
              <BriefItem label="Reviewer" value={item.review?.reviewerName || "No reviewer assigned"} />
              <BriefItem label="Latest feedback" value={item.review?.feedback || "No feedback notes"} />
            </div>
          )}

          {tab === "Post Copy" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6">{item.postCopy}</p>
              </div>
              {details.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {details.map((detail) => (
                    <BriefItem key={detail.label} label={detail.label} value={detail.value} />
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
                  No supporting fields saved for this post.
                </p>
              )}
            </div>
          )}

          {tab === "Media" && (
            <div className="space-y-4">
              {item.mediaUsed ? (
                <>
                  <MediaPreviewFrame campaign={preview.campaign} mediaPreviewUrl={item.mediaPublicUrl || mediaPreviewUrl} className="max-h-96" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <BriefItem label="Media asset" value={item.mediaAssetName || "Media used"} />
                    <BriefItem label="Media notes" value={preview.campaign.mediaContext?.notes || "No media notes saved"} />
                    <BriefItem label="AI analysis" value={preview.campaign.mediaContext?.analysis?.description || "No media analysis saved"} />
                  </div>
                  {item.mediaAssetId && (
                    <Button variant="secondary" onClick={onOpenMediaLibrary}>
                      Open media asset in Media Library
                    </Button>
                  )}
                </>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
                  No media was used for this post.
                </p>
              )}
            </div>
          )}

          {tab === "Metrics" && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Metric label="Impressions" value={metricNumber(item.metrics?.impressions)} />
              <Metric label="Likes" value={metricNumber(item.metrics?.likes)} />
              <Metric label="Comments" value={metricNumber(item.metrics?.comments)} />
              <Metric label="Shares" value={metricNumber(item.metrics?.shares)} />
              <Metric label="Saves" value={metricNumber(item.metrics?.saves)} />
              <Metric label="Clicks" value={metricNumber(item.metrics?.clicks)} />
              <Card className="p-5">
                <p className="text-sm font-semibold text-muted-foreground">Engagement rate</p>
                <p className="mt-2 text-2xl font-bold">{engagementRate(item.queueItem)}</p>
              </Card>
              <div className="lg:col-span-4">
                <BriefItem label="Notes" value={item.publishNotes || "No publishing notes saved"} />
              </div>
            </div>
          )}

          {tab === "Source Brief" && (
            <div className="grid gap-3 md:grid-cols-2">
              <BriefItem label="Original brief" value={item.campaignName} />
              <BriefItem label="Brief type" value={item.campaignType} />
              <BriefItem label="Opportunity" value={item.opportunityTitle || "No opportunity linked"} />
              <BriefItem label="Rationale" value={preview.post.rationale || "No rationale saved"} />
              <BriefItem label="Source" value={item.source} />
              <BriefItem label="Intent" value={item.intent || "No intent saved"} />
              <BriefItem label="Content angle" value={item.contentAngle || "No content angle saved"} />
              <BriefItem
                label="Inspiration profile used"
                value={
                  (preview.campaign?.inspirationProfileNames ?? []).length > 0
                    ? (preview.campaign?.inspirationProfileNames ?? []).join(", ")
                    : "None"
                }
              />
              <BriefItem
                label="Claims used"
                value={
                  (preview.post.safetyCheck?.claimMatches ?? []).length > 0
                    ? (preview.post.safetyCheck?.claimMatches ?? []).map((match) => `${match.claimType}: ${match.claimText}`).join("\n")
                    : (preview.campaign.claimLibraryApprovedClaims ?? []).length > 0
                      ? `Approved claims available: ${(preview.campaign.claimLibraryApprovedClaims ?? []).join("; ")}`
                      : "No tracked claim matches."
                }
              />
            </div>
          )}

          {tab === "Repurpose" && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
              <p className="font-bold text-teal-900">Repurpose this posted content</p>
              <p className="mt-2 text-sm leading-6 text-teal-900">
                Turn this historical post into new platform-native drafts while keeping the original record intact.
              </p>
              <Button className="mt-4" onClick={onRepurpose}>
                <Repeat2 size={16} /> Repurpose this post
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildContentLibraryItems(
  campaigns: Campaign[],
  approvedPosts: ApprovedPostMemory[],
  postQueue: PostQueueItem[],
  profiles: Profile[],
  opportunities: Opportunity[] = []
) {
  const queueByPostId = new Map(postQueue.map((item) => [item.generatedPostId, item]));
  const approvedByPostId = new Map(approvedPosts.map((item) => [item.generatedPostId, item]));
  const generatedIds = new Set<string>();
  const items: ContentLibraryItem[] = [];

  campaigns.forEach((campaign) => {
    campaign.posts.forEach((post) => {
      generatedIds.add(post.id);
      const queueItem = queueByPostId.get(post.id);
      const approvedMemory = approvedByPostId.get(post.id);
      items.push({
        id: `generated-${post.id}`,
        source: queueItem ? "queue" : "generated",
        contentType: queueItem?.contentType ?? "Post",
        postCopy: queueItem?.postCopy || queueItem?.content || userFacingPostContent(post.content, campaign, post),
        contentOrigin: queueItem?.contentOrigin || post.contentOrigin || campaign.contentOrigin,
        manualSourceContent: queueItem?.manualSourceContent || post.manualSourceContent || campaign.manualSourceContent,
        platform: post.platform,
        postingAccount: campaign.profileName || post.profileName || "General profile",
        profileId: campaign.profileId || post.profileId,
        campaignId: campaign.id,
        campaignName: campaign.name,
        contentAngle: campaign.contentAngle,
        intent: campaign.intent,
        status: queueItem?.status ?? post.status,
        mediaUsed: Boolean(queueItem?.mediaUsed || post.mediaUsed || campaign.mediaContext?.filename),
        mediaAssetId: queueItem?.mediaAssetId || campaign.mediaContext?.assetId,
        mediaAssetName: queueItem?.mediaAssetName || campaign.mediaContext?.assetName || campaign.mediaContext?.filename,
        mediaPublicUrl: queueItem?.mediaPublicUrl || campaign.mediaContext?.publicUrl,
        livePostUrl: queueItem?.livePostUrl,
        postedAt: queueItem?.postedAt,
        publishNotes: queueItem?.publishNotes,
        isSandbox: queueItem?.isSandbox,
        safetyStatus: queueItem?.safetyCheck?.status || post.safetyCheck?.status,
        review: queueItem?.review || post.review,
        readinessScore: post.score,
        metrics: queueItem?.metrics,
        createdAt: queueItem?.createdAt || campaign.createdAt,
        campaignType: campaign.campaignType ?? "Original",
        opportunityTitle: campaign.opportunityTitle,
        campaign,
        post,
        queueItem,
        approvedMemory
      });
    });
  });

  approvedPosts
    .filter((post) => !generatedIds.has(post.generatedPostId))
    .forEach((post) => {
      const profile = profiles.find((item) => item.id === post.profileId);
      const queueItem = queueByPostId.get(post.generatedPostId);
      items.push({
        id: `approved-${post.id}`,
        source: queueItem ? "queue" : "approved",
        contentType: queueItem?.contentType ?? "Post",
        postCopy: queueItem?.postCopy || queueItem?.content || userFacingPostContent(post.finalContent),
        contentOrigin: queueItem?.contentOrigin,
        manualSourceContent: queueItem?.manualSourceContent,
        platform: post.platform,
        postingAccount: profile?.name || "Approved profile",
        profileId: post.profileId,
        campaignId: post.campaignId,
        campaignName: queueItem?.campaignName || "Approved content",
        contentAngle: post.contentAngle,
        intent: post.intent,
        status: queueItem?.status ?? "approved",
        mediaUsed: Boolean(queueItem?.mediaUsed || post.mediaUsed),
        mediaAssetId: queueItem?.mediaAssetId,
        mediaAssetName: queueItem?.mediaAssetName,
        mediaPublicUrl: queueItem?.mediaPublicUrl,
        livePostUrl: queueItem?.livePostUrl,
        postedAt: queueItem?.postedAt,
        publishNotes: queueItem?.publishNotes,
        isSandbox: queueItem?.isSandbox,
        safetyStatus: queueItem?.safetyCheck?.status || post.supportingFields?.safetyCheck?.status,
        review: queueItem?.review || post.supportingFields?.review,
        readinessScore: undefined,
        metrics: queueItem?.metrics,
        createdAt: queueItem?.createdAt || post.createdAt,
        campaignType: "Original",
        opportunityTitle: queueItem?.opportunityTitle,
        queueItem,
        approvedMemory: post
      });
    });

  postQueue
    .filter((item) => !generatedIds.has(item.generatedPostId) && !approvedByPostId.has(item.generatedPostId))
    .forEach((item) => {
      items.push({
        id: `queue-${item.id}`,
        source: "queue",
        contentType: queueContentType(item),
        postCopy: item.postCopy || item.content,
        contentOrigin: item.contentOrigin,
        manualSourceContent: item.manualSourceContent,
        platform: item.platform,
        postingAccount: item.profileName || "No profile",
        profileId: item.profileId,
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        contentAngle: item.contentAngle,
        intent: item.intent,
        status: item.status,
        mediaUsed: item.mediaUsed,
        mediaAssetId: item.mediaAssetId,
        mediaAssetName: item.mediaAssetName,
        mediaPublicUrl: item.mediaPublicUrl,
        livePostUrl: item.livePostUrl,
        postedAt: item.postedAt,
        publishNotes: item.publishNotes,
        isSandbox: item.isSandbox,
        safetyStatus: item.safetyCheck?.status,
        review: item.review,
        readinessScore: undefined,
        metrics: item.metrics,
        createdAt: item.createdAt,
        campaignType: "Original",
        opportunityTitle: item.opportunityTitle,
        queueItem: item
      });
    });

  const queuedReplyIds = new Set(
    postQueue
      .filter((item) => queueContentType(item) === "Reply")
      .map((item) => item.generatedPostId)
  );

  opportunities.forEach((opportunity) => {
    (opportunity.replyDrafts ?? [])
      .filter((reply) => reply.status === "Approved" && reply.approvedReply && !queuedReplyIds.has(reply.id))
      .forEach((reply) => {
        items.push({
          id: `opportunity-reply-${reply.id}`,
          source: "opportunity_reply",
          contentType: "Reply",
          postCopy: reply.approvedReply || reply.shortReply,
          platform: reply.recommendedPlatform,
          postingAccount: "Conduit",
          campaignId: opportunity.relatedCampaignId || opportunity.id,
          campaignName: `Reply: ${opportunity.title}`,
          intent: `Reply to opportunity: ${opportunity.title}`,
          status: "approved",
          mediaUsed: Boolean(opportunity.screenshot?.filename),
          safetyStatus: reply.brandSafetyNotes.length > 0 ? "Needs review" : "Safe",
          review: reply.review,
          createdAt: reply.updatedAt || reply.createdAt,
          campaignType: "Original",
          opportunityTitle: opportunity.title,
          opportunity,
          replyDraft: reply
        });
      });
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function contentStatusLabel(status: ContentLibraryItem["status"]) {
  if (status === "draft") return "Draft";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status;
}







function supportingDetailsFromPost(post: GeneratedPost) {
  return [
    { label: "Recommended media use", value: post.recommendedMediaUse || extractPostDetail(post.content, "Recommended media use") },
    { label: "Alt text", value: post.altText || extractPostDetail(post.content, "Optional alt text") },
    { label: "Overlay text", value: post.overlayText || extractPostDetail(post.content, "Suggested overlay text") },
    { label: "CTA", value: post.cta || extractPostDetail(post.content, "CTA") },
    { label: "Hashtags", value: post.hashtags?.join(" ") ?? "" },
    { label: "First comment", value: post.firstComment ?? "" },
    { label: "Carousel ideas", value: post.carouselIdeas?.join("\n") ?? "" },
    { label: "Shot list", value: post.shotList?.join("\n") ?? "" }
  ].filter((detail) => detail.value);
}

function MediaPreviewFrame({
  campaign,
  mediaPreviewUrl,
  className
}: {
  campaign: Campaign;
  mediaPreviewUrl: string;
  className?: string;
}) {
  const type = campaign.mediaContext?.type;
  const previewUrl = mediaPreviewUrl || campaign.mediaContext?.publicUrl || "";

  if (previewUrl && type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={campaign.mediaContext?.filename ?? "Uploaded media"}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (previewUrl && type === "video") {
    return (
      <video
        src={previewUrl}
        controls
        className={cn("h-full w-full bg-black object-cover", className)}
      />
    );
  }

  if (previewUrl && type === "audio") {
    return (
      <div className={cn("flex h-full w-full flex-col justify-center bg-white p-4", className)}>
        <p className="mb-3 text-sm font-bold">{campaign.mediaContext?.filename}</p>
        <audio src={previewUrl} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-52 w-full items-center justify-center bg-muted p-6 text-center text-sm font-semibold text-muted-foreground", className)}>
      {campaign.mediaContext?.filename ? "Media preview unavailable after refresh." : "No media attached."}
    </div>
  );
}
