"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShortDateTime } from "@/lib/date-format";
import type { BrandSafetyCheck } from "@/lib/types";

const brandSafetyQuickActions = [
  { label: "Make safer", instruction: "Make this safer by removing unsupported claims, confidential details, and sensitive operational specifics." },
  { label: "Remove unsupported claim", instruction: "Remove unsupported claims and keep only what is grounded in the content brief or Company Knowledge." },
  { label: "Make less hypey", instruction: "Make this less hypey, more precise, and less promotional." },
  { label: "Make more specific", instruction: "Make this more specific using only the current content brief, media notes, and Company Knowledge." }
];

function safetyStatusClass(status: BrandSafetyCheck["status"]) {
  if (status === "Safe") return "bg-teal-100 text-primary";
  if (status === "Needs review") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

async function readBrandSafetyResponse(response: Response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Brand safety check failed");
  }

  return payload;
}

export function BrandSafetyPanel({
  fallbackCheck,
  requestBody,
  onAction,
  onUpdateCheck,
  compact = false
}: {
  fallbackCheck: BrandSafetyCheck;
  requestBody: Record<string, unknown>;
  onAction?: (instruction: string) => void;
  onUpdateCheck?: (check: BrandSafetyCheck) => void;
  compact?: boolean;
}) {
  const [check, setCheck] = useState<BrandSafetyCheck>(fallbackCheck);
  const [isChecking, setIsChecking] = useState(false);
  const [hasRequestedAi, setHasRequestedAi] = useState(false);
  const [showSafetyDetails, setShowSafetyDetails] = useState(!compact);

  useEffect(() => {
    setCheck(fallbackCheck);
  }, [fallbackCheck]);

  useEffect(() => {
    if (hasRequestedAi || fallbackCheck.source === "AI") return;

    let cancelled = false;
    setHasRequestedAi(true);
    setIsChecking(true);
    fetch("/api/brand-safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    })
      .then(readBrandSafetyResponse)
      .then((payload) => {
        if (cancelled || !payload?.check) return;
        const nextCheck = payload.check as BrandSafetyCheck;
        setCheck(nextCheck);
        onUpdateCheck?.(nextCheck);
      })
      .catch((error) => {
        console.info("[SCC] Brand safety AI check unavailable; using fallback.", error);
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackCheck.source, hasRequestedAi, onUpdateCheck, requestBody]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Brand Safety / Claim Check</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Checks claims, sensitive details, hype, generic language, and platform fit before publishing.
          </p>
        </div>
        <span className={cn("rounded-md px-3 py-1 text-sm font-bold shadow-sm", safetyStatusClass(check.status))}>
          {isChecking ? "Checking..." : check.status}
        </span>
      </div>
      <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
        <span className="font-semibold">{check.notes[0] ?? "No obvious safety issues."}</span>
      </div>
      {compact && (
        <button
          type="button"
          onClick={() => setShowSafetyDetails((current) => !current)}
          className="mt-3 text-sm font-bold text-primary"
        >
          {showSafetyDetails ? "Hide safety details" : "View safety details"}
        </button>
      )}
      {showSafetyDetails && (
        <>
          <div className="mt-3 grid gap-2">
            {check.notes.map((note) => (
              <div key={note} className="flex gap-2 rounded-md bg-slate-50 p-2 text-sm">
                <span className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  check.status === "Safe" ? "bg-teal-100 text-primary" : check.status === "Needs review" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
                )}>
                  {check.status === "Safe" ? "OK" : "!"}
                </span>
                <span>{note}</span>
              </div>
            ))}
          </div>
          {(check.claimMatches ?? []).length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Claim status</p>
              <div className="mt-2 grid gap-2">
                {(check.claimMatches ?? []).map((match, index) => (
                  <div key={`${match.claimText}-${index}`} className="rounded-md bg-slate-50 p-2 text-sm">
                    <span className={cn("mr-2 rounded px-2 py-1 text-xs font-extrabold", match.claimType === "Approved claim" || match.claimType === "Proof-backed" ? "bg-teal-100 text-primary" : match.claimType === "Do not say" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>
                      {match.claimType}
                    </span>
                    <span>{match.note}</span>
                    <p className="mt-1 text-muted-foreground">{match.claimText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Source: {check.source === "AI" ? "AI assisted" : "deterministic fallback"} · Last checked {formatShortDateTime(check.checkedAt)}
          </p>
        </>
      )}
      {onAction && showSafetyDetails && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Quick actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {brandSafetyQuickActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onAction(action.instruction)}
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
