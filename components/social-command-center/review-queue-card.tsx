"use client";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/social-command-center/common-ui";
import { ReviewStatusBadge } from "@/components/social-command-center/review-workflow";
import { formatShortDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type {
  BrandSafetyCheck,
  Campaign,
  GeneratedPost,
  Opportunity,
  OpportunityReplyDraft,
  Platform,
  PostQueueItem,
  ReviewFeedback,
  ReviewMetadata,
  ReviewWorkflowStatus
} from "@/lib/types";

export type ReviewQueueItem = {
  id: string;
  contentType: "Post" | "Reply";
  platform: Platform;
  postingAccount: string;
  title: string;
  reviewer: string;
  review: ReviewMetadata;
  reviewStatus: ReviewWorkflowStatus;
  latestFeedback: string;
  requestedAt?: string;
  readinessScore?: number;
  safetyStatus?: BrandSafetyCheck["status"];
  queued: boolean;
  campaign?: Campaign;
  post?: GeneratedPost;
  opportunity?: Opportunity;
  reply?: OpportunityReplyDraft;
  queueItem?: PostQueueItem;
  managerFeedback?: ReviewFeedback;
  suggestedEdit?: string;
};

export function ReviewQueueCard({
  item,
  onOpen,
  onRegenerateFromFeedback,
  onApproveReview,
  onMoveToReady,
  onArchive,
  onAcceptSuggestedEdit
}: {
  item: ReviewQueueItem;
  onOpen: () => void;
  onRegenerateFromFeedback: () => void;
  onApproveReview: () => void;
  onMoveToReady: () => void;
  onArchive: () => void;
  onAcceptSuggestedEdit: () => void;
}) {
  const needsChanges = item.reviewStatus === "Changes requested";
  const managerReady = item.reviewStatus === "Manager approved" || item.reviewStatus === "Manager marked ready to post";
  const approvedNotQueued = (item.reviewStatus === "Approved" || managerReady) && (!item.queued || item.queueItem?.managerReviewOnly);
  const readyLabel = item.contentType === "Reply" ? "Move to Ready to Reply" : "Move to Ready to Post";
  const safetyLabel = item.safetyStatus || "Not checked";

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 shadow-sm",
        needsChanges
          ? "border-amber-300 bg-amber-50/50"
          : approvedNotQueued
            ? "border-teal-300 bg-teal-50/40"
            : "border-slate-200"
      )}
    >
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{item.contentType}</Pill>
            <Pill>{item.platform}</Pill>
            <ReviewStatusBadge status={item.reviewStatus} />
            {item.safetyStatus && <Pill>Safety: {safetyLabel}</Pill>}
            {typeof item.readinessScore === "number" && <Pill>Readiness: {item.readinessScore}/100</Pill>}
          </div>
          <h4 className="mt-3 text-base font-extrabold tracking-tight">{item.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.postingAccount} · Reviewer: {item.reviewer} · Requested {formatShortDateTime(item.requestedAt)}
          </p>
          {item.latestFeedback ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Latest feedback: </span>
              {item.latestFeedback}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No feedback note yet.</p>
          )}
          {item.suggestedEdit && (
            <details className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <summary className="cursor-pointer font-bold">Suggested edit from manager</summary>
              <p className="mt-2 whitespace-pre-wrap leading-6">{item.suggestedEdit}</p>
              <p className="mt-2 text-xs font-semibold text-blue-800">
                Suggested edits do not overwrite the original until you accept them.
              </p>
            </details>
          )}
        </div>
        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          <Button size="sm" variant="secondary" onClick={onOpen}>
            Open draft
          </Button>
          {needsChanges && (
            <Button size="sm" onClick={onRegenerateFromFeedback}>
              Regenerate from feedback
            </Button>
          )}
          {item.reviewStatus !== "Approved" && item.reviewStatus !== "Manager approved" && item.reviewStatus !== "Manager marked ready to post" && item.reviewStatus !== "Ready to Post" && item.reviewStatus !== "Ready to Reply" && (
            <Button size="sm" variant="secondary" onClick={onApproveReview}>
              Approve review
            </Button>
          )}
          {approvedNotQueued && (
            <Button size="sm" onClick={onMoveToReady}>
              {readyLabel}
            </Button>
          )}
          {item.suggestedEdit && (
            <Button size="sm" variant="secondary" onClick={onAcceptSuggestedEdit}>
              Accept suggested edit
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onArchive}>
            Archive
          </Button>
        </div>
      </div>
    </div>
  );
}
