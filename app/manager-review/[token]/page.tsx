"use client";

import { useEffect, useMemo, useState } from "react";

type ManagerReviewItem = {
  id: string;
  contentType: "Post" | "Reply";
  platform: string;
  postingAccount: string;
  sourceTitle: string;
  content: string;
  contentOrigin?: string;
  mediaUsed: boolean;
  mediaPreviewUrl?: string;
  mediaAssetName?: string;
  overlayText?: string;
  altText?: string;
  cta?: string;
  hashtags?: string[];
  firstComment?: string;
  opportunityTitle?: string;
  plannedAt?: string;
  status: string;
  reviewBucket: "active" | "completed" | "archived";
  readiness: string;
  safetyStatus: string;
  reviewerNotes?: string;
  approvalStatus: string;
  feedback: Array<{
    id: string;
    reviewerName: string;
    comment: string;
    suggestedEdit?: string;
    status: string;
    createdAt: string;
  }>;
};

type ManagerReviewPayload = {
  link: {
    scopeType: string;
    permissionLevel: string;
    expiresAt?: string;
  };
  items: ManagerReviewItem[];
};

const managerReviewFetchTimeoutMs = 15000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), managerReviewFetchTimeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function managerReviewFetchError(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The review link took too long to load. Refresh the page or ask the Conduit team to recreate the link.";
  }
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function canComment(permission?: string) {
  return permission !== "View only";
}

function canSuggest(permission?: string) {
  return permission === "Can suggest edits" || permission === "Can approve/request changes";
}

function canApprove(permission?: string) {
  return permission === "Can approve/request changes";
}

function feedbackLabel(status: string) {
  if (status === "changes_requested") return "Changes requested";
  if (status === "approved") return "Approved by manager";
  if (status === "ready_to_post") return "Manager marked ready to post";
  if (status === "reviewed") return "Reviewed";
  return "Comment";
}

function PlatformPreview({ item }: { item: ManagerReviewItem }) {
  const platform = item.platform.toLowerCase();
  if (item.contentType === "Reply") {
    return (
      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reply preview</p>
        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold">{item.postingAccount}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">Source: {item.opportunityTitle || item.sourceTitle}</p>
      </div>
    );
  }

  if (platform.includes("instagram") || platform.includes("tiktok")) {
    return (
      <div className="grid gap-4 rounded-xl border bg-slate-950 p-4 text-white md:grid-cols-2">
        <div className="flex aspect-portrait items-center justify-center overflow-hidden rounded-lg bg-slate-800">
          {item.mediaPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.mediaPreviewUrl} alt={item.altText || item.mediaAssetName || "Media preview"} className="h-full w-full object-cover" />
          ) : (
            <span className="px-4 text-center text-sm text-slate-300">{item.mediaAssetName || "Media preview"}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold">{item.postingAccount} · {item.platform}</p>
          {item.overlayText && <p className="mt-3 rounded bg-white/10 p-2 text-sm font-bold">Overlay: {item.overlayText}</p>}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">{item.content}</p>
          {item.cta && <p className="mt-3 text-sm font-bold text-teal-200">CTA: {item.cta}</p>}
        </div>
      </div>
    );
  }

  if (platform === "x") {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">C</div>
          <div>
            <p className="font-bold">{item.postingAccount}</p>
            <p className="text-sm text-slate-500">@conduit · {item.platform}</p>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
        {item.mediaUsed && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">Media: {item.mediaAssetName || "attached"}</p>}
        <p className="mt-3 text-xs text-slate-500">{item.content.length} characters</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 border-b pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-950 text-sm font-bold text-white">C</div>
        <div>
          <p className="font-bold">{item.postingAccount}</p>
          <p className="text-sm text-slate-500">{item.platform} preview</p>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
      {item.mediaUsed && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">Media: {item.mediaAssetName || "attached"}</p>}
      {item.firstComment && <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">First comment: {item.firstComment}</p>}
    </div>
  );
}

export default function ManagerReviewPage({ params }: { params: { token: string } }) {
  const [payload, setPayload] = useState<ManagerReviewPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewerName, setReviewerName] = useState("");
  const [activeItemId, setActiveItemId] = useState("");
  const [comment, setComment] = useState("");
  const [suggestedEdit, setSuggestedEdit] = useState("");
  const [saving, setSaving] = useState("");
  const [viewMode, setViewMode] = useState<"copy" | "preview">("preview");
  const [reviewTab, setReviewTab] = useState<"active" | "completed" | "archived">("active");
  const tabCounts = useMemo(() => {
    const items = payload?.items ?? [];
    return {
      active: items.filter((item) => item.reviewBucket === "active").length,
      completed: items.filter((item) => item.reviewBucket === "completed").length,
      archived: items.filter((item) => item.reviewBucket === "archived").length
    };
  }, [payload]);
  const visibleItems = useMemo(
    () => (payload?.items ?? []).filter((item) => item.reviewBucket === reviewTab),
    [payload, reviewTab]
  );
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ManagerReviewItem[]>();
    visibleItems.forEach((item) => {
      const key = item.plannedAt ? new Date(item.plannedAt).toDateString() : "Unscheduled";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries());
  }, [visibleItems]);

  async function loadReview() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithTimeout(`/api/manager-review/${params.token}`);
      const nextPayload = await response.json();
      if (!response.ok) throw new Error(nextPayload.error ?? "Could not load review link.");
      setPayload(nextPayload);
    } catch (loadError) {
      setError(managerReviewFetchError(loadError, "Could not load review link."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  async function submitFeedback(item: ManagerReviewItem, status: "comment" | "approved" | "changes_requested" | "reviewed" | "ready_to_post") {
    setSaving(`${item.id}-${status}`);
    try {
      const response = await fetchWithTimeout(`/api/manager-review/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: item.id,
          contentType: item.contentType,
          reviewerName,
          comment,
          suggestedEdit,
          status
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save feedback.");
      setComment("");
      setSuggestedEdit("");
      setActiveItemId("");
      await loadReview();
    } catch (saveError) {
      setError(managerReviewFetchError(saveError, "Could not save feedback."));
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Conduit content review</h1>
          <p className="mt-2 text-slate-600">Loading scoped schedule...</p>
        </div>
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Review link unavailable</h1>
          <p className="mt-2 text-slate-600">{error || "This review link could not be loaded."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-teal-700">Manager Review</p>
              <h1 className="mt-1 text-2xl font-extrabold">Conduit content schedule</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This limited portal shows only the scoped posts and replies for review. It does not allow publishing or access to internal app settings.
              </p>
              <div className="mt-4 inline-flex rounded-lg border bg-slate-50 p-1">
                {(["preview", "copy"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-md px-3 py-2 text-sm font-bold ${viewMode === mode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  >
                    {mode === "copy" ? "Copy view" : "Platform preview"}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["active", "Active review items", tabCounts.active],
                  ["completed", "Completed", tabCounts.completed],
                  ["archived", "Archived", tabCounts.archived]
                ] as const).map(([tab, label, count]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setReviewTab(tab)}
                    className={`rounded-md border px-3 py-2 text-sm font-bold ${reviewTab === tab ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Active hides posted, replied, archived, and hidden items so managers only review work that still needs a decision.
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p><strong>Scope:</strong> {payload.link.scopeType}</p>
              <p><strong>Permission:</strong> {payload.link.permissionLevel}</p>
              <p><strong>Expires:</strong> {payload.link.expiresAt ? formatDate(payload.link.expiresAt) : "Never"}</p>
            </div>
          </div>
          {canComment(payload.link.permissionLevel) && (
            <label className="mt-4 block text-sm font-semibold">
              Your name
              <input
                value={reviewerName}
                onChange={(event) => setReviewerName(event.target.value)}
                className="mt-2 h-10 w-full max-w-sm rounded-md border px-3 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Manager name"
              />
            </label>
          )}
        </section>

        {payload.items.length === 0 ? (
          <section className="rounded-xl border border-dashed bg-white p-8 text-center shadow-sm">
            <p className="font-bold">No content is included in this review scope.</p>
            <p className="mt-2 text-sm text-slate-600">Ask the Conduit team to update the review link scope or schedule content first.</p>
          </section>
        ) : visibleItems.length === 0 ? (
          <section className="rounded-xl border border-dashed bg-white p-8 text-center shadow-sm">
            <p className="font-bold">No {reviewTab === "active" ? "active review" : reviewTab} items in this link.</p>
            <p className="mt-2 text-sm text-slate-600">
              {reviewTab === "active"
                ? "Completed and archived work is tucked into the other tabs."
                : "Switch tabs to review the current scoped schedule."}
            </p>
          </section>
        ) : (
          groupedItems.map(([dateLabel, items]) => (
            <section key={dateLabel} className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-extrabold">{dateLabel}</h2>
              <div className="mt-4 grid gap-4">
                {items.map((item) => {
                  const active = activeItemId === item.id;
                  return (
                    <article key={item.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded bg-slate-100 px-2 py-1">{item.contentType}</span>
                            <span className="rounded bg-slate-100 px-2 py-1">{item.platform}</span>
                            <span className="rounded bg-slate-100 px-2 py-1">{item.postingAccount}</span>
                            <span className="rounded bg-slate-100 px-2 py-1">{item.status}</span>
                            <span className="rounded bg-purple-50 px-2 py-1 text-purple-800">Review: {item.approvalStatus}</span>
                            {item.contentOrigin && <span className="rounded bg-slate-100 px-2 py-1">{item.contentOrigin}</span>}
                            <span className="rounded bg-teal-50 px-2 py-1 text-teal-800">Safety: {item.safetyStatus}</span>
                            <span className="rounded bg-blue-50 px-2 py-1 text-blue-800">Readiness: {item.readiness}</span>
                          </div>
                          <h3 className="mt-3 font-extrabold">{item.sourceTitle}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">Planned: {formatDate(item.plannedAt)}</p>
                          {viewMode === "copy" ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
                          ) : (
                            <div className="mt-3">
                              <PlatformPreview item={item} />
                            </div>
                          )}
                          {item.mediaUsed && (
                            <p className="mt-3 rounded-md bg-slate-50 p-2 text-sm font-semibold text-slate-600">
                              Media used: {item.mediaAssetName || "media attached"}
                            </p>
                          )}
                          {item.reviewerNotes && (
                            <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900">Reviewer note: {item.reviewerNotes}</p>
                          )}
                          {item.approvalStatus === "Revised" && (
                            <p className="mt-3 rounded-md bg-blue-50 p-2 text-sm font-semibold text-blue-900">Updated draft available for another review pass.</p>
                          )}
                        </div>
                        {canComment(payload.link.permissionLevel) && (
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <button className="rounded-md border px-3 py-2 text-sm font-bold" onClick={() => setActiveItemId(active ? "" : item.id)}>
                              {active ? "Close feedback" : "Leave feedback"}
                            </button>
                            {canApprove(payload.link.permissionLevel) && (
                              <>
                                <button className="rounded-md bg-teal-700 px-3 py-2 text-sm font-bold text-white" onClick={() => submitFeedback(item, "approved")} disabled={Boolean(saving)}>
                                  Approve
                                </button>
                                <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-white" onClick={() => submitFeedback(item, "ready_to_post")} disabled={Boolean(saving)}>
                                  Mark ready to post
                                </button>
                                <button className="rounded-md border px-3 py-2 text-sm font-bold" onClick={() => submitFeedback(item, "changes_requested")} disabled={Boolean(saving)}>
                                  Request changes
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {item.feedback.length > 0 && (
                        <div className="mt-4 rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Review feedback</p>
                          <div className="mt-2 space-y-2">
                            {item.feedback.map((feedback) => (
                              <div key={feedback.id} className="rounded border bg-white p-2 text-sm">
                                <p className="font-bold">{feedback.reviewerName} · {feedbackLabel(feedback.status)}</p>
                                {feedback.comment && <p className="mt-1">{feedback.comment}</p>}
                                {feedback.suggestedEdit && <p className="mt-1 text-slate-600">Suggested edit: {feedback.suggestedEdit}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {active && (
                        <div className="mt-4 rounded-lg border bg-slate-50 p-4">
                          <label className="block text-sm font-semibold">
                            Comment
                            <textarea
                              value={comment}
                              onChange={(event) => setComment(event.target.value)}
                              className="mt-2 min-h-24 w-full rounded-md border bg-white p-3 outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Leave approval notes, comments, or requested changes."
                            />
                          </label>
                          {canSuggest(payload.link.permissionLevel) && (
                            <label className="mt-3 block text-sm font-semibold">
                              Suggested edit
                              <textarea
                                value={suggestedEdit}
                                onChange={(event) => setSuggestedEdit(event.target.value)}
                                className="mt-2 min-h-28 w-full rounded-md border bg-white p-3 outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Optional. This will not overwrite the original."
                              />
                            </label>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-white" onClick={() => submitFeedback(item, "comment")} disabled={Boolean(saving)}>
                              Save comment
                            </button>
                            <button className="rounded-md border px-3 py-2 text-sm font-bold" onClick={() => submitFeedback(item, "reviewed")} disabled={Boolean(saving)}>
                              Mark as reviewed
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
