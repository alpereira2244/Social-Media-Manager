"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel } from "@/components/social-command-center/field-label";
import { Pill } from "@/components/social-command-center/common-ui";
import { cn } from "@/lib/utils";
import { contentAngles, platforms } from "@/lib/mock-data";
import type { Campaign, CampaignMediaContext, ContentAngle, GeneratedPost, LibrarySource, Platform, Profile } from "@/lib/types";

type Screen = "Dashboard" | "New Campaign";

type RepurposeSource = {
  type: "campaign" | "post";
  campaignId: string;
  postId?: string;
  label: string;
  content: string;
  mediaContext?: CampaignMediaContext;
  originalProfileId?: string;
};

export function RepurposeCampaign({
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
  handleMockFallback,
  formatPostContent,
  isGenericIntent
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
  formatPostContent: (post: GeneratedPost, campaign: Campaign) => string;
  isGenericIntent: (value: string) => boolean;
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
        content: formatPostContent(post, campaign),
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
          .map((post) => `${post.platform}: ${formatPostContent(post, campaign)}`)
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
    isGenericIntent(intent);

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
          <FieldLabel label="Source post or brief" htmlFor="repurpose-source" />
          <select
            id="repurpose-source"
            value={sourceValue}
            onChange={(event) => chooseSource(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a source</option>
            {campaigns.map((campaign) => (
              <option key={`campaign-${campaign.id}`} value={`campaign:${campaign.id}`}>
                Brief: {campaign.name}
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
