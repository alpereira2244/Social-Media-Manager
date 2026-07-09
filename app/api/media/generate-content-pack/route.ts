import { NextResponse } from "next/server";
import type {
  BrandVoiceProfile,
  FeedbackMemorySummary,
  LibrarySource,
  MediaAsset,
  Platform,
  Profile,
  SimpleStyleChip
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type MediaPackRequest = {
  mediaAsset: MediaAsset;
  postingAccount?: Profile;
  styleChip?: SimpleStyleChip;
  intent: string;
  contextNotes?: string;
  platforms: Platform[];
  companyKnowledge?: LibrarySource[];
  brandVoice: BrandVoiceProfile;
  feedbackMemory?: FeedbackMemorySummary;
  claimLibrary?: {
    approvedClaims?: string[];
    needsReviewClaims?: string[];
    doNotSayClaims?: string[];
    claimDetails?: Array<{ claimText: string; claimType: string; riskLevel?: string; notes?: string }>;
  };
};

type PostPackage = {
  postCopy: string;
  rationale: string;
  recommendedMediaUse: string;
  altText: string;
  overlayText: string;
  cta: string;
  hashtags: string[];
  firstComment: string;
  carouselIdeas: string[];
  shotList: string[];
};

const postPackageSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "postCopy",
    "rationale",
    "recommendedMediaUse",
    "altText",
    "overlayText",
    "cta",
    "hashtags",
    "firstComment",
    "carouselIdeas",
    "shotList"
  ],
  properties: {
    postCopy: { type: "string" },
    rationale: { type: "string" },
    recommendedMediaUse: { type: "string" },
    altText: { type: "string" },
    overlayText: { type: "string" },
    cta: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    firstComment: { type: "string" },
    carouselIdeas: { type: "array", items: { type: "string" } },
    shotList: { type: "array", items: { type: "string" } }
  }
};

const generationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mediaAnalysis", "LinkedIn", "X", "Instagram", "TikTok"],
  properties: {
    mediaAnalysis: {
      type: "object",
      additionalProperties: false,
      required: ["description", "angles", "captionIdeas", "warnings"],
      properties: {
        description: { type: "string" },
        angles: { type: "array", items: { type: "string" } },
        captionIdeas: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } }
      }
    },
    LinkedIn: { type: "array", items: postPackageSchema },
    X: { type: "array", items: postPackageSchema },
    Instagram: { type: "array", items: postPackageSchema },
    TikTok: { type: "array", items: postPackageSchema }
  }
};

function truncate(value = "", maxLength = 3000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function extractOutputText(response: unknown) {
  const maybe = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (maybe.output_text) return maybe.output_text;
  return maybe.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)?.text ?? "";
}

function parseStructuredJson(outputText: string) {
  const trimmed = outputText.trim();
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
  throw new Error("OpenAI returned invalid JSON.");
}

function compactKnowledge(items: LibrarySource[] = []) {
  return items.slice(0, 8).map((item) => ({
    name: item.name,
    category: item.category,
    notes: item.notes,
    content: truncate(item.content, 1600),
    proofPoints: item.analysis?.proofPoints ?? []
  }));
}

function mediaPackPrompt(body: MediaPackRequest) {
  const asset = body.mediaAsset;
  return `Generate a platform-native media-to-post pack for Conduit.

Conduit voice:
- Clear, direct, specific, practical, and grounded in factory automation.
- Avoid generic SaaS language, unsupported claims, fake customer proof, and vague transformation language.
- Avoid: revolutionize, transform the way, unlock, elevate, seamless, cutting-edge, game-changing, next-gen, supercharge, empower.
- Company Knowledge is the truth layer. Use it for facts, claims, proof points, and guardrails.
- Claim Library is the approved/do-not-say layer. Prefer approved/proof-backed claims when relevant. Never use do-not-say claims or close rewrites. Treat needs-review claims as rationale notes, not public facts.
- Brand Voice Rules and Feedback Memory guide taste and style.
- The media is the visual grounding. Every selected platform should connect to what the asset shows or what the notes describe.
- If video/audio has no transcript/frame analysis, do not invent details.

Return exactly one post package for each selected platform and empty arrays for unselected platforms.

Platform requirements:
- LinkedIn: specific first line, short paragraphs, practical POV.
- X: short, punchy, one clear point.
- Instagram: visual-first caption, overlay text, alt text, useful hashtags only.
- TikTok: spoken hook, short script, shot list.

Brief:
${JSON.stringify({
    intent: body.intent,
    contextNotes: body.contextNotes,
    platforms: body.platforms,
    styleChip: body.styleChip ?? "Conduit default",
    postingAccount: body.postingAccount
      ? {
          name: body.postingAccount.name,
          type: body.postingAccount.type,
          role: body.postingAccount.role,
          notes: body.postingAccount.notes,
          personality: body.postingAccount.personality
        }
      : { name: "Conduit", type: "Company Account" },
    media: {
      filename: asset.filename,
      mediaType: asset.mediaType,
      notes: asset.notes,
      description: asset.description,
      suggestedAngles: asset.suggestedAngles,
      overlayText: asset.overlayText,
      altText: asset.altText,
      tags: asset.tags,
      sensitivityWarnings: asset.sensitivityWarnings
    },
    companyKnowledge: compactKnowledge(body.companyKnowledge),
    claimLibrary: body.claimLibrary
      ? {
          approvedClaims: body.claimLibrary.approvedClaims ?? [],
          needsReviewClaims: body.claimLibrary.needsReviewClaims ?? [],
          doNotSayClaims: body.claimLibrary.doNotSayClaims ?? []
        }
      : null,
    brandVoice: body.brandVoice,
    feedbackMemory: body.feedbackMemory?.enabled
      ? {
          topPreferences: body.feedbackMemory.topPreferences,
          platformPreferences: body.feedbackMemory.platformPreferences,
          confidence: body.feedbackMemory.confidence
        }
      : { enabled: false }
  }, null, 2)}`;
}

function mockPackage(platform: Platform, body: MediaPackRequest): PostPackage {
  const asset = body.mediaAsset;
  const visual = asset.description || asset.notes || `the ${asset.mediaType} asset ${asset.filename}`;
  const intent = body.intent || "show how Conduit builds close to real factory operations";
  const concise = body.styleChip === "More concise";
  const founder = body.styleChip === "More founder-led";
  const bold = body.styleChip === "Bolder";
  const account = body.postingAccount?.name || "Conduit";
  const baseHook = bold
    ? "The useful signal is on the floor."
    : founder
      ? "This is the kind of operational detail I care about."
      : "Useful automation starts close to the real workflow.";

  const postCopy: Record<Platform, string> = {
    LinkedIn: concise
      ? `${baseHook}\n\n${intent}\n\nWhat this shows: ${visual}\n\nBuild around the work as it actually happens.`
      : `${baseHook}\n\n${intent}\n\nThe media matters because it grounds the point in something real: ${visual}\n\nFor Conduit, the lesson is simple: useful automation has to fit the machines, people, exceptions, and handoffs already in motion.`,
    X: `${bold ? "Factory automation has to survive contact with the floor." : "The point:"} ${intent}\n\n${visual}`,
    Instagram: `${visual}\n\n${intent}\n\nThe best automation work stays close to the process it is trying to improve.\n\n#manufacturing #automation #industrialtech`,
    TikTok: `Hook: ${founder ? "Here is the detail I would not skip." : "This is where automation gets real."}\n\nShort script:\n1. Open on ${asset.filename}.\n2. Point out what is visible: ${visual}.\n3. Explain why it matters: ${intent}.\n4. Close with the practical takeaway: build around the real workflow.\n\nCaption: ${intent}`
  };

  return {
    postCopy: postCopy[platform],
    rationale: `Built from ${asset.filename}, ${account} voice, Brand Voice Rules, Feedback Memory, and active Company Knowledge.`,
    recommendedMediaUse: "Use the media as the proof point. Make the first line connect to what the audience can see or hear.",
    altText: asset.altText || visual,
    overlayText: asset.overlayText || "Build around the real workflow",
    cta: platform === "X" ? "" : "Save this if it is useful for your team.",
    hashtags: platform === "Instagram" || platform === "TikTok" ? ["#manufacturing", "#automation", "#industrialtech"] : [],
    firstComment: platform === "LinkedIn" ? "The useful constraints usually show up in the workflow details." : "",
    carouselIdeas: platform === "Instagram" ? ["What the media shows", "The workflow underneath", "Why it matters", "The Conduit takeaway"] : [],
    shotList: platform === "TikTok" ? ["Open on the asset", "Zoom to the key detail", "Explain the workflow issue", "Close with the takeaway"] : []
  };
}

function mockResponse(body: MediaPackRequest) {
  const selected = new Set(body.platforms);
  return {
    mediaAnalysis: {
      description: body.mediaAsset.description || body.mediaAsset.notes || `Reusable ${body.mediaAsset.mediaType} asset: ${body.mediaAsset.filename}`,
      angles: body.mediaAsset.suggestedAngles ?? [body.intent],
      captionIdeas: body.mediaAsset.overlayText ? [body.mediaAsset.overlayText] : [body.intent],
      warnings: body.mediaAsset.sensitivityWarnings ?? []
    },
    LinkedIn: selected.has("LinkedIn") ? [mockPackage("LinkedIn", body)] : [],
    X: selected.has("X") ? [mockPackage("X", body)] : [],
    Instagram: selected.has("Instagram") ? [mockPackage("Instagram", body)] : [],
    TikTok: selected.has("TikTok") ? [mockPackage("TikTok", body)] : []
  };
}

export async function POST(request: Request) {
  let body: MediaPackRequest;
  try {
    body = (await request.json()) as MediaPackRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.mediaAsset || !body.platforms?.length) {
    return NextResponse.json({ ok: false, error: "Media asset and at least one platform are required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: true,
      generatedBy: "Mock",
      fallbackReason: "missing_api_key",
      data: mockResponse(body)
    });
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        instructions: "Generate Conduit media-to-post content packs. Return structured JSON only. Never invent unsupported facts. Use media as visual grounding and Company Knowledge as truth layer.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: mediaPackPrompt(body) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "media_content_pack",
            schema: generationSchema,
            strict: true
          }
        },
        max_output_tokens: 9000
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return NextResponse.json({ ok: false, error: `OpenAI API failure: ${truncate(errorText, 500)}` }, { status: 502 });
    }

    const outputText = extractOutputText(await openAiResponse.json());
    if (!outputText) {
      return NextResponse.json({ ok: false, error: "OpenAI returned no structured output." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, generatedBy: "AI", data: parseStructuredJson(outputText) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Media content pack generation failed." },
      { status: 502 }
    );
  }
}
