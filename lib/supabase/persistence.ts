import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  ApprovedPostMemory,
  ActivityLogItem,
  BrandSafetyCheck,
  BrandVoiceProfile,
  Campaign,
  CampaignMediaContext,
  ClaimLibraryItem,
  FeedbackMemoryItem,
  GeneratedPost,
  InspirationPattern,
  KnowledgeDocument,
  LibrarySource,
  MediaAsset,
  Opportunity,
  Platform,
  PostQueueItem,
  Profile,
  RejectedPostMemory,
  ReviewFeedback,
  ReviewLink,
  SocialConnection,
  SourceCapture
} from "@/lib/types";

export type StorageMode = "local" | "supabase";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type WorkspaceContext = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

let activeWorkspaceId = "";

export function setActiveWorkspaceId(workspaceId: string) {
  activeWorkspaceId = workspaceId;
}

function workspaceIdOrThrow() {
  if (!activeWorkspaceId) {
    throw new Error("No active workspace is selected.");
  }
  return activeWorkspaceId;
}

function scopedSelect(query: any, workspaceId: string) {
  return query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
}

export type PersistedAppData = {
  campaigns: Campaign[];
  profiles: Profile[];
  librarySources: LibrarySource[];
  brandVoice?: BrandVoiceProfile;
  approvedPosts: ApprovedPostMemory[];
  rejectedPosts: RejectedPostMemory[];
  postQueue: PostQueueItem[];
  mediaAssets: MediaAsset[];
  socialConnections: SocialConnection[];
  inspirationPatterns: InspirationPattern[];
  opportunities: Opportunity[];
  feedbackMemory: FeedbackMemoryItem[];
  sourceCaptures: SourceCapture[];
  activityLog: ActivityLogItem[];
  claimLibrary: ClaimLibraryItem[];
  reviewLinks: ReviewLink[];
  reviewFeedback: ReviewFeedback[];
  postQueueLoadError?: string;
};

type CampaignRow = {
  id: string;
  workspace_id?: string | null;
  title: string;
  raw_idea: string;
  selected_profile_id: string | null;
  selected_knowledge_base_ids: string[] | null;
  selected_platforms: Platform[] | null;
  media_metadata_json: Record<string, unknown> | null;
  media_analysis_json: CampaignMediaContext["analysis"] | null;
  generation_source: "AI" | "Mock" | null;
  created_at: string;
};

type GeneratedPostRow = {
  id: string;
  campaign_id: string;
  platform: Platform;
  option_label: string | null;
  variant_number: number | null;
  content_json: {
    content?: string;
    postCopy?: string;
    score?: number;
    generatedBy?: "AI" | "Mock";
    contentOrigin?: GeneratedPost["contentOrigin"];
    manualSourceContent?: string;
    mediaUsed?: boolean;
    rationale?: string;
    recommendedMediaUse?: string;
    altText?: string;
    overlayText?: string;
    cta?: string;
    hashtags?: string[];
    firstComment?: string;
    carouselIdeas?: string[];
    shotList?: string[];
    profileName?: string;
    profileType?: string;
    profileRole?: string;
    sourceLibraryIds?: string[];
    sourceLibraryNames?: string[];
    safetyCheck?: BrandSafetyCheck;
    review?: GeneratedPost["review"];
  } | null;
  status: "draft" | "approved" | "rejected";
  previous_versions_json: string[] | null;
};

type SocialConnectionRow = {
  id: string;
  workspace_id?: string | null;
  provider: "instagram";
  account_label: string | null;
  integration_path?: SocialConnection["integrationPath"] | null;
  account_id: string | null;
  page_id: string | null;
  instagram_user_id?: string | null;
  instagram_username?: string | null;
  account_type?: SocialConnection["accountType"] | null;
  token_status?: SocialConnection["tokenStatus"] | null;
  connected_at?: string | null;
  access_token_encrypted_or_placeholder: string | null;
  status: SocialConnection["status"] | null;
  is_sandbox: boolean | null;
  metadata_json: SocialConnection["metadata"] | null;
  created_at: string;
  updated_at: string;
};

type InspirationPatternRow = {
  id: string;
  workspace_id?: string | null;
  title: string | null;
  source_url: string | null;
  platform: InspirationPattern["platform"] | null;
  source_type: InspirationPattern["sourceType"] | null;
  notes: string | null;
  screenshot_metadata_json: InspirationPattern["screenshot"] | null;
  pasted_text: string | null;
  tags: string[] | null;
  pattern_only: boolean | null;
  analysis_json: InspirationPattern["analysis"] | null;
  status: InspirationPattern["status"] | null;
  created_at: string;
  updated_at: string;
};

type ClaimLibraryRow = {
  id: string;
  workspace_id?: string | null;
  claim_text: string | null;
  claim_type: ClaimLibraryItem["claimType"] | null;
  supporting_source_id: string | null;
  source_type: ClaimLibraryItem["sourceType"] | null;
  notes: string | null;
  risk_level: ClaimLibraryItem["riskLevel"] | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: string;
  workspace_id?: string | null;
  title: string | null;
  opportunity_type: Opportunity["opportunityType"] | null;
  source_url: string | null;
  platform: Opportunity["platform"] | null;
  pasted_text: string | null;
  screenshot_metadata_json: Opportunity["screenshot"] | null;
  urgency: Opportunity["urgency"] | null;
  status: Opportunity["status"] | null;
  tags: string[] | null;
  analysis_json: Opportunity["analysis"] | null;
  reply_drafts_json?: Opportunity["replyDrafts"] | null;
  related_campaign_id: string | null;
  related_post_ids_json: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FeedbackMemoryRow = {
  id: string;
  workspace_id?: string | null;
  source_type: FeedbackMemoryItem["sourceType"];
  platform: Platform | null;
  posting_account_id: string | null;
  posting_account_name?: string | null;
  original_content: string | null;
  revised_content: string | null;
  feedback_text: string | null;
  inferred_preference: string | null;
  metadata_json: FeedbackMemoryItem["metadata"] | null;
  important?: boolean | null;
  ignored?: boolean | null;
  created_at: string;
};

type SourceCaptureRow = {
  id: string;
  workspace_id?: string | null;
  title: string | null;
  url: string | null;
  selected_text: string | null;
  source_domain: string | null;
  detected_platform: string | null;
  status: SourceCapture["status"] | null;
  triage_json: SourceCapture["triage"] | null;
  destination: string | null;
  routed_record_id: string | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityLogRow = {
  id: string;
  workspace_id?: string | null;
  action_type: string;
  object_type: string;
  object_id: string | null;
  title: string | null;
  summary: string | null;
  destination: string | null;
  metadata_json: ActivityLogItem["metadata"] | null;
  undo_json: ActivityLogItem["undo"] | null;
  status: ActivityLogItem["status"] | null;
  created_at: string;
};

type ReviewLinkRow = {
  id: string;
  workspace_id?: string | null;
  token: string;
  scope_type: ReviewLink["scopeType"] | null;
  scope_json: ReviewLink["scope"] | null;
  permission_level: ReviewLink["permissionLevel"] | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  disabled_at: string | null;
};

type ReviewFeedbackRow = {
  id: string;
  workspace_id?: string | null;
  review_link_id: string | null;
  content_type: ReviewFeedback["contentType"] | null;
  content_id: string | null;
  reviewer_name: string | null;
  comment: string | null;
  suggested_edit: string | null;
  status: ReviewFeedback["status"] | null;
  created_at: string;
};

export function appUsesSupabase() {
  return isSupabaseConfigured();
}

export async function getCurrentSupabaseUser() {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function sendPasswordResetEmail(email: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const redirectTo =
    typeof window === "undefined"
      ? undefined
      : `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });
  if (error) throw new Error(error.message);
}

export async function updateSupabasePassword(password: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function signOutOfSupabase() {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
  setActiveWorkspaceId("");
}

export async function getOrCreateDefaultWorkspace(): Promise<WorkspaceContext> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error(userError?.message ?? "Sign in is required.");
  }
  const userId = userData.user.id;

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .eq("user_id", userId)
    .limit(1);
  if (membershipError) throw new Error(membershipError.message);

  const existing = memberships?.[0] as any;
  if (existing?.workspaces?.id) {
    const context = {
      id: existing.workspaces.id,
      name: existing.workspaces.name ?? "Conduit",
      role: existing.role ?? "owner"
    } as WorkspaceContext;
    setActiveWorkspaceId(context.id);
    return context;
  }

  const workspaceId = `workspace-${Date.now()}`;
  const now = new Date().toISOString();
  const { error: workspaceError } = await supabase.from("workspaces").insert({
    id: workspaceId,
    name: "Conduit",
    owner_user_id: userId,
    created_at: now,
    updated_at: now
  });
  if (workspaceError) throw new Error(workspaceError.message);

  const { error: memberError } = await supabase.from("workspace_members").insert({
    id: `member-${Date.now()}`,
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
    created_at: now
  });
  if (memberError) throw new Error(memberError.message);

  const context: WorkspaceContext = { id: workspaceId, name: "Conduit", role: "owner" };
  setActiveWorkspaceId(context.id);
  return context;
}

export async function loadSupabaseData(workspaceId = workspaceIdOrThrow()): Promise<PersistedAppData> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    profilesResult,
    knowledgeResult,
    brandRulesResult,
    campaignsResult,
    postsResult,
    approvedPostsResult,
    rejectedPostsResult,
    postQueueResult,
    mediaAssetsResult,
    socialConnectionsResult,
    inspirationPatternsResult,
    opportunitiesResult,
    feedbackMemoryResult,
    sourceCapturesResult,
    activityLogResult,
    claimLibraryResult,
    reviewLinksResult,
    reviewFeedbackResult
  ] = await Promise.all([
    scopedSelect(supabase.from("profiles").select("*"), workspaceId).order("created_at", { ascending: false }),
    supabase
      .from("knowledge_base_items")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false }),
    scopedSelect(supabase.from("brand_rules").select("*"), workspaceId).limit(1).maybeSingle(),
    scopedSelect(supabase.from("campaigns").select("*"), workspaceId).order("created_at", { ascending: false }),
    scopedSelect(supabase.from("generated_posts").select("*"), workspaceId).order("variant_number", { ascending: true }),
    supabase
      .from("approved_posts")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("rejected_posts")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("post_queue")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("media_library")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("uploaded_at", { ascending: false })
      .limit(100),
    supabase
      .from("social_connections")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("inspiration_patterns")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("opportunities")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("feedback_memory")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("source_captures")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("captured_at", { ascending: false })
      .limit(100),
    supabase
      .from("activity_log")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("claim_library")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("review_links")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("review_feedback")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  if (postQueueResult.error) {
    console.error("[SCC] Supabase post_queue fetch failed", postQueueResult.error);
  } else {
    console.info("[SCC] Supabase post_queue fetch loaded", {
      count: postQueueResult.data?.length ?? 0
    });
  }

  const firstError =
    profilesResult.error ??
    knowledgeResult.error ??
    brandRulesResult.error ??
    campaignsResult.error ??
    postsResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const postsByCampaign = new Map<string, GeneratedPost[]>();
  ((postsResult.data ?? []) as GeneratedPostRow[]).forEach((row) => {
    const post = generatedPostFromRow(row as GeneratedPostRow);
    const current = postsByCampaign.get(row.campaign_id) ?? [];
    postsByCampaign.set(row.campaign_id, [...current, post]);
  });

  const profiles: Profile[] = (profilesResult.data ?? []).map(profileFromRow);
  const librarySources: LibrarySource[] = (knowledgeResult.data ?? []).map(librarySourceFromRow);
  const campaigns = ((campaignsResult.data ?? []) as CampaignRow[]).map((row) => {
    const campaign = campaignFromRow(row as CampaignRow, postsByCampaign.get(row.id) ?? []);
    const profile = profiles.find((item) => item.id === campaign.profileId);
    const selectedSources = librarySources.filter((item) =>
      (campaign.sourceLibraryIds ?? []).includes(item.id)
    );

    return {
      ...campaign,
      profileName: profile?.name,
      profileType: profile?.type,
      profileRole: profile?.role,
      voiceInfluenceNames:
        campaign.voiceInfluenceNames ??
        profiles
          .filter((item) => (campaign.voiceInfluenceIds ?? []).includes(item.id))
          .map((item) => item.name),
      inspirationProfileNames:
        campaign.inspirationProfileNames ??
        profiles
          .filter((item) => (campaign.inspirationProfileIds ?? []).includes(item.id))
          .map((item) => item.name),
      sourceLibraryNames: selectedSources.map((item) => item.name),
      posts: campaign.posts.map((post) => ({
        ...post,
        profileId: profile?.id,
        profileName: post.profileName ?? profile?.name,
        profileType: post.profileType ?? profile?.type,
        profileRole: post.profileRole ?? profile?.role,
        sourceLibraryIds: post.sourceLibraryIds?.length
          ? post.sourceLibraryIds
          : campaign.sourceLibraryIds,
        sourceLibraryNames: post.sourceLibraryNames?.length
          ? post.sourceLibraryNames
          : selectedSources.map((item) => item.name)
      }))
    };
  });

  return {
    profiles,
    librarySources,
    brandVoice: brandRulesResult.data
      ? {
          tone: brandRulesResult.data.tone ?? "",
          style: brandRulesResult.data.style ?? "",
          audience: brandRulesResult.data.audience ?? "",
          avoid: brandRulesResult.data.avoid ?? ""
        }
      : undefined,
    campaigns,
    approvedPosts: approvedPostsResult.error
      ? []
      : (approvedPostsResult.data ?? []).map(approvedPostFromRow),
    rejectedPosts: rejectedPostsResult.error
      ? []
      : (rejectedPostsResult.data ?? []).map(rejectedPostFromRow),
    postQueue: postQueueResult.error
      ? []
      : (postQueueResult.data ?? []).map(postQueueItemFromRow),
    mediaAssets: mediaAssetsResult.error
      ? []
      : (mediaAssetsResult.data ?? []).map(mediaAssetFromRow),
    socialConnections: socialConnectionsResult.error
      ? []
      : (socialConnectionsResult.data ?? []).map(socialConnectionFromRow),
    inspirationPatterns: inspirationPatternsResult.error
      ? []
      : ((inspirationPatternsResult.data ?? []) as InspirationPatternRow[]).map(inspirationPatternFromRow),
    opportunities: opportunitiesResult.error
      ? []
      : ((opportunitiesResult.data ?? []) as OpportunityRow[]).map(opportunityFromRow),
    feedbackMemory: feedbackMemoryResult.error
      ? []
      : ((feedbackMemoryResult.data ?? []) as FeedbackMemoryRow[]).map(feedbackMemoryFromRow),
    sourceCaptures: sourceCapturesResult.error
      ? []
      : ((sourceCapturesResult.data ?? []) as SourceCaptureRow[]).map(sourceCaptureFromRow),
    activityLog: activityLogResult.error
      ? []
      : ((activityLogResult.data ?? []) as ActivityLogRow[]).map(activityLogFromRow),
    claimLibrary: claimLibraryResult.error
      ? []
      : ((claimLibraryResult.data ?? []) as ClaimLibraryRow[]).map(claimLibraryFromRow),
    reviewLinks: reviewLinksResult.error
      ? []
      : ((reviewLinksResult.data ?? []) as ReviewLinkRow[]).map(reviewLinkFromRow),
    reviewFeedback: reviewFeedbackResult.error
      ? []
      : ((reviewFeedbackResult.data ?? []) as ReviewFeedbackRow[]).map(reviewFeedbackFromRow),
    postQueueLoadError: postQueueResult.error?.message
  };
}

export async function saveProfileToSupabase(profile: Profile) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("profiles").upsert(profileToRow(profile));
  if (error) throw new Error(error.message);
}

export async function deleteProfileFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveLibrarySourceToSupabase(source: LibrarySource) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("knowledge_base_items")
    .upsert(librarySourceToRow(source));
  if (error) throw new Error(error.message);
}

export async function deleteLibrarySourceFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("knowledge_base_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveInspirationPatternToSupabase(pattern: InspirationPattern) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("inspiration_patterns").upsert(inspirationPatternToRow(pattern));
  if (error) throw new Error(error.message);
}

export async function deleteInspirationPatternFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("inspiration_patterns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveOpportunityToSupabase(opportunity: Opportunity) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("opportunities").upsert(opportunityToRow(opportunity));
  if (error) throw new Error(error.message);
}

export async function saveFeedbackMemoryToSupabase(item: FeedbackMemoryItem) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("feedback_memory").upsert(feedbackMemoryToRow(item));
  if (error) throw new Error(error.message);
}

export async function deleteFeedbackMemoryFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("feedback_memory").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveSourceCaptureToSupabase(capture: SourceCapture) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("source_captures").upsert(sourceCaptureToRow(capture));
  if (error) throw new Error(error.message);
}

export async function deleteSourceCaptureFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("source_captures").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveActivityLogToSupabase(item: ActivityLogItem) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("activity_log").upsert(activityLogToRow(item));
  if (error) throw new Error(error.message);
}

export async function saveReviewLinkToSupabase(link: ReviewLink) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("review_links").upsert(reviewLinkToRow(link));
  if (error) throw new Error(error.message);
}

export async function saveReviewFeedbackToSupabase(feedback: ReviewFeedback) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("review_feedback").upsert(reviewFeedbackToRow(feedback));
  if (error) throw new Error(error.message);
}

export async function loadReviewFeedbackFromSupabase(workspaceId: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("review_feedback")
    .select("*")
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ReviewFeedbackRow[]).map(reviewFeedbackFromRow);
}

export async function deleteOpportunityFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveClaimLibraryItemToSupabase(item: ClaimLibraryItem) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("claim_library").upsert(claimLibraryToRow(item));
  if (error) throw new Error(error.message);
}

export async function deleteClaimLibraryItemFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("claim_library").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveBrandRulesToSupabase(brandRules: BrandVoiceProfile) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("brand_rules").upsert({
    id: `brand-${workspaceIdOrThrow()}`,
    workspace_id: workspaceIdOrThrow(),
    tone: brandRules.tone,
    style: brandRules.style,
    audience: brandRules.audience,
    avoid: brandRules.avoid,
    updated_at: new Date().toISOString()
  });
  if (error) throw new Error(error.message);
}

export async function saveCampaignToSupabase(campaign: Campaign, mediaFile?: File | null) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error: campaignError } = await supabase
    .from("campaigns")
    .upsert(campaignToRow(campaign));
  if (campaignError) throw new Error(campaignError.message);

  const platformCounts = new Map<Platform, number>();
  const postRows = campaign.posts.map((post) => {
    const nextIndex = platformCounts.get(post.platform) ?? 0;
    platformCounts.set(post.platform, nextIndex + 1);
    return generatedPostToRow(campaign.id, post, nextIndex);
  });

  if (postRows.length > 0) {
    const { error: postError } = await supabase.from("generated_posts").upsert(postRows);
    if (postError) throw new Error(postError.message);
  }

  if (mediaFile) {
    await uploadCampaignMediaToSupabase(campaign, mediaFile);
  }
}

export async function deleteCampaignFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveGeneratedPostToSupabase(
  campaignId: string,
  post: GeneratedPost,
  variantNumber = 1
) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("generated_posts")
    .upsert(generatedPostToRow(campaignId, post, variantNumber - 1));
  if (error) throw new Error(error.message);
}

export async function recordPostFeedbackToSupabase(
  generatedPostId: string,
  action: string,
  beforeContent?: string,
  afterContent?: string
) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("post_feedback").insert({
    workspace_id: workspaceIdOrThrow(),
    generated_post_id: generatedPostId,
    action,
    before_content: beforeContent,
    after_content: afterContent
  });
  if (error) throw new Error(error.message);
}

export async function saveApprovedPostToSupabase(memory: ApprovedPostMemory) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("approved_posts").upsert({
    id: memory.id,
    workspace_id: workspaceIdOrThrow(),
    profile_id: memory.profileId,
    campaign_id: memory.campaignId,
    generated_post_id: memory.generatedPostId,
    platform: memory.platform,
    final_content: memory.finalContent,
    supporting_json: memory.supportingFields ?? {},
    content_angle: memory.contentAngle,
    intent: memory.intent,
    media_used: memory.mediaUsed,
    created_at: memory.createdAt
  });
  if (error) throw new Error(error.message);
}

export async function deleteApprovedPostFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("approved_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveRejectedPostToSupabase(memory: RejectedPostMemory) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("rejected_posts").upsert({
    id: memory.id,
    workspace_id: workspaceIdOrThrow(),
    profile_id: memory.profileId ?? null,
    campaign_id: memory.campaignId,
    generated_post_id: memory.generatedPostId,
    platform: memory.platform,
    rejected_content: memory.rejectedContent,
    content_angle: memory.contentAngle,
    intent: memory.intent,
    reason: memory.reason,
    created_at: memory.createdAt
  });
  if (error) throw new Error(error.message);
}

export async function savePostQueueItemToSupabase(item: PostQueueItem) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const row = {
    id: item.id,
    workspace_id: workspaceIdOrThrow(),
    profile_id: item.profileId ?? null,
    profile_name: item.profileName ?? null,
    campaign_id: item.campaignId,
    campaign_name: item.campaignName,
    generated_post_id: item.generatedPostId,
    platform: item.platform,
    content_angle: item.contentAngle ?? null,
    intent: item.intent ?? null,
    content: item.content,
    supporting_json: {
      postCopy: item.postCopy,
      contentType: item.contentType ?? "Post",
      contentOrigin: item.contentOrigin,
      manualSourceContent: item.manualSourceContent,
      rationale: item.rationale,
      recommendedMediaUse: item.recommendedMediaUse,
      altText: item.altText,
      overlayText: item.overlayText,
      cta: item.cta,
      hashtags: item.hashtags,
      firstComment: item.firstComment,
      carouselIdeas: item.carouselIdeas,
      shotList: item.shotList,
      mediaAssetId: item.mediaAssetId,
      mediaAssetName: item.mediaAssetName,
      mediaPublicUrl: item.mediaPublicUrl,
      mediaStoragePath: item.mediaStoragePath,
      opportunityId: item.opportunityId,
      opportunityTitle: item.opportunityTitle,
      livePostUrl: item.livePostUrl,
      postedAt: item.postedAt,
      publishNotes: item.publishNotes,
      isSandbox: item.isSandbox,
      hiddenFromQueue: item.hiddenFromQueue,
      managerReviewOnly: item.managerReviewOnly,
      metrics: item.metrics ?? {},
      safetyCheck: item.safetyCheck,
      review: item.review
    },
    media_used: item.mediaUsed,
    status: item.status,
    planned_at: item.plannedAt || null,
    created_at: item.createdAt,
    updated_at: new Date().toISOString()
  };

  console.info("[SCC] Saving post_queue item", {
    id: item.id,
    generatedPostId: item.generatedPostId,
    campaignId: item.campaignId,
    platform: item.platform,
    status: item.status
  });

  const { error } = await supabase.from("post_queue").upsert(row);
  if (error) {
    console.error("[SCC] Supabase post_queue upsert failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      item
    });
    throw new Error(error.message);
  }

  console.info("[SCC] Supabase post_queue upsert succeeded", {
    id: item.id,
    generatedPostId: item.generatedPostId
  });
}

export async function deletePostQueueItemFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("post_queue").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveMediaAssetToSupabase(asset: MediaAsset, file?: File | null) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  let storedAsset = asset;
  if (file && !asset.storagePath) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${workspaceIdOrThrow()}/media-library/${asset.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("campaign-media")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true
      });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("campaign-media").getPublicUrl(storagePath);
    storedAsset = {
      ...asset,
      storagePath,
      publicUrl: data.publicUrl
    };
  }

  const { error } = await supabase.from("media_library").upsert(mediaAssetToRow(storedAsset));
  if (error) throw new Error(error.message);

  return storedAsset;
}

export async function saveSocialConnectionToSupabase(connection: SocialConnection) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("social_connections").upsert(socialConnectionToRow(connection));
  if (error) throw new Error(error.message);
}

export async function deleteMediaAssetFromSupabase(id: string) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("media_library").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadProfileAvatarToSupabase(profileId: string, file: File) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${workspaceIdOrThrow()}/profile-avatars/${profileId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("campaign-media")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("campaign-media").getPublicUrl(storagePath);
  return {
    avatarUrl: data.publicUrl,
    avatarStoragePath: storagePath
  };
}

export async function uploadKnowledgeDocumentToSupabase(sourceId: string, file: File) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${workspaceIdOrThrow()}/knowledge-documents/${sourceId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("campaign-media")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("campaign-media").getPublicUrl(storagePath);
  return {
    storagePath,
    publicUrl: data.publicUrl
  };
}

async function uploadCampaignMediaToSupabase(campaign: Campaign, file: File) {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${workspaceIdOrThrow()}/campaign-media/${campaign.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("campaign-media")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from("campaign-media")
    .getPublicUrl(storagePath);

  const { error: rowError } = await supabase.from("media_files").insert({
    workspace_id: workspaceIdOrThrow(),
    campaign_id: campaign.id,
    filename: file.name,
    file_type: file.type,
    storage_path: storagePath,
    public_url: publicUrlData.publicUrl,
    metadata_json: {
      size: file.size,
      mediaContext: campaign.mediaContext
    }
  });
  if (rowError) throw new Error(rowError.message);
}

function profileToRow(profile: Profile) {
  return {
    id: profile.id,
    workspace_id: workspaceIdOrThrow(),
    name: profile.name,
    type: profile.type,
    role_title: profile.role,
    bio: profile.bio,
    linkedin_url: profile.linkedInUrl,
    x_url: profile.xUrl,
    instagram_url: profile.instagramUrl,
    tiktok_url: profile.tiktokUrl,
    website_url: profile.websiteUrl,
    other_urls: profile.otherUrls,
    pasted_content: profile.examples,
    notes: profile.notes,
    sync_status: profile.syncStatus,
    last_checked: profile.lastChecked,
    personality_json: {
      ...profile.personality,
      _avatarUrl: profile.avatarUrl,
      _avatarStoragePath: profile.avatarStoragePath,
      _whatWeLike: profile.whatWeLike,
      _patternsToLearn: profile.patternsToLearn,
      _thingsNotToCopy: profile.thingsNotToCopy,
      _voiceExamples: profile.voiceExamples ?? [],
      _voiceSources: profile.voiceSources ?? []
    },
    updated_at: new Date().toISOString()
  };
}

function profileFromRow(row: any): Profile {
  const personality = row.personality_json ?? {};
  return {
    id: row.id,
    name: row.name ?? "Untitled Profile",
    type: row.type ?? "Other",
    role: row.role_title ?? "",
    bio: row.bio ?? "",
    linkedInUrl: row.linkedin_url ?? "",
    xUrl: row.x_url ?? "",
    instagramUrl: row.instagram_url ?? "",
    tiktokUrl: row.tiktok_url ?? "",
    websiteUrl: row.website_url ?? "",
    otherUrls: row.other_urls ?? "",
    examples: row.pasted_content ?? "",
    notes: row.notes ?? "",
    syncStatus: row.sync_status ?? "Manual Only",
    lastChecked: row.last_checked ?? "Never",
    personality: personality.voiceTraits ? personality : {
      voiceTraits: "Clear, practical, and grounded.",
      commonTopics: "Operations, growth, launches, and lessons learned.",
      commonHooks: "Start with a concrete observation.",
      sentenceStyle: "Direct sentences with specific examples.",
      repeatedPhrases: "Use the profile's pasted examples to learn this over time.",
      avoid: "Avoid generic hype.",
      bestPlatforms: "LinkedIn, X, Instagram, TikTok",
      bestUseCases: "Founder posts, company updates, and campaign drafts."
    },
    avatarUrl: personality._avatarUrl ?? undefined,
    avatarStoragePath: personality._avatarStoragePath ?? undefined,
    whatWeLike: personality._whatWeLike ?? "",
    patternsToLearn: personality._patternsToLearn ?? "",
    thingsNotToCopy: personality._thingsNotToCopy ?? "",
    voiceExamples: Array.isArray(personality._voiceExamples)
      ? personality._voiceExamples
      : [],
    voiceSources: Array.isArray(personality._voiceSources)
      ? personality._voiceSources
      : [],
    updatedAt: row.updated_at ?? ""
  };
}

function librarySourceToRow(source: LibrarySource) {
  return {
    id: source.id,
    workspace_id: workspaceIdOrThrow(),
    name: source.name,
    category: source.category,
    material_type: source.platform,
    urls: source.urls,
    url_type: source.urlType ?? "Website URL",
    pasted_content: source.content,
    notes: source.notes,
    sync_status: source.syncStatus ?? "Manual Only",
    last_checked: source.lastChecked ?? "Never",
    analysis_json: {
      ...source.analysis,
      _documents: source.documents ?? [],
      _useFor: source.useFor ?? [],
      _reviewStatus: source.reviewStatus,
      _speakerLabels: source.speakerLabels,
      _transcriptDate: source.transcriptDate,
      _tags: source.tags ?? []
    },
    updated_at: new Date().toISOString()
  };
}

function librarySourceFromRow(row: any): LibrarySource {
  const analysis = row.analysis_json ?? {};
  return {
    id: row.id,
    name: row.name ?? "Untitled Knowledge Item",
    category: row.category ?? "Other",
    platform: row.material_type ?? "Mixed",
    urls: row.urls ?? "",
    urlType: row.url_type ?? "Website URL",
    content: row.pasted_content ?? "",
    notes: row.notes ?? "",
    syncStatus: row.sync_status ?? "Manual Only",
    lastChecked: row.last_checked ?? "Never",
    analysis: analysis.voiceTraits ? analysis : {
        voiceTraits: "Clear and useful.",
        commonTopics: "Saved source material.",
        repeatedPhrases: "Add pasted content to learn repeated phrases.",
        strongHooks: "Lead with concrete proof.",
        proofPoints: "Use pasted material as the source of truth.",
        avoid: "Avoid unsupported claims.",
        bestUseCases: "Campaign context and factual grounding."
      },
    documents: Array.isArray(analysis._documents)
      ? (analysis._documents as KnowledgeDocument[])
      : [],
    useFor: Array.isArray(analysis._useFor) ? (analysis._useFor as string[]) : [],
    reviewStatus:
      analysis._reviewStatus === "Used in Brain" || analysis._reviewStatus === "Save only"
        ? analysis._reviewStatus
        : analysis._reviewStatus === "Needs review"
          ? "Needs review"
          : undefined,
    speakerLabels: typeof analysis._speakerLabels === "string" ? analysis._speakerLabels : "",
    transcriptDate: typeof analysis._transcriptDate === "string" ? analysis._transcriptDate : "",
    tags: Array.isArray(analysis._tags) ? (analysis._tags as string[]) : [],
    updatedAt: row.updated_at ?? ""
  };
}

function sourceCaptureToRow(capture: SourceCapture) {
  return {
    id: capture.id,
    workspace_id: workspaceIdOrThrow(),
    title: capture.title,
    url: capture.url,
    selected_text: capture.selectedText,
    source_domain: capture.sourceDomain,
    detected_platform: capture.detectedPlatform,
    status: capture.status,
    triage_json: capture.triage ?? null,
    destination: capture.destination ?? null,
    routed_record_id: capture.routedRecordId ?? null,
    captured_at: capture.capturedAt,
    created_at: capture.createdAt,
    updated_at: new Date().toISOString()
  };
}

function sourceCaptureFromRow(row: SourceCaptureRow): SourceCapture {
  return {
    id: row.id,
    title: row.title ?? "Browser capture",
    url: row.url ?? "",
    selectedText: row.selected_text ?? "",
    sourceDomain: row.source_domain ?? "",
    detectedPlatform: row.detected_platform ?? "Other",
    status:
      row.status === "New" ||
      row.status === "Triaged" ||
      row.status === "Routed" ||
      row.status === "Archived"
        ? row.status
        : "New",
    triage: row.triage_json ?? undefined,
    destination: row.destination ?? undefined,
    routedRecordId: row.routed_record_id ?? undefined,
    capturedAt: row.captured_at ?? row.created_at ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function activityLogToRow(item: ActivityLogItem) {
  return {
    id: item.id,
    workspace_id: workspaceIdOrThrow(),
    action_type: item.actionType,
    object_type: item.objectType,
    object_id: item.objectId ?? null,
    title: item.title,
    summary: item.summary,
    destination: item.destination ?? null,
    metadata_json: item.metadata ?? null,
    undo_json: item.undo ?? null,
    status: item.status,
    created_at: item.createdAt
  };
}

function activityLogFromRow(row: ActivityLogRow): ActivityLogItem {
  return {
    id: row.id,
    actionType: row.action_type,
    objectType: row.object_type,
    objectId: row.object_id ?? undefined,
    title: row.title ?? "Activity",
    summary: row.summary ?? "",
    destination: row.destination ?? undefined,
    status:
      row.status === "success" || row.status === "warning" || row.status === "failed"
        ? row.status
        : "success",
    metadata: row.metadata_json ?? undefined,
    undo: row.undo_json?.type ? row.undo_json : undefined,
    createdAt: row.created_at
  };
}

function reviewLinkToRow(link: ReviewLink) {
  return {
    id: link.id,
    workspace_id: workspaceIdOrThrow(),
    token: link.token,
    scope_type: link.scopeType,
    scope_json: link.scope,
    permission_level: link.permissionLevel,
    expires_at: link.expiresAt ?? null,
    created_by: link.createdBy ?? null,
    created_at: link.createdAt,
    disabled_at: link.disabledAt ?? null
  };
}

function reviewLinkFromRow(row: ReviewLinkRow): ReviewLink {
  return {
    id: row.id,
    token: row.token,
    scopeType: row.scope_type ?? "This week",
    scope: row.scope_json ?? {},
    permissionLevel: row.permission_level ?? "Comment only",
    expiresAt: row.expires_at ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    disabledAt: row.disabled_at ?? undefined
  };
}

function reviewFeedbackToRow(feedback: ReviewFeedback) {
  return {
    id: feedback.id,
    workspace_id: workspaceIdOrThrow(),
    review_link_id: feedback.reviewLinkId ?? null,
    content_type: feedback.contentType,
    content_id: feedback.contentId,
    reviewer_name: feedback.reviewerName,
    comment: feedback.comment,
    suggested_edit: feedback.suggestedEdit ?? null,
    status: feedback.status,
    created_at: feedback.createdAt
  };
}

function reviewFeedbackFromRow(row: ReviewFeedbackRow): ReviewFeedback {
  return {
    id: row.id,
    reviewLinkId: row.review_link_id ?? undefined,
    contentType: row.content_type ?? "Post",
    contentId: row.content_id ?? "",
    reviewerName: row.reviewer_name ?? "Manager",
    comment: row.comment ?? "",
    suggestedEdit: row.suggested_edit ?? undefined,
    status: row.status ?? "comment",
    createdAt: row.created_at
  };
}

function inspirationPatternToRow(pattern: InspirationPattern) {
  return {
    id: pattern.id,
    workspace_id: workspaceIdOrThrow(),
    title: pattern.title,
    source_url: pattern.sourceUrl,
    platform: pattern.platform,
    source_type: pattern.sourceType,
    notes: pattern.notes,
    screenshot_metadata_json: pattern.screenshot ?? null,
    pasted_text: pattern.pastedText,
    tags: pattern.tags,
    pattern_only: pattern.patternOnly,
    analysis_json: pattern.analysis ?? {},
    status: pattern.status,
    created_at: pattern.createdAt,
    updated_at: new Date().toISOString()
  };
}

function inspirationPatternFromRow(row: InspirationPatternRow): InspirationPattern {
  const analysis =
    row.analysis_json && Object.keys(row.analysis_json).length > 0
      ? row.analysis_json
      : undefined;

  return {
    id: row.id,
    title: row.title ?? "Untitled Pattern",
    sourceUrl: row.source_url ?? "",
    platform: row.platform ?? "Other",
    sourceType: row.source_type ?? "other",
    notes: row.notes ?? "",
    screenshot: row.screenshot_metadata_json ?? undefined,
    pastedText: row.pasted_text ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    patternOnly: row.pattern_only ?? true,
    analysis,
    status: row.status ?? (analysis ? "analyzed" : "saved"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function opportunityToRow(opportunity: Opportunity) {
  return {
    id: opportunity.id,
    workspace_id: workspaceIdOrThrow(),
    title: opportunity.title,
    opportunity_type: opportunity.opportunityType,
    source_url: opportunity.sourceUrl,
    platform: opportunity.platform,
    pasted_text: opportunity.pastedText,
    screenshot_metadata_json: opportunity.screenshot ?? null,
    urgency: opportunity.urgency,
    status: opportunity.status,
    tags: opportunity.tags,
    analysis_json: opportunity.analysis ?? {},
    reply_drafts_json: opportunity.replyDrafts ?? [],
    related_campaign_id: opportunity.relatedCampaignId ?? null,
    related_post_ids_json: opportunity.relatedPostIds ?? [],
    notes: opportunity.notes,
    created_at: opportunity.createdAt,
    updated_at: new Date().toISOString()
  };
}

function opportunityFromRow(row: OpportunityRow): Opportunity {
  const analysis =
    row.analysis_json && Object.keys(row.analysis_json).length > 0
      ? row.analysis_json
      : undefined;

  return {
    id: row.id,
    title: row.title ?? "Untitled Opportunity",
    opportunityType: row.opportunity_type ?? "Other",
    sourceUrl: row.source_url ?? "",
    platform: row.platform ?? "Other",
    pastedText: row.pasted_text ?? "",
    screenshot: row.screenshot_metadata_json ?? undefined,
    urgency: row.urgency ?? "Medium",
    status: row.status ?? "New",
    tags: Array.isArray(row.tags) ? row.tags : [],
    analysis,
    replyDrafts: Array.isArray(row.reply_drafts_json) ? row.reply_drafts_json : [],
    relatedCampaignId: row.related_campaign_id ?? undefined,
    relatedPostIds: Array.isArray(row.related_post_ids_json) ? row.related_post_ids_json : [],
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function feedbackMemoryToRow(item: FeedbackMemoryItem) {
  return {
    id: item.id,
    workspace_id: workspaceIdOrThrow(),
    source_type: item.sourceType,
    platform: item.platform ?? null,
    posting_account_id: item.postingAccountId ?? null,
    posting_account_name: item.postingAccountName ?? null,
    original_content: item.originalContent ?? null,
    revised_content: item.revisedContent ?? null,
    feedback_text: item.feedbackText ?? null,
    inferred_preference: item.inferredPreference,
    metadata_json: item.metadata ?? {},
    important: Boolean(item.important),
    ignored: Boolean(item.ignored),
    created_at: item.createdAt
  };
}

function feedbackMemoryFromRow(row: FeedbackMemoryRow): FeedbackMemoryItem {
  return {
    id: row.id,
    sourceType: row.source_type,
    platform: row.platform ?? undefined,
    postingAccountId: row.posting_account_id ?? undefined,
    postingAccountName: row.posting_account_name ?? undefined,
    originalContent: row.original_content ?? undefined,
    revisedContent: row.revised_content ?? undefined,
    feedbackText: row.feedback_text ?? undefined,
    inferredPreference: row.inferred_preference ?? "Prefer clearer, more specific Conduit language.",
    metadata: row.metadata_json ?? {},
    important: Boolean(row.important),
    ignored: Boolean(row.ignored),
    createdAt: row.created_at
  };
}

function campaignToRow(campaign: Campaign) {
  const mediaContext = campaign.mediaContext;
  const mediaMetadata = mediaContext
    ? {
        type: mediaContext.type,
        filename: mediaContext.filename,
        notes: mediaContext.notes,
        assetId: mediaContext.assetId,
        assetName: mediaContext.assetName,
        publicUrl: mediaContext.publicUrl,
        storagePath: mediaContext.storagePath,
        intent: campaign.intent,
        campaignTemplate: campaign.campaignTemplate,
        contentAngle: campaign.contentAngle,
        campaignType: campaign.campaignType,
        repurposedFrom: campaign.repurposedFrom,
        voiceInfluenceIds: campaign.voiceInfluenceIds,
        voiceInfluenceNames: campaign.voiceInfluenceNames,
        inspirationProfileIds: campaign.inspirationProfileIds,
        inspirationProfileNames: campaign.inspirationProfileNames,
        inspirationPatternIds: campaign.inspirationPatternIds,
        inspirationPatternNames: campaign.inspirationPatternNames,
        opportunityId: campaign.opportunityId,
        opportunityTitle: campaign.opportunityTitle,
        voiceExampleTitles: campaign.voiceExampleTitles,
        simpleStyleChips: campaign.simpleStyleChips,
        simpleStyleInstructions: campaign.simpleStyleInstructions,
        contentOrigin: campaign.contentOrigin,
        manualSourceContent: campaign.manualSourceContent,
        claimLibraryIds: campaign.claimLibraryIds,
        claimLibraryApprovedClaims: campaign.claimLibraryApprovedClaims,
        claimLibraryNeedsReviewClaims: campaign.claimLibraryNeedsReviewClaims,
        claimLibraryDoNotSayClaims: campaign.claimLibraryDoNotSayClaims
      }
    : {
        intent: campaign.intent,
        campaignTemplate: campaign.campaignTemplate,
        contentAngle: campaign.contentAngle,
        campaignType: campaign.campaignType,
        repurposedFrom: campaign.repurposedFrom,
        voiceInfluenceIds: campaign.voiceInfluenceIds,
        voiceInfluenceNames: campaign.voiceInfluenceNames,
        inspirationProfileIds: campaign.inspirationProfileIds,
        inspirationProfileNames: campaign.inspirationProfileNames,
        inspirationPatternIds: campaign.inspirationPatternIds,
        inspirationPatternNames: campaign.inspirationPatternNames,
        opportunityId: campaign.opportunityId,
        opportunityTitle: campaign.opportunityTitle,
        voiceExampleTitles: campaign.voiceExampleTitles,
        simpleStyleChips: campaign.simpleStyleChips,
        simpleStyleInstructions: campaign.simpleStyleInstructions,
        contentOrigin: campaign.contentOrigin,
        manualSourceContent: campaign.manualSourceContent,
        claimLibraryIds: campaign.claimLibraryIds,
        claimLibraryApprovedClaims: campaign.claimLibraryApprovedClaims,
        claimLibraryNeedsReviewClaims: campaign.claimLibraryNeedsReviewClaims,
        claimLibraryDoNotSayClaims: campaign.claimLibraryDoNotSayClaims
      };

  return {
    id: campaign.id,
    workspace_id: workspaceIdOrThrow(),
    title: campaign.name,
    raw_idea: campaign.idea,
    selected_profile_id: campaign.profileId ?? null,
    selected_knowledge_base_ids: campaign.sourceLibraryIds ?? [],
    selected_platforms: campaign.platforms,
    media_metadata_json: mediaMetadata,
    media_analysis_json: mediaContext?.analysis ?? null,
    generation_source: campaign.generatedBy ?? "Mock",
    updated_at: new Date().toISOString()
  };
}

function campaignFromRow(row: CampaignRow, posts: GeneratedPost[]): Campaign {
  const mediaMetadata = row.media_metadata_json ?? {};
  const {
    intent,
    campaignTemplate,
    contentAngle,
    campaignType,
    repurposedFrom,
    voiceInfluenceIds,
    voiceInfluenceNames,
    inspirationProfileIds,
    inspirationProfileNames,
    inspirationPatternIds,
    inspirationPatternNames,
    opportunityId,
    opportunityTitle,
    voiceExampleTitles,
    simpleStyleChips,
    simpleStyleInstructions,
    contentOrigin,
    manualSourceContent,
    claimLibraryIds,
    claimLibraryApprovedClaims,
    claimLibraryNeedsReviewClaims,
    claimLibraryDoNotSayClaims,
    ...mediaOnlyMetadata
  } = mediaMetadata;
  const mediaAnalysis =
    row.media_analysis_json && Object.keys(row.media_analysis_json).length > 0
      ? row.media_analysis_json
      : undefined;
  const mediaContext =
    Object.keys(mediaOnlyMetadata).length > 0 || mediaAnalysis
      ? {
          ...(mediaOnlyMetadata as Omit<CampaignMediaContext, "analysis">),
          analysis: mediaAnalysis
        }
      : undefined;

  return {
    id: row.id,
    name: row.title ?? "Untitled Campaign",
    idea: row.raw_idea ?? "",
    intent:
      typeof intent === "string"
        ? intent
        : undefined,
    contentAngle:
      typeof contentAngle === "string"
        ? (contentAngle as Campaign["contentAngle"])
        : undefined,
    campaignTemplate:
      typeof campaignTemplate === "string"
        ? (campaignTemplate as Campaign["campaignTemplate"])
        : undefined,
    campaignType:
      campaignType === "Repurposed" ? "Repurposed" : "Original",
    repurposedFrom:
      repurposedFrom && typeof repurposedFrom === "object"
        ? (repurposedFrom as Campaign["repurposedFrom"])
        : undefined,
    platforms: row.selected_platforms ?? [],
    posts,
    createdAt: row.created_at
      ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
          new Date(row.created_at)
        )
      : "",
    generatedBy: row.generation_source ?? undefined,
    contentOrigin:
      typeof contentOrigin === "string"
        ? (contentOrigin as Campaign["contentOrigin"])
        : undefined,
    manualSourceContent:
      typeof manualSourceContent === "string"
        ? manualSourceContent
        : undefined,
    mediaContext,
    profileId: row.selected_profile_id ?? undefined,
    voiceInfluenceIds: Array.isArray(voiceInfluenceIds) ? voiceInfluenceIds as string[] : [],
    voiceInfluenceNames: Array.isArray(voiceInfluenceNames) ? voiceInfluenceNames as string[] : [],
    inspirationProfileIds: Array.isArray(inspirationProfileIds) ? inspirationProfileIds as string[] : [],
    inspirationProfileNames: Array.isArray(inspirationProfileNames) ? inspirationProfileNames as string[] : [],
    inspirationPatternIds: Array.isArray(inspirationPatternIds) ? inspirationPatternIds as string[] : [],
    inspirationPatternNames: Array.isArray(inspirationPatternNames) ? inspirationPatternNames as string[] : [],
    opportunityId: typeof opportunityId === "string" ? opportunityId : undefined,
    opportunityTitle: typeof opportunityTitle === "string" ? opportunityTitle : undefined,
    voiceExampleTitles: Array.isArray(voiceExampleTitles) ? voiceExampleTitles as string[] : [],
    simpleStyleChips: Array.isArray(simpleStyleChips)
      ? simpleStyleChips as Campaign["simpleStyleChips"]
      : [],
    simpleStyleInstructions: Array.isArray(simpleStyleInstructions)
      ? simpleStyleInstructions as string[]
      : [],
    claimLibraryIds: Array.isArray(claimLibraryIds) ? claimLibraryIds as string[] : [],
    claimLibraryApprovedClaims: Array.isArray(claimLibraryApprovedClaims) ? claimLibraryApprovedClaims as string[] : [],
    claimLibraryNeedsReviewClaims: Array.isArray(claimLibraryNeedsReviewClaims) ? claimLibraryNeedsReviewClaims as string[] : [],
    claimLibraryDoNotSayClaims: Array.isArray(claimLibraryDoNotSayClaims) ? claimLibraryDoNotSayClaims as string[] : [],
    sourceLibraryIds: row.selected_knowledge_base_ids ?? [],
    sourceLibraryNames: []
  };
}

function generatedPostToRow(campaignId: string, post: GeneratedPost, index: number) {
  return {
    id: post.id,
    workspace_id: workspaceIdOrThrow(),
    campaign_id: campaignId,
    platform: post.platform,
    option_label:
      index % 3 === 0
        ? "Option 1: Recommended"
        : index % 3 === 1
          ? "Option 2: Shorter"
          : "Option 3: More founder-led",
    variant_number: index + 1,
    content_json: {
      content: post.content,
      postCopy: post.postCopy,
      score: post.score,
      generatedBy: post.generatedBy,
      contentOrigin: post.contentOrigin,
      manualSourceContent: post.manualSourceContent,
      mediaUsed: post.mediaUsed,
      rationale: post.rationale,
      recommendedMediaUse: post.recommendedMediaUse,
      altText: post.altText,
      overlayText: post.overlayText,
      cta: post.cta,
      hashtags: post.hashtags,
      firstComment: post.firstComment,
      carouselIdeas: post.carouselIdeas,
      shotList: post.shotList,
      profileName: post.profileName,
      profileType: post.profileType,
      profileRole: post.profileRole,
      sourceLibraryIds: post.sourceLibraryIds,
      sourceLibraryNames: post.sourceLibraryNames,
      safetyCheck: post.safetyCheck,
      review: post.review
    },
    status: post.status,
    previous_versions_json: post.previousContent ? [post.previousContent] : [],
    updated_at: new Date().toISOString()
  };
}

function generatedPostFromRow(row: GeneratedPostRow): GeneratedPost {
  const content = row.content_json ?? {};
  return {
    id: row.id,
    platform: row.platform,
    content: content.content ?? "",
    postCopy: content.postCopy ?? content.content ?? "",
    status: row.status ?? "draft",
    score: content.score ?? 90,
    generatedBy: content.generatedBy,
    contentOrigin: content.contentOrigin,
    manualSourceContent: content.manualSourceContent,
    mediaUsed: content.mediaUsed,
    previousContent: row.previous_versions_json?.[0],
    previousPostCopy: row.previous_versions_json?.[0],
    rationale: content.rationale,
    recommendedMediaUse: content.recommendedMediaUse,
    altText: content.altText,
    overlayText: content.overlayText,
    cta: content.cta,
    hashtags: content.hashtags ?? [],
    firstComment: content.firstComment,
    carouselIdeas: content.carouselIdeas ?? [],
    shotList: content.shotList ?? [],
    profileName: content.profileName,
    profileType: content.profileType as GeneratedPost["profileType"],
    profileRole: content.profileRole,
    sourceLibraryIds: content.sourceLibraryIds ?? [],
    sourceLibraryNames: content.sourceLibraryNames ?? [],
    safetyCheck: content.safetyCheck,
    claimMatches: content.safetyCheck?.claimMatches ?? [],
    review: content.review
  };
}

function claimLibraryToRow(item: ClaimLibraryItem) {
  return {
    id: item.id,
    workspace_id: workspaceIdOrThrow(),
    claim_text: item.claimText,
    claim_type: item.claimType,
    supporting_source_id: item.supportingSourceId ?? null,
    source_type: item.sourceType,
    notes: item.notes ?? null,
    risk_level: item.riskLevel,
    reviewed_by: item.reviewedBy ?? null,
    reviewed_at: item.reviewedAt ?? null,
    metadata_json: {
      ...(item.metadata ?? {}),
      supportingSourceName: item.supportingSourceName
    },
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

function claimLibraryFromRow(row: ClaimLibraryRow): ClaimLibraryItem {
  return {
    id: row.id,
    claimText: row.claim_text ?? "",
    claimType: row.claim_type ?? "Needs review",
    supportingSourceId: row.supporting_source_id ?? undefined,
    supportingSourceName:
      typeof row.metadata_json?.supportingSourceName === "string"
        ? row.metadata_json.supportingSourceName
        : undefined,
    sourceType: row.source_type ?? "manual entry",
    notes: row.notes ?? "",
    riskLevel: row.risk_level ?? "Medium",
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    metadata: row.metadata_json ?? {},
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString()
  };
}

function approvedPostFromRow(row: any): ApprovedPostMemory {
  return {
    id: row.id,
    profileId: row.profile_id,
    campaignId: row.campaign_id,
    generatedPostId: row.generated_post_id,
    platform: row.platform,
    finalContent: row.final_content ?? "",
    supportingFields: row.supporting_json ?? {},
    contentAngle: row.content_angle ?? undefined,
    intent: row.intent ?? undefined,
    mediaUsed: Boolean(row.media_used),
    createdAt: row.created_at ?? ""
  };
}

function rejectedPostFromRow(row: any): RejectedPostMemory {
  return {
    id: row.id,
    profileId: row.profile_id ?? undefined,
    campaignId: row.campaign_id,
    generatedPostId: row.generated_post_id,
    platform: row.platform,
    rejectedContent: row.rejected_content ?? "",
    contentAngle: row.content_angle ?? undefined,
    intent: row.intent ?? undefined,
    reason: row.reason ?? undefined,
    createdAt: row.created_at ?? ""
  };
}

function postQueueItemFromRow(row: any): PostQueueItem {
  const supporting = row.supporting_json ?? {};
  return {
    id: row.id,
    contentType: supporting.contentType ?? "Post",
    profileId: row.profile_id ?? undefined,
    profileName: row.profile_name ?? undefined,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name ?? "Untitled Campaign",
    generatedPostId: row.generated_post_id,
    platform: row.platform,
    contentAngle: row.content_angle ?? undefined,
    intent: row.intent ?? undefined,
    content: row.content ?? "",
    postCopy: supporting.postCopy ?? row.content ?? "",
    contentOrigin: supporting.contentOrigin ?? undefined,
    manualSourceContent: supporting.manualSourceContent ?? undefined,
    rationale: supporting.rationale ?? undefined,
    recommendedMediaUse: supporting.recommendedMediaUse ?? undefined,
    altText: supporting.altText ?? undefined,
    overlayText: supporting.overlayText ?? undefined,
    cta: supporting.cta ?? undefined,
    hashtags: supporting.hashtags ?? [],
    firstComment: supporting.firstComment ?? undefined,
    carouselIdeas: supporting.carouselIdeas ?? [],
    shotList: supporting.shotList ?? [],
    mediaAssetId: supporting.mediaAssetId ?? undefined,
    mediaAssetName: supporting.mediaAssetName ?? undefined,
    mediaPublicUrl: supporting.mediaPublicUrl ?? undefined,
    mediaStoragePath: supporting.mediaStoragePath ?? undefined,
    opportunityId: supporting.opportunityId ?? undefined,
    opportunityTitle: supporting.opportunityTitle ?? undefined,
    livePostUrl: supporting.livePostUrl ?? undefined,
    postedAt: supporting.postedAt ?? undefined,
    publishNotes: supporting.publishNotes ?? undefined,
    isSandbox: Boolean(supporting.isSandbox),
    hiddenFromQueue: Boolean(supporting.hiddenFromQueue),
    managerReviewOnly: Boolean(supporting.managerReviewOnly),
    metrics: supporting.metrics ?? {},
    safetyCheck: supporting.safetyCheck ?? undefined,
    review: supporting.review ?? undefined,
    mediaUsed: Boolean(row.media_used),
    status: row.status ?? "Ready",
    plannedAt: row.planned_at ?? undefined,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? undefined
  };
}

function mediaAssetToRow(asset: MediaAsset) {
  return {
    id: asset.id,
    workspace_id: workspaceIdOrThrow(),
    filename: asset.filename,
    file_type: asset.fileType,
    media_type: asset.mediaType,
    storage_path: asset.storagePath ?? null,
    public_url: asset.publicUrl ?? null,
    uploaded_at: asset.uploadedAt,
    description: asset.description ?? null,
    suggested_angles: asset.suggestedAngles ?? [],
    overlay_text: asset.overlayText ?? null,
    sensitivity_warnings: asset.sensitivityWarnings ?? [],
    alt_text: asset.altText ?? null,
    tags: asset.tags ?? [],
    notes: asset.notes ?? null,
    metadata_json: {}
  };
}

function mediaAssetFromRow(row: any): MediaAsset {
  return {
    id: row.id,
    filename: row.filename ?? "Untitled media",
    fileType: row.file_type ?? "",
    mediaType: row.media_type ?? "image",
    storagePath: row.storage_path ?? undefined,
    publicUrl: row.public_url ?? undefined,
    uploadedAt: row.uploaded_at ?? row.created_at ?? "",
    description: row.description ?? undefined,
    suggestedAngles: row.suggested_angles ?? [],
    overlayText: row.overlay_text ?? undefined,
    sensitivityWarnings: row.sensitivity_warnings ?? [],
    altText: row.alt_text ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined
  };
}

function socialConnectionToRow(connection: SocialConnection) {
  return {
    id: connection.id,
    workspace_id: workspaceIdOrThrow(),
    provider: connection.provider,
    account_label: connection.accountLabel,
    integration_path: connection.integrationPath ?? "Instagram Login path",
    account_id: connection.accountId || null,
    page_id: connection.pageId || null,
    instagram_user_id: connection.instagramUserId || null,
    instagram_username: connection.instagramUsername || null,
    account_type: connection.accountType || null,
    token_status: connection.tokenStatus ?? "Not configured",
    connected_at: connection.connectedAt ?? null,
    access_token_encrypted_or_placeholder: connection.accessTokenStatus,
    status: connection.status,
    is_sandbox: connection.isSandbox,
    metadata_json: connection.metadata ?? {},
    created_at: connection.createdAt,
    updated_at: new Date().toISOString()
  };
}

function socialConnectionFromRow(row: SocialConnectionRow): SocialConnection {
  const metadata = row.metadata_json ?? {};
  const accessTokenStatus = row.access_token_encrypted_or_placeholder;

  return {
    id: row.id,
    provider: row.provider ?? "instagram",
    accountLabel: row.account_label ?? "Instagram Sandbox",
    integrationPath:
      row.integration_path === "Facebook Page / Graph API path"
        ? "Facebook Page / Graph API path"
        : "Instagram Login path",
    accountId: row.account_id ?? "",
    pageId: row.page_id ?? "",
    instagramUserId: row.instagram_user_id ?? row.metadata_json?.instagramUserId ?? "",
    instagramUsername: row.instagram_username ?? row.metadata_json?.instagramUsername ?? "",
    accountType:
      row.account_type === "Creator" || row.account_type === "Business"
        ? row.account_type
        : row.metadata_json?.accountType === "Creator" || row.metadata_json?.accountType === "Business"
          ? row.metadata_json.accountType
          : "",
    tokenStatus:
      row.token_status === "Available server-side" || row.token_status === "Expired"
        ? row.token_status
        : row.metadata_json?.tokenStatus === "Available server-side" || row.metadata_json?.tokenStatus === "Expired"
          ? row.metadata_json.tokenStatus
          : "Not configured",
    accessTokenStatus:
      accessTokenStatus === "Available but not stored" ||
      accessTokenStatus === "Use server env var" ||
      accessTokenStatus === "Placeholder only"
        ? accessTokenStatus
        : "Not provided",
    status:
      row.status === "Sandbox configured" ||
      row.status === "Test publishing not enabled" ||
      row.status === "Test publishing enabled" ||
      row.status === "connected_sandbox" ||
      row.status === "needs_token_storage" ||
      row.status === "disconnected"
        ? row.status
        : "Sandbox setup available",
    isSandbox: Boolean(row.is_sandbox),
    connectedAt: row.connected_at ?? row.metadata_json?.connectedAt ?? undefined,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
