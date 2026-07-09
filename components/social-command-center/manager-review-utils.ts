import type { ReviewFeedback } from "@/lib/types";

export function generateReviewToken() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function managerReviewUrl(token: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configuredOrigin) return `${configuredOrigin}/manager-review/${token}`;
  if (typeof window === "undefined") return `/manager-review/${token}`;
  return `${window.location.origin}/manager-review/${token}`;
}

export function reviewExpirationIso(value: "7" | "14" | "30" | "never") {
  if (value === "never") return undefined;
  const date = new Date();
  date.setDate(date.getDate() + Number(value));
  return date.toISOString();
}

export function managerFeedbackForItem(feedback: ReviewFeedback[], itemId: string) {
  return feedback
    .filter((entry) => entry.contentId === itemId && entry.status !== "resolved")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function managerFeedbackStatusLabel(status: ReviewFeedback["status"]) {
  if (status === "changes_requested") return "Changes requested";
  if (status === "approved") return "Approved";
  if (status === "ready_to_post") return "Manager marked ready to post";
  if (status === "reviewed") return "Reviewed";
  if (status === "resolved") return "Resolved";
  return "Comment";
}
