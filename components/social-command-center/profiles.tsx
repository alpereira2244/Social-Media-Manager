"use client";

import { useState } from "react";
import { Check, Clipboard, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnalysisBlock, Pill, SubtleNote } from "@/components/social-command-center/common-ui";
import { FieldLabel } from "@/components/social-command-center/field-label";
import { platforms, profileTypes, syncStatuses } from "@/lib/mock-data";
import { readJsonResponse } from "@/lib/http-helpers";
import { readFileAsDataUrl } from "@/lib/media-utils";
import {
  isLinkedInCompanyPostsProfileSource,
  isInspirationProfile,
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
  profileVoiceSourceTitles,
  voiceSourceConfidence
} from "@/lib/profile-voice-analysis";
import {
  hasLinkedInOrXProfileUrl,
  hasWebsiteProfileUrl,
  inferProfileSourcePlatform,
  isSocialUrl,
  looksLikeUrl,
  normalizeProfileSourcePlatform,
  profileSourcePlatformOptions,
  profileUrlsText
} from "@/lib/source-platforms";
import { uploadProfileAvatarToSupabase, type StorageMode } from "@/lib/supabase/persistence";
import { cn } from "@/lib/utils";
import type {
  ApprovedPostMemory,
  InspirationPattern,
  Profile,
  ProfileSourceKind,
  ProfileSourcePlatform,
  ProfileSourceSyncStatus,
  ProfileSourceType,
  ProfileType,
  ProfileVoiceExample,
  ProfileVoicePlatform,
  SyncStatus
} from "@/lib/types";

function getLastChecked(source: { lastChecked?: string }) {
  return source.lastChecked ?? "Never";
}

function inspirationPatternSummary(pattern: InspirationPattern) {
  return pattern.analysis?.hookPattern || pattern.notes || pattern.pastedText || pattern.fetchedContent || "Saved pattern. Add notes, pasted text, screenshot, or a public webpage to analyze.";
}

function currentCheckedAt() {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function cleanVoiceSourceName(value?: string) {
  if (!value || looksLikeUrl(value)) {
    return "Unnamed Voice Source";
  }

  return value;
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

function initialsFromName(name?: string) {
  const words = (name || "SC").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "SC";
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

type ProfilePanelTab =
  | "Overview"
  | "Voice Sources"
  | "Learned Voice"
  | "Learned Patterns"
  | "Approved Examples"
  | "Settings";

const profileSourceKinds: ProfileSourceKind[] = [
  "account URL",
  "post URL",
  "website",
  "screenshot",
  "pasted text",
  "notes"
];

const profileSourceTypes: ProfileSourceType[] = [
  "internal voice",
  "company account",
  "inspiration/reference",
  "competitor/market watch",
  "audience/persona"
];

const emptyProfileSourceForm = {
  title: "",
  sourceKind: "account URL" as ProfileSourceKind,
  url: "",
  platform: "LinkedIn" as ProfileSourcePlatform,
  sourceType: "internal voice" as ProfileSourceType,
  syncStatus: "stored only" as ProfileSourceSyncStatus,
  pastedText: "",
  notes: "",
  patternOnly: false
};

const profileVoicePlatforms: ProfileVoicePlatform[] = [
  "X",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "Founder notes",
  "Transcript",
  "Other"
];

const emptyProfileVoiceExampleForm = {
  title: "",
  platform: "LinkedIn" as ProfileVoicePlatform,
  content: "",
  notes: "",
  useAsVoice: true,
  patternOnly: true
};

export function Profiles({
  profiles,
  approvedPosts,
  setProfiles,
  selectedProfileId,
  setSelectedProfileId,
  persistProfile,
  removeProfile,
  storageMode,
  createDefaultConduitProfile,
  loadDemoData,
  importedInspirationPatterns
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
  importedInspirationPatterns: InspirationPattern[];
}) {
  const [form, setForm] = useState(emptyProfileForm);
  const [savedAt, setSavedAt] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [activeTab, setActiveTab] = useState<ProfilePanelTab>("Overview");
  const [profileFilter, setProfileFilter] = useState<"All" | "Conduit" | "Founders" | "Team" | "Inspiration" | "Competitors" | "Personas">("All");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickProfile, setQuickProfile] = useState({
    name: "",
    type: "Company Account" as ProfileType,
    role: "",
    primarySourceUrl: "",
    learnFrom: "",
    patternOnly: false
  });
  const isEditing = Boolean(form.id);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const filteredProfiles = profiles.filter((profile) => profileMatchesFilter(profile, profileFilter));

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
    const existingProfile = profiles.find((profile) => profile.id === profileId);
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
      voiceExamples: existingProfile?.voiceExamples ?? [],
      voiceSources: existingProfile?.voiceSources ?? [],
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

  function saveProfileRecord(nextProfile: Profile) {
    const nextProfiles = profiles.map((profile) =>
      profile.id === nextProfile.id ? nextProfile : profile
    );
    setProfiles(nextProfiles);
    persistProfile(nextProfile);
  }

  function handleAvatarFile(file?: File) {
    if (!file) return;
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function openQuickAdd(type: ProfileType, defaults?: Partial<typeof quickProfile>) {
    setQuickProfile({
      name: defaults?.name ?? "",
      type,
      role: defaults?.role ?? "",
      primarySourceUrl: "",
      learnFrom: defaults?.learnFrom ?? "",
      patternOnly: defaults?.patternOnly ?? isPatternOnlyProfileType(type)
    });
    setShowQuickAdd(true);
    setShowCreate(false);
  }

  function updateQuickProfile<K extends keyof typeof quickProfile>(
    field: K,
    value: (typeof quickProfile)[K]
  ) {
    setQuickProfile((current) => {
      if (field === "type") {
        const nextType = value as ProfileType;
        return {
          ...current,
          type: nextType,
          patternOnly: isPatternOnlyProfileType(nextType)
        };
      }
      return { ...current, [field]: value };
    });
  }

  function saveQuickProfile() {
    const profileId = `profile-${Date.now()}`;
    const sourceUrl = quickProfile.primarySourceUrl.trim();
    const platform = sourceUrl ? inferProfileSourcePlatform(sourceUrl) : "Other URL";
    const sourceType = profileSourceTypeForProfileType(quickProfile.type);
    const sourceKind = sourceUrl ? profileSourceKindForUrl(sourceUrl, platform) : "notes";
    const checkedAt = currentCheckedAt();
    const voiceSources: Profile["voiceSources"] = sourceUrl
      ? [{
          id: `profile-source-${Date.now()}`,
          title: `${platform} source`,
          sourceKind,
          url: sourceUrl,
          platform,
          sourceType,
          syncStatus: "stored only",
          lastSynced: "Never",
          notes: quickProfile.learnFrom.trim(),
          patternOnly: quickProfile.patternOnly,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      : [];
    const profileBase: Omit<Profile, "personality"> = {
      id: profileId,
      name: quickProfile.name.trim() || `${quickProfile.type} profile`,
      type: quickProfile.type,
      role: quickProfile.role.trim(),
      bio: quickProfile.role.trim(),
      linkedInUrl: platform === "LinkedIn" ? sourceUrl : "",
      xUrl: platform === "X" ? sourceUrl : "",
      instagramUrl: platform === "Instagram" ? sourceUrl : "",
      tiktokUrl: platform === "TikTok" ? sourceUrl : "",
      websiteUrl: platform === "Website" ? sourceUrl : "",
      otherUrls: platform === "Other URL" ? sourceUrl : "",
      examples: "",
      notes: quickProfile.learnFrom.trim(),
      syncStatus: "Manual Only",
      lastChecked: "Never",
      avatarUrl: "",
      avatarStoragePath: "",
      whatWeLike: quickProfile.learnFrom.trim(),
      patternsToLearn: quickProfile.learnFrom.trim(),
      thingsNotToCopy: quickProfile.patternOnly
        ? "Use as pattern-only inspiration. Do not copy wording, identity, claims, or facts."
        : "",
      voiceExamples: [],
      voiceSources,
      updatedAt: checkedAt
    };
    const nextProfile: Profile = {
      ...profileBase,
      personality: createPersonalitySummary(profileBase)
    };

    setProfiles([nextProfile, ...profiles]);
    if (!isInspirationProfile(nextProfile)) {
      setSelectedProfileId(nextProfile.id);
    }
    setActiveProfileId(nextProfile.id);
    setActiveTab("Voice Sources");
    persistProfile(nextProfile);
    setQuickProfile({
      name: "",
      type: "Company Account",
      role: "",
      primarySourceUrl: "",
      learnFrom: "",
      patternOnly: false
    });
    setShowQuickAdd(false);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
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
            Profiles teach the app who is speaking, who inspires us, and what patterns to learn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openQuickAdd("Company Account", { name: "Conduit", role: "Company Account", learnFrom: "Conduit company voice, product framing, and practical industrial automation POV." })}>
            Quick add
          </Button>
          <Button onClick={() => { resetForm(); setShowCreate((current) => !current); setShowQuickAdd(false); }}>
            <Plus size={16} /> {showCreate ? "Hide form" : "Add Profile"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {([
          ["Add Conduit profile", "Company Account", "Conduit", "Company Account"],
          ["Add founder profile", "Founder", "", "Founder / operator voice"],
          ["Add inspiration profile", "Inspiration / Reference", "", "Outside brand, creator, or media team"],
          ["Add competitor / market watch profile", "Competitor / Market Watch", "", "Market pattern or competitor account"],
          ["Add audience persona", "Customer / Audience Persona", "", "Audience or buyer voice"]
        ] as Array<[string, ProfileType, string, string]>).map(([label, type, name, role]) => (
          <button
            key={label}
            type="button"
            onClick={() => openQuickAdd(type, { name, role, patternOnly: isPatternOnlyProfileType(type) })}
            className="rounded-lg border border-border bg-white p-3 text-left text-sm font-bold shadow-sm transition hover:border-primary hover:text-primary"
          >
            <Plus className="mb-2" size={15} />
            {label}
          </button>
        ))}
      </div>

      {showQuickAdd && (
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Quick add profile</p>
              <h3 className="mt-1 text-lg font-bold">Add a profile and first source link</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with the identity, a primary source URL, and what the app should learn. Links are saved now; learning starts once content is fetched, pasted, uploaded, or synced later.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowQuickAdd(false)}>
              Cancel
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Profile name" htmlFor="quick-profile-name" />
              <input
                id="quick-profile-name"
                value={quickProfile.name}
                onChange={(event) => updateQuickProfile("name", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Conduit, Danny Pereira, Anduril media team..."
              />
            </div>
            <div>
              <FieldLabel label="Profile type" htmlFor="quick-profile-type" />
              <select
                id="quick-profile-type"
                value={quickProfile.type}
                onChange={(event) => updateQuickProfile("type", event.target.value as ProfileType)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {profileTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel label="Role/title or description" htmlFor="quick-profile-role" />
              <input
                id="quick-profile-role"
                value={quickProfile.role}
                onChange={(event) => updateQuickProfile("role", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Founder / CEO, Company Account, inspiration brand..."
              />
            </div>
            <div>
              <FieldLabel label="Primary source URL" htmlFor="quick-profile-url" />
              <input
                id="quick-profile-url"
                value={quickProfile.primarySourceUrl}
                onChange={(event) => updateQuickProfile("primarySourceUrl", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://www.linkedin.com/company/..."
              />
              {quickProfile.primarySourceUrl.trim() && (
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Detected as {inferProfileSourcePlatform(quickProfile.primarySourceUrl)} · {isSocialUrl(quickProfile.primarySourceUrl) ? "Social sync not connected" : "Website can be fetched"}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <FieldLabel label="What should the app learn from this profile?" htmlFor="quick-profile-learn" />
              <textarea
                id="quick-profile-learn"
                value={quickProfile.learnFrom}
                onChange={(event) => updateQuickProfile("learnFrom", event.target.value)}
                className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Voice, hooks, pacing, visual style, audience language, or patterns to adapt..."
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={quickProfile.patternOnly}
                onChange={(event) => updateQuickProfile("patternOnly", event.target.checked)}
              />
              Pattern-only, do not copy wording
            </label>
            <Button onClick={saveQuickProfile} disabled={!quickProfile.name.trim()}>
              Save quick profile
            </Button>
          </div>
        </Card>
      )}

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

      <div className="flex flex-wrap gap-2">
        {(["All", "Conduit", "Founders", "Team", "Inspiration", "Competitors", "Personas"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setProfileFilter(filter)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-bold transition",
              profileFilter === filter
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-muted-foreground hover:text-foreground"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.length === 0 ? (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="font-semibold">No profiles yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Profiles teach the app who is speaking, who inspires us, and what patterns to learn.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => openQuickAdd("Company Account", { name: "Conduit", role: "Company Account" })}>Add Conduit profile</Button>
              <Button variant="secondary" onClick={() => openQuickAdd("Founder")}>Add founder profile</Button>
              <Button variant="secondary" onClick={() => openQuickAdd("Inspiration / Reference")}>Add inspiration profile</Button>
              <Button variant="secondary" onClick={() => openQuickAdd("Competitor / Market Watch")}>Add competitor / market watch profile</Button>
              <Button variant="secondary" onClick={() => openQuickAdd("Customer / Audience Persona")}>Add audience persona</Button>
              <Button variant="secondary" onClick={loadDemoData}>Load demo data</Button>
            </div>
          </Card>
        ) : filteredProfiles.length === 0 ? (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="font-semibold">No profiles match this filter.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Switch filters or add a new profile.
            </p>
          </Card>
        ) : (
          filteredProfiles.map((profile) => (
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

      {importedInspirationPatterns.length > 0 && (
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Imported inspiration patterns</p>
              <h3 className="mt-1 text-lg font-bold">Legacy pattern records are preserved here</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Inspiration is now managed through Inspiration / Reference profiles. These older pattern records remain available as pattern-only reference material and are not treated as Company Knowledge facts.
              </p>
            </div>
            <Pill>{importedInspirationPatterns.length} imported</Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {importedInspirationPatterns.slice(0, 6).map((pattern) => (
              <div key={pattern.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  <Pill>{pattern.platform}</Pill>
                  <Pill>{pattern.sourceType}</Pill>
                  <Pill>Pattern-only inspiration</Pill>
                </div>
                <p className="mt-3 font-bold">{pattern.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {inspirationPatternSummary(pattern)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          onSaveProfile={saveProfileRecord}
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
  const sourceLinks = profileSourceLinkCount(profile);
  const analyzedSources = profileAnalyzedMaterialCount(profile);
  const learnedVoice = analyzedSources > 0;
  const confidence = profileConfidenceLabel(profile);

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
              {isPatternOnlyProfileType(profile.type) && <Pill>Pattern-only inspiration</Pill>}
              <Pill>Learned voice: {learnedVoice ? "Yes" : "No"}</Pill>
              <Pill>{sourceLinks} source links</Pill>
              <Pill>{analyzedSources} analyzed</Pill>
              <Pill>Confidence: {confidence}</Pill>
              {approvedExamples.length > 0 && <Pill>{approvedExamples.length} approved</Pill>}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{status}</p>
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

function profileMatchesFilter(
  profile: Profile,
  filter: "All" | "Conduit" | "Founders" | "Team" | "Inspiration" | "Competitors" | "Personas"
) {
  if (filter === "All") return true;
  if (filter === "Conduit") return profile.name.toLowerCase().includes("conduit") || profile.type === "Company Account";
  if (filter === "Founders") return profile.type === "Founder";
  if (filter === "Team") return profile.type === "Team Member" || profile.type === "Internal Voice";
  if (filter === "Inspiration") return profile.type === "Inspiration / Reference";
  if (filter === "Competitors") return profile.type === "Competitor / Market Watch";
  if (filter === "Personas") return profile.type === "Customer / Audience Persona";
  return true;
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
      <div className="mt-5 grid gap-4 md:grid-cols-3">
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
  onRefresh,
  onSaveProfile
}: {
  profile: Profile;
  approvedExamples: ApprovedPostMemory[];
  activeTab: ProfilePanelTab;
  setActiveTab: (tab: ProfilePanelTab) => void;
  isSelected: boolean;
  onUse: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: (content: string) => void;
  onSaveProfile: (profile: Profile) => void;
}) {
  const [refreshText, setRefreshText] = useState("");
  const [sourceForm, setSourceForm] = useState(emptyProfileSourceForm);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceDetailsId, setSourceDetailsId] = useState("");
  const [sourceScreenshot, setSourceScreenshot] = useState<{
    filename: string;
    fileType: string;
    size: number;
    dataUrl?: string;
    analysisText?: string;
  } | null>(null);
  const [sourceMessage, setSourceMessage] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [isAnalyzingSource, setIsAnalyzingSource] = useState("");
  const [voiceForm, setVoiceForm] = useState(emptyProfileVoiceExampleForm);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const tabs: ProfilePanelTab[] = ["Overview", "Voice Sources", "Learned Voice", "Learned Patterns", "Approved Examples", "Settings"];

  function saveRefresh() {
    if (!refreshText.trim()) return;
    onRefresh(refreshText);
    setRefreshText("");
  }

  function updateVoiceForm<K extends keyof typeof emptyProfileVoiceExampleForm>(
    field: K,
    value: (typeof emptyProfileVoiceExampleForm)[K]
  ) {
    setVoiceForm((current) => ({ ...current, [field]: value }));
  }

  function updateSourceForm<K extends keyof typeof emptyProfileSourceForm>(
    field: K,
    value: (typeof emptyProfileSourceForm)[K]
  ) {
    setSourceForm((current) => {
      if (field === "sourceType") {
        const nextType = value as ProfileSourceType;
        return {
          ...current,
          sourceType: nextType,
          patternOnly: sourceTypeDefaultsPatternOnly(nextType)
        };
      }
      return { ...current, [field]: value };
    });
  }

  function openSourceForm(seed?: Partial<typeof emptyProfileSourceForm>) {
    const sourceType = seed?.sourceType ?? profileSourceTypeForProfileType(profile.type);
    setSourceForm({
      ...emptyProfileSourceForm,
      sourceType,
      patternOnly: seed?.patternOnly ?? sourceTypeDefaultsPatternOnly(sourceType),
      ...seed
    });
    setSourceScreenshot(null);
    setSourceMessage("");
    setSourceError("");
    setShowSourceForm(true);
  }

  async function handleSourceScreenshot(file?: File) {
    if (!file) return;
    setSourceError("");
    if (!file.type.startsWith("image/")) {
      setSourceError("Upload a screenshot image file.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setSourceScreenshot({
      filename: file.name,
      fileType: file.type,
      size: file.size,
      dataUrl
    });
    setSourceForm((current) => ({
      ...current,
      sourceKind: "screenshot",
      platform: current.platform === "Website" ? "Other URL" : current.platform
    }));
  }

  function saveVoiceSource() {
    setSourceMessage("");
    setSourceError("");
    if (!sourceForm.url.trim() && !sourceForm.pastedText.trim() && !sourceForm.notes.trim() && !sourceScreenshot) {
      setSourceError("Add a URL, screenshot, pasted text, or notes first.");
      return;
    }

    const now = new Date().toISOString();
    const platform = sourceForm.url.trim()
      ? inferProfileSourcePlatform(sourceForm.url)
      : sourceForm.platform;
    const inferredSourceType =
      sourceForm.sourceType === emptyProfileSourceForm.sourceType
        ? profileSourceTypeForProfileType(profile.type)
        : sourceForm.sourceType;
    const hasContent = Boolean(sourceForm.pastedText.trim() || sourceForm.notes.trim() || sourceScreenshot);
    const nextSource = {
      id: `profile-source-${Date.now()}`,
      title: sourceForm.title.trim() || `${platform} ${sourceForm.sourceKind}`,
      sourceKind: sourceForm.sourceKind,
      url: sourceForm.url.trim(),
      platform,
      screenshot: sourceScreenshot ?? undefined,
      pastedText: sourceForm.pastedText.trim(),
      sourceType: inferredSourceType,
      syncStatus: hasContent ? "needs screenshot/text" as ProfileSourceSyncStatus : "stored only" as ProfileSourceSyncStatus,
      lastSynced: "Never",
      notes: sourceForm.notes.trim(),
      patternOnly: sourceForm.patternOnly || isPatternOnlyProfileType(profile.type),
      createdAt: now,
      updatedAt: now
    };
    const nextProfileBase: Profile = {
      ...profile,
      voiceSources: [nextSource, ...(profile.voiceSources ?? [])],
      updatedAt: currentCheckedAt()
    };
    onSaveProfile({
      ...nextProfileBase,
      personality: createPersonalitySummary(nextProfileBase)
    });
    setSourceForm({
      ...emptyProfileSourceForm,
      sourceType: profileSourceTypeForProfileType(profile.type),
      patternOnly: sourceTypeDefaultsPatternOnly(profileSourceTypeForProfileType(profile.type))
    });
    setSourceScreenshot(null);
    setShowSourceForm(false);
    setSourceMessage(sourceForm.url.trim() && !hasContent
      ? isSocialUrl(sourceForm.url)
        ? "Source saved. Social sync is not connected yet. Add screenshots, pasted examples, or notes to analyze now."
        : "Source saved. Website sources can be fetched, then analyzed."
      : "Voice source saved. Add more material or analyze when ready.");
  }

  async function syncVoiceSource(sourceId: string) {
    setSourceMessage("");
    setSourceError("");
    const source = (profile.voiceSources ?? []).find((item) => item.id === sourceId);
    if (!source) return;

    try {
      const response = await fetch("/api/profile-sources/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, source })
      });
      const payload = await readJsonResponse(response, "Profile source sync failed");
      const checkedAt = currentCheckedAt();
      const nextProfileBase: Profile = {
        ...profile,
        voiceSources: (profile.voiceSources ?? []).map((item) =>
          item.id === sourceId
            ? {
                ...item,
                syncStatus: (payload?.syncStatus ?? "API sync available later") as ProfileSourceSyncStatus,
                lastSynced: checkedAt,
                updatedAt: new Date().toISOString()
              }
            : item
        ),
        updatedAt: checkedAt
      };
      onSaveProfile({
        ...nextProfileBase,
        personality: createPersonalitySummary(nextProfileBase)
      });
      setSourceMessage(payload?.message ?? "API sync is not configured yet. This source is saved and can be synced later.");
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Profile source sync failed.");
    }
  }

  async function fetchProfileSource(sourceId: string) {
    setSourceMessage("");
    setSourceError("");
    const source = (profile.voiceSources ?? []).find((item) => item.id === sourceId);
    if (!source?.url) return;

    if (isWebsiteProfileSource(source)) {
      try {
        const response = await fetch("/api/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: source.url })
        });
        const payload = await readJsonResponse(response, "Website source fetch failed");
        if (!response.ok || !payload?.content) {
          throw new Error(payload?.error ?? "Website source fetch failed.");
        }
        const checkedAt = currentCheckedAt();
        const nextProfileBase: Profile = {
          ...profile,
          voiceSources: (profile.voiceSources ?? []).map((item) =>
            item.id === sourceId
              ? {
                  ...item,
                  title: item.title || payload.title || item.url,
                  fetchedContent: String(payload.content),
                  syncStatus: "fetched, ready to analyze",
                  lastSynced: checkedAt,
                  updatedAt: new Date().toISOString()
                }
              : item
          ),
          updatedAt: checkedAt
        };
        onSaveProfile({
          ...nextProfileBase,
          personality: createPersonalitySummary(nextProfileBase)
        });
        setSourceMessage("Fetched. Ready to analyze.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Website source fetch failed.";
        setSourceError(
          message.includes("enough readable text")
            ? "This page did not provide enough readable text. Try a specific article/newsroom page, paste text, upload a screenshot, or add notes."
            : message
        );
      }
      return;
    }

    try {
      const response = await fetch("/api/profile-sources/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          ownership: source.sourceType,
          profileType: profile.type
        })
      });
      const payload = await readJsonResponse(response, "Source fetch failed");
      const checkedAt = currentCheckedAt();
      if (!payload?.fetched) {
        const nextProfileBase: Profile = {
          ...profile,
          voiceSources: (profile.voiceSources ?? []).map((item) =>
            item.id === sourceId
              ? {
                  ...item,
                  syncStatus: (payload?.syncStatus ?? "API sync available later") as ProfileSourceSyncStatus,
                  lastSynced: checkedAt,
                  updatedAt: new Date().toISOString()
                }
              : item
          ),
          updatedAt: checkedAt
        };
        onSaveProfile({
          ...nextProfileBase,
          personality: createPersonalitySummary(nextProfileBase)
        });
        setSourceMessage(payload?.message ?? "Source saved. Direct sync is not connected yet.");
        return;
      }
      const nextProfileBase: Profile = {
        ...profile,
        voiceSources: (profile.voiceSources ?? []).map((item) =>
          item.id === sourceId
            ? {
                ...item,
                title: item.title || payload.title || item.url,
                fetchedContent: String(payload.content),
                syncStatus: "fetched, ready to analyze",
                lastSynced: checkedAt,
                updatedAt: new Date().toISOString()
              }
            : item
        ),
        updatedAt: checkedAt
      };
      onSaveProfile({
        ...nextProfileBase,
        personality: createPersonalitySummary(nextProfileBase)
      });
      setSourceMessage(payload?.message ?? "Fetched. Ready to analyze.");
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Source fetch failed.");
    }
  }

  async function tryPublicLinkAnalysis(sourceId: string) {
    setSourceMessage("");
    setSourceError("");
    setIsAnalyzingSource(sourceId);
    const source = (profile.voiceSources ?? []).find((item) => item.id === sourceId);
    if (!source?.url) {
      setIsAnalyzingSource("");
      return;
    }

    try {
      const response = await fetch("/api/profile-sources/public-link-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: source.url,
          title: source.title,
          profileName: profile.name,
          profileType: profile.type,
          sourceType: source.sourceType,
          patternOnly: source.patternOnly,
          notes: source.notes
        })
      });
      const payload = await readJsonResponse(response, "Public link analysis failed");
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Public link analysis failed.");
      }
      const checkedAt = currentCheckedAt();
      const nextProfileBase: Profile = {
        ...profile,
        voiceSources: (profile.voiceSources ?? []).map((item) =>
          item.id === sourceId
            ? payload.analyzed
              ? {
                  ...item,
                  platform: normalizeProfileSourcePlatform(payload.platform, item.platform),
                  title: item.title || payload.title || item.url,
                  fetchedContent: String(payload.content ?? item.fetchedContent ?? ""),
                  analysis: payload.analysis,
                  syncStatus: "public page analyzed",
                  lastAnalyzed: checkedAt,
                  lastSynced: checkedAt,
                  updatedAt: new Date().toISOString()
                }
              : {
                  ...item,
                  platform: normalizeProfileSourcePlatform(payload.platform, item.platform),
                  syncStatus: "fetch blocked",
                  lastSynced: checkedAt,
                  updatedAt: new Date().toISOString()
                }
            : item
        ),
        updatedAt: checkedAt
      };
      onSaveProfile({
        ...nextProfileBase,
        personality: createPersonalitySummary(nextProfileBase)
      });
      setSourceMessage(
        payload.analyzed
          ? payload.message ?? "Public page analyzed. This is best-effort analysis, not recurring social sync."
          : payload.message ?? "This platform blocked public fetching. The link was saved."
      );
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Public link analysis failed.");
    } finally {
      setIsAnalyzingSource("");
    }
  }

  async function analyzeVoiceSource(sourceId: string) {
    setSourceMessage("");
    setSourceError("");
    setIsAnalyzingSource(sourceId);
    const source = (profile.voiceSources ?? []).find((item) => item.id === sourceId);
    if (!source) {
      setIsAnalyzingSource("");
      return;
    }

    try {
      let screenshotAnalysisText = source.screenshot?.analysisText ?? "";
      if (source.screenshot?.dataUrl && !screenshotAnalysisText) {
        const mediaResponse = await fetch("/api/analyze-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: source.screenshot.dataUrl,
            filename: source.screenshot.filename,
            notes: source.notes
          })
        });
        const mediaPayload = await readJsonResponse(mediaResponse, "Screenshot analysis failed");
        if (mediaPayload?.data) {
          screenshotAnalysisText = [
            mediaPayload.data.description,
            ...(mediaPayload.data.suggestedAngles ?? []),
            mediaPayload.data.overlayText,
            mediaPayload.data.altText
          ].filter(Boolean).join("\n");
        }
      }

      const material = [
        source.pastedText,
        source.fetchedContent,
        screenshotAnalysisText,
        source.notes
      ].filter(Boolean).join("\n\n");
      if (!material.trim()) {
        throw new Error("Add pasted text, notes, fetched website content, or a screenshot before analyzing.");
      }

      const response = await fetch("/api/profile-sources/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          profileName: profile.name,
          profileType: profile.type,
          title: source.title,
          platform: source.platform,
          content: material,
          notes: source.notes,
          patternOnly: source.patternOnly
        })
      });
      const payload = await readJsonResponse(response, "Source analysis failed");
      if (!response.ok || !payload?.analysis) {
        throw new Error(payload?.error ?? "Source analysis failed.");
      }
      const checkedAt = currentCheckedAt();
      const nextProfileBase: Profile = {
        ...profile,
        voiceSources: (profile.voiceSources ?? []).map((item) =>
          item.id === sourceId
            ? {
                ...item,
                screenshot: item.screenshot
                  ? { ...item.screenshot, analysisText: screenshotAnalysisText }
                  : undefined,
                analysis: payload.analysis,
                syncStatus: "analyzed",
                lastAnalyzed: checkedAt,
                updatedAt: new Date().toISOString()
              }
            : item
        ),
        updatedAt: checkedAt
      };
      onSaveProfile({
        ...nextProfileBase,
        personality: createPersonalitySummary(nextProfileBase)
      });
      const analyzedSource = nextProfileBase.voiceSources?.find((item) => item.id === sourceId);
      setSourceMessage(
        analyzedSource && sourceLearningKind(analyzedSource) === "Notes analyzed" && isSocialProfileSource(analyzedSource)
          ? "Notes analyzed. Social content not synced yet."
          : `Analyzed ${source.title || source.platform} from ${analyzedSource ? sourceLearningBasisLabel(analyzedSource) : "provided content"}.`
      );
    } catch (error) {
      const checkedAt = currentCheckedAt();
      const nextProfileBase: Profile = {
        ...profile,
        voiceSources: (profile.voiceSources ?? []).map((item) =>
          item.id === sourceId
            ? { ...item, syncStatus: "failed", lastAnalyzed: checkedAt, updatedAt: new Date().toISOString() }
            : item
        ),
        updatedAt: checkedAt
      };
      onSaveProfile({
        ...nextProfileBase,
        personality: createPersonalitySummary(nextProfileBase)
      });
      setSourceError(error instanceof Error ? error.message : "Source analysis failed.");
    } finally {
      setIsAnalyzingSource("");
    }
  }

  function deleteVoiceSource(sourceId: string) {
    const nextProfileBase: Profile = {
      ...profile,
      voiceSources: (profile.voiceSources ?? []).filter((source) => source.id !== sourceId),
      updatedAt: currentCheckedAt()
    };
    onSaveProfile({
      ...nextProfileBase,
      personality: createPersonalitySummary(nextProfileBase)
    });
  }

  async function saveVoiceExample() {
    setVoiceMessage("");
    setVoiceError("");
    if (!voiceForm.content.trim()) {
      setVoiceError("Paste a post, caption, note, or transcript snippet first.");
      return;
    }

    setIsAnalyzingVoice(true);
    try {
      const response = await fetch("/api/analyze-profile-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: profile.name,
          profileType: profile.type,
          title: voiceForm.title.trim() || `${voiceForm.platform} example`,
          platform: voiceForm.platform,
          content: voiceForm.content.trim(),
          notes: voiceForm.notes.trim(),
          patternOnly: voiceForm.patternOnly
        })
      });
      const payload = await readJsonResponse(response, "Voice analysis failed");
      if (!response.ok || !payload?.analysis) {
        throw new Error(payload?.error ?? "Voice analysis failed.");
      }

      const now = new Date().toISOString();
      const nextExample: ProfileVoiceExample = {
        id: `voice-example-${Date.now()}`,
        title: voiceForm.title.trim() || `${voiceForm.platform} example`,
        platform: voiceForm.platform,
        content: voiceForm.content.trim(),
        notes: voiceForm.notes.trim(),
        useAsVoice: voiceForm.useAsVoice,
        patternOnly: voiceForm.patternOnly,
        analysis: payload.analysis,
        generatedBy: payload.generatedBy === "AI" ? "AI" : "Fallback",
        createdAt: now,
        updatedAt: now
      };
      const nextProfileBase: Profile = {
        ...profile,
        examples: [profile.examples, nextExample.content].filter(Boolean).join("\n\n"),
        voiceExamples: [nextExample, ...(profile.voiceExamples ?? [])],
        updatedAt: currentCheckedAt()
      };
      const nextProfile = {
        ...nextProfileBase,
        personality: createPersonalitySummary(nextProfileBase)
      };
      onSaveProfile(nextProfile);
      setVoiceForm(emptyProfileVoiceExampleForm);
      setVoiceMessage(`Saved and analyzed ${nextExample.title}.`);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Voice analysis failed.");
    } finally {
      setIsAnalyzingVoice(false);
    }
  }

  function toggleVoiceExample(exampleId: string, field: "useAsVoice" | "patternOnly") {
    const nextProfileBase: Profile = {
      ...profile,
      voiceExamples: (profile.voiceExamples ?? []).map((example) =>
        example.id === exampleId
          ? { ...example, [field]: !example[field], updatedAt: new Date().toISOString() }
          : example
      ),
      updatedAt: currentCheckedAt()
    };
    onSaveProfile({
      ...nextProfileBase,
      personality: createPersonalitySummary(nextProfileBase)
    });
  }

  function deleteVoiceExample(exampleId: string) {
    const nextProfileBase: Profile = {
      ...profile,
      voiceExamples: (profile.voiceExamples ?? []).filter((example) => example.id !== exampleId),
      updatedAt: currentCheckedAt()
    };
    onSaveProfile({
      ...nextProfileBase,
      personality: createPersonalitySummary(nextProfileBase)
    });
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
          {activeTab === "Learned Voice" && (
            <div className="grid gap-3 md:grid-cols-2">
              <AnalysisBlock label="Voice Profile summary" value={`${profile.voiceSources?.length ?? 0} source links, ${profileVoiceExampleTitles(profile).length} analyzed manual examples, ${(profile.voiceSources ?? []).filter((source) => source.syncStatus === "synced").length} synced sources.`} />
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
          {activeTab === "Learned Patterns" && (
            <div className="grid gap-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Inspiration/reference and competitor profiles are pattern-only. They can guide hooks, structure, pacing, and visual direction, but facts and claims still come from Company Knowledge.
              </div>
              {isInspirationProfile(profile) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <AnalysisBlock label="Hook patterns" value={learnedProfileHookPatterns(profile)} />
                  <AnalysisBlock label="Post structures" value={learnedProfilePostStructures(profile)} />
                  <AnalysisBlock label="Visual style" value={learnedProfileVisualStyle(profile)} />
                  <AnalysisBlock label="Tone / energy" value={profile.personality.voiceTraits} />
                  <AnalysisBlock label="Pacing" value={learnedProfilePacing(profile)} />
                  <AnalysisBlock label="CTA patterns" value={learnedProfileCtaPatterns(profile)} />
                  <AnalysisBlock label="What to imitate" value={learnedProfileImitate(profile)} />
                  <AnalysisBlock label="What not to copy" value={learnedProfileDoNotCopy(profile)} />
                  <AnalysisBlock label="Best platforms" value={profile.personality.bestPlatforms} />
                  <AnalysisBlock label="Safety notes" value={profile.thingsNotToCopy || "Do not copy wording, identity, claims, facts, or customer proof from this profile."} />
                </div>
              )}
              {!isInspirationProfile(profile) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <AnalysisBlock label="Internal hook patterns" value={learnedProfileHookPatterns(profile)} />
                  <AnalysisBlock label="Internal post structures" value={learnedProfilePostStructures(profile)} />
                  <AnalysisBlock label="Tone / energy" value={profile.personality.voiceTraits} />
                  <AnalysisBlock label="What to imitate" value={learnedProfileImitate(profile)} />
                </div>
              )}
              {(profile.voiceSources ?? []).filter((source) => source.analysis).length === 0 && (profile.voiceExamples ?? []).filter((example) => example.analysis).length === 0 && (
                <div className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
                  No learned patterns yet. Add source links, screenshots, pasted examples, or notes in Voice Sources, then analyze them.
                </div>
              )}
            </div>
          )}
          {activeTab === "Voice Sources" && (
            <div className="grid gap-5">
              <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-base font-bold">Source links</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Links organize the source. The profile only learns once content is fetched, pasted, uploaded, or synced through an API.
                    </p>
                  </div>
                  <Pill>Primary voice input</Pill>
                </div>
                <div className="mt-4 flex flex-col justify-between gap-3 rounded-md border border-primary/15 bg-teal-50 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold">Add source link</p>
                    <p className="mt-1 text-sm text-teal-900">
                      Add an account, post, website, screenshot, pasted text, or notes. Social links stay saved until content is added or sync exists.
                    </p>
                  </div>
                  <Button onClick={() => showSourceForm ? setShowSourceForm(false) : openSourceForm()}>
                    <Plus size={16} /> {showSourceForm ? "Hide source form" : "Add source link"}
                  </Button>
                </div>
                {showSourceForm && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Source title" htmlFor={`voice-source-title-${profile.id}`} />
                        <input
                          id={`voice-source-title-${profile.id}`}
                          value={sourceForm.title}
                          onChange={(event) => updateSourceForm("title", event.target.value)}
                          className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Danny X account, Ramp launch post..."
                        />
                      </div>
                      <div>
                        <FieldLabel label="Source kind" htmlFor={`voice-source-kind-${profile.id}`} />
                        <select
                          id={`voice-source-kind-${profile.id}`}
                          value={sourceForm.sourceKind}
                          onChange={(event) => updateSourceForm("sourceKind", event.target.value as ProfileSourceKind)}
                          className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                        >
                          {profileSourceKinds.map((kind) => (
                            <option key={kind} value={kind}>{kind}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel label="URL if present" htmlFor={`voice-source-url-${profile.id}`} />
                        <input
                          id={`voice-source-url-${profile.id}`}
                          value={sourceForm.url}
                          onChange={(event) => updateSourceForm("url", event.target.value)}
                          className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                          placeholder="https://www.linkedin.com/in/..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel label="Pasted example text" htmlFor={`voice-source-pasted-${profile.id}`} />
                        <textarea
                          id={`voice-source-pasted-${profile.id}`}
                          value={sourceForm.pastedText}
                          onChange={(event) => updateSourceForm("pastedText", event.target.value)}
                          className="mt-2 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Optional: paste a post, caption, website excerpt, or voice example for this source."
                        />
                      </div>
                      <div>
                        <FieldLabel label="Platform" htmlFor={`voice-source-platform-${profile.id}`} />
                        <select
                          id={`voice-source-platform-${profile.id}`}
                          value={sourceForm.platform}
                          onChange={(event) => updateSourceForm("platform", event.target.value as ProfileSourcePlatform)}
                          className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                        >
                          {profileSourcePlatformOptions.map((platform) => (
                            <option key={platform} value={platform}>{platform}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Source type" htmlFor={`voice-source-type-${profile.id}`} />
                        <select
                          id={`voice-source-type-${profile.id}`}
                          value={sourceForm.sourceType}
                          onChange={(event) => updateSourceForm("sourceType", event.target.value as ProfileSourceType)}
                          className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                        >
                          {profileSourceTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Notes" htmlFor={`voice-source-notes-${profile.id}`} />
                        <input
                          id={`voice-source-notes-${profile.id}`}
                          value={sourceForm.notes}
                          onChange={(event) => updateSourceForm("notes", event.target.value)}
                          className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                          placeholder="What should the app learn later?"
                        />
                      </div>
                      <label className="mt-8 flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={sourceForm.patternOnly}
                          onChange={(event) => updateSourceForm("patternOnly", event.target.checked)}
                        />
                        Pattern only, do not copy wording
                      </label>
                    </div>
                    <div className="mt-4 rounded-md border border-dashed border-border bg-white p-3">
                      <FieldLabel label="Screenshot example" htmlFor={`voice-source-inline-screenshot-${profile.id}`} />
                      <input
                        id={`voice-source-inline-screenshot-${profile.id}`}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => handleSourceScreenshot(event.target.files?.[0])}
                        className="mt-2 block w-full text-sm text-muted-foreground"
                      />
                      {sourceScreenshot && (
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">
                          Screenshot attached: {sourceScreenshot.filename}
                        </p>
                      )}
                    </div>
                    {sourceForm.patternOnly && (sourceForm.sourceType === "internal voice" || sourceForm.sourceType === "company account") && (
                      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                        Internal voices can guide cadence and style. Pattern-only is usually for external inspiration.
                      </p>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setShowSourceForm(false)}>Cancel</Button>
                      <Button onClick={saveVoiceSource} disabled={!sourceForm.url.trim() && !sourceForm.pastedText.trim() && !sourceForm.notes.trim() && !sourceScreenshot}>
                        Save source
                      </Button>
                    </div>
                  </div>
                )}
                <div className="mt-3 text-sm">
                  {sourceMessage && <span className="font-semibold text-primary">{sourceMessage}</span>}
                  {sourceError && <span className="font-semibold text-red-700">{sourceError}</span>}
                </div>
                <div className="mt-4 grid gap-3">
                  {(profile.voiceSources ?? []).length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
                      No source links yet. Add a profile, account, website, or post link to prepare this voice for future sync and analysis.
                    </div>
                  ) : (
                    (profile.voiceSources ?? []).map((source) => (
                      <div key={source.id} className="rounded-md border border-border bg-white p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-bold">{source.platform}</p>
                            <Pill>{source.sourceType}</Pill>
                            <Pill>{profileSourceDisplayStatus(source)}</Pill>
                          </div>
                          {source.url && <p className="mt-2 truncate text-sm text-muted-foreground">{source.url}</p>}
                          <p className="mt-2 text-xs font-semibold text-muted-foreground">
                            Next step: {sourceNextStep(source)}
                          </p>
                          {source.url && !source.analysis && isSocialProfileSource(source) && (
                            <p className="mt-2 text-xs font-semibold text-muted-foreground">
                              Source link saved. Social content has not been synced or analyzed yet.
                            </p>
                          )}
                          {source.syncStatus === "fetch blocked" && (
                            <p className="mt-2 text-xs font-semibold text-amber-800">
                              This platform blocked public fetching. The link is saved, but the app could not analyze the page automatically.
                            </p>
                          )}
                          {isLinkedInCompanyPostsProfileSource(source) && !source.analysis && (
                            <p className="mt-2 text-xs font-semibold text-muted-foreground">
                              LinkedIn pages often block automated fetching. If this fails, add screenshots or pasted posts, or use approved API access later.
                            </p>
                          )}
                          {source.analysis && sourceLearningKind(source) === "Notes analyzed" && isSocialProfileSource(source) && (
                            <p className="mt-2 text-xs font-semibold text-amber-800">
                              Notes analyzed. Social content not synced yet.
                            </p>
                          )}
                          {sourceDetailsId === source.id && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-muted-foreground">
                              <p><span className="font-semibold text-foreground">Pattern mode:</span> {source.patternOnly ? "Pattern-only" : "Internal voice"}</p>
                              <p><span className="font-semibold text-foreground">Readiness:</span> {profileSourceReadinessLabel(source)}</p>
                              <p><span className="font-semibold text-foreground">Last analyzed:</span> {source.lastAnalyzed ?? "Never"}</p>
                              <p><span className="font-semibold text-foreground">Last synced:</span> {source.lastSynced}</p>
                              {source.screenshot?.filename && <p><span className="font-semibold text-foreground">Screenshot:</span> {source.screenshot.filename}</p>}
                              {source.notes && <p><span className="font-semibold text-foreground">Notes:</span> {source.notes}</p>}
                              {source.fetchedContent && <p className="mt-2 line-clamp-3">Fetched website text: {source.fetchedContent}</p>}
                              {source.pastedText && <p className="mt-2 line-clamp-3">Pasted text: {source.pastedText}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => {
                            openSourceForm({
                              title: source.title ? `${source.title} example` : `${source.platform} example`,
                              sourceKind: "pasted text",
                              url: source.url,
                              platform: source.platform,
                              sourceType: source.sourceType,
                              syncStatus: "stored only",
                              pastedText: "",
                              notes: source.notes,
                              patternOnly: source.patternOnly
                            });
                          }}>
                            Add example
                          </Button>
                          {source.url && isWebsiteProfileSource(source) && (
                            <Button size="sm" variant="secondary" onClick={() => fetchProfileSource(source.id)}>
                              Fetch website source
                            </Button>
                          )}
                          {source.url && isSocialProfileSource(source) && (
                            <Button size="sm" variant="secondary" onClick={() => tryPublicLinkAnalysis(source.id)} disabled={isAnalyzingSource === source.id}>
                              {isAnalyzingSource === source.id ? "Trying..." : "Try public analysis"}
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => analyzeVoiceSource(source.id)} disabled={isAnalyzingSource === source.id || !sourceHasAnalyzableContent(source)}>
                            {isAnalyzingSource === source.id ? "Analyzing..." : sourceAnalyzeButtonLabel(source)}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setSourceDetailsId(sourceDetailsId === source.id ? "" : source.id)}>
                            Details
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => deleteVoiceSource(source.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <p className="text-base font-bold">Learned voice</p>
                {analyzedProfileSources(profile).length === 0 && profileVoiceExampleTitles(profile).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Voice source links are saved, but no voice has been learned yet.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <AnalysisBlock label="Confidence level" value={voiceSourceConfidence(profile)} />
                    <AnalysisBlock label="Learning basis" value={profileLearningBasisSummary(profile)} />
                    <AnalysisBlock label="Learned tone" value={profile.personality.voiceTraits} />
                    <AnalysisBlock label="Hook patterns" value={profile.personality.commonHooks} />
                    <AnalysisBlock label="Common topics" value={profile.personality.commonTopics} />
                    <AnalysisBlock label="Source links count" value={`${(profile.voiceSources ?? []).filter((source) => source.url).length}`} />
                    <AnalysisBlock label="Analyzed internal sources" value={`${analyzedInternalSourceCount(profile)}`} />
                    <AnalysisBlock label="Analyzed inspiration sources" value={`${analyzedInspirationSourceCount(profile)}`} />
                    <AnalysisBlock label="Pattern-only notes" value={analyzedInspirationSourceCount(profile) > 0 ? `${analyzedInspirationSourceCount(profile)} analyzed external sources influence format/style only.` : "External sources are pattern-only and do not provide facts or claims."} />
                    <AnalysisBlock label="Analyzed examples" value={`${analyzedProfileSources(profile).length + profileVoiceExampleTitles(profile).length}`} />
                  </div>
                )}
              </div>
              <details className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-base font-bold">
                  Optional: add examples manually
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fallback for pasted text, screenshots, or notes when direct source sync is not available yet.
                </p>
                <div className="mt-4 rounded-md border border-dashed border-border bg-muted p-3">
                  <FieldLabel label="Upload screenshot fallback" htmlFor={`voice-source-screenshot-${profile.id}`} />
                  <input
                    id={`voice-source-screenshot-${profile.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(event) => handleSourceScreenshot(event.target.files?.[0])}
                    className="mt-2 block w-full text-sm text-muted-foreground"
                  />
                  {sourceScreenshot && (
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      Screenshot attached: {sourceScreenshot.filename}. Add source link above to save it with a source.
                    </p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Example title" htmlFor={`voice-title-${profile.id}`} />
                    <input
                      id={`voice-title-${profile.id}`}
                      value={voiceForm.title}
                      onChange={(event) => updateVoiceForm("title", event.target.value)}
                      className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Danny LinkedIn post about deployment speed"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Platform/source" htmlFor={`voice-platform-${profile.id}`} />
                    <select
                      id={`voice-platform-${profile.id}`}
                      value={voiceForm.platform}
                      onChange={(event) => updateVoiceForm("platform", event.target.value as ProfileVoicePlatform)}
                      className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                    >
                      {profileVoicePlatforms.map((platform) => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <FieldLabel label="Pasted post / caption / text" htmlFor={`voice-content-${profile.id}`} />
                  <textarea
                    id={`voice-content-${profile.id}`}
                    value={voiceForm.content}
                    onChange={(event) => updateVoiceForm("content", event.target.value)}
                    className="mt-2 min-h-36 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Paste the example here..."
                  />
                </div>
                <div className="mt-4">
                  <FieldLabel label="Optional notes" htmlFor={`voice-notes-${profile.id}`} />
                  <input
                    id={`voice-notes-${profile.id}`}
                    value={voiceForm.notes}
                    onChange={(event) => updateVoiceForm("notes", event.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="What should the app learn from this?"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={voiceForm.useAsVoice}
                      onChange={(event) => updateVoiceForm("useAsVoice", event.target.checked)}
                    />
                    Use as voice/style example
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={voiceForm.patternOnly}
                      onChange={(event) => updateVoiceForm("patternOnly", event.target.checked)}
                    />
                    Pattern only, do not copy wording
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    {voiceMessage && <span className="font-semibold text-primary">{voiceMessage}</span>}
                    {voiceError && <span className="font-semibold text-red-700">{voiceError}</span>}
                  </div>
                  <Button onClick={saveVoiceExample} disabled={isAnalyzingVoice || !voiceForm.content.trim()}>
                    <Sparkles size={16} /> {isAnalyzingVoice ? "Analyzing..." : "Analyze voice"}
                  </Button>
                </div>
              </details>
              <div className="grid gap-3">
                {(profile.voiceExamples ?? []).length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
                    No voice examples yet. Add 3-5 strong examples to teach tone, hooks, structure, and phrasing.
                  </div>
                ) : (
                  (profile.voiceExamples ?? []).map((example) => (
                    <div key={example.id} className="rounded-md border border-border bg-white p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{example.title}</p>
                            <Pill>{example.platform}</Pill>
                            <Pill>{example.generatedBy ?? "Fallback"}</Pill>
                            {example.useAsVoice && <Pill>Used for voice</Pill>}
                            {example.patternOnly && <Pill>Pattern only</Pill>}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{example.content}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => toggleVoiceExample(example.id, "useAsVoice")}>
                            {example.useAsVoice ? "Pause" : "Use"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => toggleVoiceExample(example.id, "patternOnly")}>
                            {example.patternOnly ? "Pattern only" : "Allow style"}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => deleteVoiceExample(example.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      {example.analysis && (
                        <details className="mt-3 rounded-md bg-muted p-3 text-sm">
                          <summary className="cursor-pointer font-bold">Voice analysis</summary>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <AnalysisBlock label="Tone traits" value={example.analysis.toneTraits.join(", ") || "None detected"} />
                            <AnalysisBlock label="Hook patterns" value={example.analysis.hookPatterns.join(", ") || "None detected"} />
                            <AnalysisBlock label="Sentence style" value={example.analysis.sentenceStyle.join(", ") || "None detected"} />
                            <AnalysisBlock label="Formatting habits" value={example.analysis.formattingHabits.join(", ") || "None detected"} />
                            <AnalysisBlock label="What to imitate" value={example.analysis.imitate.join(", ") || "None detected"} />
                            <AnalysisBlock label="What not to copy" value={example.analysis.doNotCopy.join(", ") || "None detected"} />
                          </div>
                        </details>
                      )}
                    </div>
                  ))
                )}
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
