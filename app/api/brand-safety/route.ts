import { NextResponse } from "next/server";
import type { BrandSafetyCheck, BrandSafetyStatus, Platform } from "@/lib/types";

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
  } | null;
};

const hypePattern =
  /\b(revolutioniz(?:e|es|ing)|transform(?:s|ing)? the way|unlock(?:s|ed|ing)?|elevat(?:e|es|ed|ing)|seamless(?:ly)?|cutting[- ]edge|game[- ]changing|next[- ]gen|supercharge(?:s|d|ing)?|empower(?:s|ed|ing)?|innovation for innovation(?:'s)? sake|future of work)\b/i;

const safetySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "notes"],
  properties: {
    status: {
      type: "string",
      enum: ["Safe", "Needs review", "Risky"]
    },
    notes: {
      type: "array",
      items: { type: "string" }
    }
  }
};

function fallbackCheck(body: SafetyRequest): BrandSafetyCheck {
  const copy = body.postCopy ?? "";
  const notes = new Set<string>();
  const hasKnowledge = (body.campaign?.knowledgeSources ?? []).length > 0;

  if (!copy.trim()) notes.add("Post copy is empty");
  if (/\bguarantee(?:d|s)?|proven|only|best|world[- ]?class|industry[- ]?leading|first|always|never|eliminates?|\d+%|\d+x\b/i.test(copy) && !hasKnowledge) {
    notes.add("Claim needs source");
  }
  if (/\bin today's (?:fast-paced|ever-changing|rapidly evolving)|take .* to the next level\b/i.test(copy) || hypePattern.test(copy)) {
    notes.add("Tone sounds generic or over-polished");
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
    ["Post copy is empty", "Customer detail may need approval"].includes(note)
  )
    ? "Risky"
    : notes.size > 0
      ? "Needs review"
      : "Safe";

  return {
    status,
    notes: noteList.length > 0 ? noteList : ["No obvious claim, privacy, or tone risks found."],
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
      return JSON.parse(attempt) as { status?: BrandSafetyStatus; notes?: string[] };
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
          "You are a brand safety and claim-check reviewer for Conduit social posts. Return structured JSON only. Check unsupported claims, customer/confidential details, sensitive facility/media details, generic AI phrases, overhyped language, claims not grounded in Company Knowledge, and platform length issues. Flag vague hype language including revolutionize, transform the way, unlock, elevate, seamless, cutting-edge, game-changing, next-gen, supercharge, empower, innovation for innovation's sake, and future-of-work language. Flag guarantees, always, eliminates, and revolutionizes unless clearly supported by Company Knowledge. Keep recommendations practical and concise.",
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
        checkedAt: new Date().toISOString(),
        source: "AI"
      } satisfies BrandSafetyCheck
    });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", check: fallbackCheck(body) });
  }
}
