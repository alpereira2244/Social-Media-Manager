"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PostReadinessSummary = {
  score: number;
  label: string;
  items: Array<{
    label: string;
    passed: boolean;
    suggestion: string;
  }>;
  suggestions: string[];
};

const improveActions = [
  {
    label: "Strengthen hook",
    instruction: "Strengthen the opening hook and make the first line more specific."
  },
  {
    label: "Make shorter",
    instruction: "Make this shorter and tighter while preserving the core idea."
  },
  {
    label: "Add CTA",
    instruction: "Add a clear, natural CTA that fits the platform."
  },
  {
    label: "Add alt text",
    instruction: "Add useful alt text or media accessibility guidance."
  },
  {
    label: "Make less generic",
    instruction: "Make this less generic by adding concrete details from the content brief."
  },
  {
    label: "Improve media fit",
    instruction: "Connect the post more clearly to the uploaded media or media notes."
  },
  {
    label: "Make it more Conduit",
    instruction: "Rewrite this to be more Conduit: specific, grounded in factory automation and real operations, less hypey, more direct, and closer to the selected brief and media context."
  }
];

export function PostReadinessPanel({
  readiness,
  onImprove,
  compact = false
}: {
  readiness: PostReadinessSummary;
  onImprove?: (instruction: string) => void;
  compact?: boolean;
}) {
  const [showFullScore, setShowFullScore] = useState(!compact);
  const barClass =
    readiness.score >= 85
      ? "bg-primary"
      : readiness.score >= 65
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Post Readiness</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">{readiness.score}/100</p>
        </div>
        <span className={cn(
          "rounded-md px-3 py-1 text-sm font-bold shadow-sm",
          readiness.score >= 85
            ? "bg-teal-100 text-primary"
            : readiness.score >= 65
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-700"
        )}>
          {readiness.label}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${readiness.score}%` }} />
      </div>
      {readiness.suggestions.length > 0 && (
        <div className="mt-3 rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">Top suggestions</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
            {readiness.suggestions.slice(0, compact ? 2 : 4).map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      {compact && (
        <button
          type="button"
          onClick={() => setShowFullScore((current) => !current)}
          className="mt-3 text-sm font-bold text-primary"
        >
          {showFullScore ? "Hide full score" : "View full score"}
        </button>
      )}
      {showFullScore && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {readiness.items.map((item) => (
            <div key={item.label} className="flex gap-2 rounded-md bg-slate-50 p-2 text-sm">
              <span className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                item.passed ? "bg-teal-100 text-primary" : "bg-amber-100 text-amber-800"
              )}>
                {item.passed ? "OK" : "!"}
              </span>
              <span>
                <span className="font-semibold">{item.label}</span>
                {!item.passed && <span className="block text-muted-foreground">{item.suggestion}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {onImprove && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Improve score</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {improveActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="secondary"
                onClick={() => onImprove(action.instruction)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
