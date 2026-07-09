import { platforms } from "@/lib/mock-data";
import type { FeedbackMemoryItem, FeedbackMemorySourceType, FeedbackMemorySummary, Platform } from "@/lib/types";

export function inferFeedbackPreference(input: {
  sourceType: FeedbackMemorySourceType;
  originalContent?: string;
  revisedContent?: string;
  feedbackText?: string;
}) {
  const text = `${input.feedbackText ?? ""} ${input.revisedContent ?? ""}`.toLowerCase();
  const originalLength = (input.originalContent ?? "").length;
  const revisedLength = (input.revisedContent ?? "").length;
  const preferences: string[] = [];

  if (input.sourceType === "approval") preferences.push("Reinforce the structure and specificity of approved drafts.");
  if (input.sourceType === "rejection") preferences.push("Avoid drafts that feel off-brief, generic, or not ready for Conduit.");
  if (originalLength > 0 && revisedLength > 0 && revisedLength < originalLength * 0.78) {
    preferences.push("Prefer shorter, tighter posts.");
  }
  if (text.includes("shorter") || text.includes("concise") || text.includes("tight")) preferences.push("Prefer concise copy.");
  if (text.includes("hook") || text.includes("first line")) preferences.push("Prefer stronger, more specific first lines.");
  if (text.includes("less generic") || text.includes("generic") || text.includes("ai-like")) preferences.push("Avoid generic or AI-like phrasing.");
  if (text.includes("factory") || text.includes("hardware") || text.includes("robot") || text.includes("floor") || text.includes("operations")) {
    preferences.push("Prefer concrete factory-floor and operational specificity.");
  }
  if (text.includes("hashtag") || text.includes("#")) preferences.push("Use hashtags sparingly unless they add clear platform value.");
  if (text.includes("founder")) preferences.push("Use a more founder-led, direct tone when appropriate.");
  if (text.includes("hype") || text.includes("corporate") || text.includes("marketing")) preferences.push("Avoid hypey corporate marketing language.");
  if (text.includes("media") || text.includes("image") || text.includes("caption")) preferences.push("Ground captions in the visible media.");
  if (text.includes("claim") || text.includes("proof") || text.includes("unsupported")) preferences.push("Prefer fewer unsupported claims and clearer proof.");
  if (text.includes("excited to share")) preferences.push("Avoid 'excited to share' openings.");

  return uniqueValues(preferences).slice(0, 3).join(" ");
}

export function feedbackMemorySummary(items: FeedbackMemoryItem[], enabled: boolean): FeedbackMemorySummary {
  const active = items.filter((item) => !item.ignored);
  const important = active.filter((item) => item.important);
  const ordered = [...important, ...active.filter((item) => !item.important)];
  const topPreferences = mostCommonPreferences(ordered.map((item) => item.inferredPreference), 8);
  const platformPreferences = platforms.reduce<Record<string, string[]>>((acc, platform: Platform) => {
    const preferences = mostCommonPreferences(
      ordered.filter((item) => item.platform === platform).map((item) => item.inferredPreference),
      4
    );
    if (preferences.length > 0) acc[platform] = preferences;
    return acc;
  }, {});
  const profilePreferences = ordered.reduce<Record<string, string[]>>((acc, item) => {
    const key = item.postingAccountName || item.postingAccountId;
    if (!key) return acc;
    acc[key] = mostCommonPreferences(
      ordered
        .filter((memory) => (memory.postingAccountName || memory.postingAccountId) === key)
        .map((memory) => memory.inferredPreference),
      4
    );
    return acc;
  }, {});
  const eventCount = active.length;
  return {
    enabled,
    topPreferences,
    platformPreferences,
    profilePreferences,
    confidence: eventCount >= 10 ? "High" : eventCount >= 4 ? "Medium" : "Low",
    eventCount
  };
}

function mostCommonPreferences(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values
    .flatMap((value) => value.split(".").map((item) => item.trim()).filter(Boolean))
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
