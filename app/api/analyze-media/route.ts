import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const mediaAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["description", "suggestedAngles", "overlayText", "sensitivityWarnings", "altText", "tags"],
  properties: {
    description: { type: "string" },
    suggestedAngles: { type: "array", items: { type: "string" } },
    overlayText: { type: "string" },
    sensitivityWarnings: { type: "array", items: { type: "string" } },
    altText: { type: "string" },
    tags: { type: "array", items: { type: "string" } }
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

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      fallbackReason: "missing_api_key",
      error: "OPENAI_API_KEY is missing. Media can still be saved without AI analysis."
    });
  }

  const body = await request.json().catch(() => null) as {
    imageDataUrl?: string;
    filename?: string;
    notes?: string;
  } | null;

  if (!body?.imageDataUrl?.startsWith("data:image/")) {
    return NextResponse.json(
      { ok: false, error: "Upload an image file to analyze." },
      { status: 400 }
    );
  }

  const prompt = `Analyze this reusable social media image asset for Conduit's social media command center.

Return structured JSON only:
- description: what is visibly in the image
- suggestedAngles: 3 to 5 post angles
- overlayText: short overlay text idea
- sensitivityWarnings: any risks, unsupported claims, visible private info, faces, customer names, safety concerns; empty array if none
- altText: accessible alt text
- tags: 3 to 8 short tags

Do not identify private people. Do not invent business claims. Filename: ${body.filename ?? "unknown"}. Notes: ${body.notes ?? ""}`;

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      instructions: "You analyze media assets for social content planning. Return structured JSON only.",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: body.imageDataUrl }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "media_asset_analysis",
          schema: mediaAnalysisSchema,
          strict: true
        }
      },
      max_output_tokens: 1200
    })
  });

  if (!openAiResponse.ok) {
    return NextResponse.json(
      { ok: false, error: "Media analysis failed. The asset can still be saved." },
      { status: 502 }
    );
  }

  const data = await openAiResponse.json();
  const outputText = extractOutputText(data);
  try {
    return NextResponse.json({ ok: true, data: JSON.parse(outputText) });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Media analysis returned invalid JSON." },
      { status: 502 }
    );
  }
}
