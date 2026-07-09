"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const browserCaptureStorageKey = "scc.browserCapturePayload";
const sourceCapturesStorageKey = "scc.sourceCaptures";

function sourceDomainFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function detectedPlatformFromUrl(value = "") {
  const lower = value.toLowerCase();
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "X";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube";
  if (lower.startsWith("http")) return "Website";
  return "Other";
}

function queueCapture(payload: { url: string; title: string; text: string; capturedAt: string }) {
  const now = new Date().toISOString();
  const nextCapture = {
    id: `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title?.trim() || "Browser capture",
    url: payload.url?.trim() || "",
    selectedText: payload.text?.trim() || "",
    capturedAt: payload.capturedAt || now,
    sourceDomain: sourceDomainFromUrl(payload.url),
    detectedPlatform: detectedPlatformFromUrl(payload.url),
    status: "New",
    createdAt: now,
    updatedAt: now
  };

  try {
    const existing = JSON.parse(window.localStorage.getItem(sourceCapturesStorageKey) || "[]");
    const captures = Array.isArray(existing) ? existing : [];
    const alreadyCaptured = captures.some((capture) =>
      capture?.url === nextCapture.url &&
      capture?.selectedText === nextCapture.selectedText &&
      Math.abs(new Date(capture?.capturedAt || 0).getTime() - new Date(nextCapture.capturedAt).getTime()) < 5000
    );
    if (!alreadyCaptured) {
      window.localStorage.setItem(sourceCapturesStorageKey, JSON.stringify([nextCapture, ...captures].slice(0, 100)));
    }
  } catch {
    // If localStorage is blocked, the session payload still opens Intake with the capture.
  }
}

function CaptureRedirect() {
  const searchParams = useSearchParams();
  const payload = useMemo(() => ({
    url: searchParams.get("url") ?? "",
    title: searchParams.get("title") ?? "",
    text: searchParams.get("text") ?? "",
    capturedAt: searchParams.get("capturedAt") ?? new Date().toISOString()
  }), [searchParams]);

  useEffect(() => {
    queueCapture(payload);
    window.sessionStorage.setItem(browserCaptureStorageKey, JSON.stringify(payload));
    const nextParams = new URLSearchParams({
      capture: "1",
      url: payload.url,
      title: payload.title,
      text: payload.text,
      capturedAt: payload.capturedAt
    });
    window.location.replace(`/?${nextParams.toString()}`);
  }, [payload]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto mt-24 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-extrabold">Sending capture to Intake</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The page URL and selected text are being saved temporarily in this browser, then Intake will open for review.
        </p>
        <a className="mt-4 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white" href="/">
          Open Conduit
        </a>
      </div>
    </main>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
        <div className="mx-auto mt-24 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-extrabold">Preparing browser capture</h1>
        </div>
      </main>
    }>
      <CaptureRedirect />
    </Suspense>
  );
}
