"use client";

import { Heart, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign, GeneratedPost } from "@/lib/types";

type PlatformPreviewProps = {
  post: GeneratedPost;
  campaign: Campaign;
  mediaPreviewUrl: string;
  formatPostContent: (content: string, campaign?: Campaign, post?: GeneratedPost) => string;
  extractPostDetail: (content: string, label: string) => string;
};

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
  return content.match(/Caption:\s*([\s\S]*?)(?=\n\n(?:CTA|Suggested overlay text|Shot list):|$)/i)?.[1]?.trim() ?? content;
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

function Avatar({ name }: { name?: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {initialsFromName(name)}
    </div>
  );
}

function LinkedInPreview({ post, campaign, mediaPreviewUrl, formatPostContent }: PlatformPreviewProps) {
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
        {formatPostContent(post.content, campaign, post)}
      </div>
      {post.mediaUsed && (
        <div className="border-y border-border">
          <MediaPreviewFrame campaign={campaign} mediaPreviewUrl={mediaPreviewUrl} className="max-h-96" />
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

function XPreview({ post, campaign, mediaPreviewUrl, formatPostContent }: PlatformPreviewProps) {
  const mainText = formatPostContent(post.content, campaign, post).replace(/Thread version:[\s\S]*/i, "").trim();
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
          <p className="mt-2 whitespace-pre-wrap text-base leading-6">{mainText}</p>
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
  mediaPreviewUrl,
  formatPostContent,
  extractPostDetail
}: PlatformPreviewProps) {
  const displayContent = formatPostContent(post.content, campaign, post);
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
          <div className="absolute left-4 top-4 max-w-full rounded-md bg-black/70 px-3 py-2 text-sm font-bold text-white">
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
  mediaPreviewUrl,
  formatPostContent,
  extractPostDetail
}: PlatformPreviewProps) {
  const displayContent = formatPostContent(post.content, campaign, post);
  const hook = hookFromContent(displayContent) || post.overlayText || extractPostDetail(post.content, "Suggested overlay text");
  const shots = post.shotList?.length ? post.shotList : shotListIdeas(post.content);
  const cta = post.cta || extractPostDetail(post.content, "CTA");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-3xl border-8 border-slate-900 bg-slate-950 shadow-xl">
        <div className="relative aspect-story bg-slate-900 text-white">
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

export function PlatformPreview(props: PlatformPreviewProps) {
  if (props.post.platform === "LinkedIn") {
    return <LinkedInPreview {...props} />;
  }

  if (props.post.platform === "X") {
    return <XPreview {...props} />;
  }

  if (props.post.platform === "Instagram") {
    return <InstagramPreview {...props} />;
  }

  return <TikTokPreview {...props} />;
}
