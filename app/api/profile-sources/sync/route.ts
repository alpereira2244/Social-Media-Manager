import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid profile source sync request." },
      { status: 400 }
    );
  }

  const source = body.source as { platform?: string } | undefined;
  return NextResponse.json({
    ok: true,
    syncStatus: "API sync available later",
    lastSynced: new Date().toISOString(),
    message:
      source?.platform === "Website" || source?.platform === "Website/blog"
        ? "Website/profile-source sync is optional future work. You can fetch website content or paste text for analysis now."
        : "Direct API sync is optional future work. This source is saved; use screenshots or pasted text to analyze it now.",
    supportedNow: false
  });
}
