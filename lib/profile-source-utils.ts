import { isSocialUrl } from "@/lib/source-platforms";
import type {
  Profile,
  ProfileSourceKind,
  ProfileSourcePlatform,
  ProfileSourceSyncStatus,
  ProfileSourceType,
  ProfileType
} from "@/lib/types";

type ProfileVoiceSource = NonNullable<Profile["voiceSources"]>[number];

export function isSocialProfileSource(source: Pick<ProfileVoiceSource, "platform" | "url">) {
  return (
    ["X", "LinkedIn", "Instagram", "TikTok"].includes(source.platform) ||
    Boolean(source.url && isSocialUrl(source.url))
  );
}

export function isWebsiteProfileSource(source: Pick<ProfileVoiceSource, "platform" | "url">) {
  return (source.platform === "Website" || source.platform === "Website/blog") && !isSocialProfileSource(source);
}

export function isLinkedInCompanyPostsProfileSource(source: Pick<ProfileVoiceSource, "platform" | "url">) {
  const url = source.url.toLowerCase();
  return source.platform === "LinkedIn" && url.includes("linkedin.com/company/") && url.includes("/posts");
}

export function sourceLearningKind(source: ProfileVoiceSource) {
  if (
    source.analysis ||
    source.syncStatus === "analyzed" ||
    source.syncStatus === "public page analyzed" ||
    source.syncStatus === "synced"
  ) {
    if (source.syncStatus === "synced") return "API synced and analyzed";
    if (source.syncStatus === "public page analyzed") return "Public page analyzed";
    if (source.fetchedContent?.trim()) return "Website fetched and analyzed";
    if (source.screenshot?.analysisText?.trim()) return "Screenshot analyzed";
    if (source.pastedText?.trim()) return "Pasted text analyzed";
    if (source.notes?.trim()) return "Notes analyzed";
    return "Notes analyzed";
  }
  if (source.syncStatus === "fetched, ready to analyze" || source.fetchedContent?.trim()) {
    return "Website fetched, not analyzed";
  }
  if (source.syncStatus === "fetch blocked") return "Fetch blocked";
  if (source.url) return "Link saved";
  return "Not analyzed yet";
}

export function sourceLearningBadge(source: ProfileVoiceSource) {
  const kind = sourceLearningKind(source);
  if (kind === "API synced and analyzed") return "Synced learned";
  if (kind === "Public page analyzed") return "Public page learned";
  if (kind === "Website fetched and analyzed") return "Website learned";
  if (kind === "Screenshot analyzed") return "Screenshot learned";
  if (kind === "Pasted text analyzed") return "Pasted examples learned";
  if (kind === "Notes analyzed") return "Notes learned";
  if (kind === "Link saved") return "Saved link";
  if (kind === "Fetch blocked") return "Fetch blocked";
  if (kind === "Website fetched, not analyzed") return "Fetched. Ready to analyze.";
  return "Not analyzed yet";
}

export function sourceLearningBasisLabel(source: ProfileVoiceSource) {
  const kind = sourceLearningKind(source);
  if (kind === "API synced and analyzed") return "API synced posts";
  if (kind === "Public page analyzed") return "public page content";
  if (kind === "Website fetched and analyzed") return "fetched website content";
  if (kind === "Screenshot analyzed") return "screenshot analysis";
  if (kind === "Pasted text analyzed") return "pasted text";
  if (kind === "Notes analyzed") return "notes only";
  if (kind === "Website fetched, not analyzed") return "fetched website, not analyzed";
  if (kind === "Fetch blocked") return "saved link, fetch blocked";
  if (kind === "Link saved") return "saved link, not analyzed";
  return "not analyzed";
}

export function sourceHasAnalyzableContent(
  source: Pick<ProfileVoiceSource, "pastedText" | "fetchedContent" | "screenshot" | "notes">
) {
  return Boolean(
    source.pastedText?.trim() ||
    source.fetchedContent?.trim() ||
    source.screenshot?.analysisText?.trim() ||
    source.notes?.trim()
  );
}

export function sourceHasOnlySavedSocialUrl(source: ProfileVoiceSource) {
  return Boolean(source.url && isSocialProfileSource(source) && !sourceHasAnalyzableContent(source));
}

export function sourceAnalyzeButtonLabel(source: ProfileVoiceSource) {
  if (source.syncStatus === "synced") return "Analyze synced posts";
  if (source.fetchedContent?.trim()) return "Analyze website";
  if (source.screenshot?.analysisText?.trim() || source.screenshot?.dataUrl) return "Analyze screenshot";
  if (source.pastedText?.trim()) return "Analyze pasted text";
  if (source.notes?.trim()) return "Analyze notes";
  return "Add examples to analyze";
}

export function sourceNextStep(source: ProfileVoiceSource) {
  if (source.analysis || source.syncStatus === "analyzed" || source.syncStatus === "public page analyzed") return "Use in Create Post";
  if (source.fetchedContent?.trim()) return "Analyze website";
  if (isWebsiteProfileSource(source)) return "Fetch website source";
  if (sourceHasOnlySavedSocialUrl(source)) return "Add screenshot or pasted examples";
  if (source.pastedText?.trim()) return "Analyze pasted text";
  if (source.screenshot?.dataUrl || source.screenshot?.analysisText) return "Analyze screenshot";
  if (source.notes?.trim()) return "Analyze notes";
  return "Add examples to analyze";
}

export function sourceTypeDefaultsPatternOnly(type: ProfileSourceType) {
  return (
    type === "inspiration/reference" ||
    type === "competitor/market watch" ||
    type === "audience/persona"
  );
}

export function profileSourceDisplayStatus(source: ProfileVoiceSource) {
  if (
    source.analysis ||
    source.syncStatus === "analyzed" ||
    source.syncStatus === "public page analyzed" ||
    source.syncStatus === "synced"
  ) return sourceLearningBadge(source);
  if (source.syncStatus === "fetch blocked") return "Fetch blocked";
  if (source.syncStatus === "fetched, ready to analyze" || source.fetchedContent) return "Fetched. Ready to analyze.";
  if (isWebsiteProfileSource(source)) return "Website can be fetched";
  if (isSocialProfileSource(source)) return "Social sync not connected";
  if (!sourceHasAnalyzableContent(source)) return "Needs examples or screenshot to analyze now";
  return "Saved, not synced";
}

export function isPatternOnlyProfileType(type: ProfileType) {
  return (
    type === "Inspiration / Reference" ||
    type === "Competitor / Market Watch" ||
    type === "Customer / Audience Persona"
  );
}

export function profileSourceTypeForProfileType(type: ProfileType): ProfileSourceType {
  if (type === "Company Account") return "company account";
  if (type === "Inspiration / Reference") return "inspiration/reference";
  if (type === "Competitor / Market Watch") return "competitor/market watch";
  if (type === "Customer / Audience Persona") return "audience/persona";
  return "internal voice";
}

export function profileSourceKindForUrl(url: string, platform: ProfileSourcePlatform): ProfileSourceKind {
  const lower = url.toLowerCase();
  if (platform === "Website") return "website";
  if (lower.includes("/status/") || lower.includes("/posts/") || lower.includes("/p/") || lower.includes("/reel/")) {
    return "post URL";
  }
  return "account URL";
}

export function profileSourceStatusLabel(status?: ProfileSourceSyncStatus) {
  if (status === "analyzed") return "Learned";
  if (status === "public page analyzed") return "Public page analyzed";
  if (status === "fetch blocked") return "Fetch blocked";
  if (status === "failed") return "Needs attention";
  if (status === "fetched, ready to analyze") return "Fetched, ready to analyze";
  if (status === "needs API" || status === "API sync available later") return "API sync not connected";
  if (status === "synced") return "Synced";
  if (status === "needs screenshot/text") return "Needs example content";
  return "Saved, not synced";
}

export function profileSourceReadinessLabel(source: ProfileVoiceSource) {
  if (source.analysis || source.syncStatus === "analyzed" || source.syncStatus === "public page analyzed") {
    if (source.syncStatus === "public page analyzed") return "Best-effort public page analysis";
    return source.patternOnly ? "Pattern-only analysis" : "Voice analysis";
  }
  if (source.syncStatus === "fetch blocked") return "Saved link, fetch blocked";
  if (source.syncStatus === "fetched, ready to analyze" || source.fetchedContent) return "Fetched, ready to analyze";
  if (source.sourceType === "inspiration/reference") return "Saved as pattern-only inspiration";
  if (source.sourceType === "competitor/market watch") return "Saved for future monitoring";
  if (source.sourceType === "internal voice" || source.sourceType === "company account") {
    return source.platform === "Website" ? "Can fetch now" : "Saved for future owned-account sync";
  }
  return source.url ? "Needs examples/screenshots" : "Needs examples/screenshots";
}

export function isInspirationProfile(profile: Pick<Profile, "type">) {
  return (
    profile.type === "Inspiration / Reference" ||
    profile.type === "Competitor / Market Watch"
  );
}

export function isInternalVoiceProfile(profile: Pick<Profile, "type">) {
  return !isInspirationProfile(profile) && profile.type !== "Customer / Audience Persona";
}

export function findDefaultPostingAccount(profiles: Profile[]) {
  return (
    profiles.find((profile) => profile.name.toLowerCase().includes("conduit")) ??
    profiles.find((profile) => profile.type === "Company Account") ??
    profiles[0]
  );
}
