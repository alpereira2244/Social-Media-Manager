import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const platforms = ["LinkedIn", "X", "Instagram", "TikTok"] as const;

const opportunityAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    whyItMatters: { type: "string" },
    suggestedConduitAngle: { type: "string" },
    suggestedContentType: { type: "string" },
    suggestedPlatforms: { type: "array", items: { type: "string", enum: platforms } },
    recommendation: { type: "string", enum: ["Reply", "Standalone post", "Monitor", "Save as context"] },
    relevantBrainThemes: { type: "array", items: { type: "string" } },
    riskNotes: { type: "string" },
    suggestedFirstDraftIdea: { type: "string" }
  },
  required: [
    "whyItMatters",
    "suggestedConduitAngle",
    "suggestedContentType",
    "suggestedPlatforms",
    "recommendation",
    "relevantBrainThemes",
    "riskNotes",
    "suggestedFirstDraftIdea"
  ]
};

type RequestBody = {
  title?: string;
  opportunityType?: string;
  sourceUrl?: string;
  platform?: string;
  pastedText?: string;
  notes?: string;
  tags?: string[];
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
      // Try the next cleanup.
    }
  }
  return null;
}

function fallbackAnalysis(body: RequestBody) {
  const combined = [body.title, body.opportunityType, body.pastedText, body.notes, body.sourceUrl]
    .filter(Boolean)
    .join(" ");
  const lower = combined.toLowerCase();
  const suggestedPlatforms = new Set<(typeof platforms)[number]>();
  if (body.platform && platforms.includes(body.platform as (typeof platforms)[number])) {
    suggestedPlatforms.add(body.platform as (typeof platforms)[number]);
  }
  if (/reply|comment|mention|shoutout/.test(lower)) suggestedPlatforms.add("X");
  if (/visual|photo|image|instagram/.test(lower)) suggestedPlatforms.add("Instagram");
  if (/founder|thesis|article|news|customer|competitor/.test(lower)) suggestedPlatforms.add("LinkedIn");
  if (suggestedPlatforms.size === 0) suggestedPlatforms.add("LinkedIn");

  const recommendation =
    /reply|comment|mention|shoutout/.test(lower)
      ? "Reply"
      : /monitor|competitor/.test(lower)
        ? "Monitor"
        : "Standalone post";

  return {
    whyItMatters: "This could become a timely Conduit social opportunity if it connects to automation, factory operations, customer pain, or the broader industrial thesis.",
    suggestedConduitAngle: /competitor|market/.test(lower)
      ? "Use this as market context without naming or copying the source."
      : "Connect the moment to Conduit's practical view on industrial operations and automation.",
    suggestedContentType: recommendation === "Reply" ? "Short reply" : "Standalone post",
    suggestedPlatforms: Array.from(suggestedPlatforms).slice(0, 3),
    recommendation,
    relevantBrainThemes: [
      /factory|manufacturing|robot|automation/.test(lower) ? "Robotics and automation" : "Factory OS / orchestration",
      /customer|sales|pain/.test(lower) ? "Customer proof" : "System integrator problem"
    ],
    riskNotes: "Verify claims against Company Knowledge before publishing. Do not reveal customer or sensitive facility details.",
    suggestedFirstDraftIdea: body.pastedText?.trim()
      ? `Use this opportunity as context: ${body.pastedText.trim().slice(0, 220)}`
      : `Create a Conduit post from this opportunity: ${body.title || body.sourceUrl || "untitled opportunity"}.`
  };
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid opportunity analysis request." }, { status: 400 });
  }

  const fallback = fallbackAnalysis(body);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallback });
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
          "Analyze a manually captured social listening opportunity for Conduit. Return structured JSON only. Do not scrape or browse. Treat this as a possible post/reply/monitoring opportunity. Company Knowledge remains the truth layer; flag claims and sensitive info for review.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(body, null, 2) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "opportunity_analysis",
            schema: opportunityAnalysisSchema,
            strict: true
          }
        },
        max_output_tokens: 1000
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallback });
    }

    const parsed = parseJson(extractOutputText(await response.json()));
    return NextResponse.json({
      ok: true,
      generatedBy: "AI",
      analysis: parsed ?? fallback
    });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallback });
  }
}
