import type {
  BrandVoiceProfile,
  Campaign,
  GeneratedPost,
  LibrarySource,
  LibrarySourceCategory,
  LibrarySourcePlatform,
  Platform,
  Profile,
  ProfileType,
  SourceUrlType,
  SyncStatus,
  VoiceSource,
  VoiceSourcePlatform,
  VoiceSourcePurpose,
  VoiceSourceType
} from "@/lib/types";

export const platforms: Platform[] = ["LinkedIn", "X", "Instagram", "TikTok"];
export const profileTypes: ProfileType[] = [
  "Company Account",
  "Founder",
  "Team Member",
  "Internal Voice",
  "Inspiration / Reference",
  "Competitor / Market Watch",
  "Customer / Audience Persona",
  "Other"
];
export const voiceSourceTypes: VoiceSourceType[] = [
  "Founder",
  "Company",
  "Social Team",
  "Customer Story",
  "Investor",
  "Recruiting",
  "Other"
];
export const voiceSourcePlatforms: VoiceSourcePlatform[] = [
  "X",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "Newsletter",
  "Mixed"
];
export const voiceSourcePurposes: VoiceSourcePurpose[] = [
  "Use for Voice",
  "Use for Inspiration",
  "Use for Examples"
];
export const sourceUrlTypes: SourceUrlType[] = [
  "Social Profile URL",
  "Social Post URL",
  "Website URL",
  "Document URL",
  "Other"
];
export const syncStatuses: SyncStatus[] = [
  "Manual Only",
  "Ready for Future Sync",
  "Connected Later"
];
export const librarySourceCategories: LibrarySourceCategory[] = [
  "Founder Social",
  "Company Social",
  "Website",
  "Blog",
  "Marketing",
  "Investor",
  "Customer Story",
  "Recruiting",
  "Other"
];
export const librarySourcePlatforms: LibrarySourcePlatform[] = [
  "LinkedIn",
  "X",
  "Instagram",
  "TikTok",
  "Website",
  "Document",
  "Mixed"
];

export const initialPosts: GeneratedPost[] = [
];

export const initialCampaigns: Campaign[] = [
];

export const initialProfiles: Profile[] = [
];

export const defaultPastPosts = "";

export const defaultBrandVoice: BrandVoiceProfile = {
  tone: "Clear, confident, practical, warm",
  style: "Short hooks, plain language, useful framing, no hype",
  audience: "Founders, marketing leads, solo operators, content teams",
  avoid: "Generic buzzwords, forced virality, overexplaining, hard selling"
};

export const initialVoiceSources: VoiceSource[] = [
];

export const initialLibrarySources: LibrarySource[] = [
];
