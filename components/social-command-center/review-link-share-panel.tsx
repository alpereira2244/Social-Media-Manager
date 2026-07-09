"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatShortDateTime } from "@/lib/date-format";
import { managerReviewUrl, reviewExpirationIso } from "@/components/social-command-center/manager-review-utils";
import type { StorageMode } from "@/lib/supabase/persistence";
import type { PostQueueItem, ReviewLink, ReviewLinkScopeType, ReviewPermissionLevel } from "@/lib/types";

const reviewLinkScopeTypes: ReviewLinkScopeType[] = [
  "This week",
  "Selected date range",
  "Selected posts/replies",
  "Ready to Post only",
  "Scheduled content only"
];

const reviewPermissionLevels: ReviewPermissionLevel[] = [
  "View only",
  "Comment only",
  "Can suggest edits",
  "Can approve/request changes"
];

function FilterField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}

export function ReviewLinkSharePanel({
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
  createReviewLink: (input: {
    scopeType: ReviewLinkScopeType;
    scope: ReviewLink["scope"];
    permissionLevel: ReviewPermissionLevel;
    expiresAt?: string;
  }) => ReviewLink;
  disableReviewLink: (id: string) => void;
  storageMode: StorageMode;
}) {
  const [scopeType, setScopeType] = useState<ReviewLinkScopeType>(defaultScopeType);
  const [permissionLevel, setPermissionLevel] = useState<ReviewPermissionLevel>("Can approve/request changes");
  const [expiresIn, setExpiresIn] = useState<"7" | "14" | "30" | "never">("14");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  });
  const [createdUrl, setCreatedUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [copyTarget, setCopyTarget] = useState("");
  const activeLinks = reviewLinks.filter((link) => !link.disabledAt).slice(0, 4);
  const hasCandidateItems = candidateItems.length > 0;

  function buildScope(): ReviewLink["scope"] {
    if (scopeType === "Selected date range") {
      return {
        startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined
      };
    }
    if (scopeType === "Selected posts/replies") {
      return { itemIds: candidateItems.map((item) => item.id).slice(0, 100) };
    }
    return {};
  }

  async function copyReviewLink(url: string) {
    setCopyTarget(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => {
      setCopyState("idle");
      setCopyTarget("");
    }, 2000);
  }

  function handleCreateLink() {
    if (!hasCandidateItems) {
      setCreatedUrl("");
      setCopyState("failed");
      return;
    }
    const link = createReviewLink({
      scopeType,
      scope: buildScope(),
      permissionLevel,
      expiresAt: reviewExpirationIso(expiresIn)
    });
    const url = managerReviewUrl(link.token);
    setCreatedUrl(url);
    void copyReviewLink(url);
  }

  return (
    <details className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <summary className="cursor-pointer text-sm font-extrabold text-blue-950">Share review link</summary>
      <div className="mt-3 grid gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-950">{label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Managers can review the scoped schedule, comment, suggest edits, approve, or request changes. They cannot publish or open internal app screens.
          </p>
          {!hasCandidateItems && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
              No visible posts or replies are available for this link right now. Approve, schedule, or clear filters before sharing.
            </p>
          )}
          {storageMode !== "supabase" && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
              External review links require Supabase persistence. Local mode can draft link settings, but cannot securely serve shared content to managers.
            </p>
          )}
          {storageMode === "supabase" && hasCandidateItems && (
            <p className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-600">
              If a shared link opens empty, the visible item is likely local-only or not synced to Supabase yet. Save/sync the Ready queue item, then create a fresh link.
            </p>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <FilterField label="Scope">
            <select value={scopeType} onChange={(event) => setScopeType(event.target.value as ReviewLinkScopeType)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              {reviewLinkScopeTypes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
            </select>
          </FilterField>
          <FilterField label="Permission">
            <select value={permissionLevel} onChange={(event) => setPermissionLevel(event.target.value as ReviewPermissionLevel)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              {reviewPermissionLevels.map((permission) => <option key={permission} value={permission}>{permission}</option>)}
            </select>
          </FilterField>
          <FilterField label="Expiration">
            <select value={expiresIn} onChange={(event) => setExpiresIn(event.target.value as "7" | "14" | "30" | "never")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="never">Never expires</option>
            </select>
          </FilterField>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleCreateLink} disabled={!hasCandidateItems}>Create share link</Button>
          </div>
        </div>
        {scopeType === "Selected date range" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterField label="Start date">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </FilterField>
            <FilterField label="End date">
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </FilterField>
          </div>
        )}
        {scopeType === "Selected posts/replies" && (
          <p className="rounded-md bg-white p-3 text-sm text-muted-foreground">
            Includes the {candidateItems.length} currently visible post/reply item{candidateItems.length === 1 ? "" : "s"}.
          </p>
        )}
        {createdUrl && (
          <div className="rounded-md border border-teal-200 bg-teal-50 p-3">
            <p className="text-sm font-bold text-teal-950">
              Review link created {copyState === "copied" ? "and copied" : copyState === "failed" ? "but copy failed" : ""}
            </p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <input
                readOnly
                value={createdUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 flex-1 rounded-md border border-teal-200 bg-white px-3 text-sm"
                aria-label="Created manager review link"
              />
              <Button size="sm" variant="secondary" onClick={() => copyReviewLink(createdUrl)}>
                {copyTarget === createdUrl && copyState === "copied" ? "Copied" : copyTarget === createdUrl && copyState === "failed" ? "Copy failed" : "Copy link"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.open(createdUrl, "_blank", "noopener,noreferrer")}>
                Open
              </Button>
            </div>
            {copyTarget === createdUrl && copyState === "failed" && (
              <p className="mt-2 text-xs font-semibold text-amber-800">
                Clipboard access was blocked. Select the link above and copy it manually.
              </p>
            )}
          </div>
        )}
        {activeLinks.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Active review links</p>
            <div className="mt-2 grid gap-2">
              {activeLinks.map((link) => {
                const url = managerReviewUrl(link.token);
                return (
                  <div key={link.id} className="flex flex-col justify-between gap-2 rounded-md bg-slate-50 p-3 text-sm md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{link.scopeType} · {link.permissionLevel}</p>
                      <p className="text-muted-foreground">
                        Created {formatShortDateTime(link.createdAt)}
                        {link.expiresAt ? ` · Expires ${formatShortDateTime(link.expiresAt)}` : " · No expiration"}
                      </p>
                      <input
                        readOnly
                        value={url}
                        onFocus={(event) => event.currentTarget.select()}
                        className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                        aria-label={`Manager review link for ${link.scopeType}`}
                      />
                      {copyTarget === url && copyState === "failed" && (
                        <p className="mt-1 text-xs font-semibold text-amber-800">
                          Clipboard blocked. Select the link above and copy it manually.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => copyReviewLink(url)}>
                        {copyTarget === url && copyState === "copied" ? "Copied" : copyTarget === url && copyState === "failed" ? "Copy failed" : "Copy"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Open</Button>
                      <Button size="sm" variant="secondary" onClick={() => disableReviewLink(link.id)}>Disable link</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
