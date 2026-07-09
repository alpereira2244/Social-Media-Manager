"use client";

import dynamic from "next/dynamic";
import {
  BarChart3,
  CalendarDays,
  Check,
  Clipboard,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
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
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CommandBar, Header, screenTitle } from "@/components/social-command-center/app-shell";
import { LoginScreen, WorkspaceConnectionIssueScreen } from "@/components/social-command-center/auth-screens";
import { AnalysisBlock, BriefItem, LayerBlock, Pill, QueueFilter } from "@/components/social-command-center/common-ui";
import { FieldLabel } from "@/components/social-command-center/field-label";
import {
  generateReviewToken,
  managerFeedbackForItem,
  managerFeedbackStatusLabel,
  managerReviewUrl,
  reviewExpirationIso
} from "@/components/social-command-center/manager-review-utils";
import {
  isDeletableQueueTestItem,
  manualPostingSteps,
  manualReplySteps,
  platformUrls,
  queueExecutionTabs,
  queueItemMatchesExecutionTab,
  toDateTimeLocalValue,
  type QueueExecutionTab
} from "@/components/social-command-center/queue-execution-utils";
import { PlatformPreview } from "@/components/social-command-center/platform-preview";
import { BrandSafetyPanel } from "@/components/social-command-center/brand-safety-panel";
import { PostReadinessPanel } from "@/components/social-command-center/post-readiness-panel";
import { ReviewLinkSharePanel } from "@/components/social-command-center/review-link-share-panel";
import {
  ReviewWorkflowPanel,
  revisedReview,
  reviewWithDefault,
  shouldMarkDraftRevised
} from "@/components/social-command-center/review-workflow";
import { ReviewQueueCard, type ReviewQueueItem } from "@/components/social-command-center/review-queue-card";
import {
  defaultBrandVoice,
  defaultPastPosts,
  contentAngles,
  initialCampaigns,
  initialLibrarySources,
  initialProfiles,
  librarySourceCategories,
  librarySourcePlatforms,
  platforms,
  profileTypes
} from "@/lib/mock-data";
import type {
  ApprovedPostMemory,
  ActivityLogItem,
  BrandSafetyCheck,
  BrandVoiceProfile,
  Campaign,
  CampaignMediaContext,
  CampaignTemplate,
  ClaimLibraryItem,
  ClaimMatch,
  ClaimRiskLevel,
  ClaimType,
  ContentOrigin,
  ContentAngle,
  FeedbackMemoryItem,
  FeedbackMemorySourceType,
  FeedbackMemorySummary,
  GeneratedPost,
  InspirationPattern,
  InspirationPatternPlatform,
  InspirationPatternSourceType,
  IntakeClassification,
  IntakeDestination,
  IntakeStatus,
  LibrarySource,
  LibrarySourceAnalysis,
  LibrarySourceCategory,
  LibrarySourcePlatform,
  MediaAsset,
  Opportunity,
  OpportunityAnalysis,
  OpportunityPlatform,
  OpportunityReplyDraft,
  OpportunityStatus,
  OpportunityType,
  OpportunityUrgency,
  Platform,
  PostQueueItem,
  PostStatus,
  QueueStatus,
  ReviewFeedback,
  ReviewMetadata,
  ReviewLink,
  ReviewLinkScopeType,
  ReviewPermissionLevel,
  ReviewWorkflowStatus,
  Profile,
  ProfileSourceKind,
  ProfileSourcePlatform,
  ProfileSourceSyncStatus,
  ProfileSourceType,
  ProfileType,
  RejectedPostMemory,
  SimpleStyleChip,
  SocialConnection,
  SourceCapture,
  SourceInboxHistoryItem,
  SourceUrlType,
  SyncStatus
} from "@/lib/types";
import {
  appUsesSupabase,
  deleteClaimLibraryItemFromSupabase,
  deleteCampaignFromSupabase,
  deleteApprovedPostFromSupabase,
  deleteLibrarySourceFromSupabase,
  deleteMediaAssetFromSupabase,
  deletePostQueueItemFromSupabase,
  deleteProfileFromSupabase,
  getCurrentSupabaseUser,
  getOrCreateDefaultWorkspace,
  loadSupabaseData,
  loadReviewFeedbackFromSupabase,
  recordPostFeedbackToSupabase,
  saveApprovedPostToSupabase,
  saveBrandRulesToSupabase,
  saveCampaignToSupabase,
  saveClaimLibraryItemToSupabase,
  saveFeedbackMemoryToSupabase,
  deleteFeedbackMemoryFromSupabase,
  saveGeneratedPostToSupabase,
  saveLibrarySourceToSupabase,
  saveMediaAssetToSupabase,
  saveOpportunityToSupabase,
  savePostQueueItemToSupabase,
  saveProfileToSupabase,
  saveRejectedPostToSupabase,
  saveReviewFeedbackToSupabase,
  saveReviewLinkToSupabase,
  saveSocialConnectionToSupabase,
  saveSourceCaptureToSupabase,
  deleteSourceCaptureFromSupabase,
  saveActivityLogToSupabase,
  signInWithPassword,
  signOutOfSupabase,
  signUpWithPassword,
  uploadKnowledgeDocumentToSupabase,
  type PersistedAppData,
  type StorageMode,
  type WorkspaceContext
} from "@/lib/supabase/persistence";
import { looksLikeGenericIntent, looksLikeGenericRawIdea } from "@/lib/content-quality";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { feedbackMemorySummary, inferFeedbackPreference } from "@/lib/feedback-memory";
import { readJsonResponse, withTimeout } from "@/lib/http-helpers";
import {
  countUrls,
  currentCheckedAt,
  getLastChecked,
  getLibrarySourceDisplayName,
  getSyncStatus,
  getUrlType,
  hasStoredUrls,
  isTranscriptSourceCategory,
  librarySyncReadinessMessage,
  transcriptSourceCategories,
  transcriptUseOptions
} from "@/lib/library-source-utils";
import { readLocalValue, writeLocalValue } from "@/lib/local-storage";
import {
  contentEngagementRate,
  contentEngagementTotal,
  contentImpressions,
  engagementRate,
  engagementTotal,
  metricsHaveValues,
  performanceRate,
} from "@/lib/performance-metrics";
import { extractPostDetail, userFacingPostContent } from "@/lib/post-content";
import {
  isLinkedInCompanyPostsProfileSource,
  findDefaultPostingAccount,
  isInspirationProfile,
  isInternalVoiceProfile,
  isPatternOnlyProfileType,
  isSocialProfileSource,
  isWebsiteProfileSource,
  profileSourceDisplayStatus,
  profileSourceKindForUrl,
  profileSourceReadinessLabel,
  profileSourceStatusLabel,
  profileSourceTypeForProfileType,
  sourceAnalyzeButtonLabel,
  sourceHasAnalyzableContent,
  sourceHasOnlySavedSocialUrl,
  sourceLearningBasisLabel,
  sourceLearningKind,
  sourceNextStep,
  sourceTypeDefaultsPatternOnly
} from "@/lib/profile-source-utils";
import {
  analyzedProfileSources,
  createPersonalitySummary,
  learnedProfileCtaPatterns,
  learnedProfileDoNotCopy,
  learnedProfileHookPatterns,
  learnedProfileImitate,
  learnedProfilePacing,
  learnedProfilePostStructures,
  learnedProfileVisualStyle,
  profileAnalyzedMaterialCount,
  profileConfidenceLabel,
  profileHasAnalyzedVoiceExamples,
  profileHasOnlyNotesBasedLearning,
  profileHasSavedSocialLinksWithoutAnalysis,
  profileLearningBasisSummary,
  profileSourceLinkCount,
  profileVoiceExampleTitles,
  profileVoiceSourceTitles
} from "@/lib/profile-voice-analysis";
import {
  buildWeeklyContentPlan,
  firstBrainTheme,
  mostRepeatedLabel,
  uniqueLabels
} from "@/lib/planning-utils";
import { inferMediaKindFromUrl, mediaTypeFromFile, readFileAsDataUrl } from "@/lib/media-utils";
import {
  campaignForQueueItem,
  performanceInsights,
  weeklyLearningReview
} from "@/lib/performance-insights";
import {
  calendarItemDate,
  normalizeQueueStatus,
  queueContentType,
} from "@/lib/queue-calendar";
import {
  countProfileUrls,
  firstWebsiteUrl,
  hasLinkedInOrXProfileUrl,
  hasLinkedInOrXSourceUrl,
  hasWebsiteProfileUrl,
  hasWebsiteSourceUrl,
  looksLikeUrl,
  profileUrlsText,
  profileUrlValues
} from "@/lib/source-platforms";
import { splitTags, truncateText, uniqueStrings } from "@/lib/text-utils";
import { cn } from "@/lib/utils";

const DashboardScreen = dynamic(() => import("@/components/social-command-center/dashboard").then((module) => module.Dashboard), {
  ssr: false,
  loading: () => <Card className="p-6">Loading dashboard...</Card>
});

const MediaLibraryScreen = dynamic(() => import("@/components/social-command-center/media-library").then((module) => module.MediaLibrary), {
  ssr: false,
  loading: () => <Card className="p-6">Loading media library...</Card>
});

const SourceInboxScreen = dynamic(() => import("@/components/social-command-center/source-inbox").then((module) => module.SourceInbox), {
  ssr: false,
  loading: () => <Card className="p-6">Loading Intake...</Card>
});

const ContentCalendarScreen = dynamic(() => import("@/components/social-command-center/content-calendar").then((module) => module.ContentCalendar), {
  ssr: false,
  loading: () => <Card className="p-6">Loading content calendar...</Card>
});

const AnalyticsScreen = dynamic(() => import("@/components/social-command-center/analytics").then((module) => module.Analytics), {
  ssr: false,
  loading: () => <Card className="p-6">Loading analytics...</Card>
});

const ConnectionsScreen = dynamic(() => import("@/components/social-command-center/connections").then((module) => module.Connections), {
  ssr: false,
  loading: () => <Card className="p-6">Loading connections...</Card>
});

const ContentLibraryScreen = dynamic(() => import("@/components/social-command-center/content-library").then((module) => module.ContentLibrary), {
  ssr: false,
  loading: () => <Card className="p-6">Loading content library...</Card>
});

const ProfilesScreen = dynamic(() => import("@/components/social-command-center/profiles").then((module) => module.Profiles), {
  ssr: false,
  loading: () => <Card className="p-6">Loading profiles...</Card>
});

const BrandRulesScreen = dynamic(() => import("@/components/social-command-center/brand-voice-rules").then((module) => module.BrandRules), {
  ssr: false,
  loading: () => <Card className="p-6">Loading brand voice rules...</Card>
});

const RepurposeScreen = dynamic(() => import("@/components/social-command-center/repurpose").then((module) => module.RepurposeCampaign), {
  ssr: false,
  loading: () => <Card className="p-6">Loading repurpose...</Card>
});

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

type ReviewQueueFilter =
  | "All drafts"
  | "Sent for review"
  | "Changes requested"
  | "Revised"
  | "Manager approved / ready"
  | "Ready to Post / Ready to Reply"
  | "Archived";

const reviewQueueFilters: ReviewQueueFilter[] = [
  "All drafts",
  "Sent for review",
  "Changes requested",
  "Revised",
  "Manager approved / ready",
  "Ready to Post / Ready to Reply",
  "Archived"
];

const workspaceStartupTimeouts = {
  authCheckMs: 30000,
  workspaceSetupMs: 30000,
  dataLoadMs: 45000,
  uiWatchdogMs: 90000,
  retryDelayMs: 1800
};

const navSections: Array<{
  title: string;
  items: { label: Screen; icon: React.ElementType }[];
}> = [
  {
    title: "Workflow",
    items: [
      { label: "Dashboard", icon: BarChart3 },
      { label: "Source Inbox", icon: Clipboard },
      { label: "New Campaign", icon: Plus },
      { label: "Review Drafts", icon: PenLine },
      { label: "Ready to Post", icon: ListChecks },
      { label: "Content Calendar", icon: CalendarDays },
      { label: "Content Library", icon: BookOpen },
      { label: "Analytics", icon: BarChart3 }
    ]
  },
  {
    title: "Knowledge & Assets",
    items: [
      { label: "Company Knowledge", icon: FileText },
      { label: "Profiles", icon: Users },
      { label: "Media Library", icon: Upload },
      { label: "Brand Voice Rules", icon: Sparkles }
    ]
  },
  {
    title: "Settings",
    items: [
      { label: "Connections", icon: Send }
    ]
  }
];


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

const inspirationPatternPlatforms: InspirationPatternPlatform[] = [
  "X",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "YouTube",
  "Website",
  "Other"
];

const inspirationPatternSourceTypes: InspirationPatternSourceType[] = [
  "brand",
  "creator",
  "competitor",
  "media team",
  "customer/audience",
  "trend",
  "other"
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

type MediaContentPackConfig = {
  postingAccountId: string;
  styleChip: SimpleStyleChip;
  intent: string;
  contextNotes: string;
  platforms: Platform[];
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
  useApprovedPosts: "scc.useApprovedPosts",
  socialConnections: "scc.socialConnections",
  inspirationPatterns: "scc.inspirationPatterns",
  sourceInboxHistory: "scc.sourceInboxHistory",
  opportunities: "scc.opportunities",
  feedbackMemory: "scc.feedbackMemory",
  useFeedbackMemory: "scc.useFeedbackMemory",
  sourceCaptures: "scc.sourceCaptures",
  activityLog: "scc.activityLog",
  claimLibrary: "scc.claimLibrary",
  reviewLinks: "scc.reviewLinks",
  reviewFeedback: "scc.reviewFeedback",
  weeklyPerformanceReportNotes: "scc.weeklyPerformanceReportNotes",
  showDemoData: "scc.showDemoData"
};

const opportunityTypes: OpportunityType[] = [
  "Trend",
  "Mention / shoutout",
  "Reply opportunity",
  "Competitor post",
  "News / article",
  "Customer story",
  "Founder thought",
  "Sales note",
  "Other"
];

const opportunityPlatforms: OpportunityPlatform[] = [
  "X",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "Website",
  "Other"
];

const opportunityUrgencies: OpportunityUrgency[] = ["Low", "Medium", "High"];
const opportunityStatuses: OpportunityStatus[] = ["New", "Reviewed", "Reply drafted", "Post drafted", "Queued", "Posted", "Archived"];


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

const browserCaptureStorageKey = "scc-browser-capture";

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

function compactVoice(profile: BrandVoiceProfile) {
  return {
    tone: profile.tone || defaultBrandVoice.tone,
    style: profile.style || defaultBrandVoice.style,
    audience: profile.audience || defaultBrandVoice.audience,
    avoid: profile.avoid || defaultBrandVoice.avoid
  };
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
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
      "Visual evidence for the brief idea"
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

function inspirationPatternSummary(pattern: InspirationPattern) {
  return pattern.analysis?.hookPattern || pattern.notes || pattern.pastedText || pattern.fetchedContent || "Saved pattern. Add notes, pasted text, screenshot, or a public webpage to analyze.";
}

function compactPatternTags(pattern: InspirationPattern) {
  return pattern.tags.length > 0 ? pattern.tags.slice(0, 3).join(", ") : "No tags";
}

function analyzedInternalSourceCount(profile?: Pick<Profile, "voiceSources">) {
  return analyzedProfileSources(profile).filter((source) =>
    source.sourceType === "internal voice" || source.sourceType === "company account"
  ).length;
}

function analyzedInspirationSourceCount(profile?: Pick<Profile, "voiceSources">) {
  return analyzedProfileSources(profile).filter((source) =>
    source.sourceType === "inspiration/reference" || source.sourceType === "competitor/market watch"
  ).length;
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
  const isTranscript = isTranscriptSourceCategory(source.category);
  const transcriptLines = source.content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, 6);

  return {
    voiceTraits: isTranscript
      ? "Raw, conversational, source-close, useful for founder language and customer pain"
      : isSocial
      ? "Conversational, timely, opinion-aware, easy to adapt"
      : isWebsite
        ? "Clear, structured, benefit-led, product-specific"
        : "Grounded, specific, useful, context-rich",
    commonTopics: isTranscript
      ? "Meeting themes, product framing, customer pain, founder phrasing, strategy notes"
      : isProof
      ? "Outcomes, proof, credibility, change over time"
      : isWebsite
        ? "Positioning, product value, workflow, customer pain points"
        : "Content brief ideas, audience education, category POV, repeatable systems",
    repeatedPhrases:
      words > 40
        ? "workflow, clarity, useful signal, consistent voice, approved posts"
        : "clear message, stronger source material, practical next step",
    strongHooks: hasUrls
      ? "The page says..., The clearest promise is..., The proof point worth reusing is..."
      : "A sharper way to say this..., The useful angle is..., Start with the problem...",
    proofPoints: isTranscript
      ? "Candidate proof points should be reviewed before posting publicly."
      : isProof
      ? "Customer outcomes, investor narrative, before-and-after evidence"
      : "URLs saved for reference, pasted copy, recurring claims, source notes",
    avoid:
      isTranscript
        ? "Publishing sensitive customer/account details, private strategy, unapproved metrics, or raw quotes without review"
        : "Inventing claims not present in the source, scraping URLs, overstating proof, generic filler",
    bestUseCases: isTranscript
      ? `${source.name} is best for internal language mining, customer pain discovery, product framing, and reviewed Conduit Brain themes.`
      : `${source.name} is best for ${source.category.toLowerCase()} context, ${source.platform.toLowerCase()} adaptation, campaign briefs, and post substantiation.`,
    keyThemes: isTranscript
      ? uniqueStrings([
          source.category.replace(" / ", " "),
          ...transcriptLines.map((line) => truncateText(line, 80))
        ]).slice(0, 5)
      : undefined,
    usefulPhrases: isTranscript
      ? transcriptLines.slice(0, 4)
      : undefined,
    customerPainPoints: isTranscript
      ? transcriptLines
          .filter((line) => /pain|problem|hard|slow|manual|stuck|customer|factory|workflow/i.test(line))
          .slice(0, 4)
      : undefined,
    productClaims: isTranscript
      ? ["Review before public use. Keep only claims supported by Company Knowledge."]
      : undefined,
    founderVoiceExamples: isTranscript
      ? transcriptLines.filter((line) => /we |i |our |conduit/i.test(line)).slice(0, 4)
      : undefined,
    postIdeas: isTranscript
      ? [
          "Turn one customer pain into a founder-led LinkedIn post.",
          "Use one specific product framing line as the hook.",
          "Convert a useful meeting insight into a practical industry POV."
        ]
      : undefined,
    safetyNotes: isTranscript
      ? [
          "Needs review before automatic generation.",
          "Remove sensitive customer, account, facility, or private strategy details before posting."
        ]
      : undefined
  };
}

function transcriptAnalysisToLibraryAnalysis(
  analysis: Record<string, unknown>,
  source: Pick<LibrarySource, "name" | "category" | "platform" | "urls" | "content" | "notes">
): LibrarySourceAnalysis {
  const fallback = createLibrarySourceAnalysis(source);
  const keyThemes = arrayFromUnknown(analysis.keyThemes);
  const usefulPhrases = arrayFromUnknown(analysis.usefulPhrases);
  const customerPainPoints = arrayFromUnknown(analysis.customerPainPoints);
  const productClaims = arrayFromUnknown(analysis.productClaims);
  const founderVoiceExamples = arrayFromUnknown(analysis.founderVoiceExamples);
  const proofPoints = arrayFromUnknown(analysis.proofPoints);
  const postIdeas = arrayFromUnknown(analysis.postIdeas);
  const safetyNotes = arrayFromUnknown(analysis.safetyNotes);

  return {
    ...fallback,
    voiceTraits: founderVoiceExamples.length > 0
      ? "Founder-close, conversational, specific, review before publishing"
      : fallback.voiceTraits,
    commonTopics: keyThemes.length > 0 ? keyThemes.join(", ") : fallback.commonTopics,
    repeatedPhrases: usefulPhrases.length > 0 ? usefulPhrases.slice(0, 5).join(", ") : fallback.repeatedPhrases,
    proofPoints: proofPoints.length > 0 ? proofPoints.join(", ") : fallback.proofPoints,
    avoid: safetyNotes.length > 0 ? safetyNotes.join(", ") : fallback.avoid,
    bestUseCases: postIdeas.length > 0
      ? `Use for: ${postIdeas.slice(0, 3).join("; ")}`
      : fallback.bestUseCases,
    keyThemes: keyThemes.length > 0 ? keyThemes : fallback.keyThemes,
    usefulPhrases: usefulPhrases.length > 0 ? usefulPhrases : fallback.usefulPhrases,
    customerPainPoints: customerPainPoints.length > 0 ? customerPainPoints : fallback.customerPainPoints,
    productClaims: productClaims.length > 0 ? productClaims : fallback.productClaims,
    founderVoiceExamples: founderVoiceExamples.length > 0 ? founderVoiceExamples : fallback.founderVoiceExamples,
    postIdeas: postIdeas.length > 0 ? postIdeas : fallback.postIdeas,
    safetyNotes: safetyNotes.length > 0 ? safetyNotes : fallback.safetyNotes
  };
}

function librarySourceBrief(sources: LibrarySource[]) {
  if (sources.length === 0) {
    return {
      names: [] as string[],
      label: "No Company Knowledge items selected",
      angle: "general product context",
      proof: "the brief idea itself"
    };
  }

  const names = sources.map(getLibrarySourceDisplayName);
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

const conduitBannedTerms = [
  "revolutionize",
  "transform the way",
  "unlock",
  "elevate",
  "seamless",
  "cutting-edge",
  "game-changing",
  "next-gen",
  "supercharge",
  "empower",
  "future of work"
];

function sanitizeConduitCopy(copy: string) {
  return copy
    .replace(/\brevolutioniz(?:e|es|ing)\b/gi, "improve")
    .replace(/\btransform(?:s|ing)? the way\b/gi, "change how")
    .replace(/\bunlock(?:s|ing)?\b/gi, "make visible")
    .replace(/\belevat(?:e|es|ing)\b/gi, "improve")
    .replace(/\bseamless(?:ly)?\b/gi, "reliable")
    .replace(/\bcutting[- ]edge\b/gi, "practical")
    .replace(/\bgame[- ]changing\b/gi, "useful")
    .replace(/\bnext[- ]gen\b/gi, "modern")
    .replace(/\bsupercharge(?:s|d|ing)?\b/gi, "support")
    .replace(/\bempower(?:s|ed|ing)?\b/gi, "help")
    .replace(/\bthe future of work\b/gi, "real operational work")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function concreteMediaPhrase(mediaContext?: CampaignMediaContext) {
  const mediaText = `${mediaContext?.notes ?? ""} ${mediaContext?.analysis?.description ?? ""}`.trim();
  if (/robot/i.test(mediaText)) return "the robot in this setup";
  if (/whiteboard|notes|diagram/i.test(mediaText)) return "the whiteboard notes behind the workflow";
  if (/factory|floor|workcell|cell/i.test(mediaText)) return "the factory-floor context";
  if (/hardware|machine|sensor|plc/i.test(mediaText)) return "the hardware and control-system context";
  if (/workshop|office/i.test(mediaText)) return "the workshop where the work is getting shaped";
  return mediaContext?.filename ? "the attached media" : "";
}

function platformHasUsefulHashtags(platform: Platform) {
  return platform === "Instagram" || platform === "TikTok";
}

function capitalizeFirst(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
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
  simpleStyleInstructions: string[] = [],
  feedbackSummary?: FeedbackMemorySummary
): GeneratedPost[] {
  const voice = compactVoice(brandRules);
  const profileName = selectedProfile?.name ?? "General Profile";
  const profileType = selectedProfile?.type ?? "Other";
  const influenceLine = selectedProfile
    ? `Posting account: ${profileName}. Use ${profileName} as the perspective.`
    : "Posting account: Conduit by default.";
  const libraryBrief = librarySourceBrief(librarySources);
  const mediaNote = mediaContext?.notes || mediaContext?.analysis?.description || "";
  const mediaPhrase = concreteMediaPhrase(mediaContext);
  const proofLine = mediaNote || idea || intent;
  const knowledgePhrase = librarySources.length > 0
    ? libraryBrief.angle.toLowerCase()
    : "the real operation";
  const approvedCadence = approvedExamples[0]?.finalContent
    ? "Cadence borrowed from approved examples without copying them."
    : "No approved examples yet, so defaulted to concise Conduit voice.";
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
  const feedbackPreferences = feedbackSummary?.enabled ? feedbackSummary.topPreferences.join(" ").toLowerCase() : "";
  const avoidHashtags = feedbackPreferences.includes("hashtag");
  const preferShorter = feedbackPreferences.includes("shorter") || feedbackPreferences.includes("concise");
  const preferFactorySpecific = feedbackPreferences.includes("factory") || feedbackPreferences.includes("operational");
  const supportLine =
    librarySources.length > 0
      ? ` It connects to ${libraryBrief.angle.toLowerCase()} without turning into a generic pitch.`
      : "";
  const profileLead =
    profileType === "Company Account"
      ? `${profileName} is sharing this because`
      : `I keep coming back to this because`;
  const linkedinCopy = concise || preferShorter
    ? `${bold ? "The useful signal is specific:" : "Quick thought:"} ${intent}\n\n${mediaPhrase ? `${capitalizeFirst(mediaPhrase)} makes it concrete.` : proofLine}\n\nBuild closer to the real workflow. That is where the constraints show up first.`
    : `${profileLead} ${bold ? "automation breaks when it is designed too far from the floor" : "the best automation work starts close to the real operation"}.\n\n${intent}\n\n${mediaPhrase ? `You can see it in ${mediaPhrase}: the useful details are in the handoffs, notes, hardware, and constraints around the work.` : `The useful signal here is ${proofLine}.`}${supportLine}\n\n${technical ? "The process detail matters because the system has to fit the machines, people, exceptions, and handoffs already in motion." : "The takeaway: stay close enough to the work to build around what actually happens, not what the slide says happens."}`;
  const xCopy = `${bold ? "Useful signal:" : "The point:"} ${intent}\n\n${mediaPhrase ? `${capitalizeFirst(mediaPhrase)} is the reminder: ` : ""}${technical ? "workflow details matter more than the pitch." : "real operations expose the constraints generic tools miss."}`;
  const instagramCopy = `${mediaPhrase ? `${capitalizeFirst(mediaPhrase)} tells the story.` : intent}\n\n${mediaNote ? `What it shows: ${mediaNote}` : `A closer look at ${contentAngle.toLowerCase()}.`}\n\nThe point is not polish. It is staying close enough to the real process to build something useful.\n\n${platformHasUsefulHashtags("Instagram") && !avoidHashtags ? "#manufacturing #automation #industrialtech" : ""}`.trim();
  const tiktokCopy = `Hook: ${bold ? "Most automation misses this part." : "This is where automation work gets real."}\n\nShort script:\n1. Start on ${mediaPhrase || "the uploaded media"}.\n2. Point out the operational detail most people would skip.\n3. Explain why it matters: ${intent}.\n4. Close on the practical takeaway: build around the real workflow.\n\nCaption: ${intent}`;
  const templates: Record<Platform, string> = {
    LinkedIn: linkedinCopy,
    X: xCopy,
    Instagram: instagramCopy,
    TikTok: tiktokCopy
  };

  return selectedPlatforms.map((platform, index) => ({
    id: `post-${Date.now()}-${platform}`,
    platform,
    status: "draft",
    score: Math.min(96, 84 + index * 3),
    generatedBy: "Mock",
    mediaUsed: Boolean(mediaContext?.filename || mediaContext?.notes),
    postCopy: sanitizeConduitCopy(templates[platform]),
    content: sanitizeConduitCopy(templates[platform]),
    rationale: `Mock draft shaped for ${platform}. ${influenceLine} Used the ${contentAngle} angle, brief intent, Company Knowledge around ${knowledgePhrase}, and available media/context. ${approvedCadence}${templateLine}${styleLine}${feedbackSummary?.enabled && feedbackSummary.topPreferences.length > 0 ? ` Applied Feedback Memory: ${feedbackSummary.topPreferences.slice(0, 2).join("; ")}.` : ""}${preferFactorySpecific ? " Added extra operational specificity." : ""}`,
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
      !avoidHashtags && (platform === "Instagram" || platform === "TikTok")
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
      notes: "Core positioning for demo briefs.",
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

function demoClaimLibrary(sources: LibrarySource[]): ClaimLibraryItem[] {
  const now = new Date().toISOString();
  const source = sources[0];
  const sourceName = source ? getLibrarySourceDisplayName(source) : undefined;
  const buildClaim = (
    id: string,
    claimText: string,
    claimType: ClaimType,
    riskLevel: ClaimRiskLevel,
    notes: string
  ): ClaimLibraryItem => ({
    id,
    claimText,
    claimType,
    supportingSourceId: source?.id,
    supportingSourceName: sourceName,
    sourceType: "manual entry",
    notes,
    riskLevel,
    reviewedBy: claimType === "Approved claim" ? "Demo workspace" : "",
    reviewedAt: claimType === "Approved claim" ? now : undefined,
    metadata: { demo: true },
    createdAt: now,
    updatedAt: now
  });

  return [
    buildClaim(
      "demo-claim-faster-workflows",
      "Conduit helps manufacturers deploy automation workflows faster.",
      "Approved claim",
      "Low",
      "Demo approved claim for practical deployment-speed framing."
    ),
    buildClaim(
      "demo-claim-operating-layer",
      "Conduit connects robots, machines, sensors, and operational workflows into one operating layer.",
      "Approved claim",
      "Low",
      "Demo approved claim for product architecture framing."
    ),
    buildClaim(
      "demo-claim-one-day",
      "Conduit can deploy automation in one day.",
      "Needs review",
      "High",
      "Needs a source-backed deployment timeline before public use."
    ),
    buildClaim(
      "demo-claim-replaces-integrators",
      "Conduit replaces system integrators.",
      "Needs review",
      "High",
      "Potentially too broad. Review nuance before use."
    ),
    buildClaim(
      "demo-claim-guarantees",
      "Conduit guarantees automation outcomes.",
      "Do not say",
      "High",
      "Guarantees are not approved for public claims."
    ),
    buildClaim(
      "demo-claim-eliminates-humans",
      "Conduit eliminates the need for all human operators.",
      "Do not say",
      "High",
      "Avoid replacing-operators language."
    ),
    buildClaim(
      "demo-claim-every-workflow",
      "Conduit can automate every factory workflow immediately.",
      "Do not say",
      "High",
      "Overbroad and unsupported."
    )
  ];
}

function demoCampaign(profiles: Profile[], sources: LibrarySource[]): Campaign {
  const danny = profiles.find((profile) => profile.id === "demo-profile-danny");
  const conduit = profiles.find((profile) => profile.id === "demo-profile-conduit");
  const sourceIds = sources.map((source) => source.id);
  const sourceNames = sources.map(getLibrarySourceDisplayName);
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

function imageDataUrlForGeneration(mediaContext: CampaignMediaContext | undefined, imageDataUrl: string) {
  // Image vision is handled by /api/analyze-media when the file is uploaded.
  // Keep /api/generate lightweight so larger photos cannot trigger a 413 response.
  void mediaContext;
  void imageDataUrl;
  return undefined;
}

export function SocialCommandCenter() {
  const [screen, setScreen] = useState<Screen>("Dashboard");
  const [sourceInboxInitialView, setSourceInboxInitialView] = useState<"Classify Source" | "Browser Captures" | "Import Past Content" | "History">("Classify Source");
  const [reviewQueueFilterPreset, setReviewQueueFilterPreset] =
    useState<ReviewQueueFilter>("All drafts");
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
  const [librarySources, setLibrarySources] =
    useState<LibrarySource[]>(initialLibrarySources);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [inspirationPatterns, setInspirationPatterns] = useState<InspirationPattern[]>([]);
  const [sourceInboxHistory, setSourceInboxHistory] = useState<SourceInboxHistoryItem[]>([]);
  const [sourceCaptures, setSourceCaptures] = useState<SourceCapture[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [feedbackMemory, setFeedbackMemory] = useState<FeedbackMemoryItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [claimLibrary, setClaimLibrary] = useState<ClaimLibraryItem[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState<ReviewFeedback[]>([]);
  const [useFeedbackMemory, setUseFeedbackMemory] = useState(true);
  const [showDemoData, setShowDemoData] = useState(true);
  const [selectedLibrarySourceIds, setSelectedLibrarySourceIds] = useState<string[]>(
    initialLibrarySources[0] ? [initialLibrarySources[0].id] : []
  );
  const [selectedProfileId, setSelectedProfileId] = useState(
    findDefaultPostingAccount(initialProfiles)?.id ?? ""
  );
  const [selectedVoiceInfluenceIds, setSelectedVoiceInfluenceIds] = useState<string[]>([]);
  const [selectedInspirationProfileIds, setSelectedInspirationProfileIds] = useState<string[]>([]);
  const [activeOpportunityContext, setActiveOpportunityContext] = useState<{ id: string; title: string } | null>(null);
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
  const [workspaceConnectionError, setWorkspaceConnectionError] = useState("");
  const [workspaceConnectionAttempt, setWorkspaceConnectionAttempt] = useState(0);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    if (window.sessionStorage.getItem(browserCaptureStorageKey) || searchParams.get("capture")) {
      setScreen("Source Inbox");
    }
  }, []);

  function loadLocalData(reason = "Local browser mode is active. Shared workspace data was not changed.") {
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
    const savedLibrarySources = readLocalValue<LibrarySource[]>(
      storageKeys.librarySources,
      initialLibrarySources
    );
    setLibrarySources(savedLibrarySources);
    setMediaAssets(readLocalValue<MediaAsset[]>(storageKeys.mediaAssets, []));
    setSocialConnections(readLocalValue<SocialConnection[]>(storageKeys.socialConnections, []));
    setInspirationPatterns(readLocalValue<InspirationPattern[]>(storageKeys.inspirationPatterns, []));
    setSourceInboxHistory(readLocalValue<SourceInboxHistoryItem[]>(storageKeys.sourceInboxHistory, []));
    setSourceCaptures(readLocalValue<SourceCapture[]>(storageKeys.sourceCaptures, []));
    setOpportunities(readLocalValue<Opportunity[]>(storageKeys.opportunities, []));
    setFeedbackMemory(readLocalValue<FeedbackMemoryItem[]>(storageKeys.feedbackMemory, []));
    setActivityLog(readLocalValue<ActivityLogItem[]>(storageKeys.activityLog, []));
    setClaimLibrary(readLocalValue<ClaimLibraryItem[]>(storageKeys.claimLibrary, []));
    setReviewLinks(readLocalValue<ReviewLink[]>(storageKeys.reviewLinks, []));
    setReviewFeedback(readLocalValue<ReviewFeedback[]>(storageKeys.reviewFeedback, []));
    setUseFeedbackMemory(readLocalValue(storageKeys.useFeedbackMemory, true));
    setShowDemoData(readLocalValue(storageKeys.showDemoData, true));
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
    setWorkspace(null);
    setWorkspaceConnectionError("");
    setWorkspaceConnectionAttempt(0);
    setHasLoadedLocalData(true);
    setAuthLoading(false);
    setGenerationNotice(reason);
  }

  function applySupabaseData(userEmail: string, workspaceContext: WorkspaceContext, data: PersistedAppData) {
    setAuthUserEmail(userEmail);
    setWorkspace(workspaceContext);
    setCampaigns(data.campaigns);
    setActiveCampaignId(data.campaigns[0]?.id ?? "");
    setProfiles(data.profiles);
    setSelectedProfileId(findDefaultPostingAccount(data.profiles)?.id ?? data.profiles[0]?.id ?? "");
    setLibrarySources(data.librarySources);
    setMediaAssets(data.mediaAssets);
    setSocialConnections(data.socialConnections);
    setInspirationPatterns(data.inspirationPatterns);
    setSourceInboxHistory(readLocalValue<SourceInboxHistoryItem[]>(storageKeys.sourceInboxHistory, []));
    setSourceCaptures(mergeById(data.sourceCaptures, readLocalValue<SourceCapture[]>(storageKeys.sourceCaptures, [])));
    setOpportunities(data.opportunities);
    setFeedbackMemory(data.feedbackMemory);
    setActivityLog(mergeById(data.activityLog, readLocalValue<ActivityLogItem[]>(storageKeys.activityLog, [])));
    setClaimLibrary(mergeById(data.claimLibrary, readLocalValue<ClaimLibraryItem[]>(storageKeys.claimLibrary, [])));
    setReviewLinks(mergeById(data.reviewLinks, readLocalValue<ReviewLink[]>(storageKeys.reviewLinks, [])));
    setReviewFeedback(mergeById(data.reviewFeedback, readLocalValue<ReviewFeedback[]>(storageKeys.reviewFeedback, [])));
    setUseFeedbackMemory(readLocalValue(storageKeys.useFeedbackMemory, true));
    setShowDemoData(readLocalValue(storageKeys.showDemoData, true));
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
    setStorageMode("supabase");
    setWorkspaceConnectionError("");
    setWorkspaceConnectionAttempt(0);
    setHasLoadedLocalData(true);
    setAuthLoading(false);
  }

  async function loadSupabaseWorkspaceWithRetry() {
    setAuthLoading(true);
    setWorkspaceConnectionError("");
    setGenerationNotice("");
    setWorkspaceConnectionAttempt(0);

    if (!appUsesSupabase()) {
      loadLocalData("Local mode is active because Supabase env vars are missing.");
      return;
    }

    try {
      const user = await withTimeout(
        getCurrentSupabaseUser(),
        workspaceStartupTimeouts.authCheckMs,
        "Supabase auth check took longer than expected. Retry the workspace connection or restart npm run dev if this keeps happening."
      );
      if (!user) {
        setAuthUserEmail("");
        setWorkspace(null);
        setStorageMode("supabase");
        setHasLoadedLocalData(false);
        setAuthLoading(false);
        return;
      }

      setAuthUserEmail(user.email ?? "");

      let lastError: unknown;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        setWorkspaceConnectionAttempt(attempt);
        try {
          const workspaceContext = await withTimeout(
            getOrCreateDefaultWorkspace(),
            workspaceStartupTimeouts.workspaceSetupMs,
            "Workspace setup took longer than expected. Retry the workspace connection or check Supabase schema and policies."
          );
          const data = await withTimeout(
            loadSupabaseData(workspaceContext.id),
            workspaceStartupTimeouts.dataLoadMs,
            "Loading workspace data took longer than expected. Retry the workspace connection."
          );
          applySupabaseData(user.email ?? "", workspaceContext, data);
          return;
        } catch (attemptError) {
          lastError = attemptError;
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, workspaceStartupTimeouts.retryDelayMs));
          }
        }
      }

      const message = lastError instanceof Error
        ? lastError.message
        : "Could not connect to your workspace.";
      setStorageMode("supabase");
      setHasLoadedLocalData(false);
      setWorkspace(null);
      setWorkspaceConnectionError(message);
      setAuthLoading(false);
    } catch (error) {
      setStorageMode("supabase");
      setHasLoadedLocalData(false);
      setWorkspace(null);
      setWorkspaceConnectionError(
        error instanceof Error
          ? error.message
          : "Could not connect to your workspace."
      );
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (cancelled) return;
      await loadSupabaseWorkspaceWithRetry();
    }

    loadData();

    return () => {
      cancelled = true;
    };
    // Startup intentionally runs once; retry/local mode are driven by explicit buttons after this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading || !appUsesSupabase()) return undefined;

    const timeoutId = window.setTimeout(() => {
      setStorageMode("supabase");
      setHasLoadedLocalData(false);
      setWorkspace(null);
      setWorkspaceConnectionError(
        "Workspace check is taking longer than expected. The shared workspace may still be warming up locally. Retry the workspace connection or continue in local browser mode for development."
      );
      setAuthLoading(false);
    }, workspaceStartupTimeouts.uiWatchdogMs);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading]);

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
    function handleCommandShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandBarOpen(true);
      }
    }

    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  async function refreshManagerFeedback() {
    if (storageMode !== "supabase" || !workspace?.id) {
      return;
    }
    try {
      const nextFeedback = await loadReviewFeedbackFromSupabase(workspace.id);
      setReviewFeedback((current) => {
        const incomingIds = new Set(nextFeedback.map((item) => item.id));
        const newItems = nextFeedback.filter((item) => !current.some((existing) => existing.id === item.id));
        newItems.slice(0, 3).forEach((item) => {
          recordActivity({
            actionType:
              item.status === "approved"
                ? "Manager approved"
                : item.status === "changes_requested"
                  ? "Changes requested"
                  : item.status === "ready_to_post"
                    ? "Manager marked ready to post"
                    : "Manager comment added",
            objectType: item.contentType,
            objectId: item.contentId,
            title:
              item.status === "approved"
                ? "Manager approved item"
                : item.status === "changes_requested"
                  ? "Manager requested changes"
                  : item.status === "ready_to_post"
                    ? "Manager marked item ready to post"
                    : "Manager comment added",
            summary: item.comment || item.suggestedEdit || "Manager review feedback synced.",
            destination: "Review Drafts",
            status: "success"
          });
        });
        return mergeById(
          nextFeedback,
          current.filter((item) => !incomingIds.has(item.id))
        );
      });
    } catch (error) {
      setQueueDebugMessage(
        error instanceof Error
          ? `Manager feedback refresh failed: ${error.message}`
          : "Manager feedback refresh failed."
      );
    }
  }

  useEffect(() => {
    if (storageMode !== "supabase" || !workspace?.id) return undefined;
    const intervalId = window.setInterval(() => {
      void refreshManagerFeedback();
    }, 25000);
    return () => window.clearInterval(intervalId);
    // refreshManagerFeedback intentionally reads current state and records new feedback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageMode, workspace?.id]);

  useEffect(() => {
    if (
      screen === "Ready to Post" ||
      screen === "Review Drafts" ||
      screen === "Content Calendar" ||
      screen === "Content Library" ||
      screen === "Dashboard"
    ) {
      void refreshManagerFeedback();
    }
    // refresh on major manager-feedback surfaces only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, storageMode, workspace?.id]);

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

    writeLocalValue(storageKeys.socialConnections, socialConnections);
  }, [socialConnections, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.inspirationPatterns, inspirationPatterns);
  }, [inspirationPatterns, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.sourceInboxHistory, sourceInboxHistory);
  }, [sourceInboxHistory, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.sourceCaptures, sourceCaptures);
  }, [sourceCaptures, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.opportunities, opportunities);
  }, [opportunities, hasLoadedLocalData, storageMode]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.activityLog, activityLog);
  }, [activityLog, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.reviewLinks, reviewLinks);
  }, [reviewLinks, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.reviewFeedback, reviewFeedback);
  }, [reviewFeedback, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) {
      return;
    }

    writeLocalValue(storageKeys.showDemoData, showDemoData);
  }, [showDemoData, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData || storageMode !== "local") {
      return;
    }

    writeLocalValue(storageKeys.claimLibrary, claimLibrary);
  }, [claimLibrary, hasLoadedLocalData, storageMode]);

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
  const instagramSandboxConnection = useMemo(
    () =>
      socialConnections.find(
        (connection) => connection.provider === "instagram" && connection.isSandbox
      ),
    [socialConnections]
  );
  const activeCampaignComplete = isCampaignComplete(activeCampaign, postQueue);

  const allPosts = campaigns.flatMap((campaign) => campaign.posts);
  const approvedCount = allPosts.filter((post) => post.status === "approved").length;
  const rejectedCount = allPosts.filter((post) => post.status === "rejected").length;
  const draftCount = allPosts.filter((post) => post.status === "draft").length;
  const readyQueueCount = postQueue.filter((item) => normalizeQueueStatus(item.status) === "Ready").length;

  function startNewPost() {
    setCampaignName("");
    setCampaignTemplate("Other / blank");
    setContentAngle("");
    setSimpleStyleChips(["Conduit default"]);
    setIntent("");
    setIdea("");
    setSelectedPlatforms(["LinkedIn", "X", "Instagram"]);
    setSelectedVoiceInfluenceIds([]);
    setSelectedInspirationProfileIds([]);
    setActiveOpportunityContext(null);
    setSelectedLibrarySourceIds([]);
    setUseApprovedPosts(true);
    setActiveCampaignId("");
    clearMedia();
    setGenerationError("");
    setGenerationNotice("Ready for a new post.");
    setScreen("New Campaign");
  }

  function runQuickAction(actionId: string) {
    setCommandBarOpen(false);
    if (actionId === "view-activity") {
      setScreen("Dashboard");
      return;
    }

    if (actionId === "undo-last-action") {
      undoLastActivity();
      return;
    }

    if (actionId === "create-post") {
      startNewPost();
      return;
    }

    if (actionId === "import-past-content") {
      setSourceInboxInitialView("Import Past Content");
      setScreen("Source Inbox");
      return;
    }

    if (
      actionId === "install-browser-capture" ||
      actionId === "open-capture-queue" ||
      actionId === "triage-new-captures"
    ) {
      setSourceInboxInitialView("Browser Captures");
      setScreen("Source Inbox");
      return;
    }

    if (actionId === "add-brain-source" || actionId === "source-inbox") {
      setSourceInboxInitialView("Classify Source");
      setScreen("Source Inbox");
      return;
    }

    if (actionId === "opportunity-inbox") {
      setScreen("Opportunity Inbox");
      return;
    }

    if (actionId === "review-drafts") {
      setScreen("Review Drafts");
      return;
    }

    if (actionId === "upload-media") {
      setScreen("Media Library");
      return;
    }

    if (
      actionId === "add-profile" ||
      actionId === "add-inspiration-profile" ||
      actionId === "add-competitor-profile" ||
      actionId === "add-profile-source"
    ) {
      setScreen("Profiles");
      return;
    }

    if (actionId === "repurpose-content") {
      setScreen("Repurpose");
      return;
    }

    if (actionId === "ready-to-post") {
      setScreen("Ready to Post");
      return;
    }

    if (actionId === "content-calendar") {
      setScreen("Content Calendar");
      return;
    }

    if (actionId === "analytics") {
      setScreen("Analytics");
      return;
    }

    if (actionId === "feedback-memory") {
      setScreen("Brand Voice Rules");
      return;
    }

    if (actionId === "setup-checklist") {
      setScreen("Dashboard");
    }
  }

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
    recordActivity({
      actionType: "Media asset used in post",
      objectType: "Media Asset",
      objectId: asset.id,
      title: "Media asset used",
      summary: `${asset.filename} was attached to a post brief.`,
      destination: "Create Post",
      status: "success"
    });
  }

  function mediaContextFromAsset(asset: MediaAsset, contextNotes?: string): CampaignMediaContext {
    return {
      type: asset.mediaType,
      filename: asset.filename,
      notes: [asset.notes, contextNotes].filter(Boolean).join("\n\n"),
      assetId: asset.id,
      assetName: asset.filename,
      publicUrl: asset.publicUrl,
      storagePath: asset.storagePath,
      analysis: {
        description:
          asset.description ||
          (asset.mediaType === "image"
            ? "Image saved without AI visual analysis."
            : "Video/audio transcription and frame analysis can be added later."),
        angles: asset.suggestedAngles ?? [],
        captionIdeas: asset.overlayText ? [asset.overlayText] : [],
        warnings: asset.sensitivityWarnings ?? []
      }
    };
  }

  async function generateMediaContentPack(asset: MediaAsset, config: MediaContentPackConfig) {
    setGenerationError("");
    setGenerationNotice("");
    if (config.platforms.length === 0) {
      setGenerationError("Select at least one platform for the content pack.");
      return;
    }
    if (looksLikeGenericIntent(config.intent)) {
      setGenerationError("Add a main message so the media pack knows what to say.");
      return;
    }

    const selectedProfile =
      profiles.find((profile) => profile.id === config.postingAccountId) ||
      profiles.find((profile) => profile.type === "Company Account") ||
      profiles[0];
    const selectedLibrarySources = librarySources.filter((source) => source.reviewStatus !== "Save only");
    const packMediaContext = mediaContextFromAsset(asset, config.contextNotes);

    setIsGenerating(true);
    try {
      const response = await withTimeout(
        fetch("/api/media/generate-content-pack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaAsset: asset,
            postingAccount: selectedProfile,
            styleChip: config.styleChip,
            intent: config.intent.trim(),
            contextNotes: config.contextNotes.trim(),
            platforms: config.platforms,
            companyKnowledge: selectedLibrarySources,
            brandVoice,
            feedbackMemory: feedbackMemorySummary(feedbackMemory, useFeedbackMemory),
            claimLibrary: claimContextForGeneration(claimLibrary)
          })
        }),
        30000,
        "Media content pack generation took too long. Try again or add more context."
      );
      const payload = await readJsonResponse(response, "Media content pack generation failed");
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Media content pack generation failed.");
      }

      const generatedBy = payload.generatedBy === "AI" ? "AI" : "Mock";
      const claimContext = claimContextForGeneration(claimLibrary);
      const aiPosts = postsFromAiResponse(
        payload.data,
        config.platforms,
        selectedProfile,
        selectedLibrarySources,
        packMediaContext
      );
      if (aiPosts.length === 0) {
        throw new Error("No usable posts were returned for that media pack.");
      }

      const nowLabel = new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric"
      }).format(new Date());
      saveCampaign({
        id: `camp-media-${Date.now()}`,
        name: `Media pack: ${asset.filename}`,
        idea: [config.intent.trim(), config.contextNotes.trim()].filter(Boolean).join("\n\n"),
        intent: config.intent.trim(),
        contentAngle: "Behind the scenes",
        campaignType: "Original",
        platforms: config.platforms,
        posts: aiPosts,
        createdAt: nowLabel,
        generatedBy,
        mediaContext: {
          ...packMediaContext,
          analysis:
            payload.data?.mediaAnalysis ??
            packMediaContext.analysis ??
            createMockMediaAnalysis(packMediaContext)
        },
        profileId: selectedProfile?.id,
        profileName: selectedProfile?.name,
        profileType: selectedProfile?.type,
        profileRole: selectedProfile?.role,
        simpleStyleChips: [config.styleChip],
        simpleStyleInstructions: simpleStyleOptions
          .filter((style) => style.label === config.styleChip)
          .map((style) => style.instruction),
        sourceLibraryIds: selectedLibrarySources.map((source) => source.id),
        sourceLibraryNames: selectedLibrarySources.map(getLibrarySourceDisplayName),
        claimLibraryIds: claimContext.claimIds,
        claimLibraryApprovedClaims: claimContext.approvedClaims,
        claimLibraryNeedsReviewClaims: claimContext.needsReviewClaims,
        claimLibraryDoNotSayClaims: claimContext.doNotSayClaims
      });
      recordActivity({
        actionType: "Media content pack generated",
        objectType: "Media Content Pack",
        objectId: asset.id,
        title: "Media content pack generated",
        summary: `${asset.filename} generated ${config.platforms.length} platform draft${config.platforms.length === 1 ? "" : "s"}.`,
        destination: "Review Drafts",
        status: "success"
      });
      recordActivity({
        actionType: "Media asset used in post",
        objectType: "Media Asset",
        objectId: asset.id,
        title: "Media asset used in generated posts",
        summary: `${asset.filename} was linked to a generated content pack.`,
        destination: "Review Drafts",
        status: "success"
      });
      setGenerationNotice(
        generatedBy === "AI"
          ? "Generated media content pack with AI."
          : "Generated media content pack with mock fallback."
      );
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Media content pack generation failed.");
    } finally {
      setIsGenerating(false);
    }
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
      campaignName.trim() || effectiveIntent.slice(0, 64) || "Untitled Brief";
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
    const claimContext = claimContextForGeneration(claimLibrary);
    const voiceExampleTitles = [
      ...profileVoiceExampleTitles(selectedProfile),
      ...profileVoiceSourceTitles(selectedProfile),
      ...selectedVoiceInfluences.flatMap(profileVoiceExampleTitles),
      ...selectedVoiceInfluences.flatMap(profileVoiceSourceTitles),
      ...selectedInspirationProfiles.flatMap((profile) =>
        profileVoiceExampleTitles(profile).map((title) => `${title} (pattern only)`)
      ),
      ...selectedInspirationProfiles.flatMap((profile) =>
        profileVoiceSourceTitles(profile).map((title) => `${title} (pattern only)`)
      )
    ];
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
      contentOrigin:
        posts.find((post) => post.contentOrigin)?.contentOrigin ??
        (generatedBy === "AI" ? "AI-generated" : undefined),
      manualSourceContent: posts.find((post) => post.manualSourceContent)?.manualSourceContent,
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
      opportunityId: activeOpportunityContext?.id,
      opportunityTitle: activeOpportunityContext?.title,
      voiceExampleTitles: Array.from(new Set(voiceExampleTitles)).slice(0, 8),
      simpleStyleChips,
      simpleStyleInstructions: effectiveStyleInstructions,
      sourceLibraryIds: selectedLibrarySources.map((source) => source.id),
      sourceLibraryNames: selectedLibrarySources.map(getLibrarySourceDisplayName),
      claimLibraryIds: claimContext.claimIds,
      claimLibraryApprovedClaims: claimContext.approvedClaims,
      claimLibraryNeedsReviewClaims: claimContext.needsReviewClaims,
      claimLibraryDoNotSayClaims: claimContext.doNotSayClaims
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
    const currentFeedbackSummary = feedbackMemorySummary(feedbackMemory, useFeedbackMemory);

    return buildCampaign(
      "Mock",
      createMockPosts(
        campaignName.trim() || intent.trim().slice(0, 64) || "Untitled Brief",
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
          .map((style) => style.instruction),
        currentFeedbackSummary
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
    if (campaignWithSafety.opportunityId) {
      setOpportunities((current) => {
        const updated = current.map((opportunity) =>
          opportunity.id === campaignWithSafety.opportunityId
            ? {
                ...opportunity,
                status: "Drafted" as const,
                relatedCampaignId: campaignWithSafety.id,
                updatedAt: new Date().toISOString()
              }
            : opportunity
        );
        const changedOpportunity = updated.find((opportunity) => opportunity.id === campaignWithSafety.opportunityId);
        if (changedOpportunity) persistOpportunity(changedOpportunity);
        return updated;
      });
    }
    setScreen("Review Drafts");
    if (storageMode === "supabase") {
      saveCampaignToSupabase(campaignWithSafety, mediaFile).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Brief save failed: ${error.message}`
            : "Brief save failed."
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
      const response = await withTimeout(
        fetch("/api/generate", {
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
            feedbackMemory: feedbackMemorySummary(feedbackMemory, useFeedbackMemory),
            claimLibrary: claimContextForGeneration(claimLibrary),
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
        }),
        30000,
        "AI repurpose generation took too long. Use mock fallback or try again."
      );
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
    if (!selectedProfileId) {
      return "Select or create a posting account before generating.";
    }
    if (selectedPlatforms.length === 0) {
      return "Select at least one platform before generating.";
    }
    if (looksLikeGenericIntent(intent)) {
      return "Add a main point so the AI knows what this post should say.";
    }
    return "";
  }

  function handleCreateManualDraft(input: {
    sharedContent: string;
    platformContent: Partial<Record<Platform, string>>;
    platformSpecific: boolean;
  }) {
    setGenerationError("");
    setGenerationNotice("");

    if (!selectedProfileId) {
      setGenerationError("Select or create a posting account before creating a manual draft.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      setGenerationError("Select at least one platform before creating a manual draft.");
      return;
    }

    const safePlatforms: Platform[] = selectedPlatforms.length > 0 ? selectedPlatforms : ["LinkedIn"];
    const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
    const selectedLibrarySources = selectedLibrarySourceIds.length > 0
      ? librarySources.filter((source) => selectedLibrarySourceIds.includes(source.id))
      : librarySources;
    const now = Date.now();
    const posts = safePlatforms
      .map((platform) => {
        const copy = (input.platformSpecific ? input.platformContent[platform] : input.sharedContent)?.trim();
        if (!copy) return null;
        const basePost: GeneratedPost = {
          id: `manual-${now}-${platform.toLowerCase()}`,
          platform,
          postCopy: copy,
          content: copy,
          status: "draft",
          score: 86,
          generatedBy: "Mock",
          contentOrigin: "Manually written",
          manualSourceContent: copy,
          mediaUsed: Boolean(mediaContext.filename || mediaContext.assetId || mediaContext.publicUrl),
          rationale: "Manually written draft. Review, edit, improve with AI, or approve it like any generated draft.",
          profileId: selectedProfile?.id,
          profileName: selectedProfile?.name,
          profileType: selectedProfile?.type,
          profileRole: selectedProfile?.role,
          sourceLibraryIds: selectedLibrarySources.map((source) => source.id),
          sourceLibraryNames: selectedLibrarySources.map(getLibrarySourceDisplayName),
          review: {
            status: "Draft"
          }
        };
        return {
          ...basePost,
          safetyCheck: runFallbackBrandSafetyCheck(copy, undefined, basePost)
        };
      })
      .filter(Boolean) as GeneratedPost[];

    if (posts.length === 0) {
      setGenerationError("Write or paste a manual draft before continuing.");
      return;
    }

    saveCampaign({
      ...buildCampaign("Mock", posts, mediaContext.analysis),
      generatedBy: "Mock",
      contentOrigin: "Manually written",
      manualSourceContent: posts.map((post) => `${post.platform}: ${post.postCopy ?? post.content}`).join("\n\n")
    });
    setGenerationNotice("Manual draft saved to Review Drafts.");
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
        campaignName.trim() || intent.trim().slice(0, 64) || "Untitled Brief";
      const generationImageDataUrl = imageDataUrlForGeneration(mediaContext, mediaImageDataUrl);
      if (mediaContext.type === "image" && mediaImageDataUrl && !generationImageDataUrl) {
        setGenerationNotice("Using your media notes and saved image analysis for generation.");
      }
      const response = await withTimeout(
        fetch("/api/generate", {
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
            feedbackMemory: feedbackMemorySummary(feedbackMemory, useFeedbackMemory),
            claimLibrary: claimContextForGeneration(claimLibrary),
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
        }),
        30000,
        "AI generation took too long. Use mock fallback or try again."
      );
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
        : "Reset all local Social Command Center test data in this browser? This clears briefs, posts, Brand Voice Rules, hidden legacy voice sources, Company Knowledge items, and imports."
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
    setLibrarySources([]);
    setMediaAssets([]);
    setOpportunities([]);
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
      "This will add sample demo profiles, knowledge base items, brand rules, content briefs, and approved examples. It will not delete existing data."
    );
    if (!confirmed) return;

    const profilesDemo = demoProfiles();
    const sourcesDemo = demoKnowledgeBase();
    const campaignDemo = demoCampaign(profilesDemo, sourcesDemo);
    const approvedDemo = demoApprovedPosts();
    const claimDemo = demoClaimLibrary(sourcesDemo);
    const now = new Date();
    const demoQueue = campaignDemo.posts
      .filter((post) => post.status === "approved")
      .map((post, index) => {
        const item = createQueueItem(post, campaignDemo);
        const postedAt = new Date(now);
        postedAt.setDate(now.getDate() - index - 1);
        return {
          ...item,
          id: `demo-queue-${post.id}`,
          status: index < 2 ? "Posted" : "Ready",
          postedAt: index < 2 ? postedAt.toISOString() : "",
          livePostUrl: index < 2 ? `https://example.com/demo-post-${index + 1}` : "",
          publishNotes: index < 2 ? "Demo metrics for founder presentation." : "",
          metrics: index === 0
            ? { impressions: 1840, likes: 72, comments: 9, shares: 12, saves: 6, clicks: 18 }
            : index === 1
              ? { impressions: 940, likes: 38, comments: 5, shares: 7, saves: 3, clicks: 11 }
              : {}
        } satisfies PostQueueItem;
      });

    const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => [
      ...incoming,
      ...current.filter((item) => !incoming.some((next) => next.id === item.id))
    ];

    setProfiles((current) => mergeById(current, profilesDemo));
    setLibrarySources((current) => mergeById(current, sourcesDemo));
    setCampaigns((current) => mergeById(current, [campaignDemo]));
    setApprovedPosts((current) => mergeById(current, approvedDemo));
    setPostQueue((current) => mergeById(current, demoQueue));
    setClaimLibrary((current) => mergeById(current, claimDemo));
    setBrandVoice(demoBrandRules);
    setShowDemoData(true);
    setSelectedProfileId("demo-profile-conduit");
    setSelectedVoiceInfluenceIds(["demo-profile-danny"]);
    setActiveCampaignId("demo-campaign-office-workshop");
    setGenerationNotice("Demo data loaded.");
    recordActivity({
      actionType: "Demo data loaded",
      objectType: "Workspace",
      title: "Demo data loaded",
      summary: "Sample profiles, knowledge, claims, briefs, approved examples, and queue items were added.",
      destination: "Dashboard",
      status: "success"
    });

    if (storageMode === "supabase") {
      profilesDemo.forEach((profile) => persistProfile(profile));
      sourcesDemo.forEach((source) => persistLibrarySource(source));
      persistBrandRules(demoBrandRules);
      saveCampaignToSupabase(campaignDemo).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Demo brief save failed: ${error.message}`
            : "Demo brief save failed."
        );
        setGenerationNotice(
          "Demo data loaded. Shared sync needs attention."
        );
      });
      approvedDemo.forEach((memory) => {
        saveApprovedPostToSupabase(memory).catch(() => undefined);
      });
      demoQueue.forEach((item) => {
        savePostQueueItemToSupabase(item).catch(() => undefined);
      });
      claimDemo.forEach((claim) => persistClaimLibraryItem(claim));
    }
  }

  function hideDemoData() {
    setShowDemoData(false);
    setGenerationNotice("Demo data hidden from normal workspace views.");
    recordActivity({
      actionType: "Demo data hidden",
      objectType: "Workspace",
      title: "Demo data hidden",
      summary: "Demo-labeled records remain saved but are hidden from normal workspace views.",
      destination: "Dashboard",
      status: "success"
    });
  }

  function showDemoDataAgain() {
    setShowDemoData(true);
    setGenerationNotice("Demo data is visible again.");
    recordActivity({
      actionType: "Demo data shown",
      objectType: "Workspace",
      title: "Demo data shown",
      summary: "Demo-labeled records are visible in workspace views again.",
      destination: "Dashboard",
      status: "success"
    });
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
    setClaimLibrary((current) => current.filter((claim) => !isDemo({ id: claim.id, name: claim.claimText })));
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
    recordActivity({
      actionType: "Demo data cleared",
      objectType: "Workspace",
      title: "Demo data cleared",
      summary: "Only demo-labeled records were removed.",
      destination: "Dashboard",
      status: "success"
    });

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
            ? `Brief delete failed: ${error.message}`
            : "Brief delete failed."
        );
        setGenerationNotice(
          "Removed from this session. Shared sync needs attention."
        );
      });
    }
  }

  function updateQueueItem(id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) {
    let nextItem: PostQueueItem | undefined;
    let previousItem: PostQueueItem | undefined;
    setPostQueue((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }
        previousItem = item;
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

    if (!options?.silentActivity && nextItem && previousItem && ("status" in updates || "hiddenFromQueue" in updates || "plannedAt" in updates)) {
      const isHidden = updates.hiddenFromQueue === true;
      const nextStatus = updates.status ? normalizeQueueStatus(updates.status) : normalizeQueueStatus(nextItem.status);
      const previousStatus = normalizeQueueStatus(previousItem.status);
      const actionType = isHidden
        ? "Item hidden from queue"
        : nextStatus === "Archived" && previousStatus !== "Archived"
          ? "Item archived"
          : nextStatus === "Scheduled" && previousStatus !== "Scheduled"
            ? "Item scheduled"
            : nextStatus === "Posted" && previousStatus !== "Posted"
              ? "Item marked posted"
              : nextStatus === "Replied" && previousStatus !== "Replied"
                ? "Item marked replied"
                : "Queue item updated";
      recordActivity({
        actionType,
        objectType: queueContentType(nextItem),
        objectId: nextItem.id,
        title: actionType,
        summary: `${nextItem.campaignName} ${isHidden ? "was hidden from the queue." : `is now ${nextStatus}.`}`,
        destination: "Ready to Post",
        status: "success",
        undo: isHidden || nextStatus === "Archived"
          ? {
              type: "queue-item-restore",
              label: isHidden ? "Undo hide" : "Restore item",
              payload: { item: previousItem }
            }
          : undefined
      });
    }
  }

  function deleteQueueItem(id: string) {
    const deletedItem = postQueue.find((item) => item.id === id);
    setPostQueue((current) => current.filter((item) => item.id !== id));
    if (deletedItem) {
      const deletedArchivedItem = normalizeQueueStatus(deletedItem.status) === "Archived";
      const actionType = deletedArchivedItem ? "Archived item deleted" : "Test item deleted";
      recordActivity({
        actionType,
        objectType: queueContentType(deletedItem),
        objectId: deletedItem.id,
        title: actionType,
        summary: `${deletedItem.campaignName} was removed from the execution queue.`,
        destination: "Ready to Post",
        status: "warning"
      });
    }
    if (storageMode === "supabase") {
      deletePostQueueItemFromSupabase(id).catch((error) => {
        console.error("[SCC] Ready to Post delete failed", error);
        const detail = error instanceof Error ? error.message : "Unknown queue delete failure.";
        setQueueDebugMessage(`Queue delete failed: ${detail}`);
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
    if (
      updatedPost &&
      activeCampaign &&
      !updates.status &&
      (updates.content !== undefined || updates.postCopy !== undefined || updates.review !== undefined || updates.safetyCheck !== undefined)
    ) {
      const queuedReviewItem = postQueue.find((item) => item.generatedPostId === updatedPost?.id);
      if (queuedReviewItem) {
        updateQueueItem(
          queuedReviewItem.id,
          {
            content: userFacingPostContent(updatedPost.content, activeCampaign, updatedPost),
            postCopy: userFacingPostContent(updatedPost.content, activeCampaign, updatedPost),
            safetyCheck: updatedPost.safetyCheck,
            review: updatedPost.review ?? queuedReviewItem.review
          },
          { silentActivity: true }
        );
      }
    }
    if (updatedPost && previousPost?.status !== updates.status) {
      if (updates.status === "approved") {
        rememberApprovedPost(updatedPost);
        addPostToQueue(updatedPost, variantNumber);
        captureFeedbackMemory({
          sourceType: "approval",
          platform: updatedPost.platform,
          postingAccountId: updatedPost.profileId,
          postingAccountName: updatedPost.profileName,
          revisedContent: userFacingPostContent(updatedPost.content, activeCampaign, updatedPost),
          feedbackText: "User approved this draft."
        });
      }
      if (updates.status === "rejected") {
        rememberRejectedPost(updatedPost);
        captureFeedbackMemory({
          sourceType: "rejection",
          platform: updatedPost.platform,
          postingAccountId: updatedPost.profileId,
          postingAccountName: updatedPost.profileName,
          originalContent: userFacingPostContent(updatedPost.content, activeCampaign, updatedPost),
          feedbackText: "User rejected this draft."
        });
      }
    }
    if (updatedPost && updates.review?.feedback) {
      captureFeedbackMemory({
        sourceType: "review feedback",
        platform: updatedPost.platform,
        postingAccountId: updatedPost.profileId,
        postingAccountName: updatedPost.profileName,
        originalContent: userFacingPostContent(updatedPost.content, activeCampaign, updatedPost),
        feedbackText: updates.review.feedback
      });
    }
  }

  function updateCampaignPostFromReview(campaignId: string, postId: string, updates: Partial<GeneratedPost>) {
    let updatedPost: GeneratedPost | undefined;
    let variantNumber = 1;
    setCampaigns((current) =>
      current.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }

        return {
          ...campaign,
          posts: campaign.posts.map((post, index) => {
            if (post.id !== postId) {
              return post;
            }

            updatedPost = { ...post, ...updates };
            variantNumber =
              campaign.posts
                .slice(0, index + 1)
                .filter((item) => item.platform === post.platform).length || 1;
            return updatedPost;
          })
        };
      })
    );

    if (storageMode === "supabase" && updatedPost) {
      saveGeneratedPostToSupabase(campaignId, updatedPost, variantNumber).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Review metadata save failed: ${error.message}`
            : "Review metadata save failed."
        );
        setGenerationNotice("Saved in this session. Shared sync needs attention.");
      });
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
      opportunityId: campaign.opportunityId,
      opportunityTitle: campaign.opportunityTitle,
      generatedPostId: post.id,
      platform: post.platform,
      contentAngle: campaign.contentAngle,
      intent: campaign.intent,
      content: finalContent,
      postCopy: finalContent,
      contentOrigin: post.contentOrigin ?? campaign.contentOrigin,
      manualSourceContent: post.manualSourceContent ?? campaign.manualSourceContent,
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
      isSandbox: false,
      metrics: {},
      review: post.review
        ? {
            ...post.review,
            status: post.review.status === "Approved" ? "Ready to Post" : post.review.status,
            reviewedAt: new Date().toISOString()
          }
        : {
            status: "Ready to Post",
            reviewerName: "Conduit / team",
            reviewedAt: new Date().toISOString()
          },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } satisfies PostQueueItem;
  }

  function queueApprovedReply(opportunity: Opportunity, reply: OpportunityReplyDraft, approvedReply: string, profile?: Profile) {
    const now = new Date().toISOString();
    const safetyStatus: BrandSafetyCheck["status"] = reply.brandSafetyNotes.length > 0 ? "Needs review" : "Safe";
    const item: PostQueueItem = {
      id: `queue-reply-${reply.id}`,
      contentType: "Reply",
      profileId: profile?.id,
      profileName: profile?.name || "Conduit",
      campaignId: opportunity.relatedCampaignId || `opportunity-${opportunity.id}`,
      campaignName: `Reply: ${opportunity.title}`,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      generatedPostId: reply.id,
      platform: reply.recommendedPlatform,
      intent: `Reply to opportunity: ${opportunity.title}`,
      content: approvedReply,
      postCopy: approvedReply,
      mediaUsed: false,
      status: "Ready",
      plannedAt: "",
      livePostUrl: "",
      postedAt: "",
      publishNotes: "",
      isSandbox: false,
      metrics: {},
      review: reply.review
        ? {
            ...reply.review,
            status: "Ready to Reply",
            reviewedAt: new Date().toISOString()
          }
        : {
            status: "Ready to Reply",
            reviewerName: profile?.name || "Conduit / team",
            reviewedAt: now
          },
      safetyCheck: {
        status: safetyStatus,
        notes: reply.brandSafetyNotes.length > 0 ? reply.brandSafetyNotes : ["No obvious reply risks found."],
        checkedAt: now,
        source: "Fallback"
      },
      createdAt: now,
      updatedAt: now
    };

    setPostQueue((current) => [
      item,
      ...current.filter((queueItem) => queueItem.generatedPostId !== item.generatedPostId)
    ]);
    recordActivity({
      actionType: "Reply approved",
      objectType: "Reply",
      objectId: item.id,
      title: "Reply approved and added to Ready to Reply",
      summary: `${opportunity.title} is ready for manual reply execution.`,
      destination: "Ready to Post",
      status: "success"
    });
    setQueueDebugMessage(`Queued ${item.platform} reply from Opportunity Inbox. Queue item: ${item.id}.`);

    if (storageMode === "supabase") {
      savePostQueueItemToSupabase(item).catch((error) => {
        persistLocalQueueFallback([item]);
        const detail = error instanceof Error ? error.message : "Unknown reply queue save failure.";
        setQueueDebugMessage(`Reply queue save failed. Local fallback saved. ${detail}`);
      });
    } else {
      persistLocalQueueFallback([item]);
    }

    return item;
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
    recordActivity({
      actionType: "Item moved to Ready to Post",
      objectType: "Post",
      objectId: queueItem.id,
      title: "Moved to Ready to Post",
      summary: `${queueItem.campaignName} is ready for manual publishing.`,
      destination: "Ready to Post",
      status: "success"
    });
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
      const message = "failed to update generated post: no active brief found.";
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
      review: {
        ...(post.review ?? {}),
        status: "Ready to Post",
        reviewerName: post.review?.reviewerName || "Conduit / team",
        reviewedAt: new Date().toISOString()
      },
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
      recordActivity({
        actionType: "Draft approved",
        objectType: "Post",
        objectId: queueItem.id,
        title: "Draft approved and moved to Ready to Post",
        summary: `${campaign.name} is ready for manual publishing on ${queueItem.platform}.`,
        destination: "Ready to Post",
        status: "success"
      });
      captureFeedbackMemory({
        sourceType: "approval",
        platform: updatedPost.platform,
        postingAccountId: updatedPost.profileId ?? campaign.profileId,
        postingAccountName: updatedPost.profileName ?? campaign.profileName,
        revisedContent: userFacingPostContent(updatedPost.content, campaign, updatedPost),
        feedbackText: "User approved this draft and moved it toward Ready to Post."
      });
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

  async function queuePostFromReview(campaign: Campaign, post: GeneratedPost) {
    const nextReview: ReviewMetadata = {
      ...(post.review ?? {}),
      status: "Ready to Post",
      reviewerName: post.review?.reviewerName || "Conduit / team",
      reviewedAt: new Date().toISOString()
    };
    const updatedPost: GeneratedPost = {
      ...post,
      status: "approved",
      review: nextReview,
      safetyCheck: post.safetyCheck ?? runFallbackBrandSafetyCheck(userFacingPostContent(post.content, campaign, post), campaign, post)
    };
    const variantNumber =
      campaign.posts
        .slice(0, campaign.posts.findIndex((item) => item.id === post.id) + 1)
        .filter((item) => item.platform === post.platform).length || 1;
    const approvedMemory = createApprovedMemory(updatedPost, campaign);
    const queueItem = createQueueItem(updatedPost, campaign);

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
    captureFeedbackMemory({
      sourceType: "approval",
      platform: updatedPost.platform,
      postingAccountId: updatedPost.profileId ?? campaign.profileId,
      postingAccountName: updatedPost.profileName ?? campaign.profileName,
      revisedContent: userFacingPostContent(updatedPost.content, campaign, updatedPost),
      feedbackText: "Founder/team approved this draft and moved it to Ready to Post."
    });
    setQueueDebugMessage(
      `Queued ${queueItem.platform} post from Review Queue. Queue item: ${queueItem.id}.`
    );
    setGenerationNotice(friendlyApprovalMessage("saved"));

    if (storageMode === "supabase") {
      try {
        await saveGeneratedPostToSupabase(campaign.id, updatedPost, variantNumber);
        if (approvedMemory) {
          await saveApprovedPostToSupabase(approvedMemory);
        }
        await savePostQueueItemToSupabase(queueItem);
      } catch (error) {
        persistLocalQueueFallback([queueItem]);
        if (approvedMemory) persistLocalApprovedFallback([approvedMemory]);
        setGenerationNotice(friendlyApprovalMessage("local"));
        setQueueDebugMessage(
          error instanceof Error
            ? `Review Queue move-to-ready fell back locally: ${error.message}`
            : "Review Queue move-to-ready fell back locally."
        );
      }
    } else {
      if (approvedMemory) persistLocalApprovedFallback([approvedMemory]);
      persistLocalQueueFallback([queueItem]);
    }
  }

  async function sendPostToManagerReview(campaign: Campaign, post: GeneratedPost) {
    const now = new Date().toISOString();
    const nextReview: ReviewMetadata = {
      ...(post.review ?? {}),
      status: "Sent for review",
      reviewerName: post.review?.reviewerName || "Manager",
      feedback: post.review?.feedback || "",
      requestedAt: now
    };
    const updatedPost: GeneratedPost = {
      ...post,
      review: nextReview,
      safetyCheck: post.safetyCheck ?? runFallbackBrandSafetyCheck(userFacingPostContent(post.content, campaign, post), campaign, post)
    };
    const variantNumber =
      campaign.posts
        .slice(0, campaign.posts.findIndex((item) => item.id === post.id) + 1)
        .filter((item) => item.platform === post.platform).length || 1;
    const queueItem: PostQueueItem = {
      ...createQueueItem(updatedPost, campaign),
      status: "Ready",
      hiddenFromQueue: true,
      managerReviewOnly: true,
      review: nextReview,
      updatedAt: now
    };

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
    setPostQueue((current) => [
      queueItem,
      ...current.filter((item) => item.generatedPostId !== post.id)
    ]);

    const link = createManagerReviewLink({
      scopeType: "Selected posts/replies",
      scope: { itemIds: [queueItem.id] },
      permissionLevel: "Can approve/request changes",
      expiresAt: reviewExpirationIso("14")
    });
    const url = managerReviewUrl(link.token);

    recordActivity({
      actionType: "Sent to manager review",
      objectType: "Post",
      objectId: queueItem.id,
      title: "Sent to manager review",
      summary: `${campaign.name} was sent for manager feedback on ${post.platform}.`,
      destination: "Manager Review",
      status: "success",
      metadata: { reviewLinkId: link.id, url }
    });
    setGenerationNotice("Sent to manager for feedback. Share link created.");
    setQueueDebugMessage(`Manager review link created for ${queueItem.id}.`);

    if (storageMode === "supabase") {
      try {
        await saveGeneratedPostToSupabase(campaign.id, updatedPost, variantNumber);
        await savePostQueueItemToSupabase(queueItem);
      } catch (error) {
        persistLocalQueueFallback([queueItem]);
        setQueueDebugMessage(
          error instanceof Error
            ? `Manager review sync fell back locally: ${error.message}`
            : "Manager review sync fell back locally."
        );
      }
    } else {
      persistLocalQueueFallback([queueItem]);
    }

    return url;
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
      opportunityId: campaign.opportunityId,
      opportunityTitle: campaign.opportunityTitle,
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
      isSandbox: false,
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
    const intentLine = activeCampaign?.intent || intent || "the current brief intent";
    const angleLine = activeCampaign?.contentAngle || contentAngle || "the selected content angle";
    const mediaPhrase = concreteMediaPhrase(activeCampaign?.mediaContext ?? mediaContext);
    const platformCopy: Record<Platform, string> = {
      LinkedIn: `The useful detail is in the operation, not the announcement.\n\n${intentLine}\n\n${mediaPhrase ? `${capitalizeFirst(mediaPhrase)} makes the constraint visible. ` : ""}${mediaNote ? `${mediaNote}\n\n` : ""}Make the edit this way: ${instruction.toLowerCase()}.\n\nThe takeaway: build from the real workflow, then make the product prove itself there.`,
      X: `${intentLine}\n\n${mediaPhrase ? `${capitalizeFirst(mediaPhrase)} is the proof point. ` : ""}${instruction}`,
      Instagram: `${mediaPhrase ? `${capitalizeFirst(mediaPhrase)} is the post.` : intentLine}\n\n${mediaNote ? `What it shows: ${mediaNote}` : `Angle: ${angleLine}`}\n\n${instruction}`,
      TikTok: `Hook: This is where the operation gets real.\n\nShort script:\n1. Open on ${mediaPhrase || "the media"}.\n2. Call out the operational detail.\n3. Explain the point: ${intentLine}.\n4. Make the requested change clear: ${instruction}.\n5. End with the practical takeaway.`
    };
    const copy = sanitizeConduitCopy(platformCopy[post.platform]);
    return {
      postCopy: copy,
      content: copy,
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
      const response = await withTimeout(
        fetch("/api/generate", {
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
            feedbackMemory: feedbackMemorySummary(feedbackMemory, useFeedbackMemory),
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
        }),
        30000,
        "AI regeneration took too long. Mock fallback was used."
      );
      const payload = await readJsonResponse(response, "OpenAI regeneration failed");

      if (payload?.fallbackReason === "missing_api_key") {
        const mockPackage = createMockRegeneratedPost(post, instruction);
        const contentOrigin: ContentOrigin =
          post.contentOrigin === "Manually written" || post.contentOrigin === "AI-improved from manual draft"
            ? "AI-improved from manual draft"
            : post.contentOrigin ?? "AI-generated";
        const mockPost = { ...post, ...mockPackage, generatedBy: "Mock" as const, contentOrigin };
        updatePost(post.id, {
          previousContent: post.content,
          previousPostCopy: userFacingPostContent(post.content, activeCampaign, post),
          ...mockPackage,
          generatedBy: "Mock",
          contentOrigin,
          safetyCheck: runFallbackBrandSafetyCheck(mockPackage.postCopy ?? mockPackage.content, activeCampaign, mockPost)
        });
        captureFeedbackMemory({
          sourceType: "regenerate",
          platform: post.platform,
          postingAccountId: post.profileId ?? activeCampaign.profileId,
          postingAccountName: post.profileName ?? activeCampaign.profileName,
          originalContent: userFacingPostContent(post.content, activeCampaign, post),
          revisedContent: mockPackage.postCopy ?? mockPackage.content,
          feedbackText: instruction.trim()
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

      const contentOrigin: ContentOrigin =
        post.contentOrigin === "Manually written" || post.contentOrigin === "AI-improved from manual draft"
          ? "AI-improved from manual draft"
          : post.contentOrigin ?? "AI-generated";
      const nextPost = { ...post, ...nextPackage, generatedBy: "AI" as const, contentOrigin };
      updatePost(post.id, {
        previousContent: post.content,
        previousPostCopy: userFacingPostContent(post.content, activeCampaign, post),
        ...nextPackage,
        generatedBy: "AI",
        contentOrigin,
        safetyCheck: runFallbackBrandSafetyCheck(nextPackage.postCopy ?? nextPackage.content, activeCampaign, nextPost)
      });
      captureFeedbackMemory({
        sourceType: "regenerate",
        platform: post.platform,
        postingAccountId: post.profileId ?? activeCampaign.profileId,
        postingAccountName: post.profileName ?? activeCampaign.profileName,
        originalContent: userFacingPostContent(post.content, activeCampaign, post),
        revisedContent: nextPackage.postCopy ?? nextPackage.content,
        feedbackText: instruction.trim()
      });
    } catch {
      const mockPackage = createMockRegeneratedPost(post, instruction);
      const contentOrigin: ContentOrigin =
        post.contentOrigin === "Manually written" || post.contentOrigin === "AI-improved from manual draft"
          ? "AI-improved from manual draft"
          : post.contentOrigin ?? "AI-generated";
      const mockPost = { ...post, ...mockPackage, generatedBy: "Mock" as const, contentOrigin };
      updatePost(post.id, {
        previousContent: post.content,
        previousPostCopy: userFacingPostContent(post.content, activeCampaign, post),
        ...mockPackage,
        generatedBy: "Mock",
        contentOrigin,
        safetyCheck: runFallbackBrandSafetyCheck(mockPackage.postCopy ?? mockPackage.content, activeCampaign, mockPost)
      });
      captureFeedbackMemory({
        sourceType: "regenerate",
        platform: post.platform,
        postingAccountId: post.profileId ?? activeCampaign.profileId,
        postingAccountName: post.profileName ?? activeCampaign.profileName,
        originalContent: userFacingPostContent(post.content, activeCampaign, post),
        revisedContent: mockPackage.postCopy ?? mockPackage.content,
        feedbackText: instruction.trim()
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

  function persistActivity(item: ActivityLogItem) {
    if (storageMode !== "supabase") return;
    saveActivityLogToSupabase(item).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Activity Log sync failed: ${error.message}`
          : "Activity Log sync failed."
      );
    });
  }

  function persistReviewLink(link: ReviewLink) {
    if (storageMode !== "supabase") return;
    saveReviewLinkToSupabase(link).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Review link sync failed: ${error.message}`
          : "Review link sync failed."
      );
    });
  }

  function persistReviewFeedback(feedback: ReviewFeedback) {
    if (storageMode !== "supabase") return;
    saveReviewFeedbackToSupabase(feedback).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Review feedback sync failed: ${error.message}`
          : "Review feedback sync failed."
      );
    });
  }

  function resolveManagerFeedback(feedbackId: string) {
    const resolvedFeedback = reviewFeedback.find((feedback) => feedback.id === feedbackId);
    if (!resolvedFeedback) return;

    const updatedFeedback: ReviewFeedback = {
      ...resolvedFeedback,
      status: "resolved"
    };

    setReviewFeedback((current) =>
      current.map((feedback) => (feedback.id === feedbackId ? updatedFeedback : feedback))
    );
    persistReviewFeedback(updatedFeedback);
    recordActivity({
      actionType: "Manager feedback resolved",
      objectType: updatedFeedback.contentType,
      objectId: updatedFeedback.contentId,
      title: "Manager feedback resolved",
      summary: `${updatedFeedback.reviewerName}'s feedback was marked resolved.`,
      destination: "Ready to Post",
      status: "success"
    });
  }

  function recordActivity(input: Omit<ActivityLogItem, "id" | "createdAt" | "userEmail" | "workspaceName">) {
    const item: ActivityLogItem = {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      userEmail: authUserEmail,
      workspaceName: workspace?.name,
      ...input
    };
    setActivityLog((current) => [item, ...current.filter((activity) => activity.id !== item.id)].slice(0, 100));
    persistActivity(item);
    if (input.status === "success") {
      setGenerationNotice(input.summary);
    }
    return item;
  }

  function createManagerReviewLink(input: {
    scopeType: ReviewLinkScopeType;
    scope: ReviewLink["scope"];
    permissionLevel: ReviewPermissionLevel;
    expiresAt?: string;
  }) {
    const link: ReviewLink = {
      id: `review-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      token: generateReviewToken(),
      scopeType: input.scopeType,
      scope: input.scope,
      permissionLevel: input.permissionLevel,
      expiresAt: input.expiresAt,
      createdBy: authUserEmail,
      createdAt: new Date().toISOString()
    };
    setReviewLinks((current) => [link, ...current]);
    persistReviewLink(link);
    recordActivity({
      actionType: "Review link created",
      objectType: "Review link",
      objectId: link.id,
      title: "Manager review link created",
      summary: `${link.scopeType} review link created with ${link.permissionLevel} permission.`,
      destination: "Manager Review",
      status: "success"
    });
    return link;
  }

  function disableManagerReviewLink(id: string) {
    const disabledAt = new Date().toISOString();
    let disabledLink: ReviewLink | undefined;
    setReviewLinks((current) =>
      current.map((link) => {
        if (link.id !== id) return link;
        disabledLink = { ...link, disabledAt };
        return disabledLink;
      })
    );
    if (disabledLink) {
      persistReviewLink(disabledLink);
      recordActivity({
        actionType: "Review link disabled",
        objectType: "Review link",
        objectId: disabledLink.id,
        title: "Manager review link disabled",
        summary: `${disabledLink.scopeType} review link was disabled.`,
        destination: "Manager Review",
        status: "success"
      });
    }
  }

  function undoLastActivity() {
    const item = activityLog.find((activity) => activity.undo);
    if (!item?.undo) {
      setGenerationNotice("No recent action can be undone.");
      return;
    }

    const undoType = item.undo.type;
    const payload = item.undo.payload as any;
    if (undoType === "queue-item-restore" && payload?.item) {
      const previousItem = payload.item as PostQueueItem;
      setPostQueue((current) => [previousItem, ...current.filter((queueItem) => queueItem.id !== previousItem.id)]);
      if (storageMode === "supabase") {
        savePostQueueItemToSupabase(previousItem).catch(() => undefined);
      }
    } else if (undoType === "queue-bulk-restore" && Array.isArray(payload?.items)) {
      const previousItems = payload.items as PostQueueItem[];
      setPostQueue((current) => mergeById(previousItems, current));
      if (storageMode === "supabase") {
        previousItems.forEach((queueItem) => savePostQueueItemToSupabase(queueItem).catch(() => undefined));
      }
    } else if (undoType === "capture-status" && payload?.id && payload?.status) {
      const previous = sourceCaptures.find((capture) => capture.id === payload.id);
      if (previous) {
        const restored = { ...previous, status: payload.status as SourceCapture["status"], updatedAt: new Date().toISOString() };
        setSourceCaptures((current) => current.map((capture) => capture.id === restored.id ? restored : capture));
        persistSourceCapture(restored);
      }
    } else if (undoType === "opportunity-status" && payload?.id && payload?.status) {
      const previous = opportunities.find((opportunity) => opportunity.id === payload.id);
      if (previous) {
        const restored = { ...previous, status: payload.status as OpportunityStatus, updatedAt: new Date().toISOString() };
        setOpportunities((current) => current.map((opportunity) => opportunity.id === restored.id ? restored : opportunity));
        persistOpportunity(restored);
      }
    } else {
      setGenerationNotice("That activity cannot be undone.");
      return;
    }

    setActivityLog((current) => current.filter((activity) => activity.id !== item.id));
    setGenerationNotice(`Undid: ${item.title}`);
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

  function persistOpportunity(opportunity: Opportunity) {
    if (storageMode !== "supabase") return;
    saveOpportunityToSupabase(opportunity).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Opportunity save failed: ${error.message}`
          : "Opportunity save failed."
      );
      setGenerationNotice("Saved in this session. Shared sync needs attention.");
    });
  }

  function persistSourceCapture(capture: SourceCapture) {
    if (storageMode !== "supabase") return;
    saveSourceCaptureToSupabase(capture).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Capture save failed: ${error.message}`
          : "Capture save failed."
      );
      setGenerationNotice("Capture saved locally. Shared sync needs attention.");
    });
  }

  function persistClaimLibraryItem(item: ClaimLibraryItem) {
    if (storageMode !== "supabase") return;
    saveClaimLibraryItemToSupabase(item).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Claim Library save failed: ${error.message}`
          : "Claim Library save failed."
      );
      setGenerationNotice("Claim saved in this session. Shared sync needs attention.");
    });
  }

  function removeSourceCapture(captureId: string) {
    setSourceCaptures((current) => current.filter((capture) => capture.id !== captureId));
    if (storageMode !== "supabase") return;
    deleteSourceCaptureFromSupabase(captureId).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Capture delete failed: ${error.message}`
          : "Capture delete failed."
      );
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

  function saveSocialConnection(connection: SocialConnection) {
    setSocialConnections((current) => mergeById([connection], current));
    if (storageMode === "supabase") {
      saveSocialConnectionToSupabase(connection).catch((error) => {
        writeLocalValue(storageKeys.socialConnections, mergeById([connection], socialConnections));
        setQueueDebugMessage(
          error instanceof Error
            ? `Instagram sandbox config sync failed: ${error.message}`
            : "Instagram sandbox config sync failed."
        );
        setGenerationNotice("Instagram sandbox settings saved locally. Shared sync needs attention.");
      });
    }
  }

  function removeMediaAsset(assetId: string) {
    const asset = mediaAssets.find((item) => item.id === assetId);
    setMediaAssets((current) => current.filter((asset) => asset.id !== assetId));
    if (selectedMediaAssetId === assetId) {
      setSelectedMediaAssetId("");
    }
    recordActivity({
      actionType: "Media asset deleted",
      objectType: "Media Asset",
      objectId: assetId,
      title: "Media asset deleted",
      summary: `${asset?.filename || "Media asset"} was removed from Media Library.`,
      destination: "Media Library",
      status: "success"
    });
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

  function removeClaimLibraryItem(claimId: string) {
    if (storageMode !== "supabase") return;
    deleteClaimLibraryItemFromSupabase(claimId).catch((error) => {
      setQueueDebugMessage(
        error instanceof Error
          ? `Claim Library delete failed: ${error.message}`
          : "Claim Library delete failed."
      );
      setGenerationNotice("Claim removed from this session. Shared sync needs attention.");
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

  function saveBrandVoiceRules(nextBrandVoice: BrandVoiceProfile) {
    if (storageMode === "supabase") {
      persistBrandRules(nextBrandVoice);
      return;
    }

    writeLocalValue(storageKeys.brandVoice, nextBrandVoice);
  }

  function toggleFeedbackMemoryUsage(value: boolean) {
    setUseFeedbackMemory(value);
    writeLocalValue(storageKeys.useFeedbackMemory, value);
  }

  function persistFeedbackMemory(item: FeedbackMemoryItem) {
    if (storageMode === "supabase") {
      saveFeedbackMemoryToSupabase(item).catch((error) => {
        setQueueDebugMessage(
          error instanceof Error
            ? `Feedback Memory save failed: ${error.message}`
            : "Feedback Memory save failed."
        );
      });
    } else {
      writeLocalValue(storageKeys.feedbackMemory, [
        item,
        ...feedbackMemory.filter((memory) => memory.id !== item.id)
      ].slice(0, 100));
    }
  }

  function captureFeedbackMemory(input: {
    sourceType: FeedbackMemorySourceType;
    platform?: Platform;
    postingAccountId?: string;
    postingAccountName?: string;
    originalContent?: string;
    revisedContent?: string;
    feedbackText?: string;
    metadata?: Record<string, unknown>;
  }) {
    const inferredPreference = inferFeedbackPreference(input);
    if (!inferredPreference) return;
    const item: FeedbackMemoryItem = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceType: input.sourceType,
      platform: input.platform,
      postingAccountId: input.postingAccountId,
      postingAccountName: input.postingAccountName,
      originalContent: input.originalContent,
      revisedContent: input.revisedContent,
      feedbackText: input.feedbackText,
      inferredPreference,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString()
    };
    setFeedbackMemory((current) => {
      const next = [item, ...current].slice(0, 100);
      if (storageMode !== "supabase") {
        writeLocalValue(storageKeys.feedbackMemory, next);
      }
      return next;
    });
    persistFeedbackMemory(item);
    recordActivity({
      actionType: "Feedback Memory captured",
      objectType: "Feedback Memory",
      objectId: item.id,
      title: "Feedback Memory captured",
      summary: inferredPreference,
      destination: "Brand Voice Rules",
      status: "success"
    });
  }

  function updateFeedbackMemoryItem(id: string, updates: Partial<FeedbackMemoryItem>) {
    let nextItem: FeedbackMemoryItem | undefined;
    setFeedbackMemory((current) => {
      const next = current.map((item) => {
        if (item.id !== id) return item;
        nextItem = { ...item, ...updates };
        return nextItem;
      });
      if (storageMode !== "supabase") {
        writeLocalValue(storageKeys.feedbackMemory, next);
      }
      return next;
    });
    if (storageMode === "supabase" && nextItem) {
      saveFeedbackMemoryToSupabase(nextItem).catch(() => undefined);
    }
  }

  function deleteFeedbackMemoryItem(id: string) {
    setFeedbackMemory((current) => {
      const next = current.filter((item) => item.id !== id);
      if (storageMode !== "supabase") {
        writeLocalValue(storageKeys.feedbackMemory, next);
      }
      return next;
    });
    if (storageMode === "supabase") {
      deleteFeedbackMemoryFromSupabase(id).catch(() => undefined);
    }
  }

  async function handleAuthSubmit(email: string, password: string, mode: "sign-in" | "sign-up") {
    setAuthLoading(true);
    setWorkspaceConnectionError("");
    try {
      const user =
        mode === "sign-up"
          ? await signUpWithPassword(email, password)
          : await signInWithPassword(email, password);
      if (!user) {
        throw new Error("Check your email to confirm your account, then sign in.");
      }
      setAuthUserEmail(user.email ?? email);
      await loadSupabaseWorkspaceWithRetry();
      setGenerationNotice("");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await signOutOfSupabase();
    setAuthUserEmail("");
    setWorkspace(null);
    setWorkspaceConnectionError("");
    setWorkspaceConnectionAttempt(0);
    setHasLoadedLocalData(false);
    setStorageMode(appUsesSupabase() ? "supabase" : "local");
    setCampaigns([]);
    setProfiles([]);
    setLibrarySources([]);
    setApprovedPosts([]);
    setRejectedPosts([]);
    setPostQueue([]);
    setMediaAssets([]);
    setInspirationPatterns([]);
    setOpportunities([]);
    setFeedbackMemory([]);
    setSourceInboxHistory([]);
    setReviewLinks([]);
    setReviewFeedback([]);
  }

  function openReviewQueue(filter: ReviewQueueFilter = "All drafts") {
    setReviewQueueFilterPreset(filter);
    setScreen("Review Drafts");
  }

  if (authLoading && appUsesSupabase()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Conduit Social Command Center</h1>
          <p className="mt-2 text-sm text-muted-foreground">Checking your workspace...</p>
          {workspaceConnectionAttempt > 0 && (
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Workspace connection attempt {workspaceConnectionAttempt} of 2
            </p>
          )}
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm text-muted-foreground">
            If this takes more than a few seconds, retry the shared workspace or continue in local browser mode. Local mode will not delete or overwrite Supabase data.
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button size="sm" onClick={loadSupabaseWorkspaceWithRetry}>
              Retry workspace
            </Button>
            <Button size="sm" variant="secondary" onClick={() => loadLocalData("You chose local browser mode. Shared workspace data was not changed.")}>
              Use local mode
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (appUsesSupabase() && workspaceConnectionError) {
    return (
      <WorkspaceConnectionIssueScreen
        error={workspaceConnectionError}
        userEmail={authUserEmail}
        onRetry={loadSupabaseWorkspaceWithRetry}
        onUseLocalMode={() => loadLocalData("You chose local browser mode. Shared workspace data was not changed.")}
      />
    );
  }

  if (appUsesSupabase() && storageMode === "supabase" && !authUserEmail) {
    return (
      <LoginScreen
        onSubmit={handleAuthSubmit}
        missingEnv={[...supabaseStatus.missingClient, ...supabaseStatus.missingServer]}
        onUseLocalMode={() => loadLocalData("You chose local browser mode from the sign-in screen. Shared workspace data was not changed.")}
      />
    );
  }

  const demoCampaignIds = new Set(campaigns.filter(isDemoLikeRecord).map((campaign) => campaign.id));
  const demoProfileIds = new Set(profiles.filter(isDemoLikeRecord).map((profile) => profile.id));
  const visibleCampaigns = showDemoData ? campaigns : campaigns.filter((campaign) => !isDemoLikeRecord(campaign));
  const visibleProfiles = showDemoData ? profiles : profiles.filter((profile) => !isDemoLikeRecord(profile));
  const visibleLibrarySources = showDemoData ? librarySources : librarySources.filter((source) => !isDemoLikeRecord(source));
  const visibleApprovedPosts = showDemoData
    ? approvedPosts
    : approvedPosts.filter((memory) => !isDemoLikeRecord(memory) && !demoCampaignIds.has(memory.campaignId) && !demoProfileIds.has(memory.profileId));
  const visiblePostQueue = showDemoData
    ? postQueue
    : postQueue.filter((item) => !isDemoLikeRecord(item) && !demoCampaignIds.has(item.campaignId) && !demoProfileIds.has(item.profileId ?? ""));
  const visibleClaimLibrary = showDemoData
    ? claimLibrary
    : claimLibrary.filter((claim) => !isDemoLikeRecord({ id: claim.id, claimText: claim.claimText }));

  return (
    <main className="min-h-screen">
      <CommandBar
        open={commandBarOpen}
        onOpenChange={setCommandBarOpen}
        onRunAction={runQuickAction}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 py-4 lg:flex-row lg:px-5">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72">
          <div className="flex h-full flex-col rounded-lg border border-slate-200/80 bg-white/95 p-4 shadow-panel backdrop-blur">
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
                    Capture, create, review, publish, and learn.
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full justify-center" onClick={() => setCommandBarOpen(true)}>
                <Plus size={16} /> Quick actions
              </Button>
              <p className="mt-2 text-center text-xs font-semibold text-slate-400">
                Press ⌘K / Ctrl+K
              </p>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-5 pb-4">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-3 text-xs font-extrabold uppercase tracking-widest text-slate-400">
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
              </div>
            </nav>

            <div className="mt-4 shrink-0 rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-sm text-slate-700">
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
            <DashboardScreen
              campaigns={visibleCampaigns}
              activeCampaignId={activeCampaignId}
              setActiveCampaignId={setActiveCampaignId}
              setScreen={setScreen}
              deleteCampaign={deleteCampaign}
              repurposeCampaign={openRepurposeCampaign}
              resetLocalData={handleResetLocalData}
              approvedCount={visibleCampaigns.reduce((total, campaign) => total + campaign.posts.filter((post) => post.status === "approved").length, 0)}
              rejectedCount={visibleCampaigns.reduce((total, campaign) => total + campaign.posts.filter((post) => post.status === "rejected").length, 0)}
              draftCount={visibleCampaigns.reduce((total, campaign) => total + campaign.posts.filter((post) => post.status === "draft").length, 0)}
              profileCount={visibleProfiles.length}
              profiles={visibleProfiles}
              brandVoice={brandVoice}
              librarySourceCount={visibleLibrarySources.length}
              readyQueueCount={visiblePostQueue.filter((item) => normalizeQueueStatus(item.status) === "Ready").length}
              opportunities={opportunities}
              postQueue={visiblePostQueue}
              librarySources={visibleLibrarySources}
              mediaAssets={mediaAssets}
              sourceInboxHistory={sourceInboxHistory}
              sourceCaptures={sourceCaptures}
              activityLog={activityLog}
              reviewFeedback={reviewFeedback}
              undoLastActivity={undoLastActivity}
              socialConnections={socialConnections}
              applyMediaAsset={applyMediaAsset}
              setCampaignName={setCampaignName}
              setIntent={setIntent}
              setIdea={setIdea}
              setSelectedPlatforms={setSelectedPlatforms}
              setContentAngle={setContentAngle}
              setSimpleStyleChips={setSimpleStyleChips}
              storageMode={storageMode}
              loadDemoData={loadDemoData}
              clearDemoData={clearDemoData}
              showDemoData={showDemoData}
              hideDemoData={hideDemoData}
              showDemoDataAgain={showDemoDataAgain}
              startNewPost={startNewPost}
              openReviewQueue={openReviewQueue}
            />
          )}
          {screen === "Analytics" && (
            <AnalyticsScreen
              postQueue={visiblePostQueue}
              campaigns={visibleCampaigns}
              librarySources={visibleLibrarySources}
              setScreen={setScreen}
              setCampaignName={setCampaignName}
              setIntent={setIntent}
              setIdea={setIdea}
              setSelectedPlatforms={setSelectedPlatforms}
              setContentAngle={setContentAngle}
              setSimpleStyleChips={setSimpleStyleChips}
            />
          )}
          {screen === "Opportunity Inbox" && (
            <OpportunityInbox
              opportunities={opportunities}
              setOpportunities={setOpportunities}
              persistOpportunity={persistOpportunity}
              profiles={profiles}
              setProfiles={setProfiles}
              persistProfile={persistProfile}
              librarySources={librarySources}
              setLibrarySources={setLibrarySources}
              persistLibrarySource={persistLibrarySource}
              brandVoice={brandVoice}
              queueApprovedReply={queueApprovedReply}
              setCampaignName={setCampaignName}
              setIntent={setIntent}
              setIdea={setIdea}
              setSelectedPlatforms={setSelectedPlatforms}
              setSelectedProfileId={setSelectedProfileId}
              setActiveOpportunityContext={setActiveOpportunityContext}
              setScreen={setScreen}
              recordActivity={recordActivity}
            />
          )}
          {screen === "Content Calendar" && (
            <ContentCalendarScreen
              queue={visiblePostQueue}
              campaigns={visibleCampaigns}
              profiles={visibleProfiles}
              opportunities={opportunities}
              librarySources={librarySources}
              mediaAssets={mediaAssets}
              updateQueueItem={updateQueueItem}
              setScreen={setScreen}
              mediaPreviewUrl={mediaPreviewUrl}
              reviewLinks={reviewLinks}
              createReviewLink={createManagerReviewLink}
              disableReviewLink={disableManagerReviewLink}
              storageMode={storageMode}
            />
          )}
          {screen === "Connections" && (
            <ConnectionsScreen
              instagramSandboxConnection={instagramSandboxConnection}
              saveInstagramSandboxConnection={saveSocialConnection}
              workspaceId={workspace?.id ?? ""}
            />
          )}
          {screen === "Source Inbox" && (
            <SourceInboxScreen
              initialView={sourceInboxInitialView}
              campaigns={visibleCampaigns}
              setCampaigns={setCampaigns}
              approvedPosts={approvedPosts}
              setApprovedPosts={setApprovedPosts}
              postQueue={postQueue}
              setPostQueue={setPostQueue}
              feedbackMemory={feedbackMemory}
              captureFeedbackMemory={captureFeedbackMemory}
              storageMode={storageMode}
              profiles={visibleProfiles}
              setProfiles={setProfiles}
              persistProfile={persistProfile}
              opportunities={opportunities}
              setOpportunities={setOpportunities}
              persistOpportunity={persistOpportunity}
              librarySources={visibleLibrarySources}
              setLibrarySources={setLibrarySources}
              persistLibrarySource={persistLibrarySource}
              mediaAssets={mediaAssets}
              setMediaAssets={setMediaAssets}
              persistMediaAsset={persistMediaAsset}
              history={sourceInboxHistory}
              setHistory={setSourceInboxHistory}
              captures={sourceCaptures}
              setCaptures={setSourceCaptures}
              persistSourceCapture={persistSourceCapture}
              removeSourceCapture={removeSourceCapture}
              recordActivity={recordActivity}
              setScreen={setScreen}
              setCampaignName={setCampaignName}
              setIntent={setIntent}
              setIdea={setIdea}
              setMediaContext={setMediaContext}
              setMediaPreviewUrl={setMediaPreviewUrl}
              setSelectedProfileId={setSelectedProfileId}
            />
          )}
          {screen === "Content Library" && (
            <ContentLibraryScreen
              campaigns={visibleCampaigns}
              approvedPosts={visibleApprovedPosts}
              postQueue={visiblePostQueue}
              opportunities={opportunities}
              profiles={visibleProfiles}
              setScreen={setScreen}
              updateQueueItem={updateQueueItem}
              moveApprovedToQueue={moveApprovedToQueue}
              repurposePost={openRepurposePost}
              mediaPreviewUrl={mediaPreviewUrl}
            />
          )}
          {screen === "Profiles" && (
            <ProfilesScreen
              profiles={profiles}
              importedInspirationPatterns={inspirationPatterns}
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
              inspirationPatterns={inspirationPatterns}
              claimLibrary={claimLibrary}
              setClaimLibrary={setClaimLibrary}
              persistClaimLibraryItem={persistClaimLibraryItem}
              removeClaimLibraryItem={removeClaimLibraryItem}
              recordActivity={recordActivity}
            />
          )}
          {screen === "Media Library" && (
            <MediaLibraryScreen
              mediaAssets={mediaAssets}
              setMediaAssets={setMediaAssets}
              persistMediaAsset={persistMediaAsset}
              removeMediaAsset={removeMediaAsset}
              campaigns={campaigns}
              approvedPosts={approvedPosts}
              postQueue={postQueue}
              profiles={profiles}
              isGenerating={isGenerating}
              recordActivity={recordActivity}
              onGenerateContentPack={generateMediaContentPack}
              onUseMediaAsset={(asset) => {
                applyMediaAsset(asset);
                setScreen("New Campaign");
              }}
              storageMode={storageMode}
            />
          )}
          {screen === "Brand Voice Rules" && (
            <BrandRulesScreen
              uploadText={uploadText}
              brandVoice={brandVoice}
              setBrandVoice={setBrandVoice}
              saveBrandRules={saveBrandVoiceRules}
              feedbackMemory={feedbackMemory}
              memorySummary={feedbackMemorySummary(feedbackMemory, useFeedbackMemory)}
              useFeedbackMemory={useFeedbackMemory}
              setUseFeedbackMemory={toggleFeedbackMemoryUsage}
              updateFeedbackMemoryItem={updateFeedbackMemoryItem}
              deleteFeedbackMemoryItem={deleteFeedbackMemoryItem}
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
              handleCreateManualDraft={handleCreateManualDraft}
              handleMockFallback={handleMockFallback}
              createDefaultConduitProfile={createDefaultConduitProfile}
              campaignComplete={activeCampaignComplete}
            />
          )}
          {screen === "Repurpose" && (
            <RepurposeScreen
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
              formatPostContent={(post, campaign) => userFacingPostContent(post.content, campaign, post)}
              isGenericIntent={looksLikeGenericIntent}
            />
          )}
          {screen === "Ready to Post" && (
              <PostQueue
                queue={visiblePostQueue}
              campaigns={visibleCampaigns}
              profiles={visibleProfiles}
              updateQueueItem={updateQueueItem}
              deleteQueueItem={deleteQueueItem}
              setScreen={setScreen}
              mediaPreviewUrl={mediaPreviewUrl}
              queueDebugMessage={queueDebugMessage}
              storageMode={storageMode}
              activeCampaign={activeCampaign}
              activeCampaignComplete={activeCampaignComplete}
              startNewPost={startNewPost}
                repurposeCampaign={openRepurposeCampaign}
                instagramSandboxConnection={instagramSandboxConnection}
                recordActivity={recordActivity}
                reviewLinks={reviewLinks}
                reviewFeedback={reviewFeedback}
                resolveManagerFeedback={resolveManagerFeedback}
                createReviewLink={createManagerReviewLink}
                disableReviewLink={disableManagerReviewLink}
              />
          )}
          {screen === "Review Drafts" && (
            <ResultsEditor
              campaigns={visibleCampaigns}
              campaign={activeCampaign}
              setActiveCampaignId={setActiveCampaignId}
              campaignComplete={activeCampaignComplete}
              rawIdeaIsGeneric={Boolean(
                activeCampaign?.idea.trim() && looksLikeGenericRawIdea(activeCampaign.idea, [
                  legacyGenericIdea,
                  rawIdeaPlaceholder
                ])
              )}
              opportunities={opportunities}
              setOpportunities={setOpportunities}
              persistOpportunity={persistOpportunity}
              profiles={visibleProfiles}
              postQueue={visiblePostQueue}
              queueApprovedReply={queueApprovedReply}
              queuePostFromReview={queuePostFromReview}
              sendPostToManagerReview={sendPostToManagerReview}
              updateQueueItem={updateQueueItem}
              updateCampaignPostFromReview={updateCampaignPostFromReview}
              reviewQueueFilterPreset={reviewQueueFilterPreset}
              reviewFeedback={reviewFeedback}
              resolveManagerFeedback={resolveManagerFeedback}
              refreshManagerFeedback={refreshManagerFeedback}
              captureFeedbackMemory={captureFeedbackMemory}
              feedbackMemorySummary={feedbackMemorySummary(feedbackMemory, useFeedbackMemory)}
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
              startNewPost={startNewPost}
              repurposeCampaign={openRepurposeCampaign}
            />
          )}
        </section>
      </div>
    </main>
  );
}

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
  storageMode,
  inspirationPatterns,
  claimLibrary,
  setClaimLibrary,
  persistClaimLibraryItem,
  removeClaimLibraryItem,
  recordActivity
}: {
  librarySources: LibrarySource[];
  setLibrarySources: (items: LibrarySource[] | ((current: LibrarySource[]) => LibrarySource[])) => void;
  selectedLibrarySourceIds: string[];
  setSelectedLibrarySourceIds: (ids: string[] | ((current: string[]) => string[])) => void;
  approvedPosts: ApprovedPostMemory[];
  brandVoice: BrandVoiceProfile;
  profiles: Profile[];
  setScreen: (screen: Screen) => void;
  setCampaignName: (value: string) => void;
  setContentAngle: (value: ContentAngle | "") => void;
  setIntent: (value: string) => void;
  setIdea: (value: string) => void;
  setSelectedProfileId: (value: string) => void;
  persistLibrarySource: (source: LibrarySource) => void;
  removeLibrarySource: (id: string) => void;
  storageMode: StorageMode;
  inspirationPatterns: InspirationPattern[];
  claimLibrary: ClaimLibraryItem[];
  setClaimLibrary: (items: ClaimLibraryItem[] | ((current: ClaimLibraryItem[]) => ClaimLibraryItem[])) => void;
  persistClaimLibraryItem: (claim: ClaimLibraryItem) => void;
  removeClaimLibraryItem: (id: string) => void;
  recordActivity: (input: Omit<ActivityLogItem, "id" | "createdAt" | "userEmail" | "workspaceName">) => ActivityLogItem;
}) {
  const [sourceName, setSourceName] = useState("");
  const [sourceCategory, setSourceCategory] = useState<LibrarySourceCategory>("Website");
  const [sourcePlatform, setSourcePlatform] = useState<LibrarySourcePlatform>("Website");
  const [sourceUrls, setSourceUrls] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [claimText, setClaimText] = useState("");
  const [claimType, setClaimType] = useState<ClaimType>("Needs review");

  const activeSources = librarySources.filter((source) => source.reviewStatus !== "Save only");
  const approvedClaims = claimLibrary.filter((claim) => claim.claimType === "Approved claim" || claim.claimType === "Proof-backed");
  const riskyClaims = claimLibrary.filter((claim) => claim.claimType === "Do not say" || claim.riskLevel === "High");

  function toggleSource(id: string) {
    setSelectedLibrarySourceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function addSource() {
    const now = new Date().toISOString();
    const name =
      sourceName.trim() ||
      getLibrarySourceDisplayName({
        name: "",
        category: sourceCategory,
        platform: sourcePlatform,
        urls: sourceUrls,
        updatedAt: now
      } as LibrarySource);
    const source: LibrarySource = {
      id: `source-${Date.now()}`,
      name,
      category: sourceCategory,
      platform: sourcePlatform,
      urls: sourceUrls.trim(),
      content: sourceContent.trim(),
      notes: sourceNotes.trim(),
      analysis: {
        voiceTraits: "Needs analysis.",
        commonTopics: sourceCategory,
        repeatedPhrases: "Needs analysis.",
        strongHooks: "Needs analysis.",
        proofPoints: "Review source before using as proof.",
        avoid: "Avoid unsupported claims until reviewed.",
        bestUseCases: "Company Knowledge, source material, and content planning.",
        keyThemes: [],
        usefulPhrases: [],
        customerPainPoints: [],
        productClaims: [],
        founderVoiceExamples: [],
        postIdeas: []
      },
      useFor: ["Use as Company Knowledge"],
      reviewStatus: "Needs review",
      tags: [],
      updatedAt: now
    };
    setLibrarySources((current) => [source, ...current]);
    setSelectedLibrarySourceIds((current) => uniqueStrings([source.id, ...current]));
    persistLibrarySource(source);
    recordActivity({
      actionType: "Company Knowledge source added",
      objectType: "Company Knowledge",
      objectId: source.id,
      title: "Knowledge source added",
      summary: `${source.name} was saved to Company Knowledge.`,
      destination: "Company Knowledge",
      status: "success"
    });
    setSourceName("");
    setSourceUrls("");
    setSourceContent("");
    setSourceNotes("");
  }

  function addClaim() {
    const text = claimText.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const claim: ClaimLibraryItem = {
      id: `claim-${Date.now()}`,
      claimText: text,
      claimType,
      sourceType: "manual entry",
      notes: "",
      riskLevel: claimType === "Do not say" || claimType === "Internal only" ? "High" : claimType === "Needs review" ? "Medium" : "Low",
      reviewedAt: claimType === "Approved claim" || claimType === "Proof-backed" ? now : undefined,
      metadata: {},
      createdAt: now,
      updatedAt: now
    };
    setClaimLibrary((current) => [claim, ...current]);
    persistClaimLibraryItem(claim);
    recordActivity({
      actionType: "Claim added",
      objectType: "Claim",
      objectId: claim.id,
      title: "Claim added",
      summary: claim.claimText,
      destination: "Claim Library",
      status: "success"
    });
    setClaimText("");
  }

  function startPostFromSource(source: LibrarySource) {
    setCampaignName(source.name);
    setContentAngle("Industry POV");
    setIntent(`Turn this Company Knowledge source into a practical Conduit social post: ${source.name}`);
    setIdea([source.content, source.notes, source.urls].filter(Boolean).join("\n\n"));
    setSelectedLibrarySourceIds([source.id]);
    const conduitProfile = profiles.find((profile) => profile.name.toLowerCase().includes("conduit"));
    if (conduitProfile) setSelectedProfileId(conduitProfile.id);
    setScreen("New Campaign");
  }

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Company Knowledge / Conduit Brain</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Truth layer</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Company Knowledge stores facts, proof points, themes, claims, and guardrails. Generation can use these sources, while inspiration and profiles only guide style.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <BriefItem label="Active sources" value={activeSources.length} />
          <BriefItem label="Approved posts" value={approvedPosts.length} />
          <BriefItem label="Approved claims" value={approvedClaims.length} />
          <BriefItem label="Risky claims" value={riskyClaims.length} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h3 className="text-lg font-bold">Knowledge sources</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add or select source-of-truth material for future posts.</p>
            </div>
            <Pill>{storageMode === "supabase" ? "Shared workspace" : "Local mode"}</Pill>
          </div>
          <div className="mt-4 grid gap-3">
            {librarySources.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-muted-foreground">
                Add a website, transcript, product note, customer story, or proof point to start feeding the Conduit Brain.
              </div>
            ) : (
              librarySources.map((source) => (
                <div key={source.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Pill>{source.category}</Pill>
                        <Pill>{source.reviewStatus ?? "Needs review"}</Pill>
                        {selectedLibrarySourceIds.includes(source.id) && <Pill>Selected</Pill>}
                      </div>
                      <h4 className="mt-2 font-bold">{getLibrarySourceDisplayName(source)}</h4>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {source.content || source.notes || source.urls || "No source body saved yet."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleSource(source.id)}>
                        {selectedLibrarySourceIds.includes(source.id) ? "Unselect" : "Use in post"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => startPostFromSource(source)}>
                        Create post
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removeLibrarySource(source.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-bold">Add source</h3>
          <div className="mt-4 grid gap-3">
            <FieldLabel label="Source title">
              <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input px-3 text-sm" placeholder="Factory automation positioning notes" />
            </FieldLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel label="Type">
                <select value={sourceCategory} onChange={(event) => setSourceCategory(event.target.value as LibrarySourceCategory)} className="mt-2 h-10 w-full rounded-md border border-input px-3 text-sm">
                  {librarySourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="Platform">
                <select value={sourcePlatform} onChange={(event) => setSourcePlatform(event.target.value as LibrarySourcePlatform)} className="mt-2 h-10 w-full rounded-md border border-input px-3 text-sm">
                  {librarySourcePlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </FieldLabel>
            </div>
            <FieldLabel label="URL or source reference">
              <input value={sourceUrls} onChange={(event) => setSourceUrls(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input px-3 text-sm" />
            </FieldLabel>
            <FieldLabel label="Facts / notes">
              <textarea value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} className="mt-2 min-h-28 w-full rounded-md border border-input p-3 text-sm" />
            </FieldLabel>
            <FieldLabel label="Internal notes">
              <textarea value={sourceNotes} onChange={(event) => setSourceNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded-md border border-input p-3 text-sm" />
            </FieldLabel>
            <Button onClick={addSource} disabled={!sourceName.trim() && !sourceContent.trim() && !sourceUrls.trim()}>
              <Plus size={16} /> Save to Company Knowledge
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Claim Library</h3>
            <p className="mt-1 text-sm text-muted-foreground">Approved claims can be reused. Needs-review and do-not-say claims help Brand Safety catch risky copy.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_140px]">
          <input value={claimText} onChange={(event) => setClaimText(event.target.value)} className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Add a claim Conduit can or cannot say" />
          <select value={claimType} onChange={(event) => setClaimType(event.target.value as ClaimType)} className="h-10 rounded-md border border-input px-3 text-sm">
            {(["Approved claim", "Needs review", "Do not say", "Customer-sensitive", "Proof-backed", "Internal only"] as ClaimType[]).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <Button onClick={addClaim}>Add claim</Button>
        </div>
        <div className="mt-4 grid gap-3">
          {claimLibrary.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-muted-foreground">
              No claims saved yet. Add approved, needs-review, and do-not-say claims to improve generation and safety checks.
            </div>
          ) : (
            claimLibrary.slice(0, 12).map((claim) => (
              <div key={claim.id} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Pill>{claim.claimType}</Pill>
                    <Pill>Risk: {claim.riskLevel}</Pill>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{claim.claimText}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const next = { ...claim, claimType: "Approved claim" as ClaimType, riskLevel: "Low" as ClaimRiskLevel, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                    setClaimLibrary((current) => current.map((item) => item.id === claim.id ? next : item));
                    persistClaimLibraryItem(next);
                  }}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const next = { ...claim, claimType: "Needs review" as ClaimType, riskLevel: "Medium" as ClaimRiskLevel, updatedAt: new Date().toISOString() };
                    setClaimLibrary((current) => current.map((item) => item.id === claim.id ? next : item));
                    persistClaimLibraryItem(next);
                  }}>Needs review</Button>
                  <Button size="sm" variant="danger" onClick={() => removeClaimLibraryItem(claim.id)}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <LayerBlock title="Brain summary" description={brandVoice.tone || brandVoice.style || "Brand Voice Rules and Company Knowledge are active."} />
        <LayerBlock title="Profiles connected" description={`${profiles.length} profiles can guide voice and inspiration.`} />
        <LayerBlock title="Imported patterns" description={`${inspirationPatterns.length} legacy inspiration signals available as pattern-only context.`} />
      </div>
    </div>
  );
}

function NewCampaign(props: {
  campaignName: string;
  setCampaignName: (value: string) => void;
  campaignTemplate: CampaignTemplate;
  setCampaignTemplate: (value: CampaignTemplate) => void;
  contentAngle: ContentAngle | "";
  setContentAngle: (value: ContentAngle | "") => void;
  simpleStyleChips: SimpleStyleChip[];
  setSimpleStyleChips: (items: SimpleStyleChip[] | ((current: SimpleStyleChip[]) => SimpleStyleChip[])) => void;
  intent: string;
  setIntent: (value: string) => void;
  useApprovedPosts: boolean;
  setUseApprovedPosts: (value: boolean) => void;
  idea: string;
  setIdea: (value: string) => void;
  mediaContext: CampaignMediaContext;
  setMediaContext: (value: CampaignMediaContext) => void;
  mediaPreviewUrl: string;
  mediaAssets: MediaAsset[];
  selectedMediaAssetId: string;
  applyMediaAsset: (asset: MediaAsset) => void;
  handleMediaFile: (file: File) => void;
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
  setSelectedLibrarySourceIds: (ids: string[] | ((current: string[]) => string[])) => void;
  generationError: string;
  generationNotice: string;
  isGenerating: boolean;
  handleGenerate: () => Promise<void>;
  handleCreateManualDraft: (input: {
    sharedContent: string;
    platformContent: Partial<Record<Platform, string>>;
    platformSpecific: boolean;
  }) => void;
  handleMockFallback: () => void;
  createDefaultConduitProfile: () => void;
  campaignComplete: boolean;
}) {
  const {
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
    mediaPreviewUrl,
    mediaAssets,
    selectedMediaAssetId,
    applyMediaAsset,
    handleMediaFile,
    clearMedia,
    brandVoice,
    selectedPlatforms,
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
    handleCreateManualDraft,
    handleMockFallback,
    createDefaultConduitProfile,
    campaignComplete
  } = props;
  const [manualDraft, setManualDraft] = useState("");
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const conduitProfile = profiles.find((profile) => profile.name.toLowerCase().includes("conduit"));

  function toggleStyle(style: SimpleStyleChip) {
    setSimpleStyleChips((current) =>
      current.includes(style) ? current.filter((item) => item !== style) : [...current, style]
    );
  }

  function toggleLibrarySource(id: string) {
    setSelectedLibrarySourceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Create Post</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Build a Content Brief</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Turn a clear idea, source, opportunity, or media asset into platform-native drafts. Company Knowledge stays the truth layer.
        </p>
        {campaignComplete && (
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            Previous brief is complete. This form is ready for a clean new post.
          </div>
        )}
        {!selectedProfile && (
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center">
            <p className="text-sm font-semibold text-amber-900">Create or load a Conduit profile before generating production posts.</p>
            <Button size="sm" variant="secondary" onClick={createDefaultConduitProfile}>Create Conduit profile</Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 1 · Main idea</p>
        <div className="mt-4 grid gap-4">
          <FieldLabel label="Brief title">
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 text-sm" placeholder="Factory-floor deployment update" />
          </FieldLabel>
          <FieldLabel label="What should this post communicate?">
            <textarea value={idea} onChange={(event) => setIdea(event.target.value)} className="mt-2 min-h-32 w-full rounded-md border border-input p-3 text-sm" placeholder="Write the raw idea, source context, or point of view..." />
          </FieldLabel>
          <FieldLabel label="Intent">
            <textarea value={intent} onChange={(event) => setIntent(event.target.value)} className="mt-2 min-h-20 w-full rounded-md border border-input p-3 text-sm" placeholder="What should the audience understand or do?" />
          </FieldLabel>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 2 · Posting account / voice</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <FieldLabel label="Posting account">
            <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 text-sm">
              <option value="">Select profile</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.type}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Template">
            <select value={campaignTemplate} onChange={(event) => setCampaignTemplate(event.target.value as CampaignTemplate)} className="mt-2 h-11 w-full rounded-md border border-input px-3 text-sm">
              {Object.keys(campaignTemplateConfigs).map((template) => <option key={template} value={template}>{template}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Content angle">
            <select value={contentAngle} onChange={(event) => setContentAngle(event.target.value as ContentAngle | "")} className="mt-2 h-11 w-full rounded-md border border-input px-3 text-sm">
              <option value="">Auto</option>
              {(["Founder build-in-public", "Deployment win", "Company update", "Customer proof", "Product launch", "Behind the scenes", "Industry POV", "Technical explanation", "Recruiting", "Event recap", "Other"] as ContentAngle[]).map((angle) => <option key={angle} value={angle}>{angle}</option>)}
            </select>
          </FieldLabel>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {simpleStyleOptions.map((style) => (
            <button
              key={style.label}
              type="button"
              onClick={() => toggleStyle(style.label)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-bold",
                simpleStyleChips.includes(style.label) ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600"
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <FieldLabel label="Internal voice influences">
            <select
              multiple
              value={selectedVoiceInfluenceIds}
              onChange={(event) => setSelectedVoiceInfluenceIds(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}
              className="mt-2 min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              {profiles.filter((profile) => profile.type !== "Inspiration / Reference" && profile.type !== "Competitor / Market Watch").map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Pattern-only inspiration">
            <select
              multiple
              value={selectedInspirationProfileIds}
              onChange={(event) => setSelectedInspirationProfileIds(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}
              className="mt-2 min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              {profiles.filter((profile) => profile.type === "Inspiration / Reference" || profile.type === "Competitor / Market Watch").map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </FieldLabel>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {selectedProfile
            ? `Posting as ${selectedProfile.name}. ${selectedProfile.personality.voiceTraits ? `Voice learned: ${selectedProfile.personality.voiceTraits}` : "No analyzed voice summary yet."}`
            : conduitProfile
              ? "Select the Conduit profile to use its saved voice."
              : "No Conduit profile yet. Create one before production generation."}
        </p>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 3 · Optional source, media, or context</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <h3 className="font-bold">Company Knowledge</h3>
            <p className="mt-1 text-sm text-muted-foreground">Select specific sources or leave empty to use all active Company Knowledge.</p>
            <div className="mt-3 grid max-h-64 gap-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
              {librarySources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Company Knowledge sources yet.</p>
              ) : (
                librarySources.map((source) => (
                  <label key={source.id} className="flex items-start gap-2 rounded-md bg-white p-2 text-sm">
                    <input type="checkbox" checked={selectedLibrarySourceIds.includes(source.id)} onChange={() => toggleLibrarySource(source.id)} className="mt-1" />
                    <span>
                      <span className="font-semibold">{getLibrarySourceDisplayName(source)}</span>
                      <span className="block text-xs text-muted-foreground">{source.category} · {source.reviewStatus ?? "Needs review"}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="font-bold">Media</h3>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {mediaPreviewUrl ? (
                <div className="space-y-3">
                  <img src={mediaPreviewUrl} alt={mediaContext.filename || "Selected media"} className="max-h-64 w-full rounded-md object-contain" />
                  <p className="text-sm font-semibold">{mediaContext.assetName || mediaContext.filename}</p>
                  <Button size="sm" variant="secondary" onClick={clearMedia}>Remove media</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Attach media to ground captions in what is visible.</p>
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleMediaFile(file);
                    }}
                    className="text-sm"
                  />
                  {mediaAssets.length > 0 && (
                    <select
                      value={selectedMediaAssetId}
                      onChange={(event) => {
                        const asset = mediaAssets.find((item) => item.id === event.target.value);
                        if (asset) applyMediaAsset(asset);
                      }}
                      className="h-10 w-full rounded-md border border-input px-3 text-sm"
                    >
                      <option value="">Select from Media Library</option>
                      {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={useApprovedPosts} onChange={(event) => setUseApprovedPosts(event.target.checked)} />
          Use approved examples and Feedback Memory when available
        </label>
        <p className="mt-2 text-sm text-muted-foreground">{brandVoice.tone || brandVoice.style || "Brand Voice Rules are active for generated posts."}</p>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 4 · Platforms</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {platforms.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => togglePlatform(platform)}
              className={cn(
                "rounded-lg border px-4 py-5 text-left font-bold transition",
                selectedPlatforms.includes(platform) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-950"
              )}
            >
              {platform}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 5 · Generate</p>
            <h3 className="mt-1 text-lg font-bold">Ready when the brief is clear.</h3>
            <p className="mt-1 text-sm text-muted-foreground">If OpenAI is unavailable, use mock fallback to keep reviewing the workflow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => handleCreateManualDraft({
                sharedContent: manualDraft,
                platformContent: {},
                platformSpecific: false
              })}
              disabled={!manualDraft.trim()}
            >
              Save manual draft
            </Button>
            <Button variant="secondary" onClick={handleMockFallback} disabled={isGenerating}>Use mock fallback</Button>
            <Button onClick={() => void handleGenerate()} disabled={isGenerating}>
              <Sparkles size={16} /> {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
        <textarea
          value={manualDraft}
          onChange={(event) => setManualDraft(event.target.value)}
          className="mt-4 min-h-24 w-full rounded-md border border-input p-3 text-sm"
          placeholder="Optional: paste a manual draft here, then save it to Review Drafts."
        />
        {generationError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {generationError}
          </div>
        )}
        {generationNotice && (
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
            {generationNotice}
          </div>
        )}
      </Card>
    </div>
  );
}




function OpportunityInbox({
  opportunities,
  setOpportunities,
  persistOpportunity,
  profiles,
  setProfiles,
  persistProfile,
  librarySources,
  setLibrarySources,
  persistLibrarySource,
  brandVoice,
  queueApprovedReply,
  setCampaignName,
  setIntent,
  setIdea,
  setSelectedPlatforms,
  setSelectedProfileId,
  setActiveOpportunityContext,
  setScreen,
  recordActivity
}: {
  opportunities: Opportunity[];
  setOpportunities: (items: Opportunity[] | ((current: Opportunity[]) => Opportunity[])) => void;
  persistOpportunity: (opportunity: Opportunity) => void;
  profiles: Profile[];
  setProfiles: (items: Profile[] | ((current: Profile[]) => Profile[])) => void;
  persistProfile: (profile: Profile) => void;
  librarySources: LibrarySource[];
  setLibrarySources: (items: LibrarySource[] | ((current: LibrarySource[]) => LibrarySource[])) => void;
  persistLibrarySource: (source: LibrarySource) => void;
  brandVoice: BrandVoiceProfile;
  queueApprovedReply: (opportunity: Opportunity, reply: OpportunityReplyDraft, approvedReply: string, profile?: Profile) => PostQueueItem;
  setCampaignName: (value: string) => void;
  setIntent: (value: string) => void;
  setIdea: (value: string) => void;
  setSelectedPlatforms: (platforms: Platform[]) => void;
  setSelectedProfileId: (id: string) => void;
  setActiveOpportunityContext: (context: { id: string; title: string } | null) => void;
  setScreen: (screen: Screen) => void;
  recordActivity: (input: Omit<ActivityLogItem, "id" | "createdAt" | "userEmail" | "workspaceName">) => ActivityLogItem;
}) {
  const [title, setTitle] = useState("");
  const [opportunityType, setOpportunityType] = useState<OpportunityType>("Trend");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [notes, setNotes] = useState("");
  const [platform, setPlatform] = useState<OpportunityPlatform>("X");
  const [urgency, setUrgency] = useState<OpportunityUrgency>("Medium");
  const [status, setStatus] = useState<OpportunityStatus>("New");
  const [tags, setTags] = useState("");
  const [screenshot, setScreenshot] = useState<Opportunity["screenshot"]>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<OpportunityType | "All">("All");
  const [platformFilter, setPlatformFilter] = useState<OpportunityPlatform | "All">("All");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "All">("All");
  const [urgencyFilter, setUrgencyFilter] = useState<OpportunityUrgency | "All">("All");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [replyOpportunityId, setReplyOpportunityId] = useState("");
  const [replyContext, setReplyContext] = useState("");
  const [replyProfileId, setReplyProfileId] = useState("");
  const [isDraftingReply, setIsDraftingReply] = useState(false);
  const [copyState, setCopyState] = useState("");
  const selectedOpportunity = opportunities.find((item) => item.id === selectedOpportunityId);
  const replyOpportunity = opportunities.find((item) => item.id === replyOpportunityId);
  const defaultReplyProfile = findDefaultPostingAccount(profiles);
  const activeReplyProfileId = replyProfileId || defaultReplyProfile?.id || profiles[0]?.id || "";

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const matchesType = typeFilter === "All" || opportunity.opportunityType === typeFilter;
    const matchesPlatform = platformFilter === "All" || opportunity.platform === platformFilter;
    const matchesStatus = statusFilter === "All" || opportunity.status === statusFilter;
    const matchesUrgency = urgencyFilter === "All" || opportunity.urgency === urgencyFilter;
    const matchesTag = !tagFilter.trim() || opportunity.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    return matchesType && matchesPlatform && matchesStatus && matchesUrgency && matchesTag;
  });

  function clearForm() {
    setTitle("");
    setOpportunityType("Trend");
    setSourceUrl("");
    setPastedText("");
    setNotes("");
    setPlatform("X");
    setUrgency("Medium");
    setStatus("New");
    setTags("");
    setScreenshot(undefined);
    setMessage("");
    setError("");
  }

  async function handleScreenshot(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Upload an image screenshot.");
      return;
    }
    setScreenshot({
      filename: file.name,
      fileType: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file)
    });
  }

  function saveOpportunity(next: Opportunity) {
    setOpportunities((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    persistOpportunity(next);
  }

  async function analyzeOpportunity(base?: Opportunity) {
    setIsAnalyzing(true);
    setMessage("");
    setError("");
    const working = base ?? {
      id: `opp-${Date.now()}`,
      title: title.trim() || "Untitled opportunity",
      opportunityType,
      sourceUrl: sourceUrl.trim(),
      platform,
      pastedText: pastedText.trim(),
      screenshot,
      urgency,
      status,
      tags: splitTags(tags),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } satisfies Opportunity;

    try {
      const response = await fetch("/api/opportunities/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: working.title,
          opportunityType: working.opportunityType,
          sourceUrl: working.sourceUrl,
          platform: working.platform,
          pastedText: working.pastedText,
          notes: working.notes,
          tags: working.tags
        })
      });
      const payload = await readJsonResponse(response, "Opportunity analysis failed");
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Opportunity analysis failed.");
      }
      const next = {
        ...working,
        analysis: payload.analysis as OpportunityAnalysis,
        status: working.status === "New" ? "Reviewed" as const : working.status,
        updatedAt: new Date().toISOString()
      };
      saveOpportunity(next);
      recordActivity({
        actionType: "Opportunity analyzed",
        objectType: "Opportunity",
        objectId: next.id,
        title: "Opportunity analyzed",
        summary: `${next.title} now has a suggested Conduit angle and next action.`,
        destination: "Opportunity Inbox",
        status: "success"
      });
      setSelectedOpportunityId(next.id);
      setMessage(payload.generatedBy === "AI" ? "Opportunity analyzed." : "Opportunity analyzed with fallback logic.");
      if (!base) clearForm();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Opportunity analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function createOpportunity() {
    setMessage("");
    setError("");
    if (!title.trim() && !sourceUrl.trim() && !pastedText.trim() && !notes.trim()) {
      setError("Add a title, link, note, or pasted text first.");
      return;
    }
    const next: Opportunity = {
      id: `opp-${Date.now()}`,
      title: title.trim() || sourceUrl.trim() || "Untitled opportunity",
      opportunityType,
      sourceUrl: sourceUrl.trim(),
      platform,
      pastedText: pastedText.trim(),
      screenshot,
      urgency,
      status,
      tags: splitTags(tags),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveOpportunity(next);
    setSelectedOpportunityId(next.id);
    setMessage("Opportunity saved.");
    recordActivity({
      actionType: "Opportunity created",
      objectType: "Opportunity",
      objectId: next.id,
      title: "Opportunity created",
      summary: `${next.title} was added to Opportunity Inbox.`,
      destination: "Opportunity Inbox",
      status: "success"
    });
    clearForm();
  }

  function updateOpportunity(opportunity: Opportunity, updates: Partial<Opportunity>) {
    const next = { ...opportunity, ...updates, updatedAt: new Date().toISOString() };
    setOpportunities((current) => current.map((item) => item.id === next.id ? next : item));
    persistOpportunity(next);
    if (updates.status === "Archived" && opportunity.status !== "Archived") {
      recordActivity({
        actionType: "Item archived",
        objectType: "Opportunity",
        objectId: next.id,
        title: "Opportunity archived",
        summary: `${next.title} was archived.`,
        destination: "Opportunity Inbox",
        status: "success",
        undo: {
          type: "opportunity-status",
          label: "Restore opportunity",
          payload: { id: opportunity.id, status: opportunity.status }
        }
      });
    }
  }

  function openReplyFlow(opportunity: Opportunity) {
    setReplyOpportunityId(opportunity.id);
    setReplyContext(opportunity.pastedText || opportunity.notes || opportunity.analysis?.suggestedFirstDraftIdea || "");
    setReplyProfileId(defaultReplyProfile?.id || profiles[0]?.id || "");
    setMessage("");
    setError("");
  }

  async function draftReply(opportunity: Opportunity, options: {
    instruction?: string;
    contextOverride?: string;
    existingReply?: string;
  } = {}) {
    setIsDraftingReply(true);
    setMessage("");
    setError("");
    try {
      const profile = profiles.find((item) => item.id === activeReplyProfileId) || defaultReplyProfile;
      const activeKnowledge = librarySources
        .filter((source) => source.reviewStatus !== "Save only")
        .slice(0, 6)
        .map((source) => ({
          name: source.name,
          content: source.content?.slice(0, 1400),
          notes: source.notes,
          proofPoints: source.analysis?.proofPoints
        }));
      const response = await fetch("/api/opportunities/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opportunity.title,
          opportunityType: opportunity.opportunityType,
          platform: opportunity.platform,
          sourceUrl: opportunity.sourceUrl,
          pastedText: options.contextOverride || replyContext || opportunity.pastedText,
          notes: opportunity.notes,
          analysis: opportunity.analysis,
          instruction: options.instruction,
          existingReply: options.existingReply,
          companyKnowledge: activeKnowledge,
          brandVoiceRules: {
            tone: brandVoice.tone,
            style: brandVoice.style,
            audience: brandVoice.audience,
            avoid: brandVoice.avoid
          },
          postingAccount: profile
            ? {
                name: profile.name,
                type: profile.type,
                role: profile.role,
                bio: profile.bio,
                notes: profile.notes
              }
            : undefined
        })
      });
      const payload = await readJsonResponse(response, "Reply draft failed");
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Reply draft failed.");
      }
      const now = new Date().toISOString();
      const draft = {
        id: `reply-${Date.now()}`,
        ...(payload.replyDraft as Omit<OpportunityReplyDraft, "id" | "status" | "createdAt" | "updatedAt">),
        status: "Draft",
        createdAt: now,
        updatedAt: now
      } satisfies OpportunityReplyDraft;
      const next = {
        ...opportunity,
        status: "Reply drafted" as const,
        replyDrafts: [draft, ...(opportunity.replyDrafts ?? [])],
        updatedAt: now
      };
      saveOpportunity(next);
      recordActivity({
        actionType: "Reply drafted",
        objectType: "Reply",
        objectId: draft.id,
        title: "Reply drafted",
        summary: `${opportunity.title} has reply options ready for review.`,
        destination: "Opportunity Inbox",
        status: "success"
      });
      setSelectedOpportunityId(next.id);
      setReplyOpportunityId(next.id);
      setMessage(options.instruction
        ? payload.generatedBy === "AI" ? "Reply regenerated." : "Reply regenerated with fallback logic."
        : payload.generatedBy === "AI" ? "Reply drafted." : "Reply drafted with fallback logic.");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Reply draft failed.");
    } finally {
      setIsDraftingReply(false);
    }
  }

  async function copyReply(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(id);
      window.setTimeout(() => setCopyState(""), 1200);
    } catch {
      setCopyState("");
    }
  }

  function approveReply(opportunity: Opportunity, reply: OpportunityReplyDraft, selectedKey: OpportunityReplyDraft["selectedReply"] = "shortReply") {
    const approvedReply = reply[selectedKey || "shortReply"] || reply.shortReply;
    const profile = profiles.find((item) => item.id === activeReplyProfileId) || defaultReplyProfile;
    const nextReply: OpportunityReplyDraft = {
      ...reply,
      selectedReply: selectedKey,
      approvedReply,
      review: {
        ...(reply.review ?? {}),
        status: "Ready to Reply",
        reviewerName: reply.review?.reviewerName || profile?.name || "Conduit / team",
        reviewedAt: new Date().toISOString()
      },
      status: "Approved",
      updatedAt: new Date().toISOString()
    };
    const next = {
      ...opportunity,
      status: "Reviewed" as const,
      replyDrafts: (opportunity.replyDrafts ?? []).map((item) => item.id === reply.id ? nextReply : item),
      relatedPostIds: uniqueStrings([...(opportunity.relatedPostIds ?? []), nextReply.id]),
      updatedAt: new Date().toISOString()
    };
    saveOpportunity(next);
    queueApprovedReply(next, nextReply, approvedReply, profile);
    setMessage("Reply approved and added to Ready to Reply.");
  }

  function updateReplyReview(opportunity: Opportunity, reply: OpportunityReplyDraft, review: ReviewMetadata) {
    const nextReply: OpportunityReplyDraft = {
      ...reply,
      review,
      updatedAt: new Date().toISOString()
    };
    const next = {
      ...opportunity,
      status:
        review.status === "Needs review"
          ? "Reviewed" as const
          : review.status === "Changes requested"
            ? "Reply drafted" as const
            : opportunity.status,
      replyDrafts: (opportunity.replyDrafts ?? []).map((item) =>
        item.id === reply.id ? nextReply : item
      ),
      updatedAt: new Date().toISOString()
    };
    saveOpportunity(next);
    setMessage(
      review.status === "Needs review"
        ? `Reply sent to ${review.reviewerName || "review"}.`
        : review.status === "Changes requested"
          ? "Reply changes requested."
          : "Reply review updated."
    );
  }

  function archiveReply(opportunity: Opportunity, reply: OpportunityReplyDraft) {
    const nextReply: OpportunityReplyDraft = {
      ...reply,
      status: "Archived",
      updatedAt: new Date().toISOString()
    };
    const remainingActiveDrafts = (opportunity.replyDrafts ?? []).some((item) => item.id !== reply.id && item.status === "Draft");
    const next = {
      ...opportunity,
      status: remainingActiveDrafts ? opportunity.status : "Archived" as const,
      replyDrafts: (opportunity.replyDrafts ?? []).map((item) => item.id === reply.id ? nextReply : item),
      updatedAt: new Date().toISOString()
    };
    saveOpportunity(next);
    setMessage("Reply archived.");
  }

  function createPostFromOpportunity(opportunity: Opportunity, reply = false) {
    const draftIdea = opportunity.analysis?.suggestedFirstDraftIdea || opportunity.pastedText || opportunity.notes || opportunity.sourceUrl || opportunity.title;
    const suggestedPlatforms: Platform[] = opportunity.analysis?.suggestedPlatforms?.length
      ? opportunity.analysis.suggestedPlatforms
      : opportunity.platform !== "Website" && opportunity.platform !== "Other"
        ? [opportunity.platform as Platform]
        : ["LinkedIn"];
    const conduit = findDefaultPostingAccount(profiles);
    if (conduit) setSelectedProfileId(conduit.id);
    setCampaignName(`${reply ? "Reply" : "Opportunity"}: ${opportunity.title}`.slice(0, 80));
    setIntent(reply
      ? `Draft a short reply for this opportunity: ${opportunity.title}`
      : opportunity.analysis?.suggestedConduitAngle || `Create a Conduit post from this opportunity: ${opportunity.title}`);
    setIdea(draftIdea);
    setSelectedPlatforms(suggestedPlatforms);
    setActiveOpportunityContext({ id: opportunity.id, title: opportunity.title });
    updateOpportunity(opportunity, { status: reply ? "Reply drafted" : "Post drafted" });
    setScreen("New Campaign");
  }

  function saveToCompanyKnowledge(opportunity: Opportunity) {
    const source: LibrarySource = {
      id: `source-${Date.now()}`,
      name: `Opportunity - ${opportunity.title}`,
      category: opportunity.opportunityType === "Customer story" ? "Customer Story" : "Other",
      platform: opportunity.platform === "Website" ? "Website" : "Mixed",
      urls: opportunity.sourceUrl,
      urlType: opportunity.sourceUrl ? "Website URL" : "Other",
      content: [opportunity.pastedText, opportunity.notes, opportunity.analysis?.whyItMatters, opportunity.analysis?.suggestedConduitAngle].filter(Boolean).join("\n\n"),
      syncStatus: "Manual Only",
      lastChecked: currentCheckedAt(),
      notes: "Saved from Opportunity Inbox.",
      analysis: {
        voiceTraits: "Opportunity context.",
        commonTopics: opportunity.analysis?.relevantBrainThemes?.join(", ") || opportunity.opportunityType,
        repeatedPhrases: "Review before using as public proof.",
        strongHooks: opportunity.analysis?.suggestedFirstDraftIdea || "Lead with the concrete opportunity.",
        proofPoints: "Only use claims supported by Company Knowledge.",
        avoid: opportunity.analysis?.riskNotes || "Avoid unsupported claims.",
        bestUseCases: "Content ideas, replies, and social planning."
      },
      reviewStatus: "Needs review",
      tags: opportunity.tags,
      updatedAt: currentCheckedAt()
    };
    setLibrarySources((current) => [source, ...current]);
    persistLibrarySource(source);
    setMessage("Saved to Company Knowledge for review.");
  }

  function saveAsInspirationProfile(opportunity: Opportunity) {
    const profile: Profile = {
      ...defaultConduitProfile(),
      id: `profile-${Date.now()}`,
      name: opportunity.title,
      type: opportunity.opportunityType === "Competitor post" ? "Competitor / Market Watch" : "Inspiration / Reference",
      role: opportunity.opportunityType,
      bio: opportunity.analysis?.whyItMatters || opportunity.notes,
      linkedInUrl: opportunity.platform === "LinkedIn" ? opportunity.sourceUrl : "",
      xUrl: opportunity.platform === "X" ? opportunity.sourceUrl : "",
      instagramUrl: opportunity.platform === "Instagram" ? opportunity.sourceUrl : "",
      tiktokUrl: opportunity.platform === "TikTok" ? opportunity.sourceUrl : "",
      websiteUrl: opportunity.platform === "Website" ? opportunity.sourceUrl : "",
      examples: opportunity.pastedText,
      notes: "Created from Opportunity Inbox.",
      whatWeLike: opportunity.analysis?.whyItMatters || opportunity.notes,
      patternsToLearn: opportunity.analysis?.suggestedConduitAngle || "",
      thingsNotToCopy: opportunity.analysis?.riskNotes || "Pattern-only. Do not copy wording, identity, facts, or claims.",
      voiceSources: opportunity.sourceUrl ? [{
        id: `profile-source-${Date.now()}`,
        title: opportunity.title,
        sourceKind: opportunity.sourceUrl.includes("/status/") || opportunity.sourceUrl.includes("/posts/") ? "post URL" : "account URL",
        url: opportunity.sourceUrl,
        platform: opportunity.platform === "Website" ? "Website" : opportunity.platform === "Other" ? "Other URL" : opportunity.platform,
        sourceType: opportunity.opportunityType === "Competitor post" ? "competitor/market watch" : "inspiration/reference",
        syncStatus: "stored only",
        lastSynced: "Never",
        notes: opportunity.notes,
        patternOnly: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }] : []
    };
    setProfiles((current) => [profile, ...current]);
    persistProfile(profile);
    setMessage("Saved as a pattern-only profile.");
  }

  const openCounts = {
    new: opportunities.filter((item) => item.status === "New").length,
    high: opportunities.filter((item) => item.urgency === "High" && item.status !== "Archived" && item.status !== "Posted").length,
    drafted: opportunities.filter((item) => item.status === "Drafted" || item.status === "Reply drafted" || item.status === "Post drafted").length
  };

  function opportunityNextStep(opportunity: Opportunity) {
    if (opportunity.status === "New") return "Next: analyze it, draft a reply, or create a post.";
    if (opportunity.status === "Reviewed") return opportunity.analysis?.recommendation === "Reply"
      ? "Next: draft a reply or create a post from the angle."
      : "Next: create a post, save it as reference, or archive it.";
    if (opportunity.status === "Reply drafted") return "Next: approve a reply, then view it in Ready to Reply.";
    if (opportunity.status === "Post drafted") return "Next: review the generated draft, approve it, then queue it.";
    if (opportunity.status === "Queued") return "Next: publish manually from Ready to Post.";
    if (opportunity.status === "Posted") return "Complete: add metrics in Analytics or Content Library.";
    return "Archived: kept for history.";
  }

  const opportunityFlowSteps = [
    "New opportunity",
    "Analyze",
    "Draft reply",
    "Create post",
    "Queue/post",
    "Archive"
  ];

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Opportunity Inbox</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Capture trends, mentions, replies, competitor posts, news, customer moments, and founder thoughts. Turn them into posts, replies, or reference material.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Intake = feed the brain · Opportunity Inbox = act on the world
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill>{openCounts.new} new</Pill>
            <Pill>{openCounts.high} high urgency</Pill>
            <Pill>{openCounts.drafted} drafted</Pill>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-6">
          {opportunityFlowSteps.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
              <p className="mt-1 text-sm font-bold">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Title" htmlFor="opportunity-title" />
            <input id="opportunity-title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Customer shoutout, competitor post, robotics trend..." />
          </div>
          <div>
            <FieldLabel label="Opportunity type" htmlFor="opportunity-type" />
            <select id="opportunity-type" value={opportunityType} onChange={(event) => setOpportunityType(event.target.value as OpportunityType)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
              {opportunityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel label="Source URL" htmlFor="opportunity-url" />
            <input id="opportunity-url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="https://..." />
          </div>
          <div>
            <FieldLabel label="Related platform" htmlFor="opportunity-platform" />
            <select id="opportunity-platform" value={platform} onChange={(event) => setPlatform(event.target.value as OpportunityPlatform)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
              {opportunityPlatforms.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Pasted text / note" htmlFor="opportunity-text" />
            <textarea id="opportunity-text" value={pastedText} onChange={(event) => setPastedText(event.target.value)} className="mt-2 min-h-28 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="Paste the post, reply, article excerpt, customer note, or sales context." />
          </div>
          <div>
            <FieldLabel label="Screenshot" htmlFor="opportunity-screenshot" />
            <input id="opportunity-screenshot" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => handleScreenshot(event.target.files?.[0])} className="mt-2 block w-full text-sm text-muted-foreground" />
            {screenshot && <p className="mt-2 text-sm font-semibold text-muted-foreground">{screenshot.filename}</p>}
          </div>
          <div>
            <FieldLabel label="Tags" htmlFor="opportunity-tags" />
            <input id="opportunity-tags" value={tags} onChange={(event) => setTags(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="robotics, labor gap, reply" />
          </div>
          <div>
            <FieldLabel label="Urgency" htmlFor="opportunity-urgency" />
            <select id="opportunity-urgency" value={urgency} onChange={(event) => setUrgency(event.target.value as OpportunityUrgency)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
              {opportunityUrgencies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel label="Status" htmlFor="opportunity-status" />
            <select id="opportunity-status" value={status} onChange={(event) => setStatus(event.target.value as OpportunityStatus)} className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
              {opportunityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Notes" htmlFor="opportunity-notes" />
            <input id="opportunity-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Why did this catch your eye?" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Save the signal first, then decide whether it becomes a post, reply, reference, or archive item.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={createOpportunity}>Save opportunity</Button>
            <Button onClick={() => analyzeOpportunity()} disabled={isAnalyzing || (!title.trim() && !sourceUrl.trim() && !pastedText.trim() && !notes.trim())}>
              <Sparkles size={16} /> {isAnalyzing ? "Analyzing..." : "Analyze opportunity"}
            </Button>
          </div>
        </div>
        {message && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-primary">{message}</p>
            {message.includes("Ready to Reply") && (
              <Button size="sm" variant="secondary" onClick={() => setScreen("Ready to Post")}>
                View in Ready to Reply
              </Button>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-lg font-bold">Opportunities</h3>
            <p className="text-sm text-muted-foreground">Filter the manual listening queue and turn the best openings into posts, replies, or reference material.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as OpportunityType | "All")} className="h-10 rounded-md border border-input bg-white px-3 text-sm">
              <option value="All">All types</option>
              {opportunityTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as OpportunityPlatform | "All")} className="h-10 rounded-md border border-input bg-white px-3 text-sm">
              <option value="All">All platforms</option>
              {opportunityPlatforms.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OpportunityStatus | "All")} className="h-10 rounded-md border border-input bg-white px-3 text-sm">
              <option value="All">All statuses</option>
              {opportunityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value as OpportunityUrgency | "All")} className="h-10 rounded-md border border-input bg-white px-3 text-sm">
              <option value="All">All urgency</option>
              {opportunityUrgencies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Tag" />
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {filteredOpportunities.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
              Capture a trend, mention, reply opening, customer note, or article and it will appear here.
            </div>
          ) : filteredOpportunities.map((opportunity) => (
            <div key={opportunity.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <button type="button" onClick={() => setSelectedOpportunityId(opportunity.id)} className="min-w-0 text-left">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{opportunity.opportunityType}</Pill>
                    <Pill>{opportunity.platform}</Pill>
                    <Pill>{opportunity.urgency}</Pill>
                    <Pill>{opportunity.status}</Pill>
                  </div>
                  <p className="mt-2 font-bold">{opportunity.title}</p>
                  {opportunity.sourceUrl && (
                    <p className="mt-1 truncate text-xs font-semibold text-primary">{opportunity.sourceUrl}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {opportunity.analysis?.whyItMatters || opportunity.pastedText || opportunity.notes || "No summary yet."}
                  </p>
                  {opportunity.analysis?.suggestedConduitAngle && (
                    <p className="mt-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">
                      Angle: {opportunity.analysis.suggestedConduitAngle}
                    </p>
                  )}
                  <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    {opportunityNextStep(opportunity)}
                  </p>
                  {opportunity.tags.length > 0 && <p className="mt-2 text-xs font-semibold text-muted-foreground">{opportunity.tags.join(", ")}</p>}
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => analyzeOpportunity(opportunity)} disabled={isAnalyzing}>
                    Analyze
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openReplyFlow(opportunity)}>
                    Draft reply
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => createPostFromOpportunity(opportunity)}>
                    Create post
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => updateOpportunity(opportunity, { status: "Archived" })}>
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {replyOpportunity && (
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Reply drafting</p>
              <h3 className="mt-1 text-xl font-bold">{replyOpportunity.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Draft a reply grounded in Conduit knowledge and brand rules. Nothing posts automatically.
              </p>
            </div>
            <Button variant="ghost" onClick={() => setReplyOpportunityId("")}>Close</Button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <FieldLabel label="Comment, mention, post, question, or shoutout to reply to" htmlFor="reply-context" />
              <textarea
                id="reply-context"
                value={replyContext}
                onChange={(event) => setReplyContext(event.target.value)}
                className="mt-2 min-h-32 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Paste the exact comment, mention, competitor claim, customer shoutout, or question."
              />
            </div>
            <div className="grid gap-3">
              <div>
                <FieldLabel label="Posting account" htmlFor="reply-profile" />
                <select
                  id="reply-profile"
                  value={activeReplyProfileId}
                  onChange={(event) => setReplyProfileId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name} · {profile.type}</option>
                  ))}
                </select>
              </div>
              <AnalysisBlock
                label="Opportunity context"
                value={replyOpportunity.analysis?.suggestedConduitAngle || replyOpportunity.notes || replyOpportunity.sourceUrl || "No analyzed angle yet."}
              />
              <Button onClick={() => draftReply(replyOpportunity)} disabled={isDraftingReply || (!replyContext.trim() && !replyOpportunity.pastedText && !replyOpportunity.notes)}>
                <Sparkles size={16} /> {isDraftingReply ? "Drafting..." : "Draft reply"}
              </Button>
            </div>
          </div>
          {(replyOpportunity.replyDrafts ?? []).length > 0 && (
            <div className="mt-5 grid gap-3">
              {(replyOpportunity.replyDrafts ?? []).map((reply) => (
                <ReplyDraftCard
                  key={reply.id}
                  reply={reply}
                  onCopy={copyReply}
                  onApprove={(selectedKey) => approveReply(replyOpportunity, reply, selectedKey)}
                  onRegenerate={(selectedKey, selectedText) => draftReply(replyOpportunity, {
                    instruction: "Regenerate this reply. Keep it concise, specific, and grounded in Conduit Company Knowledge. Do not copy the original wording.",
                    contextOverride: selectedText || replyContext || replyOpportunity.pastedText || replyOpportunity.notes,
                    existingReply: selectedText
                  })}
                  onMakeMoreConduit={(selectedKey, selectedText) => draftReply(replyOpportunity, {
                    instruction: "Make this reply more Conduit: more direct, more specific to industrial operations, less hypey, less corporate, and safer on claims.",
                    contextOverride: selectedText || replyContext || replyOpportunity.pastedText || replyOpportunity.notes,
                    existingReply: selectedText
                  })}
                  onReviewUpdate={(review) => updateReplyReview(replyOpportunity, reply, review)}
                  onRegenerateFromFeedback={(feedback, selectedText) => draftReply(replyOpportunity, {
                    instruction: `Regenerate this reply from founder/team feedback: ${feedback}`,
                    contextOverride: selectedText || replyContext || replyOpportunity.pastedText || replyOpportunity.notes,
                    existingReply: selectedText
                  })}
                  onArchive={() => archiveReply(replyOpportunity, reply)}
                  copied={copyState === reply.id}
                  isWorking={isDraftingReply}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {selectedOpportunity && (
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Opportunity details</p>
              <h3 className="mt-1 text-xl font-bold">{selectedOpportunity.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Created {formatShortDateTime(selectedOpportunity.createdAt)}</p>
            </div>
            <Button variant="ghost" onClick={() => setSelectedOpportunityId("")}>Close</Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AnalysisBlock label="Overview" value={`${selectedOpportunity.opportunityType} · ${selectedOpportunity.platform} · ${selectedOpportunity.urgency} urgency · ${selectedOpportunity.status}`} />
            <AnalysisBlock label="Source" value={selectedOpportunity.sourceUrl || "No URL saved."} />
            <AnalysisBlock label="AI analysis" value={selectedOpportunity.analysis ? `${selectedOpportunity.analysis.whyItMatters}\n\nAngle: ${selectedOpportunity.analysis.suggestedConduitAngle}\nRecommendation: ${selectedOpportunity.analysis.recommendation}` : "Not analyzed yet."} />
            <AnalysisBlock label="Drafts created" value={selectedOpportunity.relatedCampaignId ? `Content brief: ${selectedOpportunity.relatedCampaignId}` : "No drafts created yet."} />
            <AnalysisBlock label="Related posts" value={(selectedOpportunity.relatedPostIds ?? []).join(", ") || "No related posts yet."} />
            <AnalysisBlock label="Notes" value={selectedOpportunity.notes || selectedOpportunity.pastedText || "No notes saved."} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => createPostFromOpportunity(selectedOpportunity)}>Create post from opportunity</Button>
            <Button variant="secondary" onClick={() => openReplyFlow(selectedOpportunity)}>Draft reply</Button>
            <Button variant="secondary" onClick={() => saveToCompanyKnowledge(selectedOpportunity)}>Save to Company Knowledge</Button>
            <Button variant="secondary" onClick={() => saveAsInspirationProfile(selectedOpportunity)}>Save as Inspiration / Reference</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReplyDraftCard({
  reply,
  onCopy,
  onApprove,
  onRegenerate,
  onMakeMoreConduit,
  onReviewUpdate,
  onRegenerateFromFeedback,
  onArchive,
  isWorking = false,
  copied
}: {
  reply: OpportunityReplyDraft;
  onCopy: (text: string, id: string) => void;
  onApprove: (selectedKey: OpportunityReplyDraft["selectedReply"]) => void;
  onRegenerate: (selectedKey: OpportunityReplyDraft["selectedReply"], selectedText: string) => void;
  onMakeMoreConduit: (selectedKey: OpportunityReplyDraft["selectedReply"], selectedText: string) => void;
  onReviewUpdate: (review: ReviewMetadata) => void;
  onRegenerateFromFeedback: (feedback: string, selectedText: string) => void;
  onArchive: () => void;
  isWorking?: boolean;
  copied: boolean;
}) {
  type ReplyOptionKey = NonNullable<OpportunityReplyDraft["selectedReply"]>;
  const [selectedKey, setSelectedKey] = useState<NonNullable<OpportunityReplyDraft["selectedReply"]>>(
    reply.selectedReply || "shortReply"
  );
  const allOptions: Array<{ key: ReplyOptionKey; label: string; value?: string }> = [
    { key: "shortReply", label: "Short reply", value: reply.shortReply },
    { key: "warmerReply", label: "Slightly warmer", value: reply.warmerReply },
    { key: "founderLedReply", label: "More founder-led", value: reply.founderLedReply },
    { key: "longerReply", label: "Optional longer", value: reply.longerReply }
  ];
  const options = allOptions.filter((item): item is { key: ReplyOptionKey; label: string; value: string } => Boolean(item.value));
  const selectedText = options.find((item) => item.key === selectedKey)?.value || reply.shortReply;
  const replyReview = reviewWithDefault(reply.review, reply.status === "Approved" ? "Approved" : "Draft");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill>{reply.recommendedPlatform}</Pill>
            <Pill>{reply.status}</Pill>
            {reply.brandSafetyNotes.length > 0 ? <Pill>Safety: Needs review</Pill> : <Pill>Safety: Safe</Pill>}
          </div>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Choose a reply option</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onCopy(selectedText, reply.id)}>
            <Clipboard size={14} /> {copied ? "Copied" : "Copy reply"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onRegenerate(selectedKey, selectedText)} disabled={isWorking || reply.status === "Archived"}>
            Regenerate reply
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onMakeMoreConduit(selectedKey, selectedText)} disabled={isWorking || reply.status === "Archived"}>
            Make more Conduit
          </Button>
          <Button size="sm" onClick={() => onApprove(selectedKey)} disabled={reply.status === "Approved" || reply.status === "Archived"}>
            Approve reply
          </Button>
          <Button size="sm" variant="danger" onClick={onArchive} disabled={reply.status === "Archived"}>
            Archive
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedKey(option.key)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm font-bold",
                selectedKey === option.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6">{selectedText}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AnalysisBlock label="Tone notes" value={reply.toneNotes || "No tone notes saved."} />
        <AnalysisBlock
          label="Brand Safety / Claim Check"
          value={reply.brandSafetyNotes.length > 0 ? reply.brandSafetyNotes.join("\n") : "No obvious reply risks found."}
        />
      </div>
      <ReviewWorkflowPanel
        className="mt-4"
        review={replyReview}
        contentKind="Reply"
        onChange={onReviewUpdate}
        onRegenerateFromFeedback={(feedback) => onRegenerateFromFeedback(feedback, selectedText)}
      />
    </div>
  );
}

function PostQueue({
  queue,
  campaigns,
  profiles,
  updateQueueItem,
  deleteQueueItem,
  setScreen,
  mediaPreviewUrl,
  queueDebugMessage,
  storageMode,
  activeCampaign,
  activeCampaignComplete,
  startNewPost,
  repurposeCampaign,
  instagramSandboxConnection,
  recordActivity,
  reviewLinks,
  reviewFeedback,
  resolveManagerFeedback,
  createReviewLink,
  disableReviewLink
}: {
  queue: PostQueueItem[];
  campaigns: Campaign[];
  profiles: Profile[];
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  deleteQueueItem: (id: string) => void;
  setScreen: (screen: Screen) => void;
  mediaPreviewUrl: string;
  queueDebugMessage: string;
  storageMode: StorageMode;
  activeCampaign?: Campaign;
  activeCampaignComplete: boolean;
  startNewPost: () => void;
  repurposeCampaign: (campaign: Campaign) => void;
  instagramSandboxConnection?: SocialConnection;
  recordActivity: (input: Omit<ActivityLogItem, "id" | "createdAt" | "userEmail" | "workspaceName">) => ActivityLogItem;
  reviewLinks: ReviewLink[];
  reviewFeedback: ReviewFeedback[];
  resolveManagerFeedback: (feedbackId: string) => void;
  createReviewLink: (input: {
    scopeType: ReviewLinkScopeType;
    scope: ReviewLink["scope"];
    permissionLevel: ReviewPermissionLevel;
    expiresAt?: string;
  }) => ReviewLink;
  disableReviewLink: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<QueueExecutionTab>("Active");
  const [contentTypeFilter, setContentTypeFilter] = useState<"All" | "Post" | "Reply">("All");
  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [showQueueDebug, setShowQueueDebug] = useState(false);
  const [queueMessage, setQueueMessage] = useState("");

  const visibleQueue = queue.filter((item) => {
    const matchesTab = queueItemMatchesExecutionTab(item, activeTab);
    const matchesContentType = contentTypeFilter === "All" || queueContentType(item) === contentTypeFilter;
    const matchesPlatform = platformFilter === "All" || item.platform === platformFilter;
    const matchesProfile = profileFilter === "All" || item.profileId === profileFilter;
    const matchesCampaign = campaignFilter === "All" || item.campaignId === campaignFilter;
    return matchesTab && matchesContentType && matchesPlatform && matchesProfile && matchesCampaign;
  });

  const tabCounts = queueExecutionTabs.map((tab) => ({
    tab,
    count: queue.filter((item) => queueItemMatchesExecutionTab(item, tab)).length
  }));
  const shareCandidates = visibleQueue.filter((item) => activeTab !== "Archived" && normalizeQueueStatus(item.status) !== "Archived");

  function updateAndMessage(id: string, updates: Partial<PostQueueItem>, message: string) {
    updateQueueItem(id, updates);
    setQueueMessage(message);
  }

  function clearCompletedFromQueue() {
    const completedItems = queue.filter((item) => queueItemMatchesExecutionTab(item, "Completed"));
    completedItems.forEach((item) => updateQueueItem(item.id, { hiddenFromQueue: true }, { silentActivity: true }));
    recordActivity({
      actionType: "Completed queue cleared",
      objectType: "Queue",
      title: "Completed items hidden from queue",
      summary: `${completedItems.length} completed item${completedItems.length === 1 ? "" : "s"} hidden from Ready to Post. Content Library records were kept.`,
      destination: "Ready to Post",
      status: "success",
      undo: {
        type: "queue-clear-completed-restore",
        label: "Undo clear",
        payload: { items: completedItems }
      }
    });
    setQueueMessage("Completed items were hidden from this queue. They remain in Content Library and Analytics.");
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Execution queue</p>
            <h3 className="mt-1 text-2xl font-bold">Ready to Post / Ready to Reply</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Copy, schedule, manually publish, or mark approved posts and replies as done. Completed items stay in Content Library.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setScreen("Review Drafts")}>Review drafts</Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabCounts.map((item) => (
            <Button
              key={item.tab}
              variant={activeTab === item.tab ? "primary" : "secondary"}
              onClick={() => setActiveTab(item.tab)}
            >
              {item.tab} <span className="ml-1 rounded bg-white/20 px-1.5 text-xs">{item.count}</span>
            </Button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <QueueFilter label="Content">
            <select value={contentTypeFilter} onChange={(event) => setContentTypeFilter(event.target.value as "All" | "Post" | "Reply")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All</option>
              <option value="Post">Posts</option>
              <option value="Reply">Replies</option>
            </select>
          </QueueFilter>
          <QueueFilter label="Platform">
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as Platform | "All")} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All platforms</option>
              {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
          </QueueFilter>
          <QueueFilter label="Posting account">
            <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All profiles</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </QueueFilter>
          <QueueFilter label="Brief">
            <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="All">All briefs</option>
              {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </select>
          </QueueFilter>
        </div>

        <div className="mt-4 rounded-md border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
          <button type="button" onClick={() => setShowQueueDebug((current) => !current)} className="font-semibold text-foreground hover:text-primary">
            {showQueueDebug ? "Hide developer diagnostics" : "Developer diagnostics"}
          </button>
          {showQueueDebug && (
            <div className="mt-2 leading-6">
              <p>{queue.length} total loaded · {visibleQueue.length} visible · {storageMode === "supabase" ? "Shared data connected" : "Local mode"}</p>
              {queueDebugMessage && <p>{queueDebugMessage}</p>}
              {instagramSandboxConnection?.status && <p>Instagram sandbox: {instagramSandboxConnection.status}</p>}
            </div>
          )}
        </div>
      </Card>

      <ReviewLinkSharePanel
        label="Share the execution queue with a manager for comments, suggested edits, or approval."
        candidateItems={shareCandidates}
        reviewLinks={reviewLinks}
        defaultScopeType={activeTab === "Scheduled" ? "Scheduled content only" : "Ready to Post only"}
        createReviewLink={createReviewLink}
        disableReviewLink={disableReviewLink}
        storageMode={storageMode}
      />

      {queueMessage && (
        <Card className="border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-950">
          {queueMessage}
        </Card>
      )}

      {activeCampaignComplete && activeCampaign && (
        <Card className="border-teal-200 bg-teal-50 p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <p className="font-bold text-teal-900">Brief complete. Create a new post or repurpose this content.</p>
              <p className="mt-1 text-sm leading-6 text-teal-900">Posted and archived items stay saved in Analytics and Content Library.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startNewPost}>Create next post</Button>
              <Button variant="secondary" onClick={() => repurposeCampaign(activeCampaign)}><Repeat2 size={16} /> Repurpose this brief</Button>
              <Button variant="secondary" onClick={() => setScreen("Analytics")}>View Analytics</Button>
              <Button variant="secondary" onClick={() => setScreen("Content Library")}>View Content Library</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "Completed" && visibleQueue.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <p className="text-sm text-muted-foreground">Completed items are saved in Content Library. Hide or archive them to keep this queue clean.</p>
            <Button variant="secondary" onClick={clearCompletedFromQueue}>Clear completed from queue</Button>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{activeTab}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTab === "Active"
                ? "Approved posts and replies that need manual execution."
                : activeTab === "Scheduled"
                  ? "Posts and replies planned for later."
                  : activeTab === "Completed"
                    ? "Posted and replied items kept as compact history."
                    : "Items removed from the active workflow."}
            </p>
          </div>
          <Pill>{visibleQueue.length}</Pill>
        </div>
        {visibleQueue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
            <p className="font-semibold">
              {activeTab === "Active"
                ? "No ready items."
                : activeTab === "Scheduled"
                  ? "No scheduled items."
                  : activeTab === "Completed"
                    ? "No completed items."
                    : "No archived items."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {activeTab === "Active"
                ? "Approve a draft or reply and it will appear here for manual execution."
                : "Switch tabs or clear filters to see more queue items."}
            </p>
            {activeTab === "Active" && <Button className="mt-4" onClick={() => setScreen("Review Drafts")}>Review drafts</Button>}
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleQueue.map((item) => (
              <PostQueueCard
                key={item.id}
                item={item}
                campaign={campaigns.find((campaign) => campaign.id === item.campaignId)}
                activeTab={activeTab}
                updateQueueItem={updateAndMessage}
                deleteQueueItem={deleteQueueItem}
                setScreen={setScreen}
                mediaPreviewUrl={mediaPreviewUrl}
                reviewFeedback={managerFeedbackForItem(reviewFeedback, item.id)}
                resolveManagerFeedback={resolveManagerFeedback}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PostQueueCard({
  item,
  campaign,
  activeTab,
  updateQueueItem,
  deleteQueueItem,
  setScreen,
  mediaPreviewUrl,
  reviewFeedback,
  resolveManagerFeedback
}: {
  item: PostQueueItem;
  campaign?: Campaign;
  activeTab: QueueExecutionTab;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, message: string) => void;
  deleteQueueItem: (id: string) => void;
  setScreen: (screen: Screen) => void;
  mediaPreviewUrl: string;
  reviewFeedback: ReviewFeedback[];
  resolveManagerFeedback: (feedbackId: string) => void;
}) {
  const contentType = queueContentType(item);
  const isReply = contentType === "Reply";
  const status = normalizeQueueStatus(item.status);
  const safetyStatus = item.safetyCheck?.status ?? "Safe";
  const copyLabel = isReply ? "Copy reply" : "Copy caption";
  const completionLabel = isReply ? "Mark replied" : "Mark posted";
  const platformUrl = platformUrls[item.platform];
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [liveUrl, setLiveUrl] = useState(item.livePostUrl || "");
  const [publishNotes, setPublishNotes] = useState(item.publishNotes || "");
  const [isSandbox, setIsSandbox] = useState(Boolean(item.isSandbox));
  const [plannedAt, setPlannedAt] = useState(toDateTimeLocalValue(item.plannedAt));
  const [postedAt, setPostedAt] = useState(toDateTimeLocalValue(item.postedAt) || toDateTimeLocalValue(new Date().toISOString()));
  const hasMedia = Boolean(item.mediaUsed || item.mediaPublicUrl || item.mediaAssetName || mediaPreviewUrl);
  const canDelete = activeTab === "Archived" || isDeletableQueueTestItem(item);
  const previewCampaign: Campaign = campaign ?? {
    id: item.campaignId,
    name: item.campaignName || item.opportunityTitle || "Queued content",
    idea: item.content,
    intent: item.intent,
    contentAngle: item.contentAngle,
    platforms: [item.platform],
    posts: [],
    createdAt: item.createdAt
  };

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(item.postCopy || item.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function completeItem() {
    updateQueueItem(
      item.id,
      {
        status: isReply ? "Replied" : "Posted",
        livePostUrl: liveUrl,
        postedAt: postedAt ? new Date(postedAt).toISOString() : new Date().toISOString(),
        publishNotes,
        isSandbox
      },
      isReply
        ? "Reply marked as replied and saved to Content Library."
        : "Post marked as posted and saved to Content Library."
    );
    setShowComplete(false);
  }

  function scheduleItem() {
    updateQueueItem(
      item.id,
      {
        status: "Scheduled",
        plannedAt: plannedAt ? new Date(plannedAt).toISOString() : new Date().toISOString()
      },
      "Item scheduled and added to the Content Calendar."
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill>{contentType}</Pill>
            <Pill>{item.platform}</Pill>
            <Pill>{item.profileName || "Conduit"}</Pill>
            <Pill>{status}</Pill>
            {hasMedia && <Pill>Media used</Pill>}
            {item.isSandbox && <Pill>Sandbox/test</Pill>}
            <Pill>Safety: {safetyStatus}</Pill>
          </div>
          <h4 className="mt-3 text-lg font-bold">{item.opportunityTitle || item.campaignName}</h4>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.postCopy || item.content}</p>
          {reviewFeedback.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-bold">Manager feedback</p>
              <div className="mt-2 grid gap-2">
                {reviewFeedback.slice(0, 3).map((feedback) => (
                  <div key={feedback.id} className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <p>
                      <span className="font-semibold">{managerFeedbackStatusLabel(feedback.status)}:</span>{" "}
                      {feedback.suggestedEdit || feedback.comment || "No comment provided."}
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => resolveManagerFeedback(feedback.id)}>Resolve</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button size="sm" variant="secondary" onClick={copyContent}>
            <Clipboard size={14} /> {copied ? "Copied" : copyLabel}
          </Button>
          {!isReply && hasMedia && (
            <Button size="sm" variant="secondary" onClick={() => item.mediaPublicUrl && window.open(item.mediaPublicUrl, "_blank", "noopener,noreferrer")} disabled={!item.mediaPublicUrl}>
              <Download size={14} /> Download media
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => window.open(platformUrl, "_blank", "noopener,noreferrer")}>
            <ExternalLink size={14} /> Open {item.platform}
          </Button>
          {activeTab === "Active" && <Button size="sm" onClick={() => setShowComplete((current) => !current)}>{completionLabel}</Button>}
          {activeTab !== "Archived" && (
            <Button size="sm" variant="secondary" onClick={() => updateQueueItem(item.id, { status: "Archived" }, "Item archived. It remains available in Content Library.")}>Archive</Button>
          )}
          {activeTab === "Archived" && (
            <Button size="sm" variant="secondary" onClick={() => updateQueueItem(item.id, { status: "Ready" }, "Item restored to Active.")}>Restore to Active</Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (window.confirm("Delete this queue item? Content Library records are not removed unless this is only a test queue record.")) {
                  deleteQueueItem(item.id);
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setShowDetails((current) => !current)}>Details</Button>
        </div>
      </div>

      {showComplete && (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
          <p className="font-bold text-teal-950">{isReply ? "Mark as replied" : "Mark as posted"}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <FieldLabel label={isReply ? "Live reply URL" : "Live post URL"}>
              <input value={liveUrl} onChange={(event) => setLiveUrl(event.target.value)} placeholder="https://" className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </FieldLabel>
            <FieldLabel label={isReply ? "Replied date/time" : "Posted date/time"}>
              <input type="datetime-local" value={postedAt} onChange={(event) => setPostedAt(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </FieldLabel>
          </div>
          <FieldLabel label="Notes">
            <textarea value={publishNotes} onChange={(event) => setPublishNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </FieldLabel>
          {!isReply && (
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-teal-950">
              <input type="checkbox" checked={isSandbox} onChange={(event) => setIsSandbox(event.target.checked)} />
              Sandbox/test post
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={completeItem}>{isReply ? "Save replied" : "Save posted"}</Button>
            <Button variant="secondary" onClick={() => setShowComplete(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => setScreen("Content Library")}>View Content Library</Button>
          </div>
        </div>
      )}

      {status === "Ready" && (
        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-bold">Schedule</summary>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end">
            <FieldLabel label="Planned date/time">
              <input type="datetime-local" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </FieldLabel>
            <Button variant="secondary" onClick={scheduleItem}>Schedule</Button>
          </div>
        </details>
      )}

      {showDetails && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <AnalysisBlock label="Manual workflow" value={(isReply ? manualReplySteps : manualPostingSteps[item.platform]).join("\n")} />
          <AnalysisBlock label="Package details" value={[
            item.cta ? `CTA: ${item.cta}` : "",
            item.hashtags?.length ? `Hashtags: ${item.hashtags.join(" ")}` : "",
            item.altText ? `Alt text: ${item.altText}` : "",
            item.overlayText ? `Overlay text: ${item.overlayText}` : "",
            item.firstComment ? `First comment: ${item.firstComment}` : ""
          ].filter(Boolean).join("\n") || "No extra package details saved."} />
          {!isReply && campaign && (
            <PostReadinessPanel
              compact
              readiness={scorePostReadiness(item.postCopy || item.content, item.platform, {
                id: item.id,
                platform: item.platform,
                content: item.content,
                postCopy: item.postCopy,
                mediaUsed: item.mediaUsed || Boolean(mediaPreviewUrl),
                recommendedMediaUse: item.recommendedMediaUse,
                altText: item.altText,
                overlayText: item.overlayText,
                cta: item.cta,
                hashtags: item.hashtags,
                firstComment: item.firstComment,
                carouselIdeas: item.carouselIdeas,
                shotList: item.shotList,
                safetyCheck: item.safetyCheck
              }, campaign)}
            />
          )}
          <BrandSafetyPanel
            compact
            fallbackCheck={item.safetyCheck ?? runFallbackBrandSafetyCheck(item.postCopy || item.content, campaign)}
            requestBody={{
              postCopy: item.postCopy || item.content,
              platform: item.platform,
              campaign: campaign
                ? {
                    name: campaign.name,
                    intent: campaign.intent,
                    contentAngle: campaign.contentAngle,
                    details: campaign.idea,
                    mediaNotes: campaign.mediaContext?.notes,
                    mediaAnalysis: campaign.mediaContext?.analysis,
                    knowledgeSources: campaign.sourceLibraryNames ?? [],
                    claimLibrary: claimContextForGeneration(claimLibraryFromCampaign(campaign))
                  }
                : null
            }}
            onAction={(instruction) => updateQueueItem(item.id, { publishNotes: `${item.publishNotes ? `${item.publishNotes}\n` : ""}Safety action: ${instruction}` }, "Safety action noted.")}
            onUpdateCheck={(check) => updateQueueItem(item.id, { safetyCheck: check }, "Brand Safety check updated.")}
          />
          <div className="lg:col-span-2">
            <PlatformPreview
              post={{
                id: item.generatedPostId,
                platform: item.platform,
                content: item.postCopy || item.content,
                postCopy: item.postCopy || item.content,
                mediaUsed: item.mediaUsed,
                status: "approved",
                score: 0,
                createdAt: item.createdAt
              } as GeneratedPost}
              campaign={previewCampaign}
              mediaPreviewUrl={mediaPreviewUrl || item.mediaPublicUrl || ""}
              formatPostContent={userFacingPostContent}
              extractPostDetail={extractPostDetail}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function claimContextForGeneration(claims: ClaimLibraryItem[]) {
  return {
    claimIds: claims.map((claim) => claim.id),
    approvedClaims: claims
      .filter((claim) => claim.claimType === "Approved claim" || claim.claimType === "Proof-backed")
      .map((claim) => claim.claimText),
    needsReviewClaims: claims
      .filter((claim) => claim.claimType === "Needs review" || claim.claimType === "Customer-sensitive")
      .map((claim) => claim.claimText),
    doNotSayClaims: claims
      .filter((claim) => claim.claimType === "Do not say" || claim.claimType === "Internal only")
      .map((claim) => claim.claimText),
    claimDetails: claims.map((claim) => ({
      claimText: claim.claimText,
      claimType: claim.claimType,
      riskLevel: claim.riskLevel,
      notes: claim.notes
    }))
  };
}

function claimLibraryFromCampaign(campaign?: Campaign): ClaimLibraryItem[] {
  if (!campaign) return [];
  const now = campaign.createdAt || new Date().toISOString();
  const makeClaim = (claimText: string, claimType: ClaimType, index: number): ClaimLibraryItem => ({
    id: `${campaign.id}-claim-${claimType.toLowerCase().replace(/\W+/g, "-")}-${index}`,
    claimText,
    claimType,
    sourceType: "manual entry",
    riskLevel: claimType === "Do not say" || claimType === "Internal only" ? "High" : claimType === "Needs review" || claimType === "Customer-sensitive" ? "Medium" : "Low",
    createdAt: now,
    updatedAt: now
  });
  return [
    ...(campaign.claimLibraryApprovedClaims ?? []).map((claim, index) => makeClaim(claim, "Approved claim", index)),
    ...(campaign.claimLibraryNeedsReviewClaims ?? []).map((claim, index) => makeClaim(claim, "Needs review", index)),
    ...(campaign.claimLibraryDoNotSayClaims ?? []).map((claim, index) => makeClaim(claim, "Do not say", index))
  ];
}

function runFallbackBrandSafetyCheck(content: string, campaign?: Campaign, post?: GeneratedPost): BrandSafetyCheck {
  const notes: string[] = [];
  const claimMatches: ClaimMatch[] = [];
  const lower = content.toLowerCase();
  const claims = claimLibraryFromCampaign(campaign);

  claims.forEach((claim) => {
    const claimLower = claim.claimText.toLowerCase();
    const importantWords = claimLower.match(/[a-z0-9]+/g)?.filter((word) => word.length > 4) ?? [];
    const directMatch = claimLower.length > 12 && lower.includes(claimLower);
    const fuzzyMatch = importantWords.length >= 3 && importantWords.slice(0, 5).filter((word) => lower.includes(word)).length >= 3;
    if (!directMatch && !fuzzyMatch) return;
    const note =
      claim.claimType === "Approved claim" || claim.claimType === "Proof-backed"
        ? "Supported by Claim Library."
        : claim.claimType === "Do not say"
          ? "Do-not-say claim or similar wording detected."
          : "Claim needs review.";
    claimMatches.push({
      claimId: claim.id,
      claimText: claim.claimText,
      claimType: claim.claimType,
      riskLevel: claim.riskLevel,
      note,
      matchedText: claim.claimText
    });
  });

  if (/guarantee|always|eliminate|revolutionize|cutting-edge|game-changing|next-gen|supercharge|unlock|elevate/.test(lower)) {
    notes.push("Vague hype or guarantee language may need review.");
  }
  if (/customer|client|confidential|private|nda|facility|plant|site/i.test(content)) {
    notes.push("Customer or facility detail may need approval.");
  }
  if (post?.mediaUsed && /whiteboard|badge|screen|serial|customer/i.test(content)) {
    notes.push("Media may show sensitive workspace details.");
  }

  const hasRiskyClaim = claimMatches.some((match) => match.claimType === "Do not say");
  const hasNeedsReviewClaim = claimMatches.some((match) => match.claimType === "Needs review" || match.claimType === "Customer-sensitive");
  return {
    status: hasRiskyClaim ? "Risky" : notes.length > 0 || hasNeedsReviewClaim ? "Needs review" : "Safe",
    notes,
    claimMatches,
    checkedAt: new Date().toISOString(),
    source: "Fallback"
  };
}

function scorePostReadiness(content: string, platform: Platform, post?: Partial<GeneratedPost>, campaign?: Campaign) {
  const cleanContent = content.trim();
  const lower = cleanContent.toLowerCase();
  const items = [
    {
      label: "Specific hook",
      passed: cleanContent.split(/\s+/).length > 8 && !/excited to share|big news|we are thrilled/i.test(cleanContent.slice(0, 120)),
      suggestion: "Make the first line more specific and opinionated."
    },
    {
      label: "Platform fit",
      passed:
        platform === "X"
          ? cleanContent.length <= 280 || cleanContent.includes("\n")
          : platform === "Instagram"
            ? cleanContent.length <= 2200
            : platform === "TikTok"
              ? /hook|script|shot/i.test(cleanContent)
              : cleanContent.length <= 3000,
      suggestion: "Adjust length and structure for the selected platform."
    },
    {
      label: "Operational specificity",
      passed: /factory|robot|automation|workflow|operator|machine|sensor|deployment|hardware|floor|process/i.test(cleanContent),
      suggestion: "Add a concrete factory, workflow, robotics, or operations detail."
    },
    {
      label: "Media fit",
      passed: !post?.mediaUsed || Boolean(campaign?.mediaContext?.notes || campaign?.mediaContext?.analysis?.description || post?.recommendedMediaUse),
      suggestion: "Tie the copy more clearly to the attached media."
    },
    {
      label: "Low hype",
      passed: !/revolutionize|cutting-edge|game-changing|next-gen|supercharge|unlock|elevate|seamless/i.test(lower),
      suggestion: "Remove generic hype language."
    },
    {
      label: "Claim safety",
      passed: runFallbackBrandSafetyCheck(cleanContent, campaign, post as GeneratedPost | undefined).status !== "Risky",
      suggestion: "Remove or source risky claims."
    }
  ];
  const passed = items.filter((item) => item.passed).length;
  const score = Math.max(35, Math.round((passed / items.length) * 100));
  return {
    score,
    label: score >= 85 ? "Ready" : score >= 65 ? "Good" : "Needs work",
    items,
    suggestions: items.filter((item) => !item.passed).map((item) => item.suggestion).slice(0, 3)
  };
}

function supportingFieldsFromPost(post: Partial<GeneratedPost>) {
  return {
    recommendedMediaUse: post.recommendedMediaUse || extractPostDetail(post.content || "", "Recommended media use"),
    altText: post.altText || extractPostDetail(post.content || "", "Optional alt text"),
    overlayText: post.overlayText || extractPostDetail(post.content || "", "Suggested overlay text"),
    cta: post.cta || extractPostDetail(post.content || "", "CTA"),
    hashtags: post.hashtags ?? [],
    firstComment: post.firstComment || "",
    carouselIdeas: post.carouselIdeas ?? [],
    shotList: post.shotList ?? []
  };
}

function supportingDetailsFromPost(post: GeneratedPost) {
  const fields = supportingFieldsFromPost(post);
  return [
    { label: "Recommended media use", value: fields.recommendedMediaUse },
    { label: "Alt text", value: fields.altText },
    { label: "Overlay text", value: fields.overlayText },
    { label: "CTA", value: fields.cta },
    { label: "Hashtags", value: fields.hashtags.length ? fields.hashtags.join(" ") : "" },
    { label: "First comment", value: fields.firstComment },
    { label: "Carousel ideas", value: fields.carouselIdeas.join("\n") },
    { label: "Shot list", value: fields.shotList.join("\n") }
  ].filter((item) => item.value && item.value.trim().length > 0);
}

function postReadiness(post: GeneratedPost, campaign?: Campaign) {
  return scorePostReadiness(userFacingPostContent(post.content, campaign, post), post.platform, post, campaign);
}

function safetyCheckForPost(post: GeneratedPost, campaign?: Campaign) {
  return post.safetyCheck ?? runFallbackBrandSafetyCheck(userFacingPostContent(post.content, campaign, post), campaign, post);
}

function brandSafetyRequestBody(post: GeneratedPost, campaign?: Campaign) {
  return {
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
          knowledgeSources: campaign.sourceLibraryNames ?? post.sourceLibraryNames ?? [],
          claimLibrary: claimContextForGeneration(claimLibraryFromCampaign(campaign))
        }
      : null
  };
}

function isCampaignComplete(campaign: Campaign | undefined, queue: PostQueueItem[]) {
  if (!campaign) return false;
  const campaignQueue = queue.filter((item) => item.campaignId === campaign.id);
  const campaignPostsComplete =
    campaign.posts.length > 0 &&
    campaign.posts.every((post) => {
      const queueItem = campaignQueue.find((item) => item.generatedPostId === post.id);
      const status = queueItem ? normalizeQueueStatus(queueItem.status) : undefined;
      return post.status === "rejected" || status === "Posted" || status === "Replied" || status === "Archived";
    });
  const queueComplete =
    campaignQueue.length > 0 &&
    campaignQueue.every((item) => {
      const status = normalizeQueueStatus(item.status);
      return status === "Posted" || status === "Replied" || status === "Archived" || Boolean(item.hiddenFromQueue);
    });

  return campaignPostsComplete || queueComplete;
}

function isDemoLikeRecord(item?: {
  id?: string;
  name?: string;
  title?: string;
  campaignName?: string;
  claimText?: string;
  profileId?: string;
  campaignId?: string;
}) {
  if (!item) return false;
  return [
    item.id,
    item.name,
    item.title,
    item.campaignName,
    item.claimText,
    item.profileId,
    item.campaignId
  ].some((value) => typeof value === "string" && (/^demo-/i.test(value) || /^Demo -/i.test(value)));
}

function buildReviewQueueItems(
  campaigns: Campaign[],
  opportunities: Opportunity[],
  profiles: Profile[],
  postQueue: PostQueueItem[],
  reviewFeedback: ReviewFeedback[] = []
) {
  const queuedIds = new Set(postQueue.map((item) => item.generatedPostId));
  const queueByGeneratedId = new Map(postQueue.map((item) => [item.generatedPostId, item]));
  const items: ReviewQueueItem[] = [];

  campaigns.forEach((campaign) => {
    campaign.posts.forEach((post) => {
      const queueItem = queueByGeneratedId.get(post.id);
      const queued = queuedIds.has(post.id);
      const review = reviewWithDefault(
        queueItem?.review ?? post.review,
        post.status === "approved" ? "Approved" : post.status === "rejected" ? "Archived" : "Draft"
      );
      const reviewStatus: ReviewWorkflowStatus = queued
        ? (queueItem?.managerReviewOnly ? review.status : "Ready to Post")
        : post.status === "rejected"
          ? "Archived"
          : review.status;

      items.push({
        id: `post-${post.id}`,
        contentType: "Post",
        platform: post.platform,
        postingAccount: campaign.profileName || post.profileName || "No posting account",
        title: campaign.name,
        reviewer: review.reviewerName || "No reviewer assigned",
        review,
        reviewStatus,
        latestFeedback: review.feedback || "",
        requestedAt: review.requestedAt || review.reviewedAt || campaign.createdAt,
        readinessScore: post.score,
        safetyStatus: post.safetyCheck?.status,
        queued,
        queueItem,
        campaign,
        post
      });
    });
  });

  opportunities.forEach((opportunity) => {
    (opportunity.replyDrafts ?? []).forEach((reply) => {
      const queueItem = queueByGeneratedId.get(reply.id);
      const queued = queuedIds.has(reply.id);
      const review = reviewWithDefault(
        queueItem?.review ?? reply.review,
        reply.status === "Approved" ? "Approved" : reply.status === "Archived" ? "Archived" : "Draft"
      );
      const reviewStatus: ReviewWorkflowStatus = queued
        ? (queueItem?.managerReviewOnly ? review.status : "Ready to Reply")
        : reply.status === "Archived"
          ? "Archived"
          : review.status;
      const profile = profiles.find((item) => item.name.toLowerCase().includes("conduit"));

      items.push({
        id: `reply-${reply.id}`,
        contentType: "Reply",
        platform: reply.recommendedPlatform,
        postingAccount: profile?.name || "Conduit",
        title: opportunity.title,
        reviewer: review.reviewerName || "No reviewer assigned",
        review,
        reviewStatus,
        latestFeedback: review.feedback || "",
        requestedAt: review.requestedAt || review.reviewedAt || reply.updatedAt || reply.createdAt,
        readinessScore: undefined,
        safetyStatus: reply.brandSafetyNotes.length > 0 ? "Needs review" : "Safe",
        queued,
        queueItem,
        opportunity,
        reply
      });
    });
  });

  const existingGeneratedIds = new Set(items.flatMap((item) => [
    item.post?.id,
    item.reply?.id
  ].filter(Boolean) as string[]));

  postQueue.forEach((queueItem) => {
    if (existingGeneratedIds.has(queueItem.generatedPostId)) return;
    const latestFeedback = managerFeedbackForItem(reviewFeedback, queueItem.id)[0];
    if (!latestFeedback) return;
    const reviewStatus: ReviewWorkflowStatus =
      latestFeedback.status === "changes_requested"
        ? "Changes requested"
        : latestFeedback.status === "approved"
          ? "Manager approved"
          : latestFeedback.status === "ready_to_post"
            ? "Manager marked ready to post"
            : "Sent for review";
    const review: ReviewMetadata = {
      status: reviewStatus,
      reviewerName: latestFeedback.reviewerName || "Manager",
      feedback: latestFeedback.comment || latestFeedback.suggestedEdit || "",
      requestedAt: latestFeedback.createdAt,
      reviewedAt: latestFeedback.status === "approved" ? latestFeedback.createdAt : undefined
    };

    items.push({
      id: `queue-feedback-${queueItem.id}`,
      contentType: queueContentType(queueItem),
      platform: queueItem.platform,
      postingAccount: queueItem.profileName || "Conduit",
      title: queueItem.opportunityTitle || queueItem.campaignName,
      reviewer: latestFeedback.reviewerName || "Manager",
      review,
      reviewStatus,
      latestFeedback: review.feedback || "",
      requestedAt: latestFeedback.createdAt,
      readinessScore: undefined,
      safetyStatus: queueItem.safetyCheck?.status,
      queued: true,
      queueItem,
      managerFeedback: latestFeedback,
      suggestedEdit: latestFeedback.suggestedEdit
    });
  });

  return items.sort((a, b) => {
    const aTime = new Date(a.requestedAt || "").getTime() || 0;
    const bTime = new Date(b.requestedAt || "").getTime() || 0;
    return bTime - aTime;
  });
}

function reviewQueueItemMatchesFilter(item: ReviewQueueItem, filter: ReviewQueueFilter) {
  if (filter === "All drafts") return true;
  if (filter === "Sent for review") return item.reviewStatus === "Sent for review" || item.reviewStatus === "Needs review";
  if (filter === "Changes requested") return item.reviewStatus === "Changes requested";
  if (filter === "Revised") return item.reviewStatus === "Revised";
  if (filter === "Manager approved / ready") {
    return item.reviewStatus === "Approved" || item.reviewStatus === "Manager approved" || item.reviewStatus === "Manager marked ready to post";
  }
  if (filter === "Ready to Post / Ready to Reply") {
    return (!item.queueItem?.managerReviewOnly && item.queued) || item.reviewStatus === "Ready to Post" || item.reviewStatus === "Ready to Reply";
  }
  if (filter === "Archived") return item.reviewStatus === "Archived";
  return true;
}

function ResultsEditor({
  campaigns,
  campaign,
  setActiveCampaignId,
  campaignComplete,
  rawIdeaIsGeneric,
  opportunities,
  setOpportunities,
  persistOpportunity,
  profiles,
  postQueue,
  queueApprovedReply,
  queuePostFromReview,
  sendPostToManagerReview,
  updateQueueItem,
  updateCampaignPostFromReview,
  reviewQueueFilterPreset,
  reviewFeedback,
  resolveManagerFeedback,
  refreshManagerFeedback,
  captureFeedbackMemory,
  feedbackMemorySummary,
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
  mediaPreviewUrl,
  startNewPost,
  repurposeCampaign
}: {
  campaigns: Campaign[];
  campaign?: Campaign;
  setActiveCampaignId: (id: string) => void;
  campaignComplete: boolean;
  rawIdeaIsGeneric: boolean;
  opportunities: Opportunity[];
  setOpportunities: (items: Opportunity[] | ((current: Opportunity[]) => Opportunity[])) => void;
  persistOpportunity: (opportunity: Opportunity) => void;
  profiles: Profile[];
  postQueue: PostQueueItem[];
  queueApprovedReply: (opportunity: Opportunity, reply: OpportunityReplyDraft, approvedReply: string, profile?: Profile) => PostQueueItem;
  queuePostFromReview: (campaign: Campaign, post: GeneratedPost) => Promise<void>;
  sendPostToManagerReview: (campaign: Campaign, post: GeneratedPost) => Promise<string>;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>, options?: { silentActivity?: boolean }) => void;
  updateCampaignPostFromReview: (campaignId: string, postId: string, updates: Partial<GeneratedPost>) => void;
  reviewQueueFilterPreset: ReviewQueueFilter;
  reviewFeedback: ReviewFeedback[];
  resolveManagerFeedback: (feedbackId: string) => void;
  refreshManagerFeedback: () => Promise<void>;
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
  feedbackMemorySummary: FeedbackMemorySummary;
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
  startNewPost: () => void;
  repurposeCampaign: (campaign: Campaign) => void;
}) {
  const [activePlatform, setActivePlatform] = useState<Platform>("LinkedIn");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  const [showBriefContext, setShowBriefContext] = useState(false);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [reviewQueueFilter, setReviewQueueFilter] = useState<ReviewQueueFilter>("All drafts");
  const [reviewQueueMessage, setReviewQueueMessage] = useState("");

  useEffect(() => {
    if (campaign?.platforms.length && !campaign.platforms.includes(activePlatform)) {
      setActivePlatform(campaign.platforms[0]);
      setShowMoreOptions(false);
    }
  }, [activePlatform, campaign]);

  useEffect(() => {
    setReviewQueueFilter(reviewQueueFilterPreset);
    setShowReviewQueue(true);
  }, [reviewQueueFilterPreset]);

  if (!campaign) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold">No brief selected.</p>
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
  const reviewQueueItems = buildReviewQueueItems(campaigns, opportunities, profiles, postQueue, reviewFeedback);
  const filteredReviewQueueItems = reviewQueueItems.filter((item) => reviewQueueItemMatchesFilter(item, reviewQueueFilter));

  function openReviewQueueItem(item: ReviewQueueItem) {
    if (item.contentType === "Post" && item.campaign && item.post) {
      setActiveCampaignId(item.campaign.id);
      setActivePlatform(item.post.platform);
      setShowReviewQueue(false);
      setReviewQueueMessage(`Opened ${item.platform} draft from ${item.title}.`);
      return;
    }
    if (item.contentType === "Reply") {
      setScreen("Opportunity Inbox");
    }
  }

  function updateReplyReviewFromQueue(opportunity: Opportunity, reply: OpportunityReplyDraft, review: ReviewMetadata) {
    const nextReply: OpportunityReplyDraft = {
      ...reply,
      review,
      updatedAt: new Date().toISOString()
    };
    const nextOpportunity = {
      ...opportunity,
      replyDrafts: (opportunity.replyDrafts ?? []).map((item) => item.id === reply.id ? nextReply : item),
      updatedAt: new Date().toISOString()
    };
    setOpportunities((current) => current.map((item) => item.id === opportunity.id ? nextOpportunity : item));
    persistOpportunity(nextOpportunity);
  }

  function approveReviewItem(item: ReviewQueueItem) {
    const now = new Date().toISOString();
    const nextReview: ReviewMetadata = {
      ...(item.review ?? { status: "Approved" }),
      status: "Approved",
      reviewerName: item.reviewer === "No reviewer assigned" ? "Conduit / team" : item.reviewer,
      reviewedAt: now
    };

    if (item.contentType === "Post" && item.campaign && item.post) {
      updateCampaignPostFromReview(item.campaign.id, item.post.id, { review: nextReview });
      setReviewQueueMessage(`${item.platform} draft approved by ${nextReview.reviewerName}.`);
      return;
    }

    if (item.contentType === "Reply" && item.opportunity && item.reply) {
      updateReplyReviewFromQueue(item.opportunity, item.reply, nextReview);
      setReviewQueueMessage(`${item.platform} reply approved by ${nextReview.reviewerName}.`);
    }
  }

  function archiveReviewItem(item: ReviewQueueItem) {
    const now = new Date().toISOString();
    const nextReview: ReviewMetadata = {
      ...(item.review ?? { status: "Archived" }),
      status: "Archived",
      reviewedAt: now
    };

    if (item.contentType === "Post" && item.campaign && item.post) {
      updateCampaignPostFromReview(item.campaign.id, item.post.id, { review: nextReview, status: "rejected" });
      setReviewQueueMessage(`${item.platform} draft archived.`);
      return;
    }

    if (item.contentType === "Reply" && item.opportunity && item.reply) {
      const nextReply: OpportunityReplyDraft = {
        ...item.reply,
        status: "Archived",
        review: nextReview,
        updatedAt: now
      };
      const nextOpportunity: Opportunity = {
        ...item.opportunity,
        replyDrafts: (item.opportunity.replyDrafts ?? []).map((reply) =>
          reply.id === item.reply?.id ? nextReply : reply
        ),
        updatedAt: now
      };
      setOpportunities((current) =>
        current.map((opportunity) =>
          opportunity.id === nextOpportunity.id ? nextOpportunity : opportunity
        )
      );
      persistOpportunity(nextOpportunity);
      setReviewQueueMessage(`${item.platform} reply archived.`);
    }
  }

  async function moveReviewItemToReady(item: ReviewQueueItem) {
    if (item.contentType === "Post" && item.campaign && item.post) {
      await queuePostFromReview(item.campaign, item.post);
      setReviewQueueMessage(`${item.platform} post moved to Ready to Post.`);
      return;
    }

    if (item.contentType === "Reply" && item.opportunity && item.reply) {
      moveReplyToReady(item.opportunity, item.reply);
      setReviewQueueMessage(`${item.platform} reply moved to Ready to Reply.`);
    }
  }

  function regenerateReviewItemFromFeedback(item: ReviewQueueItem) {
    const feedback = item.latestFeedback.trim();
    if (!feedback) {
      openReviewQueueItem(item);
      return;
    }

    if (item.contentType === "Post" && item.campaign && item.post) {
      setActiveCampaignId(item.campaign.id);
      setActivePlatform(item.post.platform);
      if (campaign?.id === item.campaign.id) {
        void regeneratePost(item.post, `Regenerate from founder/team review feedback: ${feedback}`);
      } else {
        setReviewQueueMessage("Opened the draft. Run regenerate from feedback after the brief loads.");
      }
      return;
    }

    setScreen("Opportunity Inbox");
  }

  function acceptSuggestedEditFromQueue(item: ReviewQueueItem) {
    if (!item.suggestedEdit?.trim()) {
      setReviewQueueMessage("No suggested edit is available for this item.");
      return;
    }

    if (item.queueItem) {
      updateQueueItem(item.queueItem.id, {
        content: item.suggestedEdit,
        postCopy: item.suggestedEdit,
        review: {
          ...(item.queueItem.review ?? { status: "Changes requested" }),
          status: "Revised",
          reviewerName: item.reviewer,
          feedback: "Suggested edit accepted. Updated draft available.",
          reviewedAt: new Date().toISOString()
        }
      });
      captureFeedbackMemory({
        sourceType: "review feedback",
        platform: item.queueItem.platform,
        postingAccountId: item.queueItem.profileId,
        postingAccountName: item.queueItem.profileName,
        originalContent: item.queueItem.postCopy || item.queueItem.content,
        revisedContent: item.suggestedEdit,
        feedbackText: item.latestFeedback || "Manager suggested edit accepted.",
        metadata: { contentType: item.contentType, managerFeedbackId: item.managerFeedback?.id }
      });
      if (item.managerFeedback) {
        resolveManagerFeedback(item.managerFeedback.id);
      }
      setReviewQueueMessage("Suggested edit accepted. The draft is marked Revised and the manager can review the updated copy.");
      return;
    }

    if (item.contentType === "Post" && item.campaign && item.post) {
      updateCampaignPostFromReview(item.campaign.id, item.post.id, {
        postCopy: item.suggestedEdit,
        content: item.suggestedEdit,
        review: revisedReview(item.review, "Suggested edit accepted. Updated draft available.")
      });
      setReviewQueueMessage("Suggested edit accepted on the draft copy.");
      return;
    }

    setReviewQueueMessage("Open the source item to apply this suggested edit.");
  }

  function moveReplyToReady(opportunity: Opportunity, reply: OpportunityReplyDraft) {
    const approvedReply = reply.approvedReply || reply.shortReply;
    const profile = profiles.find((item) => item.name.toLowerCase().includes("conduit")) || profiles[0];
    const nextReview: ReviewMetadata = {
      ...(reply.review ?? {}),
      status: "Ready to Reply",
      reviewerName: reply.review?.reviewerName || "Conduit / team",
      reviewedAt: new Date().toISOString()
    };
    const nextReply = {
      ...reply,
      approvedReply,
      review: nextReview,
      status: "Approved" as const,
      updatedAt: new Date().toISOString()
    };
    const nextOpportunity = {
      ...opportunity,
      replyDrafts: (opportunity.replyDrafts ?? []).map((item) => item.id === reply.id ? nextReply : item),
      relatedPostIds: uniqueStrings([...(opportunity.relatedPostIds ?? []), nextReply.id]),
      updatedAt: new Date().toISOString()
    };
    setOpportunities((current) => current.map((item) => item.id === opportunity.id ? nextOpportunity : item));
    persistOpportunity(nextOpportunity);
    queueApprovedReply(nextOpportunity, nextReply, approvedReply, profile);
  }

  if (campaignComplete) {
    return (
      <Card className="p-8 text-center">
        <p className="text-xl font-extrabold tracking-tight">Brief complete.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          This brief is complete. Start a new post, repurpose this content, or view the saved history.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={startNewPost}>Create next post</Button>
          <Button variant="secondary" onClick={() => repurposeCampaign(campaign)}>
            <Repeat2 size={16} /> Repurpose this brief
          </Button>
          <Button variant="secondary" onClick={() => setScreen("Analytics")}>View Analytics</Button>
          <Button variant="secondary" onClick={() => setScreen("Content Library")}>View Content Library</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Review Queue</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">Founder / team review</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage posts and replies that need review, have changes requested, or are approved but not yet in Ready to Post / Ready to Reply.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowReviewQueue((current) => !current)}>
            {showReviewQueue ? "Hide queue" : "Show queue"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void refreshManagerFeedback()}>
            Refresh manager feedback
          </Button>
        </div>
        {reviewQueueMessage && (
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            {reviewQueueMessage}
          </div>
        )}
        {showReviewQueue && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {reviewQueueFilters.map((filter) => {
                const count = reviewQueueItems.filter((item) => reviewQueueItemMatchesFilter(item, filter)).length;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setReviewQueueFilter(filter)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-bold transition",
                      reviewQueueFilter === filter
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {filter} {count > 0 ? `(${count})` : ""}
                  </button>
                );
              })}
            </div>
            {filteredReviewQueueItems.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-muted-foreground">
                No review items match this filter.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredReviewQueueItems.map((item) => (
                  <ReviewQueueCard
                    key={item.id}
                    item={item}
                    onOpen={() => openReviewQueueItem(item)}
                    onRegenerateFromFeedback={() => regenerateReviewItemFromFeedback(item)}
                    onApproveReview={() => approveReviewItem(item)}
                    onMoveToReady={() => void moveReviewItemToReady(item)}
                    onArchive={() => archiveReviewItem(item)}
                    onAcceptSuggestedEdit={() => acceptSuggestedEditFromQueue(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Brief context</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">{campaign.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {campaign.intent || campaign.idea || "No brief summary saved."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {campaign.mediaContext?.assetId && (
              <Button size="sm" variant="secondary" onClick={() => setScreen("Media Library")}>
                Open media asset
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setShowBriefContext((current) => !current)}>
              {showBriefContext ? "Hide details" : "View details"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setScreen("New Campaign")}>
              <Plus size={16} /> Create a post
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <BriefItem
            label="Posting account"
            value={
              campaign.profileName
                ? `${campaign.profileName} · ${campaign.profileType}`
                : "General brand profile"
            }
          />
          <BriefItem
            label="Platforms"
            value={availablePlatforms.join(", ")}
          />
          <BriefItem
            label={campaign.mediaContext?.assetId ? "Created from media asset" : "Media used"}
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
                : "Using automatic Company Knowledge"
            }
          />
          <BriefItem
            label="Content angle"
            value={campaign.contentAngle || "Not saved"}
          />
          <BriefItem
            label="Generation"
            value={`${campaign.generatedBy ?? "Mock"} · ${campaign.campaignType ?? "Original"}`}
          />
        </div>
        {showBriefContext && (
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 lg:grid-cols-4">
            <BriefItem
              label="Repurposed from"
              value={campaign.repurposedFrom?.label ?? "Original brief"}
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
            label="Template"
            value={campaign.campaignTemplate || "No template saved"}
          />
          <BriefItem
            label="Intent"
            value={campaign.intent || "Not saved"}
          />
          <BriefItem
            label="Brand Voice Rules"
            value={`Global rules · ${campaign.generatedBy ?? "Mock"} generation`}
          />
            <AnalysisBlock
              label="What the AI sees"
              value={
                campaign.mediaContext?.analysis?.description ||
                campaign.mediaContext?.notes ||
                "Media was attached without additional notes."
              }
            />
            <AnalysisBlock
              label="Best content angle"
              value={mediaAngle || "Use the media as proof for the brief idea."}
            />
            <AnalysisBlock
              label="Suggested overlay text"
              value={overlayIdea || "Show the clearest takeaway from the media."}
            />
            <AnalysisBlock
              label="Manual context"
              value={campaign.mediaContext?.notes || "No manual notes added."}
            />
            {(campaign.mediaContext?.analysis?.warnings ?? []).length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 md:col-span-2">
                <p className="font-bold">Media warnings</p>
                <p className="mt-1">{(campaign.mediaContext?.analysis?.warnings ?? []).join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="sticky top-4 z-20 p-4">
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
                sendPostToManagerReview={sendPostToManagerReview}
                captureFeedbackMemory={captureFeedbackMemory}
                feedbackMemorySummary={feedbackMemorySummary}
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
  sendPostToManagerReview,
  captureFeedbackMemory,
  feedbackMemorySummary,
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
  sendPostToManagerReview: (campaign: Campaign, post: GeneratedPost) => Promise<string>;
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
  feedbackMemorySummary: FeedbackMemorySummary;
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
  const [showPackageDetails, setShowPackageDetails] = useState(false);
  const [managerReviewUrlValue, setManagerReviewUrlValue] = useState("");
  const [managerReviewCopyState, setManagerReviewCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const displayContent = userFacingPostContent(post.content, campaign, post);
  const [editBaseline, setEditBaseline] = useState(displayContent);
  const details = supportingDetailsFromPost(post);
  const readiness = postReadiness(post, campaign);
  const review = reviewWithDefault(
    post.review,
    post.status === "approved" ? "Ready to Post" : post.status === "rejected" ? "Archived" : "Draft"
  );
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
    if (shouldMarkDraftRevised(review.status)) {
      updatePost(post.id, { review: revisedReview(review) });
    }
    setRegenerateInstruction("");
    setShowRegenerate(false);
    setMode("edit");
  }

  async function handleSendToManagerReview() {
    const url = await sendPostToManagerReview(campaign, post);
    setManagerReviewUrlValue(url);
  }

  async function copyManagerReviewUrl() {
    if (!managerReviewUrlValue) return;
    try {
      await navigator.clipboard.writeText(managerReviewUrlValue);
      setManagerReviewCopyState("copied");
    } catch {
      setManagerReviewCopyState("failed");
    }
    window.setTimeout(() => setManagerReviewCopyState("idle"), 1400);
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
          {post.contentOrigin && (
            <Pill>{post.contentOrigin}</Pill>
          )}
          <span className={cn("rounded-md px-2.5 py-1 text-xs font-bold uppercase shadow-sm", statusStyle[post.status])}>
            {post.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(post.contentOrigin === "Manually written" || post.contentOrigin === "AI-improved from manual draft") && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setRegenerateInstruction(
                  "Improve this manual draft while preserving the core point. Make it more specific, more Conduit, less generic, and keep the final copy platform-native."
                );
                setShowRegenerate(true);
              }}
            >
              Improve with AI
            </Button>
          )}
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
          onFocus={() => setEditBaseline(displayContent)}
          onBlur={() => {
            if (editBaseline.trim() && editBaseline.trim() !== displayContent.trim()) {
              captureFeedbackMemory({
                sourceType: "edit",
                platform: post.platform,
                postingAccountId: post.profileId ?? campaign.profileId,
                postingAccountName: post.profileName ?? campaign.profileName,
                originalContent: editBaseline,
                revisedContent: displayContent,
                feedbackText: "Manual edit to post copy."
              });
              setEditBaseline(displayContent);
            }
          }}
          onChange={(event) => {
            const nextCopy = event.target.value;
            const nextPost = { ...post, postCopy: nextCopy, content: nextCopy };
            const nextReview = shouldMarkDraftRevised(review.status)
              ? revisedReview(review)
              : post.review;
            updatePost(post.id, {
              postCopy: nextCopy,
              content: nextCopy,
              review: nextReview,
              safetyCheck: runFallbackBrandSafetyCheck(nextCopy, campaign, nextPost)
            });
          }}
          className="min-h-60 w-full rounded-lg border border-input bg-white p-5 text-base leading-7 shadow-inner outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <PlatformPreview
          post={post}
          campaign={campaign}
          mediaPreviewUrl={mediaPreviewUrl}
          formatPostContent={userFacingPostContent}
          extractPostDetail={extractPostDetail}
        />
      )}
      <div className="mt-4">
        <PostReadinessPanel
          readiness={readiness}
          compact
          onImprove={(instruction) => {
            captureFeedbackMemory({
              sourceType: "readiness action",
              platform: post.platform,
              postingAccountId: post.profileId ?? campaign.profileId,
              postingAccountName: post.profileName ?? campaign.profileName,
              originalContent: displayContent,
              feedbackText: instruction
            });
            setRegenerateInstruction(instruction);
            setShowRegenerate(true);
          }}
        />
      </div>
      <div className="mt-4">
        <BrandSafetyPanel
          fallbackCheck={safetyCheckForPost(post, campaign)}
          requestBody={brandSafetyRequestBody(post, campaign)}
          compact
          onUpdateCheck={(safetyCheck) => updatePost(post.id, { safetyCheck })}
          onAction={(instruction) => {
            captureFeedbackMemory({
              sourceType: "safety action",
              platform: post.platform,
              postingAccountId: post.profileId ?? campaign.profileId,
              postingAccountName: post.profileName ?? campaign.profileName,
              originalContent: displayContent,
              feedbackText: instruction
            });
            setRegenerateInstruction(instruction);
            setShowRegenerate(true);
          }}
        />
      </div>
      <ReviewWorkflowPanel
        className="mt-4"
        review={review}
        contentKind="Post"
        onChange={(nextReview) => updatePost(post.id, { review: nextReview })}
        onRegenerateFromFeedback={(feedback) => {
          setRegenerateInstruction(`Regenerate from founder/team review feedback: ${feedback}`);
          setShowRegenerate(true);
        }}
      />
      {managerReviewUrlValue && (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <p className="font-extrabold">Manager review link ready</p>
          <p className="mt-1 text-teal-900">Share this scoped link. Managers can review this draft, comment, suggest edits, approve, or mark it ready to post.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={managerReviewUrlValue}
              className="min-w-0 flex-1 rounded-md border border-teal-200 bg-white px-3 py-2 text-sm"
              aria-label="Manager review link"
            />
            <Button size="sm" variant="secondary" onClick={copyManagerReviewUrl}>
              {managerReviewCopyState === "copied" ? "Copied" : managerReviewCopyState === "failed" ? "Copy failed" : "Copy link"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.open(managerReviewUrlValue, "_blank", "noopener,noreferrer")}>
              Open link
            </Button>
          </div>
        </div>
      )}
      {details.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setShowPackageDetails((current) => !current)}
            className="text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            {showPackageDetails ? "Hide post package details" : "Post package details"}
          </button>
          {showPackageDetails && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{detail.label}</p>
                  <p className="mt-1 text-sm leading-6">{detail.value}</p>
                </div>
              ))}
            </div>
          )}
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
            <AnalysisBlock label="Rationale" value={post.rationale || "Created from the selected content brief and platform format."} />
            <AnalysisBlock label="Posting Account" value={post.profileName ? `${post.profileName} · ${post.profileType}` : campaign.profileName || "No saved Posting Account"} />
            <AnalysisBlock label="Simple style" value={(campaign.simpleStyleChips ?? []).length > 0 ? `${(campaign.simpleStyleChips ?? []).join(", ")}. These guided tone lightly without changing facts or who is speaking.` : "Conduit default."} />
            <AnalysisBlock label="Voice Influence" value={(campaign.voiceInfluenceNames ?? []).join(", ") || "No extra internal voices. Posting Account and Brand Voice Rules carried the voice."} />
            <AnalysisBlock label="Profile voice sources" value={(campaign.voiceExampleTitles ?? []).length > 0 ? `${(campaign.voiceExampleTitles ?? []).join(", ")} influenced cadence, structure, and phrasing. These labels show whether learning came from notes, pasted examples, screenshots, fetched website content, or synced sources. Owned/internal sources guide voice; external inspiration sources guide format/style only and never facts, claims, identity, or wording.` : "No analyzed profile source content or manual voice examples were selected for this draft."} />
            <AnalysisBlock label="Inspiration / Reference" value={(campaign.inspirationProfileNames ?? []).length > 0 ? `${(campaign.inspirationProfileNames ?? []).join(", ")}. These influenced format/style only, not facts or claims.` : "No external inspiration. If used, these only shape format and should never be copied."} />
            <AnalysisBlock label="Template" value={campaign.campaignTemplate || "No template saved"} />
            <AnalysisBlock label="Content angle" value={campaign.contentAngle || "Not saved"} />
            <AnalysisBlock label="Intent" value={campaign.intent || "Not saved"} />
            <AnalysisBlock label="Details / raw notes" value={campaign.idea || "No details saved."} />
            <AnalysisBlock label="Media notes" value={campaign.mediaContext?.notes || "No media notes."} />
            <AnalysisBlock label="AI media analysis" value={campaign.mediaContext?.analysis?.description || "No media analysis."} />
            <AnalysisBlock label="Company Knowledge" value={(post.sourceLibraryNames ?? campaign.sourceLibraryNames ?? []).join(", ") || "No Company Knowledge items."} />
            <AnalysisBlock
              label="Claim Library"
              value={
                (post.safetyCheck?.claimMatches ?? []).some((match) => match.claimType === "Approved claim" || match.claimType === "Proof-backed")
                  ? `Approved claim support: ${(post.safetyCheck?.claimMatches ?? []).filter((match) => match.claimType === "Approved claim" || match.claimType === "Proof-backed").map((match) => match.claimText).join("; ")}`
                  : (campaign.claimLibraryApprovedClaims ?? []).length > 0
                    ? `Generation was guided by approved claims like: ${(campaign.claimLibraryApprovedClaims ?? []).slice(0, 2).join("; ")}`
                    : "No approved Claim Library guidance saved for this brief."
              }
            />
            <AnalysisBlock label="Brand Voice Rules" value="Global Brand Voice Rules and Conduit truth override external inspiration." />
            <AnalysisBlock label="Feedback Memory" value={feedbackMemorySummary.enabled && feedbackMemorySummary.topPreferences.length > 0 ? `Applied learned preferences: ${feedbackMemorySummary.topPreferences.slice(0, 3).join("; ")}.` : "No Feedback Memory preferences applied."} />
            <AnalysisBlock label="Approved examples" value="Recent approved examples for this profile may be used as style examples when enabled." />
            <AnalysisBlock label="Brief type" value={campaign.repurposedFrom ? `Repurposed from ${campaign.repurposedFrom.label}` : campaign.campaignType ?? "Original"} />
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
          <span className="font-semibold">Approved and saved to Ready to Post</span>
          <Button size="sm" variant="secondary" onClick={() => setScreen("Ready to Post")}>
            View in Ready to Post
          </Button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const instruction = "Make it more Conduit: more specific, grounded in factory automation and real operations, less hypey, more direct, and closer to the selected brief and media context.";
            captureFeedbackMemory({
              sourceType: "regenerate",
              platform: post.platform,
              postingAccountId: post.profileId ?? campaign.profileId,
              postingAccountName: post.profileName ?? campaign.profileName,
              originalContent: displayContent,
              feedbackText: instruction,
              metadata: { quickAction: "Make it more Conduit" }
            });
            setRegenerateInstruction(instruction);
            setShowRegenerate(true);
          }}
        >
          Make it more Conduit
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowRegenerate((current) => !current)}
        >
          <Sparkles size={16} /> Regenerate
        </Button>
        <Button variant="secondary" onClick={() => void handleSendToManagerReview()}>
          Send to manager for feedback
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
