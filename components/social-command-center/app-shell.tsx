"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/lib/types";

type AppShellScreen =
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

type QuickAction = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
};

const quickActions: QuickAction[] = [
  {
    id: "add-brain-source",
    title: "Add source",
    description: "Open Intake to add a URL, note, transcript, document, media, or raw idea.",
    keywords: ["brain", "source", "knowledge", "company", "url", "document", "inbox", "intake"]
  },
  {
    id: "opportunity-inbox",
    title: "Capture opportunity in Intake",
    description: "Save something Conduit may want to post about, reply to, or follow up on.",
    keywords: ["opportunity", "trend", "mention", "reply", "listening", "ideas", "world"]
  },
  {
    id: "create-post",
    title: "Create post",
    description: "Turn a clear idea, source, opportunity, or media asset into platform drafts.",
    keywords: ["post", "create", "brief", "draft", "new"]
  },
  {
    id: "review-drafts",
    title: "Open Review",
    description: "Review, improve, request approval, and approve drafts.",
    keywords: ["review", "drafts", "approval", "feedback", "queue"]
  },
  {
    id: "ready-to-post",
    title: "Open Publish Queue",
    description: "Copy, schedule, manually publish, or mark approved posts and replies as done.",
    keywords: ["ready", "queue", "publish", "manual", "reply"]
  },
  {
    id: "content-calendar",
    title: "Content Calendar",
    description: "Plan ready, scheduled, posted, replied, and suggested content.",
    keywords: ["calendar", "planner", "schedule", "date"]
  },
  {
    id: "upload-media",
    title: "Upload media",
    description: "Add reusable images, video, screenshots, or audio.",
    keywords: ["media", "upload", "image", "video", "screenshot", "audio"]
  },
  {
    id: "add-profile",
    title: "Add profile",
    description: "Create a company, founder, team, or persona profile.",
    keywords: ["profile", "person", "voice", "account"]
  },
  {
    id: "analytics",
    title: "View analytics",
    description: "Learn from manually entered metrics.",
    keywords: ["analytics", "metrics", "performance", "report"]
  },
  {
    id: "setup-checklist",
    title: "Setup checklist",
    description: "Check whether the workspace is ready to generate, review, demo, and post manually.",
    keywords: ["setup", "readiness", "checklist", "workspace", "demo", "status"]
  },
  {
    id: "feedback-memory",
    title: "Feedback Memory",
    description: "Open learned writing preferences under Voice & Guardrails.",
    keywords: ["feedback", "memory", "brand", "voice", "preferences"]
  },
  {
    id: "view-activity",
    title: "View recent activity",
    description: "Open the Dashboard Activity Log.",
    keywords: ["activity", "log", "history", "recent", "audit"]
  },
  {
    id: "undo-last-action",
    title: "Undo last action",
    description: "Restore the most recent safe action if available.",
    keywords: ["undo", "restore", "recover", "mistake"]
  },
  {
    id: "source-inbox",
    title: "Open Intake",
    description: "Feed the Conduit Brain with raw source material, captures, and imports.",
    keywords: ["source", "inbox", "intake", "brain"]
  },
  {
    id: "import-past-content",
    title: "Import past content",
    description: "Open Intake to bulk import old posts, captions, examples, and optional metrics.",
    keywords: ["import", "bulk", "past", "content", "csv", "posts", "captions", "history", "intake"]
  },
  {
    id: "install-browser-capture",
    title: "Install browser capture",
    description: "Open Intake instructions for the capture bookmarklet.",
    keywords: ["browser", "capture", "bookmarklet", "clip", "save", "source", "intake"]
  },
  {
    id: "open-capture-queue",
    title: "Review browser captures",
    description: "Open Intake to review captured links, selected text, and browser inputs.",
    keywords: ["capture", "queue", "bookmarklet", "triage", "inbox", "intake"]
  },
  {
    id: "triage-new-captures",
    title: "Triage browser captures",
    description: "Open Intake to classify newly captured browser items.",
    keywords: ["triage", "capture", "queue", "classify", "intake"]
  },
  {
    id: "add-inspiration-profile",
    title: "Add inspiration profile",
    description: "Create a pattern-only reference profile.",
    keywords: ["inspiration", "reference", "profile", "pattern", "style"]
  },
  {
    id: "add-competitor-profile",
    title: "Add competitor / market watch profile",
    description: "Save a competitor or market reference profile.",
    keywords: ["competitor", "market", "watch", "profile"]
  },
  {
    id: "add-profile-source",
    title: "Add source to profile",
    description: "Open Profiles to add a voice source link or example.",
    keywords: ["profile", "source", "voice", "link", "examples"]
  },
  {
    id: "repurpose-content",
    title: "Repurpose content",
    description: "Turn an existing post or brief into new platform drafts.",
    keywords: ["repurpose", "reuse", "content", "brief"]
  }
];

export function screenTitle(screen: AppShellScreen) {
  if (screen === "Source Inbox") return "Intake";
  if (screen === "New Campaign") return "Create Post";
  if (screen === "Review Drafts") return "Review";
  if (screen === "Ready to Post") return "Publish Queue";
  if (screen === "Content Calendar") return "Content Calendar";
  if (screen === "Opportunity Inbox") return "Opportunities";
  if (screen === "Company Knowledge") return "Conduit Brain";
  if (screen === "Brand Voice Rules") return "Voice & Guardrails";
  if (screen === "Connections") return "Settings";
  return screen;
}

function screenDescription(screen: AppShellScreen) {
  if (screen === "Dashboard") return "Create, preview, approve, and track social posts.";
  if (screen === "Source Inbox") return "Feed the brain with links, notes, media, docs, captures, imports, and raw ideas.";
  if (screen === "Opportunity Inbox") return "Review things Conduit may want to post about, reply to, or follow up on.";
  if (screen === "New Campaign") return "Turn a clear idea, source, opportunity, or media asset into platform drafts.";
  if (screen === "Review Drafts") return "Improve drafts, collect feedback, and approve content for publishing.";
  if (screen === "Ready to Post") return "The execution queue for approved posts and replies waiting for manual action.";
  if (screen === "Content Calendar") return "Plan ready, scheduled, posted, replied, and suggested content.";
  if (screen === "Analytics") return "Learn from manually entered metrics.";
  if (screen === "Content Library") {
    return "Permanent archive of drafts, posts, replies, posted items, and repurposed content.";
  }
  if (screen === "Profiles") {
    return "Profiles teach the app who is speaking, who inspires us, and what patterns to learn.";
  }
  if (screen === "Company Knowledge") return "The truth layer for Conduit facts, claims, themes, proof points, and source material.";
  if (screen === "Brand Voice Rules") return "Global writing guardrails and learned preferences applied across generation.";
  if (screen === "Connections") return "Workspace integrations, sandbox checks, and future account connections.";
  return "";
}

export function Header({
  screen,
  activeCampaign
}: {
  screen: AppShellScreen;
  activeCampaign?: Campaign;
}) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 rounded-lg border border-slate-200/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur md:flex-row md:items-center">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary">{screenTitle(screen)}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
          {screen === "Dashboard" ? "Conduit Social Command Center" : screenTitle(screen)}
        </h2>
        {screenDescription(screen) && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{screenDescription(screen)}</p>
        )}
      </div>
      {activeCampaign && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active brief</span>
          <p className="max-w-md truncate font-semibold">{activeCampaign.name}</p>
        </div>
      )}
    </div>
  );
}

export function CommandBar({
  open,
  onOpenChange,
  onRunAction
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunAction: (actionId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return quickActions;
    return quickActions.filter((action) => {
      const haystack = [action.title, action.description, ...action.keywords].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/35 px-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Quick actions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Jump to common workflows. Press Escape to close.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-4 h-12 w-full rounded-lg border border-input bg-slate-50 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search intake, source, opportunity, post, review, ready, calendar, analytics, feedback..."
          />
        </div>
        <div className="max-h-screen overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <p className="p-5 text-center text-sm text-muted-foreground">No matching actions.</p>
          ) : (
            filteredActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onRunAction(action.id)}
                className="flex w-full items-start justify-between gap-4 rounded-lg p-4 text-left transition hover:bg-teal-50"
              >
                <span>
                  <span className="block font-bold text-foreground">{action.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{action.description}</span>
                </span>
                <span className="mt-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500">
                  Open
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
