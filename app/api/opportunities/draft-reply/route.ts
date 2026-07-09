import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const platforms = ["LinkedIn", "X", "Instagram", "TikTok"] as const;

const replyDraftSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    shortReply: { type: "string" },
    warmerReply: { type: "string" },
    founderLedReply: { type: "string" },
    longerReply: { type: "string" },
    recommendedPlatform: { type: "string", enum: platforms },
    toneNotes: { type: "string" },
    brandSafetyNotes: { type: "array", items: { type: "string" } }
  },
  required: [
    "shortReply",
    "warmerReply",
    "founderLedReply",
    "longerReply",
    "recommendedPlatform",
    "toneNotes",
    "brandSafetyNotes"
  ]
};

type RequestBody = {
  title?: string;
  opportunityType?: string;
  sourceUrl?: string;
  platform?: string;
  pastedText?: string;
  notes?: string;
  instruction?: string;
  existingReply?: string;
  companyKnowledge?: Array<{
    name?: string;
    content?: string;
    notes?: string;
    proofPoints?: string;
  }>;
  brandVoiceRules?: {
    tone?: string;
    style?: string;
    audience?: string;
    avoid?: string;
  };
  analysis?: {
    suggestedConduitAngle?: string;
    riskNotes?: string;
    relevantBrainThemes?: string[];
  };
  postingAccount?: {
    name?: string;
    type?: string;
    role?: string;
    bio?: string;
    notes?: string;
  };
};

function extractOutputText(response: unknown) {
  const maybe = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  return maybe.output_text ?? maybe.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)?.text ?? "";
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
      return JSON.parse(attempt);
    } catch {
      // Try next cleanup.
    }
  }
  return null;
}

function platformFromBody(platform?: string) {
  return platforms.includes(platform as (typeof platforms)[number])
    ? platform as (typeof platforms)[number]
    : "X";
}

function fallbackReply(body: RequestBody) {
  const source = [body.pastedText, body.notes, body.analysis?.suggestedConduitAngle, body.title]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const topic = source.slice(0, 140) || "this";
  const platform = platformFromBody(body.platform);
  const instruction = body.instruction?.toLowerCase() ?? "";
  const makeConduit = /conduit|specific|industrial|less hype|less corporate|safer/.test(instruction);
  const safety = [
    "Verify any specific claims against Company Knowledge before posting.",
    "Avoid naming customers or facilities unless approved."
  ];

  return {
    shortReply: makeConduit
      ? `This is the real bottleneck: the handoffs around machines, people, and operational systems. That is where Conduit is focused.`
      : `This is exactly the kind of operational gap we think about at Conduit: less coordination overhead, more work happening where the process actually runs.`,
    warmerReply: makeConduit
      ? `Good point. The part that stands out is how much time teams lose coordinating the work around the operation, not just running the operation itself.`
      : `Really interesting point. The part that stands out is how much of this comes down to day-to-day operational friction, not just the technology itself. That is where Conduit is focused.`,
    founderLedReply: makeConduit
      ? `What we keep seeing on the floor: the problem is not one missing app. It is the manual coordination between people, machines, sensors, and decisions. ${topic}`
      : `The thing we keep seeing: teams do not need another dashboard. They need the manual handoffs around real operations to disappear. ${topic}`,
    longerReply: makeConduit
      ? `This maps to what we see in industrial operations. The hard part is not usually one isolated tool. It is the handoff between operators, machines, sensors, systems, and decisions. Conduit is built around that layer, with the goal of making real workflows easier to run without asking teams to rebuild everything first.`
      : `This maps closely to what we see in industrial operations. The hard part is rarely one isolated tool. It is the handoff between people, machines, systems, and decisions. Conduit is focused on making those workflows easier to run without asking teams to rebuild everything around a new system.`,
    recommendedPlatform: platform,
    toneNotes: "Direct, practical, and grounded. Keep it conversational and avoid sounding like a corporate announcement.",
    brandSafetyNotes: safety
  };
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid reply draft request." }, { status: 400 });
  }

  const fallback = fallbackReply(body);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", replyDraft: fallback });
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
          "Draft safe, concise social replies for Conduit. Return structured JSON only. Follow any user instruction first, then the opportunity context. Company Knowledge and Brand Voice Rules are the truth layer; do not invent proof, customer names, metrics, or facility details. Do not copy the source wording or any existing reply wording. Avoid overly aggressive tone, copied wording, corporate AI phrasing, and unsupported claims. Keep replies practical, human, and grounded in industrial operations. If knowledge is thin, stay general and mark claim risk in brandSafetyNotes.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(body, null, 2) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "opportunity_reply_draft",
            schema: replyDraftSchema,
            strict: true
          }
        },
        max_output_tokens: 1200
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", replyDraft: fallback });
    }

    const parsed = parseJson(extractOutputText(await response.json()));
    return NextResponse.json({
      ok: true,
      generatedBy: "AI",
      replyDraft: parsed ?? fallback
    });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", replyDraft: fallback });
  }
}
