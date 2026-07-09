"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/social-command-center/common-ui";
import { cn } from "@/lib/utils";
import type { ReviewMetadata, ReviewWorkflowStatus } from "@/lib/types";

export const reviewerOptions = ["Danny", "Sahil", "Conduit / team", "Other"];

export function reviewWithDefault(review: ReviewMetadata | undefined, fallbackStatus: ReviewWorkflowStatus = "Draft"): ReviewMetadata {
  return review ?? { status: fallbackStatus };
}

export function shouldMarkDraftRevised(status?: ReviewWorkflowStatus) {
  return status === "Sent for review" ||
    status === "Changes requested" ||
    status === "Manager approved" ||
    status === "Manager marked ready to post";
}

export function revisedReview(review: ReviewMetadata, feedback = "Updated draft available.") {
  return {
    ...review,
    status: "Revised" as const,
    feedback: feedback || review.feedback,
    reviewedAt: new Date().toISOString()
  };
}

export function ReviewWorkflowPanel({
  review,
  contentKind,
  onChange,
  onRegenerateFromFeedback,
  className
}: {
  review: ReviewMetadata;
  contentKind: "Post" | "Reply";
  onChange: (review: ReviewMetadata) => void;
  onRegenerateFromFeedback?: (feedback: string) => void;
  className?: string;
}) {
  const [reviewer, setReviewer] = useState(review.reviewerName || "Conduit / team");
  const [customReviewer, setCustomReviewer] = useState("");
  const [feedback, setFeedback] = useState(review.feedback || "");
  const selectedReviewer = reviewer === "Other" ? customReviewer.trim() || "Other" : reviewer;

  useEffect(() => {
    setReviewer(reviewerOptions.includes(review.reviewerName || "") ? review.reviewerName || "Conduit / team" : review.reviewerName ? "Other" : "Conduit / team");
    setCustomReviewer(review.reviewerName && !reviewerOptions.includes(review.reviewerName) ? review.reviewerName : "");
    setFeedback(review.feedback || "");
  }, [review.feedback, review.reviewerName]);

  function applyReview(status: ReviewWorkflowStatus) {
    const now = new Date().toISOString();
    onChange({
      ...review,
      status,
      reviewerName: selectedReviewer,
      feedback: feedback.trim(),
      requestedAt: status === "Sent for review" ? now : review.requestedAt,
      reviewedAt: ["Manager approved", "Manager marked ready to post", "Approved", "Changes requested", "Ready to Post", "Ready to Reply", "Posted", "Replied", "Archived"].includes(status)
        ? now
        : review.reviewedAt
    });
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50 p-4", className)}>
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Draft review loop</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ReviewStatusBadge status={review.status} />
            {review.reviewerName && <Pill>Reviewer: {review.reviewerName}</Pill>}
          </div>
          {review.feedback && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              {review.feedback}
            </p>
          )}
          {(review.status === "Approved" || review.status === "Manager approved") && review.reviewerName && (
            <p className="mt-2 text-sm font-semibold text-primary">Approved by {review.reviewerName}</p>
          )}
          {review.status === "Manager marked ready to post" && (
            <p className="mt-2 text-sm font-semibold text-primary">Manager marked this ready to move into the manual publishing queue.</p>
          )}
        </div>
        <div className="grid min-w-64 gap-2">
          <select
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
            aria-label="Reviewer"
          >
            {reviewerOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {reviewer === "Other" && (
            <input
              value={customReviewer}
              onChange={(event) => setCustomReviewer(event.target.value)}
              className="h-10 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Reviewer name"
            />
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          className="min-h-20 rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
          placeholder={`Add review feedback for this ${contentKind.toLowerCase()}.`}
        />
        <div className="flex flex-wrap content-start gap-2 lg:max-w-sm">
          <Button size="sm" variant="secondary" onClick={() => applyReview("Sent for review")}>
            Send for review
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyReview("Changes requested")}>
            Request changes
          </Button>
          <Button size="sm" onClick={() => applyReview("Approved")}>
            Approve review
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyReview(review.status)}>
            Add feedback note
          </Button>
          {review.status === "Changes requested" && feedback.trim() && onRegenerateFromFeedback && (
            <Button size="sm" variant="secondary" onClick={() => onRegenerateFromFeedback(feedback)}>
              Regenerate from feedback
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewWorkflowStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-extrabold",
        status === "Manager approved" || status === "Manager marked ready to post" || status === "Approved" || status === "Ready to Post" || status === "Ready to Reply" || status === "Posted" || status === "Replied"
          ? "bg-teal-100 text-teal-800"
          : status === "Revised"
            ? "bg-blue-100 text-blue-800"
            : status === "Changes requested"
              ? "bg-amber-100 text-amber-800"
              : status === "Sent for review" || status === "Needs review"
                ? "bg-sky-100 text-sky-800"
                : status === "Archived"
                  ? "bg-slate-200 text-slate-700"
                  : "bg-slate-100 text-slate-600"
      )}
    >
      {status}
    </span>
  );
}
