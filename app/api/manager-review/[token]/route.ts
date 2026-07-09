import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const managerReviewTimeoutMs = 12000;

async function withManagerReviewTimeout<T>(query: PromiseLike<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(query),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} timed out while loading the manager review link.`)),
          managerReviewTimeoutMs
        );
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function managerReviewError(error: unknown, fallback = "Could not load manager review link.") {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: message.includes("timed out") ? 504 : 500 });
}

function isLikelyReviewToken(value: string) {
  return /^[a-f0-9]{32,96}$/i.test(value);
}

function invalidReviewLinkResponse() {
  return NextResponse.json({ error: "This review link is invalid, disabled, or expired." }, { status: 404 });
}

function isExpired(value?: string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function queueContentType(row: any) {
  return row?.supporting_json?.contentType === "Reply" ? "Reply" : "Post";
}

function scopedItems(rows: any[], link: any) {
  const scopeType = link.scope_type ?? "This week";
  const scope = link.scope_json ?? {};
  const itemIds = Array.isArray(scope.itemIds) ? scope.itemIds : [];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return rows.filter((row) => {
    const supporting = row.supporting_json ?? {};
    const status = safeString(row.status) || "Ready";
    const dateValue = row.planned_at || supporting.postedAt || row.created_at;
    const itemDate = dateValue ? new Date(dateValue) : null;

    if (scopeType === "Selected posts/replies") {
      return itemIds.includes(row.id);
    }

    if (scopeType === "Ready to Post only") {
      return status === "Ready";
    }

    if (scopeType === "Scheduled content only") {
      return status === "Scheduled";
    }

    if (scopeType === "Selected date range") {
      const start = scope.startDate ? new Date(scope.startDate) : null;
      const end = scope.endDate ? new Date(scope.endDate) : null;
      if (!itemDate) return false;
      return (!start || itemDate >= start) && (!end || itemDate <= end);
    }

    if (!itemDate) return status === "Ready" || status === "Scheduled";
    return itemDate >= weekStart && itemDate < weekEnd;
  });
}

function reviewBucketForRow(row: any, feedback: any[]) {
  const supporting = row.supporting_json ?? {};
  const status = safeString(row.status) || "Ready";
  const normalizedStatus = status.toLowerCase();
  const hasUnresolvedFeedback = feedback.some(
    (item) => item.content_id === row.id && item.status !== "resolved"
  );

  if ((supporting.hiddenFromQueue && !supporting.managerReviewOnly) || normalizedStatus === "archived") {
    return "archived";
  }

  if (normalizedStatus === "posted" || normalizedStatus === "replied") {
    return "completed";
  }

  if (hasUnresolvedFeedback) {
    return "active";
  }

  return "active";
}

function sanitizeItem(row: any, feedback: any[]) {
  const supporting = row.supporting_json ?? {};
  const itemFeedback = feedback.filter((item) => item.content_id === row.id && item.status !== "resolved");
  const activeFeedback = itemFeedback[0];
  const reviewStatus =
    activeFeedback?.status === "changes_requested"
      ? "Changes requested"
      : activeFeedback?.status === "approved"
        ? "Manager approved"
        : activeFeedback?.status === "ready_to_post"
          ? "Manager marked ready to post"
          : supporting.review?.status ?? row.status ?? "Ready";
  return {
    id: row.id,
    contentType: queueContentType(row),
    platform: row.platform,
    postingAccount: row.profile_name ?? "Conduit",
    sourceTitle: supporting.opportunityTitle ?? row.campaign_name ?? "Content item",
    content: supporting.postCopy ?? row.content ?? "",
    contentOrigin: supporting.contentOrigin ?? "",
    mediaUsed: Boolean(row.media_used),
    mediaPreviewUrl: supporting.mediaPublicUrl ?? "",
    mediaAssetName: supporting.mediaAssetName ?? "",
    overlayText: supporting.overlayText ?? "",
    altText: supporting.altText ?? "",
    cta: supporting.cta ?? "",
    hashtags: Array.isArray(supporting.hashtags) ? supporting.hashtags : [],
    firstComment: supporting.firstComment ?? "",
    opportunityTitle: supporting.opportunityTitle ?? "",
    plannedAt: row.planned_at,
    postedAt: supporting.postedAt,
    status: row.status ?? "Ready",
    reviewBucket: reviewBucketForRow(row, itemFeedback),
    readiness: supporting.readinessLabel ?? "Ready",
    safetyStatus: supporting.safetyCheck?.status ?? "Safe",
    reviewerNotes: activeFeedback?.comment ?? supporting.review?.feedback ?? "",
    approvalStatus: reviewStatus,
    feedback: itemFeedback.map((item) => ({
        id: item.id,
        reviewerName: item.reviewer_name ?? "Manager",
        comment: item.comment ?? "",
        suggestedEdit: item.suggested_edit ?? "",
        status: item.status ?? "comment",
        createdAt: item.created_at
      }))
  };
}

export async function GET(_request: NextRequest, context: { params: { token: string } }) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Manager review requires server Supabase configuration." }, { status: 500 });
  }

  try {
    const token = context.params.token;
    if (!isLikelyReviewToken(token)) {
      return invalidReviewLinkResponse();
    }

    const { data: link, error: linkError } = await withManagerReviewTimeout(
      supabase
        .from("review_links")
        .select("*")
        .eq("token", token)
        .maybeSingle(),
      "Review link lookup"
    );

    if (linkError || !link || link.disabled_at || isExpired(link.expires_at)) {
      return invalidReviewLinkResponse();
    }

    const { data: queueRows, error: queueError } = await withManagerReviewTimeout(
      supabase
        .from("post_queue")
        .select("*")
        .eq("workspace_id", link.workspace_id)
        .order("planned_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      "Review queue lookup"
    );

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 });
    }

    const scoped = scopedItems(queueRows ?? [], link);
    const { data: feedbackRows } = await withManagerReviewTimeout(
      supabase
        .from("review_feedback")
        .select("*")
        .eq("workspace_id", link.workspace_id)
        .eq("review_link_id", link.id)
        .in("content_id", scoped.length > 0 ? scoped.map((item) => item.id) : ["__none__"])
        .order("created_at", { ascending: false }),
      "Review feedback lookup"
    );

    return NextResponse.json({
      link: {
        id: link.id,
        token: link.token,
        scopeType: link.scope_type,
        permissionLevel: link.permission_level,
        expiresAt: link.expires_at,
        createdAt: link.created_at
      },
      items: scoped.map((row) => sanitizeItem(row, feedbackRows ?? []))
    });
  } catch (error) {
    return managerReviewError(error);
  }
}

export async function POST(request: NextRequest, context: { params: { token: string } }) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Manager review requires server Supabase configuration." }, { status: 500 });
  }

  try {
    const token = context.params.token;
    if (!isLikelyReviewToken(token)) {
      return invalidReviewLinkResponse();
    }

    const body = await request.json().catch(() => ({}));
    const { data: link, error: linkError } = await withManagerReviewTimeout(
      supabase
        .from("review_links")
        .select("*")
        .eq("token", token)
        .maybeSingle(),
      "Review link lookup"
    );

    if (linkError || !link || link.disabled_at || isExpired(link.expires_at)) {
      return invalidReviewLinkResponse();
    }

    const permission = link.permission_level ?? "Comment only";
    const status = body.status === "approved" || body.status === "changes_requested" || body.status === "reviewed" || body.status === "ready_to_post"
      ? body.status
      : "comment";
    if (permission === "View only") {
      return NextResponse.json({ error: "This review link is view-only." }, { status: 403 });
    }
    if (status !== "comment" && status !== "reviewed" && permission !== "Can approve/request changes") {
      return NextResponse.json({ error: "This link cannot approve or request changes." }, { status: 403 });
    }
    if (body.suggestedEdit && permission !== "Can suggest edits" && permission !== "Can approve/request changes") {
      return NextResponse.json({ error: "This link cannot suggest edits." }, { status: 403 });
    }

    const feedback = {
      id: `manager-feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspace_id: link.workspace_id,
      review_link_id: link.id,
      content_type: body.contentType === "Reply" ? "Reply" : "Post",
      content_id: safeString(body.contentId),
      reviewer_name: safeString(body.reviewerName) || "Manager",
      comment: safeString(body.comment),
      suggested_edit: safeString(body.suggestedEdit) || null,
      status,
      created_at: new Date().toISOString()
    };

    if (!feedback.content_id) {
      return NextResponse.json({ error: "Missing content item." }, { status: 400 });
    }

    const { data: targetRow, error: targetError } = await withManagerReviewTimeout(
      supabase
        .from("post_queue")
        .select("*")
        .eq("workspace_id", link.workspace_id)
        .eq("id", feedback.content_id)
        .maybeSingle(),
      "Review item lookup"
    );

    if (targetError || !targetRow || scopedItems([targetRow], link).length === 0) {
      return NextResponse.json({ error: "This item is not included in the review link scope." }, { status: 403 });
    }

    const { error } = await withManagerReviewTimeout(
      supabase.from("review_feedback").insert(feedback),
      "Manager feedback save"
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const supporting = targetRow.supporting_json ?? {};
    const reviewStatus =
      status === "approved"
        ? "Manager approved"
        : status === "changes_requested"
          ? "Changes requested"
          : status === "ready_to_post"
            ? "Manager marked ready to post"
            : supporting.review?.status ?? "Sent for review";

    await withManagerReviewTimeout(
      supabase
        .from("post_queue")
        .update({
          supporting_json: {
            ...supporting,
            review: {
              ...(supporting.review ?? {}),
              status: reviewStatus,
              reviewerName: feedback.reviewer_name,
              feedback: feedback.comment || feedback.suggested_edit || supporting.review?.feedback || "",
              reviewedAt: feedback.created_at
            }
          },
          updated_at: feedback.created_at
        })
        .eq("id", feedback.content_id)
        .eq("workspace_id", link.workspace_id),
      "Review item update"
    );

    await withManagerReviewTimeout(
      supabase.from("activity_log").insert({
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspace_id: link.workspace_id,
        action_type: status === "approved" ? "Manager approved" : status === "changes_requested" ? "Manager requested changes" : status === "ready_to_post" ? "Manager marked ready to post" : "Manager feedback received",
        object_type: feedback.content_type,
        object_id: feedback.content_id,
        title: status === "approved" ? "Manager approved item" : status === "changes_requested" ? "Manager requested changes" : status === "ready_to_post" ? "Manager marked item ready to post" : "Manager comment added",
        summary: feedback.comment || feedback.suggested_edit || "Manager review feedback saved.",
        destination: "Review Drafts",
        status: "success",
        metadata_json: { reviewLinkId: link.id },
        created_at: feedback.created_at
      }),
      "Manager feedback activity log"
    );

    return NextResponse.json({ ok: true, feedback });
  } catch (error) {
    return managerReviewError(error, "Could not save manager review feedback.");
  }
}
