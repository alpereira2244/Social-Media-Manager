"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BriefItem, Pill } from "@/components/social-command-center/common-ui";
import { cn } from "@/lib/utils";
import { formatShortDateTime } from "@/lib/date-format";
import type { BrandVoiceProfile, FeedbackMemoryItem, FeedbackMemorySummary } from "@/lib/types";

export function BrandRules({
  uploadText,
  brandVoice,
  setBrandVoice,
  saveBrandRules,
  feedbackMemory,
  memorySummary,
  useFeedbackMemory,
  setUseFeedbackMemory,
  updateFeedbackMemoryItem,
  deleteFeedbackMemoryItem
}: {
  uploadText: string;
  brandVoice: BrandVoiceProfile;
  setBrandVoice: (profile: BrandVoiceProfile) => void;
  saveBrandRules: (profile: BrandVoiceProfile) => void;
  feedbackMemory: FeedbackMemoryItem[];
  memorySummary: FeedbackMemorySummary;
  useFeedbackMemory: boolean;
  setUseFeedbackMemory: (value: boolean) => void;
  updateFeedbackMemoryItem: (id: string, updates: Partial<FeedbackMemoryItem>) => void;
  deleteFeedbackMemoryItem: (id: string) => void;
}) {
  const wordCount = uploadText.split(/\s+/).filter(Boolean).length;
  const [savedAt, setSavedAt] = useState("");

  function updateField(field: keyof BrandVoiceProfile, value: string) {
    setBrandVoice({ ...brandVoice, [field]: value });
  }

  function handleSave() {
    saveBrandRules(brandVoice);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold">Brand Voice Rules</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Brand Voice Rules are global writing guardrails applied to every generated post.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-sm font-semibold text-primary">Saved {savedAt}</span>
            )}
            <Button size="sm" onClick={handleSave}>
              Save profile
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <VoiceField
            id="voice-tone"
            title="Tone"
            value={brandVoice.tone}
            onChange={(value) => updateField("tone", value)}
          />
          <VoiceField
            id="voice-style"
            title="Style"
            value={brandVoice.style}
            onChange={(value) => updateField("style", value)}
          />
          <VoiceField
            id="voice-audience"
            title="Audience"
            value={brandVoice.audience}
            onChange={(value) => updateField("audience", value)}
          />
          <VoiceField
            id="voice-avoid"
            title="Avoid"
            value={brandVoice.avoid}
            onChange={(value) => updateField("avoid", value)}
          />
        </div>
      </Card>
      <Card className="p-5">
        <Sparkles className="text-primary" size={24} />
        <h3 className="mt-4 text-lg font-bold">Mock confidence</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Based on pasted examples, this profile is ready for mock generation.
        </p>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(95, 45 + wordCount)}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold">{Math.min(95, 45 + wordCount)}% profile strength</p>
      </Card>
      <Card className="p-5 lg:col-span-3">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold">Feedback Memory</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Learns lightweight taste preferences from edits, regenerations, approvals, rejections, review feedback, and quick actions. It complements Brand Voice Rules and never replaces Company Knowledge.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={useFeedbackMemory}
              onChange={(event) => {
                setUseFeedbackMemory(event.target.checked);
              }}
            />
            Use in generation
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <BriefItem label="Confidence" value={`${memorySummary.confidence} · ${memorySummary.eventCount} signal${memorySummary.eventCount === 1 ? "" : "s"}`} />
          <BriefItem label="Status" value={memorySummary.enabled ? "Enabled" : "Disabled"} />
          <BriefItem label="Platform preferences" value={Object.keys(memorySummary.platformPreferences).length.toString()} />
          <BriefItem label="Profile preferences" value={Object.keys(memorySummary.profilePreferences).length.toString()} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-extrabold">Top learned preferences</p>
            {memorySummary.topPreferences.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {memorySummary.topPreferences.map((preference) => (
                  <Pill key={preference}>{preference}</Pill>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No preferences learned yet. Regenerate, edit, approve, reject, or leave review feedback to teach the app.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-extrabold">Platform-specific preferences</p>
            {Object.keys(memorySummary.platformPreferences).length > 0 ? (
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(memorySummary.platformPreferences).map(([platform, preferences]) => (
                  <p key={platform}>
                    <span className="font-bold">{platform}:</span> {preferences.join("; ")}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Platform preferences will appear after a few signals.</p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-extrabold">Recent feedback events</p>
          {feedbackMemory.length === 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-muted-foreground">
              Feedback Memory is empty. It will start learning from future edits and review decisions.
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              {feedbackMemory.slice(0, 12).map((item) => (
                <div key={item.id} className={cn("rounded-lg border bg-white p-4", item.ignored ? "border-slate-200 opacity-60" : "border-slate-200")}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Pill>{item.sourceType}</Pill>
                        {item.platform && <Pill>{item.platform}</Pill>}
                        {item.postingAccountName && <Pill>{item.postingAccountName}</Pill>}
                        {item.important && <Pill>Important</Pill>}
                        {item.ignored && <Pill>Ignored</Pill>}
                      </div>
                      <p className="mt-3 text-sm font-semibold">{item.inferredPreference}</p>
                      {item.feedbackText && <p className="mt-1 text-sm text-muted-foreground">{item.feedbackText}</p>}
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">{formatShortDateTime(item.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => updateFeedbackMemoryItem(item.id, { important: !item.important, ignored: false })}>
                        {item.important ? "Unmark important" : "Mark important"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => updateFeedbackMemoryItem(item.id, { ignored: !item.ignored, important: false })}>
                        {item.ignored ? "Use again" : "Ignore"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => deleteFeedbackMemoryItem(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function VoiceField({
  id,
  title,
  value,
  onChange
}: {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <label className="font-semibold" htmlFor={id}>{title}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-24 w-full rounded-md border border-input bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
