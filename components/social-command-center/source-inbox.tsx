"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnalysisBlock, Pill } from "@/components/social-command-center/common-ui";
import { FieldLabel } from "@/components/social-command-center/field-label";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { readJsonResponse } from "@/lib/http-helpers";
import { currentCheckedAt } from "@/lib/library-source-utils";
import { mediaTypeFromFile, readFileAsDataUrl } from "@/lib/media-utils";
import { metricsHaveValues } from "@/lib/performance-metrics";
import { profileSourceKindForUrl } from "@/lib/profile-source-utils";
import { createPersonalitySummary } from "@/lib/profile-voice-analysis";
import { inferProfileSourcePlatform } from "@/lib/source-platforms";
import { truncateText, uniqueStrings } from "@/lib/text-utils";
import { cn } from "@/lib/utils";
import { platforms } from "@/lib/mock-data";
import {
  saveApprovedPostToSupabase,
  saveCampaignToSupabase,
  savePostQueueItemToSupabase,
  type StorageMode
} from "@/lib/supabase/persistence";
import type {
  ActivityLogItem,
  ApprovedPostMemory,
  BrandSafetyCheck,
  Campaign,
  CampaignMediaContext,
  FeedbackMemoryItem,
  FeedbackMemorySourceType,
  GeneratedPost,
  IntakeClassification,
  IntakeDestination,
  IntakeStatus,
  KnowledgeDocument,
  LibrarySource,
  LibrarySourceAnalysis,
  MediaAsset,
  Opportunity,
  OpportunityPlatform,
  OpportunityType,
  Platform,
  PostQueueItem,
  Profile,
  ProfileSourceKind,
  ProfileSourcePlatform,
  ProfileSourceType,
  ProfileType,
  ProfileVoiceAnalysis,
  ProfileVoiceExample,
  ProfileVoiceSource,
  SourceCapture,
  SourceInboxHistoryItem
} from "@/lib/types";

type Screen =
  | "Dashboard"
  | "Source Inbox"
  | "Opportunity Inbox"
  | "Profiles"
  | "Company Knowledge"
  | "Media Library"
  | "Brand Voice Rules"
  | "New Campaign"
  | "Repurpose"
  | "Content Library"
  | "Ready to Post"
  | "Content Calendar"
  | "Review Drafts"
  | "Analytics"
  | "Connections";

const profileSourceTypes: ProfileSourceType[] = [
  "internal voice",
  "company account",
  "inspiration/reference",
  "competitor/market watch",
  "audience/persona"
];

const maxAiImageUploadBytes = 2_500_000;

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]) {
  const seen = new Set(primary.map((item) => item.id));
  return [...primary, ...fallback.filter((item) => !seen.has(item.id))];
}

function createLibrarySourceAnalysis(
  source: Pick<LibrarySource, "name" | "category" | "platform" | "urls" | "content" | "notes">
): LibrarySourceAnalysis {
  const content = [source.content, source.notes].filter(Boolean).join("\n");
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, 6);
  const hasUrl = /https?:\/\//i.test(source.urls);
  const isWebsite = source.category === "Website" || source.platform === "Website";
  const isSocial = source.category === "Founder Social" || source.category === "Company Social";
  const isTranscript = /transcript|notes|conversation|founder|sales|product/i.test(source.category);

  return {
    voiceTraits: isTranscript
      ? "Source-close, conversational, useful for founder language and customer pain"
      : isSocial
        ? "Conversational, timely, platform-aware"
        : isWebsite
          ? "Structured, product-specific, source-grounded"
          : "Grounded, specific, useful",
    commonTopics: lines.length ? lines.slice(0, 3).join("; ") : source.category,
    repeatedPhrases: lines.length ? lines.slice(0, 2).join("; ") : "Review source for reusable language.",
    strongHooks: hasUrl ? "The page says...; The clearest proof point is..." : "Start with the concrete problem or insight.",
    proofPoints: "Review before using as public proof.",
    avoid: "Avoid unsupported claims, sensitive details, scraping assumptions, and generic filler.",
    bestUseCases: `${source.name} is best for ${source.category.toLowerCase()} context and content planning.`,
    keyThemes: lines.slice(0, 5),
    usefulPhrases: lines.slice(0, 4),
    productClaims: isWebsite ? ["Review claims before public use."] : undefined,
    postIdeas: isSocial ? ["Turn this source into a platform-native post idea."] : undefined,
    safetyNotes: ["Needs review before automatic generation."]
  };
}

type IntakeInputType =
  | "URL"
  | "Pasted text"
  | "Document"
  | "Screenshot"
  | "Media"
  | "Raw post idea";

type BrowserCapturePayload = {
  url?: string;
  title?: string;
  text?: string;
  capturedAt?: string;
};

type IntakeView = "Classify Source" | "Browser Captures" | "Import Past Content" | "History";

type BulkImportMethod = "Paste" | "CSV" | "TXT / Markdown" | "JSON";
type BulkImportDestination =
  | "Content Library"
  | "Profile Voice Source"
  | "Approved examples"
  | "Company Knowledge"
  | "Feedback Memory"
  | "Manual review";
type BulkImportSourceType =
  | "Conduit company post"
  | "Founder post"
  | "Inspiration/reference post"
  | "Competitor/market watch"
  | "Customer/audience language"
  | "Past performance data"
  | "Other";
type BulkImportStage = "Add content" | "Analyze and review" | "Confirm save" | "Saved";

type BulkImportItem = {
  id: string;
  platform: Platform;
  postCopy: string;
  date?: string;
  author?: string;
  postingAccount?: string;
  url?: string;
  notes?: string;
  status?: string;
  metrics: NonNullable<PostQueueItem["metrics"]>;
  sourceType: BulkImportSourceType;
  destination: BulkImportDestination;
  selected: boolean;
  confidence: "Low" | "Medium" | "High";
  flags: string[];
  analysisGeneratedBy?: "AI" | "Fallback";
  aiSuggestedDestination?: BulkImportDestination;
  influence?: "facts / claims" | "voice / style" | "pattern-only inspiration" | "performance history" | "manual review";
  toneTraits?: string[];
  hookPatterns?: string[];
  contentAngle?: string;
  riskNotes?: string[];
  suggestedProfile?: string;
  suggestedTags?: string[];
  engagementRate?: number;
};

const browserCaptureStorageKey = "scc.browserCapturePayload";


function inferOpportunityPlatform(value: string, detected?: IntakeClassification["detectedPlatform"]): OpportunityPlatform {
  if (detected && platforms.includes(detected as Platform)) return detected as Platform;
  const lower = value.toLowerCase();
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "X";
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("http")) return "Website";
  return "Other";
}

function isSocialCaptureUrl(value = "") {
  const lower = value.toLowerCase();
  return ["linkedin.com", "x.com", "twitter.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be"].some((domain) =>
    lower.includes(domain)
  );
}

function isLikelyMediaUrl(value = "") {
  return /\.(png|jpe?g|webp|gif|mp4|mov|webm|mp3|wav|m4a)(\?|#|$)/i.test(value);
}

function likelyCaptureDestination(capture: BrowserCapturePayload): IntakeDestination {
  const url = capture.url ?? "";
  const selectedText = capture.text?.trim() ?? "";
  const title = capture.title?.trim() ?? "";
  const combined = `${url} ${title} ${selectedText}`.toLowerCase();

  if (isLikelyMediaUrl(url)) return "Media Library";
  if (isSocialCaptureUrl(url)) {
    if (/reply|comment|mention|shoutout|question|thread|post/.test(combined)) return "Opportunity Inbox";
    return "Profile Voice Source";
  }
  if (!url && selectedText) {
    return selectedText.length > 280 ? "Company Knowledge" : "Create Post / Content Brief";
  }
  if (/news|article|trend|competitor|customer|mention|reply/.test(combined)) return "Opportunity Inbox";
  return "Company Knowledge";
}

function captureDestinationReason(capture: BrowserCapturePayload) {
  const url = capture.url ?? "";
  if (isLikelyMediaUrl(url)) return "This looks like a direct media URL, so Media Library is a likely destination.";
  if (isSocialCaptureUrl(url)) {
    return "This is a social URL. It can be saved and triaged, but the app will not scrape it automatically.";
  }
  if (url) return "This looks like a website, article, or page URL that can be classified into the Conduit Brain workflow.";
  return "Selected text without a URL is best treated as a note, idea, or manual review item.";
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];
    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeImportHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function valueFromFlexibleRow(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const match = Object.entries(row).find(([rowKey]) => normalizeImportHeader(rowKey) === normalizeImportHeader(key));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function platformFromImportValue(value = "", fallbackText = ""): Platform {
  const haystack = `${value} ${fallbackText}`.toLowerCase();
  if (haystack.includes("instagram")) return "Instagram";
  if (haystack.includes("tiktok")) return "TikTok";
  if (haystack.includes("twitter") || /\bx\b/.test(haystack)) return "X";
  return "LinkedIn";
}

function numberFromImport(value = "") {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferBulkSourceType(item: Pick<BulkImportItem, "author" | "postingAccount" | "notes" | "url" | "postCopy">): BulkImportSourceType {
  const haystack = `${item.author ?? ""} ${item.postingAccount ?? ""} ${item.notes ?? ""} ${item.url ?? ""} ${item.postCopy}`.toLowerCase();
  if (/competitor|market watch/.test(haystack)) return "Competitor/market watch";
  if (/inspiration|reference|creator|brand we like/.test(haystack)) return "Inspiration/reference post";
  if (/customer|audience|buyer|persona/.test(haystack)) return "Customer/audience language";
  if (/danny|sahil|founder/.test(haystack)) return "Founder post";
  if (/impression|likes|comments|shares|metrics|performance/.test(haystack)) return "Past performance data";
  return "Conduit company post";
}

function destinationForBulkSourceType(sourceType: BulkImportSourceType): BulkImportDestination {
  if (sourceType === "Founder post" || sourceType === "Inspiration/reference post" || sourceType === "Competitor/market watch" || sourceType === "Customer/audience language") {
    return "Profile Voice Source";
  }
  return "Content Library";
}

function flagsForBulkImportItem(item: Pick<BulkImportItem, "postCopy" | "metrics" | "sourceType">) {
  const flags: string[] = [];
  if (item.postCopy.length < 20) flags.push("Short content");
  if (/confidential|private|customer name|nda|secret|password|credential/i.test(item.postCopy)) flags.push("Sensitive / risky");
  if (Object.values(item.metrics).some((value) => Number(value ?? 0) > 0)) flags.push("Metrics included");
  if (item.sourceType === "Inspiration/reference post" || item.sourceType === "Competitor/market watch") flags.push("Pattern-only");
  return flags;
}

function bulkImportHasMetrics(item: BulkImportItem) {
  return Object.values(item.metrics).some((value) => Number(value ?? 0) > 0);
}

function bulkImportIsRisky(item: BulkImportItem) {
  return item.destination === "Manual review" || item.flags.some((flag) => /risk|sensitive|claim/i.test(flag)) || (item.riskNotes?.length ?? 0) > 0;
}

function bulkImportIsPatternOnly(item: BulkImportItem) {
  return item.sourceType === "Inspiration/reference post" || item.sourceType === "Competitor/market watch" || item.influence === "pattern-only inspiration";
}

function bulkImportIsVoice(item: BulkImportItem) {
  return item.sourceType === "Founder post" || item.sourceType === "Conduit company post" || item.destination === "Profile Voice Source";
}

function countBulkDestinations(items: BulkImportItem[]) {
  return {
    contentLibrary: items.filter((item) => item.destination === "Content Library" || item.destination === "Approved examples").length,
    profileVoice: items.filter((item) => item.destination === "Profile Voice Source").length,
    approvedExamples: items.filter((item) => item.destination === "Approved examples").length,
    companyKnowledge: items.filter((item) => item.destination === "Company Knowledge").length,
    feedbackMemory: items.filter((item) => item.destination === "Feedback Memory").length,
    manualReview: items.filter((item) => item.destination === "Manual review").length,
    metrics: items.filter(bulkImportHasMetrics).length
  };
}

function bulkItemFromRow(row: Record<string, string>, index: number): BulkImportItem {
  const postCopy = valueFromFlexibleRow(row, ["post copy", "post_copy", "caption", "content", "copy", "text", "body"]) || Object.values(row).find(Boolean) || "";
  const platform = platformFromImportValue(valueFromFlexibleRow(row, ["platform", "channel"]), postCopy);
  const metrics = {
    impressions: numberFromImport(valueFromFlexibleRow(row, ["impressions", "views"])),
    likes: numberFromImport(valueFromFlexibleRow(row, ["likes", "reactions"])),
    comments: numberFromImport(valueFromFlexibleRow(row, ["comments", "replies"])),
    shares: numberFromImport(valueFromFlexibleRow(row, ["shares", "reposts", "repost"])),
    saves: numberFromImport(valueFromFlexibleRow(row, ["saves", "bookmarks"])),
    clicks: numberFromImport(valueFromFlexibleRow(row, ["clicks", "link clicks"]))
  };
  const base = {
    author: valueFromFlexibleRow(row, ["author", "profile", "creator"]),
    postingAccount: valueFromFlexibleRow(row, ["posting account", "account", "profile", "author"]),
    notes: valueFromFlexibleRow(row, ["notes", "note"]),
    url: valueFromFlexibleRow(row, ["url", "link", "permalink"])
  };
  const sourceType = inferBulkSourceType({ ...base, postCopy });
  const item = {
    id: `bulk-${Date.now()}-${index}`,
    platform,
    postCopy,
    date: valueFromFlexibleRow(row, ["date", "created_at", "posted at", "posted_at"]),
    status: valueFromFlexibleRow(row, ["status"]),
    metrics,
    sourceType,
    destination: destinationForBulkSourceType(sourceType),
    selected: Boolean(postCopy.trim()),
    confidence: postCopy.length > 80 ? "High" : postCopy.length > 25 ? "Medium" : "Low",
    flags: [] as string[],
    ...base
  } satisfies BulkImportItem;
  return { ...item, flags: flagsForBulkImportItem(item) };
}

function parseBulkImportText(value: string, method: BulkImportMethod, defaultSourceType: BulkImportSourceType): BulkImportItem[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (method === "JSON") {
    try {
      const parsed = JSON.parse(trimmed);
      const rows: unknown[] = Array.isArray(parsed)
        ? parsed
        : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { posts?: unknown[] }).posts)
          ? (parsed as { posts: unknown[] }).posts
          : [parsed];
      return rows.map((row, index) => {
        const record = typeof row === "object" && row !== null
          ? Object.fromEntries(Object.entries(row).map(([key, entry]) => [key, String(entry ?? "")]))
          : { content: String(row ?? "") };
        return bulkItemFromRow(record, index);
      });
    } catch {
      return [];
    }
  }
  if (method === "CSV") {
    const rows = parseCsvRows(trimmed);
    if (rows.length === 0) return [];
    const headers = rows[0].map((header) => header.trim());
    return rows.slice(1).map((row, index) => bulkItemFromRow(Object.fromEntries(headers.map((header, headerIndex) => [header, row[headerIndex] ?? ""])), index)).filter((item) => item.postCopy.trim());
  }
  return trimmed
    .split(/\n\s*\n+/)
    .map((chunk, index) => {
      const item = bulkItemFromRow({
        platform: platformFromImportValue("", chunk),
        content: chunk.trim(),
        url: chunk.match(/https?:\/\/\S+/)?.[0] ?? "",
        notes: method === "TXT / Markdown" ? "Imported from TXT/Markdown." : "Imported from pasted text."
      }, index);
      return {
        ...item,
        sourceType: defaultSourceType,
        destination: destinationForBulkSourceType(defaultSourceType),
        flags: flagsForBulkImportItem({ ...item, sourceType: defaultSourceType })
      };
    })
    .filter((item) => item.postCopy.trim());
}

function createProfileVoiceAnalysisFromImports(items: BulkImportItem[]): ProfileVoiceAnalysis {
  const text = items.map((item) => item.postCopy).join("\n\n");
  const hooks = text.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 8 && line.length < 120).slice(0, 3);
  const topics = ["factory automation", "operations", "robots", "manufacturing", "deployment", "customer proof"].filter((topic) => text.toLowerCase().includes(topic.split(" ")[0]));
  return {
    toneTraits: ["Direct", "Practical", items.some((item) => item.sourceType === "Founder post") ? "Founder-led" : "Clear"],
    sentenceStyle: [text.length / Math.max(items.length, 1) > 400 ? "Longer explanatory captions" : "Concise platform-native posts"],
    hookPatterns: hooks.length > 0 ? hooks : ["Specific first line, then practical detail"],
    commonTopics: topics.length > 0 ? topics : ["Operations", "Industrial automation", "Company updates"],
    repeatedPhrases: [],
    phrasesToAvoid: ["Do not copy wording directly", "Avoid unsupported claims from imported examples"],
    formattingHabits: [items.some((item) => item.postCopy.includes("\n")) ? "Line breaks between ideas" : "Compact single-block captions"],
    postStructures: ["Hook, operational context, useful takeaway, light CTA"],
    imitate: ["Cadence, structure, specificity, and topic framing"],
    doNotCopy: ["Exact wording", "External facts", "Customer claims without approval"],
    platformPatterns: uniqueStrings(items.map((item) => item.platform)),
    confidenceLevel: items.length >= 6 ? "High" : items.length >= 3 ? "Medium" : "Low"
  };
}

function sourceDomainFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function detectedPlatformFromUrl(value = "") {
  const lower = value.toLowerCase();
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "X";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube";
  if (lower.startsWith("http")) return "Website";
  return "Other";
}

function captureFromPayload(payload: BrowserCapturePayload): SourceCapture {
  const now = new Date().toISOString();
  const url = payload.url?.trim() ?? "";
  const title = payload.title?.trim() || sourceDomainFromUrl(url) || "Browser capture";
  return {
    id: `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    url,
    selectedText: payload.text?.trim() ?? "",
    capturedAt: payload.capturedAt || now,
    sourceDomain: sourceDomainFromUrl(url),
    detectedPlatform: detectedPlatformFromUrl(url),
    status: "New",
    createdAt: now,
    updatedAt: now
  };
}


function sourceTypeDefaultsPatternOnly(type: ProfileSourceType) {
  return (
    type === "inspiration/reference" ||
    type === "competitor/market watch" ||
    type === "audience/persona"
  );
}



function runFallbackBrandSafetyCheck(content: string): BrandSafetyCheck {
  const notes: string[] = [];
  const lower = content.toLowerCase();
  if (/guarantee|always|eliminate|revolutionize|cutting-edge|game-changing/.test(lower)) notes.push("Claim or hype language may need review.");
  if (/customer|client|confidential|private|nda/.test(lower)) notes.push("Customer detail may need approval.");
  return {
    status: notes.length > 0 ? "Needs review" : "Safe",
    notes,
    checkedAt: new Date().toISOString(),
    source: "Fallback"
  };
}

export function SourceInbox({
  initialView,
  campaigns,
  setCampaigns,
  approvedPosts,
  setApprovedPosts,
  postQueue,
  setPostQueue,
  feedbackMemory,
  captureFeedbackMemory,
  storageMode,
  profiles,
  setProfiles,
  persistProfile,
  opportunities,
  setOpportunities,
  persistOpportunity,
  librarySources,
  setLibrarySources,
  persistLibrarySource,
  mediaAssets,
  setMediaAssets,
  persistMediaAsset,
  history,
  setHistory,
  captures,
  setCaptures,
  persistSourceCapture,
  removeSourceCapture,
  recordActivity,
  setScreen,
  setCampaignName,
  setIntent,
  setIdea,
  setMediaContext,
  setMediaPreviewUrl,
  setSelectedProfileId
}: {
  initialView?: IntakeView;
  campaigns: Campaign[];
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>;
  approvedPosts: ApprovedPostMemory[];
  setApprovedPosts: Dispatch<SetStateAction<ApprovedPostMemory[]>>;
  postQueue: PostQueueItem[];
  setPostQueue: Dispatch<SetStateAction<PostQueueItem[]>>;
  feedbackMemory: FeedbackMemoryItem[];
  captureFeedbackMemory: (input: {
    sourceType: FeedbackMemorySourceType;
    platform?: Platform;
    postingAccountId?: string;
    postingAccountName?: string;
    originalContent?: string;
    revisedContent?: string;
    feedbackText?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  storageMode: StorageMode;
  profiles: Profile[];
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  persistProfile: (profile: Profile) => void;
  opportunities: Opportunity[];
  setOpportunities: (items: Opportunity[] | ((current: Opportunity[]) => Opportunity[])) => void;
  persistOpportunity: (opportunity: Opportunity) => void;
  librarySources: LibrarySource[];
  setLibrarySources: Dispatch<SetStateAction<LibrarySource[]>>;
  persistLibrarySource: (source: LibrarySource) => void;
  mediaAssets: MediaAsset[];
  setMediaAssets: Dispatch<SetStateAction<MediaAsset[]>>;
  persistMediaAsset: (asset: MediaAsset, file?: File | null) => Promise<MediaAsset>;
  history: SourceInboxHistoryItem[];
  setHistory: Dispatch<SetStateAction<SourceInboxHistoryItem[]>>;
  captures: SourceCapture[];
  setCaptures: Dispatch<SetStateAction<SourceCapture[]>>;
  persistSourceCapture: (capture: SourceCapture) => void;
  removeSourceCapture: (captureId: string) => void;
  recordActivity: (input: Omit<ActivityLogItem, "id" | "createdAt" | "userEmail" | "workspaceName">) => ActivityLogItem;
  setScreen: (screen: Screen) => void;
  setCampaignName: (value: string) => void;
  setIntent: (value: string) => void;
  setIdea: (value: string) => void;
  setMediaContext: (value: CampaignMediaContext) => void;
  setMediaPreviewUrl: (value: string) => void;
  setSelectedProfileId: (value: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [inputType, setInputType] = useState<IntakeInputType>("URL");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [classification, setClassification] = useState<IntakeClassification | null>(null);
  const [destination, setDestination] = useState<IntakeDestination>("Company Knowledge");
  const [selectedProfileForSource, setSelectedProfileForSource] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [profileSourceType, setProfileSourceType] = useState<ProfileSourceType>("internal voice");
  const [patternOnly, setPatternOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [browserCapture, setBrowserCapture] = useState<BrowserCapturePayload | null>(null);
  const [intakeView, setIntakeView] = useState<IntakeView>(initialView ?? "Classify Source");
  const [activeCaptureId, setActiveCaptureId] = useState("");
  const [bulkImportMethod, setBulkImportMethod] = useState<BulkImportMethod>("Paste");
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportFileName, setBulkImportFileName] = useState("");
  const [bulkDefaultSourceType, setBulkDefaultSourceType] = useState<BulkImportSourceType>("Conduit company post");
  const [bulkDefaultDestination, setBulkDefaultDestination] = useState<BulkImportDestination>("Content Library");
  const [bulkProfileId, setBulkProfileId] = useState("");
  const [bulkCreateProfileName, setBulkCreateProfileName] = useState("");
  const [bulkAnalyzeVoice, setBulkAnalyzeVoice] = useState(true);
  const [bulkMarkApproved, setBulkMarkApproved] = useState(true);
  const [bulkAddFeedbackMemory, setBulkAddFeedbackMemory] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkImportItem[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false);
  const [bulkImportStage, setBulkImportStage] = useState<BulkImportStage>("Add content");
  const [bulkExpandedItems, setBulkExpandedItems] = useState<string[]>([]);
  const [bulkApplyDestination, setBulkApplyDestination] = useState<BulkImportDestination>("Content Library");
  const [bulkLastSavedSummary, setBulkLastSavedSummary] = useState<ReturnType<typeof countBulkDestinations> | null>(null);
  const [routedResult, setRoutedResult] = useState<{
    destination: IntakeDestination;
    title: string;
    status: IntakeStatus;
    summary: string;
    detail: string;
    recordId?: string;
    destinationScreen?: Screen;
  } | null>(null);
  const bookmarkletHref = useMemo(() => {
    const appOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const captureUrl = `${appOrigin}/capture`;
    return `javascript:(()=>{const u=encodeURIComponent(location.href);const t=encodeURIComponent(document.title||'');const s=encodeURIComponent(String(getSelection&&getSelection()||''));const ts=encodeURIComponent(new Date().toISOString());window.open('${captureUrl}?url='+u+'&title='+t+'&text='+s+'&capturedAt='+ts,'_blank','noopener,noreferrer');})();`;
  }, []);

  useEffect(() => {
    if (initialView) setIntakeView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const queryCapture: BrowserCapturePayload | null = searchParams.get("capture")
      ? {
          url: searchParams.get("url") ?? "",
          title: searchParams.get("title") ?? "",
          text: searchParams.get("text") ?? "",
          capturedAt: searchParams.get("capturedAt") ?? new Date().toISOString()
        }
      : null;
    const rawCapture = window.sessionStorage.getItem(browserCaptureStorageKey);
    if (!rawCapture && !queryCapture) return;

    try {
      const parsedCapture = queryCapture ?? JSON.parse(rawCapture || "{}") as BrowserCapturePayload;
      const safeTitle = parsedCapture.title?.trim() || "Browser capture";
      const safeUrl = parsedCapture.url?.trim() ?? "";
      const safeText = parsedCapture.text?.trim() ?? "";
      const likelyDestination = likelyCaptureDestination(parsedCapture);
      const nextCapture = captureFromPayload(parsedCapture);

      setBrowserCapture(parsedCapture);
      setCaptures((current) => {
        const alreadyCaptured = current.some((capture) =>
          capture.url === nextCapture.url &&
          capture.selectedText === nextCapture.selectedText &&
          Math.abs(new Date(capture.capturedAt).getTime() - new Date(nextCapture.capturedAt).getTime()) < 5000
        );
        return alreadyCaptured ? current : [nextCapture, ...current];
      });
      persistSourceCapture(nextCapture);
      recordActivity({
        actionType: "Source captured",
        objectType: "Capture",
        objectId: nextCapture.id,
        title: "Source captured",
        summary: `${safeTitle} was added to Intake captures.`,
        destination: "Intake",
        status: "success"
      });
      setInputType(safeUrl ? "URL" : safeText ? "Pasted text" : "URL");
      setTitle(safeTitle);
      setUrl(safeUrl);
      setText(safeText);
      setNotes(safeText ? `Captured selected text:\n${safeText}` : "");
      setDestination(likelyDestination);
      setIntakeView("Browser Captures");
      setStatus("Captured from browser. Review and classify this source.");
      if (queryCapture) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      setError("Could not read the browser capture. Try the bookmarklet again.");
    } finally {
      window.sessionStorage.removeItem(browserCaptureStorageKey);
    }
  }, [persistSourceCapture, recordActivity, setCaptures]);

  function resetIntake() {
    setTitle("");
    setInputType("URL");
    setUrl("");
    setText("");
    setNotes("");
    setTags("");
    setFile(null);
    setClassification(null);
    setDestination("Company Knowledge");
    setSelectedProfileForSource("");
    setNewProfileName("");
    setProfileSourceType("internal voice");
    setPatternOnly(false);
    setStatus("");
    setError("");
    setBrowserCapture(null);
    setActiveCaptureId("");
    setRoutedResult(null);
  }

  async function handleBulkImportFile(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension === "csv") setBulkImportMethod("CSV");
    else if (extension === "json") setBulkImportMethod("JSON");
    else setBulkImportMethod("TXT / Markdown");
    setBulkImportFileName(file.name);
    setBulkImportText(await file.text());
    setBulkMessage(`${file.name} loaded. Review parsed items before importing.`);
  }

  function parseBulkImport() {
    const parsed = parseBulkImportText(bulkImportText, bulkImportMethod, bulkDefaultSourceType)
      .map((item) => ({
        ...item,
        sourceType: item.sourceType || bulkDefaultSourceType,
        destination: bulkDefaultDestination
      }));
    setBulkItems(parsed);
    setBulkImportStage(parsed.length > 0 ? "Analyze and review" : "Add content");
    setBulkLastSavedSummary(null);
    setBulkMessage(
      parsed.length > 0
        ? `Parsed ${parsed.length} item${parsed.length === 1 ? "" : "s"}. Review destinations before saving.`
        : "No importable posts found. For pasted text, separate posts with blank lines. For CSV, include a post copy or caption column."
    );
    recordActivity({
      actionType: "Bulk import started",
      objectType: "Past Content Import",
      title: "Bulk import parsed",
      summary: `Parsed ${parsed.length} item${parsed.length === 1 ? "" : "s"} from ${bulkImportMethod}.`,
      destination: "Intake",
      status: parsed.length > 0 ? "success" : "warning"
    });
  }

  function updateBulkItem(id: string, updates: Partial<BulkImportItem>) {
    setBulkItems((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  function applyBulkDestinationToSelected() {
    setBulkItems((current) => current.map((item) => item.selected ? { ...item, destination: bulkApplyDestination } : item));
    setBulkMessage(`Applied ${bulkApplyDestination} to selected import rows.`);
  }

  function saveHighConfidenceBulkItems() {
    setBulkItems((current) => current.map((item) => ({
      ...item,
      selected: item.confidence === "High" && !bulkImportIsRisky(item)
    })));
    setBulkImportStage("Confirm save");
    setBulkMessage("Selected high-confidence, non-risky items. Review the final save summary before routing.");
  }

  function sendRiskyBulkItemsToManualReview() {
    setBulkItems((current) => current.map((item) => bulkImportIsRisky(item) ? { ...item, destination: "Manual review", selected: true } : item));
    setBulkMessage("Risky or sensitive items were selected and routed to Manual review.");
  }

  function markBulkInspirationPatternOnly() {
    setBulkItems((current) => current.map((item) => bulkImportIsPatternOnly(item) ? {
      ...item,
      destination: item.destination === "Manual review" ? "Manual review" : "Profile Voice Source",
      flags: Array.from(new Set([...item.flags, "Pattern-only"])),
      influence: "pattern-only inspiration"
    } : item));
    setBulkMessage("Inspiration and competitor rows are marked pattern-only and routed to Profile Voice Source unless they need review.");
  }

  function toggleBulkItemExpanded(id: string) {
    setBulkExpandedItems((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  async function analyzeBulkImport() {
    const selected = bulkItems.filter((item) => item.selected && item.postCopy.trim());
    if (selected.length === 0) {
      setBulkMessage("Select at least one parsed item to analyze.");
      return;
    }
    setIsAnalyzingImport(true);
    setBulkMessage("");
    try {
      const response = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((item) => ({
            id: item.id,
            platform: item.platform,
            postCopy: item.postCopy,
            date: item.date,
            author: item.author,
            postingAccount: item.postingAccount,
            url: item.url,
            notes: item.notes,
            status: item.status,
            sourceType: item.sourceType,
            metrics: item.metrics
          }))
        })
      });
      const payload = await response.json() as {
        ok?: boolean;
        generatedBy?: "AI" | "Fallback";
        error?: string;
        analysis?: {
          items?: Array<{
            id: string;
            detectedPlatform?: Platform;
            likelySourceType?: BulkImportSourceType;
            recommendedDestination?: BulkImportDestination;
            influence?: BulkImportItem["influence"];
            toneTraits?: string[];
            hookPatterns?: string[];
            contentAngle?: string;
            claimRiskNotes?: string[];
            suggestedProfile?: string;
            suggestedTags?: string[];
            shouldSaveAsApprovedExample?: boolean;
            engagementRate?: number;
            confidence?: BulkImportItem["confidence"];
          }>;
          topPerformingItemIds?: string[];
          overallNotes?: string[];
        };
      };
      const analyses = new Map((payload.analysis?.items ?? []).map((analysis) => [analysis.id, analysis]));
      const topPerforming = new Set(payload.analysis?.topPerformingItemIds ?? []);
      setBulkItems((current) => current.map((item) => {
        const analysis = analyses.get(item.id);
        if (!analysis) return item;
        const riskNotes = analysis.claimRiskNotes ?? [];
        const sourceType = analysis.likelySourceType ?? item.sourceType;
        const destination = riskNotes.length > 0 && riskNotes.some((note) => /sensitive|confidential|risky|review/i.test(note))
          ? "Manual review"
          : analysis.recommendedDestination ?? item.destination;
        const nextFlags = Array.from(new Set([
          ...flagsForBulkImportItem({ ...item, sourceType }),
          ...(analysis.shouldSaveAsApprovedExample ? ["Approved example candidate"] : []),
          ...(topPerforming.has(item.id) ? ["Top performer"] : []),
          ...(analysis.influence === "pattern-only inspiration" ? ["Pattern-only"] : []),
          ...(riskNotes.length > 0 ? ["Claim/risk notes"] : [])
        ]));
        return {
          ...item,
          platform: analysis.detectedPlatform ?? item.platform,
          sourceType,
          destination,
          aiSuggestedDestination: analysis.recommendedDestination,
          analysisGeneratedBy: payload.generatedBy === "AI" ? "AI" : "Fallback",
          influence: analysis.influence ?? item.influence,
          toneTraits: analysis.toneTraits ?? item.toneTraits,
          hookPatterns: analysis.hookPatterns ?? item.hookPatterns,
          contentAngle: analysis.contentAngle ?? item.contentAngle,
          riskNotes,
          suggestedProfile: analysis.suggestedProfile ?? item.suggestedProfile,
          suggestedTags: analysis.suggestedTags ?? item.suggestedTags,
          engagementRate: analysis.engagementRate ?? item.engagementRate,
          confidence: analysis.confidence ?? item.confidence,
          flags: nextFlags
        };
      }));
      const generatedBy = payload.generatedBy === "AI" ? "AI" : "Fallback";
      setBulkImportStage("Analyze and review");
      setBulkMessage(
        generatedBy === "AI"
          ? `AI analyzed ${analyses.size} import item${analyses.size === 1 ? "" : "s"}. Review suggested routing before saving.`
          : "AI analysis unavailable. Using deterministic import suggestions."
      );
      recordActivity({
        actionType: generatedBy === "AI" ? "Import analyzed" : "Import analysis failed",
        objectType: "Past Content Import",
        title: generatedBy === "AI" ? "Import analyzed" : "Import analyzed with fallback",
        summary: generatedBy === "AI"
          ? `AI analyzed ${analyses.size} imported item${analyses.size === 1 ? "" : "s"}.`
          : "AI analysis unavailable. Deterministic import suggestions were applied.",
        destination: "Intake",
        status: generatedBy === "AI" ? "success" : "warning"
      });
    } catch {
      setBulkMessage("AI analysis unavailable. Using deterministic import suggestions.");
      recordActivity({
        actionType: "Import analysis failed",
        objectType: "Past Content Import",
        title: "Import analysis failed",
        summary: "The import analysis route did not respond. Existing deterministic suggestions remain available.",
        destination: "Intake",
        status: "warning"
      });
    } finally {
      setIsAnalyzingImport(false);
    }
  }

  function getOrCreateBulkProfile(items: BulkImportItem[]) {
    const selected = profiles.find((profile) => profile.id === bulkProfileId);
    if (selected) return selected;
    const inferredName =
      bulkCreateProfileName.trim() ||
      items.find((item) => item.author || item.postingAccount)?.author ||
      items.find((item) => item.postingAccount)?.postingAccount ||
      (bulkDefaultSourceType === "Founder post" ? "Imported founder voice" : bulkDefaultSourceType === "Inspiration/reference post" ? "Imported inspiration profile" : "Imported content profile");
    const profileType: ProfileType =
      bulkDefaultSourceType === "Founder post"
        ? "Founder"
        : bulkDefaultSourceType === "Inspiration/reference post"
          ? "Inspiration / Reference"
          : bulkDefaultSourceType === "Competitor/market watch"
            ? "Competitor / Market Watch"
            : bulkDefaultSourceType === "Customer/audience language"
              ? "Customer / Audience Persona"
              : "Company Account";
    const now = currentCheckedAt();
    const profileBase: Omit<Profile, "personality"> = {
      id: `profile-import-${Date.now()}`,
      name: inferredName,
      type: profileType,
      role: profileType,
      bio: `Created from bulk import of ${items.length} past content item${items.length === 1 ? "" : "s"}.`,
      linkedInUrl: "",
      xUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      websiteUrl: "",
      otherUrls: "",
      examples: "",
      notes: "Imported from past content.",
      syncStatus: "Manual Only",
      lastChecked: now,
      avatarUrl: "",
      avatarStoragePath: "",
      whatWeLike: "Learn cadence, hooks, phrasing, and content patterns from imported examples.",
      patternsToLearn: "Use structure and style, not unsupported facts.",
      thingsNotToCopy: profileType === "Inspiration / Reference" || profileType === "Competitor / Market Watch" ? "Pattern-only. Do not copy wording, facts, claims, or identity." : "",
      voiceExamples: [],
      voiceSources: [],
      updatedAt: now
    };
    const profile = { ...profileBase, personality: createPersonalitySummary(profileBase) };
    setProfiles((current) => [profile, ...current]);
    persistProfile(profile);
    return profile;
  }

  function saveBulkProfileExamples(items: BulkImportItem[]) {
    if (items.length === 0) return;
    const profile = getOrCreateBulkProfile(items);
    const analysis = bulkAnalyzeVoice ? createProfileVoiceAnalysisFromImports(items) : undefined;
    const examples: ProfileVoiceExample[] = items.map((item, index) => ({
      id: `voice-example-import-${Date.now()}-${index}`,
      title: `${item.sourceType}: ${truncateText(item.postCopy.replace(/\s+/g, " "), 54)}`,
      platform: item.platform,
      content: item.postCopy,
      notes: [item.notes, item.url ? `Source URL: ${item.url}` : "", "Imported via Intake."].filter(Boolean).join("\n"),
      useAsVoice: true,
      patternOnly: item.sourceType === "Inspiration/reference post" || item.sourceType === "Competitor/market watch" || item.sourceType === "Customer/audience language",
      analysis,
      generatedBy: analysis ? "Fallback" : undefined,
      createdAt: item.date || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    const profileWithExamples: Profile = {
      ...profile,
      voiceExamples: [...examples, ...(profile.voiceExamples ?? [])],
      personality: createPersonalitySummary({
        ...profile,
        voiceExamples: [...examples, ...(profile.voiceExamples ?? [])]
      }),
      updatedAt: currentCheckedAt()
    };
    setProfiles((current) => mergeById([profileWithExamples], current));
    persistProfile(profileWithExamples);
    setSelectedProfileId(profileWithExamples.id);
    recordActivity({
      actionType: "Profile examples imported",
      objectType: "Profile",
      objectId: profileWithExamples.id,
      title: "Profile examples imported",
      summary: `${examples.length} example${examples.length === 1 ? "" : "s"} imported into ${profileWithExamples.name}.`,
      destination: "Profiles",
      status: "success"
    });
  }

  function saveBulkContentItems(items: BulkImportItem[]) {
    const now = new Date().toISOString();
    const newCampaigns: Campaign[] = [];
    const newApprovedPosts: ApprovedPostMemory[] = [];
    const newQueueItems: PostQueueItem[] = [];
    const defaultProfile = profiles.find((profile) => /conduit/i.test(profile.name)) ?? profiles[0];

    items.forEach((item, index) => {
      const postId = `import-post-${Date.now()}-${index}`;
      const campaignId = `import-brief-${Date.now()}-${index}`;
      const safetyCheck = runFallbackBrandSafetyCheck(item.postCopy);
      const post: GeneratedPost = {
        id: postId,
        platform: item.platform,
        postCopy: item.postCopy,
        content: item.postCopy,
        status: bulkMarkApproved ? "approved" : "draft",
        score: item.flags.includes("Sensitive / risky") ? 60 : 82,
        generatedBy: "Mock",
        mediaUsed: false,
        profileId: defaultProfile?.id,
        profileName: item.postingAccount || item.author || defaultProfile?.name,
        profileType: defaultProfile?.type,
        rationale: "Imported past content. Use as history, approved example, or performance reference.",
        safetyCheck
      };
      const campaign: Campaign = {
        id: campaignId,
        name: item.status === "posted" || item.url ? `Imported posted content: ${truncateText(item.postCopy, 42)}` : `Imported content: ${truncateText(item.postCopy, 48)}`,
        idea: item.postCopy,
        intent: item.notes || "Imported past content.",
        contentAngle: "Other",
        campaignType: "Original",
        platforms: [item.platform],
        posts: [post],
        createdAt: item.date || new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date()),
        generatedBy: "Mock",
        profileId: defaultProfile?.id,
        profileName: item.postingAccount || item.author || defaultProfile?.name,
        profileType: defaultProfile?.type
      };
      newCampaigns.push(campaign);

      if (bulkMarkApproved || item.destination === "Approved examples") {
        newApprovedPosts.push({
          id: `approved-${postId}`,
          profileId: defaultProfile?.id || "imported-profile",
          campaignId,
          generatedPostId: postId,
          platform: item.platform,
          finalContent: item.postCopy,
          supportingFields: { safetyCheck, rationale: "Imported as a past approved example." },
          contentAngle: "Other",
          intent: item.notes,
          mediaUsed: false,
          createdAt: item.date || now
        });
      }

      if (Object.values(item.metrics).some((value) => Number(value ?? 0) > 0) || item.url || /posted/i.test(item.status ?? "")) {
        newQueueItems.push({
          id: `queue-${postId}`,
          contentType: "Post",
          profileId: defaultProfile?.id,
          profileName: item.postingAccount || item.author || defaultProfile?.name,
          campaignId,
          campaignName: campaign.name,
          generatedPostId: postId,
          platform: item.platform,
          contentAngle: "Other",
          intent: item.notes,
          content: item.postCopy,
          postCopy: item.postCopy,
          mediaUsed: false,
          livePostUrl: item.url,
          postedAt: item.date || now,
          publishNotes: item.notes,
          isSandbox: false,
          metrics: item.metrics,
          safetyCheck,
          status: "Posted",
          hiddenFromQueue: true,
          createdAt: item.date || now,
          updatedAt: now
        });
      }
    });

    setCampaigns((current) => [...newCampaigns, ...current]);
    setApprovedPosts((current) => mergeById(newApprovedPosts, current));
    setPostQueue((current) => mergeById(newQueueItems, current));
    if (storageMode === "supabase") {
      newCampaigns.forEach((campaign) => saveCampaignToSupabase(campaign).catch(() => undefined));
      newApprovedPosts.forEach((post) => saveApprovedPostToSupabase(post).catch(() => undefined));
      newQueueItems.forEach((item) => savePostQueueItemToSupabase(item).catch(() => undefined));
    }
    recordActivity({
      actionType: "Content items imported",
      objectType: "Past Content Import",
      title: "Content items imported",
      summary: `${newCampaigns.length} content item${newCampaigns.length === 1 ? "" : "s"} imported into Content Library.`,
      destination: "Content Library",
      status: "success"
    });
    if (newQueueItems.length > 0) {
      recordActivity({
        actionType: "Metrics imported",
        objectType: "Past Content Import",
        title: "Metrics imported",
        summary: `${newQueueItems.length} imported item${newQueueItems.length === 1 ? "" : "s"} included metrics or posted URLs for Analytics.`,
        destination: "Analytics",
        status: "success"
      });
    }
  }

  function saveBulkCompanyKnowledge(items: BulkImportItem[]) {
    const checkedAt = currentCheckedAt();
    const sources = items.map((item, index) => {
      const sourceBase: Omit<LibrarySource, "analysis"> = {
        id: `library-import-${Date.now()}-${index}`,
        name: item.author || item.postingAccount || `Imported content source - ${formatShortDate(checkedAt)}`,
        category: item.sourceType === "Customer/audience language" ? "Customer Story" : item.sourceType === "Founder post" ? "Founder Social" : "Company Social",
        platform: item.platform,
        urls: item.url || "",
        urlType: item.url ? "Social Post URL" : undefined,
        syncStatus: "Manual Only",
        lastChecked: checkedAt,
        content: item.postCopy,
        notes: [item.notes, "Imported via Intake. Review before treating as source-of-truth."].filter(Boolean).join("\n"),
        reviewStatus: "Needs review",
        tags: ["bulk import", item.sourceType],
        updatedAt: checkedAt
      };
      return { ...sourceBase, analysis: createLibrarySourceAnalysis(sourceBase) };
    });
    setLibrarySources((current) => [...sources, ...current]);
    sources.forEach(persistLibrarySource);
    recordActivity({
      actionType: "Content items imported",
      objectType: "Company Knowledge",
      title: "Company Knowledge import",
      summary: `${sources.length} imported item${sources.length === 1 ? "" : "s"} saved as review-needed Company Knowledge.`,
      destination: "Company Knowledge",
      status: "success"
    });
  }

  function importSelectedBulkItems() {
    const selected = bulkItems.filter((item) => item.selected && item.postCopy.trim());
    if (selected.length === 0) {
      setBulkMessage("Select at least one parsed item to import.");
      return;
    }
    const savedSummary = countBulkDestinations(selected);
    const byDestination = (destinationName: BulkImportDestination) =>
      selected.filter((item) => item.destination === destinationName);

    saveBulkContentItems([...byDestination("Content Library"), ...byDestination("Approved examples")]);
    saveBulkProfileExamples(byDestination("Profile Voice Source"));
    saveBulkCompanyKnowledge(byDestination("Company Knowledge"));
    byDestination("Feedback Memory").forEach((item) => {
      captureFeedbackMemory({
        sourceType: "approval",
        platform: item.platform,
        postingAccountName: item.postingAccount || item.author,
        revisedContent: item.postCopy,
        feedbackText: `Imported positive example: ${item.notes || item.sourceType}`,
        metadata: { source: "bulk import", sourceType: item.sourceType }
      });
    });
    if (bulkAddFeedbackMemory) {
      selected
        .filter((item) => item.destination !== "Feedback Memory")
        .forEach((item) => {
          captureFeedbackMemory({
            sourceType: "approval",
            platform: item.platform,
            postingAccountName: item.postingAccount || item.author,
            revisedContent: item.postCopy,
            feedbackText: `Imported as a positive historical example: ${item.notes || item.sourceType}`,
            metadata: { source: "bulk import", sourceType: item.sourceType }
          });
        });
    }
    byDestination("Manual review").forEach((item) => {
      remember({
        title: truncateText(item.postCopy, 64),
        destination: "Manual review only",
        status: "Needs review",
        actionTaken: "Imported past content saved for manual review."
      });
    });

    setBulkLastSavedSummary(savedSummary);
    setBulkImportStage("Saved");
    setBulkMessage(`Imported ${selected.length} item${selected.length === 1 ? "" : "s"}. Content history, profile examples, metrics, and review items were routed by destination.`);
    recordActivity({
      actionType: selected.some((item) => item.analysisGeneratedBy) ? "Import routed after analysis" : "Content items imported",
      objectType: "Past Content Import",
      title: "Bulk import complete",
      summary: `${selected.length} item${selected.length === 1 ? "" : "s"} imported from ${bulkImportFileName || bulkImportMethod}.`,
      destination: "Intake",
      status: "success"
    });
  }

  function updateCapture(captureId: string, updates: Partial<SourceCapture>) {
    let nextCapture: SourceCapture | undefined;
    setCaptures((current) => current.map((capture) => {
      if (capture.id !== captureId) return capture;
      nextCapture = {
        ...capture,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return nextCapture;
    }));
    if (nextCapture) persistSourceCapture(nextCapture);
  }

  function loadCaptureIntoForm(capture: SourceCapture) {
    const payload: BrowserCapturePayload = {
      url: capture.url,
      title: capture.title,
      text: capture.selectedText,
      capturedAt: capture.capturedAt
    };
    setActiveCaptureId(capture.id);
    setBrowserCapture(payload);
    setInputType(capture.url ? "URL" : capture.selectedText ? "Pasted text" : "URL");
    setTitle(capture.title);
    setUrl(capture.url);
    setText(capture.selectedText);
    setNotes(capture.selectedText ? `Captured selected text:\n${capture.selectedText}` : "");
    setDestination((capture.destination as IntakeDestination | undefined) ?? likelyCaptureDestination(payload));
    setClassification((capture.triage as IntakeClassification | undefined) ?? null);
    setRoutedResult(null);
    setError("");
    setStatus("Capture loaded. Review, triage, or route it.");
  }

  function simulateBrowserCapture() {
    const simulatedCapture: BrowserCapturePayload = {
      url: "https://conduit.inc/blog/factory-automation",
      title: "Factory automation note",
      text: "Conduit connects factory hardware, workflows, and operational systems so teams can move faster on the floor.",
      capturedAt: new Date().toISOString()
    };
    const nextCapture = captureFromPayload(simulatedCapture);
    const likelyDestination = likelyCaptureDestination(simulatedCapture);
    setBrowserCapture(simulatedCapture);
    setCaptures((current) => [nextCapture, ...current]);
    persistSourceCapture(nextCapture);
    recordActivity({
      actionType: "Source captured",
      objectType: "Capture",
      objectId: nextCapture.id,
      title: "Source captured",
      summary: `${nextCapture.title} was added to Intake captures.`,
      destination: "Intake",
      status: "success"
    });
    setActiveCaptureId(nextCapture.id);
    setInputType("URL");
    setTitle(simulatedCapture.title ?? "Browser capture");
    setUrl(simulatedCapture.url ?? "");
    setText(simulatedCapture.text ?? "");
    setNotes(`Captured selected text:\n${simulatedCapture.text}`);
    setDestination(likelyDestination);
    setClassification(null);
    setRoutedResult(null);
    setError("");
    setStatus("Test capture loaded. Review and classify this source.");
  }

  function triageCapture(capture: SourceCapture) {
    const payload: BrowserCapturePayload = {
      url: capture.url,
      title: capture.title,
      text: capture.selectedText,
      capturedAt: capture.capturedAt
    };
    const nextDestination = likelyCaptureDestination(payload);
    const nextTriage: IntakeClassification = {
      sourceKind: capture.detectedPlatform || "Browser capture",
      recommendedDestination: nextDestination,
      confidence: capture.url || capture.selectedText ? "Medium" : "Low",
      why: captureDestinationReason(payload),
      useAs:
        nextDestination === "Company Knowledge" ? "facts" :
        nextDestination === "Opportunity Inbox" ? "reply opportunity" :
        nextDestination === "Media Library" ? "media" :
        nextDestination === "Create Post / Content Brief" ? "post idea" :
        nextDestination === "Manual review only" ? "manual review" :
        "voice",
      influence:
        nextDestination === "Company Knowledge" ? ["facts / claims"] :
        nextDestination === "Opportunity Inbox" ? ["reply opportunity", "post idea"] :
        nextDestination === "Media Library" ? ["media asset"] :
        nextDestination === "Create Post / Content Brief" ? ["post idea"] :
        nextDestination === "Manual review only" ? ["manual review"] :
        ["voice / style"],
      recommendedNextAction: "Review this capture, then route it to the recommended destination.",
      status: "Classified",
      detectedPlatform: capture.detectedPlatform as IntakeClassification["detectedPlatform"],
      isSocial: isSocialCaptureUrl(capture.url),
      canFetchWebsite: Boolean(capture.url && !isSocialCaptureUrl(capture.url) && !isLikelyMediaUrl(capture.url))
    };
    updateCapture(capture.id, {
      status: "Triaged",
      triage: nextTriage,
      destination: nextDestination
    });
    loadCaptureIntoForm({
      ...capture,
      status: "Triaged",
      triage: nextTriage,
      destination: nextDestination
    });
    setClassification(nextTriage);
    setDestination(nextDestination);
  }

  function triageAllNewCaptures() {
    captures.filter((capture) => capture.status === "New").forEach(triageCapture);
  }

  function deleteCapture(capture: SourceCapture) {
    if (!window.confirm("Delete this capture permanently? This only removes the capture record and will not delete anything you already routed from it.")) {
      return;
    }
    removeSourceCapture(capture.id);
    recordActivity({
      actionType: "Capture deleted",
      objectType: "Capture",
      objectId: capture.id,
      title: "Capture deleted",
      summary: `${capture.title || "Browser capture"} was permanently removed from Intake captures.`,
      destination: "Intake",
      status: "success"
    });
    if (activeCaptureId === capture.id) {
      resetIntake();
    }
  }

  function prepareCaptureRoute(capture: SourceCapture, nextDestination: IntakeDestination) {
    loadCaptureIntoForm(capture);
    setDestination(nextDestination);
    setStatus(`Capture loaded. Confirm to save to ${nextDestination}.`);
  }

  function remember(item: Omit<SourceInboxHistoryItem, "id" | "createdAt">) {
    setHistory((current) => [{
      id: `intake-${Date.now()}`,
      createdAt: new Date().toISOString(),
      inputSummary: intakeInputSummary(),
      triage: classification ?? undefined,
      confidence: classification?.confidence,
      ...item
    }, ...current].slice(0, 20));
  }

  function intakeInputSummary() {
    if (url.trim()) return url.trim();
    if (text.trim()) return text.trim().slice(0, 220);
    if (file) return `${file.name} (${file.type || "file"})`;
    if (notes.trim()) return notes.trim().slice(0, 220);
    return "No input summary saved.";
  }

  function showRoutedSuccess(result: {
    destination: IntakeDestination;
    title: string;
    status: IntakeStatus;
    summary: string;
    detail: string;
    recordId?: string;
    destinationScreen?: Screen;
  }) {
    setRoutedResult(result);
    setStatus(result.summary);
    recordActivity({
      actionType: "Source routed",
      objectType: "Source",
      objectId: result.recordId,
      title: result.summary,
      summary: `${result.title} routed to ${result.destination}.`,
      destination: result.destination,
      status: "success"
    });
    if (activeCaptureId) {
      updateCapture(activeCaptureId, {
        status: "Routed",
        destination: result.destination,
        routedRecordId: result.recordId
      });
    }
  }

  async function classifySource() {
    setError("");
    setStatus("");
    setRoutedResult(null);
    setIsClassifying(true);
    try {
      const fileClassificationText = await extractFileTextForClassification();
      setStatus("Classifying source...");
      const response = await fetch("/api/intake/classify-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          inputType,
          url,
          text: [text, fileClassificationText].filter(Boolean).join("\n\n"),
          notes,
          tags,
          filename: file?.name,
          fileType: file?.type
        })
      });
      const payload = await readJsonResponse(response, "Source classification failed");
      if (!response.ok || !payload?.classification) {
        throw new Error(payload?.error ?? "Could not classify this source.");
      }
      const nextClassification = payload.classification as IntakeClassification;
      setClassification(nextClassification);
      setDestination(nextClassification.recommendedDestination);
      if (activeCaptureId) {
        updateCapture(activeCaptureId, {
          status: "Triaged",
          triage: nextClassification,
          destination: nextClassification.recommendedDestination
        });
      }
      const nextSourceType =
        nextClassification.recommendedDestination === "Inspiration / Reference Profile"
          ? "inspiration/reference"
          : nextClassification.recommendedDestination === "Competitor / Market Watch"
            ? "competitor/market watch"
            : nextClassification.recommendedDestination === "Audience Persona"
              ? "audience/persona"
              : "internal voice";
      setProfileSourceType(nextSourceType);
      setPatternOnly(sourceTypeDefaultsPatternOnly(nextSourceType));
      setStatus(fileClassificationText ? "File classified. Review AI Triage and confirm the destination before saving." : "Classified. Confirm or change the destination before saving.");
    } catch (classifyError) {
      const message = classifyError instanceof Error ? classifyError.message : "Could not classify this source.";
      const unsupported = /unsupported|not enough readable|video\/audio/i.test(message);
      setError(message);
      setClassification({
        sourceKind: inputType,
        recommendedDestination: "Manual review only",
        confidence: "Low",
        why: unsupported
          ? "The uploaded file could not be extracted or analyzed automatically. It has been set aside for manual review."
          : "The app could not confidently classify this source.",
        useAs: "manual review",
        status: unsupported ? "File unsupported" : "Could not classify",
        detectedPlatform: inputType === "Media" || inputType === "Screenshot" ? "Media" : inputType === "Document" ? "Document" : "Text",
        isSocial: false,
        canFetchWebsite: false
      });
      setDestination("Manual review only");
      setStatus(unsupported ? "File unsupported. Saved for manual review." : "Classification failed. Saved for manual review.");
      recordActivity({
        actionType: "Source classified",
        objectType: "Source",
        title: unsupported ? "File unsupported" : "Classification failed",
        summary: message,
        destination: "Manual Review",
        status: "warning"
      });
    } finally {
      setIsClassifying(false);
    }
  }

  async function extractFileTextForClassification() {
    if (!file) return "";
    setStatus("Uploading file...");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const lowerType = file.type.toLowerCase();
    const isPlainText =
      lowerType.startsWith("text/") ||
      ["txt", "md", "markdown", "csv", "json"].includes(extension);
    const isImage = lowerType.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(extension);

    if (inputType === "Document" || isPlainText) {
      setStatus("Extracting file...");
      if (isPlainText) {
        const extracted = await file.text();
        if (!extracted.trim()) {
          throw new Error("This file did not provide enough readable text. Paste text, try a TXT/Markdown export, or save it for manual review.");
        }
        return `Extracted from ${file.name}:\n${extracted.slice(0, 12000)}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/extract-document", {
        method: "POST",
        body: formData
      });
      const payload = await readJsonResponse(response, "Document extraction failed");
      if (!response.ok || !payload?.text) {
        throw new Error(payload?.error ?? "File unsupported. This document could not be extracted. Save it for manual review or paste readable text.");
      }
      return `Extracted from ${payload.filename ?? file.name}:\n${String(payload.text).slice(0, 12000)}`;
    }

    if (inputType === "Screenshot" || isImage) {
      if (!isImage) {
        throw new Error("File unsupported. Screenshot classification needs an image file, pasted text, or notes.");
      }
      if (file.size > maxAiImageUploadBytes) {
        throw new Error("File unsupported. This image is too large for AI triage. Add notes, upload a smaller screenshot, or save it for manual review.");
      }
      setStatus("Extracting file...");
      const imageDataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/analyze-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, filename: file.name, notes })
      });
      const payload = await readJsonResponse(response, "Image analysis failed");
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "Could not analyze this image. Save it for manual review or add notes.");
      }
      const data = payload.data;
      return [
        `Image analysis for ${file.name}:`,
        data.description ? `Description: ${data.description}` : "",
        Array.isArray(data.suggestedAngles) && data.suggestedAngles.length > 0 ? `Suggested angles: ${data.suggestedAngles.join("; ")}` : "",
        data.altText ? `Alt text: ${data.altText}` : "",
        Array.isArray(data.sensitivityWarnings) && data.sensitivityWarnings.length > 0 ? `Sensitivity warnings: ${data.sensitivityWarnings.join("; ")}` : "",
        Array.isArray(data.tags) && data.tags.length > 0 ? `Tags: ${data.tags.join(", ")}` : ""
      ].filter(Boolean).join("\n");
    }

    if (inputType === "Media") {
      const mediaType = mediaTypeFromFile(file);
      if (mediaType === "image") {
        setStatus("Extracting file...");
        return extractFileTextForClassification();
      }
      throw new Error("Video/audio classification is not supported yet. The file can be saved to Media Library, but AI Triage needs notes, pasted text, or a screenshot for now.");
    }

    return "";
  }

  async function sourceContentForKnowledge() {
    const parts = [text.trim(), notes.trim()].filter(Boolean);
    let extractedText = "";
    let documentMeta: KnowledgeDocument | undefined;

    if (file && inputType === "Document") {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/extract-document", {
        method: "POST",
        body: formData
      });
      const payload = await readJsonResponse(response, "Document extraction failed");
      if (!response.ok || !payload?.text) {
        throw new Error(payload?.error ?? "Could not extract text from this document.");
      }
      extractedText = String(payload.text);
      documentMeta = {
        id: `doc-${Date.now()}`,
        filename: payload.filename ?? file.name,
        fileType: payload.file_type ?? file.type,
        storagePath: "",
        extractedTextLength: Number(payload.extracted_text_length ?? extractedText.length),
        uploadedAt: payload.uploaded_at ?? new Date().toISOString()
      };
    }

    if (url.trim() && classification?.canFetchWebsite) {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const payload = await readJsonResponse(response, "Website fetch failed");
      if (response.ok && payload?.content) {
        parts.push(`Fetched from ${payload.sourceUrl ?? url}:\n${payload.content}`);
      } else if (payload?.error) {
        parts.push(`URL saved for reference only: ${url}`);
      }
    }

    if (extractedText) parts.push(`Extracted from document:\n${extractedText}`);
    return {
      content: parts.join("\n\n"),
      documentMeta
    };
  }

  async function saveToCompanyKnowledge() {
    const checkedAt = currentCheckedAt();
    const { content, documentMeta } = await sourceContentForKnowledge();
    const isTranscript = /transcript|meeting|notes|granola/i.test(`${classification?.sourceKind} ${title} ${text}`);
    const sourceBase: Omit<LibrarySource, "analysis"> = {
      id: `library-${Date.now()}`,
      name: title.trim() || classification?.sourceKind || "Inbox source",
      category: isTranscript ? "Transcript / Meeting Notes" : classification?.canFetchWebsite ? "Website" : "Other",
      platform: file ? "Document" : classification?.canFetchWebsite ? "Website" : "Mixed",
      urls: url.trim(),
      urlType: classification?.canFetchWebsite ? "Website URL" : url.trim() ? "Other" : undefined,
      syncStatus: "Manual Only",
      lastChecked: checkedAt,
      content: content || "Saved for manual review. Add source content before using in generation.",
      notes: [notes.trim(), tags.trim() ? `Tags: ${tags.trim()}` : ""].filter(Boolean).join("\n"),
      reviewStatus: classification?.confidence === "High" && !/transcript|customer|private/i.test(text)
        ? "Used in Brain"
        : "Needs review",
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      documents: documentMeta ? [documentMeta] : undefined,
      updatedAt: checkedAt
    };
    const nextSource: LibrarySource = {
      ...sourceBase,
      analysis: createLibrarySourceAnalysis(sourceBase)
    };
    setLibrarySources([nextSource, ...librarySources]);
    persistLibrarySource(nextSource);
    const knowledgeStatus: IntakeStatus = classification?.canFetchWebsite ? "Fetched" : "Routed";
    const knowledgeDetail = classification?.canFetchWebsite
      ? "Website content was fetched when readable and saved into Company Knowledge. Review it in the Conduit Brain before relying on it for claims."
      : "The source was saved into Company Knowledge. Add or review source content before it becomes part of the truth layer.";
    remember({
      title: nextSource.name,
      destination: "Company Knowledge",
      status: knowledgeStatus,
      destinationScreen: "Company Knowledge",
      actionTaken: knowledgeDetail,
      recordId: nextSource.id
    });
    showRoutedSuccess({
      destination: "Company Knowledge",
      title: nextSource.name,
      status: knowledgeStatus,
      summary: "Saved to Company Knowledge",
      detail: knowledgeDetail,
      destinationScreen: "Company Knowledge",
      recordId: nextSource.id
    });
  }

  async function saveToProfileSource(nextDestination = destination) {
    const platform = url.trim() ? inferProfileSourcePlatform(url) : "Other URL";
    const profileType: ProfileType =
      nextDestination === "Inspiration / Reference Profile"
        ? "Inspiration / Reference"
        : nextDestination === "Competitor / Market Watch"
          ? "Competitor / Market Watch"
          : nextDestination === "Audience Persona"
            ? "Customer / Audience Persona"
            : "Internal Voice";
    let targetProfile = profiles.find((profile) => profile.id === selectedProfileForSource);
    if (!targetProfile) {
      const profileBase: Omit<Profile, "personality"> = {
        id: `profile-${Date.now()}`,
        name: newProfileName.trim() || title.trim() || `${profileType} profile`,
        type: profileType,
        role: profileType,
        bio: notes.trim(),
        linkedInUrl: platform === "LinkedIn" ? url.trim() : "",
        xUrl: platform === "X" ? url.trim() : "",
        instagramUrl: platform === "Instagram" ? url.trim() : "",
        tiktokUrl: platform === "TikTok" ? url.trim() : "",
        websiteUrl: platform === "Website" ? url.trim() : "",
        otherUrls: platform === "Other URL" ? url.trim() : "",
        examples: "",
        notes: notes.trim(),
        syncStatus: "Manual Only",
        lastChecked: "Never",
        avatarUrl: "",
        avatarStoragePath: "",
        whatWeLike: text.trim() || notes.trim(),
        patternsToLearn: text.trim() || notes.trim(),
        thingsNotToCopy: patternOnly ? "Pattern-only. Do not copy wording, identity, facts, or claims." : "",
        voiceExamples: [],
        voiceSources: [],
        updatedAt: currentCheckedAt()
      };
      targetProfile = { ...profileBase, personality: createPersonalitySummary(profileBase) };
    }

    let screenshot: ProfileVoiceSource["screenshot"] | undefined;
    if (file && inputType === "Screenshot" && file.type.startsWith("image/")) {
      screenshot = {
        filename: file.name,
        fileType: file.type,
        size: file.size,
        dataUrl: await readFileAsDataUrl(file)
      };
    }

    const nextSource: ProfileVoiceSource = {
      id: `profile-source-${Date.now()}`,
      title: title.trim() || `${platform} source`,
      sourceKind: url.trim() ? profileSourceKindForUrl(url, platform) : screenshot ? "screenshot" : text.trim() ? "pasted text" : "notes",
      url: url.trim(),
      platform,
      screenshot,
      pastedText: text.trim(),
      sourceType: profileSourceType,
      syncStatus: text.trim() || screenshot || notes.trim() ? "needs screenshot/text" : "stored only",
      lastSynced: "Never",
      notes: notes.trim(),
      patternOnly,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const nextProfileBase: Profile = {
      ...targetProfile,
      voiceSources: [nextSource, ...(targetProfile.voiceSources ?? [])],
      updatedAt: currentCheckedAt()
    };
    const nextProfile = {
      ...nextProfileBase,
      personality: createPersonalitySummary(nextProfileBase)
    };
    setProfiles(mergeById([nextProfile], profiles));
    persistProfile(nextProfile);
    setSelectedProfileId(nextProfile.id);
    const hasProvidedContent = Boolean(text.trim() || screenshot || notes.trim());
    const profileStatus: IntakeStatus = url.trim() && !hasProvidedContent ? "Saved link only" : "Routed";
    const profileSummary = nextDestination === "Inspiration / Reference Profile"
      ? "Saved to Inspiration / Reference Profile"
      : "Saved to Profile Voice Source";
    const profileDetail = url.trim() && !hasProvidedContent
      ? "The link is saved as a source. Social content has not been synced or analyzed yet, so it will not influence generation until examples, screenshots, notes, website content, or future API sync are available."
      : "The source was added to the profile. Open the profile to analyze the available content or add more examples.";
    remember({
      title: nextSource.title,
      destination: nextDestination,
      status: profileStatus,
      destinationScreen: "Profiles",
      actionTaken: profileDetail,
      recordId: nextProfile.id
    });
    showRoutedSuccess({
      destination: nextDestination,
      title: nextSource.title,
      status: profileStatus,
      summary: profileSummary,
      detail: profileDetail,
      destinationScreen: "Profiles",
      recordId: nextProfile.id
    });
  }

  async function saveToOpportunityInbox() {
    const platform = inferOpportunityPlatform(url, classification?.detectedPlatform);
    const lower = `${classification?.sourceKind ?? ""} ${title} ${text} ${notes}`.toLowerCase();
    const opportunityType: OpportunityType =
      lower.includes("reply") || lower.includes("comment") || lower.includes("question")
        ? "Reply opportunity"
        : lower.includes("competitor")
          ? "Competitor post"
          : lower.includes("customer") || lower.includes("shoutout")
            ? "Customer story"
            : lower.includes("news") || lower.includes("article")
              ? "News / article"
              : lower.includes("founder")
                ? "Founder thought"
                : "Trend";
    const now = new Date().toISOString();
    const nextOpportunity: Opportunity = {
      id: `opportunity-${Date.now()}`,
      title: title.trim() || classification?.sourceKind || "Inbox opportunity",
      opportunityType,
      sourceUrl: url.trim(),
      platform,
      pastedText: text.trim(),
      screenshot: file && inputType === "Screenshot"
        ? {
            filename: file.name,
            fileType: file.type || "image",
            size: file.size
          }
        : undefined,
      urgency: classification?.sensitiveRisk?.hasRisk ? "High" : "Medium",
      status: "New",
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      analysis: classification
        ? {
            whyItMatters: classification.why,
            suggestedConduitAngle: classification.recommendedNextAction || "Review this signal and decide whether it should become a post or reply.",
            suggestedContentType: classification.useAs === "reply opportunity" ? "Reply" : "Standalone post",
            suggestedPlatforms: platform === "Website" || platform === "Other" ? ["LinkedIn"] : [platform as Platform].filter((item) => platforms.includes(item)),
            recommendation: classification.useAs === "reply opportunity" ? "Reply" : "Standalone post",
            relevantBrainThemes: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            riskNotes: classification.sensitiveRisk?.notes.join(" ") || "Review before posting. No automatic social action has been taken.",
            suggestedFirstDraftIdea: [text.trim(), notes.trim(), url.trim()].filter(Boolean).join("\n\n") || title.trim()
          }
        : undefined,
      notes: [notes.trim(), classification?.recommendedNextAction ? `Next action: ${classification.recommendedNextAction}` : ""].filter(Boolean).join("\n"),
      createdAt: now,
      updatedAt: now
    };
    setOpportunities((current) => [nextOpportunity, ...current]);
    persistOpportunity(nextOpportunity);
    remember({
      title: nextOpportunity.title,
      destination: "Opportunity Inbox",
      status: "Routed",
      destinationScreen: "Opportunity Inbox",
      actionTaken: "Created an opportunity. Analyze it, draft a reply, create a post, or archive it.",
      recordId: nextOpportunity.id
    });
    showRoutedSuccess({
      destination: "Opportunity Inbox",
      title: nextOpportunity.title,
      status: "Routed",
      summary: "Created Opportunity",
      detail: "This is now in Opportunity Inbox. Analyze it, draft a reply, create a post, or archive it.",
      destinationScreen: "Opportunity Inbox",
      recordId: nextOpportunity.id
    });
  }

  async function saveToMediaLibrary() {
    if (!file) throw new Error("Upload a media file first.");
    const mediaType = mediaTypeFromFile(file);
    if (!mediaType) throw new Error("Unsupported media type.");
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
    let analysis: Partial<MediaAsset> = {
      description: notes || "Media saved from Intake.",
      suggestedAngles: notes ? [notes] : [],
      sensitivityWarnings: [],
      tags: tagList
    };

    if (mediaType === "image" && file.size <= maxAiImageUploadBytes) {
      const imageDataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/analyze-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, filename: file.name, notes })
      });
      const payload = await readJsonResponse(response, "Image analysis failed");
      if (response.ok && payload?.data) {
        analysis = {
          description: payload.data.description,
          suggestedAngles: payload.data.suggestedAngles ?? [],
          overlayText: payload.data.overlayText,
          sensitivityWarnings: payload.data.sensitivityWarnings ?? [],
          altText: payload.data.altText,
          tags: tagList.length > 0 ? tagList : payload.data.tags ?? []
        };
      }
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const baseAsset: MediaAsset = {
      id: `media-${Date.now()}`,
      filename: file.name,
      fileType: file.type || file.name.split(".").pop() || "unknown",
      mediaType,
      localPreviewUrl,
      uploadedAt: new Date().toISOString(),
      notes: notes.trim(),
      tags: tagList,
      ...analysis
    };
    const storedAsset = await persistMediaAsset(baseAsset, file);
    const nextAsset = { ...baseAsset, ...storedAsset, localPreviewUrl };
    setMediaAssets([nextAsset, ...mediaAssets.filter((asset) => asset.id !== nextAsset.id)]);
    const mediaStatus: IntakeStatus = mediaType === "image" && nextAsset.description ? "Analyzed" : "Routed";
    remember({
      title: nextAsset.filename,
      destination: "Media Library",
      status: mediaStatus,
      destinationScreen: "Media Library",
      actionTaken: mediaStatus === "Analyzed"
        ? "Saved to Media Library with image analysis."
        : "Saved to Media Library for reuse.",
      recordId: nextAsset.id
    });
    showRoutedSuccess({
      destination: "Media Library",
      title: nextAsset.filename,
      status: mediaStatus,
      summary: "Saved to Media Library",
      detail: mediaStatus === "Analyzed"
        ? "The media asset was saved and image analysis was added when available."
        : "The media asset was saved for reuse in future posts.",
      destinationScreen: "Media Library",
      recordId: nextAsset.id
    });
  }

  async function startCreatePostFromIntake() {
    setCampaignName(title.trim() || "Intake brief");
    const mainIdea = text.trim() || notes.trim() || url.trim() || title.trim();
    setIntent(mainIdea);
    setIdea([mainIdea, notes.trim()].filter(Boolean).join("\n\n"));
    if (file && (inputType === "Media" || inputType === "Screenshot")) {
      const mediaType = mediaTypeFromFile(file);
      if (mediaType) {
        const previewUrl = URL.createObjectURL(file);
        setMediaPreviewUrl(previewUrl);
        setMediaContext({
          type: mediaType,
          filename: file.name,
          notes: notes.trim() || text.trim()
        });
      }
    }
    remember({
      title: title.trim() || "Intake brief",
      destination: "Create Post / Content Brief",
      status: "Routed",
      destinationScreen: "New Campaign",
      actionTaken: "Started a Create Post brief from this source."
    });
    setScreen("New Campaign");
  }

  async function saveDestination(nextDestination = destination) {
    setError("");
    setStatus("");
    setIsSaving(true);
    try {
      setDestination(nextDestination);
      if (nextDestination === "Company Knowledge") await saveToCompanyKnowledge();
      else if (nextDestination === "Opportunity Inbox") await saveToOpportunityInbox();
      else if (nextDestination === "Media Library") await saveToMediaLibrary();
      else if (nextDestination === "Create Post / Content Brief") await startCreatePostFromIntake();
      else if (nextDestination === "Manual review only") {
        const manualTitle = title.trim() || "Manual review source";
        remember({
          title: manualTitle,
          destination: nextDestination,
          status: "Needs review",
          actionTaken: "Saved for manual review. No destination record was created."
        });
        showRoutedSuccess({
          destination: nextDestination,
          title: manualTitle,
          status: "Needs review",
          summary: "Saved for Manual Review",
          detail: "This stayed in Intake history because it needs a human decision before it feeds the brain or becomes an opportunity."
        });
      } else {
        await saveToProfileSource(nextDestination);
      }
    } catch (saveError) {
      remember({
        title: title.trim() || "Failed intake item",
        destination: nextDestination,
        status: "Failed",
        actionTaken: saveError instanceof Error ? saveError.message : "Could not save this source."
      });
      setError(saveError instanceof Error ? saveError.message : "Could not save this source.");
    } finally {
      setIsSaving(false);
    }
  }

  const destinationOptions: IntakeDestination[] = [
    "Company Knowledge",
    "Opportunity Inbox",
    "Profile Voice Source",
    "Inspiration / Reference Profile",
    "Competitor / Market Watch",
    "Audience Persona",
    "Media Library",
    "Create Post / Content Brief",
    "Manual review only"
  ];
  const selectedBulkItems = bulkItems.filter((item) => item.selected && item.postCopy.trim());
  const bulkDestinationSummary = countBulkDestinations(selectedBulkItems);
  const bulkParsedSummary = {
    total: bulkItems.length,
    metrics: bulkItems.filter(bulkImportHasMetrics).length,
    risky: bulkItems.filter(bulkImportIsRisky).length,
    platforms: Array.from(new Set(bulkItems.map((item) => item.platform))).filter(Boolean),
    sourceTypes: Array.from(new Set(bulkItems.map((item) => item.sourceType))).filter(Boolean),
    destinations: Array.from(new Set(bulkItems.map((item) => item.destination))).filter(Boolean)
  };
  const bulkReviewGroups: Array<{ title: string; description: string; items: BulkImportItem[] }> = [
    {
      title: "Needs review",
      description: "Risky, sensitive, or low-confidence rows should be checked before they influence the app.",
      items: bulkItems.filter((item) => bulkImportIsRisky(item) || item.confidence === "Low")
    },
    {
      title: "Has metrics",
      description: "Rows with performance data can feed Analytics and Performance Insights.",
      items: bulkItems.filter((item) => !bulkImportIsRisky(item) && bulkImportHasMetrics(item))
    },
    {
      title: "Inspiration / pattern-only",
      description: "External inspiration can teach structure and pacing, never facts or claims.",
      items: bulkItems.filter((item) => !bulkImportIsRisky(item) && !bulkImportHasMetrics(item) && bulkImportIsPatternOnly(item))
    },
    {
      title: "Founder/company voice",
      description: "Internal or company examples can teach cadence, hooks, and approved style.",
      items: bulkItems.filter((item) => !bulkImportIsRisky(item) && !bulkImportHasMetrics(item) && !bulkImportIsPatternOnly(item) && bulkImportIsVoice(item))
    },
    {
      title: "Ready to save",
      description: "Rows with clear routing and no obvious risk.",
      items: bulkItems.filter((item) => !bulkImportIsRisky(item) && !bulkImportHasMetrics(item) && !bulkImportIsPatternOnly(item) && !bulkImportIsVoice(item))
    }
  ].filter((group) => group.items.length > 0);
  const profileDestination = destination === "Profile Voice Source" || destination === "Inspiration / Reference Profile" || destination === "Competitor / Market Watch" || destination === "Audience Persona";
  const profileContentAvailable = Boolean(text.trim() || notes.trim() || file || (url.trim() && classification?.canFetchWebsite));

  function destinationActionLabel(destinationName: IntakeDestination) {
    if (destinationName === "Company Knowledge") return "Open Conduit Brain";
    if (destinationName === "Opportunity Inbox") return "View opportunity";
    if (destinationName === "Media Library") return "View media";
    if (destinationName === "Create Post / Content Brief") return "Open Create Post";
    if (destinationName === "Manual review only") return "Review history";
    return "Open profile";
  }

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Unified intake</p>
            <h3 className="mt-1 text-2xl font-extrabold tracking-tight">Feed the brain without choosing the perfect page first</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Intake collects one-off sources, browser captures, and past-content imports. AI triage then routes material to Company Knowledge, Profiles, Media Library, Create Post, or Manual Review.
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-muted-foreground sm:min-w-64">
            <p><span className="text-foreground">Intake</span> unifies source triage, browser capture, and bulk import.</p>
            <p><span className="text-foreground">Opportunities</span> are actionable items routed from Intake.</p>
            <Button size="sm" variant="secondary" onClick={() => setScreen("Opportunity Inbox")}>Open opportunities</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {([
            { label: "Classify Source" as IntakeView, count: classification ? 1 : 0, description: "URLs, notes, docs, media, raw ideas" },
            { label: "Browser Captures" as IntakeView, count: captures.filter((capture) => capture.status !== "Archived").length, description: "Bookmarklet captures to triage later" },
            { label: "Import Past Content" as IntakeView, count: bulkItems.length, description: "Posts, captions, CSVs, metrics" },
            { label: "History" as IntakeView, count: history.length, description: "What was routed and where" }
          ]).map((mode) => (
            <button
              key={mode.label}
              type="button"
              onClick={() => setIntakeView(mode.label)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                intakeView === mode.label
                  ? "border-primary bg-teal-50 text-teal-950 shadow-sm"
                  : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-extrabold">{mode.label}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-muted-foreground">{mode.count}</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{mode.description}</span>
            </button>
          ))}
        </div>
      </Card>

      {intakeView === "Browser Captures" && (
        <>
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Browser capture</p>
            <h3 className="mt-1 text-xl font-bold">Capture from your browser</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Save this bookmarklet to your browser. When you see a page, post, article, or opportunity, click it to send the URL and selected text into Intake.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Social links are saved and triaged, but not scraped. Add screenshots, pasted text, or use future API sync to analyze social content.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={bookmarkletHref}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Capture to Conduit
            </a>
            <Button variant="secondary" onClick={simulateBrowserCapture}>Test capture</Button>
          </div>
        </div>
        <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <summary className="cursor-pointer font-bold">Install instructions and manual copy</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Show your browser bookmarks bar if it is hidden.</li>
            <li>Drag the <span className="font-semibold text-foreground">Capture to Conduit</span> button into the bookmarks bar.</li>
            <li>On any page, select useful text if you want, then click the bookmarklet.</li>
            <li>The app opens Intake with the page title, URL, selected text, and timestamp ready for AI triage.</li>
          </ol>
          <textarea
            readOnly
            value={bookmarkletHref}
            className="mt-4 min-h-24 w-full rounded-md border border-input bg-white p-3 font-mono text-xs leading-5 text-muted-foreground"
            onFocus={(event) => event.currentTarget.select()}
          />
        </details>
      </Card>

      {browserCapture && (
        <Card className="border-teal-200 bg-teal-50 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill>Captured from browser</Pill>
                <Pill>{destination}</Pill>
                {browserCapture.capturedAt && <Pill>{formatShortDateTime(browserCapture.capturedAt)}</Pill>}
              </div>
              <h3 className="mt-3 text-lg font-extrabold text-teal-950">Review and classify this source</h3>
              <p className="mt-1 text-sm leading-6 text-teal-900">
                {captureDestinationReason(browserCapture)}
              </p>
              {browserCapture.text?.trim() && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-teal-900">
                  Selected text: {browserCapture.text.trim()}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={classifySource} disabled={isClassifying}>
                <Sparkles size={15} /> {isClassifying ? "Classifying..." : "Classify source"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => saveDestination("Company Knowledge")} disabled={isSaving}>Save to Company Knowledge</Button>
              <Button size="sm" variant="secondary" onClick={() => saveDestination("Opportunity Inbox")} disabled={isSaving}>Create Opportunity</Button>
              <Button size="sm" variant="secondary" onClick={() => saveDestination("Create Post / Content Brief")} disabled={isSaving}>Start Create Post</Button>
              <Button size="sm" variant="secondary" onClick={() => saveDestination("Profile Voice Source")} disabled={isSaving}>Save as Profile Voice Source</Button>
              <Button size="sm" variant="secondary" onClick={() => saveDestination("Manual review only")} disabled={isSaving}>Save for Manual Review</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Browser Captures</p>
            <h3 className="mt-1 text-xl font-bold">Capture now, route later</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Use the bookmarklet to collect articles, posts, trends, customer notes, and ideas while browsing. Triage them here when you are ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={triageAllNewCaptures} disabled={!captures.some((capture) => capture.status === "New")}>
              Triage all new captures
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                captures
                  .filter((capture) => capture.status === "Routed")
                  .forEach((capture) => {
                    updateCapture(capture.id, { status: "Archived" });
                    recordActivity({
                      actionType: "Item archived",
                      objectType: "Capture",
                      objectId: capture.id,
                      title: "Capture archived",
                      summary: `${capture.title || "Browser capture"} was archived from Intake captures.`,
                      destination: "Intake",
                      status: "success",
                      undo: {
                        type: "capture-status",
                        label: "Restore capture",
                        payload: { id: capture.id, status: capture.status }
                      }
                    });
                  });
              }}
              disabled={!captures.some((capture) => capture.status === "Routed")}
            >
              Clear routed captures
            </Button>
          </div>
        </div>
        {captures.filter((capture) => capture.status !== "Archived").length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
            Captured pages, selected text, and links will appear here. Use the bookmarklet or the Test capture button to add the first item.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {captures.filter((capture) => capture.status !== "Archived").map((capture) => (
              <div key={capture.id} className={cn(
                "rounded-lg border bg-white p-4",
                capture.status === "Archived" ? "border-slate-200 opacity-70" : "border-border"
              )}>
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Pill>{capture.status}</Pill>
                      <Pill>{capture.detectedPlatform || "Other"}</Pill>
                      {capture.destination && <Pill>{capture.destination}</Pill>}
                    </div>
                    <h4 className="mt-3 font-extrabold">{capture.title || "Browser capture"}</h4>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {capture.sourceDomain || capture.url || "Selected text capture"}
                    </p>
                    {capture.selectedText && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{capture.selectedText}</p>
                    )}
                    {isSocialCaptureUrl(capture.url) && (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        Social link saved. The app will not scrape it automatically.
                      </p>
                    )}
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Captured {formatShortDateTime(capture.capturedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button size="sm" variant="secondary" onClick={() => triageCapture(capture)}>Triage</Button>
                    <Button size="sm" variant="secondary" onClick={() => loadCaptureIntoForm(capture)}>Route</Button>
                    <Button size="sm" variant="secondary" onClick={() => prepareCaptureRoute(capture, "Create Post / Content Brief")}>Start post</Button>
                    <Button size="sm" variant="secondary" onClick={() => prepareCaptureRoute(capture, "Opportunity Inbox")}>Create opportunity</Button>
                    <Button size="sm" variant="secondary" onClick={() => prepareCaptureRoute(capture, "Company Knowledge")}>Save to Company Knowledge</Button>
                    <Button size="sm" variant="secondary" onClick={() => prepareCaptureRoute(capture, "Profile Voice Source")}>Save to Profile Voice Source</Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        updateCapture(capture.id, { status: "Archived" });
                        recordActivity({
                          actionType: "Item archived",
                          objectType: "Capture",
                          objectId: capture.id,
                          title: "Capture archived",
                          summary: `${capture.title || "Browser capture"} was archived from Intake captures.`,
                          destination: "Intake",
                          status: "success",
                          undo: {
                            type: "capture-status",
                            label: "Restore capture",
                            payload: { id: capture.id, status: capture.status }
                          }
                        });
                      }}
                    >
                      Archive
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => deleteCapture(capture)}>
                      Delete capture
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

        </>
      )}

      {intakeView === "Import Past Content" && (
        <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Import past content</p>
            <h3 className="mt-1 text-xl font-bold">Bulk import posts, captions, examples, and metrics</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Import old posts, captions, founder examples, or CSV exports to teach the app your voice and content history. This is manual import only: no social scraping or API sync.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
            <Pill>{campaigns.length} content briefs</Pill>
            <Pill>{approvedPosts.length} approved examples</Pill>
            <Pill>{postQueue.filter((item) => item.metrics && Object.values(item.metrics).some((value) => Number(value ?? 0) > 0)).length} metric records</Pill>
            <Pill>{feedbackMemory.length} feedback signals</Pill>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(["Add content", "Analyze and review", "Save / route"] as const).map((step, index) => {
            const active =
              (bulkImportStage === "Add content" && step === "Add content") ||
              (bulkImportStage === "Analyze and review" && step === "Analyze and review") ||
              ((bulkImportStage === "Confirm save" || bulkImportStage === "Saved") && step === "Save / route");
            return (
              <div key={step} className={cn("rounded-lg border p-3", active ? "border-primary bg-teal-50" : "border-slate-200 bg-slate-50")}>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
                <p className="mt-1 font-bold">{step}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Imported content will not be used for generation unless routed to an active destination like Profile Voice, Company Knowledge, Approved examples, or Feedback Memory.
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-extrabold">Step 1: Add content</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel label="Import method" htmlFor="bulk-import-method" />
                <select
                  id="bulk-import-method"
                  value={bulkImportMethod}
                  onChange={(event) => setBulkImportMethod(event.target.value as BulkImportMethod)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                >
                  {(["Paste", "CSV", "TXT / Markdown", "JSON"] as BulkImportMethod[]).map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Default source type" htmlFor="bulk-source-type" />
                <select
                  id="bulk-source-type"
                  value={bulkDefaultSourceType}
                  onChange={(event) => setBulkDefaultSourceType(event.target.value as BulkImportSourceType)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                >
                  {([
                    "Conduit company post",
                    "Founder post",
                    "Inspiration/reference post",
                    "Competitor/market watch",
                    "Customer/audience language",
                    "Past performance data",
                    "Other"
                  ] as BulkImportSourceType[]).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Default destination" htmlFor="bulk-destination" />
                <select
                  id="bulk-destination"
                  value={bulkDefaultDestination}
                  onChange={(event) => setBulkDefaultDestination(event.target.value as BulkImportDestination)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                >
                  {(["Content Library", "Profile Voice Source", "Approved examples", "Company Knowledge", "Feedback Memory", "Manual review"] as BulkImportDestination[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={bulkImportText}
              onChange={(event) => setBulkImportText(event.target.value)}
              className="mt-4 min-h-44 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder={
                bulkImportMethod === "CSV"
                  ? "platform,post copy,date,author,url,impressions,likes,comments,shares,saves,clicks,notes,status\nLinkedIn,\"We learned this on the factory floor...\",2026-05-01,Conduit,,1200,45,8,3,2,12,Founder-led,posted"
                  : "Paste multiple posts or captions here. Separate posts with blank lines."
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".csv,.txt,.md,.markdown,.json,text/csv,text/plain,application/json"
                onChange={(event) => void handleBulkImportFile(event.target.files?.[0])}
                className="text-sm text-muted-foreground"
              />
              {bulkImportFileName && <Pill>{bulkImportFileName}</Pill>}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-extrabold">Import options</p>
            <div className="mt-3 grid gap-3">
              <div>
                <FieldLabel label="Profile for voice imports" htmlFor="bulk-profile" />
                <select
                  id="bulk-profile"
                  value={bulkProfileId}
                  onChange={(event) => setBulkProfileId(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Create/select automatically</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </div>
              {!bulkProfileId && (
                <input
                  value={bulkCreateProfileName}
                  onChange={(event) => setBulkCreateProfileName(event.target.value)}
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Optional new profile name"
                />
              )}
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={bulkAnalyzeVoice} onChange={(event) => setBulkAnalyzeVoice(event.target.checked)} />
                Analyze voice after import
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={bulkMarkApproved} onChange={(event) => setBulkMarkApproved(event.target.checked)} />
                Mark Conduit posts as approved examples
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={bulkAddFeedbackMemory} onChange={(event) => setBulkAddFeedbackMemory(event.target.checked)} />
                Also add positive Feedback Memory
              </label>
            </div>
            <Button className="mt-4 w-full" onClick={parseBulkImport} disabled={!bulkImportText.trim()}>
              Parse and review import
            </Button>
          </div>
        </div>

        {bulkMessage && <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-primary">{bulkMessage}</p>}

        {bulkItems.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-extrabold">Parsed import summary</p>
                <p className="mt-1 text-sm text-muted-foreground">A quick read on what came in and where it is likely to go.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill>{bulkParsedSummary.total} parsed</Pill>
                <Pill>{bulkParsedSummary.metrics} with metrics</Pill>
                <Pill>{bulkParsedSummary.risky} needs review</Pill>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Likely platforms</p>
                <p className="mt-1 text-sm font-semibold">{bulkParsedSummary.platforms.join(", ") || "None detected"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Likely source types</p>
                <p className="mt-1 text-sm font-semibold">{bulkParsedSummary.sourceTypes.join(", ") || "None detected"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Suggested destinations</p>
                <p className="mt-1 text-sm font-semibold">{bulkParsedSummary.destinations.join(", ") || "None selected"}</p>
              </div>
            </div>
          </div>
        )}

        {bulkItems.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-extrabold">Step 2: Analyze and review</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review parsed rows before saving. External inspiration and competitors stay pattern-only and never become facts.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void analyzeBulkImport()} disabled={isAnalyzingImport}>
                  {isAnalyzingImport ? "Analyzing..." : "Analyze import"}
                </Button>
                <Button onClick={() => setBulkImportStage("Confirm save")} disabled={selectedBulkItems.length === 0}>
                  Continue to save
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-extrabold">Bulk actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={saveHighConfidenceBulkItems}>Save all high-confidence items</Button>
                <Button size="sm" variant="secondary" onClick={sendRiskyBulkItemsToManualReview}>Send risky items to Manual Review</Button>
                <Button size="sm" variant="secondary" onClick={markBulkInspirationPatternOnly}>Mark all inspiration as pattern-only</Button>
                <select
                  value={bulkApplyDestination}
                  onChange={(event) => setBulkApplyDestination(event.target.value as BulkImportDestination)}
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {(["Content Library", "Profile Voice Source", "Approved examples", "Company Knowledge", "Feedback Memory", "Manual review"] as BulkImportDestination[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" onClick={applyBulkDestinationToSelected}>Apply destination to selected rows</Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {bulkReviewGroups.map((group) => (
                <div key={group.title} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div>
                      <p className="font-extrabold">{group.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Pill>{group.items.length} item{group.items.length === 1 ? "" : "s"}</Pill>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {group.items.map((item) => {
                      const expanded = bulkExpandedItems.includes(item.id);
                      return (
                        <div key={item.id} className={cn("rounded-md border p-3", item.selected ? "border-primary bg-teal-50/40" : "border-slate-200 bg-slate-50")}>
                          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-2">
                                <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
                                  <input type="checkbox" checked={item.selected} onChange={(event) => updateBulkItem(item.id, { selected: event.target.checked })} />
                                  Save
                                </label>
                                <Pill>{item.platform}</Pill>
                                {(item.author || item.postingAccount) && <Pill>{item.author || item.postingAccount}</Pill>}
                                <Pill>{item.destination}</Pill>
                                <Pill>{item.confidence}</Pill>
                                {bulkImportIsRisky(item) && <Pill>Risk</Pill>}
                                {bulkImportHasMetrics(item) && <Pill>Metrics</Pill>}
                                {bulkImportIsPatternOnly(item) && <Pill>Pattern-only</Pill>}
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6">{item.postCopy}</p>
                              <button type="button" onClick={() => toggleBulkItemExpanded(item.id)} className="mt-2 text-xs font-bold text-primary">
                                {expanded ? "Hide details" : "Expand details"}
                              </button>
                            </div>
                            <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
                              <select
                                value={item.destination}
                                onChange={(event) => updateBulkItem(item.id, { destination: event.target.value as BulkImportDestination })}
                                className="h-10 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                              >
                                {(["Content Library", "Profile Voice Source", "Approved examples", "Company Knowledge", "Feedback Memory", "Manual review"] as BulkImportDestination[]).map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                              <select
                                value={item.sourceType}
                                onChange={(event) => {
                                  const sourceType = event.target.value as BulkImportSourceType;
                                  updateBulkItem(item.id, {
                                    sourceType,
                                    destination: destinationForBulkSourceType(sourceType),
                                    flags: flagsForBulkImportItem({ ...item, sourceType })
                                  });
                                }}
                                className="h-10 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                              >
                                {(["Conduit company post", "Founder post", "Inspiration/reference post", "Competitor/market watch", "Customer/audience language", "Past performance data", "Other"] as BulkImportSourceType[]).map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {expanded && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-muted-foreground">
                              <p className="font-extrabold text-foreground">Full import details</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.postCopy}</p>
                              <p className="mt-2 font-semibold">{[item.date, item.author || item.postingAccount, item.url].filter(Boolean).join(" · ") || "No date or source metadata"}</p>
                              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                                {item.aiSuggestedDestination && <span>AI suggested: <strong>{item.aiSuggestedDestination}</strong></span>}
                                {item.influence && <span>Influence: <strong>{item.influence}</strong></span>}
                                {item.contentAngle && <span>Angle: <strong>{item.contentAngle}</strong></span>}
                                {typeof item.engagementRate === "number" && item.engagementRate > 0 && (
                                  <span>Engagement rate: <strong>{item.engagementRate > 1 ? item.engagementRate : `${Math.round(item.engagementRate * 1000) / 10}%`}</strong></span>
                                )}
                              </div>
                              {item.suggestedProfile && <p className="mt-1">Suggested profile: <strong>{item.suggestedProfile}</strong></p>}
                              {item.toneTraits && item.toneTraits.length > 0 && <p className="mt-1">Tone: {item.toneTraits.slice(0, 4).join(", ")}</p>}
                              {item.hookPatterns && item.hookPatterns.length > 0 && <p className="mt-1">Hooks: {item.hookPatterns.slice(0, 2).join(" / ")}</p>}
                              {item.riskNotes && item.riskNotes.length > 0 && <p className="mt-1 font-semibold text-red-700">Risk notes: {item.riskNotes.join(" ")}</p>}
                              {item.suggestedTags && item.suggestedTags.length > 0 && <p className="mt-1">Suggested tags: {item.suggestedTags.slice(0, 8).join(", ")}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bulkImportStage === "Confirm save" && selectedBulkItems.length > 0 && (
          <div className="mt-5 rounded-lg border border-primary bg-teal-50 p-5">
            <p className="text-sm font-extrabold">Step 3: Save / route</p>
            <h4 className="mt-1 text-lg font-bold">Confirm this import</h4>
            <p className="mt-2 text-sm leading-6 text-teal-900">You are about to save:</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Pill>{bulkDestinationSummary.contentLibrary} content library items</Pill>
              <Pill>{bulkDestinationSummary.profileVoice} profile voice examples</Pill>
              <Pill>{bulkDestinationSummary.approvedExamples} approved examples</Pill>
              <Pill>{bulkDestinationSummary.companyKnowledge} Company Knowledge sources</Pill>
              <Pill>{bulkDestinationSummary.feedbackMemory} Feedback Memory signals</Pill>
              <Pill>{bulkDestinationSummary.metrics} metrics records</Pill>
              <Pill>{bulkDestinationSummary.manualReview} manual review items</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={importSelectedBulkItems}>Confirm and save import</Button>
              <Button variant="secondary" onClick={() => setBulkImportStage("Analyze and review")}>Back to review</Button>
            </div>
          </div>
        )}

        {bulkImportStage === "Saved" && bulkLastSavedSummary && (
          <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-5">
            <p className="text-sm font-extrabold text-primary">Import saved</p>
            <p className="mt-2 text-sm leading-6 text-teal-900">
              Imported content was routed. Use the next actions below to keep moving.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setScreen("Content Library")}>View imported content</Button>
              <Button size="sm" variant="secondary" onClick={() => setScreen("Profiles")}>Open profile</Button>
              <Button size="sm" variant="secondary" onClick={() => setScreen("Analytics")}>Open Analytics</Button>
              <Button size="sm" variant="secondary" onClick={() => {
                setBulkImportText("");
                setBulkImportFileName("");
                setBulkItems([]);
                setBulkLastSavedSummary(null);
                setBulkImportStage("Add content");
                setBulkMessage("");
              }}>Add another import</Button>
              <Button size="sm" onClick={() => setScreen("New Campaign")}>Create post using imported learning</Button>
            </div>
          </div>
        )}
      </Card>

      )}

      {intakeView === "Classify Source" && (
        <>
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-bold">Classify a source</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Drop in links, docs, notes, transcripts, media, or raw ideas. The app classifies them and routes them to Company Knowledge, Profiles, Media Library, or Create Post.
            </p>
          </div>
          <Button variant="secondary" onClick={resetIntake}>Clear</Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Source title" htmlFor="intake-title" />
            <input id="intake-title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Conduit website, Danny X profile, sales call notes..." />
          </div>
          <div>
            <FieldLabel label="Source input type" htmlFor="intake-type" />
            <select id="intake-type" value={inputType} onChange={(event) => setInputType(event.target.value as IntakeInputType)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
              {(["URL", "Pasted text", "Document", "Screenshot", "Media", "Raw post idea"] as IntakeInputType[]).map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          {inputType === "URL" && (
            <div className="md:col-span-2">
              <FieldLabel label="URL" htmlFor="intake-url" />
              <input id="intake-url" value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="https://..." />
            </div>
          )}
          {(inputType === "Pasted text" || inputType === "Raw post idea") && (
            <div className="md:col-span-2">
              <FieldLabel label={inputType === "Raw post idea" ? "Raw post idea" : "Pasted text / notes / transcript"} htmlFor="intake-text" />
              <textarea id="intake-text" value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-36 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="Paste source text, notes, transcript, or a rough post idea..." />
            </div>
          )}
          {(inputType === "Document" || inputType === "Screenshot" || inputType === "Media") && (
            <div className="md:col-span-2">
              <FieldLabel label="File upload" htmlFor="intake-file" />
              <input
                id="intake-file"
                type="file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setFile(nextFile);
                  setClassification(null);
                  setRoutedResult(null);
                  setError("");
                  setStatus(nextFile ? `File selected: ${nextFile.name}. Click Classify source to extract and triage it.` : "");
                }}
                className="mt-2 block w-full text-sm text-muted-foreground"
              />
              {file && (
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {file.type || "Unknown file type"} · {Math.max(1, Math.round(file.size / 1024))} KB
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <FieldLabel label="Notes" htmlFor="intake-notes" />
            <input id="intake-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="What should we learn or remember?" />
          </div>
          <div>
            <FieldLabel label="Optional tags" htmlFor="intake-tags" />
            <input id="intake-tags" value={tags} onChange={(event) => setTags(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="factory, investor, founder voice" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Social links are saved as references. Website/blog URLs can be fetched. External inspiration stays pattern-only.
          </p>
          <Button onClick={classifySource} disabled={isClassifying || (!url.trim() && !text.trim() && !file && !notes.trim())}>
            <Sparkles size={16} /> {isClassifying ? "Classifying..." : "Classify source"}
          </Button>
        </div>
      </Card>

      {classification && (
        <Card className="p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">AI Triage</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The app recommends where this source belongs so you do not have to pick the right page first.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <AnalysisBlock label="Detected source" value={classification.sourceKind} />
            <AnalysisBlock label="Primary destination" value={classification.recommendedDestination} />
            <AnalysisBlock label="Confidence" value={classification.confidence} />
            <AnalysisBlock label="Should influence" value={(classification.influence ?? [classification.useAs]).join(", ")} />
          </div>
          {classification.secondaryDestination && classification.secondaryDestination !== "Manual review only" && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <span className="font-bold">Secondary route:</span>{" "}
              <span className="text-muted-foreground">{classification.secondaryDestination}</span>
            </div>
          )}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{classification.why}</p>
          {classification.recommendedNextAction && (
            <p className="mt-2 text-sm font-semibold text-primary">
              Recommended next action: {classification.recommendedNextAction}
            </p>
          )}
          {classification.sensitiveRisk?.hasRisk && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Sensitive / risky material may be present</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {classification.sensitiveRisk.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
          )}
          {classification.isSocial && (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-muted-foreground">
              Social link saved only: the app will not scrape this platform automatically. Add a screenshot, pasted text, notes, or future API sync before treating it as analyzed.
            </div>
          )}
          <details className="mt-4 rounded-md border border-slate-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-bold">Destination rules and why not the others</summary>
            <div className="mt-3 grid gap-3 text-muted-foreground md:grid-cols-2">
              <p><span className="font-semibold text-foreground">Company Knowledge</span> = source-of-truth facts, claims, docs, product info, and proof points.</p>
              <p><span className="font-semibold text-foreground">Opportunity Inbox</span> = trends, mentions, replies, news, competitor posts, founder thoughts, and customer moments to act on.</p>
              <p><span className="font-semibold text-foreground">Profiles</span> = voices, personas, inspiration brands, competitors, and reusable style/pattern sources.</p>
              <p><span className="font-semibold text-foreground">Media Library</span> = reusable images, videos, audio, and screenshots.</p>
              <p><span className="font-semibold text-foreground">Create Post</span> = raw post ideas or source material ready to become a content brief.</p>
              <p><span className="font-semibold text-foreground">Manual Review</span> = unclear, sensitive, or risky material.</p>
            </div>
            {(classification.whyNotOthers ?? []).length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-muted-foreground">
                {(classification.whyNotOthers ?? []).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </details>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Destination" htmlFor="intake-destination" />
              <select id="intake-destination" value={destination} onChange={(event) => setDestination(event.target.value as IntakeDestination)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
                {destinationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            {profileDestination && (
              <div>
                <FieldLabel label="Existing profile" htmlFor="intake-profile" />
                <select id="intake-profile" value={selectedProfileForSource} onChange={(event) => setSelectedProfileForSource(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Create new profile</option>
                  {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.type}</option>)}
                </select>
              </div>
            )}
            {profileDestination && !selectedProfileForSource && (
              <div>
                <FieldLabel label="New profile name" htmlFor="intake-new-profile" />
                <input id="intake-new-profile" value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Profile name" />
              </div>
            )}
            {profileDestination && (
              <div>
                <FieldLabel label="Profile source type" htmlFor="intake-profile-source-type" />
                <select id="intake-profile-source-type" value={profileSourceType} onChange={(event) => {
                  const next = event.target.value as ProfileSourceType;
                  setProfileSourceType(next);
                  setPatternOnly(sourceTypeDefaultsPatternOnly(next));
                }} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
                  {profileSourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            )}
            {profileDestination && (
              <label className="mt-8 flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={patternOnly} onChange={(event) => setPatternOnly(event.target.checked)} />
                Pattern-only, do not copy wording
              </label>
            )}
          </div>
          {status && <p className="mt-4 text-sm font-semibold text-primary">{status}</p>}
          {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
          {routedResult && (
            <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Pill>{routedResult.status}</Pill>
                    <Pill>{routedResult.destination}</Pill>
                  </div>
                  <h4 className="mt-3 text-lg font-extrabold text-teal-950">{routedResult.summary}</h4>
                  <p className="mt-1 text-sm leading-6 text-teal-900">{routedResult.detail}</p>
                </div>
                {routedResult.destinationScreen && (
                  <Button variant="secondary" onClick={() => setScreen(routedResult.destinationScreen!)}>
                    {destinationActionLabel(routedResult.destination)}
                  </Button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {routedResult.destination === "Company Knowledge" && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setScreen("Company Knowledge")}>View in Conduit Brain</Button>
                    <Button size="sm" variant="secondary" onClick={startCreatePostFromIntake}>Create post from this source</Button>
                  </>
                )}
                {routedResult.destination === "Opportunity Inbox" && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setScreen("Opportunity Inbox")}>Analyze opportunity</Button>
                    <Button size="sm" variant="secondary" onClick={() => setScreen("Opportunity Inbox")}>Draft reply</Button>
                    <Button size="sm" variant="secondary" onClick={startCreatePostFromIntake}>Create post from opportunity</Button>
                  </>
                )}
                {(routedResult.destination === "Profile Voice Source" || routedResult.destination === "Inspiration / Reference Profile" || routedResult.destination === "Competitor / Market Watch" || routedResult.destination === "Audience Persona") && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setScreen("Profiles")}>Open profile</Button>
                    {profileContentAvailable ? (
                      <Button size="sm" variant="secondary" onClick={() => setScreen("Profiles")}>Analyze source</Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setScreen("Profiles")}>Add screenshot/example</Button>
                    )}
                  </>
                )}
                {routedResult.destination === "Media Library" && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setScreen("Media Library")}>View media</Button>
                    <Button size="sm" variant="secondary" onClick={startCreatePostFromIntake}>Create post from media</Button>
                  </>
                )}
                <Button size="sm" variant="secondary" onClick={resetIntake}>Add another source</Button>
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => saveDestination("Company Knowledge")} disabled={isSaving}>Save to Company Knowledge</Button>
            <Button variant="secondary" onClick={() => saveDestination("Opportunity Inbox")} disabled={isSaving}>Create Opportunity</Button>
            <Button variant="secondary" onClick={() => saveDestination("Profile Voice Source")} disabled={isSaving}>Save to Profile Voice Source</Button>
            <Button variant="secondary" onClick={() => saveDestination("Inspiration / Reference Profile")} disabled={isSaving}>Save to Inspiration / Reference Profile</Button>
            <Button variant="secondary" onClick={() => saveDestination("Media Library")} disabled={isSaving}>Save to Media Library</Button>
            <Button variant="secondary" onClick={() => saveDestination("Create Post / Content Brief")} disabled={isSaving}>Start Create Post</Button>
            <Button variant="secondary" onClick={() => saveDestination("Manual review only")} disabled={isSaving}>Save for Manual Review</Button>
            <Button onClick={() => saveDestination()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Confirm and save"}
            </Button>
          </div>
        </Card>
      )}

        </>
      )}

      {intakeView === "History" && (
      <Card className="p-5">
        <h3 className="text-lg font-bold">Recent intake history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Classified and saved sources will appear here.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-white p-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Pill>{item.status}</Pill>
                      <Pill>{item.destination}</Pill>
                      {item.confidence && <Pill>{item.confidence} confidence</Pill>}
                    </div>
                    <p className="mt-2 font-bold">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.actionTaken || item.inputSummary || "No routing detail saved."}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{formatShortDateTime(item.createdAt)}</p>
                  </div>
                  {item.destinationScreen && (
                    <Button size="sm" variant="secondary" onClick={() => setScreen(item.destinationScreen!)}>
                      Open destination
                    </Button>
                  )}
                </div>
                <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer font-bold">Triage history</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <AnalysisBlock label="Original input" value={item.inputSummary || "No input summary saved."} />
                    <AnalysisBlock label="AI triage result" value={item.triage ? `${item.triage.sourceKind}\n${item.triage.why}` : "No triage detail saved."} />
                    <AnalysisBlock label="Destination" value={item.destination} />
                    <AnalysisBlock label="Confidence" value={item.confidence || item.triage?.confidence || "Not saved"} />
                    <AnalysisBlock label="Action taken" value={item.actionTaken || "No action detail saved."} />
                    <AnalysisBlock label="Created record" value={item.recordId || "No linked record id."} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
