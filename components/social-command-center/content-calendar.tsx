"use client";

import { Clipboard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InsightStat, Pill, QueueFilter } from "@/components/social-command-center/common-ui";
import { platformUrls, toDateTimeLocalValue } from "@/components/social-command-center/queue-execution-utils";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { platforms } from "@/lib/mock-data";
import { buildWeeklyContentPlan, type WeeklyPlanSlot } from "@/lib/planning-utils";
import { calendarDateKey, calendarDaysForMonth, calendarItemDate, groupQueueItemsByDate, normalizeQueueStatus, queueContentType, queueStatuses } from "@/lib/queue-calendar";
import { cn } from "@/lib/utils";
import type { StorageMode } from "@/lib/supabase/persistence";
import type { Campaign, LibrarySource, MediaAsset, Opportunity, Platform, PostQueueItem, Profile, QueueStatus, ReviewLink, ReviewLinkScopeType, ReviewPermissionLevel } from "@/lib/types";

type CalendarScreenTarget = "New Campaign" | "Ready to Post" | "Review Drafts" | "Content Library";

function isTodayDate(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isThisWeekDate(value?: string) {
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

function calendarReadinessScore(item: PostQueueItem, campaign?: Campaign) {
  if (queueContentType(item) === "Reply") return undefined;
  const post = campaign?.posts.find((candidate) => candidate.id === item.generatedPostId);
  return post?.score;
}

function CalendarReviewLinkSharePanel({
  label,
  candidateItems,
  reviewLinks,
  defaultScopeType,
  createReviewLink,
  disableReviewLink,
  storageMode
}: {
  label: string;
  candidateItems: PostQueueItem[];
  reviewLinks: ReviewLink[];
  defaultScopeType: ReviewLinkScopeType;
  createReviewLink: (input: { scopeType: ReviewLinkScopeType; scope: ReviewLink["scope"]; permissionLevel: ReviewPermissionLevel; expiresAt?: string }) => ReviewLink;
  disableReviewLink: (id: string) => void;
  storageMode: StorageMode;
}) {
  const [permissionLevel, setPermissionLevel] = useState<ReviewPermissionLevel>("Can approve/request changes");
  const [expirationDays, setExpirationDays] = useState("14");
  const [copyState, setCopyState] = useState("");
  const activeLinks = reviewLinks.filter((link) => !link.disabledAt);

  function linkUrl(token: string) {
    if (typeof window === "undefined") return "/manager-review/" + token;
    return window.location.origin + "/manager-review/" + token;
  }

  async function copyLink(token: string) {
    const url = linkUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("Copied link");
    } catch {
      setCopyState(url);
    }
    window.setTimeout(() => setCopyState(""), 2500);
  }

  function createLink() {
    const ids = candidateItems.map((item) => item.id);
    const expiresAt = expirationDays === "never" ? undefined : new Date(Date.now() + Number(expirationDays) * 24 * 60 * 60 * 1000).toISOString();
    const link = createReviewLink({
      scopeType: defaultScopeType,
      scope: { itemIds: ids },
      permissionLevel,
      expiresAt
    });
    void copyLink(link.token);
  }

  return (
    <details className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
      <summary className="cursor-pointer text-sm font-extrabold text-slate-900">Share review link</summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{label}</p>
      {candidateItems.length === 0 && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          No visible posts or replies are available for this link right now. Adjust filters or schedule/approve items before sharing.
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold text-slate-600">
          Permission
          <select value={permissionLevel} onChange={(event) => setPermissionLevel(event.target.value as ReviewPermissionLevel)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm">
            <option value="View only">View only</option>
            <option value="Comment only">Comment only</option>
            <option value="Can suggest edits">Can suggest edits</option>
            <option value="Can approve/request changes">Can approve/request changes</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-600">
          Expiration
          <select value={expirationDays} onChange={(event) => setExpirationDays(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="never">Never</option>
          </select>
        </label>
        <Button className="mt-6" onClick={createLink} disabled={candidateItems.length === 0 || storageMode === "local"}>Create share link</Button>
      </div>
      {copyState && <p className="mt-3 text-sm font-semibold text-primary">{copyState}</p>}
      {activeLinks.length > 0 && (
        <div className="mt-4 grid gap-2">
          {activeLinks.slice(0, 4).map((link) => (
            <div key={link.id} className="flex flex-col justify-between gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="font-bold">{link.scopeType} · {link.permissionLevel}</p>
                <p className="break-all text-xs text-muted-foreground">{linkUrl(link.token)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => copyLink(link.token)}>Copy</Button>
                <Button size="sm" variant="secondary" onClick={() => disableReviewLink(link.id)}>Disable</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
export function ContentCalendar({
  queue,
  campaigns,
  profiles,
  opportunities,
  librarySources,
  mediaAssets,
  updateQueueItem,
  setScreen,
  mediaPreviewUrl,
  reviewLinks,
  createReviewLink,
  disableReviewLink,
  storageMode
}: {
  queue: PostQueueItem[];
  campaigns: Campaign[];
  profiles: Profile[];
  opportunities: Opportunity[];
  librarySources: LibrarySource[];
  mediaAssets: MediaAsset[];
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  setScreen: (screen: CalendarScreenTarget) => void;
  mediaPreviewUrl: string;
  reviewLinks: ReviewLink[];
  createReviewLink: (input: {
    scopeType: ReviewLinkScopeType;
    scope: ReviewLink["scope"];
    permissionLevel: ReviewPermissionLevel;
    expiresAt?: string;
  }) => ReviewLink;
  disableReviewLink: (id: string) => void;
  storageMode: StorageMode;
}) {
  const [viewMode, setViewMode] = useState<"Calendar" | "List" | "Suggested plan">("Calendar");
  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "All">("All");
  const [contentTypeFilter, setContentTypeFilter] = useState<"All" | "Post" | "Reply">("All");
  const [sandboxFilter, setSandboxFilter] = useState<"All" | "Sandbox/test" | "Real posts">("All");
  const [mediaFilter, setMediaFilter] = useState<"All" | "Media used" | "No media">("All");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [dismissedSuggestedSlotIds, setDismissedSuggestedSlotIds] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [previewItem, setPreviewItem] = useState<PostQueueItem | null>(null);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesPlatform = platformFilter === "All" || item.platform === platformFilter;
      const matchesProfile = profileFilter === "All" || item.profileId === profileFilter;
      const matchesStatus = statusFilter === "All" || normalizeQueueStatus(item.status) === statusFilter;
      const matchesContentType = contentTypeFilter === "All" || queueContentType(item) === contentTypeFilter;
      const matchesSandbox =
        sandboxFilter === "All" ||
        (sandboxFilter === "Sandbox/test" ? Boolean(item.isSandbox) : !item.isSandbox);
      const matchesMedia =
        mediaFilter === "All" ||
        (mediaFilter === "Media used" ? item.mediaUsed : !item.mediaUsed);
      return matchesPlatform && matchesProfile && matchesStatus && matchesContentType && matchesSandbox && matchesMedia;
    });
  }, [contentTypeFilter, mediaFilter, platformFilter, profileFilter, queue, sandboxFilter, statusFilter]);

  const datedItems = filteredQueue.filter((item) => Boolean(calendarItemDate(item)));
  const unscheduledItems = filteredQueue.filter((item) => {
    const status = normalizeQueueStatus(item.status);
    return !calendarItemDate(item) && status === "Ready";
  });
  const monthDays = calendarDaysForMonth(calendarMonth);
  const realCalendarItems = datedItems.filter((item) => {
    const status = normalizeQueueStatus(item.status);
    return status === "Scheduled" || status === "Posted" || status === "Replied";
  });
  const monthItems = realCalendarItems.filter((item) => {
    const date = new Date(calendarItemDate(item)!);
    return date.getFullYear() === calendarMonth.getFullYear() && date.getMonth() === calendarMonth.getMonth();
  });
  const itemsByDay = new Map<string, PostQueueItem[]>();
  monthItems.forEach((item) => {
    const key = calendarDateKey(calendarItemDate(item)!);
    itemsByDay.set(key, [...(itemsByDay.get(key) ?? []), item]);
  });

  const scheduledItems = filteredQueue
    .filter((item) => normalizeQueueStatus(item.status) === "Scheduled")
    .sort((a, b) => new Date(calendarItemDate(a) || a.plannedAt || "").getTime() - new Date(calendarItemDate(b) || b.plannedAt || "").getTime());
  const todayItems = datedItems
    .filter((item) => {
      const status = normalizeQueueStatus(item.status);
      return status !== "Archived" && isTodayDate(calendarItemDate(item));
    })
    .sort((a, b) => new Date(calendarItemDate(a)!).getTime() - new Date(calendarItemDate(b)!).getTime());
  const upcomingItems = scheduledItems
    .filter((item) => !isTodayDate(calendarItemDate(item)) && new Date(calendarItemDate(item)!).getTime() >= Date.now() - 86_400_000)
    .sort((a, b) => new Date(calendarItemDate(a)!).getTime() - new Date(calendarItemDate(b)!).getTime());
  const completedItems = datedItems
    .filter((item) => {
      const status = normalizeQueueStatus(item.status);
      return status === "Posted" || status === "Replied";
    })
    .sort((a, b) => new Date(calendarItemDate(b)!).getTime() - new Date(calendarItemDate(a)!).getTime());
  const archivedItems = filteredQueue
    .filter((item) => normalizeQueueStatus(item.status) === "Archived")
    .sort((a, b) => new Date(calendarItemDate(b) || b.createdAt).getTime() - new Date(calendarItemDate(a) || a.createdAt).getTime());
  const groupedUpcoming = groupQueueItemsByDate(upcomingItems);
  const groupedCompleted = groupQueueItemsByDate(completedItems);
  const hasAnyItems = filteredQueue.length > 0;
  const calendarSuggestedSlots = buildWeeklyContentPlan({
    queue,
    campaigns,
    opportunities,
    librarySources,
    mediaAssets,
    version: 0
  }).filter((slot) => (slot.status === "Suggested" || slot.status === "Draft needed") && !dismissedSuggestedSlotIds.includes(slot.id)).slice(0, 7);
  const suggestedSlotsByDay = new Map<string, WeeklyPlanSlot[]>();
  calendarSuggestedSlots.forEach((slot) => {
    const key = calendarDateKey(slot.isoDate);
    suggestedSlotsByDay.set(key, [...(suggestedSlotsByDay.get(key) ?? []), slot]);
  });
  const scheduledThisWeek = queue.filter((item) => normalizeQueueStatus(item.status) === "Scheduled" && isThisWeekDate(calendarItemDate(item))).length;
  const readyButUnscheduled = queue.filter((item) => normalizeQueueStatus(item.status) === "Ready" && !calendarItemDate(item)).length;
  const completedThisWeek = queue.filter((item) => {
    const status = normalizeQueueStatus(item.status);
    return (status === "Posted" || status === "Replied") && isThisWeekDate(calendarItemDate(item));
  }).length;
  const suggestedSlotCount = calendarSuggestedSlots.length;
  const gapsToFill = Math.max(0, 5 - scheduledThisWeek - suggestedSlotCount);

  function shiftMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function resetFilters() {
    setPlatformFilter("All");
    setProfileFilter("All");
    setStatusFilter("All");
    setContentTypeFilter("All");
    setSandboxFilter("All");
    setMediaFilter("All");
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Content Calendar</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Content Calendar is the planning view for scheduled, ready, posted, and archived content by date, platform, and posting account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={viewMode === "Calendar" ? "primary" : "secondary"} onClick={() => setViewMode("Calendar")}>
              Calendar view
            </Button>
            <Button variant={viewMode === "List" ? "primary" : "secondary"} onClick={() => setViewMode("List")}>
              List view
            </Button>
            <Button variant={viewMode === "Suggested plan" ? "primary" : "secondary"} onClick={() => setViewMode("Suggested plan")}>
              Suggested plan
            </Button>
          </div>
        </div>
        <div className="mt-5">
          <CalendarReviewLinkSharePanel
            label="Share the planned calendar or upcoming queue with a manager for limited review."
            candidateItems={filteredQueue}
            reviewLinks={reviewLinks}
            defaultScopeType="This week"
            createReviewLink={createReviewLink}
            disableReviewLink={disableReviewLink}
            storageMode={storageMode}
          />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <InsightStat label="Scheduled this week" value={String(scheduledThisWeek)} />
          <InsightStat label="Ready, unscheduled" value={String(readyButUnscheduled)} />
          <InsightStat label="Posted/replied this week" value={String(completedThisWeek)} />
          <InsightStat label="Suggested slots" value={String(suggestedSlotCount)} />
          <InsightStat label="Gaps to fill" value={String(gapsToFill)} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <QueueFilter label="Platform">
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as Platform | "All")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All platforms</option>
              {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
          </QueueFilter>
          <QueueFilter label="Status">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as QueueStatus | "All")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All statuses</option>
              {queueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </QueueFilter>
          <QueueFilter label="Content type">
            <select value={contentTypeFilter} onChange={(event) => setContentTypeFilter(event.target.value as "All" | "Post" | "Reply")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">Posts and replies</option>
              <option value="Post">Posts only</option>
              <option value="Reply">Replies only</option>
            </select>
          </QueueFilter>
        </div>
        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3" open={showMoreFilters} onToggle={(event) => setShowMoreFilters(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-bold text-slate-700">More filters</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <QueueFilter label="Posting account">
              <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="All">All accounts</option>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </QueueFilter>
          <QueueFilter label="Sandbox">
            <select value={sandboxFilter} onChange={(event) => setSandboxFilter(event.target.value as "All" | "Sandbox/test" | "Real posts")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">Sandbox and real</option>
              <option value="Sandbox/test">Sandbox/test</option>
              <option value="Real posts">Real posts only</option>
            </select>
          </QueueFilter>
          <QueueFilter label="Media">
            <select value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value as "All" | "Media used" | "No media")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All posts</option>
              <option value="Media used">Media used</option>
              <option value="No media">No media</option>
            </select>
          </QueueFilter>
          </div>
        </details>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Pill>{filteredQueue.length} visible</Pill>
            <Pill>{datedItems.length} dated</Pill>
            <Pill>{unscheduledItems.length} unscheduled</Pill>
          </div>
          <Button size="sm" variant="secondary" onClick={resetFilters}>Reset filters</Button>
        </div>
      </Card>

      {(viewMode === "Suggested plan" || viewMode === "Calendar" || viewMode === "List") && (
      <Card className={cn("p-5", viewMode !== "Suggested plan" && "border-dashed bg-slate-50/70")}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Suggested plan</p>
            <h3 className="mt-1 text-lg font-bold">Suggested weekly slots</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Suggestions are planning ideas only. They do not become scheduled content until you create, choose, or schedule a real item.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setScreen("New Campaign")}>
            Create post
          </Button>
        </div>
        {calendarSuggestedSlots.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
            Add Ready to Post items, opportunities, media, or metrics to improve the weekly plan.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {calendarSuggestedSlots.map((slot) => (
              <div key={`calendar-${slot.id}`} className="rounded-lg border border-dashed border-teal-200 bg-teal-50/40 p-4">
                <div className="flex flex-wrap gap-2">
                  <Pill>{slot.dayLabel}, {slot.dateLabel}</Pill>
                  <Pill>{slot.platform}</Pill>
                  <Pill>{slot.status}</Pill>
                </div>
                <p className="mt-3 text-sm font-bold">{slot.sourceLabel}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{slot.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setScreen(slot.sourceType === "Ready to Post item" ? "Ready to Post" : "New Campaign")}>
                    {slot.sourceType === "Ready to Post item" ? "Use ready post" : slot.sourceType === "Repurpose candidate" ? "Repurpose" : "Create post"}
                  </Button>
                  {slot.sourceType === "Ready to Post item" && (
                    <Button size="sm" variant="ghost" onClick={() => setScreen("Ready to Post")}>
                      Schedule ready item
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDismissedSuggestedSlotIds((current) => [...current, slot.id])}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}

      {!hasAnyItems ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">Approve a draft or schedule a Ready to Post item and it will appear here.</p>
          <p className="mt-2 text-sm text-muted-foreground">Suggested slots can help plan the week, but real calendar items come from approved posts and replies.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => setScreen("Review Drafts")}>Review drafts</Button>
            <Button variant="secondary" onClick={() => setScreen("Ready to Post")}>Ready to Post</Button>
          </div>
        </Card>
      ) : viewMode === "Calendar" ? (
        <Card className="p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold">{calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}</h3>
              <p className="text-sm text-muted-foreground">Month view grouped by platform.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => shiftMonth(-1)}>Previous</Button>
              <Button size="sm" variant="secondary" onClick={() => setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</Button>
              <Button size="sm" variant="secondary" onClick={() => shiftMonth(1)}>Next</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-7">
            {monthDays.map((day, index) => {
              const key = day ? calendarDateKey(day.toISOString()) : `blank-${index}`;
              const dayKey = day ? calendarDateKey(day.toISOString()) : "";
              const dayItems = day ? itemsByDay.get(dayKey) ?? [] : [];
              const daySuggestedSlots = day ? suggestedSlotsByDay.get(dayKey) ?? [] : [];
              const byPlatform = platforms
                .map((platform) => ({ platform, items: dayItems.filter((item) => item.platform === platform) }))
                .filter((group) => group.items.length > 0);
              return (
                <div key={key} className={cn("min-h-36 rounded-lg border border-slate-200 bg-white p-2", !day && "hidden md:block bg-transparent")}>
                  {day && (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                          calendarDateKey(day.toISOString()) === calendarDateKey(new Date().toISOString())
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-100 text-slate-700"
                        )}>
                          {day.getDate()}
                        </span>
                        {dayItems.length > 0 && <Pill>{dayItems.length}</Pill>}
                      </div>
                      <div className="mt-2 grid gap-2">
                        {byPlatform.map((group) => (
                          <div key={group.platform} className="space-y-1">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{group.platform}</p>
                            {group.items.map((item) => (
                              <CalendarMiniCard
                                key={item.id}
                                item={item}
                                onPreview={setPreviewItem}
                                setScreen={setScreen}
                              />
                            ))}
                          </div>
                        ))}
                        {daySuggestedSlots.length > 0 && (
                          <div className="space-y-1 border-t border-dashed border-slate-200 pt-2">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Suggested</p>
                            {daySuggestedSlots.map((slot) => (
                              <div key={slot.id} className="rounded-md border border-dashed border-teal-200 bg-teal-50 px-2 py-1 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-bold">{slot.platform}</span>
                                  <span className="rounded bg-white px-1.5 py-0.5 font-bold text-primary">Suggested</span>
                                </div>
                                <p className="mt-1 truncate text-slate-500">{slot.sourceLabel}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {dayItems.length === 0 && daySuggestedSlots.length === 0 && (
                          <p className="mt-3 text-xs text-slate-400">No scheduled content.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {realCalendarItems.length === 0 && (
            <p className="mt-4 rounded-md border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              No scheduled, posted, or replied items match these filters. Suggested slots are placeholders until you schedule a real post or reply.
            </p>
          )}
        </Card>
      ) : viewMode === "List" ? (
        <div className="grid gap-5">
          <CalendarListSection
            title="Unscheduled"
            description="Ready items without a planned publish date."
            emptyMessage="No ready unscheduled posts or replies match these filters."
            items={unscheduledItems}
            campaigns={campaigns}
            updateQueueItem={updateQueueItem}
            setScreen={setScreen}
            setPreviewItem={setPreviewItem}
          />
          <CalendarListSection
            title="Today"
            description="Scheduled, posted, or replied items dated today."
            emptyMessage="Nothing is planned or completed today under these filters."
            items={todayItems}
            campaigns={campaigns}
            updateQueueItem={updateQueueItem}
            setScreen={setScreen}
            setPreviewItem={setPreviewItem}
          />
          <CalendarGroupedSections
            groups={groupedUpcoming}
            titlePrefix="Upcoming"
            emptyMessage="No upcoming scheduled posts or replies match these filters."
            campaigns={campaigns}
            updateQueueItem={updateQueueItem}
            setScreen={setScreen}
            setPreviewItem={setPreviewItem}
          />
          <CalendarGroupedSections
            groups={groupedCompleted}
            titlePrefix="Completed"
            emptyMessage="No posted or replied items match these filters."
            campaigns={campaigns}
            updateQueueItem={updateQueueItem}
            setScreen={setScreen}
            setPreviewItem={setPreviewItem}
          />
          {statusFilter === "Archived" && (
            <CalendarListSection
              title="Archived"
              description="Items removed from the planning workflow."
              emptyMessage="No archived items match these filters."
              items={archivedItems}
              campaigns={campaigns}
              updateQueueItem={updateQueueItem}
              setScreen={setScreen}
              setPreviewItem={setPreviewItem}
            />
          )}
        </div>
      ) : null}

      {previewItem && (
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Post preview</h3>
              <p className="text-sm text-muted-foreground">{previewItem.campaignName}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setPreviewItem(null)}>Close preview</Button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <Pill>{previewItem.platform}</Pill>
              <Pill>{queueContentType(previewItem)}</Pill>
              <Pill>{normalizeQueueStatus(previewItem.status)}</Pill>
              {previewItem.mediaUsed && <Pill>Media used</Pill>}
            </div>
            <h4 className="mt-3 text-lg font-extrabold text-slate-950">{previewItem.campaignName}</h4>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{previewItem.profileName || "No posting account"}</p>
            <p className="mt-4 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6">
              {previewItem.postCopy || previewItem.content}
            </p>
            {previewItem.mediaUsed && (
              <p className="mt-3 text-sm font-semibold text-muted-foreground">Media: {previewItem.mediaAssetName || "attached"}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function CalendarGroupedSections({
  groups,
  titlePrefix,
  emptyMessage,
  campaigns,
  updateQueueItem,
  setScreen,
  setPreviewItem
}: {
  groups: Array<{ date: string; items: PostQueueItem[] }>;
  titlePrefix: string;
  emptyMessage?: string;
  campaigns: Campaign[];
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  setScreen: (screen: CalendarScreenTarget) => void;
  setPreviewItem: (item: PostQueueItem) => void;
}) {
  if (groups.length === 0) {
    if (!emptyMessage) return null;
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{titlePrefix}</h3>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
          <Pill>0</Pill>
        </div>
      </Card>
    );
  }
  return (
    <>
      {groups.map((group) => (
        <CalendarListSection
          key={`${titlePrefix}-${group.date}`}
          title={`${titlePrefix} · ${formatShortDate(group.date)}`}
          description={`${group.items.length} post${group.items.length === 1 ? "" : "s"}`}
          items={group.items}
          campaigns={campaigns}
          updateQueueItem={updateQueueItem}
          setScreen={setScreen}
          setPreviewItem={setPreviewItem}
        />
      ))}
    </>
  );
}

function CalendarListSection({
  title,
  description,
  emptyMessage,
  items,
  campaigns,
  updateQueueItem,
  setScreen,
  setPreviewItem
}: {
  title: string;
  description: string;
  emptyMessage?: string;
  items: PostQueueItem[];
  campaigns: Campaign[];
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  setScreen: (screen: CalendarScreenTarget) => void;
  setPreviewItem: (item: PostQueueItem) => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Pill>{items.length}</Pill>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
          {emptyMessage ?? "No items match this view."}
        </p>
      ) : (
      <div className="grid gap-3">
        {items.map((item) => (
          <CalendarPostCard
            key={item.id}
            item={item}
            campaign={campaigns.find((campaign) => campaign.id === item.campaignId)}
            updateQueueItem={updateQueueItem}
            setScreen={setScreen}
            onPreview={setPreviewItem}
          />
        ))}
      </div>
      )}
    </Card>
  );
}

function CalendarMiniCard({
  item,
  onPreview,
  setScreen
}: {
  item: PostQueueItem;
  onPreview: (item: PostQueueItem) => void;
  setScreen: (screen: CalendarScreenTarget) => void;
}) {
  const status = normalizeQueueStatus(item.status);
  return (
    <button
      type="button"
      onClick={() => onPreview(item)}
      className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-left text-xs transition hover:border-primary hover:bg-teal-50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-bold">{item.campaignName}</span>
        <span className={cn(
          "rounded px-1.5 py-0.5 font-bold",
          status === "Scheduled" ? "bg-blue-100 text-blue-800" :
          status === "Posted" || status === "Replied" ? "bg-emerald-100 text-emerald-800" :
          "bg-white text-slate-500"
        )}>
          {status}
        </span>
      </div>
      <p className="mt-1 truncate text-slate-500">{item.profileName || "No profile"}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded bg-white px-1.5 py-0.5 font-bold text-slate-500">{queueContentType(item)}</span>
        {item.isSandbox && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">Sandbox</span>}
        {item.mediaUsed && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-800">Media</span>}
      </div>
      <button type="button" className="mt-2 text-primary underline" onClick={(event) => { event.stopPropagation(); setScreen("Content Library"); }}>Open in library</button>
    </button>
  );
}

function CalendarPostCard({
  item,
  campaign,
  updateQueueItem,
  setScreen,
  onPreview
}: {
  item: PostQueueItem;
  campaign?: Campaign;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  setScreen: (screen: CalendarScreenTarget) => void;
  onPreview: (item: PostQueueItem) => void;
}) {
  const [plannedValue, setPlannedValue] = useState(toDateTimeLocalValue(item.plannedAt));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [showScheduleEditor, setShowScheduleEditor] = useState(!item.plannedAt && normalizeQueueStatus(item.status) === "Ready");

  useEffect(() => {
    setPlannedValue(toDateTimeLocalValue(item.plannedAt));
  }, [item.id, item.plannedAt]);

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(item.postCopy || item.content);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  function saveSchedule() {
    if (!plannedValue) return;
    updateQueueItem(item.id, {
      plannedAt: new Date(plannedValue).toISOString(),
      status: normalizeQueueStatus(item.status) === "Ready" ? "Scheduled" : normalizeQueueStatus(item.status)
    });
  }

  function markPosted() {
    const isReply = queueContentType(item) === "Reply";
    updateQueueItem(item.id, {
      status: isReply ? "Replied" : "Posted",
      postedAt: new Date().toISOString()
    });
  }

  const isReply = queueContentType(item) === "Reply";
  const completedStatus = isReply ? "Replied" : "Posted";
  const dateLabel = calendarItemDate(item) ? formatShortDateTime(calendarItemDate(item)) : "Unscheduled";
  const status = normalizeQueueStatus(item.status);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Pill>{item.platform}</Pill>
            <Pill>{isReply ? "Reply" : "Post"}</Pill>
            <Pill>{status}</Pill>
            {item.mediaUsed && <Pill>Media used</Pill>}
            {item.isSandbox && <Pill>Sandbox/test</Pill>}
            {typeof calendarReadinessScore(item, campaign) === "number" && <Pill>{calendarReadinessScore(item, campaign)}/100</Pill>}
          </div>
          <h4 className="mt-3 font-extrabold">{item.campaignName}</h4>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{dateLabel} · {item.profileName || "No posting account"}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.postCopy || item.content}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onPreview(item)}>Preview</Button>
          <Button size="sm" variant="secondary" onClick={copyPost}>
            <Clipboard size={14} /> {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
          </Button>
          {status !== completedStatus && status !== "Archived" && (
            <Button size="sm" variant="secondary" onClick={markPosted}>{isReply ? "Mark replied" : "Mark as posted"}</Button>
          )}
          {status !== "Archived" && (
            <Button size="sm" variant="secondary" onClick={() => setShowScheduleEditor((current) => !current)}>
              Schedule
            </Button>
          )}
          {status !== "Archived" && (
            <Button size="sm" variant="secondary" onClick={() => updateQueueItem(item.id, { status: "Archived" })}>Archive</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setScreen("Content Library")}>Open in Content Library</Button>
        </div>
      </div>
      {showScheduleEditor && (
      <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 md:items-end">
        <label className="text-sm font-semibold">
          Planned publish date/time
          <input
            type="datetime-local"
            value={plannedValue}
            onChange={(event) => setPlannedValue(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <Button size="sm" onClick={saveSchedule} disabled={!plannedValue}>
          Schedule
        </Button>
      </div>
      )}
    </div>
  );
}
