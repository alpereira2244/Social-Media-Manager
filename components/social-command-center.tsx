"use client";

import {
  BarChart3,
  Check,
  Clipboard,
  BookOpen,
  FileText,
  Heart,
  MessageCircle,
  PenLine,
  Plus,
  Repeat2,
  Send,
  Sparkles,
  ListChecks,
  Upload,
  Users,
  XCircle
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  defaultBrandVoice,
  defaultPastPosts,
  initialCampaigns,
  initialLibrarySources,
  initialProfiles,
  initialVoiceSources,
  librarySourceCategories,
  librarySourcePlatforms,
  platforms,
  profileTypes,
  sourceUrlTypes,
  syncStatuses,
  voiceSourcePurposes,
  voiceSourcePlatforms,
  voiceSourceTypes
} from "@/lib/mock-data";
import type {
  ApprovedPostMemory,
  BrandSafetyCheck,
  BrandVoiceProfile,
  Campaign,
  CampaignMediaContext,
  CampaignTemplate,
  ContentAngle,
  GeneratedPost,
  LibrarySource,
  LibrarySourceAnalysis,
  LibrarySourceCategory,
  LibrarySourcePlatform,
  MediaAsset,
  Platform,
  PostQueueItem,
  PostStatus,
  QueueStatus,
  Profile,
  ProfileType,
  RejectedPostMemory,
  SimpleStyleChip,
  SourceUrlType,
  SyncStatus,
  VoiceAnalysis,
  VoiceSource,
  VoiceSourcePlatform,
  VoiceSourcePurpose,
  VoiceSourceType
} from "@/lib/types";
import {
  appUsesSupabase,
  deleteCampaignFromSupabase,
  deleteApprovedPostFromSupabase,
  deleteLibrarySourceFromSupabase,
  deleteMediaAssetFromSupabase,
  deleteProfileFromSupabase,
  getCurrentSupabaseUser,
  getOrCreateDefaultWorkspace,
  loadSupabaseData,
  recordPostFeedbackToSupabase,
  saveApprovedPostToSupabase,
  saveBrandRulesToSupabase,
  saveCampaignToSupabase,
  saveGeneratedPostToSupabase,
  saveLibrarySourceToSupabase,
  saveMediaAssetToSupabase,
  savePostQueueItemToSupabase,
  saveProfileToSupabase,
  saveRejectedPostToSupabase,
  sendPasswordResetEmail,
  signInWithPassword,
  signOutOfSupabase,
  signUpWithPassword,
  uploadKnowledgeDocumentToSupabase,
  uploadProfileAvatarToSupabase,
  type StorageMode,
  type WorkspaceContext
} from "@/lib/supabase/persistence";
import { cn } from "@/lib/utils";

type Screen =
  | "Dashboard"
  | "Profiles"
  | "Company Knowledge"
  | "Media Library"
  | "Brand Voice Rules"
  | "New Campaign"
  | "Repurpose"
  | "Content Library"
  | "Ready to Post"
  | "Review Drafts"
  | "Analytics"
  | "Connections";

const navSections: Array<{
  title: string;
  items: { label: Screen; icon: React.ElementType }[];
}> = [
  {
    title: "Operate",
    items: [
      { label: "Dashboard", icon: BarChart3 },
      { label: "New Campaign", icon: Plus },
      { label: "Review Drafts", icon: PenLine },
      { label: "Ready to Post", icon: ListChecks },
      { label: "Analytics", icon: BarChart3 }
    ]
  },
  {
    title: "Assets",
    items: [
      { label: "Content Library", icon: BookOpen },
      { label: "Repurpose", icon: Repeat2 },
      { label: "Media Library", icon: Upload }
    ]
  },
  {
    title: "Intelligence",
    items: [
      { label: "Profiles", icon: Users },
      { label: "Company Knowledge", icon: FileText },
      { label: "Brand Voice Rules", icon: Sparkles }
    ]
  },
  {
    title: "Settings / Integrations",
    items: [
      { label: "Connections", icon: Send }
    ]
  }
];

function screenTitle(screen: Screen) {
  if (screen === "New Campaign") return "Create Post";
  if (screen === "Review Drafts") return "Review Drafts";
  if (screen === "Ready to Post") return "Ready to Post";
  return screen;
}

function friendlyApprovalMessage(
  outcome: "saved" | "local" | "failed"
) {
  if (outcome === "saved") return "Saved to Ready to Post";
  if (outcome === "local") return "Saved locally. Sync needs attention.";
  return "Could not save. Open Debug details.";
}

const rawIdeaPlaceholder =
  "Example: This photo is from our new office/workshop. Write a founder post about building Conduit close to hardware, factories, and automation.";
const legacyGenericIdea =
  "Describe what happened, why it matters, and what the audience should take away.";
const contentAngles: ContentAngle[] = [
  "Founder build-in-public",
  "Deployment win",
  "Company update",
  "Customer proof",
  "Product launch",
  "Behind the scenes",
  "Industry POV",
  "Technical explanation",
  "Recruiting",
  "Event recap",
  "Other"
];

type CampaignTemplateConfig = {
  label: CampaignTemplate;
  contentAngle: ContentAngle | "";
  intentPlaceholder: string;
  detailsPlaceholder: string;
  mediaNotesPlaceholder: string;
  recommendedPlatforms: Platform[];
  helperQuestions: string[];
};

const campaignTemplateConfigs: Record<CampaignTemplate, CampaignTemplateConfig> = {
  "Founder build-in-public": {
    label: "Founder build-in-public",
    contentAngle: "Founder build-in-public",
    intentPlaceholder:
      "Example: Show what Conduit is building, why it matters, and what we learned from building close to the real workflow.",
    detailsPlaceholder:
      "Add notes about what you are building, what happened today, what surprised you, what you learned, and what the audience should understand.",
    mediaNotesPlaceholder:
      "What does the media show about the build? What was happening in the room, shop, factory, or workflow?",
    recommendedPlatforms: ["LinkedIn", "X", "Instagram"],
    helperQuestions: [
      "What are we building?",
      "Why does it matter?",
      "What did we learn?",
      "What should the audience feel or understand?"
    ]
  },
  "Deployment win": {
    label: "Deployment win",
    contentAngle: "Deployment win",
    intentPlaceholder:
      "Example: Show that Conduit deployed a real workflow quickly, replacing a slower manual process and proving practical impact.",
    detailsPlaceholder:
      "Add what was deployed, how long it took, what the old way required, what systems were involved, and what changed after deployment.",
    mediaNotesPlaceholder:
      "What deployment moment does the media show? Include location, workflow, speed, systems involved, and visible proof.",
    recommendedPlatforms: ["LinkedIn", "X"],
    helperQuestions: [
      "What was deployed?",
      "How long did it take?",
      "What would the old way require?",
      "What systems or workflows were involved?",
      "What business impact does this prove?"
    ]
  },
  "Customer proof": {
    label: "Customer proof",
    contentAngle: "Customer proof",
    intentPlaceholder:
      "Example: Show a concrete customer problem Conduit helped solve and the proof point we can safely share.",
    detailsPlaceholder:
      "Add the customer problem, what changed after Conduit, safe proof points, and anything that should stay confidential.",
    mediaNotesPlaceholder:
      "What customer proof does the media show? Note anything sensitive or confidential that should not be mentioned.",
    recommendedPlatforms: ["LinkedIn", "Instagram"],
    helperQuestions: [
      "What customer problem was solved?",
      "What changed after Conduit?",
      "What proof point can we safely share?",
      "What should stay confidential?"
    ]
  },
  "Product launch": {
    label: "Product launch",
    contentAngle: "Product launch",
    intentPlaceholder:
      "Example: Announce the launch, explain who it is for, and make the problem it solves immediately clear.",
    detailsPlaceholder:
      "Add what is launching, who it is for, what problem it solves, what is different, and what action people should take.",
    mediaNotesPlaceholder:
      "What launch asset or product moment does the media show? Note the feature, audience, and desired CTA.",
    recommendedPlatforms: ["LinkedIn", "X", "Instagram", "TikTok"],
    helperQuestions: [
      "What is launching?",
      "Who is it for?",
      "What problem does it solve?",
      "What makes it different?"
    ]
  },
  "Behind the scenes": {
    label: "Behind the scenes",
    contentAngle: "Behind the scenes",
    intentPlaceholder:
      "Example: Reveal how Conduit works behind the scenes and why that way of building matters.",
    detailsPlaceholder:
      "Add what we are showing, why it is meaningful, and what it reveals about how the team builds.",
    mediaNotesPlaceholder:
      "What behind-the-scenes detail is visible? Describe the environment, people, artifact, or workflow.",
    recommendedPlatforms: ["Instagram", "TikTok", "LinkedIn"],
    helperQuestions: [
      "What are we showing?",
      "Why is this meaningful?",
      "What does it reveal about how we build?"
    ]
  },
  "Industry POV": {
    label: "Industry POV",
    contentAngle: "Industry POV",
    intentPlaceholder:
      "Example: Explain what the industry is getting wrong and Conduit’s sharper point of view on what is changing.",
    detailsPlaceholder:
      "Add the misconception, what is changing now, why it matters, and Conduit’s point of view.",
    mediaNotesPlaceholder:
      "How does the media support the POV? Note the visible evidence or contrast with the old way.",
    recommendedPlatforms: ["LinkedIn", "X"],
    helperQuestions: [
      "What is the industry getting wrong?",
      "What is changing now?",
      "What is Conduit’s point of view?"
    ]
  },
  "Technical explanation": {
    label: "Technical explanation",
    contentAngle: "Technical explanation",
    intentPlaceholder:
      "Example: Explain a technical concept simply so industrial operators understand what changes in practice.",
    detailsPlaceholder:
      "Add the concept, what the audience should understand by the end, and a concrete analogy or example.",
    mediaNotesPlaceholder:
      "What technical detail is visible or audible? Explain what viewers should notice.",
    recommendedPlatforms: ["LinkedIn", "X", "TikTok"],
    helperQuestions: [
      "What concept are we explaining?",
      "What should the audience understand by the end?",
      "What analogy or example helps?"
    ]
  },
  Recruiting: {
    label: "Recruiting",
    contentAngle: "Recruiting",
    intentPlaceholder:
      "Example: Attract builders who want to work on real industrial automation problems close to the field.",
    detailsPlaceholder:
      "Add who we are trying to attract, what kind of work they will do, and why the mission is exciting.",
    mediaNotesPlaceholder:
      "What does the media show about the team, work environment, mission, or type of builder who would thrive here?",
    recommendedPlatforms: ["LinkedIn", "Instagram", "TikTok"],
    helperQuestions: [
      "Who are we trying to attract?",
      "What kind of work will they do?",
      "Why is this mission exciting?"
    ]
  },
  "Event recap": {
    label: "Event recap",
    contentAngle: "Event recap",
    intentPlaceholder:
      "Example: Recap what happened, who was there, and the takeaway people should remember.",
    detailsPlaceholder:
      "Add what happened, who was there, the key takeaway, and what should happen next.",
    mediaNotesPlaceholder:
      "What event moment does the media show? Include people, setting, takeaway, and next step.",
    recommendedPlatforms: ["LinkedIn", "Instagram", "X"],
    helperQuestions: [
      "What happened?",
      "Who was there?",
      "What was the takeaway?",
      "What should we do next?"
    ]
  },
  "Other / blank": {
    label: "Other / blank",
    contentAngle: "",
    intentPlaceholder:
      "Example: Show that Conduit is building close to hardware, factories, and real industrial operations.",
    detailsPlaceholder: "Add messy notes, context, or transcript snippets here.",
    mediaNotesPlaceholder:
      "What happened in this media? Why does it matter? What angle should the post take?",
    recommendedPlatforms: ["LinkedIn", "X", "Instagram"],
    helperQuestions: [
      "What is the specific point?",
      "Who should care?",
      "What proof or context should the post use?"
    ]
  }
};
const queueStatuses: QueueStatus[] = ["Ready", "Scheduled", "Posted", "Archived"];

type RepurposeSource = {
  type: "campaign" | "post";
  campaignId: string;
  postId?: string;
  label: string;
  content: string;
  mediaContext?: CampaignMediaContext;
  originalProfileId?: string;
};

const storageKeys = {
  campaigns: "scc.campaigns",
  activeCampaignId: "scc.activeCampaignId",
  profiles: "scc.profiles",
  pastPosts: "scc.pastPosts",
  brandVoice: "scc.brandVoice",
  voiceSources: "scc.voiceSources",
  librarySources: "scc.librarySources",
  mediaAssets: "scc.mediaAssets",
  approvedPosts: "scc.approvedPosts",
  rejectedPosts: "scc.rejectedPosts",
  postQueue: "scc.postQueue",
  useApprovedPosts: "scc.useApprovedPosts"
};

const acceptedMediaTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a"
];

const acceptedKnowledgeDocumentTypes = [
  ".txt",
  ".md",
  ".markdown",
  ".transcript",
  ".vtt",
  ".srt",
  ".pdf",
  ".docx",
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function readLocalValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalValue<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app should still be usable if browser storage is blocked.
  }
}

function compactVoice(profile: BrandVoiceProfile) {
  return {
    tone: profile.tone || defaultBrandVoice.tone,
    style: profile.style || defaultBrandVoice.style,
    audience: profile.audience || defaultBrandVoice.audience,
    avoid: profile.avoid || defaultBrandVoice.avoid
  };
}

function createVoiceAnalysis(
  source: Pick<VoiceSource, "name" | "type" | "platform" | "examples">
): VoiceAnalysis {
  const wordCount = source.examples.split(/\s+/).filter(Boolean).length;
  const isFounder = source.type === "Founder";
  const isCompany = source.type === "Company";
  const isSocial = source.type === "Social Team";
  const isShortForm = source.platform === "X" || source.platform === "TikTok";

  return {
    tone: isFounder
      ? "Personal, opinionated, reflective, direct"
      : isCompany
        ? "Clear, useful, polished, credibility-building"
        : isSocial
          ? "Energetic, conversational, culture-aware, concise"
          : "Specific, grounded, human, practical",
    commonHooks: isShortForm
      ? "Hot take:, POV:, Quick reminder:, The mistake is..."
      : "One thing we noticed..., The best teams..., Here is the shift..., A practical way to think about it...",
    commonPhrases:
      wordCount > 35
        ? "clear system, practical next step, useful signal, real workflow"
        : "simple idea, sharper message, better rhythm, less friction",
    sentenceStyle: isShortForm
      ? "Short lines, fast turns, punchy standalone sentences."
      : "Mix of medium-length explanation with crisp emphasis lines.",
    avoid: isFounder
      ? "Generic thought leadership, humblebrags, empty hustle language"
      : "Vague claims, buzzwords, overexplaining, captions that sound templated",
    bestUseCases:
      source.type === "Recruiting"
        ? "Hiring posts, team culture, candidate nurture, values-led campaigns"
        : source.type === "Customer Story"
          ? "Case studies, proof points, transformation stories, sales enablement"
          : `${source.name} works best for ${source.platform} campaigns, launches, POV posts, and message testing.`
  };
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function countUrls(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function getUrlType(source: { urlType?: SourceUrlType }) {
  return source.urlType ?? "Other";
}

function getSyncStatus(source: { syncStatus?: SyncStatus }) {
  return source.syncStatus ?? "Manual Only";
}

function getLastChecked(source: { lastChecked?: string }) {
  return source.lastChecked ?? "Never";
}

function currentCheckedAt() {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function hasStoredUrls(value?: string) {
  return countUrls(value ?? "") > 0;
}

function voiceSyncReadinessMessage(source: {
  urlType?: SourceUrlType;
  platform?: VoiceSourcePlatform;
}) {
  const urlType = getUrlType(source);

  if (urlType === "Social Profile URL" && source.platform === "X") {
    return "Ready for future X API sync. For now, paste example posts manually.";
  }

  if (urlType === "Social Profile URL" && source.platform === "LinkedIn") {
    return "LinkedIn post syncing requires approved LinkedIn API access. For now, paste example posts manually.";
  }

  if (urlType === "Website URL") {
    return "Website fetching can be added next. For now, paste page copy manually.";
  }

  if (urlType === "Document URL") {
    return "Document import can be added later. For now, paste useful excerpts manually.";
  }

  if (urlType === "Social Post URL") {
    return "Individual post syncing can be added later. For now, paste the post text manually.";
  }

  return "Manual reference only for now. Paste example posts manually.";
}

function librarySyncReadinessMessage(source: {
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

function looksLikeUrl(value?: string) {
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

function looksLikeGenericRawIdea(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return true;
  }

  const genericIdeas = [
    legacyGenericIdea.toLowerCase(),
    rawIdeaPlaceholder.toLowerCase(),
    "write a social post",
    "create a campaign",
    "make a post",
    "generate posts",
    "turn this into content",
    "content creation",
    "brand voice",
    "marketing workflow",
    "platform-ready social posts",
    "why it matters",
    "what the audience should take away",
    "product workflow launch",
    "brand voice consistent"
  ];

  return normalized.length < 24 || genericIdeas.some((item) => normalized.includes(item));
}

function looksLikeGenericIntent(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return true;
  }

  const genericIntent = [
    "describe what happened",
    "why it matters",
    "what the audience should take away",
    "write a post",
    "make content",
    "create a social post",
    "product workflow launch",
    "brand voice consistent"
  ];

  return normalized.length < 36 || genericIntent.some((item) => normalized.includes(item));
}

function genericLanguageWarnings(values: string[]) {
  const text = values.join(" ").toLowerCase();
  return [
    "Describe what happened",
    "why it matters",
    "what the audience should take away",
    "product workflow launch",
    "brand voice consistent"
  ].filter((phrase) => text.includes(phrase.toLowerCase()));
}

function looksLikeVagueMediaNotes(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return true;
  }

  return (
    normalized.length < 30 ||
    ["photo", "image", "video", "audio", "screenshot", "post about this"].includes(
      normalized
    )
  );
}

function cleanVoiceSourceName(value?: string) {
  if (!value || looksLikeUrl(value)) {
    return "Unnamed Voice Source";
  }

  return value;
}

function profileUrlValues(profile: Pick<
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

function countProfileUrls(profile: Pick<
  Profile,
  "linkedInUrl" | "xUrl" | "instagramUrl" | "tiktokUrl" | "websiteUrl" | "otherUrls"
>) {
  return profileUrlValues(profile).length;
}

function profileUrlsText(profile: Pick<
  Profile,
  "linkedInUrl" | "xUrl" | "instagramUrl" | "tiktokUrl" | "websiteUrl" | "otherUrls"
>) {
  return profileUrlValues(profile).join("\n");
}

function hasLinkedInOrXProfileUrl(profile: Pick<Profile, "linkedInUrl" | "xUrl" | "otherUrls">) {
  return Boolean(profile.linkedInUrl || profile.xUrl || /linkedin\.com|x\.com|twitter\.com/i.test(profile.otherUrls));
}

function hasWebsiteProfileUrl(profile: Pick<Profile, "websiteUrl" | "otherUrls">) {
  return Boolean(profile.websiteUrl || /https?:\/\/(?!.*(?:linkedin\.com|x\.com|twitter\.com))/i.test(profile.otherUrls));
}

function hasLinkedInOrXSourceUrl(source: Pick<LibrarySource, "urls" | "platform">) {
  return source.platform === "LinkedIn" || source.platform === "X" || /linkedin\.com|x\.com|twitter\.com/i.test(source.urls);
}

function hasWebsiteSourceUrl(source: Pick<LibrarySource, "urls" | "platform" | "category">) {
  return source.platform === "Website" || source.category === "Website" || source.category === "Blog" || /https?:\/\/(?!.*(?:linkedin\.com|x\.com|twitter\.com))/i.test(source.urls);
}

function extractUrls(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSocialUrl(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return [
      "linkedin.com",
      "x.com",
      "twitter.com",
      "instagram.com",
      "tiktok.com",
      "facebook.com",
      "fb.com",
      "youtube.com",
      "youtu.be"
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function firstWebsiteUrl(value: string) {
  return extractUrls(value).find((item) => /\./.test(item) && !isSocialUrl(item));
}

function mediaTypeFromFile(file: File): CampaignMediaContext["type"] | undefined {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return undefined;
}

function inferMediaKindFromUrl(url: string): CampaignMediaContext["type"] | undefined {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (/\.(png|jpe?g|webp)$/.test(lower)) return "image";
  if (/\.(mp4|mov|webm)$/.test(lower)) return "video";
  if (/\.(mp3|wav|m4a)$/.test(lower)) return "audio";
  return undefined;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const maxAiImageUploadBytes = 2_500_000;

function createMockMediaAnalysis(media?: CampaignMediaContext) {
  if (!media?.filename && !media?.notes) {
    return undefined;
  }

  const base =
    media.type === "image"
      ? "Image context was provided. Mock mode uses the filename and manual notes, not real vision analysis."
      : media.type === "video"
        ? "Video context was provided. Mock mode uses the filename and manual notes; transcription and frame analysis can be added later."
        : media.type === "audio"
          ? "Audio context was provided. Mock mode uses the filename and manual notes; transcription can be added later."
          : "Media context was provided.";

  return {
    description: `${base} File: ${media.filename ?? "Unnamed media"}. Notes: ${media.notes || "No manual notes provided."}`,
    angles: [
      "Behind-the-scenes proof",
      "Operational lesson",
      "Visual evidence for the campaign idea"
    ],
    captionIdeas: [
      "Turn the media into a concrete proof point.",
      "Use the notes to explain what changed.",
      "Pair the post with a simple CTA."
    ],
    warnings:
      media.type === "image"
        ? ["Mock mode did not inspect the image pixels."]
        : ["No transcription or frame analysis yet."]
  };
}

function createPersonalitySummary(
  profile: Pick<Profile, "name" | "type" | "role" | "bio" | "examples" | "notes">
) {
  const words = countWords(`${profile.bio} ${profile.examples} ${profile.notes}`);
  const isPerson =
    profile.type === "Founder" ||
    profile.type === "Team Member" ||
    profile.type === "Internal Voice";
  const isCompany = profile.type === "Company Account";
  const isInspiration =
    profile.type === "Inspiration / Reference" ||
    profile.type === "Competitor / Market Watch";

  return {
    voiceTraits: isInspiration
      ? "Use as pattern inspiration only, not as a voice to copy"
      : isPerson
      ? "Personal, specific, opinionated, experience-led"
      : isCompany
        ? "Clear, credible, useful, product-aware"
        : "Adaptable, practical, grounded, audience-aware",
    commonTopics: isCompany
      ? "Product value, customer pain, proof points, market education"
      : "Lessons learned, category POV, operating decisions, practical advice",
    commonHooks:
      words > 40
        ? "One thing I have learned..., The pattern we keep seeing..., Here is the practical version..."
        : "Quick take:, A useful way to think about this:, The mistake most teams make...",
    sentenceStyle: isPerson
      ? "Mix of short conviction lines with a few reflective explanations."
      : "Structured, scannable, benefit-led sentences with clear takeaways.",
    repeatedPhrases:
      words > 40
        ? "clear workflow, useful signal, practical next step, stronger message"
        : "simple system, sharper posts, better inputs, less guesswork",
    avoid: "Generic claims, invented proof, over-polished language, platform cliches",
    bestPlatforms: isCompany
      ? "LinkedIn, Instagram, X"
      : "LinkedIn, X, TikTok",
    bestUseCases: isInspiration
      ? `${profile.name || "This profile"} works best for studying structure, format, hooks, and creative patterns without copying wording or facts.`
      : `${profile.name || "This profile"} works best for ${profile.role || profile.type} POV posts, launch content, education, and campaign drafts.`
  };
}

function clearAppLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }

  Object.values(storageKeys).forEach((key) => window.localStorage.removeItem(key));
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("scc."))
    .forEach((key) => window.localStorage.removeItem(key));
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]) {
  return [
    ...primary,
    ...fallback.filter((fallbackItem) =>
      !primary.some((primaryItem) => primaryItem.id === fallbackItem.id)
    )
  ];
}

function persistLocalQueueFallback(items: PostQueueItem[]) {
  const existing = readLocalValue<PostQueueItem[]>(storageKeys.postQueue, []);
  writeLocalValue(storageKeys.postQueue, mergeById(items, existing));
}

function persistLocalApprovedFallback(items: ApprovedPostMemory[]) {
  const existing = readLocalValue<ApprovedPostMemory[]>(storageKeys.approvedPosts, []);
  writeLocalValue(storageKeys.approvedPosts, mergeById(items, existing));
}

function isInspirationProfile(profile: Profile) {
  return (
    profile.type === "Inspiration / Reference" ||
    profile.type === "Competitor / Market Watch"
  );
}

function isInternalVoiceProfile(profile: Profile) {
  return !isInspirationProfile(profile) && profile.type !== "Customer / Audience Persona";
}

function findDefaultPostingAccount(profiles: Profile[]) {
  return (
    profiles.find((profile) => profile.name.toLowerCase().includes("conduit")) ??
    profiles.find((profile) => profile.type === "Company Account") ??
    profiles[0]
  );
}

function createLibrarySourceAnalysis(
  source: Pick<LibrarySource, "name" | "category" | "platform" | "urls" | "content" | "notes">
): LibrarySourceAnalysis {
  const words = countWords(source.content);
  const hasUrls = countUrls(source.urls) > 0;
  const isWebsite = source.category === "Website" || source.platform === "Website";
  const isSocial =
    source.category === "Founder Social" || source.category === "Company Social";
  const isProof =
    source.category === "Customer Story" || source.category === "Investor";

  return {
    voiceTraits: isSocial
      ? "Conversational, timely, opinion-aware, easy to adapt"
      : isWebsite
        ? "Clear, structured, benefit-led, product-specific"
        : "Grounded, specific, useful, context-rich",
    commonTopics: isProof
      ? "Outcomes, proof, credibility, change over time"
      : isWebsite
        ? "Positioning, product value, workflow, customer pain points"
        : "Campaign ideas, audience education, category POV, repeatable systems",
    repeatedPhrases:
      words > 40
        ? "workflow, clarity, useful signal, consistent voice, approved posts"
        : "clear message, stronger source material, practical next step",
    strongHooks: hasUrls
      ? "The page says..., The clearest promise is..., The proof point worth reusing is..."
      : "A sharper way to say this..., The useful angle is..., Start with the problem...",
    proofPoints: isProof
      ? "Customer outcomes, investor narrative, before-and-after evidence"
      : "URLs saved for reference, pasted copy, recurring claims, source notes",
    avoid:
      "Inventing claims not present in the source, scraping URLs, overstating proof, generic filler",
    bestUseCases: `${source.name} is best for ${source.category.toLowerCase()} context, ${source.platform.toLowerCase()} adaptation, campaign briefs, and post substantiation.`
  };
}

function librarySourceBrief(sources: LibrarySource[]) {
  if (sources.length === 0) {
    return {
      names: [] as string[],
      label: "No Company Knowledge items selected",
      angle: "general product context",
      proof: "the campaign idea itself"
    };
  }

  const names = sources.map((source) => source.name);
  const topics = sources
    .map((source) => source.analysis.commonTopics.split(",")[0])
    .slice(0, 3)
    .join(", ");

  return {
    names,
    label: names.join(", "),
    angle: topics || "saved source context",
    proof: sources
      .map((source) => source.analysis.proofPoints.split(",")[0])
      .slice(0, 2)
      .join(" + ")
  };
}

function sourceFlavor(source?: VoiceSource) {
  if (!source) {
    return {
      angle: "brand-consistent",
      proof: "voice profile",
      instruction: "Keep the post clear, useful, and easy to edit."
    };
  }

  const flavors: Record<VoiceSourceType, { angle: string; proof: string; instruction: string }> = {
    Founder: {
      angle: "founder POV",
      proof: "personal conviction",
      instruction: "Make it sound like a founder explaining the problem from experience."
    },
    Company: {
      angle: "company narrative",
      proof: "product clarity",
      instruction: "Keep it polished, concrete, and useful without sounding corporate."
    },
    "Social Team": {
      angle: "social-first caption",
      proof: "platform fluency",
      instruction: "Make it quicker, more conversational, and easy to adapt."
    },
    "Customer Story": {
      angle: "customer transformation",
      proof: "before-and-after detail",
      instruction: "Frame the post around the user problem and the shift after solving it."
    },
    Investor: {
      angle: "market insight",
      proof: "category signal",
      instruction: "Make it analytical, confident, and tied to a broader market shift."
    },
    Recruiting: {
      angle: "team-building story",
      proof: "culture signal",
      instruction: "Make it human, values-led, and candidate-friendly."
    },
    Other: {
      angle: "specialized voice",
      proof: "source examples",
      instruction: "Borrow the source rhythm while keeping the message clear."
    }
  };

  return flavors[source.type];
}

function createMockPosts(
  campaignName: string,
  intent: string,
  contentAngle: ContentAngle,
  idea: string,
  selectedPlatforms: Platform[],
  brandRules: BrandVoiceProfile,
  selectedProfile?: Profile,
  librarySources: LibrarySource[] = [],
  mediaContext?: CampaignMediaContext,
  approvedExamples: ApprovedPostMemory[] = [],
  campaignTemplate?: CampaignTemplate,
  simpleStyles: SimpleStyleChip[] = [],
  simpleStyleInstructions: string[] = []
): GeneratedPost[] {
  const voice = compactVoice(brandRules);
  const profileName = selectedProfile?.name ?? "General Profile";
  const profileType = selectedProfile?.type ?? "Other";
  const influenceLine = selectedProfile
    ? `Posting account: ${profileName}. Use ${profileName} as the perspective.`
    : "Posting account: Conduit by default.";
  const libraryBrief = librarySourceBrief(librarySources);
  const mediaNote = mediaContext?.notes || mediaContext?.analysis?.description || "";
  const proofLine = mediaNote || idea || intent;
  const templateLine =
    campaignTemplate && campaignTemplate !== "Other / blank"
      ? ` The structure is guided by the ${campaignTemplate} template.`
      : "";
  const styleLine = simpleStyleInstructions.length > 0
    ? ` Style direction: ${simpleStyleInstructions.join(" ")}`
    : "";
  const concise = simpleStyles.includes("More concise");
  const bold = simpleStyles.includes("Bolder");
  const technical = simpleStyles.includes("More technical");
  const supportLine =
    librarySources.length > 0
      ? ` It connects to ${libraryBrief.angle.toLowerCase()} without turning into a generic pitch.`
      : "";
  const profileLead =
    profileType === "Company Account"
      ? `${profileName} is sharing this because`
      : `I keep coming back to this because`;
  const templates: Record<Platform, string> = {
    LinkedIn: concise
      ? `${bold ? "The signal is simple:" : "Quick thought:"} ${intent}\n\n${mediaNote || proofLine}\n\nBuild closer to the real workflow.`
      : `${profileLead} ${bold ? "automation work breaks when it is built too far from reality" : "the best automation work happens closest to the real workflow"}.\n\n${intent}\n\n${proofLine ? `The useful signal from this moment: ${proofLine}` : ""}${supportLine}\n\n${technical ? "The process detail matters: the system has to fit the handoffs, edge cases, and operational constraints already in motion." : "The takeaway is simple: build where the work actually happens, then let the product earn its way into the process."}\n\nRecommended media use: Use the media as the proof point for the opening line.\n\nOptional alt text: ${mediaNote || `Image connected to ${campaignName || contentAngle}.`}`,
    X: `${bold ? "Strong signal:" : ""}${intent}\n\n${technical ? "The workflow details matter more than the pitch." : "The best signal is usually in the messy workflow, not the polished pitch."}\n\n${mediaNote ? `Media context: ${mediaNote}` : `Angle: ${contentAngle}.`}\n\nRecommended media use: Pair the media with this short takeaway.\n\nOptional alt text: ${mediaNote || `Media for ${campaignName || contentAngle}.`}`,
    Instagram: `${intent}\n\n${mediaNote ? `What this moment shows: ${mediaNote}` : `A closer look at ${contentAngle.toLowerCase()}.`}\n\n${technical ? "The visible process matters because it shows where the system has to meet the real operation." : "The point is not to make the work look polished. It is to stay close enough to the real process to build something useful."}\n\nSuggested overlay text: ${mediaNote ? "Build where the workflow breaks" : contentAngle}\n\nCarousel slide ideas:\n1. The moment\n2. The workflow underneath it\n3. The pain point\n4. The build decision\n5. The takeaway\n\nCTA: Save this if your team is building around real operations.`,
    TikTok: `Hook: ${bold ? "Most automation misses this part." : "The real product work is hiding in the workflow."}\n\nShort script:\n1. Open on the uploaded media.\n2. Point out the real-world context: ${mediaNote || contentAngle}.\n3. Explain why this matters: ${intent}.\n4. Show the operational detail most teams would miss.\n5. Close with the practical takeaway.\n\nSuggested overlay text: Build where the workflow breaks\n\nShot list:\n- Uploaded media as the opening visual\n- Highlight the key detail\n- Quick founder explanation\n- Final takeaway screen\n\nCaption: ${intent}\n\nCTA: Follow for more practical build notes.`
  };

  return selectedPlatforms.map((platform, index) => ({
    id: `post-${Date.now()}-${platform}`,
    platform,
    status: "draft",
    score: Math.min(96, 84 + index * 3),
    generatedBy: "Mock",
    mediaUsed: Boolean(mediaContext?.filename || mediaContext?.notes),
    postCopy: templates[platform],
    content: templates[platform],
    rationale: `Mock draft shaped for ${platform}. ${influenceLine} Used the ${contentAngle} angle, campaign intent, and available media/context.${templateLine}${styleLine}`,
    recommendedMediaUse:
      mediaContext?.filename || mediaContext?.notes
        ? "Use the media as the proof point and connect the opening line to what the audience can see or hear."
        : "Use without media or pair with a simple visual that supports the main takeaway.",
    altText: mediaContext?.notes || mediaContext?.analysis?.description || "",
    overlayText:
      platform === "Instagram" || platform === "TikTok"
        ? mediaContext?.notes ? "Build where the workflow breaks" : contentAngle
        : "",
    cta:
      platform === "X"
        ? ""
        : "Save this if the takeaway is useful for your team.",
    hashtags:
      platform === "Instagram" || platform === "TikTok"
        ? ["#automation", "#manufacturing", "#buildinpublic"]
        : [],
    firstComment:
      platform === "LinkedIn"
        ? "The important part is staying close enough to the real workflow to notice what generic tools miss."
        : "",
    carouselIdeas:
      platform === "Instagram"
        ? ["The moment", "The workflow underneath it", "The pain point", "The build decision", "The takeaway"]
        : [],
    shotList:
      platform === "TikTok"
        ? ["Uploaded media as opening visual", "Highlight the key detail", "Quick founder explanation", "Final takeaway screen"]
        : [],
    profileId: selectedProfile?.id,
    profileName,
    profileType,
    profileRole: selectedProfile?.role,
    sourceLibraryIds: librarySources.map((source) => source.id),
    sourceLibraryNames: librarySources.map(getLibrarySourceDisplayName)
  }));
}

const demoBrandRules: BrandVoiceProfile = {
  tone: "Direct, founder-led, practical, plainspoken",
  style: "Specific examples, short hooks, concrete operational language, no corporate sheen",
  audience: "Industrial operators, automation teams, founders, system integrators, and manufacturing leaders",
  avoid: "Corporate fluff, vague AI claims, generic transformation language, jargon without proof"
};

function demoProfiles(): Profile[] {
  const base = [
    {
      id: "demo-profile-danny",
      name: "Demo - Danny Pereira",
      type: "Founder" as ProfileType,
      role: "Founder / CEO",
      bio: "Founder building Conduit close to hardware, factories, automation teams, and real industrial workflows.",
      linkedInUrl: "https://linkedin.com/in/demo-danny-pereira",
      xUrl: "https://x.com/demo_danny",
      instagramUrl: "",
      tiktokUrl: "",
      websiteUrl: "https://conduit.demo",
      otherUrls: "",
      examples: "We learn fastest when we are close to the floor. The best automation work starts with watching where the handoffs break, then building the smallest system that removes the drag.",
      notes: "Use for founder-led build-in-public posts.",
      syncStatus: "Manual Only" as SyncStatus,
      lastChecked: "Demo",
      updatedAt: "Demo"
    },
    {
      id: "demo-profile-sahil",
      name: "Demo - Sahil Patel",
      type: "Founder" as ProfileType,
      role: "Founder / CTO",
      bio: "Technical founder focused on reliable automation systems, integrations, and practical product architecture.",
      linkedInUrl: "https://linkedin.com/in/demo-sahil-patel",
      xUrl: "https://x.com/demo_sahil",
      instagramUrl: "",
      tiktokUrl: "",
      websiteUrl: "",
      otherUrls: "",
      examples: "The hard part is not the model. It is making sure the workflow survives real edge cases, messy inputs, and the operational details that show up after launch.",
      notes: "Use for technical explainers.",
      syncStatus: "Manual Only" as SyncStatus,
      lastChecked: "Demo",
      updatedAt: "Demo"
    },
    {
      id: "demo-profile-conduit",
      name: "Demo - Conduit",
      type: "Company Account" as ProfileType,
      role: "Company Account",
      bio: "Conduit helps industrial teams turn manual operational workflows into reliable automation systems.",
      linkedInUrl: "https://linkedin.com/company/conduit-demo",
      xUrl: "https://x.com/conduit_demo",
      instagramUrl: "",
      tiktokUrl: "",
      websiteUrl: "https://conduit.demo",
      otherUrls: "",
      examples: "Conduit works with operators and automation teams to map the real workflow first, then build systems that fit how the business actually runs.",
      notes: "Use for company updates and product positioning.",
      syncStatus: "Manual Only" as SyncStatus,
      lastChecked: "Demo",
      updatedAt: "Demo"
    }
  ];

  return base.map((profile) => ({
    ...profile,
    personality: createPersonalitySummary(profile)
  }));
}

function defaultConduitProfile(): Profile {
  const profileBase: Omit<Profile, "personality"> = {
    id: "profile-conduit-default",
    name: "Conduit",
    type: "Company Account",
    role: "Company Account",
    bio: "Conduit builds practical automation for industrial teams, close to hardware, factories, and real operations.",
    linkedInUrl: "",
    xUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    otherUrls: "",
    examples:
      "Conduit works close to the real workflow: the handoffs, the edge cases, the hardware, and the teams who run the operation every day.",
    notes: "Default company posting account for Conduit social media.",
    syncStatus: "Manual Only",
    lastChecked: "Never",
    updatedAt: new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric"
    }).format(new Date()),
    avatarUrl: "/conduit-logo.jpg",
    avatarStoragePath: "",
    whatWeLike: "",
    patternsToLearn: "",
    thingsNotToCopy: ""
  };

  return {
    ...profileBase,
    personality: createPersonalitySummary(profileBase)
  };
}

function demoKnowledgeBase(): LibrarySource[] {
  const items = [
    {
      id: "demo-kb-positioning",
      name: "Demo - Conduit Positioning",
      category: "Marketing" as LibrarySourceCategory,
      platform: "Document" as LibrarySourcePlatform,
      urls: "https://conduit.demo/positioning",
      urlType: "Website URL" as SourceUrlType,
      syncStatus: "Manual Only" as SyncStatus,
      lastChecked: "Demo",
      content: "Conduit helps industrial companies convert messy manual processes into dependable automation workflows. The wedge is staying close to operators, hardware, and existing systems instead of selling generic AI automation.",
      notes: "Core positioning for demo campaigns.",
      updatedAt: "Demo"
    },
    {
      id: "demo-kb-integrator-problem",
      name: "Demo - System Integrator Problem",
      category: "Customer Story" as LibrarySourceCategory,
      platform: "Document" as LibrarySourcePlatform,
      urls: "",
      urlType: "Document URL" as SourceUrlType,
      syncStatus: "Manual Only" as SyncStatus,
      lastChecked: "Demo",
      content: "System integrators often spend too much time translating between customer requirements, legacy systems, spreadsheets, vendor tools, and manual follow-up. The opportunity is to remove repeat coordination work without disrupting the systems already in place.",
      notes: "Use for pain/problem framing.",
      updatedAt: "Demo"
    },
    {
      id: "demo-kb-factory-pain",
      name: "Demo - Factory Automation Pain Points",
      category: "Website" as LibrarySourceCategory,
      platform: "Document" as LibrarySourcePlatform,
      urls: "",
      urlType: "Document URL" as SourceUrlType,
      syncStatus: "Manual Only" as SyncStatus,
      lastChecked: "Demo",
      content: "Factories struggle with brittle handoffs, tribal knowledge, inconsistent documentation, and operational work that lives between machines, people, and software. The best automation starts with the real process, not a generic tool pitch.",
      notes: "Use for factory and hardware-adjacent posts.",
      updatedAt: "Demo"
    }
  ];

  return items.map((item) => ({
    ...item,
    analysis: createLibrarySourceAnalysis(item)
  }));
}

function demoCampaign(profiles: Profile[], sources: LibrarySource[]): Campaign {
  const danny = profiles.find((profile) => profile.id === "demo-profile-danny");
  const conduit = profiles.find((profile) => profile.id === "demo-profile-conduit");
  const sourceIds = sources.map((source) => source.id);
  const sourceNames = sources.map((source) => source.name);
  const posts = createMockPosts(
    "Demo - Office Workshop Build-in-Public",
    "Show that Conduit is being built close to hardware, factories, and real industrial operations.",
    "Founder build-in-public",
    "Office workshop day. Whiteboards, hardware notes, workflow diagrams, and early customer conversations shaped the product direction.",
    ["LinkedIn", "X", "Instagram"],
    demoBrandRules,
    conduit,
    sources,
    {
      type: "image",
      filename: "demo-office-workshop.jpg",
      notes: "A hands-on office workshop with hardware and factory automation notes.",
      analysis: {
        description: "A workshop-style working session with notes, diagrams, and industrial automation context.",
        angles: ["Building close to the real workflow"],
        captionIdeas: ["Build where the workflow breaks"],
        warnings: []
      }
    }
  );

  if (posts[0]) {
    posts[0] = {
      ...posts[0],
      id: "demo-post-danny-linkedin",
      status: "approved"
    };
  }
  if (posts[1]) {
    posts[1] = {
      ...posts[1],
      id: "demo-post-danny-x",
      status: "approved"
    };
  }
  if (posts[2]) {
    posts[2] = {
      ...posts[2],
      id: "demo-post-danny-instagram"
    };
  }

  posts.push({
    id: "demo-post-conduit-linkedin",
    platform: "LinkedIn",
    status: "approved",
    content:
      "Demo: Conduit helps industrial teams turn operational drag into dependable automation. We start by mapping how the work actually moves between people, machines, and systems.",
    score: 92,
    generatedBy: "Mock",
    mediaUsed: false,
    profileId: conduit?.id,
    profileName: conduit?.name,
    profileType: conduit?.type,
    profileRole: conduit?.role,
    sourceLibraryIds: sourceIds,
    sourceLibraryNames: sourceNames
  });

  return {
    id: "demo-campaign-office-workshop",
    name: "Demo - Office Workshop Build-in-Public",
    idea: "Office workshop day. Whiteboards, hardware notes, workflow diagrams, and early customer conversations shaped the product direction.",
    intent: "Show that Conduit is being built close to hardware, factories, and real industrial operations.",
    contentAngle: "Founder build-in-public",
    campaignType: "Original",
    platforms: ["LinkedIn", "X", "Instagram"],
    posts,
    createdAt: "Demo",
    generatedBy: "Mock",
    mediaContext: {
      type: "image",
      filename: "demo-office-workshop.jpg",
      notes: "A hands-on office workshop with hardware and factory automation notes.",
      analysis: {
        description: "A workshop-style working session with notes, diagrams, and industrial automation context.",
        angles: ["Building close to the real workflow"],
        captionIdeas: ["Build where the workflow breaks"],
        warnings: []
      }
    },
    profileId: conduit?.id,
    profileName: conduit?.name,
    profileType: conduit?.type,
    profileRole: conduit?.role,
    voiceInfluenceIds: danny?.id ? [danny.id] : [],
    voiceInfluenceNames: danny?.name ? [danny.name] : [],
    inspirationProfileIds: [],
    inspirationProfileNames: [],
    sourceLibraryIds: sourceIds,
    sourceLibraryNames: sourceNames
  };
}

function demoApprovedPosts(): ApprovedPostMemory[] {
  return [
    {
      id: "demo-approved-danny-linkedin",
      profileId: "demo-profile-danny",
      campaignId: "demo-campaign-office-workshop",
      generatedPostId: "demo-post-danny-linkedin",
      platform: "LinkedIn",
      finalContent: "Demo: We are building Conduit as close to the actual workflow as possible. That means spending time with hardware notes, factory constraints, messy handoffs, and the people who know where the process really breaks.",
      contentAngle: "Founder build-in-public",
      intent: "Show that Conduit is built close to real industrial operations.",
      mediaUsed: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-approved-danny-x",
      profileId: "demo-profile-danny",
      campaignId: "demo-campaign-office-workshop",
      generatedPostId: "demo-post-danny-x",
      platform: "X",
      finalContent: "Demo: The best automation ideas do not start in a pitch deck. They start next to the workflow, where the handoffs are slow and the edge cases are obvious.",
      contentAngle: "Founder build-in-public",
      intent: "Show practical founder POV.",
      mediaUsed: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-approved-conduit-linkedin",
      profileId: "demo-profile-conduit",
      campaignId: "demo-campaign-office-workshop",
      generatedPostId: "demo-post-conduit-linkedin",
      platform: "LinkedIn",
      finalContent: "Demo: Conduit helps industrial teams turn operational drag into dependable automation. We start by mapping how the work actually moves between people, machines, and systems.",
      contentAngle: "Company update",
      intent: "Explain company positioning plainly.",
      mediaUsed: false,
      createdAt: new Date().toISOString()
    }
  ];
}

type AiVariant = Record<string, unknown>;
type AiGenerationData = Partial<Record<Platform, AiVariant[]>> & {
  mediaAnalysis?: CampaignMediaContext["analysis"];
};

function stringifyList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join("\n- ");
  }

  return typeof value === "string" ? value : "";
}

function arrayFromUnknown(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : typeof value === "string" && value.trim()
      ? value.split("\n").map((item) => item.replace(/^[-\d.\s]+/, "").trim()).filter(Boolean)
      : [];
}

function postPackageFromVariant(platform: Platform, variant: AiVariant, fallbackContent: string) {
  const postCopy = String(
    variant.postCopy ??
      variant.post ??
      variant.content ??
      variant.caption ??
      fallbackContent
  );

  return {
    postCopy,
    content: postCopy,
    rationale: String(variant.rationale ?? "Drafted from the selected brief, profile, media context, and platform format."),
    recommendedMediaUse: String(variant.recommendedMediaUse ?? ""),
    altText: String(variant.altText ?? ""),
    overlayText: String(variant.overlayText ?? ""),
    cta: String(variant.cta ?? ""),
    hashtags: arrayFromUnknown(variant.hashtags),
    firstComment: String(variant.firstComment ?? ""),
    carouselIdeas: arrayFromUnknown(variant.carouselIdeas ?? variant.carouselSlides),
    shotList: arrayFromUnknown(variant.shotList)
  };
}

function formatAiVariant(platform: Platform, variant: AiVariant, index: number) {
  if (platform === "LinkedIn") {
    return String(variant.post ?? variant.content ?? "");
  }

  if (platform === "X") {
    const post = String(variant.post ?? variant.content ?? "");
    const thread = stringifyList(variant.thread);
    return thread ? `${post}\n\nThread version:\n- ${thread}` : post;
  }

  if (platform === "Instagram") {
    const caption = String(variant.caption ?? variant.post ?? variant.content ?? "");
    const slides = stringifyList(variant.carouselSlides);
    const overlay = String(variant.overlayText ?? "");
    const cta = String(variant.cta ?? "");
    return [
      caption,
      overlay && `Suggested overlay text:\n${overlay}`,
      slides && `Carousel slide ideas:\n- ${slides}`,
      cta && `CTA:\n${cta}`
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const hook = String(variant.hook ?? `Variant ${index + 1}`);
  const script = String(variant.script ?? "");
  const shotList = stringifyList(variant.shotList);
  const overlay = String(variant.overlayText ?? "");
  const caption = String(variant.caption ?? "");
  const cta = String(variant.cta ?? "");
  return [
    `Hook: ${hook}`,
    script && `Short script:\n${script}`,
    shotList && `Shot list:\n- ${shotList}`,
    overlay && `Suggested overlay text:\n${overlay}`,
    caption && `Caption:\n${caption}`,
    cta && `CTA:\n${cta}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatRegeneratedPost(platform: Platform, post: AiVariant) {
  const content = String(post.content ?? post.post ?? post.caption ?? "");
  const recommendedMediaUse = String(post.recommendedMediaUse ?? "");
  const altText = String(post.altText ?? "");
  const overlayText = String(post.overlayText ?? "");
  const cta = String(post.cta ?? "");

  if (platform === "Instagram") {
    return [
      content,
      overlayText && `Suggested overlay text:\n${overlayText}`,
      recommendedMediaUse && `Recommended media use:\n${recommendedMediaUse}`,
      cta && `CTA:\n${cta}`
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (platform === "TikTok") {
    return [
      content,
      overlayText && `Suggested overlay text:\n${overlayText}`,
      recommendedMediaUse && `Recommended media use:\n${recommendedMediaUse}`,
      cta && `CTA:\n${cta}`
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    content,
    recommendedMediaUse && `Recommended media use:\n${recommendedMediaUse}`,
    altText && `Optional alt text:\n${altText}`,
    cta && `CTA:\n${cta}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

function postsFromAiResponse(
  data: AiGenerationData,
  selectedPlatforms: Platform[],
  selectedProfile?: Profile,
  librarySources: LibrarySource[] = [],
  mediaContext?: CampaignMediaContext
): GeneratedPost[] {
  return selectedPlatforms.flatMap((platform) => {
    const variants = Array.isArray(data?.[platform]) ? data[platform] ?? [] : [];
    return variants.slice(0, 3).map((variant, index) => {
      const postPackage = postPackageFromVariant(platform, variant, formatAiVariant(platform, variant, index));
      const post = {
        id: `post-${Date.now()}-${platform}-${index}`,
        platform,
        status: "draft" as PostStatus,
        score: Math.min(98, 88 + index * 2),
        generatedBy: "AI" as const,
        mediaUsed: Boolean(mediaContext?.filename || mediaContext?.notes),
        ...postPackage,
        profileId: selectedProfile?.id,
        profileName: selectedProfile?.name ?? "General Profile",
        profileType: selectedProfile?.type ?? "Other",
        profileRole: selectedProfile?.role,
        sourceLibraryIds: librarySources.map((source) => source.id),
        sourceLibraryNames: librarySources.map(getLibrarySourceDisplayName)
      };
      return {
        ...post,
        safetyCheck: runFallbackBrandSafetyCheck(post.postCopy ?? post.content, undefined, post)
      };
    });
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function imageDataUrlForGeneration(mediaContext: CampaignMediaContext | undefined, imageDataUrl: string) {
  // Image vision is handled by /api/analyze-media when the file is uploaded.
  // Keep /api/generate lightweight so larger photos cannot trigger a 413 response.
  void mediaContext;
  void imageDataUrl;
  return undefined;
}

async function readJsonResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 413 || /request entity too large|payload too large/i.test(text)) {
      throw new Error("The uploaded image is too large to send for AI generation. Use mock fallback, add media notes, or upload a smaller image.");
    }

    throw new Error(`${fallbackMessage}: ${text.slice(0, 120)}`);
  }
}

export function SocialCommandCenter() {
  const [screen, setScreen] = useState<Screen>("Dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [activeCampaignId, setActiveCampaignId] = useState(
    initialCampaigns[0]?.id ?? ""
  );
  const [campaignName, setCampaignName] = useState("");
  const [campaignTemplate, setCampaignTemplate] =
    useState<CampaignTemplate>("Other / blank");
  const [contentAngle, setContentAngle] = useState<ContentAngle | "">("");
  const [simpleStyleChips, setSimpleStyleChips] = useState<SimpleStyleChip[]>([
    "Conduit default"
  ]);
  const [intent, setIntent] = useState("");
  const [idea, setIdea] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "LinkedIn",
    "X",
    "Instagram"
  ]);
  const [uploadText, setUploadText] = useState(defaultPastPosts);
  const [brandVoice, setBrandVoice] =
    useState<BrandVoiceProfile>(defaultBrandVoice);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [approvedPosts, setApprovedPosts] = useState<ApprovedPostMemory[]>([]);
  const [rejectedPosts, setRejectedPosts] = useState<RejectedPostMemory[]>([]);
  const [postQueue, setPostQueue] = useState<PostQueueItem[]>([]);
  const [useApprovedPosts, setUseApprovedPosts] = useState(true);
  const [voiceSources, setVoiceSources] =
    useState<VoiceSource[]>(initialVoiceSources);
  const [librarySources, setLibrarySources] =
    useState<LibrarySource[]>(initialLibrarySources);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedLibrarySourceIds, setSelectedLibrarySourceIds] = useState<string[]>(
    initialLibrarySources[0] ? [initialLibrarySources[0].id] : []
  );
  const [selectedProfileId, setSelectedProfileId] = useState(
    initialProfiles[0]?.id ?? ""
  );
  const [selectedVoiceInfluenceIds, setSelectedVoiceInfluenceIds] = useState<string[]>([]);
  const [selectedInspirationProfileIds, setSelectedInspirationProfileIds] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");
  const [queueDebugMessage, setQueueDebugMessage] = useState("");
  const [approvingPostId, setApprovingPostId] = useState("");
  const [approveDebug, setApproveDebug] = useState({
    lastAction: "None yet",
    lastError: "",
    lastQueueItemId: ""
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingPostId, setRegeneratingPostId] = useState("");
  const [hasLoadedLocalData, setHasLoadedLocalData] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>(
    appUsesSupabase() ? "supabase" : "local"
  );
  const [mediaContext, setMediaContext] = useState<CampaignMediaContext>({});
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaImageDataUrl, setMediaImageDataUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [selectedMediaAssetId, setSelectedMediaAssetId] = useState("");
  const [repurposeSource, setRepurposeSource] = useState<RepurposeSource | null>(null);
  const [repurposePlatforms, setRepurposePlatforms] = useState<Platform[]>(["LinkedIn", "X"]);
  const [repurposeProfileId, setRepurposeProfileId] = useState("");
  const [repurposeContentAngle, setRepurposeContentAngle] = useState<ContentAngle | "">("");
  const [repurposeIntent, setRepurposeIntent] = useState("");
  const [repurposeLibrarySourceIds, setRepurposeLibrarySourceIds] = useState<string[]>([]);
  const [repurposeReuseMedia, setRepurposeReuseMedia] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    missingClient: string[];
    missingServer: string[];
    serviceRoleConfigured: boolean;
  }>({
    missingClient: [],
    missingServer: [],
    serviceRoleConfigured: true
  });
  const [authLoading, setAuthLoading] = useState(appUsesSupabase());
  const [authUserEmail, setAuthUserEmail] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    let authFallbackTimer: number | undefined;

    function loadLocalData() {
      if (authFallbackTimer) {
        window.clearTimeout(authFallbackTimer);
      }
      const savedCampaigns = readLocalValue<Campaign[]>(
        storageKeys.campaigns,
        initialCampaigns
      );
      const savedActiveId = readLocalValue<string>(
        storageKeys.activeCampaignId,
        savedCampaigns[0]?.id ?? initialCampaigns[0]?.id ?? ""
      );

      setCampaigns(savedCampaigns);
      setActiveCampaignId(
        savedCampaigns.some((campaign) => campaign.id === savedActiveId)
          ? savedActiveId
          : savedCampaigns[0]?.id ?? initialCampaigns[0]?.id ?? ""
      );
      setUploadText(readLocalValue(storageKeys.pastPosts, defaultPastPosts));
      setBrandVoice(readLocalValue(storageKeys.brandVoice, defaultBrandVoice));
      const savedProfiles = readLocalValue<Profile[]>(
        storageKeys.profiles,
        initialProfiles
      );
      setProfiles(savedProfiles);
      setSelectedProfileId(findDefaultPostingAccount(savedProfiles)?.id ?? savedProfiles[0]?.id ?? "");
      const savedVoiceSources = readLocalValue<VoiceSource[]>(
        storageKeys.voiceSources,
        initialVoiceSources
      );
      setVoiceSources(savedVoiceSources);
      const savedLibrarySources = readLocalValue<LibrarySource[]>(
        storageKeys.librarySources,
        initialLibrarySources
      );
      setLibrarySources(savedLibrarySources);
      setMediaAssets(readLocalValue<MediaAsset[]>(storageKeys.mediaAssets, []));
      setSelectedLibrarySourceIds(
        savedLibrarySources[0] ? [savedLibrarySources[0].id] : []
      );
      setApprovedPosts(readLocalValue(storageKeys.approvedPosts, []));
      setRejectedPosts(readLocalValue(storageKeys.rejectedPosts, []));
      const localQueue = readLocalValue<PostQueueItem[]>(storageKeys.postQueue, []);
      setPostQueue(localQueue);
      setQueueDebugMessage(`Local fallback loaded ${localQueue.length} queue item(s).`);
      console.info("[SCC] Ready to Post load", {
        storageMode: "local",
        localCount: localQueue.length
      });
      setUseApprovedPosts(readLocalValue(storageKeys.useApprovedPosts, true));
      setStorageMode("local");
      setHasLoadedLocalData(true);
      setAuthLoading(false);
    }

    async function loadData() {
      if (!appUsesSupabase()) {
        loadLocalData();
        return;
      }

      try {
        const user = await withTimeout(
          getCurrentSupabaseUser(),
          8000,
          "Supabase auth check timed out. Restart npm run dev or check Supabase env vars."
        );
        if (!user) {
          if (cancelled) return;
          setAuthUserEmail("");
          setWorkspace(null);
          setStorageMode("supabase");
          setHasLoadedLocalData(false);
          setAuthLoading(false);
          return;
        }

        const workspaceContext = await withTimeout(
          getOrCreateDefaultWorkspace(),
          8000,
          "Workspace setup timed out. Check Supabase schema and policies."
        );
        const data = await withTimeout(
          loadSupabaseData(workspaceContext.id),
          10000,
          "Loading workspace data timed out. Check Supabase connection."
        );
        if (cancelled) return;

        setAuthUserEmail(user.email ?? "");
        setWorkspace(workspaceContext);
        setCampaigns(data.campaigns);
        setActiveCampaignId(data.campaigns[0]?.id ?? "");
        setProfiles(data.profiles);
        setSelectedProfileId(findDefaultPostingAccount(data.profiles)?.id ?? data.profiles[0]?.id ?? "");
        setLibrarySources(data.librarySources);
        setMediaAssets(data.mediaAssets);
        setSelectedLibrarySourceIds(
          data.librarySources[0] ? [data.librarySources[0].id] : []
        );
        setBrandVoice(data.brandVoice ?? defaultBrandVoice);
        setApprovedPosts(data.approvedPosts);
        setRejectedPosts(data.rejectedPosts);
        const localQueueFallback = readLocalValue<PostQueueItem[]>(storageKeys.postQueue, []);
        const mergedQueue = mergeById(data.postQueue, localQueueFallback);
        setPostQueue(mergedQueue);
        setQueueDebugMessage(
          data.postQueueLoadError
            ? `Supabase queue fetch failed: ${data.postQueueLoadError}. Showing ${localQueueFallback.length} local fallback item(s).`
            : localQueueFallback.length > 0 && mergedQueue.length > data.postQueue.length
            ? `Supabase loaded ${data.postQueue.length} queue items. Added ${mergedQueue.length - data.postQueue.length} local fallback item(s).`
            : `Supabase loaded ${data.postQueue.length} queue item(s).`
        );
        console.info("[SCC] Ready to Post load", {
          storageMode: "supabase",
          supabaseCount: data.postQueue.length,
          localFallbackCount: localQueueFallback.length,
          mergedCount: mergedQueue.length
        });
        setUseApprovedPosts(readLocalValue(storageKeys.useApprovedPosts, true));
        setVoiceSources(readLocalValue(storageKeys.voiceSources, []));
        setStorageMode("supabase");
        setHasLoadedLocalData(true);
        setAuthLoading(false);
      } catch (error) {
        if (cancelled) return;
        loadLocalData();
        setGenerationNotice(
          error instanceof Error
            ? `Supabase load failed, so local fallback is active: ${error.message}`
            : "Supabase load failed, so local fallback is active."
        );
      }
    }

    if (appUsesSupabase()) {
      authFallbackTimer = window.setTimeout(() => {
        if (cancelled) return;
        console.warn("[SCC] Workspace check timed out. Loading local fallback.");
        loadLocalData();
        setGenerationNotice(
          "Workspace check timed out, so local browser mode is active. Restart npm run dev or check Supabase settings when you want shared data."
        );
      }, 12000);
    }

    loadData();

    return () => {
      cancelled = true;
      if (authFallbackTimer) {
        window.clearTimeout(authFallbackTimer);
      }
    };
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => readJsonResponse(response, "Status check failed"))
      .then((payload) => {
        setSupabaseStatus({
          missingClient: payload?.supabase?.missingClient ?? [],
          missingServer: payload?.supabase?.missingServer ?? [],
          serviceRoleConfigured: Boolean(payload?.supabase?.serviceRoleConfigured)
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.campaigns, campaigns);
  }, [campaigns, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.activeCampaignId, activeCampaignId);
  }, [activeCampaignId, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.profiles, profiles);
  }, [profiles, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.voiceSources, voiceSources);
  }, [voiceSources, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.pastPosts, uploadText);
  }, [uploadText, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.librarySources, librarySources);
  }, [librarySources, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.mediaAssets, mediaAssets);
  }, [mediaAssets, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.approvedPosts, approvedPosts);
  }, [approvedPosts, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.rejectedPosts, rejectedPosts);
  }, [rejectedPosts, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.postQueue, postQueue);
  }, [postQueue, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.useApprovedPosts, useApprovedPosts);
  }, [useApprovedPosts, hasLoadedLocalData]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0],
    [activeCampaignId, campaigns]
  );

  const allPosts = campaigns.flatMap((campaign) => campaign.posts);
  const approvedCount = allPosts.filter((post) => post.status === "approved").length;
  const rejectedCount = allPosts.filter((post) => post.status === "rejected").length;
  const draftCount = allPosts.filter((post) => post.status === "draft").length;
  const readyQueueCount = postQueue.filter((item) => normalizeQueueStatus(item.status) === "Ready").length;

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  async function handleMediaFile(file?: File) {
    if (!file) {
      return;
    }

    const mediaType = mediaTypeFromFile(file);
    if (!mediaType) {
      setGenerationError("Unsupported media type. Upload png, jpg, jpeg, webp, mp4, mov, webm, mp3, wav, or m4a.");
      return;
    }

    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setGenerationError("");
    setSelectedMediaAssetId("");
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setMediaContext((current) => ({
      ...current,
      type: mediaType,
      filename: file.name
    }));

    if (mediaType === "image") {
      if (file.size > maxAiImageUploadBytes) {
        setMediaImageDataUrl("");
        setMediaContext((current) => ({
          ...current,
          analysis: createMockMediaAnalysis({
            ...current,
            type: mediaType,
            filename: file.name
          })
        }));
        setGenerationNotice("Large image uploaded. Using the preview plus your media notes instead of sending the image to AI.");
        return;
      }

      try {
        setMediaImageDataUrl(await readFileAsDataUrl(file));
      } catch {
        setMediaImageDataUrl("");
        setGenerationError("Could not read that image for AI analysis. You can still use manual media notes.");
      }
    } else {
      setMediaImageDataUrl("");
    }
  }

  function clearMedia() {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl("");
    setMediaImageDataUrl("");
    setMediaFile(null);
    setMediaContext({});
    setSelectedMediaAssetId("");
  }

  function applyMediaAsset(asset: MediaAsset) {
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaFile(null);
    setMediaImageDataUrl("");
    setMediaPreviewUrl(asset.localPreviewUrl ?? asset.publicUrl ?? "");
    setSelectedMediaAssetId(asset.id);
    setMediaContext((current) => ({
      ...current,
      type: asset.mediaType,
      filename: asset.filename,
      notes: asset.notes || current.notes,
      assetId: asset.id,
      assetName: asset.filename,
      publicUrl: asset.publicUrl,
      storagePath: asset.storagePath,
      analysis: {
        description: asset.description,
        angles: asset.suggestedAngles,
        captionIdeas: asset.overlayText ? [asset.overlayText] : [],
        warnings: asset.sensitivityWarnings
      }
    }));
  }

  function buildCampaign(
    generatedBy: "AI" | "Mock",
    posts: GeneratedPost[],
    mediaAnalysis?: CampaignMediaContext["analysis"]
  ): Campaign {
    const effectiveIntent = intent.trim();
    const effectiveIdea = idea.trim() || effectiveIntent;
    const effectiveContentAngle =
      contentAngle || campaignTemplateConfigs[campaignTemplate].contentAngle || "Company update";
    const effectiveStyleInstructions = simpleStyleOptions
      .filter((style) => simpleStyleChips.includes(style.label))
      .map((style) => style.instruction);
    const effectiveCampaignName =
      campaignName.trim() || effectiveIntent.slice(0, 64) || "Untitled Campaign";
    const safePlatforms: Platform[] =
      selectedPlatforms.length > 0 ? selectedPlatforms : ["LinkedIn"];
    const selectedProfile = profiles.find(
      (profile) => profile.id === selectedProfileId
    );
    const selectedLibrarySources = selectedLibrarySourceIds.length > 0
      ? librarySources.filter((source) => selectedLibrarySourceIds.includes(source.id))
      : librarySources;
    const selectedVoiceInfluences = profiles.filter((profile) =>
      selectedVoiceInfluenceIds.includes(profile.id)
    );
    const selectedInspirationProfiles = profiles.filter((profile) =>
      selectedInspirationProfileIds.includes(profile.id)
    );
    return {
      id: `camp-${Date.now()}`,
      name: effectiveCampaignName,
      idea: effectiveIdea,
      intent: effectiveIntent,
      campaignTemplate:
        campaignTemplate === "Other / blank" ? undefined : campaignTemplate,
      contentAngle: effectiveContentAngle,
      campaignType: "Original",
      platforms: safePlatforms,
      posts,
      createdAt: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric"
      }).format(new Date()),
      generatedBy,
      mediaContext: mediaContext.filename || mediaContext.notes
        ? {
            ...mediaContext,
            analysis:
              mediaAnalysis ??
              mediaContext.analysis ??
              createMockMediaAnalysis(mediaContext)
          }
        : undefined,
      profileId: selectedProfile?.id,
      profileName: selectedProfile?.name,
      profileType: selectedProfile?.type,
      profileRole: selectedProfile?.role,
      voiceInfluenceIds: selectedVoiceInfluences.map((profile) => profile.id),
      voiceInfluenceNames: selectedVoiceInfluences.map((profile) => profile.name),
      inspirationProfileIds: selectedInspirationProfiles.map((profile) => profile.id),
      inspirationProfileNames: selectedInspirationProfiles.map((profile) => profile.name),
      simpleStyleChips,
      simpleStyleInstructions: effectiveStyleInstructions,
      sourceLibraryIds: selectedLibrarySources.map((source) => source.id),
      sourceLibraryNames: selectedLibrarySources.map(getLibrarySourceDisplayName)
    };
  }

  function createMockCampaign() {
    const safePlatforms: Platform[] =
      selectedPlatforms.length > 0 ? selectedPlatforms : ["LinkedIn"];
    const selectedProfile = profiles.find(
      (profile) => profile.id === selectedProfileId
    );
    const selectedLibrarySources = selectedLibrarySourceIds.length > 0
      ? librarySources.filter((source) => selectedLibrarySourceIds.includes(source.id))
      : librarySources;
    const selectedVoiceInfluences = profiles.filter((profile) =>
      selectedVoiceInfluenceIds.includes(profile.id)
    );
    const selectedInspirationProfiles = profiles.filter((profile) =>
      selectedInspirationProfileIds.includes(profile.id)
    );
    const selectedApprovedExamples =
      useApprovedPosts && selectedProfile
        ? approvedPosts
            .filter((post) => post.profileId === selectedProfile.id)
            .slice(0, 5)
        : [];

    return buildCampaign(
      "Mock",
      createMockPosts(
        campaignName.trim() || intent.trim().slice(0, 64) || "Untitled Campaign",
        intent.trim(),
        (contentAngle || campaignTemplateConfigs[campaignTemplate].contentAngle || "Company update") as ContentAngle,
        idea.trim() || intent.trim(),
        safePlatforms,
        brandVoice,
        selectedProfile,
        selectedLibrarySources,
        mediaContext,
        selectedApprovedExamples,
        campaignTemplate,
        simpleStyleChips,
        simpleStyleOptions
          .filter((style) => simpleStyleChips.includes(style.label))
          .map((style) => style.instruction)
      )
    );
  }

  function saveCampaign(newCampaign: Campaign) {
    const campaignWithSafety: Campaign = {
      ...newCampaign,
      posts: newCampaign.posts.map((post) => ({
        ...post,
        safetyCheck: post.safetyCheck ?? runFallbackBrandSafetyCheck(userFacingPostContent(post.content, newCampaign, post), newCampaign, post)
      }))
    };
    setCampaigns((current) => [campaignWithSafety, ...current]);
    setActiveCampaignId(campaignWithSafety.id);
    setScreen("Review Drafts");
    if (storageMode === "supabase") {
      saveCampaignToSupabase(campaignWithSafety, mediaFile).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Campaign save failed: ${error.message}`
            : "Campaign save failed."
        );
        setGenerationNotice(
          "Saved in this session. Shared sync needs attention."
        );
      });
    }
  }

  function openRepurposeCampaign(campaign: Campaign) {
    setRepurposeSource({
      type: "campaign",
      campaignId: campaign.id,
      label: campaign.name,
      content: [
        campaign.intent && `Intent: ${campaign.intent}`,
        campaign.contentAngle && `Content angle: ${campaign.contentAngle}`,
        campaign.idea && `Details: ${campaign.idea}`,
        campaign.posts
          .filter((post) => post.status === "approved")
          .slice(0, 3)
          .map((post) => `${post.platform}: ${userFacingPostContent(post.content, campaign, post)}`)
          .join("\n\n") || (campaign.posts[0] ? userFacingPostContent(campaign.posts[0].content, campaign, campaign.posts[0]) : "")
      ]
        .filter(Boolean)
        .join("\n\n"),
      mediaContext: campaign.mediaContext,
      originalProfileId: campaign.profileId
    });
    setRepurposeProfileId(campaign.profileId ?? profiles[0]?.id ?? "");
    setRepurposeContentAngle(campaign.contentAngle ?? "");
    setRepurposeIntent(campaign.intent ? `Adapt this for new platforms: ${campaign.intent}` : "");
    setRepurposeLibrarySourceIds(campaign.sourceLibraryIds ?? []);
    setRepurposeReuseMedia(Boolean(campaign.mediaContext));
    setRepurposePlatforms(campaign.platforms.length > 0 ? campaign.platforms : ["LinkedIn", "X"]);
    setGenerationError("");
    setGenerationNotice("");
    setScreen("Repurpose");
  }

  function openRepurposePost(campaign: Campaign, post: GeneratedPost) {
    setRepurposeSource({
      type: "post",
      campaignId: campaign.id,
      postId: post.id,
      label: `${campaign.name} · ${post.platform}`,
      content: userFacingPostContent(post.content, campaign, post),
      mediaContext: campaign.mediaContext,
      originalProfileId: campaign.profileId ?? post.profileId
    });
    setRepurposeProfileId(campaign.profileId ?? post.profileId ?? profiles[0]?.id ?? "");
    setRepurposeContentAngle(campaign.contentAngle ?? "");
    setRepurposeIntent(campaign.intent ? `Repurpose this post: ${campaign.intent}` : "");
    setRepurposeLibrarySourceIds(campaign.sourceLibraryIds ?? []);
    setRepurposeReuseMedia(Boolean(campaign.mediaContext));
    setRepurposePlatforms(platforms.filter((platform) => platform !== post.platform));
    setGenerationError("");
    setGenerationNotice("");
    setScreen("Repurpose");
  }

  function createMockRepurposeCampaign() {
    const source = repurposeSource;
    const selectedProfile = profiles.find((profile) => profile.id === repurposeProfileId);
    const selectedLibrarySources = librarySources.filter((sourceItem) =>
      repurposeLibrarySourceIds.includes(sourceItem.id)
    );
    const selectedApprovedExamples =
      useApprovedPosts && selectedProfile
        ? approvedPosts.filter((post) => post.profileId === selectedProfile.id).slice(0, 5)
        : [];
    const repurposeMediaContext =
      repurposeReuseMedia && source?.mediaContext ? source.mediaContext : {};
    const posts = createMockPosts(
      `Repurposed: ${source?.label ?? "source"}`,
      repurposeIntent.trim(),
      (repurposeContentAngle || "Other") as ContentAngle,
      `Repurpose source:\n${source?.content ?? ""}`,
      repurposePlatforms,
      brandVoice,
      selectedProfile,
      selectedLibrarySources,
      repurposeMediaContext,
      selectedApprovedExamples
    );

    return {
      ...buildCampaign("Mock", posts, repurposeMediaContext.analysis),
      id: `camp-${Date.now()}`,
      name: `Repurposed: ${source?.label ?? "source"}`,
      idea: `Repurposed from ${source?.label ?? "source"}\n\n${source?.content ?? ""}`,
      intent: repurposeIntent.trim(),
      contentAngle: repurposeContentAngle || undefined,
      campaignType: "Repurposed" as const,
      profileId: selectedProfile?.id,
      profileName: selectedProfile?.name,
      profileType: selectedProfile?.type,
      profileRole: selectedProfile?.role,
      sourceLibraryIds: selectedLibrarySources.map((item) => item.id),
      sourceLibraryNames: selectedLibrarySources.map((item) => item.name),
      repurposedFrom: source
        ? {
            type: source.type,
            campaignId: source.campaignId,
            postId: source.postId,
            label: source.label,
            content: source.content
          }
        : undefined,
      platforms: repurposePlatforms,
      mediaContext: repurposeMediaContext.filename || repurposeMediaContext.notes
        ? repurposeMediaContext
        : undefined
    };
  }

  function repurposeIssue() {
    if (!repurposeSource) return "Choose a source to repurpose.";
    if (!repurposeProfileId) return "Select a profile before repurposing.";
    if (repurposePlatforms.length === 0) return "Select at least one target platform.";
    if (!repurposeContentAngle) return "Choose a content angle.";
    if (looksLikeGenericIntent(repurposeIntent)) {
      return "Add a specific intent for what should change.";
    }
    return "";
  }

  async function handleRepurposeGenerate() {
    setGenerationError("");
    setGenerationNotice("");
    const issue = repurposeIssue();
    if (issue) {
      setGenerationError(issue);
      return;
    }

    const source = repurposeSource;
    const selectedProfile = profiles.find((profile) => profile.id === repurposeProfileId);
    const selectedLibrarySources = librarySources.filter((sourceItem) =>
      repurposeLibrarySourceIds.includes(sourceItem.id)
    );
    const selectedApprovedExamples =
      useApprovedPosts && selectedProfile
        ? approvedPosts.filter((post) => post.profileId === selectedProfile.id).slice(0, 5)
        : [];
    const repurposeMediaContext =
      repurposeReuseMedia && source?.mediaContext ? source.mediaContext : {};

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "repurpose",
          campaignTitle: `Repurposed: ${source?.label}`,
          intent: repurposeIntent.trim(),
          contentAngle: repurposeContentAngle,
          rawIdea: `Repurpose source:\n${source?.content ?? ""}`,
          selectedPlatforms: repurposePlatforms,
          profile: selectedProfile,
          approvedExamples: selectedApprovedExamples,
          brandVoice,
          sourceLibraryItems: selectedLibrarySources,
          mediaContext: repurposeMediaContext.filename || repurposeMediaContext.notes
            ? repurposeMediaContext
            : undefined,
          repurpose: {
            sourceType: source!.type,
            sourceLabel: source!.label,
            sourceContent: source!.content,
            reuseOriginalMedia: repurposeReuseMedia
          }
        })
      });
      const payload = await readJsonResponse(response, "OpenAI repurpose generation failed");
      if (payload?.fallbackReason === "missing_api_key") {
        saveCampaign(createMockRepurposeCampaign());
        setGenerationNotice("OPENAI_API_KEY is missing, so mock repurpose generation was used.");
        return;
      }
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "OpenAI repurpose generation failed.");
      }
      const aiPosts = postsFromAiResponse(
        payload.data,
        repurposePlatforms,
        selectedProfile,
        selectedLibrarySources,
        repurposeMediaContext
      );
      if (aiPosts.length === 0) {
        throw new Error("OpenAI returned no usable repurposed posts.");
      }
      const nextCampaign = createMockRepurposeCampaign();
      saveCampaign({
        ...nextCampaign,
        generatedBy: "AI",
        posts: aiPosts,
        mediaContext: repurposeMediaContext.filename || repurposeMediaContext.notes
          ? {
              ...repurposeMediaContext,
              analysis:
                payload.data?.mediaAnalysis ??
                repurposeMediaContext.analysis ??
                createMockMediaAnalysis(repurposeMediaContext)
            }
          : undefined
      });
      setGenerationNotice("Generated repurposed drafts with AI.");
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "OpenAI repurpose generation failed. You can use mock fallback instead."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function campaignBriefIssue() {
    if (selectedPlatforms.length === 0) {
      return "Select at least one platform before generating.";
    }
    if (looksLikeGenericIntent(intent)) {
      return "Add a main point so the AI knows what this post should say.";
    }
    return "";
  }

  async function handleGenerate() {
    setGenerationError("");
    setGenerationNotice("");

    const issue = campaignBriefIssue();
    if (issue) {
      setGenerationError(issue);
      return;
    }

    setIsGenerating(true);

    const safePlatforms: Platform[] =
      selectedPlatforms.length > 0 ? selectedPlatforms : ["LinkedIn"];
    const selectedProfile = profiles.find(
      (profile) => profile.id === selectedProfileId
    );
    const selectedLibrarySources = selectedLibrarySourceIds.length > 0
      ? librarySources.filter((source) => selectedLibrarySourceIds.includes(source.id))
      : librarySources;
    const selectedVoiceInfluences = profiles.filter((profile) =>
      selectedVoiceInfluenceIds.includes(profile.id)
    );
    const selectedInspirationProfiles = profiles.filter((profile) =>
      selectedInspirationProfileIds.includes(profile.id)
    );
    const selectedApprovedExamples =
      useApprovedPosts && selectedProfile
        ? approvedPosts
            .filter((post) => post.profileId === selectedProfile.id)
            .slice(0, 5)
        : [];

    try {
      const effectiveContentAngle =
        contentAngle || campaignTemplateConfigs[campaignTemplate].contentAngle || "Company update";
      const effectiveRawIdea = idea.trim() || intent.trim();
      const effectiveCampaignTitle =
        campaignName.trim() || intent.trim().slice(0, 64) || "Untitled Campaign";
      const generationImageDataUrl = imageDataUrlForGeneration(mediaContext, mediaImageDataUrl);
      if (mediaContext.type === "image" && mediaImageDataUrl && !generationImageDataUrl) {
        setGenerationNotice("Using your media notes and saved image analysis for generation.");
      }
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          campaignTitle: effectiveCampaignTitle,
          intent: intent.trim(),
          campaignTemplate:
            campaignTemplate === "Other / blank" ? undefined : campaignTemplate,
          contentAngle: effectiveContentAngle,
          simpleStyleChips,
          simpleStyleInstructions: simpleStyleOptions
            .filter((style) => simpleStyleChips.includes(style.label))
            .map((style) => style.instruction),
          rawIdea: effectiveRawIdea,
          selectedPlatforms: safePlatforms,
          profile: selectedProfile,
          voiceInfluences: selectedVoiceInfluences,
          inspirationProfiles: selectedInspirationProfiles,
          approvedExamples: selectedApprovedExamples,
          brandVoice,
          sourceLibraryItems: selectedLibrarySources,
          mediaContext:
            mediaContext.filename || mediaContext.notes
              ? {
                  ...mediaContext,
                  imageDataUrl: generationImageDataUrl
                }
              : undefined
        })
      });
      const payload = await readJsonResponse(response, "OpenAI generation failed");

      if (payload?.fallbackReason === "missing_api_key") {
        saveCampaign(createMockCampaign());
        setGenerationNotice("OPENAI_API_KEY is missing, so mock generation was used.");
        return;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "OpenAI generation failed.");
      }

      const aiPosts = postsFromAiResponse(
        payload.data,
        safePlatforms,
        selectedProfile,
        selectedLibrarySources,
        mediaContext
      );
      if (aiPosts.length === 0) {
        throw new Error("OpenAI returned no usable posts.");
      }
      saveCampaign(buildCampaign("AI", aiPosts, payload.data?.mediaAnalysis));
      setGenerationNotice("Generated with AI.");
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "OpenAI generation failed. You can use mock generation instead."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleMockFallback() {
    const issue = campaignBriefIssue();
    if (issue) {
      setGenerationError(issue);
      return;
    }

    setGenerationError("");
    setGenerationNotice(
      storageMode === "supabase"
        ? "Mock draft generated and saved."
        : "Mock draft generated."
    );
    saveCampaign(createMockCampaign());
  }

  function handleResetLocalData() {
    const confirmed = window.confirm(
      storageMode === "supabase"
        ? "Reset local test data in this browser? Shared data will not be deleted."
        : "Reset all local Social Command Center test data in this browser? This clears campaigns, posts, Brand Voice Rules, hidden legacy voice sources, Company Knowledge items, and imports."
    );
    if (!confirmed) {
      return;
    }

    clearAppLocalStorage();
    if (storageMode === "supabase") {
      setGenerationNotice("Local test data was reset. Shared data was not changed.");
      return;
    }

    setCampaigns([]);
    setActiveCampaignId("");
    setUploadText("");
    setBrandVoice(defaultBrandVoice);
    setProfiles([]);
    setApprovedPosts([]);
    setRejectedPosts([]);
    setPostQueue([]);
    setVoiceSources([]);
    setLibrarySources([]);
    setMediaAssets([]);
    setSelectedLibrarySourceIds([]);
    setSelectedProfileId("");
    clearMedia();
    setGenerationError("");
    setGenerationNotice("Local test data was reset.");
    setScreen("Dashboard");
  }

  function createDefaultConduitProfile() {
    const existing = profiles.find((item) => item.name.toLowerCase() === "conduit");
    if (existing) {
      setSelectedProfileId(existing.id);
      setGenerationNotice("Conduit profile selected.");
      return;
    }
    const profile = defaultConduitProfile();
    setProfiles((current) => [profile, ...current]);
    setSelectedProfileId(profile.id);
    persistProfile(profile);
    setGenerationNotice("Default Conduit profile created.");
  }

  function loadDemoData() {
    const confirmed = window.confirm(
      "This will add sample demo profiles, knowledge base items, brand rules, campaigns, and approved examples. It will not delete existing data."
    );
    if (!confirmed) return;

    const profilesDemo = demoProfiles();
    const sourcesDemo = demoKnowledgeBase();
    const campaignDemo = demoCampaign(profilesDemo, sourcesDemo);
    const approvedDemo = demoApprovedPosts();

    const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => [
      ...incoming,
      ...current.filter((item) => !incoming.some((next) => next.id === item.id))
    ];

    setProfiles((current) => mergeById(current, profilesDemo));
    setLibrarySources((current) => mergeById(current, sourcesDemo));
    setCampaigns((current) => mergeById(current, [campaignDemo]));
    setApprovedPosts((current) => mergeById(current, approvedDemo));
    setBrandVoice(demoBrandRules);
    setSelectedProfileId("demo-profile-conduit");
    setSelectedVoiceInfluenceIds(["demo-profile-danny"]);
    setActiveCampaignId("demo-campaign-office-workshop");
    setGenerationNotice("Demo data loaded.");

    if (storageMode === "supabase") {
      profilesDemo.forEach((profile) => persistProfile(profile));
      sourcesDemo.forEach((source) => persistLibrarySource(source));
      persistBrandRules(demoBrandRules);
      saveCampaignToSupabase(campaignDemo).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Demo campaign save failed: ${error.message}`
            : "Demo campaign save failed."
        );
        setGenerationNotice(
          "Demo data loaded. Shared sync needs attention."
        );
      });
      approvedDemo.forEach((memory) => {
        saveApprovedPostToSupabase(memory).catch(() => undefined);
      });
    }
  }

  function clearDemoData() {
    const confirmed = window.confirm(
      "Clear only sample demo data? Real user-created data will stay."
    );
    if (!confirmed) return;

    const isDemo = (item: { id: string; name?: string }) =>
      item.id.startsWith("demo-") || item.name?.startsWith("Demo -");
    const demoCampaignIds = new Set(
      campaigns.filter((campaign) => isDemo(campaign)).map((campaign) => campaign.id)
    );

    setProfiles((current) => current.filter((profile) => !isDemo(profile)));
    setLibrarySources((current) => current.filter((source) => !isDemo(source)));
    setCampaigns((current) => current.filter((campaign) => !isDemo(campaign)));
    setApprovedPosts((current) =>
      current.filter(
        (memory) =>
          !memory.id.startsWith("demo-") &&
          !memory.profileId.startsWith("demo-") &&
          !demoCampaignIds.has(memory.campaignId)
      )
    );
    setPostQueue((current) =>
      current.filter(
        (item) =>
          !item.id.startsWith("demo-") &&
          !item.profileId?.startsWith("demo-") &&
          !demoCampaignIds.has(item.campaignId)
      )
    );
    setActiveCampaignId((current) =>
      demoCampaignIds.has(current)
        ? campaigns.find((campaign) => !demoCampaignIds.has(campaign.id))?.id ?? ""
        : current
    );
    setSelectedProfileId((current) =>
      current.startsWith("demo-")
        ? profiles.find((profile) => !profile.id.startsWith("demo-"))?.id ?? ""
        : current
    );
    setGenerationNotice("Demo data cleared.");

    if (storageMode === "supabase") {
      profiles.filter((profile) => isDemo(profile)).forEach((profile) => removeProfile(profile.id));
      librarySources.filter((source) => isDemo(source)).forEach((source) => removeLibrarySource(source.id));
      campaigns.filter((campaign) => isDemo(campaign)).forEach((campaign) => {
        deleteCampaignFromSupabase(campaign.id).catch(() => undefined);
      });
      approvedPosts
        .filter((memory) => memory.id.startsWith("demo-") || memory.profileId.startsWith("demo-"))
        .forEach((memory) => {
          deleteApprovedPostFromSupabase(memory.id).catch(() => undefined);
        });
    }
  }

  function deleteCampaign(campaignId: string) {
    setCampaigns((current) => {
      const nextCampaigns = current.filter((campaign) => campaign.id !== campaignId);
      if (activeCampaignId === campaignId) {
        setActiveCampaignId(nextCampaigns[0]?.id ?? "");
      }
      return nextCampaigns;
    });
    setPostQueue((current) => current.filter((item) => item.campaignId !== campaignId));
    if (storageMode === "supabase") {
      deleteCampaignFromSupabase(campaignId).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Campaign delete failed: ${error.message}`
            : "Campaign delete failed."
        );
        setGenerationNotice(
          "Removed from this session. Shared sync needs attention."
        );
      });
    }
  }

  function updateQueueItem(id: string, updates: Partial<PostQueueItem>) {
    let nextItem: PostQueueItem | undefined;
    setPostQueue((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }
        nextItem = {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return nextItem;
      })
    );

    if (storageMode === "supabase" && nextItem) {
      savePostQueueItemToSupabase(nextItem).catch((error) => {
        persistLocalQueueFallback([nextItem!]);
        console.error("[SCC] Ready to Post update fell back to localStorage", error);
        const detail = error instanceof Error ? error.message : "Unknown Supabase queue update failure.";
        setQueueDebugMessage(`Supabase queue update failed: ${detail}`);
        setGenerationNotice(friendlyApprovalMessage("local"));
      });
    }
  }

  function updatePost(id: string, updates: Partial<GeneratedPost>) {
    let updatedPost: GeneratedPost | undefined;
    let previousPost: GeneratedPost | undefined;
    let variantNumber = 1;
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === activeCampaignId
          ? {
              ...campaign,
              posts: campaign.posts.map((post, index) => {
                if (post.id !== id) {
                  return post;
                }

                previousPost = post;
                updatedPost = { ...post, ...updates };
                variantNumber =
                  campaign.posts
                    .slice(0, index + 1)
                    .filter((item) => item.platform === post.platform).length || 1;
                return updatedPost;
              })
            }
          : campaign
      )
    );
    if (storageMode === "supabase" && updatedPost) {
      saveGeneratedPostToSupabase(activeCampaignId, updatedPost, variantNumber).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Post save failed: ${error.message}`
            : "Post save failed."
        );
        setGenerationNotice(
          "Saved in this session. Shared sync needs attention."
        );
      });
      if (updates.status) {
        recordPostFeedbackToSupabase(
          id,
          updates.status,
          undefined,
          updatedPost.content
        ).catch(() => undefined);
      }
    }
    if (updatedPost && previousPost?.status !== updates.status) {
      if (updates.status === "approved") {
        rememberApprovedPost(updatedPost);
        addPostToQueue(updatedPost, variantNumber);
      }
      if (updates.status === "rejected") {
        rememberRejectedPost(updatedPost);
      }
    }
  }

  function createApprovedMemory(post: GeneratedPost, campaign: Campaign) {
    const profileId = campaign.profileId ?? post.profileId;
    if (!profileId) {
      return undefined;
    }
    const finalContent = userFacingPostContent(post.content, campaign, post);

    return {
      id: `approved-${post.id}`,
      profileId,
      campaignId: campaign.id,
      generatedPostId: post.id,
      platform: post.platform,
      finalContent,
      supportingFields: supportingFieldsFromPost(post),
      contentAngle: campaign.contentAngle,
      intent: campaign.intent,
      mediaUsed: Boolean(post.mediaUsed || campaign.mediaContext?.filename),
      createdAt: new Date().toISOString()
    } satisfies ApprovedPostMemory;
  }

  function createQueueItem(post: GeneratedPost, campaign: Campaign) {
    const finalContent = userFacingPostContent(post.content, campaign, post);

    return {
      id: `queue-${post.id}`,
      profileId: campaign.profileId ?? post.profileId,
      profileName: campaign.profileName ?? post.profileName,
      campaignId: campaign.id,
      campaignName: campaign.name,
      generatedPostId: post.id,
      platform: post.platform,
      contentAngle: campaign.contentAngle,
      intent: campaign.intent,
      content: finalContent,
      postCopy: finalContent,
      ...supportingFieldsFromPost(post),
      mediaUsed: Boolean(post.mediaUsed || campaign.mediaContext?.filename),
      mediaAssetId: campaign.mediaContext?.assetId,
      mediaAssetName: campaign.mediaContext?.assetName ?? campaign.mediaContext?.filename,
      mediaPublicUrl: campaign.mediaContext?.publicUrl,
      mediaStoragePath: campaign.mediaContext?.storagePath,
      status: "Ready",
      plannedAt: "",
      livePostUrl: "",
      postedAt: "",
      publishNotes: "",
      metrics: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } satisfies PostQueueItem;
  }

  function moveApprovedToQueue(memory: ApprovedPostMemory) {
    const campaign = campaigns.find((item) => item.id === memory.campaignId);
    const generatedPost = campaign?.posts.find((post) => post.id === memory.generatedPostId);
    const profile = profiles.find((item) => item.id === memory.profileId);
    const fallbackCampaign: Campaign =
      campaign ?? {
        id: memory.campaignId,
        name: "Approved content",
        idea: "",
        intent: memory.intent,
        contentAngle: memory.contentAngle,
        platforms: [memory.platform],
        posts: [],
        createdAt: memory.createdAt,
        profileId: memory.profileId,
        profileName: profile?.name,
        profileType: profile?.type
      };
    const fallbackPost: GeneratedPost =
      generatedPost ?? {
        id: memory.generatedPostId,
        platform: memory.platform,
        postCopy: memory.finalContent,
        content: memory.finalContent,
        status: "approved",
        score: 85,
        mediaUsed: memory.mediaUsed,
        profileId: memory.profileId,
        profileName: profile?.name,
        profileType: profile?.type,
        ...memory.supportingFields
      };
    const queueItem = createQueueItem({ ...fallbackPost, status: "approved" }, fallbackCampaign);

    setPostQueue((current) => [
      queueItem,
      ...current.filter((item) => item.generatedPostId !== queueItem.generatedPostId)
    ]);
    setGenerationNotice("Saved to Ready to Post");
    setQueueDebugMessage(`Queued approved post from Content Library: ${queueItem.id}.`);

    if (storageMode === "supabase") {
      savePostQueueItemToSupabase(queueItem).catch((error) => {
        persistLocalQueueFallback([queueItem]);
        const detail = error instanceof Error ? error.message : "Unknown queue save failure.";
        setQueueDebugMessage(`Content Library queue save failed: ${detail}`);
        setGenerationNotice(friendlyApprovalMessage("local"));
      });
    } else {
      persistLocalQueueFallback([queueItem]);
    }
  }

  async function approvePost(post: GeneratedPost) {
    const campaign = activeCampaign;
    if (!campaign) {
      const message = "failed to update generated post: no active campaign found.";
      console.error("[SCC] Approve failed", { step: "active campaign", postId: post.id });
      setGenerationError(friendlyApprovalMessage("failed"));
      setApproveDebug({
        lastAction: "Approve failed before status update",
        lastError: message,
        lastQueueItemId: ""
      });
      return;
    }

    console.info("Approve clicked", {
      postId: post.id,
      campaignId: campaign.id,
      platform: post.platform
    });
    setApprovingPostId(post.id);
    setGenerationError("");
    setGenerationNotice("Approving...");
    setApproveDebug({
      lastAction: `Approve clicked for ${post.platform}`,
      lastError: "",
      lastQueueItemId: ""
    });

    const updatedPost: GeneratedPost = {
      ...post,
      status: "approved",
      safetyCheck: post.safetyCheck ?? runFallbackBrandSafetyCheck(userFacingPostContent(post.content, campaign, post), campaign, post)
    };
    const variantNumber =
      campaign.posts
        .slice(0, campaign.posts.findIndex((item) => item.id === post.id) + 1)
        .filter((item) => item.platform === post.platform).length || 1;
    const approvedMemory = createApprovedMemory(updatedPost, campaign);
    const queueItem = createQueueItem(updatedPost, campaign);

    try {
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                posts: item.posts.map((campaignPost) =>
                  campaignPost.id === post.id ? updatedPost : campaignPost
                )
              }
            : item
        )
      );
      console.info("[SCC] status updated", {
        postId: post.id,
        status: "approved"
      });

      if (approvedMemory) {
        setApprovedPosts((current) => [
          approvedMemory,
          ...current.filter((item) => item.generatedPostId !== post.id)
        ]);
      }
      setPostQueue((current) => [
        queueItem,
        ...current.filter((item) => item.generatedPostId !== post.id)
      ]);
      console.info("[SCC] queue state updated", {
        id: queueItem.id,
        generatedPostId: queueItem.generatedPostId,
        status: queueItem.status
      });
      setQueueDebugMessage(
        `Queued ${queueItem.platform} post with status Ready. Queue item: ${queueItem.id}.`
      );
      setApproveDebug({
        lastAction: "Queue state updated optimistically",
        lastError: "",
        lastQueueItemId: queueItem.id
      });

      if (storageMode === "supabase") {
        try {
          await saveGeneratedPostToSupabase(campaign.id, updatedPost, variantNumber);
          console.info("[SCC] generated post status saved", {
            postId: post.id,
            status: "approved"
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? `failed to update generated post: ${error.message}`
              : "failed to update generated post.";
          console.error("[SCC] failed to update generated post", error);
          persistLocalQueueFallback([queueItem]);
          if (approvedMemory) persistLocalApprovedFallback([approvedMemory]);
          console.info("[SCC] local fallback queue item saved", { id: queueItem.id });
          setGenerationNotice(friendlyApprovalMessage("local"));
          setQueueDebugMessage(`Generated post status save failed: ${message}`);
          setApproveDebug({
            lastAction: "Local fallback saved after generated post update failed",
            lastError: message,
            lastQueueItemId: queueItem.id
          });
          return;
        }

        if (approvedMemory) {
          try {
            await saveApprovedPostToSupabase(approvedMemory);
            console.info("[SCC] approved memory saved", {
              id: approvedMemory.id,
              generatedPostId: approvedMemory.generatedPostId
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? `failed to save approved memory: ${error.message}`
                : "failed to save approved memory.";
            console.error("[SCC] failed to save approved memory", error);
            persistLocalApprovedFallback([approvedMemory]);
            console.info("[SCC] local approved fallback saved", {
              id: approvedMemory.id
            });
            setGenerationNotice(friendlyApprovalMessage("local"));
            setQueueDebugMessage(`Approved memory save failed: ${message}`);
            setApproveDebug({
              lastAction: "Approved memory fallback saved locally",
              lastError: message,
              lastQueueItemId: queueItem.id
            });
          }
        }

        console.info("[SCC] post queue insert started", {
          id: queueItem.id,
          generatedPostId: queueItem.generatedPostId,
          campaignId: queueItem.campaignId,
          profileId: queueItem.profileId,
          platform: queueItem.platform,
          status: queueItem.status
        });
        try {
          await savePostQueueItemToSupabase(queueItem);
          console.info("[SCC] post queue insert succeeded", {
            id: queueItem.id,
            generatedPostId: queueItem.generatedPostId
          });
          setGenerationNotice(friendlyApprovalMessage("saved"));
          setApproveDebug({
            lastAction: friendlyApprovalMessage("saved"),
            lastError: "",
            lastQueueItemId: queueItem.id
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? `failed to insert queue item: ${error.message}`
              : "failed to insert queue item.";
          console.error("[SCC] post queue insert failed", error);
          persistLocalQueueFallback([queueItem]);
          console.info("[SCC] local fallback queue item saved", {
            id: queueItem.id
          });
          setGenerationNotice(friendlyApprovalMessage("local"));
          setQueueDebugMessage(`Queue insert failed: ${message}`);
          setApproveDebug({
            lastAction: "Local fallback queue item saved",
            lastError: message,
            lastQueueItemId: queueItem.id
          });
        }
      } else {
        if (approvedMemory) persistLocalApprovedFallback([approvedMemory]);
        persistLocalQueueFallback([queueItem]);
        console.info("[SCC] approved memory saved", { id: approvedMemory?.id });
        console.info("[SCC] local fallback queue item saved", { id: queueItem.id });
        setGenerationNotice(friendlyApprovalMessage("saved"));
        setApproveDebug({
          lastAction: "Approved and added to local Ready to Post",
          lastError: "",
          lastQueueItemId: queueItem.id
        });
      }
    } finally {
      setApprovingPostId("");
    }
  }

  function rememberApprovedPost(post: GeneratedPost) {
    const campaign = activeCampaign;
    const profileId = campaign?.profileId ?? post.profileId;
    if (!campaign || !profileId) {
      return;
    }
    const finalContent = userFacingPostContent(post.content, campaign, post);

    const memory: ApprovedPostMemory = {
      id: `approved-${post.id}`,
      profileId,
      campaignId: campaign.id,
      generatedPostId: post.id,
      platform: post.platform,
      finalContent,
      supportingFields: supportingFieldsFromPost(post),
      contentAngle: campaign.contentAngle,
      intent: campaign.intent,
      mediaUsed: Boolean(post.mediaUsed || campaign.mediaContext?.filename),
      createdAt: new Date().toISOString()
    };

    setApprovedPosts((current) => [
      memory,
      ...current.filter((item) => item.generatedPostId !== post.id)
    ]);
    if (storageMode === "supabase") {
      saveApprovedPostToSupabase(memory).catch((error) => {
        const detail = error instanceof Error ? error.message : "Unknown approved memory save failure.";
        setGenerationNotice(friendlyApprovalMessage("local"));
        setQueueDebugMessage(`Approved memory save failed: ${detail}`);
      });
    }
  }

  function addPostToQueue(post: GeneratedPost, variantNumber = 1) {
    const campaign = activeCampaign;
    if (!campaign) {
      return;
    }
    const finalContent = userFacingPostContent(post.content, campaign, post);

    const item: PostQueueItem = {
      id: `queue-${post.id}`,
      profileId: campaign.profileId ?? post.profileId,
      profileName: campaign.profileName ?? post.profileName,
      campaignId: campaign.id,
      campaignName: campaign.name,
      generatedPostId: post.id,
      platform: post.platform,
      contentAngle: campaign.contentAngle,
      intent: campaign.intent,
      content: finalContent,
      postCopy: finalContent,
      ...supportingFieldsFromPost(post),
      mediaUsed: Boolean(post.mediaUsed || campaign.mediaContext?.filename),
      mediaAssetId: campaign.mediaContext?.assetId,
      mediaAssetName: campaign.mediaContext?.assetName ?? campaign.mediaContext?.filename,
      mediaPublicUrl: campaign.mediaContext?.publicUrl,
      mediaStoragePath: campaign.mediaContext?.storagePath,
      status: "Ready",
      plannedAt: "",
      livePostUrl: "",
      postedAt: "",
      publishNotes: "",
      metrics: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPostQueue((current) => [
      item,
      ...current.filter((queueItem) => queueItem.generatedPostId !== post.id)
    ]);
    setGenerationNotice(friendlyApprovalMessage("saved"));
    setQueueDebugMessage(
      `Queued ${item.platform} post for ${item.profileName || "No profile"} with status Ready.`
    );
    console.info("[SCC] Added post to in-memory Ready to Post", {
      id: item.id,
      generatedPostId: item.generatedPostId,
      campaignId: item.campaignId,
      platform: item.platform,
      status: item.status,
      storageMode
    });

    if (storageMode === "supabase") {
      saveGeneratedPostToSupabase(campaign.id, post, variantNumber)
        .then(() => savePostQueueItemToSupabase(item))
        .catch((error) => {
          persistLocalQueueFallback([item]);
          console.error("[SCC] Ready to Post insert fell back to localStorage", error);
          const detail = error instanceof Error ? error.message : "Unknown Ready to Post save failure.";
          setQueueDebugMessage(
            `Supabase queue insert failed. Local fallback saved. ${detail}`
          );
          setGenerationNotice(friendlyApprovalMessage("local"));
        });
    } else {
      persistLocalQueueFallback([item]);
      console.info("[SCC] Saved Ready to Post item to local fallback", {
        id: item.id,
        generatedPostId: item.generatedPostId
      });
    }
  }

  function rememberRejectedPost(post: GeneratedPost) {
    const campaign = activeCampaign;
    if (!campaign) {
      return;
    }

    const memory: RejectedPostMemory = {
      id: `rejected-${post.id}`,
      profileId: campaign.profileId ?? post.profileId,
      campaignId: campaign.id,
      generatedPostId: post.id,
      platform: post.platform,
      rejectedContent: userFacingPostContent(post.content, campaign, post),
      contentAngle: campaign.contentAngle,
      intent: campaign.intent,
      createdAt: new Date().toISOString()
    };

    setRejectedPosts((current) => [
      memory,
      ...current.filter((item) => item.generatedPostId !== post.id)
    ]);
    if (storageMode === "supabase") {
      saveRejectedPostToSupabase(memory).catch(() => undefined);
    }
  }

  function createMockRegeneratedPost(post: GeneratedPost, instruction: string) {
    const mediaNote = mediaContext.notes || activeCampaign?.mediaContext?.notes || "";
    const intentLine = activeCampaign?.intent || intent || "the current campaign intent";
    const angleLine = activeCampaign?.contentAngle || contentAngle || "the selected content angle";
    const platformCopy: Record<Platform, string> = {
      LinkedIn: `I keep coming back to this: ${intentLine}\n\n${mediaNote ? `The media makes it concrete: ${mediaNote}\n\n` : ""}The requested change here is to ${instruction.toLowerCase()}.\n\nThe takeaway is simple: build from the real workflow, then make the product prove itself there.`,
      X: `${intentLine}\n\n${instruction}\n\n${mediaNote ? `Signal: ${mediaNote}` : `Angle: ${angleLine}`}`,
      Instagram: `${intentLine}\n\n${mediaNote ? `What this shows: ${mediaNote}` : `Angle: ${angleLine}`}\n\n${instruction}`,
      TikTok: `Hook: ${intentLine}\n\nShort script:\n1. Open on the media.\n2. Call out the real-world context.\n3. Make the requested change clear: ${instruction}.\n4. End with the practical takeaway.`
    };
    return {
      postCopy: platformCopy[post.platform],
      content: platformCopy[post.platform],
      rationale: `Regenerated with the instruction: ${instruction}`,
      recommendedMediaUse: "Use the uploaded media as the proof point and connect the copy directly to the requested change.",
      altText: mediaNote,
      overlayText: post.platform === "Instagram" || post.platform === "TikTok" ? "What changed here" : "",
      cta: "Save this draft if it captures the angle.",
      hashtags: post.hashtags ?? [],
      firstComment: post.firstComment,
      carouselIdeas: post.platform === "Instagram" ? ["The moment", "The change", "The takeaway"] : [],
      shotList: post.platform === "TikTok" ? ["Open on media", "Explain context", "Show takeaway"] : []
    };
  }

  async function regeneratePost(post: GeneratedPost, instruction: string) {
    if (!activeCampaign || !instruction.trim()) {
      return;
    }

    setRegeneratingPostId(post.id);
    const selectedProfile = profiles.find((profile) => profile.id === activeCampaign.profileId);
    const selectedLibrarySources = librarySources.filter((source) =>
      (activeCampaign.sourceLibraryIds ?? []).includes(source.id)
    );
    const generationImageDataUrl = imageDataUrlForGeneration(activeCampaign.mediaContext, mediaImageDataUrl);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "regenerate",
          campaignTitle: activeCampaign.name,
          intent: activeCampaign.intent ?? "",
          campaignTemplate: activeCampaign.campaignTemplate ?? "",
          contentAngle: activeCampaign.contentAngle ?? "",
          simpleStyleChips: activeCampaign.simpleStyleChips ?? [],
          simpleStyleInstructions: activeCampaign.simpleStyleInstructions ?? [],
          rawIdea: activeCampaign.idea,
          selectedPlatforms: [post.platform],
          profile: selectedProfile,
          brandVoice,
          sourceLibraryItems: selectedLibrarySources,
          mediaContext:
            activeCampaign.mediaContext
              ? {
                  ...activeCampaign.mediaContext,
                  imageDataUrl: generationImageDataUrl
                }
              : undefined,
          regeneration: {
            platform: post.platform,
            currentContent: userFacingPostContent(post.content, activeCampaign, post),
            instruction: instruction.trim()
          }
        })
      });
      const payload = await readJsonResponse(response, "OpenAI regeneration failed");

      if (payload?.fallbackReason === "missing_api_key") {
        const mockPackage = createMockRegeneratedPost(post, instruction);
        const mockPost = { ...post, ...mockPackage, generatedBy: "Mock" as const };
        updatePost(post.id, {
          previousContent: post.content,
          previousPostCopy: userFacingPostContent(post.content, activeCampaign, post),
          ...mockPackage,
          generatedBy: "Mock",
          safetyCheck: runFallbackBrandSafetyCheck(mockPackage.postCopy ?? mockPackage.content, activeCampaign, mockPost)
        });
        return;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "OpenAI regeneration failed.");
      }

      const nextPackage = postPackageFromVariant(
        post.platform,
        payload.data?.post ?? {},
        formatRegeneratedPost(post.platform, payload.data?.post ?? {})
      );
      if (!nextPackage.postCopy) {
        throw new Error("OpenAI returned no regenerated post.");
      }

      const nextPost = { ...post, ...nextPackage, generatedBy: "AI" as const };
      updatePost(post.id, {
        previousContent: post.content,
        previousPostCopy: userFacingPostContent(post.content, activeCampaign, post),
        ...nextPackage,
        generatedBy: "AI",
        safetyCheck: runFallbackBrandSafetyCheck(nextPackage.postCopy ?? nextPackage.content, activeCampaign, nextPost)
      });
    } catch {
      const mockPackage = createMockRegeneratedPost(post, instruction);
      const mockPost = { ...post, ...mockPackage, generatedBy: "Mock" as const };
      updatePost(post.id, {
        previousContent: post.content,
        previousPostCopy: userFacingPostContent(post.content, activeCampaign, post),
        ...mockPackage,
        generatedBy: "Mock",
        safetyCheck: runFallbackBrandSafetyCheck(mockPackage.postCopy ?? mockPackage.content, activeCampaign, mockPost)
      });
    } finally {
      setRegeneratingPostId("");
    }
  }

  function persistProfile(profile: Profile) {
    if (storageMode !== "supabase") return;
    saveProfileToSupabase(profile).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Profile save failed: ${error.message}`
          : "Profile save failed."
      );
      setGenerationNotice("Saved in this session. Shared sync needs attention.");
    });
  }

  function removeProfile(profileId: string) {
    if (storageMode !== "supabase") return;
    deleteProfileFromSupabase(profileId).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Profile delete failed: ${error.message}`
          : "Profile delete failed."
      );
      setGenerationNotice("Removed from this session. Shared sync needs attention.");
    });
  }

  function persistLibrarySource(source: LibrarySource) {
    if (storageMode !== "supabase") return;
    saveLibrarySourceToSupabase(source).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Company Knowledge save failed: ${error.message}`
          : "Company Knowledge save failed."
      );
      setGenerationNotice("Saved in this session. Shared sync needs attention.");
    });
  }

  async function persistMediaAsset(asset: MediaAsset, file?: File | null) {
    if (storageMode !== "supabase") {
      return asset;
    }

    try {
      return await saveMediaAssetToSupabase(asset, file) ?? asset;
    } catch (error) {
      setQueueDebugMessage(
        error instanceof Error
          ? `Media Library save failed: ${error.message}`
          : "Media Library save failed."
      );
      return asset;
    }
  }

  function removeMediaAsset(assetId: string) {
    setMediaAssets((current) => current.filter((asset) => asset.id !== assetId));
    if (selectedMediaAssetId === assetId) {
      setSelectedMediaAssetId("");
    }
    if (storageMode === "supabase") {
      deleteMediaAssetFromSupabase(assetId).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Media Library delete failed: ${error.message}`
            : "Media Library delete failed."
        );
      });
    }
  }

  function removeLibrarySource(sourceId: string) {
    if (storageMode !== "supabase") return;
    deleteLibrarySourceFromSupabase(sourceId).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Company Knowledge delete failed: ${error.message}`
          : "Company Knowledge delete failed."
      );
      setGenerationNotice("Removed from this session. Shared sync needs attention.");
    });
  }

  function persistBrandRules(nextBrandVoice: BrandVoiceProfile) {
    if (storageMode !== "supabase") return;
    saveBrandRulesToSupabase(nextBrandVoice).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Brand Voice Rules save failed: ${error.message}`
          : "Brand Voice Rules save failed."
      );
      setGenerationNotice("Saved in this session. Shared sync needs attention.");
    });
  }

  async function handleAuthSubmit(email: string, password: string, mode: "sign-in" | "sign-up") {
    setAuthLoading(true);
    try {
      const user =
        mode === "sign-up"
          ? await signUpWithPassword(email, password)
          : await signInWithPassword(email, password);
      if (!user) {
        throw new Error("Check your email to confirm your account, then sign in.");
      }
      const workspaceContext = await getOrCreateDefaultWorkspace();
      const data = await loadSupabaseData(workspaceContext.id);
      setAuthUserEmail(user.email ?? email);
      setWorkspace(workspaceContext);
      setCampaigns(data.campaigns);
      setActiveCampaignId(data.campaigns[0]?.id ?? "");
      setProfiles(data.profiles);
      setSelectedProfileId(findDefaultPostingAccount(data.profiles)?.id ?? data.profiles[0]?.id ?? "");
      setLibrarySources(data.librarySources);
      setMediaAssets(data.mediaAssets);
      setSelectedLibrarySourceIds(data.librarySources[0] ? [data.librarySources[0].id] : []);
      setBrandVoice(data.brandVoice ?? defaultBrandVoice);
      setApprovedPosts(data.approvedPosts);
      setRejectedPosts(data.rejectedPosts);
      setPostQueue(mergeById(data.postQueue, readLocalValue<PostQueueItem[]>(storageKeys.postQueue, [])));
      setStorageMode("supabase");
      setHasLoadedLocalData(true);
      setGenerationNotice("");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await signOutOfSupabase();
    setAuthUserEmail("");
    setWorkspace(null);
    setHasLoadedLocalData(false);
    setCampaigns([]);
    setProfiles([]);
    setLibrarySources([]);
    setApprovedPosts([]);
    setRejectedPosts([]);
    setPostQueue([]);
    setMediaAssets([]);
  }

  if (authLoading && appUsesSupabase()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Conduit Social Command Center</h1>
          <p className="mt-2 text-sm text-muted-foreground">Checking your workspace...</p>
        </Card>
      </main>
    );
  }

  if (appUsesSupabase() && storageMode === "supabase" && !authUserEmail) {
    return (
      <LoginScreen
        onSubmit={handleAuthSubmit}
        missingEnv={[...supabaseStatus.missingClient, ...supabaseStatus.missingServer]}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-5 px-4 py-4 lg:flex-row lg:px-5">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-32px)] lg:w-72">
          <div className="flex h-full flex-col rounded-lg border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-7">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/conduit-logo.jpg"
                  alt="Conduit logo"
                  className="h-11 w-11 rounded-md border border-slate-200 object-cover shadow-sm"
                />
                <div>
                  <h1 className="text-sm font-extrabold leading-5 text-foreground">
                    Conduit Social Command Center
                  </h1>
                  <p className="text-xs leading-5 text-slate-500">
                    Create, preview, approve, and track social posts.
                  </p>
                </div>
              </div>
            </div>

            <nav className="grid gap-5">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                    {section.title}
                  </p>
                  <div className="grid gap-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => setScreen(item.label)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950",
                            screen === item.label &&
                              "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          <Icon size={18} />
                          {screenTitle(item.label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-sm text-slate-700">
              <p className="font-semibold">
                {storageMode === "supabase" ? "Shared data connected" : "Local mode"}
              </p>
              {storageMode === "supabase" && (
                <div className="mt-2 rounded-md border border-white/70 bg-white/75 p-2 text-xs leading-5 text-foreground shadow-sm">
                  <p className="font-bold">{workspace?.name ?? "Conduit"}</p>
                  <p className="truncate">{authUserEmail}</p>
                  <p className="capitalize text-muted-foreground">{workspace?.role ?? "member"}</p>
                  <button className="mt-2 font-bold text-primary" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              )}
              <p className="mt-1 opacity-80">
                {storageMode === "supabase"
                  ? "Team workspace is active. Social posting connections are still off."
                  : "Data is saved in this browser until shared storage is configured."}
              </p>
              {storageMode === "local" && (
                <div className="mt-3 border-t border-teal-900/10 pt-3 text-xs leading-5 opacity-90">
                  {supabaseStatus.missingClient.length > 0 ||
                  supabaseStatus.missingServer.length > 0 ? (
                    <>
                      <p className="font-semibold">Missing env vars:</p>
                      {[...supabaseStatus.missingClient, ...supabaseStatus.missingServer].map(
                        (key) => (
                          <p key={key}>{key}</p>
                        )
                      )}
                    </>
                  ) : (
                    <p>
                      Env vars are present. If you recently added them, restart npm run dev.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <Header screen={screen} activeCampaign={activeCampaign} />
          {screen === "Dashboard" && (
            <Dashboard
              campaigns={campaigns}
              activeCampaignId={activeCampaignId}
              setActiveCampaignId={setActiveCampaignId}
              setScreen={setScreen}
              deleteCampaign={deleteCampaign}
              repurposeCampaign={openRepurposeCampaign}
              resetLocalData={handleResetLocalData}
              approvedCount={approvedCount}
              rejectedCount={rejectedCount}
              draftCount={draftCount}
              profileCount={profiles.length}
              librarySourceCount={librarySources.length}
              readyQueueCount={readyQueueCount}
              storageMode={storageMode}
              loadDemoData={loadDemoData}
              clearDemoData={clearDemoData}
            />
          )}
          {screen === "Analytics" && (
            <Analytics postQueue={postQueue} setScreen={setScreen} />
          )}
          {screen === "Connections" && (
            <Connections />
          )}
          {screen === "Content Library" && (
            <ContentLibrary
              campaigns={campaigns}
              approvedPosts={approvedPosts}
              postQueue={postQueue}
              profiles={profiles}
              setScreen={setScreen}
              updateQueueItem={updateQueueItem}
              moveApprovedToQueue={moveApprovedToQueue}
              repurposePost={openRepurposePost}
              mediaPreviewUrl={mediaPreviewUrl}
            />
          )}
          {screen === "Profiles" && (
            <Profiles
              profiles={profiles}
              approvedPosts={approvedPosts}
              setProfiles={setProfiles}
              selectedProfileId={selectedProfileId}
              setSelectedProfileId={setSelectedProfileId}
              persistProfile={persistProfile}
              removeProfile={removeProfile}
              storageMode={storageMode}
              createDefaultConduitProfile={createDefaultConduitProfile}
              loadDemoData={loadDemoData}
            />
          )}
          {screen === "Company Knowledge" && (
            <KnowledgeBase
              librarySources={librarySources}
              setLibrarySources={setLibrarySources}
              selectedLibrarySourceIds={selectedLibrarySourceIds}
              setSelectedLibrarySourceIds={setSelectedLibrarySourceIds}
              approvedPosts={approvedPosts}
              brandVoice={brandVoice}
              profiles={profiles}
              setScreen={setScreen}
              setCampaignName={setCampaignName}
              setContentAngle={setContentAngle}
              setIntent={setIntent}
              setIdea={setIdea}
              setSelectedProfileId={setSelectedProfileId}
              persistLibrarySource={persistLibrarySource}
              removeLibrarySource={removeLibrarySource}
              storageMode={storageMode}
            />
          )}
          {screen === "Media Library" && (
            <MediaLibrary
              mediaAssets={mediaAssets}
              setMediaAssets={setMediaAssets}
              persistMediaAsset={persistMediaAsset}
              removeMediaAsset={removeMediaAsset}
              campaigns={campaigns}
              approvedPosts={approvedPosts}
              onUseMediaAsset={(asset) => {
                applyMediaAsset(asset);
                setScreen("New Campaign");
              }}
              storageMode={storageMode}
            />
          )}
          {screen === "Brand Voice Rules" && (
            <BrandRules
              uploadText={uploadText}
              brandVoice={brandVoice}
              setBrandVoice={setBrandVoice}
              persistBrandRules={persistBrandRules}
              storageMode={storageMode}
            />
          )}
          {screen === "New Campaign" && (
            <NewCampaign
              campaignName={campaignName}
              setCampaignName={setCampaignName}
              campaignTemplate={campaignTemplate}
              setCampaignTemplate={setCampaignTemplate}
              contentAngle={contentAngle}
              setContentAngle={setContentAngle}
              simpleStyleChips={simpleStyleChips}
              setSimpleStyleChips={setSimpleStyleChips}
              intent={intent}
              setIntent={setIntent}
              useApprovedPosts={useApprovedPosts}
              setUseApprovedPosts={setUseApprovedPosts}
              idea={idea}
              setIdea={setIdea}
              mediaContext={mediaContext}
              setMediaContext={setMediaContext}
              mediaPreviewUrl={mediaPreviewUrl}
              mediaAssets={mediaAssets}
              selectedMediaAssetId={selectedMediaAssetId}
              applyMediaAsset={applyMediaAsset}
              handleMediaFile={handleMediaFile}
              clearMedia={clearMedia}
              brandVoice={brandVoice}
              selectedPlatforms={selectedPlatforms}
              setSelectedPlatforms={setSelectedPlatforms}
              togglePlatform={togglePlatform}
              profiles={profiles}
              selectedProfileId={selectedProfileId}
              setSelectedProfileId={setSelectedProfileId}
              selectedVoiceInfluenceIds={selectedVoiceInfluenceIds}
              setSelectedVoiceInfluenceIds={setSelectedVoiceInfluenceIds}
              selectedInspirationProfileIds={selectedInspirationProfileIds}
              setSelectedInspirationProfileIds={setSelectedInspirationProfileIds}
              librarySources={librarySources}
              selectedLibrarySourceIds={selectedLibrarySourceIds}
              setSelectedLibrarySourceIds={setSelectedLibrarySourceIds}
              generationError={generationError}
              generationNotice={generationNotice}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
              handleMockFallback={handleMockFallback}
              createDefaultConduitProfile={createDefaultConduitProfile}
            />
          )}
          {screen === "Repurpose" && (
            <RepurposeCampaign
              source={repurposeSource}
              campaigns={campaigns}
              profiles={profiles}
              selectedProfileId={repurposeProfileId}
              setSelectedProfileId={setRepurposeProfileId}
              targetPlatforms={repurposePlatforms}
              setTargetPlatforms={setRepurposePlatforms}
              contentAngle={repurposeContentAngle}
              setContentAngle={setRepurposeContentAngle}
              intent={repurposeIntent}
              setIntent={setRepurposeIntent}
              librarySources={librarySources}
              selectedLibrarySourceIds={repurposeLibrarySourceIds}
              setSelectedLibrarySourceIds={setRepurposeLibrarySourceIds}
              reuseMedia={repurposeReuseMedia}
              setReuseMedia={setRepurposeReuseMedia}
              generationError={generationError}
              generationNotice={generationNotice}
              isGenerating={isGenerating}
              setScreen={setScreen}
              setSource={setRepurposeSource}
              handleGenerate={handleRepurposeGenerate}
              handleMockFallback={() => {
                const issue = repurposeIssue();
                if (issue) {
                  setGenerationError(issue);
                  return;
                }
                saveCampaign(createMockRepurposeCampaign());
                setGenerationNotice("Mock repurpose fallback was used.");
              }}
            />
          )}
          {screen === "Ready to Post" && (
            <PostQueue
              queue={postQueue}
              campaigns={campaigns}
              profiles={profiles}
              updateQueueItem={updateQueueItem}
              setScreen={setScreen}
              mediaPreviewUrl={mediaPreviewUrl}
              queueDebugMessage={queueDebugMessage}
              storageMode={storageMode}
            />
          )}
          {screen === "Review Drafts" && (
            <ResultsEditor
              campaign={activeCampaign}
              rawIdeaIsGeneric={Boolean(
                activeCampaign?.idea.trim() && looksLikeGenericRawIdea(activeCampaign.idea)
              )}
              updatePost={updatePost}
              approvePost={approvePost}
              regeneratePost={regeneratePost}
              repurposePost={openRepurposePost}
              regeneratingPostId={regeneratingPostId}
              approvingPostId={approvingPostId}
              generationNotice={generationNotice}
              generationError={generationError}
              approveDebug={approveDebug}
              setScreen={setScreen}
              mediaPreviewUrl={mediaPreviewUrl}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function LoginScreen({
  onSubmit,
  missingEnv
}: {
  onSubmit: (email: string, password: string, mode: "sign-in" | "sign-up") => Promise<void>;
  missingEnv: string[];
}) {
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setIsSubmitting(true);
    try {
      await onSubmit(email.trim(), password, mode);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasswordReset(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setIsResetSubmitting(true);
    try {
      await sendPasswordResetEmail((resetEmail || email).trim());
      setResetMessage("If an account exists, a reset link has been sent.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not send reset email.");
    } finally {
      setIsResetSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/conduit-logo.jpg" alt="Conduit logo" className="h-12 w-12 rounded-md object-cover" />
          <div>
            <h1 className="text-xl font-bold">Conduit Social Command Center</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
          </div>
        </div>

        {!showForgotPassword ? (
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div>
            <FieldLabel label="Email" htmlFor="auth-email" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel label="Password" htmlFor="auth-password" />
              {mode === "sign-in" && (
                <button
                  type="button"
                  className="text-sm font-bold text-primary"
                  onClick={() => {
                    setError("");
                    setResetMessage("");
                    setResetEmail(email);
                    setShowForgotPassword(true);
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>
          {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {missingEnv.length > 0 && (
            <p className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Missing Supabase env vars: {missingEnv.join(", ")}. Local development fallback only works when Supabase is not configured.
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={submitPasswordReset}>
            <div>
              <h2 className="text-lg font-bold">Reset your password</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Enter your email and we will send a Supabase password reset link.
              </p>
            </div>
            <div>
              <FieldLabel label="Email" htmlFor="reset-email" />
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@company.com"
                required
              />
            </div>
            <Button type="submit" disabled={isResetSubmitting}>
              {isResetSubmitting ? "Sending..." : "Send reset link"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError("");
                setShowForgotPassword(false);
              }}
            >
              Back to sign in
            </Button>
          </form>
        )}

        {resetMessage && (
          <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            {resetMessage}
          </p>
        )}

        {!showForgotPassword && (
          <button
            type="button"
            className="mt-4 text-sm font-bold text-primary"
            onClick={() => {
              setError("");
              setResetMessage("");
              setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
            }}
          >
            {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        )}
      </Card>
    </main>
  );
}

function Header({
  screen,
  activeCampaign
}: {
  screen: Screen;
  activeCampaign?: Campaign;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-end">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{screenTitle(screen)}</p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          {screen === "Dashboard" ? "Conduit Social Command Center" : screenTitle(screen)}
        </h2>
        {screen === "Dashboard" && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create, preview, approve, and track social posts.
          </p>
        )}
      </div>
      {activeCampaign && (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active campaign</span>
          <p className="font-semibold">{activeCampaign.name}</p>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  campaigns,
  activeCampaignId,
  setActiveCampaignId,
  setScreen,
  deleteCampaign,
  repurposeCampaign,
  resetLocalData,
  approvedCount,
  rejectedCount,
  draftCount,
  profileCount,
  librarySourceCount,
  readyQueueCount,
  storageMode,
  loadDemoData,
  clearDemoData
}: {
  campaigns: Campaign[];
  activeCampaignId: string;
  setActiveCampaignId: (id: string) => void;
  setScreen: (screen: Screen) => void;
  deleteCampaign: (id: string) => void;
  repurposeCampaign: (campaign: Campaign) => void;
  resetLocalData: () => void;
  approvedCount: number;
  rejectedCount: number;
  draftCount: number;
  profileCount: number;
  librarySourceCount: number;
  readyQueueCount: number;
  storageMode: StorageMode;
  loadDemoData: () => void;
  clearDemoData: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Quick actions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, preview, approve, and track Conduit social posts without touching advanced setup.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Button onClick={() => setScreen("New Campaign")}>Create a post</Button>
            <Button variant="secondary" onClick={() => setScreen("Review Drafts")}>Review drafts</Button>
            <Button variant="secondary" onClick={() => setScreen("Ready to Post")}>Ready to post</Button>
            <Button variant="secondary" onClick={() => setScreen("Repurpose")}>Repurpose content</Button>
            <Button variant="secondary" onClick={() => setScreen("Profiles")}>Manage profiles</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Drafts across campaigns" value={draftCount} />
        <Metric label="Approved across campaigns" value={approvedCount} />
        <Metric label="Rejected across campaigns" value={rejectedCount} />
        <Metric label="Saved profiles" value={profileCount} />
        <Metric label="Ready to post" value={readyQueueCount} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Recent campaigns</h3>
              <p className="text-sm text-muted-foreground">
                Plan Conduit posts, founder-led updates, and repurposed content from one workflow.
              </p>
            </div>
            <Button onClick={() => setScreen("New Campaign")}>
              <Plus size={16} /> New
            </Button>
          </div>
          <div className="grid gap-3">
            {campaigns.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
                No posts yet. Create a post to generate drafts.
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={cn(
                    "rounded-lg border p-4 shadow-sm transition hover:border-primary hover:bg-teal-50",
                    activeCampaignId === campaign.id
                      ? "border-primary bg-teal-50"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <button
                    onClick={() => setActiveCampaignId(campaign.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{campaign.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill>{campaign.campaignType ?? "Original"}</Pill>
                          {campaign.repurposedFrom && (
                            <Pill>From: {campaign.repurposedFrom.label}</Pill>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{campaign.idea}</p>
                        {campaign.profileName && (
                          <p className="mt-2 text-sm font-semibold text-primary">
                            Profile: {campaign.profileName} · {campaign.profileType}
                          </p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                        {campaign.createdAt}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.platforms.map((platform) => (
                        <Pill key={platform}>{platform}</Pill>
                      ))}
                    </div>
                  </button>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => repurposeCampaign(campaign)}
                    >
                      Repurpose campaign
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      Delete campaign
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="p-5">
            <h3 className="text-lg font-bold">Recommended demo flow</h3>
            <div className="mt-4 grid gap-2">
              {[
                "Load demo data",
                "Create Post",
                "Review Drafts",
                "Approve one",
                "Ready to Post",
                "Repurpose content"
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-sm font-bold shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-primary">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Demo mode</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Load labeled sample profiles, Company Knowledge items, Brand Voice Rules, a campaign, and approved examples for presentations.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={loadDemoData}>
                <Sparkles size={16} /> Load demo data
              </Button>
              <Button variant="secondary" onClick={clearDemoData}>
                Clear demo data
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo data is clearly labeled and will not duplicate if loaded more than once.
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">Workflow</h3>
            <div className="mt-4 grid gap-3">
              {[
                "Create a profile for the person, team, or company",
                "Add Company Knowledge inputs",
                "Review global Brand Voice Rules",
                "Create a post from a main idea or media",
                "Edit, approve, or reject generated posts"
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-sm font-bold shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">App status</h3>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-muted-foreground">Data mode</span>
                <span className="font-bold">
                  {storageMode === "supabase" ? "Shared workspace" : "Local browser"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-muted-foreground">Company Knowledge</span>
                <span className="font-bold">{librarySourceCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-muted-foreground">Ready to post</span>
                <span className="font-bold">{readyQueueCount}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">Local testing</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This only clears local test data in this browser. It does not affect files, OpenAI, or shared workspace data.
            </p>
            {storageMode === "supabase" && (
              <p className="mt-2 text-sm font-semibold text-primary">
                Shared data is connected, so this does not delete database records.
              </p>
            )}
            <Button className="mt-4" variant="danger" onClick={resetLocalData}>
              Reset local test data
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Analytics({
  postQueue,
  setScreen
}: {
  postQueue: PostQueueItem[];
  setScreen: (screen: Screen) => void;
}) {
  const analytics = queueAnalytics(postQueue);
  const postedItems = postQueue.filter(
    (item) => normalizeQueueStatus(item.status) === "Posted"
  );

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Manual publishing analytics</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track posts after they are manually published. Metrics come from posted Ready to Post items.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setScreen("Ready to Post")}>
            Update metrics
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total posted" value={analytics.totalPosted} />
        <Metric label="Total impressions" value={analytics.totalImpressions} />
        <Metric label="Total likes" value={analytics.totalLikes} />
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Best platform</p>
          <p className="mt-2 text-2xl font-bold">{analytics.bestPlatform}</p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-sm font-bold uppercase text-muted-foreground">Top posts by engagement</p>
        <div className="mt-4 grid gap-3">
          {analytics.topPosts.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
              Mark posts as posted and add metrics to see top performers.
            </p>
          ) : (
            analytics.topPosts.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-3 rounded-md border border-border bg-white p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold">{item.campaignName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.platform} · {item.profileName || "No profile"} · {metricNumber(item.metrics?.impressions)} impressions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill>{engagementTotal(item)} engagement</Pill>
                  <Pill>{metricNumber(item.metrics?.likes)} likes</Pill>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-bold uppercase text-muted-foreground">Posted items with manual metrics</p>
        <div className="mt-4 grid gap-3">
          {postedItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
              No posted items yet. Mark a queued post as Posted, then add metrics.
            </p>
          ) : (
            postedItems.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                  <div>
                    <p className="font-semibold">{item.campaignName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.platform} · {item.profileName || "No profile"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill>{metricNumber(item.metrics?.impressions)} impressions</Pill>
                    <Pill>{metricNumber(item.metrics?.likes)} likes</Pill>
                    <Pill>{metricNumber(item.metrics?.comments)} comments</Pill>
                    <Pill>{metricNumber(item.metrics?.shares)} shares</Pill>
                    <Pill>{metricNumber(item.metrics?.saves)} saves</Pill>
                    <Pill>{metricNumber(item.metrics?.clicks)} clicks</Pill>
                  </div>
                </div>
                {item.livePostUrl && (
                  <p className="mt-3 truncate text-sm text-primary">{item.livePostUrl}</p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

const connectionCards = [
  {
    name: "LinkedIn",
    status: "Coming soon",
    today: "Draft, preview, approve, copy, publish manually, then paste the live URL.",
    later: "Schedule/publish approved posts and pull post metrics once LinkedIn API access is approved.",
    notes: "LinkedIn publishing and post syncing require approved LinkedIn API access."
  },
  {
    name: "X / Twitter",
    status: "Coming soon",
    today: "Create short posts and threads, copy manually, and track metrics by hand.",
    later: "Connect an X app for posting, metrics sync, and account learning.",
    notes: "Needs X API credentials, permissions, and rate-limit review."
  },
  {
    name: "Instagram",
    status: "Ready for sandbox manual test",
    today: "Generate captions, overlay ideas, and media-aware previews for manual posting.",
    later: "Test scheduling/publishing through the Meta/Instagram Graph API.",
    notes: "Use the test Instagram account manually first. Do not connect real accounts until auth, permissions, and posting workflow are confirmed."
  },
  {
    name: "TikTok",
    status: "Planned",
    today: "Generate hooks, scripts, shot lists, captions, and manual posting copy.",
    later: "Explore TikTok posting and analytics APIs after the manual workflow is proven.",
    notes: "Video/audio analysis and account publishing are not connected yet."
  },
  {
    name: "Website / Blog",
    status: "Website fetching active",
    today: "Fetch public webpages into Company Knowledge and use them as source material.",
    later: "Add recurring refreshes and deeper website/blog indexing.",
    notes: "Public website fetching is active. Social URLs still require platform APIs."
  },
  {
    name: "Analytics Sync",
    status: "Manual metrics active",
    today: "Paste live URLs and manually enter impressions, likes, comments, shares, saves, and clicks.",
    later: "Pull metrics automatically from connected accounts.",
    notes: "Manual metrics power the Analytics page today."
  },
  {
    name: "Mentions / Replies",
    status: "Planned",
    today: "No inbox, mention monitoring, or reply drafting yet.",
    later: "Monitor comments, mentions, and replies and suggest response drafts.",
    notes: "Requires account connections, approval controls, and response safety checks."
  },
  {
    name: "Trend Listening",
    status: "Planned",
    today: "No automated trend monitoring yet.",
    later: "Track relevant industry conversations and suggest post angles.",
    notes: "Should come after permissions, account scopes, and data policy are finalized."
  }
];

function connectionStatusClass(status: string) {
  if (status.includes("active") || status.includes("Manual metrics")) return "bg-teal-100 text-primary";
  if (status.includes("sandbox")) return "bg-blue-100 text-blue-800";
  if (status.includes("soon")) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function Connections() {
  const currentWorkflow = [
    "Generate post",
    "Approve to Ready to Post",
    "Copy post manually",
    "Publish manually",
    "Paste live URL",
    "Enter metrics manually",
    "Review analytics"
  ];
  const futureWorkflow = [
    "Connect account",
    "Schedule/publish from dashboard",
    "Pull metrics automatically",
    "Monitor mentions/replies",
    "Suggest responses",
    "Learn from performance"
  ];
  const securityChecklist = [
    "Auth enabled",
    "Workspace permissions enabled",
    "Sensitive data policy reviewed",
    "Approval workflow confirmed",
    "Manual posting tested",
    "Account permissions reviewed"
  ];

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Connections roadmap</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Manual today, connected later</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Today, posts are copied and published manually. Metrics can be entered manually. Account connections will come later once the workflow is stable.
            </p>
          </div>
          <Pill>No accounts connected yet</Pill>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {connectionCards.map((card) => (
          <Card key={card.name} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold tracking-tight">{card.name}</h3>
                <span className={cn("mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-bold", connectionStatusClass(card.status))}>
                  {card.status}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Works today</p>
                <p className="mt-1 text-muted-foreground">{card.today}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Later</p>
                <p className="mt-1 text-muted-foreground">{card.later}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3 text-muted-foreground">
                {card.notes}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WorkflowCard title="Current workflow" items={currentWorkflow} />
        <WorkflowCard title="Future connected workflow" items={futureWorkflow} />
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-bold">Security checklist before connecting accounts</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Account connections should wait until these basics are confirmed.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {securityChecklist.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-extrabold text-primary">
                ✓
              </span>
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WorkflowCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-extrabold text-slate-600">
              {index + 1}
            </span>
            <span className="text-sm font-semibold">{item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

type ContentLibraryItem = {
  id: string;
  source: "generated" | "approved" | "queue";
  postCopy: string;
  platform: Platform;
  postingAccount: string;
  profileId?: string;
  campaignId: string;
  campaignName: string;
  contentAngle?: ContentAngle;
  intent?: string;
  status: PostStatus | QueueStatus;
  mediaUsed: boolean;
  readinessScore?: number;
  metrics?: PostQueueItem["metrics"];
  createdAt: string;
  campaignType: "Original" | "Repurposed";
  campaign?: Campaign;
  post?: GeneratedPost;
  queueItem?: PostQueueItem;
  approvedMemory?: ApprovedPostMemory;
};

function ContentLibrary({
  campaigns,
  approvedPosts,
  postQueue,
  profiles,
  setScreen,
  updateQueueItem,
  moveApprovedToQueue,
  repurposePost,
  mediaPreviewUrl
}: {
  campaigns: Campaign[];
  approvedPosts: ApprovedPostMemory[];
  postQueue: PostQueueItem[];
  profiles: Profile[];
  setScreen: (screen: Screen) => void;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>) => void;
  moveApprovedToQueue: (memory: ApprovedPostMemory) => void;
  repurposePost: (campaign: Campaign, post: GeneratedPost) => void;
  mediaPreviewUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [mediaFilter, setMediaFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [previewItemId, setPreviewItemId] = useState("");
  const [copyState, setCopyState] = useState("");

  const items = useMemo(
    () => buildContentLibraryItems(campaigns, approvedPosts, postQueue, profiles),
    [campaigns, approvedPosts, postQueue, profiles]
  );
  const filteredItems = items.filter((item) => {
    const haystack = [
      item.postCopy,
      item.campaignName,
      item.intent,
      item.platform,
      item.postingAccount
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query.trim() || haystack.includes(query.trim().toLowerCase());
    return (
      matchesSearch &&
      (statusFilter === "All" || item.status === statusFilter) &&
      (platformFilter === "All" || item.platform === platformFilter) &&
      (profileFilter === "All" || item.profileId === profileFilter || item.postingAccount === profileFilter) &&
      (campaignFilter === "All" || item.campaignId === campaignFilter) &&
      (mediaFilter === "All" || (mediaFilter === "Media used" ? item.mediaUsed : !item.mediaUsed)) &&
      (typeFilter === "All" || item.campaignType === typeFilter)
    );
  });
  const topPerforming = postQueue
    .filter((item) => normalizeQueueStatus(item.status) === "Posted")
    .sort((a, b) => engagementTotal(b) - engagementTotal(a))
    .slice(0, 3);
  const profileOptions = uniqueStrings(items.map((item) => item.profileId || item.postingAccount).filter(Boolean));
  const campaignOptions = campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name }));

  async function copyItem(item: ContentLibraryItem) {
    try {
      await navigator.clipboard.writeText(item.postCopy);
      setCopyState(item.id);
      window.setTimeout(() => setCopyState(""), 1200);
    } catch {
      setCopyState("");
    }
  }

  function previewPostForItem(item: ContentLibraryItem) {
    if (item.post && item.campaign) {
      return { post: item.post, campaign: item.campaign };
    }
    const profile = profiles.find((profileItem) => profileItem.id === item.profileId);
    const campaign: Campaign = {
      id: item.campaignId,
      name: item.campaignName,
      idea: "",
      intent: item.intent,
      contentAngle: item.contentAngle,
      campaignType: item.campaignType,
      platforms: [item.platform],
      posts: [],
      createdAt: item.createdAt,
      profileId: item.profileId,
      profileName: item.postingAccount,
      profileType: profile?.type
    };
    const post: GeneratedPost = {
      id: item.id,
      platform: item.platform,
      postCopy: item.postCopy,
      content: item.postCopy,
      status:
        item.status === "rejected"
          ? "rejected"
          : item.status === "draft"
            ? "draft"
            : "approved",
      score: item.readinessScore ?? 85,
      mediaUsed: item.mediaUsed,
      profileId: item.profileId,
      profileName: item.postingAccount,
      profileType: profile?.type
    };
    return { post, campaign };
  }

  function repurposeItem(item: ContentLibraryItem) {
    const preview = previewPostForItem(item);
    repurposePost(preview.campaign, preview.post);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Content Library</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search every draft, approval, queue item, posted post, archived post, and repurposed idea created in the app.
            </p>
          </div>
          <Button onClick={() => setScreen("New Campaign")}>
            <Plus size={16} /> Create post
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(6,minmax(0,1fr))]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search post copy, campaign, intent, platform, account..."
          />
          <ContentFilter value={statusFilter} onChange={setStatusFilter} options={["All", "draft", "approved", "rejected", "Ready", "Scheduled", "Posted", "Archived"]} />
          <ContentFilter value={platformFilter} onChange={setPlatformFilter} options={["All", ...platforms]} />
          <ContentFilter value={profileFilter} onChange={setProfileFilter} options={["All", ...profileOptions]} />
          <ContentFilter value={campaignFilter} onChange={setCampaignFilter} options={["All", ...campaignOptions.map((item) => item.id)]} labels={Object.fromEntries(campaignOptions.map((item) => [item.id, item.name]))} />
          <ContentFilter value={mediaFilter} onChange={setMediaFilter} options={["All", "Media used", "No media"]} />
          <ContentFilter value={typeFilter} onChange={setTypeFilter} options={["All", "Original", "Repurposed"]} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length} content items.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Top performing</h3>
            <p className="mt-1 text-sm text-muted-foreground">Based on manual metrics from posted Ready to Post items.</p>
          </div>
          <Pill>{topPerforming.length} posted</Pill>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {topPerforming.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground lg:col-span-3">
              Mark posts as posted and add metrics to see top performers.
            </p>
          ) : (
            topPerforming.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <Pill>{item.platform}</Pill>
                  <Pill>{engagementTotal(item)} engagement</Pill>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6">{item.postCopy || item.content}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {metricNumber(item.metrics?.impressions)} impressions · {engagementRate(item)} engagement rate
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">Create, approve, or post content and it will appear here.</p>
          <Button className="mt-4" onClick={() => setScreen("New Campaign")}>Create a post</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => {
            const preview = previewPostForItem(item);
            const isPreviewing = previewItemId === item.id;
            return (
              <Card key={item.id} className="p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Pill>{item.platform}</Pill>
                      <Pill>{contentStatusLabel(item.status)}</Pill>
                      <Pill>{item.campaignType}</Pill>
                      {item.mediaUsed && <Pill>Media used</Pill>}
                      {typeof item.readinessScore === "number" && <Pill>Readiness {item.readinessScore}/100</Pill>}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.postCopy}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {item.postingAccount} · {item.campaignName} · {item.contentAngle || "No angle"} · {formatShortDate(item.createdAt)}
                    </p>
                    {item.metrics && contentStatusLabel(item.status) === "Posted" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill>{metricNumber(item.metrics.impressions)} impressions</Pill>
                        <Pill>{metricNumber(item.metrics.likes)} likes</Pill>
                        <Pill>{metricNumber(item.metrics.comments)} comments</Pill>
                        <Pill>{metricNumber(item.metrics.shares)} shares</Pill>
                        <Pill>{metricNumber(item.metrics.saves)} saves</Pill>
                        <Pill>{metricNumber(item.metrics.clicks)} clicks</Pill>
                        <Pill>{engagementRate(item.queueItem)} engagement rate</Pill>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => copyItem(item)}>
                      <Clipboard size={14} /> {copyState === item.id ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPreviewItemId(isPreviewing ? "" : item.id)}>
                      {isPreviewing ? "Hide preview" : "Preview"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => repurposeItem(item)}>
                      <Repeat2 size={14} /> Repurpose
                    </Button>
                    {item.approvedMemory && !item.queueItem && (
                      <Button size="sm" onClick={() => moveApprovedToQueue(item.approvedMemory!)}>
                        Move to Ready
                      </Button>
                    )}
                    {item.queueItem && normalizeQueueStatus(item.queueItem.status) !== "Archived" && (
                      <Button size="sm" variant="secondary" onClick={() => updateQueueItem(item.queueItem!.id, { status: "Archived" })}>
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
                {isPreviewing && (
                  <div className="mt-4">
                    <PlatformPreview
                      post={preview.post}
                      campaign={preview.campaign}
                      mediaPreviewUrl={mediaPreviewUrl}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentFilter({
  value,
  onChange,
  options,
  labels = {}
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-0 rounded-md border border-input bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option] ?? option}
        </option>
      ))}
    </select>
  );
}

function buildContentLibraryItems(
  campaigns: Campaign[],
  approvedPosts: ApprovedPostMemory[],
  postQueue: PostQueueItem[],
  profiles: Profile[]
) {
  const queueByPostId = new Map(postQueue.map((item) => [item.generatedPostId, item]));
  const approvedByPostId = new Map(approvedPosts.map((item) => [item.generatedPostId, item]));
  const generatedIds = new Set<string>();
  const items: ContentLibraryItem[] = [];

  campaigns.forEach((campaign) => {
    campaign.posts.forEach((post) => {
      generatedIds.add(post.id);
      const queueItem = queueByPostId.get(post.id);
      const approvedMemory = approvedByPostId.get(post.id);
      items.push({
        id: `generated-${post.id}`,
        source: queueItem ? "queue" : "generated",
        postCopy: queueItem?.postCopy || queueItem?.content || userFacingPostContent(post.content, campaign, post),
        platform: post.platform,
        postingAccount: campaign.profileName || post.profileName || "General profile",
        profileId: campaign.profileId || post.profileId,
        campaignId: campaign.id,
        campaignName: campaign.name,
        contentAngle: campaign.contentAngle,
        intent: campaign.intent,
        status: queueItem?.status ?? post.status,
        mediaUsed: Boolean(queueItem?.mediaUsed || post.mediaUsed || campaign.mediaContext?.filename),
        readinessScore: post.score,
        metrics: queueItem?.metrics,
        createdAt: queueItem?.createdAt || campaign.createdAt,
        campaignType: campaign.campaignType ?? "Original",
        campaign,
        post,
        queueItem,
        approvedMemory
      });
    });
  });

  approvedPosts
    .filter((post) => !generatedIds.has(post.generatedPostId))
    .forEach((post) => {
      const profile = profiles.find((item) => item.id === post.profileId);
      const queueItem = queueByPostId.get(post.generatedPostId);
      items.push({
        id: `approved-${post.id}`,
        source: queueItem ? "queue" : "approved",
        postCopy: queueItem?.postCopy || queueItem?.content || userFacingPostContent(post.finalContent),
        platform: post.platform,
        postingAccount: profile?.name || "Approved profile",
        profileId: post.profileId,
        campaignId: post.campaignId,
        campaignName: queueItem?.campaignName || "Approved content",
        contentAngle: post.contentAngle,
        intent: post.intent,
        status: queueItem?.status ?? "approved",
        mediaUsed: Boolean(queueItem?.mediaUsed || post.mediaUsed),
        readinessScore: undefined,
        metrics: queueItem?.metrics,
        createdAt: queueItem?.createdAt || post.createdAt,
        campaignType: "Original",
        queueItem,
        approvedMemory: post
      });
    });

  postQueue
    .filter((item) => !generatedIds.has(item.generatedPostId) && !approvedByPostId.has(item.generatedPostId))
    .forEach((item) => {
      items.push({
        id: `queue-${item.id}`,
        source: "queue",
        postCopy: item.postCopy || item.content,
        platform: item.platform,
        postingAccount: item.profileName || "No profile",
        profileId: item.profileId,
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        contentAngle: item.contentAngle,
        intent: item.intent,
        status: item.status,
        mediaUsed: item.mediaUsed,
        readinessScore: undefined,
        metrics: item.metrics,
        createdAt: item.createdAt,
        campaignType: "Original",
        queueItem: item
      });
    });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function contentStatusLabel(status: ContentLibraryItem["status"]) {
  if (status === "draft") return "Draft";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status;
}

function engagementRate(item?: PostQueueItem) {
  if (!item) return "0%";
  const impressions = metricNumber(item.metrics?.impressions);
  if (!impressions) return "0%";
  return `${((engagementTotal(item) / impressions) * 100).toFixed(1)}%`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">{value}</p>
    </Card>
  );
}

function metricNumber(value?: number) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function engagementTotal(item: PostQueueItem) {
  const metrics = item.metrics ?? {};
  return (
    metricNumber(metrics.likes) +
    metricNumber(metrics.comments) +
    metricNumber(metrics.shares) +
    metricNumber(metrics.saves) +
    metricNumber(metrics.clicks)
  );
}

function queueAnalytics(queue: PostQueueItem[]) {
  const posted = queue.filter((item) => normalizeQueueStatus(item.status) === "Posted");
  const totalImpressions = posted.reduce(
    (sum, item) => sum + metricNumber(item.metrics?.impressions),
    0
  );
  const totalLikes = posted.reduce(
    (sum, item) => sum + metricNumber(item.metrics?.likes),
    0
  );
  const platformEngagement = platforms.map((platform) => ({
    platform,
    engagement: posted
      .filter((item) => item.platform === platform)
      .reduce((sum, item) => sum + engagementTotal(item), 0)
  }));
  const best = platformEngagement.sort((a, b) => b.engagement - a.engagement)[0];

  return {
    totalPosted: posted.length,
    totalImpressions,
    totalLikes,
    bestPlatform: best && best.engagement > 0 ? best.platform : "Not enough data",
    topPosts: [...posted].sort((a, b) => engagementTotal(b) - engagementTotal(a)).slice(0, 3)
  };
}

const emptyProfileForm = {
  id: "",
  name: "",
  type: "Founder" as ProfileType,
  role: "",
  bio: "",
  linkedInUrl: "",
  xUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  websiteUrl: "",
  otherUrls: "",
  examples: "",
  notes: "",
  syncStatus: "Manual Only" as SyncStatus,
  lastChecked: "Never",
  avatarUrl: "",
  avatarStoragePath: "",
  whatWeLike: "",
  patternsToLearn: "",
  thingsNotToCopy: ""
};

function Profiles({
  profiles,
  approvedPosts,
  setProfiles,
  selectedProfileId,
  setSelectedProfileId,
  persistProfile,
  removeProfile,
  storageMode,
  createDefaultConduitProfile,
  loadDemoData
}: {
  profiles: Profile[];
  approvedPosts: ApprovedPostMemory[];
  setProfiles: (profiles: Profile[]) => void;
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  persistProfile: (profile: Profile) => void;
  removeProfile: (id: string) => void;
  storageMode: StorageMode;
  createDefaultConduitProfile: () => void;
  loadDemoData: () => void;
}) {
  const [form, setForm] = useState(emptyProfileForm);
  const [savedAt, setSavedAt] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [activeTab, setActiveTab] = useState<"Overview" | "Voice" | "Sources" | "Approved Examples" | "Settings">("Overview");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const isEditing = Boolean(form.id);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  function updateForm<K extends keyof typeof emptyProfileForm>(
    field: K,
    value: (typeof emptyProfileForm)[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyProfileForm);
    setAvatarPreview("");
    setAvatarFile(null);
  }

  function openProfile(profile: Profile, tab: typeof activeTab = "Overview") {
    setActiveProfileId(profile.id);
    setActiveTab(tab);
  }

  function startEdit(profile: Profile) {
    editProfile(profile);
    setShowCreate(true);
    openProfile(profile, "Settings");
  }

  async function saveProfile() {
    const profileId = form.id || `profile-${Date.now()}`;
    let avatarData = {
      avatarUrl: form.avatarUrl,
      avatarStoragePath: form.avatarStoragePath
    };

    if (avatarFile) {
      if (storageMode === "supabase") {
        try {
          avatarData = (await uploadProfileAvatarToSupabase(profileId, avatarFile)) ?? avatarData;
        } catch {
          avatarData = { avatarUrl: avatarPreview, avatarStoragePath: "" };
        }
      } else {
        avatarData = { avatarUrl: avatarPreview, avatarStoragePath: "" };
      }
    }

    const profileBase: Omit<Profile, "personality"> = {
      id: profileId,
      name: form.name.trim() || "Untitled Profile",
      type: form.type,
      role: form.role.trim(),
      bio: form.bio.trim(),
      linkedInUrl: form.linkedInUrl.trim(),
      xUrl: form.xUrl.trim(),
      instagramUrl: form.instagramUrl.trim(),
      tiktokUrl: form.tiktokUrl.trim(),
      websiteUrl: form.websiteUrl.trim(),
      otherUrls: form.otherUrls.trim(),
      examples: form.examples.trim(),
      notes: form.notes.trim(),
      syncStatus: form.syncStatus,
      lastChecked: form.lastChecked.trim() || "Never",
      avatarUrl: avatarData.avatarUrl,
      avatarStoragePath: avatarData.avatarStoragePath,
      whatWeLike: form.whatWeLike.trim(),
      patternsToLearn: form.patternsToLearn.trim(),
      thingsNotToCopy: form.thingsNotToCopy.trim(),
      updatedAt: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric"
      }).format(new Date())
    };
    const nextProfile: Profile = {
      ...profileBase,
      personality: createPersonalitySummary(profileBase)
    };
    const nextProfiles = isEditing
      ? profiles.map((profile) =>
          profile.id === nextProfile.id ? nextProfile : profile
        )
      : [nextProfile, ...profiles];

    setProfiles(nextProfiles);
    setSelectedProfileId(nextProfile.id);
    setActiveProfileId(nextProfile.id);
    persistProfile(nextProfile);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    resetForm();
  }

  function editProfile(profile: Profile) {
    setForm({
      id: profile.id,
      name: profile.name,
      type: profile.type,
      role: profile.role,
      bio: profile.bio,
      linkedInUrl: profile.linkedInUrl,
      xUrl: profile.xUrl,
      instagramUrl: profile.instagramUrl,
      tiktokUrl: profile.tiktokUrl,
      websiteUrl: profile.websiteUrl,
      otherUrls: profile.otherUrls,
      examples: profile.examples,
      notes: profile.notes,
      syncStatus: profile.syncStatus,
      lastChecked: profile.lastChecked,
      avatarUrl: profile.avatarUrl ?? "",
      avatarStoragePath: profile.avatarStoragePath ?? "",
      whatWeLike: profile.whatWeLike ?? "",
      patternsToLearn: profile.patternsToLearn ?? "",
      thingsNotToCopy: profile.thingsNotToCopy ?? ""
    });
    setAvatarPreview(profile.avatarUrl ?? "");
    setAvatarFile(null);
  }

  function deleteProfile(profileId: string) {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    setProfiles(nextProfiles);
    if (selectedProfileId === profileId) {
      setSelectedProfileId(nextProfiles[0]?.id ?? "");
    }
    removeProfile(profileId);
  }

  function handleAvatarFile(file?: File) {
    if (!file) return;
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function refreshProfile(profileId: string, pastedContent: string) {
    const checkedAt = currentCheckedAt();
    let refreshedProfile: Profile | undefined;
    const nextProfiles = profiles.map((profile) => {
      if (profile.id !== profileId) {
        return profile;
      }

      const nextExamples = [profile.examples, pastedContent.trim()]
        .filter(Boolean)
        .join("\n\n");
      const nextProfile: Profile = {
        ...profile,
        examples: nextExamples,
        lastChecked: checkedAt,
        updatedAt: checkedAt
      };

      refreshedProfile = {
        ...nextProfile,
        personality: createPersonalitySummary(nextProfile)
      };
      return refreshedProfile;
    });

    setProfiles(nextProfiles);
    if (refreshedProfile) {
      persistProfile(refreshedProfile);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-white p-5 shadow-panel md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-bold">Profiles</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create identities for founders, team members, and company accounts.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate((current) => !current); }}>
          <Plus size={16} /> {showCreate ? "Hide form" : "Add Profile"}
        </Button>
      </div>

      {showCreate && (
        <ProfileFormCard
          form={form}
          updateForm={updateForm}
          avatarPreview={avatarPreview}
          onAvatarFile={handleAvatarFile}
          isEditing={isEditing}
          savedAt={savedAt}
          storageMode={storageMode}
          onSave={saveProfile}
          onCancel={() => {
            resetForm();
            setShowCreate(false);
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.length === 0 ? (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="font-semibold">No profiles yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a Conduit profile or load demo data.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={createDefaultConduitProfile}>Create Conduit profile</Button>
              <Button variant="secondary" onClick={loadDemoData}>Load demo data</Button>
            </div>
          </Card>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              approvedExamples={approvedPosts.filter((post) => post.profileId === profile.id)}
              isSelected={selectedProfileId === profile.id}
              onOpen={() => openProfile(profile)}
              onUse={() => setSelectedProfileId(profile.id)}
              onEdit={() => startEdit(profile)}
              onRefresh={(content) => refreshProfile(profile.id, content)}
            />
          ))
        )}
      </div>

      {activeProfile && (
        <ProfileDetailPanel
          profile={activeProfile}
          approvedExamples={approvedPosts.filter((post) => post.profileId === activeProfile.id)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSelected={selectedProfileId === activeProfile.id}
          onUse={() => setSelectedProfileId(activeProfile.id)}
          onClose={() => setActiveProfileId("")}
          onEdit={() => startEdit(activeProfile)}
          onDelete={() => deleteProfile(activeProfile.id)}
          onRefresh={(content) => refreshProfile(activeProfile.id, content)}
        />
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  approvedExamples,
  isSelected,
  onOpen,
  onUse,
  onEdit,
  onRefresh
}: {
  profile: Profile;
  approvedExamples: ApprovedPostMemory[];
  isSelected: boolean;
  onOpen: () => void;
  onUse: () => void;
  onEdit: () => void;
  onRefresh: (content: string) => void;
}) {
  const [showRefresh, setShowRefresh] = useState(false);
  const [refreshText, setRefreshText] = useState("");
  const [refreshSaved, setRefreshSaved] = useState("");

  function saveRefresh() {
    if (!refreshText.trim()) {
      return;
    }

    onRefresh(refreshText);
    setRefreshText("");
    setRefreshSaved(`Saved ${currentCheckedAt()}`);
    setShowRefresh(false);
  }

  const status = getProfileReadiness(profile);

  return (
    <Card className={cn("p-5 transition hover:border-primary hover:shadow-panel", isSelected && "border-primary bg-teal-50/60")}>
      <button className="w-full text-left" onClick={onOpen}>
        <div className="flex items-start gap-4">
          <ProfileAvatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold">{profile.name}</h3>
              {isSelected && <Pill>Selected</Pill>}
            </div>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {profile.role || profile.type}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>{profile.type}</Pill>
              <Pill>{status}</Pill>
              {approvedExamples.length > 0 && <Pill>{approvedExamples.length} approved</Pill>}
            </div>
          </div>
        </div>
        <SocialIndicators profile={profile} />
      </button>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={isSelected ? "primary" : "secondary"} onClick={onUse}>
          Use
        </Button>
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowRefresh(true)}>
          Refresh
        </Button>
      </div>

      {refreshSaved && (
        <p className="mt-3 text-sm font-semibold text-primary">{refreshSaved}</p>
      )}

      {showRefresh && (
        <div className="mt-4 rounded-md border border-primary/20 bg-teal-50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Refresh profile</p>
              <h4 className="mt-1 font-bold">{profile.name}</h4>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowRefresh(false)}>
              Cancel
            </Button>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Saved URLs:</span> {profileUrlsText(profile) || "None"}</p>
            <p><span className="font-semibold text-foreground">Sync status:</span> {profile.syncStatus}</p>
            <p><span className="font-semibold text-foreground">Last checked:</span> {getLastChecked(profile)}</p>
          </div>
          <p className="mt-3 text-sm font-semibold">
            Manual refresh only. URLs are stored as references. Paste any new posts or content below.
          </p>
          {hasLinkedInOrXProfileUrl(profile) && (
            <SubtleNote>LinkedIn/X auto-fetch is not enabled yet. Paste the latest posts manually for now.</SubtleNote>
          )}
          {hasWebsiteProfileUrl(profile) && (
            <SubtleNote>Website fetching can be added later. Paste page copy manually for now.</SubtleNote>
          )}
          <div className="mt-3">
            <FieldLabel label="New pasted posts/content" htmlFor={`profile-refresh-${profile.id}`} />
            <textarea
              id={`profile-refresh-${profile.id}`}
              value={refreshText}
              onChange={(event) => setRefreshText(event.target.value)}
              className="mt-2 min-h-32 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste the latest posts, captions, notes, or profile examples..."
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowRefresh(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveRefresh} disabled={!refreshText.trim()}>
              Save refresh
            </Button>
          </div>
        </div>
      )}

    </Card>
  );
}

function getProfileReadiness(profile: Profile) {
  if (getLastChecked(profile) === "Never") return "Needs refresh";
  if (!profile.examples.trim()) return "Needs examples";
  return "Ready";
}

function ProfileAvatar({ profile, size = "md" }: { profile: Pick<Profile, "name" | "avatarUrl">; size?: "md" | "lg" | "xl" }) {
  const sizeClass = size === "xl" ? "h-24 w-24 text-2xl" : size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground", sizeClass)}>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
      ) : (
        initialsFromName(profile.name)
      )}
    </div>
  );
}

function SocialIndicators({ profile }: { profile: Profile }) {
  const items = [
    ["in", profile.linkedInUrl],
    ["X", profile.xUrl],
    ["IG", profile.instagramUrl],
    ["TT", profile.tiktokUrl],
    ["Web", profile.websiteUrl]
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map(([label, value]) => (
        <span
          key={label}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-bold",
            value ? "bg-teal-100 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function ProfileFormCard({
  form,
  updateForm,
  avatarPreview,
  onAvatarFile,
  isEditing,
  savedAt,
  storageMode,
  onSave,
  onCancel
}: {
  form: typeof emptyProfileForm;
  updateForm: <K extends keyof typeof emptyProfileForm>(field: K, value: (typeof emptyProfileForm)[K]) => void;
  avatarPreview: string;
  onAvatarFile: (file?: File) => void;
  isEditing: boolean;
  savedAt: string;
  storageMode: StorageMode;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [showAdvancedProfile, setShowAdvancedProfile] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{isEditing ? "Edit profile" : "Create profile"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Profiles can be posting accounts, internal voices, or inspiration/reference sources.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr_1fr]">
        <div>
          <FieldLabel label="Avatar/photo/logo" htmlFor="profile-avatar" />
          <div className="mt-2 flex items-center gap-3">
            <ProfileAvatar profile={{ name: form.name || "Profile", avatarUrl: avatarPreview || form.avatarUrl }} size="lg" />
            <input
              id="profile-avatar"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) => onAvatarFile(event.target.files?.[0])}
              className="max-w-48 text-sm"
            />
          </div>
        </div>
        <div>
          <FieldLabel label="Profile name" htmlFor="profile-name" />
          <input id="profile-name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Daniel Pereira, Conduit..." />
        </div>
        <div>
          <FieldLabel label="Role/title" htmlFor="profile-role" />
          <input id="profile-role" value={form.role} onChange={(event) => updateForm("role", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Founder, CEO, Company..." />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel label="Profile type" htmlFor="profile-type" />
          <select id="profile-type" value={form.type} onChange={(event) => updateForm("type", event.target.value as ProfileType)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
            {profileTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <FieldLabel label="Short bio/description" htmlFor="profile-bio" />
          <input id="profile-bio" value={form.bio} onChange={(event) => updateForm("bio", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="What should the system know about this identity?" />
        </div>
      </div>
      <div className="mt-4">
        <FieldLabel label="Short voice note" htmlFor="profile-notes" />
        <input
          id="profile-notes"
          value={form.notes}
          onChange={(event) => updateForm("notes", event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          placeholder="Plainspoken, founder-led, technical, launch-style..."
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          ["LinkedIn URL", "linkedInUrl"],
          ["X URL", "xUrl"],
          ["Instagram URL", "instagramUrl"],
          ["TikTok URL", "tiktokUrl"],
          ["Website URL", "websiteUrl"]
        ].map(([label, field]) => (
          <div key={field}>
            <FieldLabel label={label} htmlFor={`profile-${field}`} />
            <input
              id={`profile-${field}`}
              value={form[field as keyof typeof emptyProfileForm] as string}
              onChange={(event) => updateForm(field as keyof typeof emptyProfileForm, event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Stored only"
            />
          </div>
        ))}
      </div>
      {form.type === "Inspiration / Reference" && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Use this for outside companies, creators, or media teams whose format, energy, or creative patterns you like. The app should learn patterns, not copy wording.
        </div>
      )}
      <div className="mt-4">
        <Button variant="secondary" onClick={() => setShowAdvancedProfile((current) => !current)}>
          {showAdvancedProfile ? "Hide advanced details" : "Show advanced details"}
        </Button>
      </div>
      {showAdvancedProfile && <>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel label="Other URLs" htmlFor="profile-other-urls" />
          <textarea
            id="profile-other-urls"
            value={form.otherUrls}
            onChange={(event) => updateForm("otherUrls", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Extra profile links, docs, references..."
          />
        </div>
        <div>
          <FieldLabel label="Pasted example posts/content" htmlFor="profile-examples" />
          <textarea
            id="profile-examples"
            value={form.examples}
            onChange={(event) => updateForm("examples", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Paste posts, captions, bio notes, or examples..."
          />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel label="What we like about this profile" htmlFor="profile-what-we-like" />
          <textarea
            id="profile-what-we-like"
            value={form.whatWeLike}
            onChange={(event) => updateForm("whatWeLike", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Hooks, pacing, visuals, clarity, launch energy..."
          />
        </div>
        <div>
          <FieldLabel label="Patterns to learn" htmlFor="profile-patterns" />
          <textarea
            id="profile-patterns"
            value={form.patternsToLearn}
            onChange={(event) => updateForm("patternsToLearn", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Thread structure, caption format, creative angles..."
          />
        </div>
        <div>
          <FieldLabel label="Things not to copy" htmlFor="profile-not-copy" />
          <textarea
            id="profile-not-copy"
            value={form.thingsNotToCopy}
            onChange={(event) => updateForm("thingsNotToCopy", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Specific wording, claims, brand voice, facts..."
          />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel label="Sync status" htmlFor="profile-sync-status" />
          <select id="profile-sync-status" value={form.syncStatus} onChange={(event) => updateForm("syncStatus", event.target.value as SyncStatus)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
            {syncStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel label="Last checked" htmlFor="profile-last-checked" />
          <input id="profile-last-checked" value={form.lastChecked} onChange={(event) => updateForm("lastChecked", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <FieldLabel label="Internal notes" htmlFor="profile-notes-advanced" />
          <input id="profile-notes-advanced" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="When to use this profile" />
        </div>
      </div>
      </>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {savedAt ? `Saved ${savedAt}` : storageMode === "supabase" ? "Avatar saves with the profile when configured." : "Avatar preview is saved locally for now."}
        </span>
        <Button onClick={onSave}><Check size={16} /> Save profile</Button>
      </div>
    </Card>
  );
}

function ProfileDetailPanel({
  profile,
  approvedExamples,
  activeTab,
  setActiveTab,
  isSelected,
  onUse,
  onClose,
  onEdit,
  onDelete,
  onRefresh
}: {
  profile: Profile;
  approvedExamples: ApprovedPostMemory[];
  activeTab: "Overview" | "Voice" | "Sources" | "Approved Examples" | "Settings";
  setActiveTab: (tab: "Overview" | "Voice" | "Sources" | "Approved Examples" | "Settings") => void;
  isSelected: boolean;
  onUse: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: (content: string) => void;
}) {
  const [refreshText, setRefreshText] = useState("");
  const tabs = ["Overview", "Voice", "Sources", "Approved Examples", "Settings"] as const;

  function saveRefresh() {
    if (!refreshText.trim()) return;
    onRefresh(refreshText);
    setRefreshText("");
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 p-4">
      <div className="ml-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-4">
            <ProfileAvatar profile={profile} size="lg" />
            <div>
              <h3 className="text-xl font-bold">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">{profile.role || profile.type}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("rounded-md px-3 py-2 text-sm font-bold", activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "Overview" && (
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar profile={profile} size="xl" />
                <div>
                  <h4 className="text-2xl font-bold">{profile.name}</h4>
                  <p className="text-sm font-semibold text-muted-foreground">{profile.role || "No role/title yet"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill>{profile.type}</Pill>
                    <Pill>{getProfileReadiness(profile)}</Pill>
                    <Pill>{profile.syncStatus}</Pill>
                    <Pill>Last checked: {profile.lastChecked}</Pill>
                  </div>
                </div>
              </div>
              <AnalysisBlock label="Short bio" value={profile.bio || "No bio added yet."} />
              {isInspirationProfile(profile) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Use this for outside companies, creators, or media teams whose format, energy, or creative patterns you like. The app should learn patterns, not copy wording.
                </div>
              )}
              <Button onClick={onUse} disabled={isSelected || isInspirationProfile(profile)}>
                {isInspirationProfile(profile)
                  ? "Use as inspiration in Create Post"
                  : isSelected
                    ? "Posting Account selected"
                    : "Use as Posting Account"}
              </Button>
            </div>
          )}
          {activeTab === "Voice" && (
            <div className="grid gap-3 md:grid-cols-2">
              <AnalysisBlock label="Voice traits" value={profile.personality.voiceTraits} />
              <AnalysisBlock label="Common topics" value={profile.personality.commonTopics} />
              <AnalysisBlock label="Common hooks" value={profile.personality.commonHooks} />
              <AnalysisBlock label="Sentence style" value={profile.personality.sentenceStyle} />
              <AnalysisBlock label="Repeated phrases" value={profile.personality.repeatedPhrases} />
              <AnalysisBlock label="What to avoid" value={profile.personality.avoid} />
              <AnalysisBlock label="Best platforms" value={profile.personality.bestPlatforms} />
              <AnalysisBlock label="Best use cases" value={profile.personality.bestUseCases} />
              <AnalysisBlock label="What we like" value={profile.whatWeLike || "Not defined yet."} />
              <AnalysisBlock label="Patterns to learn" value={profile.patternsToLearn || "Not defined yet."} />
              <AnalysisBlock label="Things not to copy" value={profile.thingsNotToCopy || "Not defined yet."} />
            </div>
          )}
          {activeTab === "Sources" && (
            <div className="grid gap-4">
              <LearningNowBox />
              <div className="grid gap-3 md:grid-cols-2">
                <AnalysisBlock label="LinkedIn URL" value={profile.linkedInUrl || "None"} />
                <AnalysisBlock label="X URL" value={profile.xUrl || "None"} />
                <AnalysisBlock label="Instagram URL" value={profile.instagramUrl || "None"} />
                <AnalysisBlock label="TikTok URL" value={profile.tiktokUrl || "None"} />
                <AnalysisBlock label="Website URL" value={profile.websiteUrl || "None"} />
                <AnalysisBlock label="Other URLs" value={profile.otherUrls || "None"} />
              </div>
              <AnalysisBlock label="Pasted examples/content" value={profile.examples || "No pasted examples yet."} />
              <div className="rounded-md border border-primary/20 bg-teal-50 p-4">
                <FieldLabel label="Refresh profile with new pasted posts/content" htmlFor={`panel-refresh-${profile.id}`} />
                <textarea id={`panel-refresh-${profile.id}`} value={refreshText} onChange={(event) => setRefreshText(event.target.value)} className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="Paste new examples here..." />
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={saveRefresh} disabled={!refreshText.trim()}>Refresh profile</Button>
                </div>
              </div>
            </div>
          )}
          {activeTab === "Approved Examples" && (
            <ApprovedExamplesPanel examples={approvedExamples} />
          )}
          {activeTab === "Settings" && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">Use Edit to change all profile fields, avatar, URLs, examples, and settings.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onEdit}>Edit all fields</Button>
                <Button variant="danger" onClick={onDelete}>Delete profile</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovedExamplesPanel({ examples }: { examples: ApprovedPostMemory[] }) {
  const [copyState, setCopyState] = useState("");
  if (examples.length === 0) {
    return <p className="text-sm text-muted-foreground">No approved examples yet.</p>;
  }
  return (
    <div className="grid gap-4">
      {platforms.map((platform) => {
        const platformExamples = examples.filter((example) => example.platform === platform);
        if (platformExamples.length === 0) return null;
        return (
          <div key={platform} className="rounded-md border border-border bg-white p-4">
            <h4 className="font-bold">{platform}</h4>
            <div className="mt-3 grid gap-3">
              {platformExamples.map((example) => (
                <div key={example.id} className="rounded-md bg-muted p-3">
                  <p className="whitespace-pre-wrap text-sm leading-6">{example.finalContent}</p>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="secondary" onClick={async () => {
                      await navigator.clipboard.writeText(example.finalContent);
                      setCopyState(example.id);
                      window.setTimeout(() => setCopyState(""), 1200);
                    }}>
                      <Clipboard size={14} /> {copyState === example.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const emptyLibrarySourceForm = {
  id: "",
  name: "",
  category: "Website" as LibrarySourceCategory,
  platform: "Website" as LibrarySourcePlatform,
  urls: "",
  urlType: "Website URL" as SourceUrlType,
  syncStatus: "Manual Only" as SyncStatus,
  lastChecked: "Never",
  content: "",
  notes: ""
};

function KnowledgeBase({
  librarySources,
  setLibrarySources,
  selectedLibrarySourceIds,
  setSelectedLibrarySourceIds,
  approvedPosts,
  brandVoice,
  profiles,
  setScreen,
  setCampaignName,
  setContentAngle,
  setIntent,
  setIdea,
  setSelectedProfileId,
  persistLibrarySource,
  removeLibrarySource,
  storageMode
}: {
  librarySources: LibrarySource[];
  setLibrarySources: (sources: LibrarySource[]) => void;
  selectedLibrarySourceIds: string[];
  setSelectedLibrarySourceIds: (ids: string[]) => void;
  approvedPosts: ApprovedPostMemory[];
  brandVoice: BrandVoiceProfile;
  profiles: Profile[];
  setScreen: (screen: Screen) => void;
  setCampaignName: (value: string) => void;
  setContentAngle: (value: ContentAngle | "") => void;
  setIntent: (value: string) => void;
  setIdea: (value: string) => void;
  setSelectedProfileId: (id: string) => void;
  persistLibrarySource: (source: LibrarySource) => void;
  removeLibrarySource: (id: string) => void;
  storageMode: StorageMode;
}) {
  const [form, setForm] = useState(emptyLibrarySourceForm);
  const [savedAt, setSavedAt] = useState("");
  const [showAdvancedKnowledge, setShowAdvancedKnowledge] = useState(false);
  const [formDocumentMessage, setFormDocumentMessage] = useState("");
  const [formDocumentError, setFormDocumentError] = useState("");
  const [isExtractingFormDocument, setIsExtractingFormDocument] = useState(false);
  const [detailSourceId, setDetailSourceId] = useState("");
  const [detailInitialTab, setDetailInitialTab] = useState<KnowledgeDetailTab>("Overview");
  const isEditing = Boolean(form.id);
  const detailSource = librarySources.find((source) => source.id === detailSourceId);
  const activeSourceIds = selectedLibrarySourceIds.length > 0
    ? selectedLibrarySourceIds
    : librarySources.map((source) => source.id);
  const activeSources = librarySources.filter((source) => activeSourceIds.includes(source.id));
  const totalWords = librarySources.reduce((sum, source) => sum + countWords(source.content), 0);
  const lastUpdated = latestKnowledgeUpdate(librarySources);
  const lastUpdatedDisplay = formatShortDate(lastUpdated);
  const sourceTypes = sourceTypesLoaded(librarySources);
  const brainMap = buildConduitBrainMap(librarySources, approvedPosts, brandVoice);

  function updateForm<K extends keyof typeof emptyLibrarySourceForm>(
    field: K,
    value: (typeof emptyLibrarySourceForm)[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyLibrarySourceForm);
    setFormDocumentMessage("");
    setFormDocumentError("");
  }

  function saveSource() {
    const sourceName = form.name.trim();
    const sourceBase: Omit<LibrarySource, "analysis"> = {
      id: form.id || `library-${Date.now()}`,
      name: sourceName,
      category: form.category,
      platform: form.platform,
      urls: form.urls.trim(),
      urlType: form.urlType,
      syncStatus: form.syncStatus,
      lastChecked: form.lastChecked.trim() || "Never",
      content: form.content.trim(),
      notes: form.notes.trim(),
      updatedAt: currentCheckedAt()
    };
    const nextSource: LibrarySource = {
      ...sourceBase,
      analysis: createLibrarySourceAnalysis(sourceBase)
    };
    const nextSources = isEditing
      ? librarySources.map((source) => source.id === nextSource.id ? nextSource : source)
      : [nextSource, ...librarySources];

    setLibrarySources(nextSources);
    persistLibrarySource(nextSource);
    setSelectedLibrarySourceIds(Array.from(new Set([...activeSourceIds, nextSource.id])));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    resetForm();
  }

  function editSource(source: LibrarySource) {
    setForm({
      id: source.id,
      name: source.name,
      category: source.category,
      platform: source.platform,
      urls: source.urls,
      urlType: getUrlType(source),
      syncStatus: getSyncStatus(source),
      lastChecked: getLastChecked(source),
      content: source.content,
      notes: source.notes
    });
  }

  function deleteSource(sourceId: string) {
    setLibrarySources(librarySources.filter((source) => source.id !== sourceId));
    setSelectedLibrarySourceIds(selectedLibrarySourceIds.filter((id) => id !== sourceId));
    if (detailSourceId === sourceId) setDetailSourceId("");
    removeLibrarySource(sourceId);
  }

  function saveSourceRecord(nextSource: LibrarySource) {
    setLibrarySources(
      librarySources.map((item) => item.id === nextSource.id ? nextSource : item)
    );
    persistLibrarySource(nextSource);
  }

  function refreshSource(sourceId: string, pastedContent: string) {
    const checkedAt = currentCheckedAt();
    const source = librarySources.find((item) => item.id === sourceId);
    if (!source || !pastedContent.trim()) return;

    const sourceBase: Omit<LibrarySource, "analysis"> = {
      ...source,
      content: [source.content, pastedContent.trim()].filter(Boolean).join("\n\n"),
      lastChecked: checkedAt,
      updatedAt: checkedAt
    };
    saveSourceRecord({
      ...sourceBase,
      analysis: createLibrarySourceAnalysis(sourceBase)
    });
  }

  function toggleSourceActive(sourceId: string) {
    setSelectedLibrarySourceIds(
      activeSourceIds.includes(sourceId)
        ? activeSourceIds.filter((id) => id !== sourceId)
        : [...activeSourceIds, sourceId]
    );
  }

  function openDetails(sourceId: string, tab: KnowledgeDetailTab = "Overview") {
    setDetailSourceId(sourceId);
    setDetailInitialTab(tab);
  }

  function createPostFromTheme(theme: ConduitBrainTheme) {
    const conduitProfile = findDefaultPostingAccount(profiles);
    if (conduitProfile) {
      setSelectedProfileId(conduitProfile.id);
    }
    setCampaignName(`${theme.name} post`);
    setContentAngle(theme.contentAngle);
    setIntent(theme.summary);
    setIdea(
      [
        `Theme: ${theme.name}`,
        theme.summary,
        "",
        "Useful post angles:",
        ...theme.angles.map((angle) => `- ${angle}`),
        "",
        `Related Company Knowledge: ${theme.sourceNames.join(", ") || "Use Conduit Company Knowledge automatically."}`
      ].join("\n")
    );
    if (theme.sourceIds.length > 0) {
      setSelectedLibrarySourceIds(theme.sourceIds);
    }
    setScreen("New Campaign");
  }

  async function handleFormDocumentUpload(file?: File | null) {
    if (!file) return;
    setIsExtractingFormDocument(true);
    setFormDocumentMessage("");
    setFormDocumentError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/extract-document", {
        method: "POST",
        body: formData
      });
      const payload = await readJsonResponse(response, "Document extraction failed");
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not extract text from this document.");
      }
      const extractedContent = [
        `Extracted from document: ${payload.filename || file.name}`,
        `File type: ${payload.file_type || file.type || "unknown"}`,
        `Uploaded at: ${new Date(payload.uploaded_at ?? Date.now()).toLocaleString()}`,
        "",
        payload.text
      ].join("\n");
      updateForm("content", [form.content, extractedContent].filter(Boolean).join("\n\n"));
      setFormDocumentMessage(`Extracted ${payload.extracted_text_length ?? String(payload.text ?? "").length} characters into pasted content.`);
    } catch (error) {
      setFormDocumentError(error instanceof Error ? error.message : "Could not extract that document.");
    } finally {
      setIsExtractingFormDocument(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h3 className="text-xl font-bold">Company Knowledge</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The source-of-truth brain for Conduit posts.
            </p>
          </div>
          <Pill>Used automatically in Create Post</Pill>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Conduit Brain Status</p>
            <h3 className="mt-1 text-lg font-bold">
              {librarySources.length > 0 ? "Ready" : "Needs sources"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Used automatically in Create Post.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BrainStatusItem label="Sources used" value={activeSources.length} />
            <BrainStatusItem label="Words loaded" value={totalWords} />
            <BrainStatusItem label="Last updated" value={lastUpdatedDisplay} />
            <BrainStatusItem label="Source types" value={sourceTypes || "None yet"} />
          </div>
        </div>
      </Card>

      <ConduitBrainMap
        brainMap={brainMap}
        sourceCount={librarySources.length}
        totalWords={totalWords}
        lastUpdated={lastUpdatedDisplay}
        onCreatePostFromTheme={createPostFromTheme}
      />

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              {isEditing ? "Edit knowledge source" : "Add knowledge source"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add website copy, pitch notes, product docs, transcripts, proof points, or customer-safe claims.
            </p>
          </div>
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
          )}
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Source name" htmlFor="library-source-name" />
              <input
                id="library-source-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Conduit positioning, homepage copy, customer proof..."
              />
            </div>
            <div>
              <FieldLabel label="Source type" htmlFor="library-source-category" />
              <select
                id="library-source-category"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value as LibrarySourceCategory)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {librarySourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel label="Paste URL or text" htmlFor="library-source-urls" />
            <textarea
              id="library-source-urls"
              value={form.urls}
              onChange={(event) => updateForm("urls", event.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste a public website URL, source link, or short source text. Longer text can go below."
            />
          </div>

          <div>
            <FieldLabel label="Pasted content" htmlFor="library-source-content" />
            <textarea
              id="library-source-content"
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              className="mt-2 min-h-[140px] w-full rounded-md border border-input bg-white p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste website copy, product notes, pitch language, transcript excerpts, or proof points..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <div>
              <FieldLabel label="Upload document" htmlFor="knowledge-form-document" />
              <input
                id="knowledge-form-document"
                type="file"
                accept={acceptedKnowledgeDocumentTypes.join(",")}
                disabled={isExtractingFormDocument}
                onChange={(event) => {
                  void handleFormDocumentUpload(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
                className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {formDocumentMessage && <p className="mt-2 text-sm font-semibold text-primary">{formDocumentMessage}</p>}
              {formDocumentError && <p className="mt-2 text-sm font-semibold text-red-700">{formDocumentError}</p>}
            </div>
            <div>
              <FieldLabel label="Notes" htmlFor="library-source-notes" />
              <input
                id="library-source-notes"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="When should this source be used?"
              />
            </div>
          </div>

          <Button variant="secondary" onClick={() => setShowAdvancedKnowledge((current) => !current)}>
            {showAdvancedKnowledge ? "Hide advanced details" : "Advanced details"}
          </Button>

          {showAdvancedKnowledge && (
            <div className="grid gap-4 rounded-md border border-border bg-muted p-4 md:grid-cols-3">
              <div>
                <FieldLabel label="Platform/material type" htmlFor="library-source-platform" />
                <select
                  id="library-source-platform"
                  value={form.platform}
                  onChange={(event) => updateForm("platform", event.target.value as LibrarySourcePlatform)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                >
                  {librarySourcePlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel label="URL type" htmlFor="library-url-type" />
                <select
                  id="library-url-type"
                  value={form.urlType}
                  onChange={(event) => updateForm("urlType", event.target.value as SourceUrlType)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                >
                  {sourceUrlTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel label="Last checked" htmlFor="library-last-checked" />
                <input
                  id="library-last-checked"
                  value={form.lastChecked}
                  onChange={(event) => updateForm("lastChecked", event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {savedAt ? (
              <span className="text-sm font-semibold text-primary">Saved {savedAt}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Company Knowledge is used automatically in Create Post.</span>
            )}
            <Button onClick={saveSource}><Check size={16} /> Save source</Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-lg font-bold">Sources feeding the Conduit Brain</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Sources used in Brain are applied automatically when creating posts. Sources marked not used stay saved but do not influence generation.
            </p>
          </div>
          <Pill>{activeSources.length} used in Brain</Pill>
        </div>
      </Card>

      <div className="grid gap-2">
        {librarySources.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-semibold">No Company Knowledge yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add website copy, pitch notes, product docs, transcripts, or proof points to turn on the Conduit brain.
            </p>
          </Card>
        ) : (
          librarySources.map((source) => (
            <LibrarySourceCard
              key={source.id}
              source={source}
              isSelected={activeSourceIds.includes(source.id)}
              onToggle={() => toggleSourceActive(source.id)}
              onRefresh={() => openDetails(source.id, "Settings")}
              onDetails={() => openDetails(source.id, "Overview")}
              onDelete={() => deleteSource(source.id)}
            />
          ))
        )}
      </div>

      {detailSource && (
        <KnowledgeSourceDetailsPanel
          source={detailSource}
          isSelected={activeSourceIds.includes(detailSource.id)}
          initialTab={detailInitialTab}
          storageMode={storageMode}
          onClose={() => setDetailSourceId("")}
          onToggle={() => toggleSourceActive(detailSource.id)}
          onEdit={() => {
            editSource(detailSource);
            setDetailSourceId("");
          }}
          onDelete={() => deleteSource(detailSource.id)}
          onRefresh={(content) => refreshSource(detailSource.id, content)}
          onSaveSource={saveSourceRecord}
        />
      )}
    </div>
  );
}

type ConduitBrainTheme = {
  name: string;
  summary: string;
  sourceIds: string[];
  sourceNames: string[];
  sourceDetails: Array<{ id: string; name: string; type: string }>;
  angles: string[];
  approvedPosts: string[];
  contentAngle: ContentAngle;
};

type ConduitBrainMapData = {
  themes: ConduitBrainTheme[];
  proofPoints: string[];
  approvedClaims: string[];
  reviewClaims: string[];
  avoid: string[];
};

function ConduitBrainMap({
  brainMap,
  sourceCount,
  totalWords,
  lastUpdated,
  onCreatePostFromTheme
}: {
  brainMap: ConduitBrainMapData;
  sourceCount: number;
  totalWords: number;
  lastUpdated: string;
  onCreatePostFromTheme: (theme: ConduitBrainTheme) => void;
}) {
  const hasBrainContent = sourceCount > 0 && totalWords > 0;
  const [selectedTheme, setSelectedTheme] = useState<ConduitBrainTheme | null>(null);
  const [showAllProofPoints, setShowAllProofPoints] = useState(false);
  const [showAllGuardrails, setShowAllGuardrails] = useState(false);
  const guardrails = [
    ...brainMap.approvedClaims.map((claim) => `Approved: ${claim}`),
    ...brainMap.reviewClaims.map((claim) => `Review: ${claim}`),
    ...brainMap.avoid.map((claim) => `Avoid: ${claim}`)
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Conduit Brain Map</p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight">Themes, proof points, and reusable angles</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            A lightweight map of what the Conduit brain knows right now. It is built from loaded Company Knowledge and approved examples.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
          <BrainStatusItem label="Sources loaded" value={sourceCount} />
          <BrainStatusItem label="Total words" value={totalWords} />
          <BrainStatusItem label="Themes detected" value={brainMap.themes.length} />
          <BrainStatusItem label="Proof points" value={brainMap.proofPoints.length} />
          <BrainStatusItem label="Claims / guardrails" value={brainMap.approvedClaims.length + brainMap.reviewClaims.length + brainMap.avoid.length} />
          <BrainStatusItem label="Last updated" value={lastUpdated} />
        </div>
      </div>

      {!hasBrainContent ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
          Add website copy, docs, transcripts, or proof points to build the Conduit Brain.
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Themes</p>
            {brainMap.themes.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
                Add more specific source material to detect themes.
              </div>
            ) : (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {brainMap.themes.map((theme) => (
                  <div key={theme.name} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md">
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold">{theme.name}</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{theme.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Pill>{theme.sourceIds.length} sources</Pill>
                          <Pill>{theme.approvedPosts.length} approved posts</Pill>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => onCreatePostFromTheme(theme)}>
                          Use in post
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setSelectedTheme(theme)}>
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CompactBrainList
              title="Proof Points"
              emptyText="No supported proof points detected yet."
              items={brainMap.proofPoints}
              showAll={showAllProofPoints}
              onToggle={() => setShowAllProofPoints((current) => !current)}
            />

            <CompactBrainList
              title="Claims / Guardrails"
              emptyText="No guardrails detected yet."
              items={guardrails}
              showAll={showAllGuardrails}
              onToggle={() => setShowAllGuardrails((current) => !current)}
            />
          </div>
        </div>
      )}

      {selectedTheme && (
        <ThemeDetailsPanel
          theme={selectedTheme}
          onClose={() => setSelectedTheme(null)}
          onCreatePost={() => onCreatePostFromTheme(selectedTheme)}
        />
      )}
    </Card>
  );
}

function CompactBrainList({
  title,
  emptyText,
  items,
  showAll,
  onToggle
}: {
  title: string;
  emptyText: string;
  items: string[];
  showAll: boolean;
  onToggle: () => void;
}) {
  const visibleItems = showAll ? items : items.slice(0, 3);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</p>
        {items.length > 3 && (
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {showAll ? "Show less" : `Show ${items.length - 3} more`}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 grid gap-2 text-sm leading-6">
          {visibleItems.map((item) => <li key={item} className="rounded-md bg-slate-50 px-3 py-2">{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function ThemeDetailsPanel({
  theme,
  onClose,
  onCreatePost
}: {
  theme: ConduitBrainTheme;
  onClose: () => void;
  onCreatePost: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"Overview" | "Useful post angles" | "Related sources" | "Related approved posts">("Overview");
  const tabs = ["Overview", "Useful post angles", "Related sources", "Related approved posts"] as const;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 p-4">
      <div className="ml-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Theme details</p>
            <h3 className="mt-1 text-xl font-bold">{theme.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{theme.summary}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-bold",
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "Overview" && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <BrainStatusItem label="Related sources" value={theme.sourceIds.length} />
                <BrainStatusItem label="Approved posts" value={theme.approvedPosts.length} />
              </div>
              <AnalysisBlock label="Summary" value={theme.summary} />
              <Button onClick={onCreatePost}>Use in post</Button>
            </div>
          )}

          {activeTab === "Useful post angles" && (
            <div className="grid gap-3">
              {theme.angles.map((angle) => (
                <div key={angle} className="rounded-md border border-border bg-muted p-4 text-sm leading-6">
                  {angle}
                </div>
              ))}
            </div>
          )}

          {activeTab === "Related sources" && (
            <div className="grid gap-3">
              {theme.sourceDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground">No related sources tied to this theme yet.</p>
              ) : (
                theme.sourceDetails.map((source) => (
                  <div key={source.id} className="rounded-md border border-border bg-muted p-4">
                    <p className="font-bold">{source.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{source.type}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "Related approved posts" && (
            <div className="grid gap-3">
              {theme.approvedPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved posts tied to this theme yet.</p>
              ) : (
                theme.approvedPosts.map((post) => (
                  <div key={post} className="whitespace-pre-wrap rounded-md border border-border bg-muted p-4 text-sm leading-6">
                    {post}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const conduitBrainThemeSeeds: Array<{
  name: string;
  keywords: string[];
  summary: string;
  angles: string[];
  contentAngle: ContentAngle;
}> = [
  {
    name: "Deployment speed",
    keywords: ["deploy", "deployment", "launched", "launch", "days", "weeks", "months", "fast", "speed", "implementation", "rollout"],
    summary: "Conduit helps industrial teams move from idea to working automation faster than traditional project cycles.",
    angles: [
      "Show what changed between the old deployment path and the Conduit path.",
      "Turn a fast build or launch into a founder-led proof point.",
      "Explain why speed matters when factories need working systems, not slideware."
    ],
    contentAngle: "Deployment win"
  },
  {
    name: "System integrator problem",
    keywords: ["system integrator", "integrator", "integration", "handoff", "vendor", "project", "custom project", "legacy", "manual coordination"],
    summary: "Traditional automation work often gets trapped in long integration projects, handoffs, and brittle custom work.",
    angles: [
      "Name the hidden cost of relying on one-off system integrator projects.",
      "Explain how Conduit changes the coordination layer around automation.",
      "Contrast slow bespoke projects with reusable operational infrastructure."
    ],
    contentAngle: "Industry POV"
  },
  {
    name: "Factory OS / orchestration",
    keywords: ["factory os", "orchestration", "workflow", "workflows", "operations", "operational", "apps", "system", "systems", "control layer"],
    summary: "Conduit is framed as an orchestration layer for factory workflows, systems, and operational apps.",
    angles: [
      "Explain what a Factory OS needs to coordinate in the real world.",
      "Show how workflows connect people, machines, and operational systems.",
      "Make the invisible orchestration layer feel concrete."
    ],
    contentAngle: "Technical explanation"
  },
  {
    name: "Robotics and automation",
    keywords: ["robot", "robots", "robotics", "automation", "machine", "machines", "sensor", "sensors", "hardware", "plc", "industrial automation"],
    summary: "Conduit sits close to industrial hardware, robotics, machines, sensors, and real automation constraints.",
    angles: [
      "Show the difference between software-only AI and automation that touches the floor.",
      "Use media from workshops, factories, or hardware tests as credibility.",
      "Explain how robots and machines become useful when workflows coordinate them."
    ],
    contentAngle: "Behind the scenes"
  },
  {
    name: "Manufacturing labor gap",
    keywords: ["labor", "workforce", "operator", "operators", "shortage", "hiring", "labor gap", "skills gap", "frontline"],
    summary: "Conduit can be positioned around helping industrial teams do more with constrained labor and scarce operational expertise.",
    angles: [
      "Discuss the operational pressure created by labor shortages.",
      "Frame automation as a way to support operators, not replace context.",
      "Connect AI-native operations to the reality of frontline constraints."
    ],
    contentAngle: "Industry POV"
  },
  {
    name: "Industrial sovereignty",
    keywords: ["sovereignty", "industrial base", "domestic", "reshoring", "resilience", "supply chain", "national", "manufacturing capacity"],
    summary: "Conduit can connect factory automation to resilient domestic industrial capacity when sources support it.",
    angles: [
      "Tie factory software to national industrial resilience.",
      "Explain why speed and automation matter for manufacturing capacity.",
      "Make the industrial sovereignty angle concrete through operating examples."
    ],
    contentAngle: "Industry POV"
  },
  {
    name: "Customer proof",
    keywords: ["customer", "case study", "proof", "result", "outcome", "before", "after", "saved", "reduced", "increased", "pilot"],
    summary: "Customer-safe proof points and before/after stories can anchor posts in outcomes instead of abstract claims.",
    angles: [
      "Turn a customer-safe outcome into a concise proof post.",
      "Explain the operational before and after without over-sharing.",
      "Use one concrete proof point to make the broader Conduit thesis believable."
    ],
    contentAngle: "Customer proof"
  },
  {
    name: "AI-native operations",
    keywords: ["ai", "ai-native", "agent", "agents", "autonomous", "intelligent", "model", "automation", "operations", "reasoning"],
    summary: "Conduit can describe how AI becomes useful when grounded in real operational context and workflows.",
    angles: [
      "Explain what AI-native operations means in practical factory terms.",
      "Show how AI becomes useful when it can act through workflows.",
      "Avoid vague AI language by tying the point to real systems and operators."
    ],
    contentAngle: "Technical explanation"
  }
];

const conduitProofPointSeeds: Array<{
  text: string;
  keywords: string[];
  requiredMatches?: number;
}> = [
  {
    text: "Deploy in days, not months",
    keywords: ["deploy", "deployment", "days", "months"],
    requiredMatches: 3
  },
  {
    text: "Connects robots, machines, sensors, and operational apps",
    keywords: ["robots", "robotics", "machines", "sensors", "operational apps", "workflows"],
    requiredMatches: 2
  },
  {
    text: "Reduces reliance on long system integrator projects",
    keywords: ["system integrator", "integrator", "long projects", "custom projects", "handoff"],
    requiredMatches: 2
  },
  {
    text: "Starts from real workflows, hardware constraints, and operator context",
    keywords: ["workflow", "workflows", "hardware", "operator", "operators", "factory floor"],
    requiredMatches: 2
  },
  {
    text: "Turns messy handoffs and manual coordination into dependable automation",
    keywords: ["handoff", "handoffs", "manual", "coordination", "automation", "workflow"],
    requiredMatches: 2
  }
];

function buildConduitBrainMap(
  sources: LibrarySource[],
  approvedPosts: ApprovedPostMemory[],
  brandVoice: BrandVoiceProfile
): ConduitBrainMapData {
  const loadedSources = sources.filter((source) => source.content.trim() || source.notes.trim() || source.urls.trim());
  const combinedContent = loadedSources.map(sourceSearchText).join("\n").toLowerCase();
  const themes = conduitBrainThemeSeeds
    .map((seed) => {
      const relatedSources = loadedSources.filter((source) =>
        seed.keywords.some((keyword) => sourceSearchText(source).toLowerCase().includes(keyword))
      );
      if (relatedSources.length === 0) return null;

      const relatedApprovedPosts = approvedPosts
        .filter((post) => seed.keywords.some((keyword) => approvedPostSearchText(post).toLowerCase().includes(keyword)))
        .slice(0, 3)
        .map((post) => `${post.platform}: ${truncateText(userFacingPostContent(post.finalContent), 130)}`);

      return {
        name: seed.name,
        summary: seed.summary,
        sourceIds: relatedSources.map((source) => source.id),
        sourceNames: relatedSources.map(getLibrarySourceDisplayName),
        sourceDetails: relatedSources.map((source) => ({
          id: source.id,
          name: getLibrarySourceDisplayName(source),
          type: String(source.category || source.platform)
        })),
        angles: seed.angles,
        approvedPosts: relatedApprovedPosts,
        contentAngle: seed.contentAngle
      };
    })
    .filter((theme): theme is ConduitBrainTheme => Boolean(theme));

  const proofPoints = conduitProofPointSeeds
    .filter((seed) => countKeywordMatches(combinedContent, seed.keywords) >= (seed.requiredMatches ?? 1))
    .map((seed) => seed.text);

  const approvedClaims = proofPoints.slice(0, 5);
  const reviewClaims = buildReviewClaims(combinedContent, themes, proofPoints);
  const avoid = splitGuidanceList(brandVoice.avoid)
    .concat(loadedSources.map((source) => source.analysis.avoid).flatMap(splitGuidanceList))
    .concat([
      "Do not invent customer metrics or deployment timelines that are not in Company Knowledge.",
      "Do not imply social account syncing, scraping, or live publishing is enabled."
    ])
    .filter(Boolean);

  return {
    themes,
    proofPoints,
    approvedClaims,
    reviewClaims,
    avoid: uniqueStrings(avoid).slice(0, 8)
  };
}

function sourceSearchText(source: LibrarySource) {
  return [
    source.name,
    source.category,
    source.platform,
    source.urls,
    source.content,
    source.notes,
    source.analysis.commonTopics,
    source.analysis.proofPoints,
    source.analysis.bestUseCases
  ].filter(Boolean).join("\n");
}

function approvedPostSearchText(post: ApprovedPostMemory) {
  return [
    post.finalContent,
    post.contentAngle,
    post.supportingFields?.rationale,
    post.supportingFields?.recommendedMediaUse,
    post.supportingFields?.cta,
    post.supportingFields?.hashtags?.join(" ")
  ].filter(Boolean).join("\n");
}

function countKeywordMatches(value: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (value.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function splitGuidanceList(value?: string) {
  return String(value ?? "")
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function buildReviewClaims(content: string, themes: ConduitBrainTheme[], proofPoints: string[]) {
  const claims: string[] = [];
  const hasTheme = (name: string) => themes.some((theme) => theme.name === name);

  if (hasTheme("Deployment speed") && !proofPoints.includes("Deploy in days, not months")) {
    claims.push("Specific deployment timelines need source-backed numbers before posting.");
  }
  if (content.includes("customer") || hasTheme("Customer proof")) {
    claims.push("Customer outcomes and names should be checked before publishing.");
  }
  if (content.includes("ai") || content.includes("agent") || hasTheme("AI-native operations")) {
    claims.push("AI autonomy claims should stay grounded in actual workflow capabilities.");
  }
  if (content.includes("sovereignty") || hasTheme("Industrial sovereignty")) {
    claims.push("Industrial sovereignty claims should be tied to supported operating examples.");
  }

  return uniqueStrings(claims).slice(0, 5);
}

function BrainStatusItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

type KnowledgeDetailTab = "Overview" | "Content" | "Analysis" | "Sources / Files" | "Settings";

function LibrarySourceCard({
  source,
  isSelected,
  onToggle,
  onRefresh,
  onDetails,
  onDelete
}: {
  source: LibrarySource;
  isSelected: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onDetails: () => void;
  onDelete: () => void;
}) {
  const displayName = getLibrarySourceDisplayName(source);
  const lastUpdated = formatShortDate(source.updatedAt || getLastChecked(source));

  return (
    <Card className={cn("p-3 transition hover:border-teal-200 hover:shadow-md", isSelected && "border-primary bg-teal-50/60")}>
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <h3 className="truncate text-base font-extrabold">{displayName}</h3>
            <Pill>{source.category}</Pill>
            <Pill>{countWords(source.content)} words</Pill>
            <Pill>{isSelected ? "Used in Brain" : "Not used"}</Pill>
            <Pill>Updated {lastUpdated}</Pill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onRefresh}>Refresh</Button>
          <Button size="sm" variant="secondary" onClick={onDetails}>Details</Button>
          <Button size="sm" variant={isSelected ? "primary" : "secondary"} onClick={onToggle}>
            {isSelected ? "Exclude" : "Use"}
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </div>
    </Card>
  );
}

function getLibrarySourceDisplayName(source: LibrarySource) {
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

function firstDomainFromText(value?: string) {
  const firstUrl = String(value ?? "").match(/https?:\/\/[^\s,]+/i)?.[0];
  if (!firstUrl) return "";
  try {
    return new URL(firstUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function KnowledgeSourceDetailsPanel({
  source,
  isSelected,
  initialTab,
  storageMode,
  onClose,
  onToggle,
  onEdit,
  onDelete,
  onRefresh,
  onSaveSource
}: {
  source: LibrarySource;
  isSelected: boolean;
  initialTab: KnowledgeDetailTab;
  storageMode: StorageMode;
  onClose: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: (content: string) => void;
  onSaveSource: (source: LibrarySource) => void;
}) {
  const [activeTab, setActiveTab] = useState<KnowledgeDetailTab>(initialTab);
  const [refreshText, setRefreshText] = useState("");
  const [settingsName, setSettingsName] = useState(source.name);
  const [settingsCategory, setSettingsCategory] = useState<LibrarySourceCategory>(source.category);
  const [settingsNotes, setSettingsNotes] = useState(source.notes);
  const [settingsContent, setSettingsContent] = useState(source.content);
  const [isFetchingWebsite, setIsFetchingWebsite] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [isExtractingDocument, setIsExtractingDocument] = useState(false);
  const [documentMessage, setDocumentMessage] = useState("");
  const [documentError, setDocumentError] = useState("");
  const websiteUrl = firstWebsiteUrl(source.urls);
  const displayName = getLibrarySourceDisplayName(source);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, source.id]);

  useEffect(() => {
    setSettingsName(source.name);
    setSettingsCategory(source.category);
    setSettingsNotes(source.notes);
    setSettingsContent(source.content);
    setFetchMessage("");
    setFetchError("");
    setDocumentMessage("");
    setDocumentError("");
  }, [source]);

  function saveRefresh() {
    if (!refreshText.trim()) return;
    onRefresh(refreshText);
    setRefreshText("");
    setFetchMessage(`Manual refresh saved ${currentCheckedAt()}.`);
  }

  async function fetchWebsiteContent() {
    if (!websiteUrl) {
      setFetchError("Add a public website URL first.");
      return;
    }

    setIsFetchingWebsite(true);
    setFetchError("");
    setFetchMessage("");

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl })
      });
      const payload = await readJsonResponse(response, "Website fetch failed");
      if (!response.ok) throw new Error(payload?.error ?? "Could not fetch website content.");

      const fetchedAt = payload.fetched_at
        ? new Date(payload.fetched_at).toLocaleString()
        : new Date().toLocaleString();
      const fetchedContent = [
        `Fetched from ${payload.title || source.name}`,
        `Source URL: ${payload.sourceUrl || websiteUrl}`,
        `Fetched at: ${fetchedAt}`,
        "",
        payload.content
      ].join("\n");
      onRefresh(fetchedContent);
      setFetchMessage(`Fetched "${payload.title || websiteUrl}" and added it to this source.`);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Could not fetch website content.");
    } finally {
      setIsFetchingWebsite(false);
    }
  }

  async function handleDocumentUpload(file?: File | null) {
    if (!file) return;
    setIsExtractingDocument(true);
    setDocumentMessage("");
    setDocumentError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/extract-document", { method: "POST", body: formData });
      const payload = await readJsonResponse(response, "Document extraction failed");
      if (!response.ok) throw new Error(payload?.error ?? "Could not extract text from this document.");

      let storageData: { storagePath?: string; publicUrl?: string } | null = null;
      if (storageMode === "supabase") {
        storageData = await uploadKnowledgeDocumentToSupabase(source.id, file);
      }
      const uploadedAt = payload.uploaded_at ?? new Date().toISOString();
      const extractedContent = [
        `Extracted from document: ${payload.filename || file.name}`,
        `File type: ${payload.file_type || file.type || "unknown"}`,
        `Uploaded at: ${new Date(uploadedAt).toLocaleString()}`,
        "",
        payload.text
      ].join("\n");
      const checkedAt = currentCheckedAt();
      const sourceBase: Omit<LibrarySource, "analysis"> = {
        ...source,
        content: [source.content, extractedContent].filter(Boolean).join("\n\n"),
        lastChecked: checkedAt,
        updatedAt: checkedAt,
        documents: [
          ...(source.documents ?? []),
          {
            id: `doc-${Date.now()}`,
            filename: payload.filename || file.name,
            fileType: payload.file_type || file.type || "unknown",
            storagePath: storageData?.storagePath,
            publicUrl: storageData?.publicUrl,
            extractedTextLength: payload.extracted_text_length ?? String(payload.text ?? "").length,
            uploadedAt
          }
        ]
      };
      onSaveSource({ ...sourceBase, analysis: createLibrarySourceAnalysis(sourceBase) });
      setDocumentMessage(`Extracted ${payload.extracted_text_length ?? String(payload.text ?? "").length} characters from ${payload.filename || file.name}.`);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Could not extract text from this document.");
    } finally {
      setIsExtractingDocument(false);
    }
  }

  function saveSettings() {
    const checkedAt = currentCheckedAt();
    const sourceBase: Omit<LibrarySource, "analysis"> = {
      ...source,
      name: settingsName.trim() || source.name,
      category: settingsCategory,
      notes: settingsNotes.trim(),
      content: settingsContent.trim(),
      updatedAt: checkedAt
    };
    onSaveSource({ ...sourceBase, analysis: createLibrarySourceAnalysis(sourceBase) });
    setFetchMessage("Settings saved.");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-primary">Knowledge source</p>
            <h3 className="mt-1 truncate text-xl font-bold">{displayName}</h3>
            {!source.name.trim() || /^untitled/i.test(source.name.trim()) ? (
              <p className="mt-1 text-xs text-muted-foreground">Display name generated from source metadata.</p>
            ) : null}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {(["Overview", "Content", "Analysis", "Sources / Files", "Settings"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-bold transition",
                  activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "Overview" && (
            <div className="grid gap-4 md:grid-cols-2">
              <BriefItem label="Display name" value={displayName} />
              <BriefItem label="Saved name" value={source.name || "No saved name"} />
              <BriefItem label="Source type" value={source.category} />
              <BriefItem label="Word count" value={`${countWords(source.content)} words`} />
              <BriefItem label="Last updated" value={formatShortDate(source.updatedAt || getLastChecked(source))} />
              <BriefItem label="Brain status" value={isSelected ? "Used in Brain" : "Not used"} />
              <AnalysisBlock label="Notes" value={source.notes || "No notes yet."} />
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button variant={isSelected ? "primary" : "secondary"} onClick={onToggle}>{isSelected ? "Exclude from Brain" : "Use in Brain"}</Button>
                <Button variant="secondary" onClick={onEdit}>Edit in form</Button>
              </div>
            </div>
          )}

          {activeTab === "Content" && (
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted p-4 text-sm leading-6">
              {source.content || "No pasted, fetched, or extracted content yet."}
            </pre>
          )}

          {activeTab === "Analysis" && (
            <div className="grid gap-3 md:grid-cols-2">
              <AnalysisBlock label="Voice traits" value={source.analysis.voiceTraits} />
              <AnalysisBlock label="Common topics" value={source.analysis.commonTopics} />
              <AnalysisBlock label="Repeated phrases" value={source.analysis.repeatedPhrases} />
              <AnalysisBlock label="Strong hooks" value={source.analysis.strongHooks} />
              <AnalysisBlock label="Proof points" value={source.analysis.proofPoints} />
              <AnalysisBlock label="Things to avoid" value={source.analysis.avoid} />
              <AnalysisBlock label="Best use cases" value={source.analysis.bestUseCases} />
            </div>
          )}

          {activeTab === "Sources / Files" && (
            <div className="grid gap-4">
              <AnalysisBlock label="URLs" value={source.urls || "No URLs saved."} />
              <div className="grid gap-3 md:grid-cols-3">
                <BriefItem label="URL type" value={getUrlType(source)} />
                <BriefItem label="Material type" value={source.platform} />
                <BriefItem label="Last checked" value={getLastChecked(source)} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Uploaded documents</p>
                <div className="mt-3 grid gap-2">
                  {(source.documents ?? []).length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No documents uploaded yet.
                    </p>
                  ) : (
                    (source.documents ?? []).map((document) => (
                      <div key={document.id} className="rounded-md border border-border bg-muted p-3">
                        <p className="font-semibold">{document.filename}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {document.fileType} · {document.extractedTextLength} extracted characters · {formatShortDate(document.uploadedAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel label="Source name" htmlFor={`knowledge-name-${source.id}`} />
                  <input
                    id={`knowledge-name-${source.id}`}
                    value={settingsName}
                    onChange={(event) => setSettingsName(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <FieldLabel label="Source type" htmlFor={`knowledge-type-${source.id}`} />
                  <select
                    id={`knowledge-type-${source.id}`}
                    value={settingsCategory}
                    onChange={(event) => setSettingsCategory(event.target.value as LibrarySourceCategory)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {librarySourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel label="Notes" htmlFor={`knowledge-notes-${source.id}`} />
                <input
                  id={`knowledge-notes-${source.id}`}
                  value={settingsNotes}
                  onChange={(event) => setSettingsNotes(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <FieldLabel label="Pasted content" htmlFor={`knowledge-content-${source.id}`} />
                <textarea
                  id={`knowledge-content-${source.id}`}
                  value={settingsContent}
                  onChange={(event) => setSettingsContent(event.target.value)}
                  className="mt-2 min-h-40 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="rounded-md border border-border bg-muted p-4">
                <p className="font-bold">Refresh source material</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <textarea
                    value={refreshText}
                    onChange={(event) => setRefreshText(event.target.value)}
                    className="min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Paste new source content to append..."
                  />
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={saveRefresh} disabled={!refreshText.trim()}>Save refresh</Button>
                    {websiteUrl && <Button size="sm" variant="secondary" onClick={fetchWebsiteContent} disabled={isFetchingWebsite}>{isFetchingWebsite ? "Fetching..." : "Fetch website"}</Button>}
                    <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-white px-3 text-sm font-semibold text-foreground hover:bg-muted">
                      <Upload size={14} /> {isExtractingDocument ? "Uploading..." : "Upload document"}
                      <input
                        type="file"
                        accept={acceptedKnowledgeDocumentTypes.join(",")}
                        className="hidden"
                        disabled={isExtractingDocument}
                        onChange={(event) => {
                          void handleDocumentUpload(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                {fetchMessage && <p className="mt-3 text-sm font-semibold text-primary">{fetchMessage}</p>}
                {fetchError && <p className="mt-3 text-sm font-semibold text-red-700">{fetchError}</p>}
                {documentMessage && <p className="mt-3 text-sm font-semibold text-primary">{documentMessage}</p>}
                {documentError && <p className="mt-3 text-sm font-semibold text-red-700">{documentError}</p>}
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="danger" onClick={onDelete}>Delete source</Button>
                <Button onClick={saveSettings}>Save settings</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function latestKnowledgeUpdate(sources: LibrarySource[]) {
  if (sources.length === 0) return "Never";
  return sources
    .map((source) => source.updatedAt || source.lastChecked || "Never")
    .filter(Boolean)[0] ?? "Never";
}

function sourceTypesLoaded(sources: LibrarySource[]) {
  const labels = new Set<string>();
  sources.forEach((source) => {
    const category = `${source.category} ${source.platform} ${source.urlType ?? ""}`.toLowerCase();
    if (category.includes("website") || category.includes("blog")) labels.add("Website");
    else if (category.includes("document") || category.includes("marketing") || category.includes("investor")) labels.add("Docs");
    else if (category.includes("transcript")) labels.add("Transcripts");
    else if (source.notes || source.content) labels.add("Notes");
    else labels.add("Other");
  });
  return Array.from(labels).join(", ");
}


function MediaLibrary({
  mediaAssets,
  setMediaAssets,
  persistMediaAsset,
  removeMediaAsset,
  campaigns,
  approvedPosts,
  onUseMediaAsset,
  storageMode
}: {
  mediaAssets: MediaAsset[];
  setMediaAssets: React.Dispatch<React.SetStateAction<MediaAsset[]>>;
  persistMediaAsset: (asset: MediaAsset, file?: File | null) => Promise<MediaAsset>;
  removeMediaAsset: (assetId: string) => void;
  campaigns: Campaign[];
  approvedPosts: ApprovedPostMemory[];
  onUseMediaAsset: (asset: MediaAsset) => void;
  storageMode: StorageMode;
}) {
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const selectedAsset = mediaAssets.find((asset) => asset.id === selectedAssetId);

  async function handleUpload(file?: File | null) {
    if (!file) return;

    const mediaType = mediaTypeFromFile(file);
    if (!mediaType) {
      setError("Unsupported media type. Upload png, jpg, jpeg, webp, mp4, mov, webm, mp3, wav, or m4a.");
      return;
    }

    setIsUploading(true);
    setMessage("");
    setError("");

    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    try {
      let analysis: Partial<MediaAsset> = {};
      if (mediaType === "image") {
        if (file.size > maxAiImageUploadBytes) {
          setMessage("Large image saved without AI image analysis. Add notes to guide generation.");
          analysis = {
            description: notes || "Image saved. AI analysis was skipped because the file is large.",
            suggestedAngles: notes ? [notes] : [],
            sensitivityWarnings: [],
            tags: tagList
          };
        } else {
          const imageDataUrl = await readFileAsDataUrl(file);
          const response = await fetch("/api/analyze-media", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              imageDataUrl,
              filename: file.name,
              notes
            })
          });
          const payload = await readJsonResponse(response, "Image analysis failed");
          if (response.ok && payload?.ok && payload.data) {
            analysis = {
              description: payload.data.description,
              suggestedAngles: payload.data.suggestedAngles ?? [],
              overlayText: payload.data.overlayText,
              sensitivityWarnings: payload.data.sensitivityWarnings ?? [],
              altText: payload.data.altText,
              tags: tagList.length > 0 ? tagList : payload.data.tags ?? []
            };
          } else {
            setMessage(payload?.error ?? "Saved without AI image analysis.");
            analysis = {
              description: "Image saved. AI analysis was not available.",
              suggestedAngles: [],
              sensitivityWarnings: [],
              tags: tagList
            };
          }
        }
      } else {
        analysis = {
          description: "Video/audio transcription and frame analysis can be added later.",
          suggestedAngles: [],
          sensitivityWarnings: [],
          tags: tagList
        };
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
      const nextAsset = {
        ...baseAsset,
        ...storedAsset,
        localPreviewUrl
      };

      setMediaAssets([nextAsset, ...mediaAssets.filter((asset) => asset.id !== nextAsset.id)]);
      setMessage(
        mediaType === "image"
          ? "Media saved. Image analysis is ready when OpenAI is configured."
          : "Media saved. Video/audio transcription and frame analysis can be added later."
      );
      setNotes("");
      setTags("");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not save that media asset."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function updateAsset(nextAsset: MediaAsset) {
    setMediaAssets(
      mediaAssets.map((asset) => asset.id === nextAsset.id ? nextAsset : asset)
    );
    const savedAsset = await persistMediaAsset(nextAsset, null);
    setMediaAssets((current) =>
      current.map((asset) => asset.id === nextAsset.id ? { ...asset, ...savedAsset } : asset)
    );
    setMessage("Media asset updated.");
  }

  function deleteAsset(assetId: string) {
    removeMediaAsset(assetId);
    if (selectedAssetId === assetId) {
      setSelectedAssetId("");
    }
  }

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Media Library</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Save reusable photos, screenshots, videos, and audio for future Conduit posts. Images can be analyzed now; video/audio transcription and frame analysis can be added later.
            </p>
          </div>
          <Pill>{storageMode === "supabase" ? "Shared media storage" : "Local media session"}</Pill>
        </div>

        <div className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <FieldLabel label="Upload media asset" htmlFor="media-library-upload" />
            <input
              id="media-library-upload"
              type="file"
              accept={acceptedMediaTypes.join(",")}
              disabled={isUploading}
              onChange={(event) => {
                void handleUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
              className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel label="Tags" htmlFor="media-library-tags" />
              <input
                id="media-library-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="factory, workshop, product"
              />
            </div>
            <div>
              <FieldLabel label="Notes" htmlFor="media-library-notes" />
              <input
                id="media-library-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="What this asset shows"
              />
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </Card>

      {mediaAssets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">No reusable media yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a photo, screenshot, video, or audio file to reuse it in future posts.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mediaAssets.map((asset) => (
            <MediaAssetCard
              key={asset.id}
              asset={asset}
              onUse={() => onUseMediaAsset(asset)}
              onViewDetails={() => setSelectedAssetId(asset.id)}
              onDelete={() => deleteAsset(asset.id)}
            />
          ))}
        </div>
      )}

      {selectedAsset && (
        <MediaAssetDetailsPanel
          asset={selectedAsset}
          campaigns={campaigns}
          approvedPosts={approvedPosts}
          onClose={() => setSelectedAssetId("")}
          onUse={() => onUseMediaAsset(selectedAsset)}
          onUpdate={updateAsset}
          onDelete={() => deleteAsset(selectedAsset.id)}
        />
      )}
    </div>
  );
}

function MediaAssetCard({
  asset,
  onUse,
  onViewDetails,
  onDelete
}: {
  asset: MediaAsset;
  onUse: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
      <MediaAssetPreview asset={asset} className="h-48" />
      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold">{asset.filename}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{asset.mediaType}</Pill>
            <Pill>{formatShortDate(asset.uploadedAt)}</Pill>
            {(asset.tags ?? []).slice(0, 3).map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>
        </div>

        {asset.description && (
          <p className="mt-3 truncate text-sm text-muted-foreground">
            {asset.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onUse}>
            Create post
          </Button>
          <Button size="sm" variant="secondary" onClick={onUse}>
            Use in campaign
          </Button>
          <Button size="sm" variant="secondary" onClick={onViewDetails}>
            View details
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MediaAssetPreview({ asset, className }: { asset: MediaAsset; className?: string }) {
  const src = asset.localPreviewUrl || asset.publicUrl || "";

  if (src && asset.mediaType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={asset.altText || asset.filename}
        className={cn("h-64 w-full object-cover", className)}
      />
    );
  }

  if (src && asset.mediaType === "video") {
    return <video src={src} controls className={cn("h-64 w-full bg-black object-contain", className)} />;
  }

  if (src && asset.mediaType === "audio") {
    return (
      <div className={cn("flex h-40 flex-col justify-center bg-muted p-5", className)}>
        <p className="mb-3 text-sm font-bold">{asset.filename}</p>
        <audio src={src} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-48 items-center justify-center bg-muted p-6 text-center text-sm font-semibold text-muted-foreground", className)}>
      Media preview unavailable after refresh.
    </div>
  );
}

function MediaAssetDetailsPanel({
  asset,
  campaigns,
  approvedPosts,
  onClose,
  onUse,
  onUpdate,
  onDelete
}: {
  asset: MediaAsset;
  campaigns: Campaign[];
  approvedPosts: ApprovedPostMemory[];
  onClose: () => void;
  onUse: () => void;
  onUpdate: (asset: MediaAsset) => Promise<void>;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"Overview" | "AI Analysis" | "Usage" | "Settings">("Overview");
  const [tagInput, setTagInput] = useState((asset.tags ?? []).join(", "));
  const [notesInput, setNotesInput] = useState(asset.notes ?? "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const campaignsUsingAsset = campaigns.filter((campaign) =>
    campaign.mediaContext?.assetId === asset.id ||
    (!campaign.mediaContext?.assetId && campaign.mediaContext?.filename === asset.filename)
  );
  const campaignIdsUsingAsset = new Set(campaignsUsingAsset.map((campaign) => campaign.id));
  const approvedUsingAsset = approvedPosts.filter((post) =>
    campaignIdsUsingAsset.has(post.campaignId)
  );

  useEffect(() => {
    setTagInput((asset.tags ?? []).join(", "));
    setNotesInput(asset.notes ?? "");
    setSaveMessage("");
    setSaveError("");
  }, [asset.id, asset.notes, asset.tags]);

  async function saveSettings() {
    setSaveMessage("");
    setSaveError("");
    const nextAsset: MediaAsset = {
      ...asset,
      tags: tagInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
      notes: notesInput.trim()
    };

    try {
      await onUpdate(nextAsset);
      setSaveMessage("Media settings saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save media settings.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-primary">Media details</p>
            <h3 className="mt-1 truncate text-xl font-bold">{asset.filename}</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {(["Overview", "AI Analysis", "Usage", "Settings"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-bold transition",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "Overview" && (
            <div className="grid gap-5">
              <MediaAssetPreview asset={asset} className="max-h-[420px] rounded-md object-contain" />
              <div className="grid gap-3 md:grid-cols-2">
                <BriefItem label="Filename" value={asset.filename} />
                <BriefItem label="Type" value={`${asset.mediaType} · ${asset.fileType || "unknown"}`} />
                <BriefItem label="Uploaded" value={formatShortDate(asset.uploadedAt)} />
                <BriefItem label="Tags" value={(asset.tags ?? []).join(", ") || "No tags yet"} />
              </div>
              <AnalysisBlock label="Notes" value={asset.notes || "No notes yet."} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={onUse}>Create post from this</Button>
                <Button variant="secondary" onClick={onUse}>Use in campaign</Button>
              </div>
            </div>
          )}

          {activeTab === "AI Analysis" && (
            <div className="grid gap-3 md:grid-cols-2">
              <AnalysisBlock
                label="Visual description"
                value={asset.description || "No AI description saved yet."}
              />
              <AnalysisBlock
                label="Suggested content angles"
                value={(asset.suggestedAngles ?? []).join("\n") || "No suggested angles yet."}
              />
              <AnalysisBlock
                label="Suggested overlay text"
                value={asset.overlayText || "No overlay text yet."}
              />
              <AnalysisBlock
                label="Alt text"
                value={asset.altText || "No alt text yet."}
              />
              <AnalysisBlock
                label="AI/generated tags"
                value={(asset.tags ?? []).join(", ") || "No tags yet."}
              />
              {(asset.sensitivityWarnings ?? []).length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                  <p className="text-xs font-bold uppercase">Sensitivity warnings</p>
                  <p className="mt-1">{(asset.sensitivityWarnings ?? []).join(", ")}</p>
                </div>
              ) : (
                <AnalysisBlock label="Sensitivity warnings" value="No warnings saved." />
              )}
            </div>
          )}

          {activeTab === "Usage" && (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Campaigns using this media</p>
                <div className="mt-3 grid gap-2">
                  {campaignsUsingAsset.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No campaigns are tracked with this media yet. Use this asset in Create Post to start tracking usage.
                    </p>
                  ) : (
                    campaignsUsingAsset.map((campaign) => (
                      <div key={campaign.id} className="rounded-md border border-border bg-muted p-3">
                        <p className="font-semibold">{campaign.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {campaign.platforms.join(", ")} · {campaign.createdAt}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Approved posts using this media</p>
                <div className="mt-3 grid gap-2">
                  {approvedUsingAsset.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No approved posts are tracked with this media yet.
                    </p>
                  ) : (
                    approvedUsingAsset.map((post) => (
                      <div key={post.id} className="rounded-md border border-border bg-muted p-3">
                        <p className="font-semibold">{post.platform}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {post.finalContent}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="grid gap-4">
              <div>
                <FieldLabel label="Tags" htmlFor={`media-tags-${asset.id}`} />
                <input
                  id={`media-tags-${asset.id}`}
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="factory, workshop, product"
                />
              </div>
              <div>
                <FieldLabel label="Notes" htmlFor={`media-notes-${asset.id}`} />
                <textarea
                  id={`media-notes-${asset.id}`}
                  value={notesInput}
                  onChange={(event) => setNotesInput(event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                  placeholder="What this media should be used for"
                />
              </div>
              {saveMessage && <p className="text-sm font-semibold text-primary">{saveMessage}</p>}
              {saveError && <p className="text-sm font-semibold text-red-700">{saveError}</p>}
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="danger" onClick={onDelete}>Delete asset</Button>
                <Button onClick={saveSettings}>Save settings</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatShortDate(value?: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatShortDateTime(value?: string) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

const emptyVoiceSourceForm = {
  id: "",
  name: "",
  type: "Founder" as VoiceSourceType,
  platform: "LinkedIn" as VoiceSourcePlatform,
  purposes: ["Use for Voice"] as VoiceSourcePurpose[],
  urls: "",
  urlType: "Social Profile URL" as SourceUrlType,
  syncStatus: "Manual Only" as SyncStatus,
  lastChecked: "Never",
  notes: "",
  examples: ""
};

function VoiceSources({
  voiceSources,
  setVoiceSources,
  selectedVoiceSourceId,
  setSelectedVoiceSourceId,
  importPosts,
  setImportPosts
}: {
  voiceSources: VoiceSource[];
  setVoiceSources: (sources: VoiceSource[]) => void;
  selectedVoiceSourceId: string;
  setSelectedVoiceSourceId: (id: string) => void;
  importPosts: string;
  setImportPosts: (value: string) => void;
}) {
  const [form, setForm] = useState(emptyVoiceSourceForm);
  const [savedAt, setSavedAt] = useState("");
  const isEditing = Boolean(form.id);

  function updateForm<K extends keyof typeof emptyVoiceSourceForm>(
    field: K,
    value: (typeof emptyVoiceSourceForm)[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyVoiceSourceForm);
  }

  function saveSource() {
    const sourceName = form.name.trim() || "Untitled Voice Source";
    const sourceBase: Omit<VoiceSource, "analysis"> = {
      id: form.id || `voice-${Date.now()}`,
      name: sourceName,
      type: form.type,
      platform: form.platform,
      purposes: form.purposes.length > 0 ? form.purposes : ["Use for Voice"],
      urls: form.urls.trim(),
      urlType: form.urlType,
      syncStatus: form.syncStatus,
      lastChecked: form.lastChecked.trim() || "Never",
      notes: form.notes.trim(),
      examples: form.examples.trim(),
      updatedAt: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric"
      }).format(new Date())
    };
    const nextSource: VoiceSource = {
      ...sourceBase,
      analysis: createVoiceAnalysis(sourceBase)
    };
    const nextSources = isEditing
      ? voiceSources.map((source) =>
          source.id === nextSource.id ? nextSource : source
        )
      : [nextSource, ...voiceSources];

    setVoiceSources(nextSources);
    setSelectedVoiceSourceId(nextSource.id);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    resetForm();
  }

  function editSource(source: VoiceSource) {
    setForm({
      id: source.id,
      name: source.name,
      type: source.type,
      platform: source.platform,
      purposes: source.purposes ?? ["Use for Voice"],
      urls: source.urls ?? "",
      urlType: getUrlType(source),
      syncStatus: getSyncStatus(source),
      lastChecked: getLastChecked(source),
      notes: source.notes ?? "",
      examples: source.examples
    });
  }

  function deleteSource(sourceId: string) {
    const nextSources = voiceSources.filter((source) => source.id !== sourceId);
    setVoiceSources(nextSources);
    if (selectedVoiceSourceId === sourceId) {
      setSelectedVoiceSourceId(nextSources[0]?.id ?? "");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              {isEditing ? "Edit voice source" : "Add voice source"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this for founder posts, company posts, social captions, and posts you like. These teach the system how to write.
            </p>
          </div>
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>

        <div className="mt-5 grid gap-4">
          <FieldLabel label="Source name" htmlFor="voice-source-name" />
          <input
            id="voice-source-name"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            className="-mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Daniel Founder LinkedIn"
          />
          <p className="-mt-2 text-sm text-muted-foreground">
            Name this by person, account, or voice. Put links in the URL field below.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Source type" htmlFor="voice-source-type" />
              <select
                id="voice-source-type"
                value={form.type}
                onChange={(event) =>
                  updateForm("type", event.target.value as VoiceSourceType)
                }
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {voiceSourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel label="Platform" htmlFor="voice-source-platform" />
              <select
                id="voice-source-platform"
                value={form.platform}
                onChange={(event) =>
                  updateForm("platform", event.target.value as VoiceSourcePlatform)
                }
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {voiceSourcePlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground">Source purpose</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {voiceSourcePurposes.map((purpose) => (
                <label
                  key={purpose}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-3 text-sm font-semibold",
                    form.purposes.includes(purpose)
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-border bg-white text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.purposes.includes(purpose)}
                    onChange={() =>
                      updateForm(
                        "purposes",
                        form.purposes.includes(purpose)
                          ? form.purposes.filter((item) => item !== purpose)
                          : [...form.purposes, purpose]
                      )
                    }
                    className="h-4 w-4 accent-teal-700"
                  />
                  {purpose}
                </label>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="URLs" htmlFor="voice-source-urls" />
            <textarea
              id="voice-source-urls"
              value={form.urls}
              onChange={(event) => updateForm("urls", event.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste profile URLs, individual post URLs, or reference links."
            />
            <p className="mt-2 text-sm text-muted-foreground">
              URLs are stored for reference only right now. The app does not fetch or sync them yet.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel label="URL type" htmlFor="voice-url-type" />
              <select
                id="voice-url-type"
                value={form.urlType}
                onChange={(event) =>
                  updateForm("urlType", event.target.value as SourceUrlType)
                }
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {sourceUrlTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel label="Sync status" htmlFor="voice-sync-status" />
              <select
                id="voice-sync-status"
                value={form.syncStatus}
                onChange={(event) =>
                  updateForm("syncStatus", event.target.value as SyncStatus)
                }
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {syncStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel label="Last checked" htmlFor="voice-last-checked" />
              <input
                id="voice-last-checked"
                value={form.lastChecked}
                onChange={(event) => updateForm("lastChecked", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <LearningNowBox />
          <SyncReadinessBox message={voiceSyncReadinessMessage(form)} />

          <div>
            <FieldLabel label="Example posts" htmlFor="voice-source-examples" />
            <textarea
              id="voice-source-examples"
              value={form.examples}
              onChange={(event) => updateForm("examples", event.target.value)}
              className="mt-2 min-h-[220px] w-full rounded-md border border-input bg-white p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste several posts, captions, hooks, or excerpts from this source..."
            />
          </div>

          <div>
            <FieldLabel label="Notes" htmlFor="voice-source-notes" />
            <input
              id="voice-source-notes"
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Why this source matters or how to use it later"
            />
          </div>

          <div className="rounded-md border border-dashed border-border bg-white p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">Import posts scratchpad</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Older pasted posts are kept here locally. Move useful examples into a saved voice source.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  updateForm(
                    "examples",
                    [form.examples, importPosts].filter(Boolean).join("\n\n")
                  )
                }
              >
                Add to examples
              </Button>
            </div>
            <textarea
              value={importPosts}
              onChange={(event) => setImportPosts(event.target.value)}
              className="mt-3 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste posts here before turning them into a named voice source."
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {savedAt ? (
              <span className="text-sm font-semibold text-primary">Saved {savedAt}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Stored locally in this browser.
              </span>
            )}
            <Button onClick={saveSource}>
              <Check size={16} /> Save source
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {voiceSources.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-semibold">No voice sources yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add one to make campaign generation feel more specific.
            </p>
          </Card>
        ) : (
          voiceSources.map((source) => (
            <VoiceSourceCard
              key={source.id}
              source={source}
              isSelected={selectedVoiceSourceId === source.id}
              onUse={() => setSelectedVoiceSourceId(source.id)}
              onEdit={() => editSource(source)}
              onDelete={() => deleteSource(source.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function VoiceSourceCard({
  source,
  isSelected,
  onUse,
  onEdit,
  onDelete
}: {
  source: VoiceSource;
  isSelected: boolean;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn("p-5", isSelected && "border-primary bg-teal-50/60")}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{cleanVoiceSourceName(source.name)}</h3>
            {isSelected && <Pill>Selected</Pill>}
          </div>
          {looksLikeUrl(source.name) && (
            <p className="mt-2 text-sm font-semibold text-red-700">
              This source name looks like a URL. Rename it so results stay clean.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{source.type}</Pill>
            <Pill>{source.platform}</Pill>
            <Pill>{countUrls(source.urls ?? "")} URLs</Pill>
            <Pill>{getUrlType(source)}</Pill>
            <Pill>{getSyncStatus(source)}</Pill>
            <Pill>Last checked: {getLastChecked(source)}</Pill>
            {(source.purposes ?? ["Use for Voice"]).map((purpose) => (
              <Pill key={purpose}>{purpose}</Pill>
            ))}
            <span className="text-xs font-semibold text-muted-foreground">
              Updated {source.updatedAt}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled>
            Auto-sync posts
          </Button>
          <Button size="sm" variant={isSelected ? "primary" : "secondary"} onClick={onUse}>
            Use
          </Button>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {source.notes && (
        <p className="mt-3 text-sm text-muted-foreground">{source.notes}</p>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <LearningNowBox />
        <SyncReadinessBox message={voiceSyncReadinessMessage(source)} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <AnalysisBlock label="Tone" value={source.analysis.tone} />
        <AnalysisBlock label="Common hooks" value={source.analysis.commonHooks} />
        <AnalysisBlock label="Common phrases" value={source.analysis.commonPhrases} />
        <AnalysisBlock label="Sentence style" value={source.analysis.sentenceStyle} />
        <AnalysisBlock label="What to avoid" value={source.analysis.avoid} />
        <AnalysisBlock label="Best use cases" value={source.analysis.bestUseCases} />
      </div>
    </Card>
  );
}

function AnalysisBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}

function LearningNowBox() {
  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
      <p className="font-bold">How learning works right now</p>
      <p className="mt-1">
        Right now, the AI learns from pasted examples and pasted source content. URLs are stored as references only.
      </p>
    </div>
  );
}

function SyncReadinessBox({
  message,
  buttonLabel = "Auto-sync posts"
}: {
  message: string;
  buttonLabel?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <p className="text-sm font-bold">Sync readiness</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button size="sm" variant="secondary" disabled>
          {buttonLabel}
        </Button>
        <span className="text-sm text-muted-foreground">
          Coming later: connect account or API access to pull latest posts automatically.
        </span>
      </div>
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm font-semibold leading-6 text-amber-900">
      {children}
    </div>
  );
}

function SubtleNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-6 text-slate-500">
      {children}
    </p>
  );
}

function FieldLabel({ label, htmlFor }: { label: string; htmlFor: string }) {
  return (
    <label className="text-sm font-bold text-slate-600" htmlFor={htmlFor}>
      {label}
    </label>
  );
}

function BrandRules({
  uploadText,
  brandVoice,
  setBrandVoice,
  persistBrandRules,
  storageMode
}: {
  uploadText: string;
  brandVoice: BrandVoiceProfile;
  setBrandVoice: (profile: BrandVoiceProfile) => void;
  persistBrandRules: (profile: BrandVoiceProfile) => void;
  storageMode: StorageMode;
}) {
  const wordCount = uploadText.split(/\s+/).filter(Boolean).length;
  const [savedAt, setSavedAt] = useState("");

  function updateField(field: keyof BrandVoiceProfile, value: string) {
    setBrandVoice({ ...brandVoice, [field]: value });
  }

  function handleSave() {
    if (storageMode === "supabase") {
      persistBrandRules(brandVoice);
    } else {
      writeLocalValue(storageKeys.brandVoice, brandVoice);
    }
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold">Brand Voice Rules</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Global writing rules that apply across all generated content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-sm font-semibold text-primary">Saved {savedAt}</span>
            )}
            <Button size="sm" onClick={handleSave}>
              Save profile
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <VoiceField
            id="voice-tone"
            title="Tone"
            value={brandVoice.tone}
            onChange={(value) => updateField("tone", value)}
          />
          <VoiceField
            id="voice-style"
            title="Style"
            value={brandVoice.style}
            onChange={(value) => updateField("style", value)}
          />
          <VoiceField
            id="voice-audience"
            title="Audience"
            value={brandVoice.audience}
            onChange={(value) => updateField("audience", value)}
          />
          <VoiceField
            id="voice-avoid"
            title="Avoid"
            value={brandVoice.avoid}
            onChange={(value) => updateField("avoid", value)}
          />
        </div>
      </Card>
      <Card className="p-5">
        <Sparkles className="text-primary" size={24} />
        <h3 className="mt-4 text-lg font-bold">Mock confidence</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Based on pasted examples, this profile is ready for mock campaign generation.
        </p>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(95, 45 + wordCount)}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold">{Math.min(95, 45 + wordCount)}% profile strength</p>
      </Card>
    </div>
  );
}

function VoiceField({
  id,
  title,
  value,
  onChange
}: {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <label className="font-semibold" htmlFor={id}>{title}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function RepurposeCampaign({
  source,
  campaigns,
  profiles,
  selectedProfileId,
  setSelectedProfileId,
  targetPlatforms,
  setTargetPlatforms,
  contentAngle,
  setContentAngle,
  intent,
  setIntent,
  librarySources,
  selectedLibrarySourceIds,
  setSelectedLibrarySourceIds,
  reuseMedia,
  setReuseMedia,
  generationError,
  generationNotice,
  isGenerating,
  setScreen,
  setSource,
  handleGenerate,
  handleMockFallback
}: {
  source: RepurposeSource | null;
  campaigns: Campaign[];
  profiles: Profile[];
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  targetPlatforms: Platform[];
  setTargetPlatforms: (platforms: Platform[]) => void;
  contentAngle: ContentAngle | "";
  setContentAngle: (angle: ContentAngle | "") => void;
  intent: string;
  setIntent: (value: string) => void;
  librarySources: LibrarySource[];
  selectedLibrarySourceIds: string[];
  setSelectedLibrarySourceIds: (ids: string[]) => void;
  reuseMedia: boolean;
  setReuseMedia: (value: boolean) => void;
  generationError: string;
  generationNotice: string;
  isGenerating: boolean;
  setScreen: (screen: Screen) => void;
  setSource: (source: RepurposeSource | null) => void;
  handleGenerate: () => void;
  handleMockFallback: () => void;
}) {
  const selectedLibrarySources = librarySources.filter((item) =>
    selectedLibrarySourceIds.includes(item.id)
  );

  function toggleTargetPlatform(platform: Platform) {
    setTargetPlatforms(
      targetPlatforms.includes(platform)
        ? targetPlatforms.filter((item) => item !== platform)
        : [...targetPlatforms, platform]
    );
  }

  function toggleLibrarySource(sourceId: string) {
    setSelectedLibrarySourceIds(
      selectedLibrarySourceIds.includes(sourceId)
        ? selectedLibrarySourceIds.filter((id) => id !== sourceId)
        : [...selectedLibrarySourceIds, sourceId]
    );
  }

  function chooseSource(value: string) {
    const [type, campaignId, postId] = value.split(":");
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    if (type === "post") {
      const post = campaign.posts.find((item) => item.id === postId);
      if (!post) return;
      setSource({
        type: "post",
        campaignId,
        postId,
        label: `${campaign.name} · ${post.platform}`,
        content: userFacingPostContent(post.content, campaign, post),
        mediaContext: campaign.mediaContext,
        originalProfileId: campaign.profileId ?? post.profileId
      });
      return;
    }
    setSource({
      type: "campaign",
      campaignId,
      label: campaign.name,
      content: [
        campaign.intent && `Intent: ${campaign.intent}`,
        campaign.contentAngle && `Content angle: ${campaign.contentAngle}`,
        campaign.idea && `Details: ${campaign.idea}`,
        campaign.posts
          .filter((post) => post.status === "approved")
          .map((post) => `${post.platform}: ${userFacingPostContent(post.content, campaign, post)}`)
          .join("\n\n")
      ]
        .filter(Boolean)
        .join("\n\n"),
      mediaContext: campaign.mediaContext,
      originalProfileId: campaign.profileId
    });
  }

  const sourceValue = source
    ? `${source.type}:${source.campaignId}${source.postId ? `:${source.postId}` : ""}`
    : "";
  const generateBlocked =
    !source ||
    !selectedProfileId ||
    targetPlatforms.length === 0 ||
    !contentAngle ||
    looksLikeGenericIntent(intent);

  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-primary">Repurpose</p>
          <h3 className="mt-1 text-2xl font-bold">Turn existing content into native drafts</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Preserve the core idea, then rewrite it for the target platforms.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setScreen("Dashboard")}>
          Back to dashboard
        </Button>
      </div>

      <div className="grid gap-5">
        <div>
          <FieldLabel label="Source post or campaign" htmlFor="repurpose-source" />
          <select
            id="repurpose-source"
            value={sourceValue}
            onChange={(event) => chooseSource(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a source</option>
            {campaigns.map((campaign) => (
              <option key={`campaign-${campaign.id}`} value={`campaign:${campaign.id}`}>
                Campaign: {campaign.name}
              </option>
            ))}
            {campaigns.flatMap((campaign) =>
              campaign.posts
                .filter((post) => post.status === "approved")
                .map((post) => (
                  <option key={post.id} value={`post:${campaign.id}:${post.id}`}>
                    Approved post: {campaign.name} · {post.platform}
                  </option>
                ))
            )}
          </select>
          {source && (
            <div className="mt-3 rounded-md border border-border bg-muted p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <Pill>{source.type}</Pill>
                <Pill>{source.label}</Pill>
                {source.mediaContext && <Pill>Has original media context</Pill>}
              </div>
              <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6">
                {source.content}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Profile to draft for" htmlFor="repurpose-profile" />
            <select
              id="repurpose-profile"
              value={selectedProfileId}
              onChange={(event) => setSelectedProfileId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose profile</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel label="Content angle" htmlFor="repurpose-angle" />
            <select
              id="repurpose-angle"
              value={contentAngle}
              onChange={(event) => setContentAngle(event.target.value as ContentAngle | "")}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose an angle</option>
              {contentAngles.map((angle) => (
                <option key={angle} value={angle}>{angle}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel label="Intent / what should change" htmlFor="repurpose-intent" />
          <textarea
            id="repurpose-intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Example: Turn this approved LinkedIn post into concise X posts and a visual Instagram caption without copying it word-for-word."
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground">Target platforms</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => toggleTargetPlatform(platform)}
                className={cn(
                  "rounded-md border p-4 text-left font-semibold transition",
                  targetPlatforms.includes(platform)
                    ? "border-primary bg-teal-50 text-primary"
                    : "border-border bg-white text-foreground hover:bg-muted"
                )}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {source?.mediaContext && (
          <label className="flex items-start gap-3 rounded-md border border-border bg-white p-4 text-sm">
            <input
              type="checkbox"
              checked={reuseMedia}
              onChange={(event) => setReuseMedia(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Reuse original media context.</span>
              <span className="mt-1 block text-muted-foreground">
                The media file preview may still be session-only, but filename, notes, and image analysis can be reused.
              </span>
            </span>
          </label>
        )}

        {librarySources.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              Optional Company Knowledge
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {librarySources.map((sourceItem) => (
                <button
                  key={sourceItem.id}
                  onClick={() => toggleLibrarySource(sourceItem.id)}
                  className={cn(
                    "rounded-md border p-4 text-left transition",
                    selectedLibrarySourceIds.includes(sourceItem.id)
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-border bg-white text-foreground hover:bg-muted"
                  )}
                >
                  <p className="font-semibold">{sourceItem.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sourceItem.category} · {sourceItem.platform}
                  </p>
                </button>
              ))}
            </div>
            {selectedLibrarySources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedLibrarySources.map((item) => <Pill key={item.id}>{item.name}</Pill>)}
              </div>
            )}
          </div>
        )}

        <div className="rounded-md border border-primary/20 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
          <p className="font-bold">Repurpose rules</p>
          <p className="mt-1">
            Do not copy the source word-for-word. Preserve the core idea and rewrite the format, length, tone, and media use for each target platform.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isGenerating || generateBlocked}>
            <Sparkles size={16} /> {isGenerating ? "Repurposing..." : "Generate repurposed drafts"}
          </Button>
        </div>
        {(generationError || generationNotice) && (
          <div
            className={cn(
              "rounded-md border p-4 text-sm",
              generationError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-teal-200 bg-teal-50 text-teal-800"
            )}
          >
            <p className="font-semibold">
              {generationError ? "Repurpose issue" : "Repurpose status"}
            </p>
            <p className="mt-1">{generationError || generationNotice}</p>
            {generationError && (
              <Button className="mt-3" size="sm" variant="secondary" onClick={handleMockFallback}>
                Use mock fallback
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function MediaLibraryPicker({
  mediaAssets,
  selectedMediaAssetId,
  onSelect
}: {
  mediaAssets: MediaAsset[];
  selectedMediaAssetId: string;
  onSelect: (asset: MediaAsset) => void;
}) {
  if (mediaAssets.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">
        No reusable media yet. Upload here for this post, or add reusable assets from Media Library.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">Select from Media Library</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {mediaAssets.slice(0, 6).map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onSelect(asset)}
            className={cn(
              "rounded-md border bg-white p-3 text-left transition hover:border-primary",
              selectedMediaAssetId === asset.id ? "border-primary ring-2 ring-primary/20" : "border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold">{asset.filename}</span>
              {selectedMediaAssetId === asset.id && <Pill>Selected</Pill>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {asset.mediaType} · {asset.tags?.slice(0, 2).join(", ") || "No tags"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function NewCampaign({
  campaignName,
  setCampaignName,
  campaignTemplate,
  setCampaignTemplate,
  contentAngle,
  setContentAngle,
  simpleStyleChips,
  setSimpleStyleChips,
  intent,
  setIntent,
  useApprovedPosts,
  setUseApprovedPosts,
  idea,
  setIdea,
  mediaContext,
  setMediaContext,
  mediaPreviewUrl,
  mediaAssets,
  selectedMediaAssetId,
  applyMediaAsset,
  handleMediaFile,
  clearMedia,
  brandVoice,
  selectedPlatforms,
  setSelectedPlatforms,
  togglePlatform,
  profiles,
  selectedProfileId,
  setSelectedProfileId,
  selectedVoiceInfluenceIds,
  setSelectedVoiceInfluenceIds,
  selectedInspirationProfileIds,
  setSelectedInspirationProfileIds,
  librarySources,
  selectedLibrarySourceIds,
  setSelectedLibrarySourceIds,
  generationError,
  generationNotice,
  isGenerating,
  handleGenerate,
  handleMockFallback,
  createDefaultConduitProfile
}: {
  campaignName: string;
  setCampaignName: (value: string) => void;
  campaignTemplate: CampaignTemplate;
  setCampaignTemplate: (value: CampaignTemplate) => void;
  contentAngle: ContentAngle | "";
  setContentAngle: (value: ContentAngle | "") => void;
  simpleStyleChips: SimpleStyleChip[];
  setSimpleStyleChips: (value: SimpleStyleChip[]) => void;
  intent: string;
  setIntent: (value: string) => void;
  useApprovedPosts: boolean;
  setUseApprovedPosts: (value: boolean) => void;
  idea: string;
  setIdea: (value: string) => void;
  mediaContext: CampaignMediaContext;
  setMediaContext: (context: CampaignMediaContext) => void;
  mediaPreviewUrl: string;
  mediaAssets: MediaAsset[];
  selectedMediaAssetId: string;
  applyMediaAsset: (asset: MediaAsset) => void;
  handleMediaFile: (file?: File) => void;
  clearMedia: () => void;
  brandVoice: BrandVoiceProfile;
  selectedPlatforms: Platform[];
  setSelectedPlatforms: (platforms: Platform[]) => void;
  togglePlatform: (platform: Platform) => void;
  profiles: Profile[];
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  selectedVoiceInfluenceIds: string[];
  setSelectedVoiceInfluenceIds: (ids: string[]) => void;
  selectedInspirationProfileIds: string[];
  setSelectedInspirationProfileIds: (ids: string[]) => void;
  librarySources: LibrarySource[];
  selectedLibrarySourceIds: string[];
  setSelectedLibrarySourceIds: (ids: string[]) => void;
  generationError: string;
  generationNotice: string;
  isGenerating: boolean;
  handleGenerate: () => void;
  handleMockFallback: () => void;
  createDefaultConduitProfile: () => void;
}) {
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const selectedTemplate = campaignTemplateConfigs[campaignTemplate];
  const internalVoiceProfiles = profiles.filter(isInternalVoiceProfile);
  const inspirationProfiles = profiles.filter(isInspirationProfile);
  const selectedVoiceInfluences = profiles.filter((profile) =>
    selectedVoiceInfluenceIds.includes(profile.id)
  );
  const selectedInspirationProfiles = profiles.filter((profile) =>
    selectedInspirationProfileIds.includes(profile.id)
  );
  const [campaignMode, setCampaignMode] = useState<"simple" | "advanced">("simple");
  const isAdvanced = campaignMode === "advanced";
  const hasConduitProfile = profiles.some((profile) => profile.name.toLowerCase() === "conduit");
  const mainPostIdea = intent;
  const hasMainPostIdea = Boolean(mainPostIdea.trim()) && !looksLikeGenericIntent(mainPostIdea);
  const activeSimpleStyleInstructions = simpleStyleOptions
    .filter((style) => simpleStyleChips.includes(style.label))
    .map((style) => style.instruction);
  const selectedLibrarySources = selectedLibrarySourceIds.length > 0
      ? librarySources.filter((source) => selectedLibrarySourceIds.includes(source.id))
      : librarySources;
  const warnings = genericLanguageWarnings([intent, idea, mediaContext.notes ?? "", campaignName]);
  const qualityChecks = [
    { label: "Posting Account selected", ok: Boolean(selectedProfileId) },
    { label: "Content angle selected", ok: Boolean(contentAngle) },
    { label: "Intent is specific", ok: !looksLikeGenericIntent(intent) },
    {
      label: "Media notes added if media exists",
      ok: !mediaContext.filename || !looksLikeVagueMediaNotes(mediaContext.notes)
    },
    {
      label:
        selectedLibrarySources.length > 0
          ? "Company Knowledge selected"
          : "Company Knowledge skipped",
      ok: true
    },
    {
      label: "Brand Voice Rules present",
      ok: Boolean(brandVoice.tone || brandVoice.style || brandVoice.audience || brandVoice.avoid)
    }
  ];
  const generationBlocked =
    !hasMainPostIdea ||
    selectedPlatforms.length === 0;
  const friendlyChecks = [
    {
      label: hasMainPostIdea ? "Ready" : "Needs main point",
      ok: hasMainPostIdea
    },
    {
      label: selectedPlatforms.length > 0 ? "Ready" : "Needs platform",
      ok: selectedPlatforms.length > 0
    },
    {
      label:
        mediaContext.filename && looksLikeVagueMediaNotes(mediaContext.notes)
          ? "Optional: Add media context"
          : "Ready",
      ok: true
    }
  ];

  useEffect(() => {
    if (selectedProfileId) {
      return;
    }
    const conduitProfile = profiles.find((profile) => profile.name.toLowerCase() === "conduit");
    if (conduitProfile) {
      setSelectedProfileId(conduitProfile.id);
    }
  }, [profiles, selectedProfileId, setSelectedProfileId]);

  function toggleLibrarySource(sourceId: string) {
    setSelectedLibrarySourceIds(
      selectedLibrarySourceIds.includes(sourceId)
        ? selectedLibrarySourceIds.filter((id) => id !== sourceId)
        : [...selectedLibrarySourceIds, sourceId]
    );
  }

  function toggleVoiceInfluence(profileId: string) {
    setSelectedVoiceInfluenceIds(
      selectedVoiceInfluenceIds.includes(profileId)
        ? selectedVoiceInfluenceIds.filter((id) => id !== profileId)
        : [...selectedVoiceInfluenceIds, profileId]
    );
  }

  function toggleInspirationProfile(profileId: string) {
    setSelectedInspirationProfileIds(
      selectedInspirationProfileIds.includes(profileId)
        ? selectedInspirationProfileIds.filter((id) => id !== profileId)
        : [...selectedInspirationProfileIds, profileId]
    );
  }

  function toggleSimpleStyle(style: SimpleStyleChip) {
    if (style === "Conduit default") {
      setSimpleStyleChips(["Conduit default"]);
      return;
    }

    const withoutDefault = simpleStyleChips.filter((chip) => chip !== "Conduit default");
    const next = withoutDefault.includes(style)
      ? withoutDefault.filter((chip) => chip !== style)
      : [...withoutDefault, style];
    setSimpleStyleChips(next.length > 0 ? next : ["Conduit default"]);
  }

  function useTemplate() {
    if (selectedTemplate.contentAngle) {
      setContentAngle(selectedTemplate.contentAngle);
    }

    if (selectedPlatforms.length === 0) {
      setSelectedPlatforms(selectedTemplate.recommendedPlatforms);
    }
  }

  return (
    <Card className="p-5">
      <div className="grid gap-5">
        <div className="flex flex-col justify-between gap-3 rounded-md border border-border bg-white p-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold">Create Post</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the main point. The app will use Conduit knowledge and brand rules automatically.
            </p>
          </div>
          <div className="flex rounded-md border border-border bg-muted p-1">
            {(["simple", "advanced"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCampaignMode(mode)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-bold capitalize transition",
                  campaignMode === mode
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {!isAdvanced && (
          <div>
            <FieldLabel label="What should this post say?" htmlFor="main-post-idea" />
            <textarea
              id="main-post-idea"
              value={mainPostIdea}
              onChange={(event) => setIntent(event.target.value)}
              className="mt-2 min-h-[220px] w-full rounded-md border border-input bg-white p-5 text-base leading-7 outline-none focus:ring-2 focus:ring-ring"
              placeholder="Example: Show that Conduit is building close to hardware, factories, and real industrial operations."
            />
            {warnings.length > 0 && (
              <SubtleNote>Replace generic language before generating: {warnings.join(", ")}.</SubtleNote>
            )}
          </div>
        )}

        {!isAdvanced && (
          <div className="rounded-md border border-border bg-white p-4">
            <p className="text-sm font-bold uppercase text-muted-foreground">Style</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a light direction for this draft. Advanced mode has full voice and inspiration controls.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {simpleStyleOptions.map((style) => (
                <button
                  key={style.label}
                  type="button"
                  onClick={() => toggleSimpleStyle(style.label)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-bold transition",
                    simpleStyleChips.includes(style.label)
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:bg-white hover:text-foreground"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isAdvanced && (
          <div className="rounded-md border border-border bg-white p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Upload media</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Optional: add a photo, screenshot, video, or audio file, then give it a short note.
                </p>
              </div>
              {(mediaContext.filename || mediaContext.notes) && (
                <Button size="sm" variant="secondary" onClick={clearMedia}>
                  Clear media
                </Button>
              )}
            </div>
            <div className="mt-4">
              <MediaLibraryPicker
                mediaAssets={mediaAssets}
                selectedMediaAssetId={selectedMediaAssetId}
                onSelect={applyMediaAsset}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <FieldLabel label="Upload media" htmlFor="campaign-media-simple" />
                <input
                  id="campaign-media-simple"
                  type="file"
                  accept={acceptedMediaTypes.join(",")}
                  onChange={(event) => handleMediaFile(event.target.files?.[0])}
                  className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                {mediaContext.filename && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill>{mediaContext.filename}</Pill>
                    <Pill>{mediaContext.type ?? "media"}</Pill>
                  </div>
                )}
              </div>
              <div>
                <FieldLabel label="Short media/context note" htmlFor="campaign-media-notes-simple" />
                <textarea
                  id="campaign-media-notes-simple"
                  value={mediaContext.notes ?? ""}
                  onChange={(event) =>
                    setMediaContext({
                      ...mediaContext,
                      notes: event.target.value
                    })
                  }
                  className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                  placeholder="What happened? Why does it matter? What should the post focus on?"
                />
              </div>
            </div>
            {mediaPreviewUrl && (
              <div className="mt-4 overflow-hidden rounded-md border border-border bg-muted p-3">
                {mediaContext.type === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaPreviewUrl}
                    alt={mediaContext.filename ?? "Uploaded media preview"}
                    className="max-h-80 w-full rounded-md object-contain"
                  />
                )}
                {mediaContext.type === "video" && (
                  <video src={mediaPreviewUrl} controls className="max-h-80 w-full rounded-md bg-black" />
                )}
                {mediaContext.type === "audio" && (
                  <div className="rounded-md bg-white p-4">
                    <p className="mb-3 text-sm font-semibold">{mediaContext.filename}</p>
                    <audio src={mediaPreviewUrl} controls className="w-full" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isAdvanced && <div className="rounded-md border border-primary/20 bg-teal-50 p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <FieldLabel label="Campaign template" htmlFor="campaign-template" />
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Start from a repeatable brief structure, then fill in your own specific intent and details.
              </p>
              <select
                id="campaign-template"
                value={campaignTemplate}
                onChange={(event) => setCampaignTemplate(event.target.value as CampaignTemplate)}
                className="mt-3 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.keys(campaignTemplateConfigs).map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </div>
            <Button className="md:mt-8" variant="secondary" onClick={useTemplate}>
              Use this template
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>
              Suggested angle: {selectedTemplate.contentAngle || "Choose your own"}
            </Pill>
            <Pill>
              Recommended: {selectedTemplate.recommendedPlatforms.join(", ")}
            </Pill>
          </div>
          <div className="mt-4 rounded-md border border-border bg-white p-4">
            <p className="text-sm font-bold uppercase text-muted-foreground">
              Helper questions
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {selectedTemplate.helperQuestions.map((question) => (
                <div key={question} className="rounded-md bg-muted px-3 py-2 text-sm">
                  {question}
                </div>
              ))}
            </div>
          </div>
        </div>}

        <div>
          <label className="text-sm font-semibold text-muted-foreground" htmlFor="campaign-profile">
            Posting Account
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            Who this post is for or being posted as. Conduit is the primary default.
          </p>
          <select
            id="campaign-profile"
            value={selectedProfileId}
            onChange={(event) => setSelectedProfileId(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No saved profile selected</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} · {profile.type}
              </option>
            ))}
          </select>
          {selectedProfile ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <Pill>{selectedProfile.type}</Pill>
                {selectedProfile.role && <Pill>{selectedProfile.role}</Pill>}
                {isAdvanced && <Pill>{countProfileUrls(selectedProfile)} URLs</Pill>}
                {isAdvanced && <Pill>{selectedProfile.syncStatus}</Pill>}
                {isAdvanced && <Pill>Last checked: {selectedProfile.lastChecked}</Pill>}
                {isAdvanced && <Pill>{countWords(selectedProfile.examples)} words pasted</Pill>}
              </div>
              {selectedProfile.bio && (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedProfile.bio}</p>
              )}
              {isAdvanced && countProfileUrls(selectedProfile) > 0 && !selectedProfile.examples.trim() && (
                <SubtleNote>URLs saved. Add examples later to improve voice.</SubtleNote>
              )}
              {isAdvanced && selectedProfile.examples.trim() && (
                <SubtleNote>Ready for generation.</SubtleNote>
              )}
              {!isAdvanced && (
                <SubtleNote>Using Conduit Company Knowledge automatically.</SubtleNote>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-muted-foreground shadow-sm">
              <p>Create a Profile to draft as Conduit, a founder, team member, company, or team. Generation can still run with the general brand voice.</p>
              {!hasConduitProfile && (
                <Button className="mt-3" size="sm" onClick={createDefaultConduitProfile}>
                  Create default Conduit profile
                </Button>
              )}
            </div>
          )}
        </div>

        {isAdvanced && <div>
          <p className="text-sm font-semibold text-muted-foreground">Voice Influence</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal voices that help the post sound like us. These shape cadence and clarity, but the Posting Account still determines who is speaking.
          </p>
          {internalVoiceProfiles.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
              Add Conduit, founder, team, or internal voice profiles to influence style.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {internalVoiceProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => toggleVoiceInfluence(profile.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left shadow-sm transition",
                    selectedVoiceInfluenceIds.includes(profile.id)
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-slate-200 bg-white text-foreground hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <p className="font-semibold">{profile.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.type} · {profile.role || "Voice source"} · {countWords(profile.examples)} words
                  </p>
                </button>
              ))}
            </div>
          )}
          {selectedVoiceInfluences.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedVoiceInfluences.map((profile) => (
                <Pill key={profile.id}>{profile.name}</Pill>
              ))}
            </div>
          )}
        </div>
        }

        {isAdvanced && <div>
          <p className="text-sm font-semibold text-muted-foreground">Inspiration / Reference Profiles</p>
          <p className="mt-1 text-sm text-muted-foreground">
            External examples that can inspire format or style, without copying. These never override Conduit facts, Company Knowledge, or Brand Voice Rules.
          </p>
          {inspirationProfiles.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
              Add Inspiration / Reference profiles for external creative patterns you like.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {inspirationProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => toggleInspirationProfile(profile.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left shadow-sm transition",
                    selectedInspirationProfileIds.includes(profile.id)
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-slate-200 bg-white text-foreground hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <p className="font-semibold">{profile.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.type} · learn patterns only
                  </p>
                </button>
              ))}
            </div>
          )}
          {selectedInspirationProfiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedInspirationProfiles.map((profile) => (
                <Pill key={profile.id}>{profile.name}</Pill>
              ))}
            </div>
          )}
        </div>
        }

        <div>
          <p className="text-sm font-semibold text-muted-foreground">Platforms</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={cn(
                  "rounded-lg border p-4 text-left font-semibold shadow-sm transition",
                  selectedPlatforms.includes(platform)
                    ? "border-primary bg-teal-50 text-primary"
                    : "border-slate-200 bg-white text-foreground hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {isAdvanced && <div>
          <label className="text-sm font-semibold text-muted-foreground" htmlFor="campaign-name">
            Campaign name
          </label>
          <input
            id="campaign-name"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>}

        {isAdvanced && <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <FieldLabel label="Content angle" htmlFor="content-angle" />
            <select
              id="content-angle"
              value={contentAngle}
              onChange={(event) => setContentAngle(event.target.value as ContentAngle | "")}
              className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose an angle</option>
              {contentAngles.map((angle) => (
                <option key={angle} value={angle}>
                  {angle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel label="What should this post communicate?" htmlFor="campaign-intent" />
            <textarea
              id="campaign-intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              placeholder={selectedTemplate.intentPlaceholder}
            />
          </div>
        </div>}

        {isAdvanced && <label className="flex items-start gap-3 rounded-md border border-border bg-white p-4 text-sm">
          <input
            type="checkbox"
            checked={useApprovedPosts}
            onChange={(event) => setUseApprovedPosts(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Use approved posts to improve future drafts.</span>
            <span className="mt-1 block text-muted-foreground">
              The generator will use 3 to 5 recent approved posts from the selected Profile as style examples.
            </span>
          </span>
        </label>}

        {isAdvanced && <div>
          <FieldLabel label="Details / raw notes" htmlFor="idea" />
          <textarea
            id="idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            className="mt-2 min-h-[180px] w-full rounded-md border border-input bg-white p-4 leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder={selectedTemplate.detailsPlaceholder}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Intent drives the output. Details give the AI concrete raw material to work with. Use the template questions above as prompts, not as copy to paste.
          </p>
          {warnings.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Replace generic language before generating: {warnings.join(", ")}.
            </div>
          )}
        </div>}

        {isAdvanced && <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-muted-foreground">Media</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Upload a photo, screenshot, video, or audio file. Images can be analyzed by AI now. Video/audio transcription can be added later.
              </p>
              {isAdvanced && <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Media preview uses a temporary object URL and is not persisted after refresh yet. Filename, type, notes, and analysis save with the campaign.
              </p>}
            </div>
            {(mediaContext.filename || mediaContext.notes) && (
              <Button size="sm" variant="secondary" onClick={clearMedia}>
                Clear media
              </Button>
            )}
          </div>

          <div className="mt-4">
            <MediaLibraryPicker
              mediaAssets={mediaAssets}
              selectedMediaAssetId={selectedMediaAssetId}
              onSelect={applyMediaAsset}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <FieldLabel label="Upload media" htmlFor="campaign-media" />
              <input
                id="campaign-media"
                type="file"
                accept={acceptedMediaTypes.join(",")}
                onChange={(event) => handleMediaFile(event.target.files?.[0])}
                className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {mediaContext.filename && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{mediaContext.filename}</Pill>
                  <Pill>{mediaContext.type ?? "media"}</Pill>
                  <Pill>Session preview only</Pill>
                </div>
              )}
            </div>

            <div>
              <FieldLabel label={isAdvanced ? "Manual media notes/context" : "Short media/context note"} htmlFor="campaign-media-notes" />
              <textarea
                id="campaign-media-notes"
                value={mediaContext.notes ?? ""}
                onChange={(event) =>
                  setMediaContext({
                    ...mediaContext,
                    notes: event.target.value
                  })
                }
                className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                placeholder={selectedTemplate.mediaNotesPlaceholder}
              />
              {mediaContext.filename && looksLikeVagueMediaNotes(mediaContext.notes) && (
                <SubtleNote>Add what happened, why it matters, and what angle you want.</SubtleNote>
              )}
            </div>
          </div>

          {mediaPreviewUrl && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-inner">
              {mediaContext.type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPreviewUrl}
                  alt={mediaContext.filename ?? "Uploaded media preview"}
                  className="max-h-80 w-full rounded-md object-contain"
                />
              )}
              {mediaContext.type === "video" && (
                <video
                  src={mediaPreviewUrl}
                  controls
                  className="max-h-80 w-full rounded-md bg-black"
                />
              )}
              {mediaContext.type === "audio" && (
                <div className="rounded-md bg-white p-4">
                  <p className="mb-3 text-sm font-semibold">{mediaContext.filename}</p>
                  <audio src={mediaPreviewUrl} controls className="w-full" />
                </div>
              )}
            </div>
          )}
        </div>}

        {isAdvanced && <div>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Company Knowledge: optional supporting context
            </p>
            <span className="text-sm text-muted-foreground">
              {selectedLibrarySources.length} selected
            </span>
          </div>
          {librarySources.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
              Add Company Knowledge items to ground generation with saved links and pasted content.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {librarySources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => toggleLibrarySource(source.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left shadow-sm transition",
                    selectedLibrarySourceIds.includes(source.id)
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-slate-200 bg-white text-foreground hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <p className="font-semibold">{getLibrarySourceDisplayName(source)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {source.category} · {source.platform} · {countUrls(source.urls)} URLs · {getSyncStatus(source)} · {countWords(source.content)} words
                  </p>
                </button>
              ))}
            </div>
          )}
          {selectedLibrarySources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
                  {selectedLibrarySources.map((source) => (
                <Pill key={source.id}>
                  {getLibrarySourceDisplayName(source)} · {getSyncStatus(source)}
                </Pill>
              ))}
            </div>
          )}
          {selectedLibrarySources
            .filter((source) => hasStoredUrls(source.urls) && !source.content.trim())
            .map((source) => (
              <SubtleNote key={source.id}>
                {getLibrarySourceDisplayName(source)}: URL saved. Add pasted content later to ground claims.
              </SubtleNote>
            ))}
          {selectedLibrarySources
            .filter((source) => source.content.trim())
            .map((source) => (
              <SubtleNote key={`${source.id}-ready`}>
                {getLibrarySourceDisplayName(source)}: Ready for generation.
              </SubtleNote>
            ))}
          <p className="mt-2 text-sm text-muted-foreground">
            Company Knowledge is Conduit source-of-truth facts and context. Public website URLs can be fetched from the Company Knowledge page; social URLs still need manual pasted content.
          </p>
        </div>}

        {isAdvanced ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Brand Voice Rules: global rules
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Every generated post uses the saved Brand Voice Rules for tone, style, audience, and avoid rules.
          </p>
        </div> : (
          <div className="rounded-lg border border-primary/20 bg-teal-50 p-3 text-sm font-semibold text-primary">
            Using Conduit Company Knowledge automatically.
          </div>
        )}

        {!isAdvanced && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Brief check</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {friendlyChecks.map((check, index) => (
                <div key={`${check.label}-${index}`} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                      check.ok ? "bg-teal-100 text-primary" : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {check.ok ? "OK" : "!"}
                  </span>
                  <span className={check.ok ? "font-semibold text-foreground" : "font-semibold text-amber-800"}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdvanced && <div className="rounded-lg border border-primary/20 bg-teal-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Creative Brief</p>
              <h3 className="mt-1 text-lg font-bold">Ready to generate</h3>
            </div>
            <Pill>{selectedPlatforms.length || 1} platforms</Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <BriefItem
              label="Template"
              value={campaignTemplate}
            />
            <BriefItem
              label="Posting Account"
              value={
                selectedProfile
                  ? `${selectedProfile.name} · ${selectedProfile.type}`
                  : "General brand profile"
              }
            />
            <BriefItem
              label="Voice Influence"
              value={
                selectedVoiceInfluences.length > 0
                  ? selectedVoiceInfluences.map((profile) => profile.name).join(", ")
                  : "No extra internal voices"
              }
            />
            <BriefItem
              label="Simple style"
              value={simpleStyleChips.join(", ")}
            />
            <BriefItem
              label="Inspiration / Reference"
              value={
                selectedInspirationProfiles.length > 0
                  ? selectedInspirationProfiles.map((profile) => profile.name).join(", ")
                  : "No external inspiration"
              }
            />
            <BriefItem
              label="Platforms"
              value={(selectedPlatforms.length > 0 ? selectedPlatforms : ["LinkedIn"]).join(", ")}
            />
            <BriefItem
              label="Media"
              value={
                mediaContext.filename
                  ? `${mediaContext.filename} · ${mediaContext.type ?? "media"}`
                  : "No media attached"
              }
            />
            <BriefItem
              label="Company Knowledge"
              value={
                selectedLibrarySources.length > 0
                  ? selectedLibrarySources.map(getLibrarySourceDisplayName).join(", ")
                  : "No items selected"
              }
            />
            <BriefItem
              label="Content angle"
              value={contentAngle || "No angle selected"}
            />
            <BriefItem
              label="Intent"
              value={intent || "No intent added"}
            />
            <BriefItem
              label="Media notes"
              value={mediaContext.notes || "No manual media notes"}
            />
            <BriefItem
              label="Details quality"
              value={
                idea.trim()
                  ? looksLikeGenericRawIdea(idea)
                    ? "Needs more specific details"
                    : "Specific details added"
                  : mediaContext.notes?.trim()
                    ? "Using media notes as raw context"
                    : "Needs details or media notes"
              }
            />
            <BriefItem
              label="Brand Voice Rules"
              value={`${brandVoice.tone}. Avoid: ${brandVoice.avoid}`}
            />
          </div>
        </div>}

        {isAdvanced && <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Brief Quality Check
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {qualityChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                    check.ok ? "bg-teal-100 text-primary" : "bg-red-100 text-red-700"
                  )}
                >
                  {check.ok ? "OK" : "!"}
                </span>
                <span className={check.ok ? "text-foreground" : "font-semibold text-red-700"}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
          {generationBlocked && (
            <p className="mt-3 text-sm font-semibold text-red-700">
              Complete the missing brief items before generating.
            </p>
          )}
        </div>}

        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isGenerating || generationBlocked}>
            <Sparkles size={16} /> {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
        {(generationError || generationNotice) && (
          <div
            className={cn(
              "rounded-md border p-4 text-sm",
              generationError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-teal-200 bg-teal-50 text-teal-800"
            )}
          >
            <p className="font-semibold">
              {generationError ? "AI generation issue" : "Generation status"}
            </p>
            <p className="mt-1">{generationError || generationNotice}</p>
            {generationError && (
              !generationError.includes("Add a specific raw idea") && (
                <Button className="mt-3" size="sm" variant="secondary" onClick={handleMockFallback}>
                  Use mock fallback
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/85 p-3 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

const postDetailLabels = [
  "Recommended media use",
  "Optional alt text",
  "Suggested overlay text",
  "CTA"
];

const optionLabels = ["Option 1: Recommended", "Option 2: Shorter", "Option 3: More founder-led"];

const simpleStyleOptions: { label: SimpleStyleChip; instruction: string }[] = [
  {
    label: "Conduit default",
    instruction: "Use normal Conduit company voice: direct, practical, clear, and grounded in real operations."
  },
  {
    label: "More founder-led",
    instruction: "Make the post more direct, human, and founder-led, with less corporate polish."
  },
  {
    label: "More technical",
    instruction: "Make the post more precise, product/process-oriented, and specific about systems or workflow."
  },
  {
    label: "Bolder",
    instruction: "Use a stronger hook, more conviction, and a clearer point of view."
  },
  {
    label: "More polished",
    instruction: "Use a cleaner, company-safe tone while keeping it plainspoken."
  },
  {
    label: "More concise",
    instruction: "Make the output shorter, tighter, and easier to skim."
  }
];

function supportingDetailsFromPost(post: GeneratedPost) {
  return [
    { label: "Recommended media use", value: post.recommendedMediaUse || extractPostDetail(post.content, "Recommended media use") },
    { label: "Alt text", value: post.altText || extractPostDetail(post.content, "Optional alt text") },
    { label: "Overlay text", value: post.overlayText || extractPostDetail(post.content, "Suggested overlay text") },
    { label: "CTA", value: post.cta || extractPostDetail(post.content, "CTA") },
    { label: "Hashtags", value: post.hashtags?.join(" ") ?? "" },
    { label: "First comment", value: post.firstComment ?? "" },
    { label: "Carousel ideas", value: post.carouselIdeas?.join("\n") ?? "" },
    { label: "Shot list", value: post.shotList?.join("\n") ?? "" }
  ].filter((detail) => detail.value);
}

function supportingFieldsFromPost(post: GeneratedPost) {
  return {
    rationale: post.rationale,
    recommendedMediaUse: post.recommendedMediaUse || extractPostDetail(post.content, "Recommended media use"),
    altText: post.altText || extractPostDetail(post.content, "Optional alt text"),
    overlayText: post.overlayText || extractPostDetail(post.content, "Suggested overlay text"),
    cta: post.cta || extractPostDetail(post.content, "CTA"),
    hashtags: post.hashtags ?? [],
    firstComment: post.firstComment,
    carouselIdeas: post.carouselIdeas ?? [],
    shotList: post.shotList ?? [],
    safetyCheck: post.safetyCheck
  };
}

type ReadinessItem = {
  label: string;
  passed: boolean;
  suggestion: string;
};

const improveActions = [
  { label: "Strengthen hook", instruction: "Strengthen the opening hook and make the first line more specific." },
  { label: "Make shorter", instruction: "Make this shorter and tighter while preserving the core idea." },
  { label: "Add CTA", instruction: "Add a clear, natural CTA that fits the platform." },
  { label: "Add alt text", instruction: "Add useful alt text or media accessibility guidance." },
  { label: "Make less generic", instruction: "Make this less generic by adding concrete details from the campaign brief." },
  { label: "Improve media fit", instruction: "Connect the post more clearly to the uploaded media or media notes." }
];

const brandSafetyQuickActions = [
  { label: "Make safer", instruction: "Make this safer by removing unsupported claims, confidential details, and sensitive operational specifics." },
  { label: "Remove unsupported claim", instruction: "Remove unsupported claims and keep only what is grounded in the campaign brief or Company Knowledge." },
  { label: "Make less hypey", instruction: "Make this less hypey, more precise, and less promotional." },
  { label: "Make more specific", instruction: "Make this more specific using only the current campaign brief, media notes, and Company Knowledge." }
];

const unsupportedClaimPatterns = [
  /\bguarantee(?:d|s)?\b/i,
  /\bproven\b/i,
  /\bonly\b/i,
  /\bbest\b/i,
  /\bworld[- ]?class\b/i,
  /\bindustry[- ]?leading\b/i,
  /\bfirst\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\b\d+%|\b\d+x\b/i,
  /\b(days?|hours?|weeks?)\b/i
];

const genericAiPatterns = [
  /\bin today's (?:fast-paced|ever-changing|rapidly evolving)\b/i,
  /\bunlocks? (?:the )?power\b/i,
  /\bgame[- ]changing\b/i,
  /\brevolutionary\b/i,
  /\bseamless(?:ly)?\b/i,
  /\btransform(?:ing|s)? the way\b/i,
  /\btake (?:it|things|your \w+) to the next level\b/i,
  /\bwhere .* meets .*\b/i
];

const overhypedPatterns = [
  /\bmassive\b/i,
  /\bdominates?\b/i,
  /\bcrush(?:es|ing)?\b/i,
  /\bdisrupt(?:s|ing|ive)\b/i,
  /\bunstoppable\b/i,
  /\bthe future of\b/i
];

const sensitivePatterns = [
  /\bconfidential\b/i,
  /\bsecret\b/i,
  /\bNDA\b/i,
  /\bcustomer name\b/i,
  /\bclient name\b/i,
  /\bproprietary\b/i,
  /\bfloor plan\b/i,
  /\badministrator password\b/i,
  /\bcredential\b/i,
  /\baccess badge\b/i
];

function runFallbackBrandSafetyCheck(
  copy: string,
  campaign?: Campaign,
  post?: GeneratedPost
): BrandSafetyCheck {
  const notes = new Set<string>();
  const normalizedCopy = copy.trim();
  const knowledgeText = [
    ...(campaign?.sourceLibraryNames ?? []),
    ...(post?.sourceLibraryNames ?? [])
  ].join(" ");
  const hasCompanyKnowledge = knowledgeText.trim().length > 0;

  if (!normalizedCopy) {
    notes.add("Post copy is empty");
  }

  if (unsupportedClaimPatterns.some((pattern) => pattern.test(normalizedCopy)) && !hasCompanyKnowledge) {
    notes.add("Claim needs source");
  }

  if (genericAiPatterns.some((pattern) => pattern.test(normalizedCopy))) {
    notes.add("Tone sounds generic");
  }

  if (overhypedPatterns.some((pattern) => pattern.test(normalizedCopy))) {
    notes.add("Language may be overhyped");
  }

  if (sensitivePatterns.some((pattern) => pattern.test(normalizedCopy))) {
    notes.add("Customer detail may need approval");
  }

  if (campaign?.mediaContext?.filename || post?.mediaUsed) {
    const mediaWarnings = campaign?.mediaContext?.analysis?.warnings ?? [];
    if (mediaWarnings.length > 0 || /whiteboard|factory floor|workspace|badge|screen|notes|diagram/i.test(campaign?.mediaContext?.analysis?.description ?? campaign?.mediaContext?.notes ?? "")) {
      notes.add("Media may show sensitive workspace details");
    }
  }

  if (post?.platform === "X" && normalizedCopy.length > 280) {
    notes.add("Platform length issue");
  }

  if (post?.platform === "LinkedIn" && normalizedCopy.split(/\s+/).filter(Boolean).length > 320) {
    notes.add("Platform length issue");
  }

  const noteList = Array.from(notes);
  const riskyNotes = ["Post copy is empty", "Customer detail may need approval"];
  const status = noteList.some((note) => riskyNotes.includes(note))
    ? "Risky"
    : notes.size > 0
      ? "Needs review"
      : "Safe";

  return {
    status,
    notes: noteList.length > 0 ? noteList : ["No obvious claim, privacy, or tone risks found."],
    checkedAt: new Date().toISOString(),
    source: "Fallback"
  };
}

function safetyCheckForPost(post: GeneratedPost, campaign?: Campaign) {
  return post.safetyCheck ?? runFallbackBrandSafetyCheck(userFacingPostContent(post.content, campaign, post), campaign, post);
}

function safetyStatusClass(status: BrandSafetyCheck["status"]) {
  if (status === "Safe") return "bg-teal-100 text-primary";
  if (status === "Needs review") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

function applyBrandSafetyQuickFix(copy: string, instruction: string) {
  let nextCopy = copy
    .replace(/\b(game[- ]changing|revolutionary|industry[- ]leading|world[- ]class|massive|unstoppable)\b/gi, "meaningful")
    .replace(/\bguaranteed?\b/gi, "intended")
    .replace(/\balways\b/gi, "often")
    .replace(/\bnever\b/gi, "rarely")
    .replace(/\bthe only\b/gi, "one");

  if (/unsupported claim/i.test(instruction)) {
    nextCopy = nextCopy.replace(/\b\d+%|\b\d+x\b/gi, "").replace(/\bproven\b/gi, "useful");
  }

  if (/more specific/i.test(instruction) && !/Conduit/i.test(nextCopy)) {
    nextCopy = `Conduit: ${nextCopy}`;
  }

  return nextCopy.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function postReadiness(post: GeneratedPost, campaign?: Campaign) {
  const copy = userFacingPostContent(post.content, campaign, post);
  const safety = safetyCheckForPost(post, campaign);
  const wordCount = copy.split(/\s+/).filter(Boolean).length;
  const firstLine = copy.split("\n").find(Boolean) ?? "";
  const hasMedia = Boolean(post.mediaUsed || campaign?.mediaContext?.filename || campaign?.mediaContext?.notes);
  const hasCta = Boolean(post.cta || /\b(follow|learn|read|watch|save|comment|dm|tell us|join|apply|reach out)\b/i.test(copy));
  const hasAltText = !hasMedia || Boolean(post.altText);
  const hasHashtagsOrFormat =
    post.platform === "Instagram" || post.platform === "TikTok"
      ? Boolean(post.hashtags?.length || post.overlayText || post.carouselIdeas?.length || post.shotList?.length)
      : true;
  const platformFit =
    post.platform === "X"
      ? copy.length <= 280
      : post.platform === "LinkedIn"
        ? wordCount >= 35 && wordCount <= 260
        : post.platform === "Instagram"
          ? Boolean(post.overlayText || post.carouselIdeas?.length || copy.length <= 2200)
          : Boolean(post.overlayText || post.shotList?.length || wordCount <= 120);
  const lengthFit =
    post.platform === "X"
      ? copy.length <= 280
      : post.platform === "TikTok"
        ? wordCount <= 120
        : wordCount >= 25 && wordCount <= 260;
  const items: ReadinessItem[] = [
    {
      label: "Hook strength",
      passed: firstLine.length >= 18 && firstLine.length <= 140 && !/^here('| i)s/i.test(firstLine),
      suggestion: "Open with a sharper, more specific first line."
    },
    {
      label: "Clarity",
      passed: wordCount >= 12 && !looksLikeGenericRawIdea(copy),
      suggestion: "Make the core point more concrete."
    },
    {
      label: "Platform fit",
      passed: platformFit,
      suggestion: "Adjust length and structure for this platform."
    },
    {
      label: "Brand voice fit",
      passed: !/\b(leverage|synergy|game-changing|revolutionary|seamless solution)\b/i.test(copy),
      suggestion: "Remove generic or over-polished language."
    },
    {
      label: "Media fit",
      passed: !hasMedia || Boolean(post.recommendedMediaUse || campaign?.mediaContext?.notes),
      suggestion: "Connect the copy more directly to the media."
    },
    {
      label: "CTA strength",
      passed: hasCta,
      suggestion: "Add a light CTA or next step."
    },
    {
      label: "Length fit",
      passed: lengthFit,
      suggestion: "Tighten or expand to fit the platform."
    },
    {
      label: "Hashtags/format fit",
      passed: hasHashtagsOrFormat,
      suggestion: "Add platform-native formatting, hashtags, carousel ideas, or shot list."
    },
    {
      label: "Alt text/media accessibility",
      passed: hasAltText,
      suggestion: "Add alt text or accessibility guidance for the media."
    },
    {
      label: "Risk/safety check",
      passed: safety.status === "Safe",
      suggestion: "Check unsupported claims or sensitive details."
    }
  ];
  const score = Math.round((items.filter((item) => item.passed).length / items.length) * 100);
  const suggestions = items
    .filter((item) => !item.passed)
    .map((item) => item.suggestion)
    .slice(0, 4);
  return {
    score,
    label: score >= 85 ? "Ready" : score >= 65 ? "Good" : "Needs work",
    items,
    suggestions
  };
}

function PostReadinessPanel({
  post,
  campaign,
  onImprove
}: {
  post: GeneratedPost;
  campaign?: Campaign;
  onImprove?: (instruction: string) => void;
}) {
  const readiness = postReadiness(post, campaign);
  const barClass =
    readiness.score >= 85
      ? "bg-primary"
      : readiness.score >= 65
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Post Readiness</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">{readiness.score}/100</p>
        </div>
        <span className={cn(
          "rounded-md px-3 py-1 text-sm font-bold shadow-sm",
          readiness.score >= 85
            ? "bg-teal-100 text-primary"
            : readiness.score >= 65
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-700"
        )}>
          {readiness.label}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${readiness.score}%` }} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {readiness.items.map((item) => (
          <div key={item.label} className="flex gap-2 rounded-md bg-slate-50 p-2 text-sm">
            <span className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              item.passed ? "bg-teal-100 text-primary" : "bg-amber-100 text-amber-800"
            )}>
              {item.passed ? "OK" : "!"}
            </span>
            <span>
              <span className="font-semibold">{item.label}</span>
              {!item.passed && <span className="block text-muted-foreground">{item.suggestion}</span>}
            </span>
          </div>
        ))}
      </div>
      {readiness.suggestions.length > 0 && (
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">Improvement suggestions</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
            {readiness.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      {onImprove && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Improve score</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {improveActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="secondary"
                onClick={() => onImprove(action.instruction)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function extractPostDetail(content: string, label: string) {
  const pattern = new RegExp(
    `${label}:\\s*([\\s\\S]*?)(?=\\n\\n(?:${postDetailLabels.join("|")}):|$)`,
    "i"
  );
  return content.match(pattern)?.[1]?.trim() ?? "";
}

function displayNameFromPost(post: GeneratedPost) {
  return post.profileName || "Social Command Center";
}

function handleFromName(name?: string) {
  const base = (name || "social command")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  return `@${base || "socialcommand"}`;
}

function initialsFromName(name?: string) {
  const words = (name || "SC").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "SC";
}

function stripDetailSections(content: string) {
  const firstDetailIndex = postDetailLabels
    .map((label) => content.toLowerCase().indexOf(`${label.toLowerCase()}:`))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return (firstDetailIndex >= 0 ? content.slice(0, firstDetailIndex) : content).trim();
}

function hasInternalBriefScaffolding(content: string) {
  return [
    /^Profile:/im,
    /^Company Knowledge used:/im,
    /^Approved examples to learn from:/im,
    /^Details \/ raw notes:/im,
    /From .* perspective, make this about/i,
    /Use the attached media context directly/i,
    /Do not invent a different topic/i,
    /^Voice direction:/im
  ].some((pattern) => pattern.test(content));
}

function userFacingPostContent(content: string, campaign?: Campaign, post?: GeneratedPost) {
  if (post?.postCopy && !hasInternalBriefScaffolding(post.postCopy)) {
    return post.postCopy.trim();
  }

  const stripped = stripDetailSections(content);
  if (!hasInternalBriefScaffolding(stripped)) {
    return stripped;
  }

  const intent = campaign?.intent || "Here is the practical takeaway.";
  const details = campaign?.idea;
  const mediaNote = campaign?.mediaContext?.notes || campaign?.mediaContext?.analysis?.description;
  const profileName = campaign?.profileName || post?.profileName || "this team";
  const isCompany =
    campaign?.profileType === "Company Account" || post?.profileType === "Company Account";

  if (post?.platform === "X") {
    return [
      intent,
      mediaNote && `The useful signal: ${mediaNote}`,
      "Build from the real workflow, not the polished pitch."
    ].filter(Boolean).join("\n\n");
  }

  if (post?.platform === "Instagram") {
    return [
      intent,
      mediaNote && `What this shows: ${mediaNote}`,
      "The best work happens close to the actual process, where the handoffs and constraints are visible."
    ].filter(Boolean).join("\n\n");
  }

  if (post?.platform === "TikTok") {
    return [
      `Hook: ${intent}`,
      "Short script:",
      `1. Open on the ${mediaNote ? "media" : "moment"}.`,
      mediaNote && `2. Point out what is happening: ${mediaNote}.`,
      `3. Explain the takeaway: ${intent}.`,
      "4. Close with why building close to the workflow matters."
    ].filter(Boolean).join("\n");
  }

  return [
    isCompany
      ? `${profileName} is sharing this because the best automation work starts with the real workflow.`
      : "I keep coming back to this: the best product work happens closest to the real workflow.",
    intent,
    details && `The context: ${details}`,
    mediaNote && `The useful signal from the media: ${mediaNote}`,
    "The takeaway is simple: build where the work actually happens, then let the product earn its way into the process."
  ].filter(Boolean).join("\n\n");
}

function threadLines(content: string) {
  const thread = content.match(/Thread version:\s*([\s\S]*)/i)?.[1] ?? "";
  return thread
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function carouselIdeas(content: string) {
  const carousel = content.match(/Carousel slide ideas:\s*([\s\S]*?)(?=\n\n(?:CTA|Suggested overlay text):|$)/i)?.[1] ?? "";
  return carousel
    .split("\n")
    .map((line) => line.replace(/^[-\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function shotListIdeas(content: string) {
  const shotList = content.match(/Shot list:\s*([\s\S]*?)(?=\n\n(?:Caption|Suggested overlay text|CTA):|$)/i)?.[1] ?? "";
  return shotList
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function hookFromContent(content: string) {
  return content.match(/Hook:\s*("?[^"\n]+(?:"?))/i)?.[1]?.replaceAll('"', "") ?? "";
}

function captionFromContent(content: string) {
  return content.match(/Caption:\s*([\s\S]*?)(?=\n\n(?:CTA|Suggested overlay text|Shot list):|$)/i)?.[1]?.trim() ?? stripDetailSections(content);
}

function MediaPreviewFrame({
  campaign,
  mediaPreviewUrl,
  className
}: {
  campaign: Campaign;
  mediaPreviewUrl: string;
  className?: string;
}) {
  const type = campaign.mediaContext?.type;
  const previewUrl = mediaPreviewUrl || campaign.mediaContext?.publicUrl || "";

  if (previewUrl && type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={campaign.mediaContext?.filename ?? "Uploaded media"}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (previewUrl && type === "video") {
    return (
      <video
        src={previewUrl}
        controls
        className={cn("h-full w-full bg-black object-cover", className)}
      />
    );
  }

  if (previewUrl && type === "audio") {
    return (
      <div className={cn("flex h-full w-full flex-col justify-center bg-white p-4", className)}>
        <p className="mb-3 text-sm font-bold">{campaign.mediaContext?.filename}</p>
        <audio src={previewUrl} controls className="w-full" />
      </div>
    );
  }

  if (campaign.mediaContext?.filename) {
    return (
      <div className={cn("flex h-full min-h-52 w-full items-center justify-center bg-muted p-6 text-center text-sm font-semibold text-muted-foreground", className)}>
        Media preview unavailable after refresh.
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-52 w-full items-center justify-center bg-muted p-6 text-center text-sm font-semibold text-muted-foreground", className)}>
      No media attached.
    </div>
  );
}

function PlatformPreview({
  post,
  campaign,
  mediaPreviewUrl
}: {
  post: GeneratedPost;
  campaign: Campaign;
  mediaPreviewUrl: string;
}) {
  if (post.platform === "LinkedIn") {
    return <LinkedInPreview post={post} campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} />;
  }

  if (post.platform === "X") {
    return <XPreview post={post} campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} />;
  }

  if (post.platform === "Instagram") {
    return <InstagramPreview post={post} campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} />;
  }

  return <TikTokPreview post={post} campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} />;
}

function Avatar({ name }: { name?: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {initialsFromName(name)}
    </div>
  );
}

function LinkedInPreview({
  post,
  campaign,
  mediaPreviewUrl
}: {
  post: GeneratedPost;
  campaign: Campaign;
  mediaPreviewUrl: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-border bg-white shadow-sm">
      <div className="flex gap-3 p-4">
        <Avatar name={displayNameFromPost(post)} />
        <div className="min-w-0">
          <p className="font-bold">{displayNameFromPost(post)}</p>
          <p className="text-sm text-muted-foreground">{post.profileRole || post.profileType || "Company"}</p>
          <p className="text-xs text-muted-foreground">Now</p>
        </div>
      </div>
      <div className="whitespace-pre-wrap px-4 pb-4 text-sm leading-6">
        {userFacingPostContent(post.content, campaign, post)}
      </div>
      {post.mediaUsed && (
        <div className="border-y border-border">
          <MediaPreviewFrame campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} className="max-h-[420px]" />
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 p-3 text-center text-sm font-semibold text-muted-foreground">
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
    </div>
  );
}

function XPreview({
  post,
  campaign,
  mediaPreviewUrl
}: {
  post: GeneratedPost;
  campaign: Campaign;
  mediaPreviewUrl: string;
}) {
  const mainText = userFacingPostContent(post.content, campaign, post).replace(/Thread version:[\s\S]*/i, "").trim();
  const thread = threadLines(post.content);

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar name={displayNameFromPost(post)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{displayNameFromPost(post)}</p>
            <p className="text-sm text-muted-foreground">{handleFromName(displayNameFromPost(post))} · Now</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6">{mainText}</p>
          {post.mediaUsed && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <MediaPreviewFrame campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} className="max-h-80" />
            </div>
          )}
          {thread.length > 0 && (
            <div className="mt-4 border-l-2 border-border pl-4">
              {thread.map((line, index) => (
                <p key={line} className="mb-3 text-sm leading-6">
                  {index + 2}. {line}
                </p>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-between text-sm font-semibold text-muted-foreground">
            <span>{mainText.length} chars</span>
            <span>Reply</span>
            <span>Repost</span>
            <span>Like</span>
            <span>Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({
  post,
  campaign,
  mediaPreviewUrl
}: {
  post: GeneratedPost;
  campaign: Campaign;
  mediaPreviewUrl: string;
}) {
  const displayContent = userFacingPostContent(post.content, campaign, post);
  const overlay = post.overlayText || extractPostDetail(post.content, "Suggested overlay text");
  const cta = post.cta || extractPostDetail(post.content, "CTA");
  const slides = post.carouselIdeas?.length ? post.carouselIdeas : carouselIdeas(post.content);

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center gap-3 p-3">
        <Avatar name={displayNameFromPost(post)} />
        <p className="font-bold">{handleFromName(displayNameFromPost(post)).replace("@", "")}</p>
      </div>
      <div className="relative aspect-square bg-muted">
        <MediaPreviewFrame campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} />
        {overlay && (
          <div className="absolute left-4 top-4 max-w-[80%] rounded-md bg-black/70 px-3 py-2 text-sm font-bold text-white">
            {overlay}
          </div>
        )}
      </div>
      <div className="flex justify-between p-3 text-sm font-semibold">
        <div className="flex gap-4">
          <Heart size={18} /> <MessageCircle size={18} /> <Send size={18} />
        </div>
        <span>Save</span>
      </div>
      <div className="px-3 pb-4">
        <p className="whitespace-pre-wrap text-sm leading-6">{captionFromContent(displayContent)}</p>
        {slides.length > 0 && (
          <div className="mt-3 rounded-md bg-muted p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Carousel ideas</p>
            <ul className="mt-2 list-inside list-decimal text-sm leading-6">
              {slides.map((slide) => <li key={slide}>{slide}</li>)}
            </ul>
          </div>
        )}
        {cta && <p className="mt-3 text-sm font-bold">CTA: {cta}</p>}
      </div>
    </div>
  );
}

function TikTokPreview({
  post,
  campaign,
  mediaPreviewUrl
}: {
  post: GeneratedPost;
  campaign: Campaign;
  mediaPreviewUrl: string;
}) {
  const displayContent = userFacingPostContent(post.content, campaign, post);
  const hook = hookFromContent(displayContent) || post.overlayText || extractPostDetail(post.content, "Suggested overlay text");
  const shots = post.shotList?.length ? post.shotList : shotListIdeas(post.content);
  const cta = post.cta || extractPostDetail(post.content, "CTA");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border-8 border-slate-900 bg-slate-950 shadow-xl">
        <div className="relative aspect-[9/16] bg-slate-900 text-white">
          <MediaPreviewFrame campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} className="opacity-80" />
          <div className="absolute left-4 right-16 top-6 rounded-lg bg-black/55 p-3 text-lg font-bold leading-6">
            {hook || "New post idea"}
          </div>
          <div className="absolute bottom-5 left-4 right-16">
            <p className="font-bold">{handleFromName(displayNameFromPost(post))}</p>
            <p className="mt-2 line-clamp-4 text-sm leading-5">{captionFromContent(displayContent)}</p>
          </div>
          <div className="absolute bottom-8 right-3 grid gap-4 text-center text-xs font-bold">
            <span>Like</span>
            <span>Comment</span>
            <span>Share</span>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-sm font-bold uppercase text-muted-foreground">Script and shot list</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{displayContent}</p>
        {shots.length > 0 && (
          <div className="mt-4 rounded-md bg-muted p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Shot list</p>
            <ul className="mt-2 list-inside list-disc text-sm leading-6">
              {shots.map((shot) => <li key={shot}>{shot}</li>)}
            </ul>
          </div>
        )}
        {cta && <p className="mt-4 text-sm font-bold">CTA: {cta}</p>}
      </div>
    </div>
  );
}

function PostQueue({
  queue,
  campaigns,
  profiles,
  updateQueueItem,
  setScreen,
  mediaPreviewUrl,
  queueDebugMessage,
  storageMode
}: {
  queue: PostQueueItem[];
  campaigns: Campaign[];
  profiles: Profile[];
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>) => void;
  setScreen: (screen: Screen) => void;
  mediaPreviewUrl: string;
  queueDebugMessage: string;
  storageMode: StorageMode;
}) {
  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "All">("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [showQueueDebug, setShowQueueDebug] = useState(false);
  const filteredQueue = queue.filter((item) => {
    const matchesPlatform = platformFilter === "All" || item.platform === platformFilter;
    const matchesProfile = profileFilter === "All" || item.profileId === profileFilter;
    const matchesStatus = statusFilter === "All" || normalizeQueueStatus(item.status) === statusFilter;
    const matchesCampaign = campaignFilter === "All" || item.campaignId === campaignFilter;
    return matchesPlatform && matchesProfile && matchesStatus && matchesCampaign;
  });
  const statusCounts = queueStatuses.map((status) => ({
    status,
    count: queue.filter((item) => normalizeQueueStatus(item.status) === status).length
  }));
  const activeFilters =
    platformFilter !== "All" ||
    profileFilter !== "All" ||
    statusFilter !== "All" ||
    campaignFilter !== "All";
  const platformSections = platforms
    .map((platform) => ({
      platform,
      items: filteredQueue.filter((item) => item.platform === platform)
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Ready to Post</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Approved posts live here until you copy, schedule, mark posted, or archive them.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setScreen("Review Drafts")}>
            Back to results
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <QueueFilter label="Platform">
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              All platforms shows every queued post. Pick one platform to narrow the queue.
            </p>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as Platform | "All")}
              className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All platforms</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </QueueFilter>
          <QueueFilter label="Profile">
            <select
              value={profileFilter}
              onChange={(event) => setProfileFilter(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All profiles</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </QueueFilter>
          <QueueFilter label="Status">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as QueueStatus | "All")}
              className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All statuses</option>
              {queueStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </QueueFilter>
          <QueueFilter label="Campaign">
            <select
              value={campaignFilter}
              onChange={(event) => setCampaignFilter(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </QueueFilter>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusCounts.map((item) => (
            <span key={item.status} className="rounded-md bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground">
              {item.status}: {item.count} posts
            </span>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => setShowQueueDebug((current) => !current)}
            className="font-semibold text-foreground hover:text-primary"
          >
            {showQueueDebug ? "Hide Debug details" : "Debug details"}
          </button>
            {showQueueDebug && (
            <div className="mt-2 leading-6">
              <p>{queue.length} total loaded · {filteredQueue.length} visible after filters · {storageMode === "supabase" ? "Shared data connected" : "Local mode"}</p>
              {queueDebugMessage && <p>{queueDebugMessage}</p>}
            </div>
          )}
        </div>
      </Card>

      {queue.length === 0 ? (
        <Card className="p-8 text-center">
            <p className="font-semibold">No Ready to Post items yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Approve a draft and it will appear here.
          </p>
          <Button className="mt-4" onClick={() => setScreen("Review Drafts")}>
            Review results
          </Button>
        </Card>
      ) : filteredQueue.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">No posts match these filters.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeFilters
              ? "Try All platforms or clear another filter."
              : "Approve a draft and it will appear here."}
          </p>
        </Card>
      ) : (
        platformSections.map((section) => (
          <Card key={section.platform} className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{section.platform}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Queued {section.platform} posts only.
                </p>
              </div>
              <Pill>{section.items.length}</Pill>
            </div>
            <div className="grid gap-4">
              {section.items.map((item) => (
                <PostQueueCard
                  key={item.id}
                  item={item}
                  campaign={campaigns.find((campaign) => campaign.id === item.campaignId)}
                  updateQueueItem={updateQueueItem}
                  mediaPreviewUrl={mediaPreviewUrl}
                />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function BrandSafetyPanel({
  post,
  campaign,
  onAction,
  onUpdateCheck
}: {
  post: GeneratedPost;
  campaign?: Campaign;
  onAction?: (instruction: string) => void;
  onUpdateCheck?: (check: BrandSafetyCheck) => void;
}) {
  const fallbackCheck = useMemo(
    () => safetyCheckForPost(post, campaign),
    [campaign, post]
  );
  const [check, setCheck] = useState<BrandSafetyCheck>(fallbackCheck);
  const [isChecking, setIsChecking] = useState(false);
  const [hasRequestedAi, setHasRequestedAi] = useState(false);

  useEffect(() => {
    setCheck(fallbackCheck);
  }, [fallbackCheck]);

  useEffect(() => {
    if (hasRequestedAi || fallbackCheck.source === "AI") return;

    let cancelled = false;
    setHasRequestedAi(true);
    setIsChecking(true);
    fetch("/api/brand-safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postCopy: userFacingPostContent(post.content, campaign, post),
        platform: post.platform,
        campaign: campaign
          ? {
              name: campaign.name,
              intent: campaign.intent,
              contentAngle: campaign.contentAngle,
              details: campaign.idea,
              mediaNotes: campaign.mediaContext?.notes,
              mediaAnalysis: campaign.mediaContext?.analysis,
              knowledgeSources: campaign.sourceLibraryNames ?? post.sourceLibraryNames ?? []
            }
          : null
      })
    })
      .then((response) => readJsonResponse(response, "Brand safety check failed"))
      .then((payload) => {
        if (cancelled || !payload?.check) return;
        const nextCheck = payload.check as BrandSafetyCheck;
        setCheck(nextCheck);
        onUpdateCheck?.(nextCheck);
      })
      .catch((error) => {
        console.info("[SCC] Brand safety AI check unavailable; using fallback.", error);
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaign, fallbackCheck.source, hasRequestedAi, onUpdateCheck, post]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Brand Safety / Claim Check</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Checks claims, sensitive details, hype, generic language, and platform fit before publishing.
          </p>
        </div>
        <span className={cn("rounded-md px-3 py-1 text-sm font-bold shadow-sm", safetyStatusClass(check.status))}>
          {isChecking ? "Checking..." : check.status}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {check.notes.map((note) => (
          <div key={note} className="flex gap-2 rounded-md bg-slate-50 p-2 text-sm">
            <span className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              check.status === "Safe" ? "bg-teal-100 text-primary" : check.status === "Needs review" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
            )}>
              {check.status === "Safe" ? "OK" : "!"}
            </span>
            <span>{note}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Source: {check.source === "AI" ? "AI assisted" : "deterministic fallback"} · Last checked {formatShortDateTime(check.checkedAt)}
      </p>
      {onAction && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Quick actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {brandSafetyQuickActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onAction(action.instruction)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QueueFilter({
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

function PostQueueCard({
  item,
  campaign,
  updateQueueItem,
  mediaPreviewUrl
}: {
  item: PostQueueItem;
  campaign?: Campaign;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>) => void;
  mediaPreviewUrl: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [publishForm, setPublishForm] = useState({
    livePostUrl: item.livePostUrl ?? "",
    postedAt: toDateTimeLocalValue(item.postedAt),
    publishNotes: item.publishNotes ?? ""
  });
  const [metricsForm, setMetricsForm] = useState({
    impressions: String(item.metrics?.impressions ?? ""),
    likes: String(item.metrics?.likes ?? ""),
    comments: String(item.metrics?.comments ?? ""),
    shares: String(item.metrics?.shares ?? ""),
    saves: String(item.metrics?.saves ?? ""),
    clicks: String(item.metrics?.clicks ?? "")
  });
  const [publishSaved, setPublishSaved] = useState("");
  useEffect(() => {
    setPublishForm({
      livePostUrl: item.livePostUrl ?? "",
      postedAt: toDateTimeLocalValue(item.postedAt),
      publishNotes: item.publishNotes ?? ""
    });
    setMetricsForm({
      impressions: String(item.metrics?.impressions ?? ""),
      likes: String(item.metrics?.likes ?? ""),
      comments: String(item.metrics?.comments ?? ""),
      shares: String(item.metrics?.shares ?? ""),
      saves: String(item.metrics?.saves ?? ""),
      clicks: String(item.metrics?.clicks ?? "")
    });
  }, [item.id, item.livePostUrl, item.postedAt, item.publishNotes, item.metrics]);

  const previewCampaign: Campaign =
    campaign ?? {
      id: item.campaignId,
      name: item.campaignName,
      idea: "",
      intent: item.intent,
      contentAngle: item.contentAngle,
      platforms: [item.platform],
      posts: [],
      createdAt: item.createdAt,
      profileId: item.profileId,
      profileName: item.profileName,
      mediaContext: item.mediaUsed
        ? {
            type: item.mediaPublicUrl
              ? inferMediaKindFromUrl(item.mediaPublicUrl)
              : undefined,
            filename: item.mediaAssetName,
            assetId: item.mediaAssetId,
            assetName: item.mediaAssetName,
            publicUrl: item.mediaPublicUrl,
            storagePath: item.mediaStoragePath
          }
        : undefined
    };
  const previewPost: GeneratedPost = {
    id: item.generatedPostId,
    platform: item.platform,
    postCopy: item.postCopy ?? item.content,
    content: item.content,
    status: "approved",
    score: 100,
    generatedBy: campaign?.generatedBy,
    mediaUsed: item.mediaUsed,
    rationale: item.rationale,
    recommendedMediaUse: item.recommendedMediaUse,
    altText: item.altText,
    overlayText: item.overlayText,
    cta: item.cta,
    hashtags: item.hashtags,
    firstComment: item.firstComment,
    carouselIdeas: item.carouselIdeas,
    shotList: item.shotList,
    safetyCheck: item.safetyCheck,
    profileId: item.profileId,
    profileName: item.profileName
  };
  const displayContent = userFacingPostContent(item.content, previewCampaign, previewPost);
  const details = supportingDetailsFromPost(previewPost);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  function numberFromInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : undefined;
  }

  function savePublishDetails() {
    updateQueueItem(item.id, {
      livePostUrl: publishForm.livePostUrl.trim(),
      postedAt: publishForm.postedAt ? new Date(publishForm.postedAt).toISOString() : "",
      publishNotes: publishForm.publishNotes.trim(),
      status: "Posted"
    });
    setPublishSaved("Publishing details saved");
    window.setTimeout(() => setPublishSaved(""), 1400);
  }

  function saveMetrics() {
    updateQueueItem(item.id, {
      metrics: {
        impressions: numberFromInput(metricsForm.impressions),
        likes: numberFromInput(metricsForm.likes),
        comments: numberFromInput(metricsForm.comments),
        shares: numberFromInput(metricsForm.shares),
        saves: numberFromInput(metricsForm.saves),
        clicks: numberFromInput(metricsForm.clicks)
      }
    });
    setPublishSaved("Metrics saved");
    window.setTimeout(() => setPublishSaved(""), 1400);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Pill>{item.platform}</Pill>
            <Pill>{item.profileName || "No profile"}</Pill>
            {item.mediaUsed && <Pill>Media: {item.mediaAssetName || campaign?.mediaContext?.assetName || campaign?.mediaContext?.filename || "used"}</Pill>}
            {item.contentAngle && <Pill>{item.contentAngle}</Pill>}
          </div>
          <h4 className="mt-3 text-base font-extrabold">{item.campaignName}</h4>
          {item.intent && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.intent}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={normalizeQueueStatus(item.status)}
            onChange={(event) =>
              updateQueueItem(item.id, {
                status: event.target.value as QueueStatus,
                postedAt:
                  event.target.value === "Posted" && !item.postedAt
                    ? new Date().toISOString()
                    : item.postedAt
              })
            }
            className="h-9 rounded-md border border-input bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
          >
            {queueStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => setShowPreview((current) => !current)}>
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            <Clipboard size={14} /> {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="whitespace-pre-wrap text-sm leading-6">{displayContent}</p>
      </div>

      <div className="mt-4">
        <PostReadinessPanel post={previewPost} campaign={previewCampaign} />
      </div>

      <div className="mt-4">
        <BrandSafetyPanel
          post={previewPost}
          campaign={previewCampaign}
          onUpdateCheck={(safetyCheck) => updateQueueItem(item.id, { safetyCheck })}
          onAction={(instruction) => {
            const saferCopy = applyBrandSafetyQuickFix(displayContent, instruction);
            const saferPost = {
              ...previewPost,
              content: saferCopy,
              postCopy: saferCopy
            };
            updateQueueItem(item.id, {
              content: saferCopy,
              postCopy: saferCopy,
              safetyCheck: runFallbackBrandSafetyCheck(saferCopy, previewCampaign, saferPost)
            });
          }}
        />
      </div>

      {details.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{detail.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{detail.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <FieldLabel label="Planned publish date/time" htmlFor={`planned-${item.id}`} />
          <input
            id={`planned-${item.id}`}
            type="datetime-local"
            value={toDateTimeLocalValue(item.plannedAt)}
            onChange={(event) =>
              updateQueueItem(item.id, {
                plannedAt: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : "",
                status: event.target.value && item.status === "Ready" ? "Scheduled" : item.status
              })
            }
            className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const now = new Date().toISOString();
              setPublishForm((current) => ({
                ...current,
                postedAt: current.postedAt || toDateTimeLocalValue(now)
              }));
              updateQueueItem(item.id, {
                status: "Posted",
                postedAt: item.postedAt || now
              });
            }}
          >
            Mark as posted
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => updateQueueItem(item.id, { status: "Archived" })}
          >
            Archive
          </Button>
        </div>
      </div>

      {normalizeQueueStatus(item.status) === "Posted" && (
        <div className="mt-4 grid gap-4 rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold">Manual publishing details</p>
              <p className="mt-1 text-sm text-teal-900">
                Paste the live post URL and add performance metrics after posting manually.
              </p>
            </div>
            {publishSaved && <span className="text-sm font-semibold text-primary">{publishSaved}</span>}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <FieldLabel label="Live post URL" htmlFor={`live-url-${item.id}`} />
              <input
                id={`live-url-${item.id}`}
                value={publishForm.livePostUrl}
                onChange={(event) => setPublishForm((current) => ({ ...current, livePostUrl: event.target.value }))}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://linkedin.com/posts/..."
              />
            </div>
            <div>
              <FieldLabel label="Posted date/time" htmlFor={`posted-at-${item.id}`} />
              <input
                id={`posted-at-${item.id}`}
                type="datetime-local"
                value={publishForm.postedAt}
                onChange={(event) => setPublishForm((current) => ({ ...current, postedAt: event.target.value }))}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-3">
              <FieldLabel label="Notes" htmlFor={`publish-notes-${item.id}`} />
              <input
                id={`publish-notes-${item.id}`}
                value={publishForm.publishNotes}
                onChange={(event) => setPublishForm((current) => ({ ...current, publishNotes: event.target.value }))}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Manual posting notes, audience reaction, follow-up ideas..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={savePublishDetails}>Save publish details</Button>
          </div>

          <div className="rounded-lg border border-white/70 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Metrics</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["impressions", "Impressions"],
                ["likes", "Likes"],
                ["comments", "Comments"],
                ["shares", "Shares/reposts"],
                ["saves", "Saves"],
                ["clicks", "Clicks"]
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-semibold text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    min="0"
                    value={metricsForm[key as keyof typeof metricsForm]}
                    onChange={(event) =>
                      setMetricsForm((current) => ({
                        ...current,
                        [key]: event.target.value
                      }))
                    }
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                <Pill>{metricNumber(item.metrics?.impressions)} impressions</Pill>
                <Pill>{engagementTotal(item)} engagement</Pill>
                {item.livePostUrl && <Pill>Live URL saved</Pill>}
              </div>
              <Button size="sm" variant="secondary" onClick={saveMetrics}>
                Update metrics
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="mt-4">
          <PlatformPreview
            post={previewPost}
            campaign={previewCampaign}
            mediaPreviewUrl={mediaPreviewUrl}
          />
        </div>
      )}
    </div>
  );
}

function toDateTimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function normalizeQueueStatus(status?: string): QueueStatus {
  const match = queueStatuses.find(
    (item) => item.toLowerCase() === String(status ?? "").toLowerCase()
  );
  return match ?? "Ready";
}

function ResultsEditor({
  campaign,
  rawIdeaIsGeneric,
  updatePost,
  approvePost,
  regeneratePost,
  repurposePost,
  regeneratingPostId,
  approvingPostId,
  generationNotice,
  generationError,
  approveDebug,
  setScreen,
  mediaPreviewUrl
}: {
  campaign?: Campaign;
  rawIdeaIsGeneric: boolean;
  updatePost: (id: string, updates: Partial<GeneratedPost>) => void;
  approvePost: (post: GeneratedPost) => Promise<void>;
  regeneratePost: (post: GeneratedPost, instruction: string) => Promise<void>;
  repurposePost: (campaign: Campaign, post: GeneratedPost) => void;
  regeneratingPostId: string;
  approvingPostId: string;
  generationNotice: string;
  generationError: string;
  approveDebug: {
    lastAction: string;
    lastError: string;
    lastQueueItemId: string;
  };
  setScreen: (screen: Screen) => void;
  mediaPreviewUrl: string;
}) {
  const [activePlatform, setActivePlatform] = useState<Platform>("LinkedIn");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDebugDetails, setShowDebugDetails] = useState(false);

  useEffect(() => {
    if (campaign?.platforms.length && !campaign.platforms.includes(activePlatform)) {
      setActivePlatform(campaign.platforms[0]);
      setShowMoreOptions(false);
    }
  }, [activePlatform, campaign]);

  if (!campaign) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold">No campaign selected.</p>
        <Button className="mt-4" onClick={() => setScreen("New Campaign")}>
          Create a post
        </Button>
      </Card>
    );
  }

  const availablePlatforms = campaign.platforms.length > 0 ? campaign.platforms : platforms;
  const activePosts = campaign.posts
    .filter((post) => post.platform === activePlatform)
    .slice(0, 3);
  const visiblePosts = showMoreOptions ? activePosts : activePosts.slice(0, 1);
  const mediaAngle = campaign.mediaContext?.analysis?.angles?.[0];
  const overlayIdea = campaign.mediaContext?.analysis?.captionIdeas?.[0];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">{campaign.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {campaign.intent || campaign.idea || "No brief summary saved."}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setScreen("New Campaign")}>
            <Plus size={16} /> Create a post
          </Button>
        </div>
      </Card>

      {generationNotice && (
        <div className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{generationNotice}</span>
            {(generationNotice.includes("Ready to Post") || generationNotice.includes("Saved")) && (
              <Button size="sm" variant="secondary" onClick={() => setScreen("Ready to Post")}>
                View in Ready to Post
              </Button>
            )}
          </div>
        </div>
      )}

      {generationError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {generationError}
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <Card className="p-4">
          <button
            type="button"
            onClick={() => setShowDebugDetails((current) => !current)}
            className="text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
          >
            {showDebugDetails ? "Hide Debug details" : "Debug details"}
          </button>
          {showDebugDetails && (
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <BriefItem label="Last approve action" value={approveDebug.lastAction} />
              <BriefItem label="Last approve error" value={approveDebug.lastError || "None"} />
              <BriefItem label="Last queue item id" value={approveDebug.lastQueueItemId || "None"} />
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-lg font-bold">What this campaign is about</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <AnalysisBlock
            label="Template"
            value={campaign.campaignTemplate || "No template saved."}
          />
          <AnalysisBlock
            label="Intent"
            value={campaign.intent || "No intent saved for this older campaign."}
          />
          <AnalysisBlock
            label="Content angle"
            value={campaign.contentAngle || "No content angle saved for this older campaign."}
          />
          <AnalysisBlock
            label={rawIdeaIsGeneric ? "Details / raw notes (missing/generic)" : "Details / raw notes"}
            value={
              rawIdeaIsGeneric
                ? "This campaign was created before input validation. New campaigns require a specific raw idea before generation."
                : campaign.idea || "No details/raw notes added."
            }
          />
          <AnalysisBlock
            label="Media notes"
            value={campaign.mediaContext?.notes || "No media notes added."}
          />
          <AnalysisBlock
            label="What AI saw"
            value={campaign.mediaContext?.analysis?.description || "No image analysis available."}
          />
          <AnalysisBlock
            label="Main content angle"
            value={mediaAngle || "Use the raw idea as the primary angle."}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Campaign Brief</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The creative context used for this set of generated variants.
            </p>
          </div>
          <Pill>{campaign.generatedBy ?? "Mock"}</Pill>
          <Pill>{campaign.campaignType ?? "Original"}</Pill>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <BriefItem
            label="Repurposed from"
            value={campaign.repurposedFrom?.label ?? "Original campaign"}
          />
          <BriefItem
            label="Posting Account"
            value={
              campaign.profileName
                ? `${campaign.profileName} · ${campaign.profileType}`
                : "General brand profile"
            }
          />
          <BriefItem
            label="Voice Influence"
            value={
              (campaign.voiceInfluenceNames ?? []).length > 0
                ? (campaign.voiceInfluenceNames ?? []).join(", ")
                : "No extra internal voices"
            }
          />
          <BriefItem
            label="Simple style"
            value={
              (campaign.simpleStyleChips ?? []).length > 0
                ? (campaign.simpleStyleChips ?? []).join(", ")
                : "Conduit default"
            }
          />
          <BriefItem
            label="Inspiration / Reference"
            value={
              (campaign.inspirationProfileNames ?? []).length > 0
                ? (campaign.inspirationProfileNames ?? []).join(", ")
                : "No external inspiration"
            }
          />
          <BriefItem
            label="Content angle"
            value={campaign.contentAngle || "Not saved"}
          />
          <BriefItem
            label="Template"
            value={campaign.campaignTemplate || "No template saved"}
          />
          <BriefItem
            label="Intent"
            value={campaign.intent || "Not saved"}
          />
          <BriefItem
            label="Media used"
            value={
              campaign.mediaContext?.filename
                ? campaign.mediaContext.assetName || campaign.mediaContext.filename
                : "No media attached"
            }
          />
          <BriefItem
            label="Company Knowledge"
            value={
              (campaign.sourceLibraryNames ?? []).length > 0
                ? (campaign.sourceLibraryNames ?? []).join(", ")
                : "No items selected"
            }
          />
          <BriefItem
            label="Brand Voice Rules"
            value={`Global rules · ${campaign.generatedBy ?? "Mock"} generation`}
          />
        </div>
      </Card>

      {campaign.mediaContext && (
        <Card className="p-5">
          <h3 className="text-lg font-bold">Media Context</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AnalysisBlock
              label="What the AI sees"
              value={
                campaign.mediaContext.analysis?.description ||
                campaign.mediaContext.notes ||
                "Media was attached without additional notes."
              }
            />
            <AnalysisBlock
              label="Best content angle"
              value={mediaAngle || "Use the media as proof for the campaign idea."}
            />
            <AnalysisBlock
              label="Suggested overlay text"
              value={overlayIdea || "Show the clearest takeaway from the media."}
            />
            <AnalysisBlock
              label="Manual context"
              value={campaign.mediaContext.notes || "No manual notes added."}
            />
          </div>
          {(campaign.mediaContext.analysis?.warnings ?? []).length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-bold">Warnings</p>
              <p className="mt-1">{(campaign.mediaContext.analysis?.warnings ?? []).join(", ")}</p>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {availablePlatforms.map((platform) => {
            const count = campaign.posts.filter((post) => post.platform === platform).length;
            return (
              <button
                key={platform}
                onClick={() => {
                  setActivePlatform(platform);
                  setShowMoreOptions(false);
                }}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-bold transition",
                  activePlatform === platform
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-950"
                )}
              >
                {platform} {count > 0 ? `(${Math.min(count, 3)})` : ""}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4">
        {activePosts.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No drafts yet. Create a post to generate drafts.
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <p className="text-sm font-semibold text-muted-foreground">
                  Choose the best draft for each platform. Approve sends it to Ready to Post.
                </p>
                {activePosts.length > 1 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowMoreOptions((current) => !current)}
                  >
                    {showMoreOptions ? "Show recommended only" : "Show more options"}
                  </Button>
                )}
              </div>
            </Card>
            {visiblePosts.map((post, index) => (
              <PostEditor
                key={post.id}
                post={post}
                optionLabel={optionLabels[index] ?? `Option ${index + 1}`}
                isSecondaryOption={index > 0}
                campaign={campaign}
                updatePost={updatePost}
                regeneratePost={regeneratePost}
                repurposePost={repurposePost}
                approvePost={approvePost}
                isRegenerating={regeneratingPostId === post.id}
                isApproving={approvingPostId === post.id}
                mediaPreviewUrl={mediaPreviewUrl}
                setScreen={setScreen}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PostEditor({
  post,
  optionLabel,
  isSecondaryOption,
  campaign,
  updatePost,
  regeneratePost,
  repurposePost,
  approvePost,
  isRegenerating,
  isApproving,
  mediaPreviewUrl,
  setScreen
}: {
  post: GeneratedPost;
  optionLabel: string;
  isSecondaryOption: boolean;
  campaign: Campaign;
  updatePost: (id: string, updates: Partial<GeneratedPost>) => void;
  regeneratePost: (post: GeneratedPost, instruction: string) => Promise<void>;
  repurposePost: (campaign: Campaign, post: GeneratedPost) => void;
  approvePost: (post: GeneratedPost) => Promise<void>;
  isRegenerating: boolean;
  isApproving: boolean;
  mediaPreviewUrl: string;
  setScreen: (screen: Screen) => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [showPrevious, setShowPrevious] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const displayContent = userFacingPostContent(post.content, campaign, post);
  const details = supportingDetailsFromPost(post);
  const readiness = postReadiness(post, campaign);
  const statusStyle: Record<PostStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    approved: "bg-teal-100 text-teal-800",
    rejected: "bg-red-100 text-red-700"
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  async function handleRegenerate() {
    if (!regenerateInstruction.trim()) {
      return;
    }

    await regeneratePost(post, regenerateInstruction);
    setRegenerateInstruction("");
    setShowRegenerate(false);
    setMode("edit");
  }

  return (
    <Card className={cn("p-6", isSecondaryOption && "bg-white/80")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{optionLabel}</p>
          {isSecondaryOption && (
            <p className="mt-1 text-sm text-muted-foreground">
              Secondary option for comparison.
            </p>
          )}
        </div>
      </div>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{post.platform}</Pill>
          <Pill>{post.generatedBy ?? "Mock"}</Pill>
          <Pill>
            {post.profileName
              ? `${post.profileName} · ${post.profileType}`
              : "No saved profile"}
          </Pill>
          {post.mediaUsed && (
            <Pill>
              Media: {campaign.mediaContext?.assetName || campaign.mediaContext?.filename || "used"}
            </Pill>
          )}
          {(post.sourceLibraryNames ?? []).map((sourceName) => (
            <Pill key={sourceName}>{sourceName}</Pill>
          ))}
          <span className={cn("rounded-md px-2.5 py-1 text-xs font-bold uppercase shadow-sm", statusStyle[post.status])}>
            {post.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1 shadow-inner">
            {(["edit", "preview"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-bold capitalize transition",
                  mode === item
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            Post Readiness {readiness.score}/100 · {readiness.label}
          </span>
        </div>
      </div>
      {mode === "edit" ? (
        <textarea
          value={displayContent}
          onChange={(event) => {
            const nextCopy = event.target.value;
            const nextPost = { ...post, postCopy: nextCopy, content: nextCopy };
            updatePost(post.id, {
              postCopy: nextCopy,
              content: nextCopy,
              safetyCheck: runFallbackBrandSafetyCheck(nextCopy, campaign, nextPost)
            });
          }}
          className="min-h-[240px] w-full rounded-lg border border-input bg-white p-5 text-base leading-7 shadow-inner outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <PlatformPreview
          post={post}
          campaign={campaign}
          mediaPreviewUrl={mediaPreviewUrl}
        />
      )}
      <div className="mt-4">
        <PostReadinessPanel
          post={post}
          campaign={campaign}
          onImprove={(instruction) => {
            setRegenerateInstruction(instruction);
            setShowRegenerate(true);
          }}
        />
      </div>
      <div className="mt-4">
        <BrandSafetyPanel
          post={post}
          campaign={campaign}
          onUpdateCheck={(safetyCheck) => updatePost(post.id, { safetyCheck })}
          onAction={(instruction) => {
            setRegenerateInstruction(instruction);
            setShowRegenerate(true);
          }}
        />
      </div>
      {mode === "edit" && details.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{detail.label}</p>
              <p className="mt-1 text-sm leading-6">{detail.value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <button
          onClick={() => setShowWhy((current) => !current)}
          className="text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          {showWhy ? "Hide why this draft" : "Why this draft?"}
        </button>
        {showWhy && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <AnalysisBlock label="Rationale" value={post.rationale || "Created from the selected campaign brief and platform format."} />
            <AnalysisBlock label="Posting Account" value={post.profileName ? `${post.profileName} · ${post.profileType}` : campaign.profileName || "No saved Posting Account"} />
            <AnalysisBlock label="Simple style" value={(campaign.simpleStyleChips ?? []).length > 0 ? `${(campaign.simpleStyleChips ?? []).join(", ")}. These guided tone lightly without changing facts or who is speaking.` : "Conduit default."} />
            <AnalysisBlock label="Voice Influence" value={(campaign.voiceInfluenceNames ?? []).join(", ") || "No extra internal voices. Posting Account and Brand Voice Rules carried the voice."} />
            <AnalysisBlock label="Inspiration / Reference" value={(campaign.inspirationProfileNames ?? []).length > 0 ? `${(campaign.inspirationProfileNames ?? []).join(", ")}. These influenced format/style only, not facts or claims.` : "No external inspiration. If used, these only shape format and should never be copied."} />
            <AnalysisBlock label="Template" value={campaign.campaignTemplate || "No template saved"} />
            <AnalysisBlock label="Content angle" value={campaign.contentAngle || "Not saved"} />
            <AnalysisBlock label="Intent" value={campaign.intent || "Not saved"} />
            <AnalysisBlock label="Details / raw notes" value={campaign.idea || "No details saved."} />
            <AnalysisBlock label="Media notes" value={campaign.mediaContext?.notes || "No media notes."} />
            <AnalysisBlock label="AI media analysis" value={campaign.mediaContext?.analysis?.description || "No media analysis."} />
            <AnalysisBlock label="Company Knowledge" value={(post.sourceLibraryNames ?? campaign.sourceLibraryNames ?? []).join(", ") || "No Company Knowledge items."} />
            <AnalysisBlock label="Brand Voice Rules" value="Global Brand Voice Rules and Conduit truth override external inspiration." />
            <AnalysisBlock label="Approved examples" value="Recent approved examples for this profile may be used as style examples when enabled." />
            <AnalysisBlock label="Campaign type" value={campaign.repurposedFrom ? `Repurposed from ${campaign.repurposedFrom.label}` : campaign.campaignType ?? "Original"} />
          </div>
        )}
      </div>
      {(post.previousPostCopy || post.previousContent) && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <button
            onClick={() => setShowPrevious((current) => !current)}
            className="text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            {showPrevious ? "Hide previous version" : "Show previous version"}
          </button>
          {showPrevious && (
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-sm leading-6 text-muted-foreground">
              {post.previousPostCopy || post.previousContent}
            </pre>
          )}
        </div>
      )}
      {showRegenerate && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-teal-50 p-4 shadow-sm">
          <label className="text-sm font-bold" htmlFor={`regen-${post.id}`}>
            What should change?
          </label>
          <textarea
            id={`regen-${post.id}`}
            value={regenerateInstruction}
            onChange={(event) => setRegenerateInstruction(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Make it more founder-led and focus on deployment speed."
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowRegenerate(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || !regenerateInstruction.trim()}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate this variant"}
            </Button>
          </div>
        </div>
      )}
      {post.status === "approved" && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">Saved to Ready to Post</span>
          <Button size="sm" variant="secondary" onClick={() => setScreen("Ready to Post")}>
            View in Ready to Post
          </Button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => setShowRegenerate((current) => !current)}
        >
          <Sparkles size={16} /> Regenerate
        </Button>
        {post.status === "approved" && (
          <Button variant="secondary" onClick={() => repurposePost(campaign, post)}>
            <Repeat2 size={16} /> Repurpose
          </Button>
        )}
        <Button variant="secondary" onClick={handleCopy}>
          <Clipboard size={16} />
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
        </Button>
        <Button
          variant={post.status === "draft" ? "primary" : "secondary"}
          disabled={isApproving}
          onClick={() => updatePost(post.id, { status: "draft" })}
        >
          Draft
        </Button>
        <Button
          variant={post.status === "rejected" ? "danger" : "secondary"}
          disabled={isApproving}
          onClick={() => updatePost(post.id, { status: "rejected" })}
        >
          <XCircle size={16} /> Reject
        </Button>
        <Button
          variant={post.status === "approved" ? "primary" : "secondary"}
          disabled={isApproving || post.status === "approved"}
          onClick={(event) => {
            event.stopPropagation();
            void approvePost(post);
          }}
        >
          <Check size={16} /> {isApproving ? "Approving..." : post.status === "approved" ? "Approved" : "Approve"}
        </Button>
      </div>
    </Card>
  );
}

function LayerBlock({
  title,
  value,
  detail
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 font-semibold">{value}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
      {children}
    </span>
  );
}
