import { formatShortDate } from "@/lib/date-format";
import type { LibrarySource, LibrarySourceCategory, LibrarySourcePlatform, SourceUrlType, SyncStatus } from "@/lib/types";

export const transcriptSourceCategories: LibrarySourceCategory[] = [
  "Transcript / Meeting Notes",
  "Founder Notes",
  "Sales Notes",
  "Customer Conversation",
  "Investor Narrative",
  "Product Notes"
];

export const transcriptUseOptions = [
  "Use as Company Knowledge",
  "Use as Danny voice example",
  "Use as Sahil voice example",
  "Use as customer pain source",
  "Use as product/source material",
  "Do not use for generation yet, save only"
];

export function countUrls(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

export function getUrlType(source: { urlType?: SourceUrlType }) {
  return source.urlType ?? "Other";
}

export function getSyncStatus(source: { syncStatus?: SyncStatus }) {
  return source.syncStatus ?? "Manual Only";
}

export function getLastChecked(source: { lastChecked?: string }) {
  return source.lastChecked ?? "Never";
}

export function currentCheckedAt() {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

export function isTranscriptSourceCategory(category?: LibrarySourceCategory | string) {
  return transcriptSourceCategories.includes(category as LibrarySourceCategory);
}

export function firstDomainFromText(value?: string) {
  const firstUrl = String(value ?? "").match(/https?:\/\/[^\s,]+/i)?.[0];
  if (!firstUrl) return "";
  try {
    return new URL(firstUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getLibrarySourceDisplayName(source: LibrarySource) {
  const rawName = source.name.trim();
  if (rawName && !/^untitled(?: source| knowledge(?: item| source)?)?$/i.test(rawName)) {
    return rawName;
  }

  const domain = firstDomainFromText(source.urls);
  const uploadedFilename = source.documents?.[0]?.filename;
  const date = formatShortDate(source.updatedAt || getLastChecked(source));

  if (domain) return `${source.category || "Website"} Source - ${domain}`;
  if (uploadedFilename) return `Uploaded ${uploadedFilename}`;
  if (source.category === "Founder Social" || source.category === "Company Social") {
    return `${source.category} Source - ${date}`;
  }
  if (source.platform === "Document") return `Uploaded Notes - ${date}`;
  return `Knowledge Source - ${date}`;
}

export function hasStoredUrls(value?: string) {
  return countUrls(value ?? "") > 0;
}

export function librarySyncReadinessMessage(source: {
  urlType?: SourceUrlType;
  platform?: LibrarySourcePlatform;
  category?: LibrarySourceCategory;
}) {
  const urlType = getUrlType(source);
  const isWebsiteOrBlog =
    urlType === "Website URL" ||
    source.platform === "Website" ||
    source.category === "Website" ||
    source.category === "Blog";
  const isSocial =
    urlType === "Social Profile URL" ||
    urlType === "Social Post URL" ||
    source.platform === "LinkedIn" ||
    source.platform === "X" ||
    source.platform === "Instagram" ||
    source.platform === "TikTok" ||
    source.category === "Founder Social" ||
    source.category === "Company Social";

  if (isWebsiteOrBlog) {
    return "Can be fetched later. For now, paste website or blog copy manually.";
  }

  if (isSocial) {
    return "Needs platform API access. For now, paste social content manually.";
  }

  if (urlType === "Document URL" || source.platform === "Document") {
    return "Needs document import later. For now, paste document excerpts manually.";
  }

  return "Manual reference only for now. Paste source content manually.";
}
