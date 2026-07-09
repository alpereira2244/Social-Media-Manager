import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patternSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "hookPattern",
    "postStructure",
    "visualStyle",
    "toneEnergy",
    "pacing",
    "ctaPattern",
    "whyItWorks",
    "conduitAdaptation",
    "whatNotToCopy",
    "safetyNotes",
    "bestPlatforms"
  ],
  properties: {
    hookPattern: { type: "string" },
    postStructure: { type: "string" },
    visualStyle: { type: "string" },
    toneEnergy: { type: "string" },
    pacing: { type: "string" },
    ctaPattern: { type: "string" },
    whyItWorks: { type: "string" },
    conduitAdaptation: { type: "string" },
    whatNotToCopy: { type: "string" },
    safetyNotes: { type: "string" },
    bestPlatforms: { type: "array", items: { type: "string" } }
  }
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
      // Try the next cleanup path.
    }
  }
  return null;
}

function fallbackAnalysis(content: string, platform: string) {
  const firstLine = content
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);

  return {
    hookPattern: firstLine ? `Lead with a concrete observation like: ${firstLine.slice(0, 120)}` : "Lead with a concrete, visual observation.",
    postStructure: "Specific hook, short supporting context, practical takeaway, light CTA.",
    visualStyle: /image|photo|screenshot|video|visual|show/i.test(content)
      ? "Visual-first pattern with the asset carrying the proof."
      : "Text-led pattern with tight paragraph breaks.",
    toneEnergy: "Direct, useful, and pattern-led without copying wording.",
    pacing: "Fast opening, concise middle, clear ending.",
    ctaPattern: "Invite a specific next action without hype.",
    whyItWorks: "It gives the audience a recognizable format and a clear reason to keep reading.",
    conduitAdaptation: "Use the structure for Conduit, but replace all facts with Conduit Company Knowledge and current brief details.",
    whatNotToCopy: "Do not copy exact wording, claims, identity, customer names, metrics, or brand voice from the source.",
    safetyNotes: "Pattern only. Check every claim against Conduit Company Knowledge before publishing.",
    bestPlatforms: platform ? [platform] : ["LinkedIn", "X", "Instagram"]
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const content = [
    body.title,
    body.notes,
    body.pastedText,
    body.fetchedContent,
    body.screenshot?.analysisText
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("\n\n");

  if (content.split(/\s+/).filter(Boolean).length < 8) {
    return NextResponse.json(
      { ok: false, error: "Add notes, pasted text, fetched website content, or screenshot analysis before analyzing this pattern." },
      { status: 400 }
    );
  }

  const platform = String(body.platform ?? "Other");
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(content, platform) });
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
          "Analyze an external inspiration pattern for Conduit Social Command Center. Return structured JSON only. Extract hook pattern, post structure, visual style, tone/energy, pacing, CTA pattern, why it works, how Conduit could adapt it, what not to copy, safety notes, and best platforms. This is pattern-only: never turn external wording, facts, claims, metrics, customer names, or identity into Conduit truth.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(body, null, 2) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "inspiration_pattern_analysis",
            schema: patternSchema,
            strict: true
          }
        },
        max_output_tokens: 1200
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(content, platform) });
    }

    const parsed = parseJson(extractOutputText(await response.json()));
    return NextResponse.json({ ok: true, generatedBy: "AI", analysis: parsed ?? fallbackAnalysis(content, platform) });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(content, platform) });
  }
}
