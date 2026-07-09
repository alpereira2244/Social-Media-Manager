import { NextResponse } from "next/server";
import type { BrandSafetyCheck, BrandSafetyStatus, ClaimMatch, Platform } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type SafetyRequest = {
  postCopy?: string;
  platform?: Platform;
  campaign?: {
    name?: string;
    intent?: string;
    contentAngle?: string;
    details?: string;
    mediaNotes?: string;
    mediaAnalysis?: {
      description?: string;
      warnings?: string[];
    };
    knowledgeSources?: string[];
    claimLibrary?: {
      approvedClaims?: string[];
      needsReviewClaims?: string[];
      doNotSayClaims?: string[];
      claimDetails?: Array<{ claimText: string; claimType: string; riskLevel?: string; notes?: string }>;
    };
  } | null;
};

const hypePattern =
  /\b(revolutioniz(?:e|es|ing)|transform(?:s|ing)? the way|unlock(?:s|ed|ing)?|elevat(?:e|es|ed|ing)|seamless(?:ly)?|cutting[- ]edge|game[- ]changing|next[- ]gen|supercharge(?:s|d|ing)?|empower(?:s|ed|ing)?|innovation for innovation(?:'s)? sake|future of work)\b/i;

const safetySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "notes", "claimMatches"],
  properties: {
    status: {
      type: "string",
      enum: ["Safe", "Needs review", "Risky"]
    },
    notes: {
      type: "array",
      items: { type: "string" }
    },
    claimMatches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claimText", "claimType", "note"],
        properties: {
          claimId: { type: "string" },
          claimText: { type: "string" },
          claimType: { type: "string" },
          riskLevel: { type: "string" },
          note: { type: "string" },
          matchedText: { type: "string" }
        }
      }
    }
  }
};

function normalizeClaimText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function claimMatches(copy: string, body: SafetyRequest): ClaimMatch[] {
  const normalizedCopy = normalizeClaimText(copy);
  const details = body.campaign?.claimLibrary?.claimDetails ?? [
    ...(body.campaign?.claimLibrary?.approvedClaims ?? []).map((claimText) => ({ claimText, claimType: "Approved claim", riskLevel: "Low" })),
    ...(body.campaign?.claimLibrary?.needsReviewClaims ?? []).map((claimText) => ({ claimText, claimType: "Needs review", riskLevel: "Medium" })),
    ...(body.campaign?.claimLibrary?.doNotSayClaims ?? []).map((claimText) => ({ claimText, claimType: "Do not say", riskLevel: "High" }))
  ];
  return details.flatMap((claim) => {
    const normalizedClaim = normalizeClaimText(claim.claimText);
    const words = normalizedClaim.split(" ").filter((word) => word.length > 4);
    const overlap = words.length > 0
      ? words.filter((word) => normalizedCopy.includes(word)).length / words.length
      : 0;
    const exact = normalizedClaim.length > 18 && normalizedCopy.includes(normalizedClaim);
    if (!exact && overlap < 0.72) return [];
    return [{
      claimText: claim.claimText,
      claimType: claim.claimType as ClaimMatch["claimType"],
      riskLevel: claim.riskLevel as ClaimMatch["riskLevel"],
      note:
        claim.claimType === "Approved claim" || claim.claimType === "Proof-backed"
          ? "Supported by Claim Library."
          : claim.claimType === "Do not say"
            ? "This resembles a do-not-say claim."
            : "Claim needs review.",
      matchedText: exact ? claim.claimText : undefined
    }];
  });
}

function fallbackCheck(body: SafetyRequest): BrandSafetyCheck {
  const copy = body.postCopy ?? "";
  const notes = new Set<string>();
  const hasKnowledge = (body.campaign?.knowledgeSources ?? []).length > 0;
  const matches = claimMatches(copy, body);
  const hasSupportedClaim = matches.some((match) => match.claimType === "Approved claim" || match.claimType === "Proof-backed");
  const hasReviewClaim = matches.some((match) => match.claimType === "Needs review" || match.claimType === "Customer-sensitive" || match.claimType === "Internal only");
  const hasDoNotSayClaim = matches.some((match) => match.claimType === "Do not say");

  if (!copy.trim()) notes.add("Post copy is empty");
  if (/\bguarantee(?:d|s)?|proven|only|best|world[- ]?class|industry[- ]?leading|first|always|never|eliminates?|\d+%|\d+x\b/i.test(copy) && !hasKnowledge) {
    notes.add("Claim needs source");
  }
  if (hasSupportedClaim) notes.add("Supported by Claim Library");
  if (hasReviewClaim) notes.add("Claim needs review");
  if (hasDoNotSayClaim) notes.add("Do-not-say claim risk");
  if (/\bin today's (?:fast-paced|ever-changing|rapidly evolving)|take .* to the next level\b/i.test(copy) || hypePattern.test(copy)) {
    notes.add("Tone sounds generic or over-polished");
  }
  if (/\bcopy this style exactly|in the style of|sound exactly like|write like (?:anduril|palantir|ramp|tesla|apple)\b/i.test(copy)) {
    notes.add("External inspiration profiles should be pattern-only, not copied");
  }
  if (/\b(anduril|palantir|ramp|tesla|apple)\b/i.test(copy) && !/\bconduit\b/i.test(copy)) {
    notes.add("Unsupported fact or identity may be coming from an inspiration profile");
  }
  if (/\bmassive|dominates?|crush(?:es|ing)?|disrupt(?:s|ing|ive)|unstoppable|the future of\b/i.test(copy)) {
    notes.add("Language may be overhyped");
  }
  if (/\bconfidential|secret|NDA|customer name|client name|proprietary|floor plan|administrator password|credential|access badge\b/i.test(copy)) {
    notes.add("Customer detail may need approval");
  }
  if (body.campaign?.mediaAnalysis?.warnings?.length || /whiteboard|factory floor|workspace|badge|screen|notes|diagram/i.test(`${body.campaign?.mediaAnalysis?.description ?? ""} ${body.campaign?.mediaNotes ?? ""}`)) {
    notes.add("Media may show sensitive workspace details");
  }
  if (body.platform === "X" && copy.length > 280) notes.add("Platform length issue");

  const noteList = Array.from(notes);
  const status: BrandSafetyStatus = noteList.some((note) =>
    ["Post copy is empty", "Customer detail may need approval", "Do-not-say claim risk"].includes(note)
  )
    ? "Risky"
    : notes.size > 0
      ? "Needs review"
      : "Safe";

  return {
    status,
    notes: noteList.length > 0 ? noteList : ["No obvious claim, privacy, or tone risks found."],
    claimMatches: matches,
    checkedAt: new Date().toISOString(),
    source: "Fallback"
  };
}

function extractOutputText(response: unknown) {
  const maybe = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (maybe.output_text) return maybe.output_text;
  return (
    maybe.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text" && content.text)?.text ?? ""
  );
}

function parseJson(text: string) {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  const attempts = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(),
    firstBrace >= 0 && lastBrace > firstBrace ? trimmed.slice(firstBrace, lastBrace + 1) : ""
  ].filter(Boolean);

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as { status?: BrandSafetyStatus; notes?: string[]; claimMatches?: BrandSafetyCheck["claimMatches"] };
    } catch {
      // Try the next cleanup strategy.
    }
  }

  throw new Error("Invalid safety JSON");
}

export async function POST(request: Request) {
  let body: SafetyRequest;
  try {
    body = (await request.json()) as SafetyRequest;
  } catch {
    return NextResponse.json({ ok: false, check: fallbackCheck({}) }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", check: fallbackCheck(body) });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        instructions:
          "You are a brand safety and claim-check reviewer for Conduit social posts. Return structured JSON only. Check unsupported claims, customer/confidential details, sensitive facility/media details, generic AI phrases, overhyped language, claims not grounded in Company Knowledge, copied external inspiration wording, unsupported facts that appear to come from inspiration profiles, and platform length issues. External inspiration profiles are pattern-only; flag wording that appears copied or tries to sound exactly like another company/account. Remind that external inspiration can influence format/style only, never facts, claims, identity, or exact wording. Flag vague hype language including revolutionize, transform the way, unlock, elevate, seamless, cutting-edge, game-changing, next-gen, supercharge, empower, innovation for innovation's sake, and future-of-work language. Flag guarantees, always, eliminates, and revolutionizes unless clearly supported by Company Knowledge. Keep recommendations practical and concise.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(body, null, 2)
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "brand_safety_check",
            schema: safetySchema,
            strict: true
          }
        },
        max_output_tokens: 1000
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", check: fallbackCheck(body) });
    }

    const json = await response.json();
    const parsed = parseJson(extractOutputText(json));
    return NextResponse.json({
      ok: true,
      generatedBy: "AI",
      check: {
        status: parsed.status ?? "Needs review",
        notes: parsed.notes?.length ? parsed.notes.slice(0, 8) : ["No obvious claim, privacy, or tone risks found."],
        claimMatches: parsed.claimMatches ?? claimMatches(body.postCopy ?? "", body),
        checkedAt: new Date().toISOString(),
        source: "AI"
      } satisfies BrandSafetyCheck
    });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", check: fallbackCheck(body) });
  }
}
