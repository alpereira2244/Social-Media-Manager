import { NextResponse } from "next/server";

const transcriptSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    keyThemes: { type: "array", items: { type: "string" } },
    usefulPhrases: { type: "array", items: { type: "string" } },
    customerPainPoints: { type: "array", items: { type: "string" } },
    productClaims: { type: "array", items: { type: "string" } },
    founderVoiceExamples: { type: "array", items: { type: "string" } },
    proofPoints: { type: "array", items: { type: "string" } },
    postIdeas: { type: "array", items: { type: "string" } },
    safetyNotes: { type: "array", items: { type: "string" } }
  },
  required: [
    "keyThemes",
    "usefulPhrases",
    "customerPainPoints",
    "productClaims",
    "founderVoiceExamples",
    "proofPoints",
    "postIdeas",
    "safetyNotes"
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
    .map((line) => line.trim())
    .filter((line) => line.length > 18);
}

function fallbackAnalysis(body: Record<string, unknown>) {
  const transcript = String(body.transcript ?? "");
  const sourceType = String(body.sourceType ?? "Transcript / Meeting Notes");
  const lines = compactLines(transcript);
  const painLines = lines.filter((line) => /pain|problem|hard|manual|slow|blocked|customer|factory|workflow|integrator/i.test(line));
  const proofLines = lines.filter((line) => /days|deployed|built|reduced|faster|proof|result|customer|factory|robot|machine/i.test(line));
  const voiceLines = lines.filter((line) => /we |i |our |conduit|think|believe/i.test(line));

  return {
    keyThemes: [
      sourceType,
      ...lines.slice(0, 4).map((line) => line.replace(/^[-*•]\s*/, ""))
    ].slice(0, 6),
    usefulPhrases: lines.slice(0, 6),
    customerPainPoints: (painLines.length ? painLines : lines.slice(0, 3)).slice(0, 6),
    productClaims: (proofLines.length ? proofLines : ["Review transcript before using claims publicly."]).slice(0, 6),
    founderVoiceExamples: (voiceLines.length ? voiceLines : lines.slice(0, 3)).slice(0, 5),
    proofPoints: (proofLines.length ? proofLines : ["No concrete proof point detected yet."]).slice(0, 5),
    postIdeas: [
      "Turn one specific customer pain into a founder-led post.",
      "Use one meeting insight as a practical industry POV.",
      "Explain one product framing point in plain language."
    ],
    safetyNotes: [
      "Needs review before automatic generation.",
      "Remove customer names, sensitive facility details, private strategy, and unapproved metrics before posting."
    ]
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, generatedBy: "Fallback", analysis: fallbackAnalysis({}) }, { status: 400 });
  }

  const transcript = String(body.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "Paste transcript or notes before analyzing.", generatedBy: "Fallback", analysis: fallbackAnalysis(body) },
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
          "You analyze internal Conduit notes and transcripts for a social content knowledge base. Return structured JSON only. Extract useful themes, phrases, customer pain points, product claims, founder voice examples, proof points, post ideas, and public safety notes. Be conservative: flag anything that could reveal customer/account data, sensitive facility details, private strategy, or unsupported claims. Do not rewrite the transcript into public copy.",
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
            name: "transcript_analysis",
            schema: transcriptSchema,
            strict: true
          }
        },
        max_output_tokens: 1400
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
