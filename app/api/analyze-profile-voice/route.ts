import { NextResponse } from "next/server";

const voiceSchema = {
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
    confidenceLevel: { type: "string", enum: ["Low", "Medium", "High"] }
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
    "confidenceLevel"
  ]
};

function extractOutputText(response: unknown) {
  const output = (response as { output?: Array<{ content?: Array<{ text?: string }> }> }).output;
  return output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim() ?? "";
}

function parseJson(text: string) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

function compactLines(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 8);
}

function fallbackAnalysis(body: Record<string, unknown>) {
  const content = String(body.content ?? "");
  const platform = String(body.platform ?? "Other");
  const lines = compactLines(content);
  const firstLines = lines.slice(0, 5);
  const shortLines = lines.filter((line) => line.length < 90).slice(0, 5);
  const repeatedWords = Array.from(
    new Set(
      content
        .toLowerCase()
        .match(/\b[a-z][a-z-]{5,}\b/g)
        ?.filter((word) => !["because", "people", "should", "through", "really", "company"].includes(word))
        .slice(0, 12) ?? []
    )
  );
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    toneTraits: [
      /we\b|our\b/i.test(content) ? "collective and company-led" : "personal and direct",
      /factory|robot|hardware|operations|automation/i.test(content)
        ? "grounded in real operations"
        : "practical and specific"
    ],
    sentenceStyle: shortLines.length > 2
      ? ["short lines, fast pacing, scannable paragraphs"]
      : ["clear paragraphs with direct explanations"],
    hookPatterns: firstLines.length > 0
      ? firstLines.slice(0, 3)
      : ["Lead with the concrete thing that happened."],
    commonTopics: [
      ...firstLines.filter((line) => /factory|robot|hardware|workflow|customer|team|build|deploy/i.test(line)).slice(0, 4),
      "operations, product lessons, and practical proof"
    ].slice(0, 6),
    repeatedPhrases: repeatedWords.slice(0, 8),
    phrasesToAvoid: [
      "Do not copy exact phrasing from external inspiration.",
      "Avoid generic hype and unsupported claims."
    ],
    formattingHabits: [
      platform === "X" ? "short posts with one clear point" : "scannable paragraphs",
      content.includes("\n\n") ? "uses paragraph breaks" : "compact formatting"
    ],
    postStructures: [
      "specific hook",
      "plain explanation",
      "practical takeaway"
    ],
    imitate: [
      "cadence",
      "level of specificity",
      "hook structure",
      "paragraph rhythm"
    ],
    doNotCopy: [
      "exact wording",
      "external facts",
      "private details",
      "unsupported proof points"
    ],
    platformPatterns: [
      `${platform}: adapt the structure natively without copying wording.`
    ],
    confidenceLevel: wordCount > 800 ? "High" : wordCount > 250 ? "Medium" : "Low"
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, generatedBy: "Fallback", analysis: fallbackAnalysis({}) },
      { status: 400 }
    );
  }

  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json(
      {
        ok: false,
        error: "Paste an example before analyzing voice.",
        generatedBy: "Fallback",
        analysis: fallbackAnalysis(body)
      },
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
          "Analyze pasted text, fetched website content, screenshot-derived text/style notes, founder notes, or transcript snippets as a voice/source example for Conduit Social Command Center. Return structured JSON only. Extract tone, sentence style, hooks, common topics, repeated phrases, formatting habits, reusable structures, what to imitate, what not to copy, platform-specific style patterns, and a confidence level based on amount/quality of source material. External inspiration is pattern-only: never recommend copying wording, facts, claims, names, or identity. Keep Company Knowledge as the truth layer.",
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
            name: "profile_voice_analysis",
            schema: voiceSchema,
            strict: true
          }
        },
        max_output_tokens: 1200
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(body) });
    }

    const json = await response.json();
    const parsed = parseJson(extractOutputText(json));
    return NextResponse.json({ ok: true, generatedBy: "AI", analysis: parsed });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(body) });
  }
}
