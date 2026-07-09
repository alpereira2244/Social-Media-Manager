import type { InspirationPatternPlatform, LibrarySource, Profile, ProfileSourcePlatform } from "@/lib/types";

export const profileSourcePlatformOptions: ProfileSourcePlatform[] = [
  "X",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "Website",
  "Website/blog",
  "Other URL"
];

export const socialUrlDomains = [
  "x.com",
  "twitter.com",
  "linkedin.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be"
];

export function inferProfileSourcePlatform(value: string): ProfileSourcePlatform {
  const lower = value.toLowerCase();
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "X";
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("http")) return "Website";
  return "Other URL";
}

export function looksLikeUrl(value?: string) {
  const text = (value ?? "").trim().toLowerCase();
  return (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("www.") ||
    text.includes("linkedin.com/") ||
    text.includes("x.com/") ||
    text.includes("twitter.com/")
  );
}

export function normalizeProfileSourcePlatform(value: unknown, fallback: ProfileSourcePlatform): ProfileSourcePlatform {
  const platform = String(value ?? "");
  return profileSourcePlatformOptions.includes(platform as ProfileSourcePlatform)
    ? platform as ProfileSourcePlatform
    : fallback;
}

export function inferInspirationPatternPlatform(value: string): InspirationPatternPlatform {
  const lower = value.toLowerCase();
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "X";
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube";
  if (lower.includes("http")) return "Website";
  return "Other";
}

export function extractUrls(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isSocialUrl(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return [
      ...socialUrlDomains,
      "facebook.com",
      "fb.com"
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    const lower = value.toLowerCase();
    return socialUrlDomains.some((host) => lower.includes(host));
  }
}

export function firstWebsiteUrl(value: string) {
  return extractUrls(value).find((item) => /\./.test(item) && !isSocialUrl(item));
}

export function profileUrlValues(profile: Pick<
  Profile,
  "linkedInUrl" | "xUrl" | "instagramUrl" | "tiktokUrl" | "websiteUrl" | "otherUrls"
>) {
  return [
    profile.linkedInUrl,
    profile.xUrl,
    profile.instagramUrl,
    profile.tiktokUrl,
    profile.websiteUrl,
    ...profile.otherUrls.split(/\s+/)
  ].filter((value) => value.trim());
}

export function countProfileUrls(profile: Pick<
  Profile,
  "linkedInUrl" | "xUrl" | "instagramUrl" | "tiktokUrl" | "websiteUrl" | "otherUrls"
>) {
  return profileUrlValues(profile).length;
}

export function profileUrlsText(profile: Pick<
  Profile,
  "linkedInUrl" | "xUrl" | "instagramUrl" | "tiktokUrl" | "websiteUrl" | "otherUrls"
>) {
  return profileUrlValues(profile).join("\n");
}

export function hasLinkedInOrXProfileUrl(profile: Pick<Profile, "linkedInUrl" | "xUrl" | "otherUrls">) {
  return Boolean(profile.linkedInUrl || profile.xUrl || /linkedin\.com|x\.com|twitter\.com/i.test(profile.otherUrls));
}

export function hasWebsiteProfileUrl(profile: Pick<Profile, "websiteUrl" | "otherUrls">) {
  return Boolean(profile.websiteUrl || /https?:\/\/(?!.*(?:linkedin\.com|x\.com|twitter\.com))/i.test(profile.otherUrls));
}

export function hasLinkedInOrXSourceUrl(source: Pick<LibrarySource, "urls" | "platform">) {
  return source.platform === "LinkedIn" || source.platform === "X" || /linkedin\.com|x\.com|twitter\.com/i.test(source.urls);
}

export function hasWebsiteSourceUrl(source: Pick<LibrarySource, "urls" | "platform" | "category">) {
  return (
    source.platform === "Website" ||
    source.category === "Website" ||
    source.category === "Blog" ||
    /https?:\/\/(?!.*(?:linkedin\.com|x\.com|twitter\.com))/i.test(source.urls)
  );
}
