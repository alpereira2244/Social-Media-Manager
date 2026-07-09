"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnalysisBlock, BriefItem, Pill } from "@/components/social-command-center/common-ui";
import { FieldLabel } from "@/components/social-command-center/field-label";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { readJsonResponse } from "@/lib/http-helpers";
import { mediaTypeFromFile, readFileAsDataUrl } from "@/lib/media-utils";
import { userFacingPostContent } from "@/lib/post-content";
import { normalizeQueueStatus } from "@/lib/queue-calendar";
import type { StorageMode } from "@/lib/supabase/persistence";
import { cn } from "@/lib/utils";
import { platforms } from "@/lib/mock-data";
import type {
  ActivityLogItem,
  ApprovedPostMemory,
  Campaign,
  MediaAsset,
  Platform,
  PostQueueItem,
  Profile,
  SimpleStyleChip
} from "@/lib/types";

type MediaContentPackConfig = {
  postingAccountId: string;
  styleChip: SimpleStyleChip;
  intent: string;
  contextNotes: string;
  platforms: Platform[];
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

const maxAiImageUploadBytes = 2_500_000;

const simpleStyleOptions: { label: SimpleStyleChip; instruction: string }[] = [
  { label: "Conduit default", instruction: "Use the standard Conduit voice." },
  { label: "More founder-led", instruction: "Make it more founder-led and direct." },
  { label: "More technical", instruction: "Make it more technical and operational." },
  { label: "Bolder", instruction: "Make the hook more opinionated." },
  { label: "More polished", instruction: "Make it cleaner and more executive." },
  { label: "More concise", instruction: "Make it shorter and tighter." }
];

function looksLikeGenericIntent(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length < 8 || /^(post|make a post|content|caption)$/i.test(trimmed);
}

export function MediaLibrary({
  mediaAssets,
  setMediaAssets,
  persistMediaAsset,
  removeMediaAsset,
  campaigns,
  approvedPosts,
  postQueue,
  profiles,
  isGenerating,
  recordActivity,
  onGenerateContentPack,
  onUseMediaAsset,
  storageMode
}: {
  mediaAssets: MediaAsset[];
  setMediaAssets: Dispatch<SetStateAction<MediaAsset[]>>;
  persistMediaAsset: (asset: MediaAsset, file?: File | null) => Promise<MediaAsset>;
  removeMediaAsset: (assetId: string) => void;
  campaigns: Campaign[];
  approvedPosts: ApprovedPostMemory[];
  postQueue: PostQueueItem[];
  profiles: Profile[];
  isGenerating: boolean;
  recordActivity: (input: Omit<ActivityLogItem, "id" | "createdAt" | "userEmail" | "workspaceName">) => ActivityLogItem;
  onGenerateContentPack: (asset: MediaAsset, config: MediaContentPackConfig) => Promise<void>;
  onUseMediaAsset: (asset: MediaAsset) => void;
  storageMode: StorageMode;
}) {
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [packAssetId, setPackAssetId] = useState("");
  const selectedAsset = mediaAssets.find((asset) => asset.id === selectedAssetId);
  const packAsset = mediaAssets.find((asset) => asset.id === packAssetId);

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
      recordActivity({
        actionType: "Media uploaded",
        objectType: "Media Asset",
        objectId: nextAsset.id,
        title: "Media uploaded",
        summary: `${nextAsset.filename} was saved to Media Library.`,
        destination: "Media Library",
        status: "success"
      });
      if (mediaType === "image" && mediaHasAiAnalysis(nextAsset)) {
        recordActivity({
          actionType: "Media asset analyzed",
          objectType: "Media Asset",
          objectId: nextAsset.id,
          title: "Media asset analyzed",
          summary: `${nextAsset.filename} has AI media analysis available.`,
          destination: "Media Library",
          status: "success"
        });
      }
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

  async function analyzeExistingAsset(asset: MediaAsset) {
    setMessage("");
    setError("");
    if (asset.mediaType !== "image") {
      setMessage("Video/audio transcription and frame analysis can be added later.");
      return;
    }

    const src = asset.localPreviewUrl || asset.publicUrl;
    if (!src) {
      setError("Media preview unavailable. Re-upload or select a saved public media asset before analysis.");
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      if (blob.size > maxAiImageUploadBytes) {
        setError("This image is too large for AI analysis. Add notes to guide generation instead.");
        return;
      }
      const imageDataUrl = await readFileAsDataUrl(new File([blob], asset.filename, { type: blob.type || asset.fileType }));
      const analysisResponse = await fetch("/api/analyze-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          filename: asset.filename,
          notes: asset.notes
        })
      });
      const payload = await readJsonResponse(analysisResponse, "Image analysis failed");
      if (!analysisResponse.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error ?? "Image analysis failed.");
      }

      const nextAsset: MediaAsset = {
        ...asset,
        description: payload.data.description,
        suggestedAngles: payload.data.suggestedAngles ?? [],
        overlayText: payload.data.overlayText,
        sensitivityWarnings: payload.data.sensitivityWarnings ?? [],
        altText: payload.data.altText,
        tags: (asset.tags ?? []).length > 0 ? asset.tags : payload.data.tags ?? []
      };
      await updateAsset(nextAsset);
      recordActivity({
        actionType: "Media asset analyzed",
        objectType: "Media Asset",
        objectId: asset.id,
        title: "Media asset analyzed",
        summary: `${asset.filename} has updated AI media analysis.`,
        destination: "Media Library",
        status: "success"
      });
      setMessage("Media analysis saved.");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Could not analyze this media asset.");
    }
  }

  function deleteAsset(assetId: string) {
    const asset = mediaAssets.find((item) => item.id === assetId);
    if (!window.confirm(`Delete ${asset?.filename || "this media asset"}? This removes the reusable asset from Media Library but does not delete content already created from it.`)) {
      return;
    }
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

        <div className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
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
            Upload media to generate platform-ready post packs.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mediaAssets.map((asset) => {
            const usage = mediaAssetUsage(asset, campaigns, approvedPosts, postQueue);
            return (
              <MediaAssetCard
                key={asset.id}
                asset={asset}
                usage={usage}
                onGeneratePack={() => setPackAssetId(asset.id)}
                onUse={() => onUseMediaAsset(asset)}
                onViewDetails={() => setSelectedAssetId(asset.id)}
                onDelete={() => deleteAsset(asset.id)}
              />
            );
          })}
        </div>
      )}

      {selectedAsset && (
        <MediaAssetDetailsPanel
          asset={selectedAsset}
          campaigns={campaigns}
          approvedPosts={approvedPosts}
          postQueue={postQueue}
          onClose={() => setSelectedAssetId("")}
          onGeneratePack={() => setPackAssetId(selectedAsset.id)}
          onUse={() => onUseMediaAsset(selectedAsset)}
          onUpdate={updateAsset}
          onDelete={() => deleteAsset(selectedAsset.id)}
        />
      )}

      {packAsset && (
        <MediaContentPackPanel
          asset={packAsset}
          profiles={profiles}
          isGenerating={isGenerating}
          onAnalyzeAsset={() => void analyzeExistingAsset(packAsset)}
          onClose={() => setPackAssetId("")}
          onGenerate={async (config) => {
            await onGenerateContentPack(packAsset, config);
            setPackAssetId("");
          }}
        />
      )}
    </div>
  );
}

function mediaAssetUsage(
  asset: MediaAsset,
  campaigns: Campaign[],
  approvedPosts: ApprovedPostMemory[],
  postQueue: PostQueueItem[]
) {
  const briefs = campaigns.filter((campaign) =>
    campaign.mediaContext?.assetId === asset.id ||
    (!campaign.mediaContext?.assetId && campaign.mediaContext?.filename === asset.filename)
  );
  const briefIds = new Set(briefs.map((campaign) => campaign.id));
  const generatedPosts = briefs.flatMap((campaign) =>
    campaign.posts
      .filter((post) => post.mediaUsed || campaign.mediaContext?.assetId === asset.id)
      .map((post) => ({ campaign, post }))
  );
  const approved = approvedPosts.filter((post) => briefIds.has(post.campaignId));
  const queueItems = postQueue.filter((item) =>
    item.mediaAssetId === asset.id ||
    (!item.mediaAssetId && item.mediaAssetName === asset.filename) ||
    briefIds.has(item.campaignId)
  );
  const readyItems = queueItems.filter((item) =>
    ["Ready", "Scheduled"].includes(normalizeQueueStatus(item.status))
  );
  const postedItems = queueItems.filter((item) =>
    ["Posted", "Replied"].includes(normalizeQueueStatus(item.status))
  );

  return {
    briefs,
    generatedPosts,
    approved,
    queueItems,
    readyItems,
    postedItems
  };
}

function mediaHasAiAnalysis(asset: MediaAsset) {
  const description = asset.description?.trim() ?? "";
  if (!description && !(asset.suggestedAngles ?? []).length && !asset.altText) return false;
  const lower = description.toLowerCase();
  return !lower.includes("ai analysis was not available") &&
    !lower.includes("saved without ai") &&
    !lower.includes("transcription and frame analysis can be added later");
}

function MediaAssetCard({
  asset,
  usage,
  onGeneratePack,
  onUse,
  onViewDetails,
  onDelete
}: {
  asset: MediaAsset;
  usage: ReturnType<typeof mediaAssetUsage>;
  onGeneratePack: () => void;
  onUse: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
}) {
  const hasAnalysis = mediaHasAiAnalysis(asset);
  const generatedCount = usage.briefs.length;
  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-panel">
      <MediaAssetPreview asset={asset} className="h-48" />
      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold">{asset.filename}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{asset.mediaType}</Pill>
            <Pill>{hasAnalysis ? "AI analysis ready" : "Needs analysis"}</Pill>
            <Pill>{generatedCount > 0 ? `${generatedCount} pack${generatedCount === 1 ? "" : "s"} generated` : "No packs yet"}</Pill>
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
          <Button size="sm" className="col-span-2" onClick={onGeneratePack}>
            Generate content pack
          </Button>
          <Button size="sm" variant="secondary" onClick={onViewDetails}>
            View details
          </Button>
          <Button size="sm" variant="secondary" onClick={onUse}>
            Use in brief
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

function MediaContentPackPanel({
  asset,
  profiles,
  isGenerating,
  onAnalyzeAsset,
  onClose,
  onGenerate
}: {
  asset: MediaAsset;
  profiles: Profile[];
  isGenerating: boolean;
  onAnalyzeAsset: () => void;
  onClose: () => void;
  onGenerate: (config: MediaContentPackConfig) => Promise<void>;
}) {
  const defaultProfile =
    profiles.find((profile) => profile.type === "Company Account") ||
    profiles.find((profile) => profile.name.toLowerCase().includes("conduit")) ||
    profiles[0];
  const [postingAccountId, setPostingAccountId] = useState(defaultProfile?.id ?? "");
  const [styleChip, setStyleChip] = useState<SimpleStyleChip>("Conduit default");
  const [intent, setIntent] = useState(
    asset.suggestedAngles?.[0] ||
    asset.notes ||
    asset.description ||
    "Use this media to explain a practical Conduit point."
  );
  const [contextNotes, setContextNotes] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["LinkedIn", "X", "Instagram", "TikTok"]);
  const hasAnalysis = mediaHasAiAnalysis(asset);

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="max-h-screen w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-white shadow-2xl">
        <div className="flex flex-col justify-between gap-3 border-b border-border p-5 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Media-to-Post Pack</p>
            <h3 className="mt-1 text-xl font-extrabold">Generate content pack</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Turn this media asset into platform-native drafts, overlay text, alt text, CTA, hashtags, and short-form script ideas.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <MediaAssetPreview asset={asset} className="h-56 rounded-lg object-contain" />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6">
              <p className="font-bold">{asset.filename}</p>
              <p className="text-muted-foreground">{asset.mediaType} · {formatShortDate(asset.uploadedAt)}</p>
              {hasAnalysis ? (
                <div className="mt-2 space-y-2">
                  <p className="font-semibold text-slate-700">Existing media analysis</p>
                  <p className="text-muted-foreground">{asset.description || "Media analysis is available."}</p>
                  {(asset.suggestedAngles ?? []).length > 0 && (
                    <p className="text-muted-foreground">Angles: {(asset.suggestedAngles ?? []).slice(0, 3).join(", ")}</p>
                  )}
                </div>
              ) : asset.mediaType === "image" ? (
                <div className="mt-2 space-y-2">
                  <p className="text-amber-800">
                    No AI image analysis is saved yet. Add context notes or analyze the image first for stronger grounding.
                  </p>
                  <Button size="sm" variant="secondary" onClick={onAnalyzeAsset}>Analyze media first</Button>
                </div>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  Video/audio transcription and frame analysis can be added later. This pack will use filename and notes.
                </p>
              )}
              {(asset.sensitivityWarnings ?? []).length > 0 && (
                <p className="mt-2 rounded-md bg-amber-100 p-2 font-semibold text-amber-900">
                  Check sensitive details: {(asset.sensitivityWarnings ?? []).join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 1</p>
              <FieldLabel label="What should this media communicate?" htmlFor="media-pack-intent" />
              <textarea
                id="media-pack-intent"
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="What should this media help communicate?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 2</p>
                <FieldLabel label="Posting account" htmlFor="media-pack-profile" />
                <select
                  id="media-pack-profile"
                  value={postingAccountId}
                  onChange={(event) => setPostingAccountId(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {profiles.length === 0 && <option value="">Conduit</option>}
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name} · {profile.type}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Style</p>
                <FieldLabel label="Style" htmlFor="media-pack-style" />
                <select
                  id="media-pack-style"
                  value={styleChip}
                  onChange={(event) => setStyleChip(event.target.value as SimpleStyleChip)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {simpleStyleOptions.map((option) => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Optional context</p>
              <FieldLabel label="Optional context notes" htmlFor="media-pack-context" />
              <textarea
                id="media-pack-context"
                value={contextNotes}
                onChange={(event) => setContextNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="What happened here? What should we avoid? Any extra context?"
              />
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Step 3</p>
              <p className="text-sm font-bold text-foreground">Platforms to include</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left text-sm font-bold transition",
                      selectedPlatforms.includes(platform)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold leading-6 text-teal-950">
              Using Conduit Company Knowledge, Brand Voice Rules, Feedback Memory, and saved media analysis automatically.
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <p className="mr-auto text-xs font-extrabold uppercase tracking-wide text-primary">Step 4: Generate pack</p>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => void onGenerate({
                  postingAccountId,
                  styleChip,
                  intent,
                  contextNotes,
                  platforms: selectedPlatforms
                })}
                disabled={isGenerating || selectedPlatforms.length === 0 || looksLikeGenericIntent(intent)}
              >
                {isGenerating ? "Generating..." : "Generate content pack"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaAssetDetailsPanel({
  asset,
  campaigns,
  approvedPosts,
  postQueue,
  onClose,
  onGeneratePack,
  onUse,
  onUpdate,
  onDelete
}: {
  asset: MediaAsset;
  campaigns: Campaign[];
  approvedPosts: ApprovedPostMemory[];
  postQueue: PostQueueItem[];
  onClose: () => void;
  onGeneratePack: () => void;
  onUse: () => void;
  onUpdate: (asset: MediaAsset) => Promise<void>;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"Overview" | "AI Analysis" | "Usage" | "Settings">("Overview");
  const [tagInput, setTagInput] = useState((asset.tags ?? []).join(", "));
  const [notesInput, setNotesInput] = useState(asset.notes ?? "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const usage = mediaAssetUsage(asset, campaigns, approvedPosts, postQueue);

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
              <MediaAssetPreview asset={asset} className="max-h-96 rounded-md object-contain" />
              <div className="grid gap-3 md:grid-cols-2">
                <BriefItem label="Filename" value={asset.filename} />
                <BriefItem label="Type" value={`${asset.mediaType} · ${asset.fileType || "unknown"}`} />
                <BriefItem label="Uploaded" value={formatShortDate(asset.uploadedAt)} />
                <BriefItem label="Tags" value={(asset.tags ?? []).join(", ") || "No tags yet"} />
              </div>
              <AnalysisBlock label="Notes" value={asset.notes || "No notes yet."} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={onGeneratePack}>Generate content pack</Button>
                <Button onClick={onUse}>Create post from this</Button>
                <Button variant="secondary" onClick={onUse}>Use in brief</Button>
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
              {usage.briefs.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50 p-4">
                  <div>
                    <p className="font-bold text-teal-950">Content has been generated from this asset.</p>
                    <p className="mt-1 text-sm text-teal-900">
                      Generate another pack when you want a fresh angle or a new platform mix.
                    </p>
                  </div>
                  <Button size="sm" onClick={onGeneratePack}>Generate another pack</Button>
                </div>
              )}
              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Content briefs generated from this media</p>
                <div className="mt-3 grid gap-2">
                  {usage.briefs.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No content has been generated from this asset yet.
                    </p>
                  ) : (
                    usage.briefs.map((campaign) => (
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
                <p className="text-sm font-bold uppercase text-muted-foreground">Posts created from this media</p>
                <div className="mt-3 grid gap-2">
                  {usage.generatedPosts.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No generated posts are tracked with this media yet.
                    </p>
                  ) : (
                    usage.generatedPosts.map(({ campaign, post }) => (
                      <div key={post.id} className="rounded-md border border-border bg-muted p-3">
                        <p className="font-semibold">{post.platform} · {campaign.name}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {userFacingPostContent(post.content, campaign, post)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Ready to Post items using this media</p>
                <div className="mt-3 grid gap-2">
                  {usage.readyItems.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No Ready or Scheduled queue items are using this media.
                    </p>
                  ) : (
                    usage.readyItems.map((item) => (
                      <div key={item.id} className="rounded-md border border-border bg-muted p-3">
                        <p className="font-semibold">{item.platform} · {normalizeQueueStatus(item.status)}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {item.postCopy || item.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold uppercase text-muted-foreground">Posted items using this media</p>
                <div className="mt-3 grid gap-2">
                  {usage.postedItems.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                      No posted items are using this media yet.
                    </p>
                  ) : (
                    usage.postedItems.map((item) => (
                      <div key={item.id} className="rounded-md border border-border bg-muted p-3">
                        <p className="font-semibold">{item.platform} · {formatShortDateTime(item.postedAt)}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {item.postCopy || item.content}
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
