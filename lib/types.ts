export type Platform = "LinkedIn" | "X" | "Instagram" | "TikTok";
export type VoiceSourcePlatform =
  | Platform
  | "Newsletter"
  | "Mixed";
export type VoiceSourceType =
  | "Founder"
  | "Company"
  | "Social Team"
  | "Customer Story"
  | "Investor"
  | "Recruiting"
  | "Other";
export type VoiceSourcePurpose =
  | "Use for Voice"
  | "Use for Inspiration"
  | "Use for Examples";
export type SourceUrlType =
  | "Social Profile URL"
  | "Social Post URL"
  | "Website URL"
  | "Document URL"
  | "Other";
export type SyncStatus =
  | "Manual Only"
  | "Ready for Future Sync"
  | "Connected Later";
export type ProfileType =
  | "Company Account"
  | "Founder"
  | "Team Member"
  | "Internal Voice"
  | "Inspiration / Reference"
  | "Competitor / Market Watch"
  | "Customer / Audience Persona"
  | "Other";
export type LibrarySourceCategory =
  | "Founder Social"
  | "Company Social"
  | "Website"
  | "Blog"
  | "Marketing"
  | "Investor"
  | "Customer Story"
  | "Recruiting"
  | "Transcript / Meeting Notes"
  | "Founder Notes"
  | "Sales Notes"
  | "Customer Conversation"
  | "Investor Narrative"
  | "Product Notes"
  | "Other";
export type LibrarySourcePlatform =
  | "LinkedIn"
  | "X"
  | "Instagram"
  | "TikTok"
  | "Website"
  | "Document"
  | "Mixed";
export type PostStatus = "draft" | "approved" | "rejected";
export type QueueStatus = "Ready" | "Scheduled" | "Posted" | "Replied" | "Archived";
export type MediaKind = "image" | "video" | "audio";
export type CampaignTemplate =
  | "Founder build-in-public"
  | "Deployment win"
  | "Customer proof"
  | "Product launch"
  | "Behind the scenes"
  | "Industry POV"
  | "Technical explanation"
  | "Recruiting"
  | "Event recap"
  | "Other / blank";
export type ContentAngle =
  | "Founder build-in-public"
  | "Deployment win"
  | "Company update"
  | "Customer proof"
  | "Product launch"
  | "Behind the scenes"
  | "Industry POV"
  | "Technical explanation"
  | "Recruiting"
  | "Event recap"
  | "Other";

export type SimpleStyleChip =
  | "Conduit default"
  | "More founder-led"
  | "More technical"
  | "Bolder"
  | "More polished"
  | "More concise";

export type ContentOrigin =
  | "AI-generated"
  | "Manually written"
  | "AI-improved from manual draft"
  | "Repurposed";

export type SourceCaptureStatus = "New" | "Triaged" | "Routed" | "Archived";

export type IntakeDestination =
  | "Company Knowledge"
  | "Opportunity Inbox"
  | "Profile Voice Source"
  | "Inspiration / Reference Profile"
  | "Competitor / Market Watch"
  | "Audience Persona"
  | "Media Library"
  | "Create Post / Content Brief"
  | "Manual review only";

export type IntakeStatus =
  | "Classified"
  | "Routed"
  | "Saved"
  | "Needs review"
  | "Could not classify"
  | "Saved link only"
  | "Fetched"
  | "Analyzed"
  | "Fetched and analyzed"
  | "File unsupported"
  | "Failed";

export type IntakeClassification = {
  sourceKind: string;
  recommendedDestination: IntakeDestination;
  secondaryDestination?: IntakeDestination;
  confidence: "Low" | "Medium" | "High";
  why: string;
  useAs: "facts" | "voice" | "pattern-only" | "media" | "post idea" | "reply opportunity" | "manual review";
  influence?: Array<
    | "facts / claims"
    | "voice / style"
    | "pattern-only inspiration"
    | "media asset"
    | "post idea"
    | "reply opportunity"
    | "manual review"
  >;
  recommendedNextAction?: string;
  whyNotOthers?: string[];
  sensitiveRisk?: {
    hasRisk: boolean;
    notes: string[];
  };
  status: IntakeStatus;
  detectedPlatform?: ProfileSourcePlatform | "YouTube" | "Document" | "Media" | "Text";
  isSocial?: boolean;
  canFetchWebsite?: boolean;
};

export type SourceInboxDestinationScreen =
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

export type SourceInboxHistoryItem = {
  id: string;
  title: string;
  destination: IntakeDestination;
  status: IntakeStatus;
  createdAt: string;
  destinationScreen?: SourceInboxDestinationScreen;
  inputSummary?: string;
  triage?: IntakeClassification;
  confidence?: "Low" | "Medium" | "High";
  actionTaken?: string;
  recordId?: string;
};

export type SourceCapture = {
  id: string;
  title: string;
  url: string;
  selectedText: string;
  capturedAt: string;
  sourceDomain: string;
  detectedPlatform: string;
  status: SourceCaptureStatus;
  triage?: unknown;
  destination?: string;
  routedRecordId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLogStatus = "success" | "warning" | "failed";

export type ActivityLogItem = {
  id: string;
  actionType: string;
  objectType: string;
  objectId?: string;
  title: string;
  summary: string;
  destination?: string;
  status: ActivityLogStatus;
  userEmail?: string;
  workspaceName?: string;
  metadata?: Record<string, unknown>;
  undo?: {
    type: string;
    payload: unknown;
    label?: string;
  };
  createdAt: string;
};

export type ReviewLinkScopeType =
  | "This week"
  | "Selected date range"
  | "Selected posts/replies"
  | "Ready to Post only"
  | "Scheduled content only";

export type ReviewPermissionLevel =
  | "View only"
  | "Comment only"
  | "Can suggest edits"
  | "Can approve/request changes";

export type ReviewLink = {
  id: string;
  token: string;
  scopeType: ReviewLinkScopeType;
  scope: {
    startDate?: string;
    endDate?: string;
    itemIds?: string[];
  };
  permissionLevel: ReviewPermissionLevel;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  disabledAt?: string;
};

export type ReviewFeedbackStatus =
  | "comment"
  | "approved"
  | "changes_requested"
  | "reviewed"
  | "ready_to_post"
  | "resolved";

export type ReviewFeedback = {
  id: string;
  reviewLinkId?: string;
  contentType: "Post" | "Reply";
  contentId: string;
  reviewerName: string;
  comment: string;
  suggestedEdit?: string;
  status: ReviewFeedbackStatus;
  createdAt: string;
};

export type InspirationPatternPlatform =
  | "X"
  | "LinkedIn"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "Website"
  | "Other";

export type InspirationPatternSourceType =
  | "brand"
  | "creator"
  | "competitor"
  | "media team"
  | "customer/audience"
  | "trend"
  | "other";

export type InspirationPatternAnalysis = {
  hookPattern: string;
  postStructure: string;
  visualStyle: string;
  toneEnergy: string;
  pacing: string;
  ctaPattern: string;
  whyItWorks: string;
  conduitAdaptation: string;
  whatNotToCopy: string;
  safetyNotes: string;
  bestPlatforms: string[];
};

export type InspirationPattern = {
  id: string;
  title: string;
  sourceUrl: string;
  platform: InspirationPatternPlatform;
  sourceType: InspirationPatternSourceType;
  notes: string;
  screenshot?: {
    filename: string;
    fileType: string;
    size: number;
    dataUrl?: string;
    analysisText?: string;
  };
  pastedText: string;
  fetchedContent?: string;
  tags: string[];
  patternOnly: boolean;
  analysis?: InspirationPatternAnalysis;
  status: "saved" | "fetched" | "analyzed" | "needs content" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type ProfileVoicePlatform =
  | Platform
  | "Founder notes"
  | "Transcript"
  | "Other";

export type ProfileSourcePlatform =
  | "X"
  | "LinkedIn"
  | "Instagram"
  | "TikTok"
  | "Website"
  | "Website/blog"
  | "Other URL";

export type ProfileSourceType =
  | "internal voice"
  | "company account"
  | "inspiration/reference"
  | "competitor/market watch"
  | "audience/persona";

export type ProfileSourceSyncStatus =
  | "stored only"
  | "analyzed"
  | "public page analyzed"
  | "fetch blocked"
  | "needs screenshot/text"
  | "API sync available later"
  | "fetched, ready to analyze"
  | "ready to sync"
  | "needs API"
  | "synced"
  | "failed";

export type ProfileSourceKind =
  | "account URL"
  | "post URL"
  | "website"
  | "screenshot"
  | "pasted text"
  | "notes";

export type ProfileVoiceAnalysis = {
  toneTraits: string[];
  sentenceStyle: string[];
  hookPatterns: string[];
  commonTopics: string[];
  repeatedPhrases: string[];
  phrasesToAvoid: string[];
  formattingHabits: string[];
  postStructures: string[];
  imitate: string[];
  doNotCopy: string[];
  platformPatterns: string[];
  confidenceLevel?: "Low" | "Medium" | "High";
};

export type ProfileVoiceExample = {
  id: string;
  title: string;
  platform: ProfileVoicePlatform;
  content: string;
  notes: string;
  useAsVoice: boolean;
  patternOnly: boolean;
  analysis?: ProfileVoiceAnalysis;
  generatedBy?: "AI" | "Fallback";
  createdAt: string;
  updatedAt: string;
};

export type ProfileVoiceSource = {
  id: string;
  title: string;
  sourceKind: ProfileSourceKind;
  url: string;
  platform: ProfileSourcePlatform;
  screenshot?: {
    filename: string;
    fileType: string;
    size: number;
    dataUrl?: string;
    analysisText?: string;
  };
  pastedText?: string;
  fetchedContent?: string;
  sourceType: ProfileSourceType;
  syncStatus: ProfileSourceSyncStatus;
  lastSynced: string;
  lastAnalyzed?: string;
  notes: string;
  patternOnly: boolean;
  analysis?: ProfileVoiceAnalysis;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityType =
  | "Trend"
  | "Mention / shoutout"
  | "Reply opportunity"
  | "Competitor post"
  | "News / article"
  | "Customer story"
  | "Founder thought"
  | "Sales note"
  | "Other";

export type OpportunityUrgency = "Low" | "Medium" | "High";

export type OpportunityStatus =
  | "New"
  | "Reviewed"
  | "Reply drafted"
  | "Post drafted"
  | "Drafted"
  | "Queued"
  | "Posted"
  | "Archived";

export type OpportunityPlatform =
  | Platform
  | "Website"
  | "Other";

export type OpportunityAnalysis = {
  whyItMatters: string;
  suggestedConduitAngle: string;
  suggestedContentType: string;
  suggestedPlatforms: Platform[];
  recommendation: "Reply" | "Standalone post" | "Monitor" | "Save as context";
  relevantBrainThemes: string[];
  riskNotes: string;
  suggestedFirstDraftIdea: string;
};

export type ReviewWorkflowStatus =
  | "Draft"
  | "Sent for review"
  | "Changes requested"
  | "Revised"
  | "Manager approved"
  | "Manager marked ready to post"
  | "Needs review"
  | "Approved"
  | "Ready to Post"
  | "Ready to Reply"
  | "Posted"
  | "Replied"
  | "Archived";

export type ReviewMetadata = {
  reviewerName?: string;
  status: ReviewWorkflowStatus;
  feedback?: string;
  requestedAt?: string;
  reviewedAt?: string;
};

export type OpportunityReplyDraft = {
  id: string;
  shortReply: string;
  warmerReply: string;
  founderLedReply: string;
  longerReply?: string;
  recommendedPlatform: Platform;
  toneNotes: string;
  brandSafetyNotes: string[];
  selectedReply?: "shortReply" | "warmerReply" | "founderLedReply" | "longerReply";
  approvedReply?: string;
  review?: ReviewMetadata;
  status: "Draft" | "Approved" | "Archived";
  createdAt: string;
  updatedAt: string;
};

export type Opportunity = {
  id: string;
  title: string;
  opportunityType: OpportunityType;
  sourceUrl: string;
  platform: OpportunityPlatform;
  pastedText: string;
  screenshot?: {
    filename: string;
    fileType: string;
    size: number;
    dataUrl?: string;
  };
  urgency: OpportunityUrgency;
  status: OpportunityStatus;
  tags: string[];
  analysis?: OpportunityAnalysis;
  replyDrafts?: OpportunityReplyDraft[];
  relatedCampaignId?: string;
  relatedPostIds?: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandSafetyStatus = "Safe" | "Needs review" | "Risky";

export type ClaimType =
  | "Approved claim"
  | "Needs review"
  | "Do not say"
  | "Customer-sensitive"
  | "Proof-backed"
  | "Internal only";

export type ClaimSourceType =
  | "website"
  | "document"
  | "transcript"
  | "approved post"
  | "manual entry"
  | "customer story"
  | "other";

export type ClaimRiskLevel = "Low" | "Medium" | "High";

export type ClaimMatch = {
  claimId?: string;
  claimText: string;
  claimType: ClaimType | "Unsupported";
  riskLevel?: ClaimRiskLevel;
  note: string;
  matchedText?: string;
};

export type BrandSafetyCheck = {
  status: BrandSafetyStatus;
  notes: string[];
  claimMatches?: ClaimMatch[];
  checkedAt: string;
  source: "AI" | "Fallback";
};

export type ClaimLibraryItem = {
  id: string;
  claimText: string;
  claimType: ClaimType;
  supportingSourceId?: string;
  supportingSourceName?: string;
  sourceType: ClaimSourceType;
  notes?: string;
  riskLevel: ClaimRiskLevel;
  reviewedBy?: string;
  reviewedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MediaAnalysis = {
  description?: string;
  angles?: string[];
  captionIdeas?: string[];
  warnings?: string[];
};

export type CampaignMediaContext = {
  type?: MediaKind;
  filename?: string;
  notes?: string;
  analysis?: MediaAnalysis;
  assetId?: string;
  assetName?: string;
  publicUrl?: string;
  storagePath?: string;
};

export type MediaAsset = {
  id: string;
  filename: string;
  fileType: string;
  mediaType: MediaKind;
  storagePath?: string;
  publicUrl?: string;
  localPreviewUrl?: string;
  uploadedAt: string;
  description?: string;
  suggestedAngles?: string[];
  overlayText?: string;
  sensitivityWarnings?: string[];
  altText?: string;
  tags?: string[];
  notes?: string;
};

export type SocialConnection = {
  id: string;
  provider: "instagram";
  accountLabel: string;
  integrationPath?: "Instagram Login path" | "Facebook Page / Graph API path";
  accountId: string;
  pageId: string;
  instagramUserId?: string;
  instagramUsername?: string;
  accountType?: "Creator" | "Business" | "";
  tokenStatus?: "Not configured" | "Available server-side" | "Expired";
  accessTokenStatus:
    | "Not provided"
    | "Available but not stored"
    | "Use server env var"
    | "Placeholder only";
  status:
    | "Sandbox setup available"
    | "Sandbox configured"
    | "Test publishing not enabled"
    | "Test publishing enabled"
    | "connected_sandbox"
    | "needs_token_storage"
    | "disconnected";
  isSandbox: boolean;
  connectedAt?: string;
  metadata: {
    integrationPath?: "Instagram Login path" | "Facebook Page / Graph API path";
    metaAppId?: string;
    instagramUserId?: string;
    instagramUsername?: string;
    accountType?: "Creator" | "Business" | "";
    tokenStatus?: "Not configured" | "Available server-side" | "Expired";
    tokenStorage?: string;
    tokenExpirationDate?: string;
    notes?: string;
    connectedAt?: string;
    disconnectedAt?: string;
    publishingEnabled?: boolean;
    warning?: string;
    instagramLoginConfigured?: boolean;
    instagramUserIdAvailable?: boolean;
    professionalAccountReady?: boolean;
    accountTypeReady?: boolean;
    pageAccessTokenAvailable?: boolean;
    businessAccountReady?: boolean;
    facebookPageConnected?: boolean;
    metaAppExists?: boolean;
    redirectUrlConfigured?: boolean;
    permissionsConfigured?: boolean;
    accessTokenAvailable?: boolean;
    serverTokenStatus?: "available_server_side" | "missing" | "expired_or_invalid" | string;
    identityCheckStatus?: string;
    lastCheckedAt?: string;
    testPublishingEnabled?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type GeneratedPost = {
  id: string;
  platform: Platform;
  postCopy?: string;
  content: string;
  status: PostStatus;
  score: number;
  generatedBy?: "AI" | "Mock";
  contentOrigin?: ContentOrigin;
  manualSourceContent?: string;
  mediaUsed?: boolean;
  previousContent?: string;
  previousPostCopy?: string;
  rationale?: string;
  recommendedMediaUse?: string;
  altText?: string;
  overlayText?: string;
  cta?: string;
  hashtags?: string[];
  firstComment?: string;
  carouselIdeas?: string[];
  shotList?: string[];
  safetyCheck?: BrandSafetyCheck;
  profileId?: string;
  profileName?: string;
  profileType?: ProfileType;
  profileRole?: string;
  voiceSourceId?: string;
  voiceSourceName?: string;
  sourceLibraryIds?: string[];
  sourceLibraryNames?: string[];
  claimMatches?: ClaimMatch[];
  review?: ReviewMetadata;
};

export type Campaign = {
  id: string;
  name: string;
  idea: string;
  intent?: string;
  campaignTemplate?: CampaignTemplate;
  contentAngle?: ContentAngle;
  campaignType?: "Original" | "Repurposed";
  repurposedFrom?: {
    type: "campaign" | "post";
    campaignId: string;
    postId?: string;
    label: string;
    content?: string;
  };
  platforms: Platform[];
  posts: GeneratedPost[];
  createdAt: string;
  generatedBy?: "AI" | "Mock";
  contentOrigin?: ContentOrigin;
  manualSourceContent?: string;
  mediaContext?: CampaignMediaContext;
  profileId?: string;
  profileName?: string;
  profileType?: ProfileType;
  profileRole?: string;
  voiceInfluenceIds?: string[];
  voiceInfluenceNames?: string[];
  inspirationProfileIds?: string[];
  inspirationProfileNames?: string[];
  inspirationPatternIds?: string[];
  inspirationPatternNames?: string[];
  voiceExampleTitles?: string[];
  opportunityId?: string;
  opportunityTitle?: string;
  simpleStyleChips?: SimpleStyleChip[];
  simpleStyleInstructions?: string[];
  voiceSourceId?: string;
  voiceSourceName?: string;
  sourceLibraryIds?: string[];
  sourceLibraryNames?: string[];
  claimLibraryIds?: string[];
  claimLibraryApprovedClaims?: string[];
  claimLibraryNeedsReviewClaims?: string[];
  claimLibraryDoNotSayClaims?: string[];
};

export type ApprovedPostMemory = {
  id: string;
  profileId: string;
  campaignId: string;
  generatedPostId: string;
  platform: Platform;
  finalContent: string;
  supportingFields?: {
    rationale?: string;
    recommendedMediaUse?: string;
    altText?: string;
    overlayText?: string;
    cta?: string;
    hashtags?: string[];
    firstComment?: string;
    carouselIdeas?: string[];
    shotList?: string[];
    safetyCheck?: BrandSafetyCheck;
    review?: ReviewMetadata;
  };
  contentAngle?: ContentAngle;
  intent?: string;
  mediaUsed: boolean;
  createdAt: string;
};

export type RejectedPostMemory = {
  id: string;
  profileId?: string;
  campaignId: string;
  generatedPostId: string;
  platform: Platform;
  rejectedContent: string;
  contentAngle?: ContentAngle;
  intent?: string;
  reason?: string;
  createdAt: string;
};

export type PostQueueItem = {
  id: string;
  contentType?: "Post" | "Reply";
  profileId?: string;
  profileName?: string;
  campaignId: string;
  campaignName: string;
  opportunityId?: string;
  opportunityTitle?: string;
  generatedPostId: string;
  platform: Platform;
  contentAngle?: ContentAngle;
  intent?: string;
  content: string;
  postCopy?: string;
  contentOrigin?: ContentOrigin;
  manualSourceContent?: string;
  mediaUsed: boolean;
  mediaAssetId?: string;
  mediaAssetName?: string;
  mediaPublicUrl?: string;
  mediaStoragePath?: string;
  livePostUrl?: string;
  postedAt?: string;
  publishNotes?: string;
  isSandbox?: boolean;
  hiddenFromQueue?: boolean;
  managerReviewOnly?: boolean;
  metrics?: {
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
  };
  rationale?: string;
  recommendedMediaUse?: string;
  altText?: string;
  overlayText?: string;
  cta?: string;
  hashtags?: string[];
  firstComment?: string;
  carouselIdeas?: string[];
  shotList?: string[];
  safetyCheck?: BrandSafetyCheck;
  review?: ReviewMetadata;
  status: QueueStatus;
  plannedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type BrandVoiceProfile = {
  tone: string;
  style: string;
  audience: string;
  avoid: string;
};

export type FeedbackMemorySourceType =
  | "regenerate"
  | "edit"
  | "approval"
  | "rejection"
  | "review feedback"
  | "safety action"
  | "readiness action";

export type FeedbackMemoryItem = {
  id: string;
  sourceType: FeedbackMemorySourceType;
  platform?: Platform;
  postingAccountId?: string;
  postingAccountName?: string;
  originalContent?: string;
  revisedContent?: string;
  feedbackText?: string;
  inferredPreference: string;
  metadata?: Record<string, unknown>;
  important?: boolean;
  ignored?: boolean;
  createdAt: string;
};

export type FeedbackMemorySummary = {
  enabled: boolean;
  topPreferences: string[];
  platformPreferences: Record<string, string[]>;
  profilePreferences: Record<string, string[]>;
  confidence: "Low" | "Medium" | "High";
  eventCount: number;
};

export type VoiceAnalysis = {
  tone: string;
  commonHooks: string;
  commonPhrases: string;
  sentenceStyle: string;
  avoid: string;
  bestUseCases: string;
};

export type VoiceSource = {
  id: string;
  name: string;
  type: VoiceSourceType;
  platform: VoiceSourcePlatform;
  purposes?: VoiceSourcePurpose[];
  urls?: string;
  urlType?: SourceUrlType;
  syncStatus?: SyncStatus;
  lastChecked?: string;
  notes?: string;
  examples: string;
  analysis: VoiceAnalysis;
  updatedAt: string;
};

export type PersonalitySummary = {
  voiceTraits: string;
  commonTopics: string;
  commonHooks: string;
  sentenceStyle: string;
  repeatedPhrases: string;
  avoid: string;
  bestPlatforms: string;
  bestUseCases: string;
};

export type Profile = {
  id: string;
  name: string;
  type: ProfileType;
  role: string;
  bio: string;
  linkedInUrl: string;
  xUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  otherUrls: string;
  examples: string;
  notes: string;
  syncStatus: SyncStatus;
  lastChecked: string;
  personality: PersonalitySummary;
  updatedAt: string;
  avatarUrl?: string;
  avatarStoragePath?: string;
  whatWeLike?: string;
  patternsToLearn?: string;
  thingsNotToCopy?: string;
  voiceExamples?: ProfileVoiceExample[];
  voiceSources?: ProfileVoiceSource[];
};

export type LibrarySourceAnalysis = {
  voiceTraits: string;
  commonTopics: string;
  repeatedPhrases: string;
  strongHooks: string;
  proofPoints: string;
  avoid: string;
  bestUseCases: string;
  keyThemes?: string[];
  usefulPhrases?: string[];
  customerPainPoints?: string[];
  productClaims?: string[];
  founderVoiceExamples?: string[];
  postIdeas?: string[];
  safetyNotes?: string[];
};

export type KnowledgeDocument = {
  id: string;
  filename: string;
  fileType: string;
  storagePath?: string;
  publicUrl?: string;
  extractedTextLength: number;
  uploadedAt: string;
};

export type LibrarySource = {
  id: string;
  name: string;
  category: LibrarySourceCategory;
  platform: LibrarySourcePlatform;
  urls: string;
  urlType?: SourceUrlType;
  syncStatus?: SyncStatus;
  lastChecked?: string;
  content: string;
  notes: string;
  analysis: LibrarySourceAnalysis;
  documents?: KnowledgeDocument[];
  useFor?: string[];
  reviewStatus?: "Needs review" | "Used in Brain" | "Save only";
  speakerLabels?: string;
  transcriptDate?: string;
  tags?: string[];
  updatedAt: string;
};
