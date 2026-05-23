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
export type QueueStatus = "Ready" | "Scheduled" | "Posted" | "Archived";
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

export type BrandSafetyStatus = "Safe" | "Needs review" | "Risky";

export type BrandSafetyCheck = {
  status: BrandSafetyStatus;
  notes: string[];
  checkedAt: string;
  source: "AI" | "Fallback";
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

export type GeneratedPost = {
  id: string;
  platform: Platform;
  postCopy?: string;
  content: string;
  status: PostStatus;
  score: number;
  generatedBy?: "AI" | "Mock";
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
  mediaContext?: CampaignMediaContext;
  profileId?: string;
  profileName?: string;
  profileType?: ProfileType;
  profileRole?: string;
  voiceInfluenceIds?: string[];
  voiceInfluenceNames?: string[];
  inspirationProfileIds?: string[];
  inspirationProfileNames?: string[];
  simpleStyleChips?: SimpleStyleChip[];
  simpleStyleInstructions?: string[];
  voiceSourceId?: string;
  voiceSourceName?: string;
  sourceLibraryIds?: string[];
  sourceLibraryNames?: string[];
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
  profileId?: string;
  profileName?: string;
  campaignId: string;
  campaignName: string;
  generatedPostId: string;
  platform: Platform;
  contentAngle?: ContentAngle;
  intent?: string;
  content: string;
  postCopy?: string;
  mediaUsed: boolean;
  mediaAssetId?: string;
  mediaAssetName?: string;
  mediaPublicUrl?: string;
  mediaStoragePath?: string;
  livePostUrl?: string;
  postedAt?: string;
  publishNotes?: string;
  isSandbox?: boolean;
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
};

export type LibrarySourceAnalysis = {
  voiceTraits: string;
  commonTopics: string;
  repeatedPhrases: string;
  strongHooks: string;
  proofPoints: string;
  avoid: string;
  bestUseCases: string;
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
  updatedAt: string;
};
