import { NextResponse } from "next/server";

const sourceAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    toneTraits: { type: "array", items: { type: "string" } },
    sentenceStyle: { type: "array", items: { type: "string" } },
    hookPatterns: { type: "array", items: { type: "string" } },
    commonTopics: { type: "array", items: { type: "string" } },
    repeatedPhrases: { type: "array", items: { type: "string" } },
    phrasesToAvoid: { type: "array", items: { type: "string" } },
    formattingHabits: { type: "array", items: { type: "string" } },
    postStructures: { type: "array", items: { type: "string" } },
    imitate: { type: "array", items: { type: "string" } },
    doNotCopy: { type: "array", items: { type: "string" } },
    platformPatterns: { type: "array", items: { type: "string" } },
    confidenceLevel: { type: "string", enum: ["Low", "Medium", "High"] },
    influenceType: { type: "string", enum: ["internal voice", "external pattern-only inspiration"] }
  },
  required: [
    "toneTraits",
    "sentenceStyle",
    "hookPatterns",
    "commonTopics",
    "repeatedPhrases",
    "phrasesToAvoid",
    "formattingHabits",
    "postStructures",
    "imitate",
    "doNotCopy",
    "platformPatterns",
    "confidenceLevel",
    "influenceType"
  ]
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
  return {};
}

function compactLines(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 8);
}

function fallbackAnalysis(body: Record<string, unknown>) {
  const content = String(body.content ?? "");
  const source = body.source as { sourceType?: string; platform?: string; patternOnly?: boolean } | undefined;
  const lines = compactLines(content);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const external =
    source?.sourceType === "inspiration/reference" ||
    source?.sourceType === "competitor/market watch" ||
    source?.patternOnly;

  return {
    toneTraits: [
      external ? "pattern-only reference" : "internal voice reference",
      /factory|robot|hardware|automation|workflow|operations/i.test(content)
        ? "grounded in operational detail"
        : "practical and direct"
    ],
    sentenceStyle: lines.some((line) => line.length < 90)
      ? ["short, scannable lines"]
      : ["direct explanatory paragraphs"],
    hookPatterns: lines.slice(0, 3),
    commonTopics: lines.filter((line) => /build|factory|robot|customer|workflow|team|market|product/i.test(line)).slice(0, 6),
    repeatedPhrases: Array.from(new Set(content.toLowerCase().match(/\b[a-z][a-z-]{5,}\b/g) ?? [])).slice(0, 8),
    phrasesToAvoid: [
      "Do not copy exact wording",
      "Do not import facts or claims from inspiration profiles"
    ],
    formattingHabits: [content.includes("\n\n") ? "paragraph breaks" : "compact formatting"],
    postStructures: ["specific hook", "supporting detail", "clear takeaway"],
    imitate: external
      ? ["structure", "pacing", "hook shape", "format"]
      : ["cadence", "tone", "sentence rhythm", "hook style"],
    doNotCopy: ["exact wording", "identity", "external facts", "unsupported claims"],
    platformPatterns: [`${source?.platform ?? String(body.platform ?? "Source")}: adapt patterns natively`],
    confidenceLevel: wordCount > 800 ? "High" : wordCount > 250 ? "Medium" : "Low",
    influenceType: external ? "external pattern-only inspiration" : "internal voice"
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid profile source analysis request." }, { status: 400 });
  }

  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json(
      { ok: false, error: "Add fetched text, pasted text, notes, or screenshot analysis before analyzing." },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(body) });
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
          "Analyze profile voice source material for Conduit Social Command Center. Return structured JSON only. Extract tone traits, hook patterns, sentence style, formatting habits, common topics, repeated phrases, what to imitate, what not to copy, platform-specific patterns, confidence level, and whether this is internal voice or external pattern-only inspiration. External inspiration must influence style/format only and never facts, claims, identity, or exact wording.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(body, null, 2) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "profile_source_analysis",
            schema: sourceAnalysisSchema,
            strict: true
          }
        },
        max_output_tokens: 1300
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(body) });
    }

    const parsed = parseJson(extractOutputText(await response.json()));
    return NextResponse.json({ ok: true, generatedBy: "AI", analysis: parsed });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(body) });
  }
}
