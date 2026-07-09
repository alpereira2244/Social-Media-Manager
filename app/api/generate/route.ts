import { NextResponse } from "next/server";
import type {
  ApprovedPostMemory,
  BrandVoiceProfile,
  CampaignMediaContext,
  FeedbackMemorySummary,
  LibrarySource,
  Platform,
  Profile,
  VoiceSource
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type GenerateRequest = {
  mode?: "generate" | "regenerate" | "repurpose";
  campaignTitle: string;
  intent?: string;
  campaignTemplate?: string;
  contentAngle?: string;
  simpleStyleChips?: string[];
  simpleStyleInstructions?: string[];
  rawIdea: string;
  selectedPlatforms: Platform[];
  profile?: Profile;
  voiceInfluences?: Profile[];
  inspirationProfiles?: Profile[];
  approvedExamples?: ApprovedPostMemory[];
  feedbackMemory?: FeedbackMemorySummary;
  claimLibrary?: {
    approvedClaims?: string[];
    needsReviewClaims?: string[];
    doNotSayClaims?: string[];
    claimDetails?: Array<{
      claimText: string;
      claimType: string;
      riskLevel?: string;
      notes?: string;
    }>;
  };
  brandVoice: BrandVoiceProfile;
  voiceSource?: VoiceSource;
  sourceLibraryItems?: LibrarySource[];
  mediaContext?: CampaignMediaContext & {
    imageDataUrl?: string;
  };
  regeneration?: {
    platform: Platform;
    currentContent: string;
    instruction: string;
  };
  repurpose?: {
    sourceType: "campaign" | "post";
    sourceLabel: string;
    sourceContent: string;
    reuseOriginalMedia?: boolean;
  };
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
        angles: {
          type: "array",
          items: { type: "string" }
        },
        captionIdeas: {
          type: "array",
          items: { type: "string" }
        },
        warnings: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    LinkedIn: {
      type: "array",
      items: postPackageSchema
    },
    X: {
      type: "array",
      items: postPackageSchema
    },
    Instagram: {
      type: "array",
      items: postPackageSchema
    },
    TikTok: {
      type: "array",
      items: postPackageSchema
    }
  }
};

const regenerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mediaAnalysis", "post"],
  properties: {
    mediaAnalysis: generationSchema.properties.mediaAnalysis,
    post: {
      type: "object",
      additionalProperties: false,
      required: [
        "platform",
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
        platform: { type: "string" },
        ...postPackageSchema.properties
      }
    }
  }
};

const bannedConduitPhrases = [
  "revolutionize",
  "transform the way",
  "unlock",
  "elevate",
  "seamless",
  "cutting-edge",
  "game-changing",
  "next-gen",
  "supercharge",
  "empower",
  "innovation for innovation's sake",
  "future of work"
];

const conduitWritingGuide = `Conduit writing style:
- Clear, direct, practical, and specific.
- Ground posts in real industrial operations: factories, robots, machines, sensors, operators, workcells, PLCs, integrations, handoffs, deployments, and operational constraints.
- Prefer concrete nouns and observed details over abstract claims.
- Use founder-led clarity when selected, but do not pretend a founder is speaking unless the Posting Account is that person.
- No generic SaaS language, no vague transformation language, no overhyped claims, no invented customer proof, and no unsupported metrics.
- Avoid these phrases and close variants: ${bannedConduitPhrases.join(", ")}.
- If Company Knowledge does not support a claim, avoid the claim or mention in rationale that it would need review. Do not put unsupported caveats in postCopy.
- Claim Library is the approved/do-not-say layer inside Company Knowledge. Prefer approved/proof-backed claims when relevant. Never use do-not-say claims or close rewrites. Treat needs-review, customer-sensitive, internal-only, or unsupported claims as review items for rationale, not public facts.
- Approved examples influence cadence, structure, and taste only. Never copy them word-for-word.
- Profile voice examples influence tone, hooks, sentence rhythm, formatting, and cadence only. Never copy pasted examples word-for-word.
- Profile source links are mostly stored for future sync. Use analyzed or synced source data when present; otherwise treat the links as references only and do not claim to have fetched them.
- Do not use unanalyzed source links as learned voice. They only show that a source was saved for later.
- Owned/internal analyzed profile sources can guide cadence, style, and voice for that person or company.
- External inspiration/reference profile sources are pattern-only. They may guide structure, pacing, hooks, and creative patterns, but never facts, claims, customer names, identity, or exact wording.
- External inspiration must never override Conduit Company Knowledge, Brand Voice Rules, claims, facts, or who is speaking.

Platform hooks:
- LinkedIn: first line must be specific and opinionated. Avoid "Excited to share" and generic announcements. Use short paragraphs.
- X: short, punchy, one clear point. Avoid hashtags unless they are genuinely useful. No corporate phrasing.
- Instagram: visual-first caption. First line should connect to the image/video when media exists. Include overlay text separately.
- TikTok: natural spoken hook, short script, shot list. Avoid polished corporate language.

Media rules:
- If media exists, every post should clearly connect to what is visible or described.
- If the image shows a robot, workshop, factory, whiteboard, hardware, notes, or operational setup, reference that concretely.
- Do not force media into unrelated abstract messaging.`;

function truncate(value: string, maxLength = 3000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function compactVoiceExamples(profile?: Profile) {
  const manualExamples = (profile?.voiceExamples ?? [])
    .filter((example) => example.useAsVoice && example.analysis)
    .slice(0, 5)
    .map((example) => ({
      kind: "manual_example",
      title: example.title,
      platform: example.platform,
      notes: example.notes,
      patternOnly: example.patternOnly,
      contentSample: truncate(example.content, 900),
      analysis: example.analysis
    }));
  const sourceLinks = (profile?.voiceSources ?? [])
    .slice(0, 8)
    .map((source) => ({
      kind: "source_link",
      title: source.title,
      sourceKind: source.sourceKind,
      platform: source.platform,
      sourceType: source.sourceType,
      influenceType:
        source.sourceType === "inspiration/reference" || source.sourceType === "competitor/market watch"
          ? "external pattern-only inspiration"
          : "owned/internal voice",
      url: source.url,
      syncStatus: source.syncStatus,
      lastSynced: source.lastSynced,
      lastAnalyzed: source.lastAnalyzed,
      notes: source.notes,
      patternOnly: source.patternOnly,
      hasPastedText: Boolean(source.pastedText),
      hasFetchedContent: Boolean(source.fetchedContent),
      hasScreenshotAnalysis: Boolean(source.screenshot?.analysisText),
      analysis: source.analysis
    }));
  return [...manualExamples, ...sourceLinks];
}

function compactRequest(body: GenerateRequest) {
  return {
    campaignTitle: body.campaignTitle,
    intent: body.intent ?? "",
    campaignTemplate: body.campaignTemplate ?? "",
    contentAngle: body.contentAngle ?? "",
    simpleStyleChips: body.simpleStyleChips ?? [],
    simpleStyleInstructions: body.simpleStyleInstructions ?? [],
    rawIdea: body.rawIdea,
    selectedPlatforms: body.selectedPlatforms,
    mediaContext: body.mediaContext
      ? {
          type: body.mediaContext.type,
          filename: body.mediaContext.filename,
          manualNotes: body.mediaContext.notes,
          imageIncludedForVision: Boolean(body.mediaContext.imageDataUrl),
          videoOrAudioNote:
            body.mediaContext.type === "video" || body.mediaContext.type === "audio"
              ? "Do not claim transcription or frame analysis. Use filename and manual notes only."
              : undefined
        }
      : null,
    regeneration: body.regeneration
      ? {
          platform: body.regeneration.platform,
          currentContent: truncate(body.regeneration.currentContent, 5000),
          instruction: body.regeneration.instruction
        }
      : null,
    profile: body.profile
      ? {
          name: body.profile.name,
          type: body.profile.type,
          role: body.profile.role,
          bio: body.profile.bio,
          linkedInUrl: body.profile.linkedInUrl,
          xUrl: body.profile.xUrl,
          instagramUrl: body.profile.instagramUrl,
          tiktokUrl: body.profile.tiktokUrl,
          websiteUrl: body.profile.websiteUrl,
          otherUrls: body.profile.otherUrls,
          pastedExamplesOrContent: truncate(body.profile.examples),
          notes: body.profile.notes,
          syncStatus: body.profile.syncStatus,
          lastChecked: body.profile.lastChecked,
          mockPersonality: body.profile.personality,
          voiceExamples: compactVoiceExamples(body.profile)
      }
      : null,
    voiceInfluences: (body.voiceInfluences ?? []).slice(0, 5).map((profile) => ({
      name: profile.name,
      type: profile.type,
      role: profile.role,
      bio: profile.bio,
      examples: truncate(profile.examples, 2000),
      notes: profile.notes,
      personality: profile.personality,
      voiceExamples: compactVoiceExamples(profile)
    })),
    inspirationProfiles: (body.inspirationProfiles ?? []).slice(0, 5).map((profile) => ({
      name: profile.name,
      type: profile.type,
      whatWeLike: profile.whatWeLike,
      patternsToLearn: profile.patternsToLearn,
      thingsNotToCopy: profile.thingsNotToCopy,
      examples: truncate(profile.examples, 2000),
      notes: profile.notes,
      personality: profile.personality,
      voiceExamples: compactVoiceExamples(profile).map((example) => ({
        ...example,
        patternOnly: true
      }))
    })),
    repurpose: body.repurpose
      ? {
          sourceType: body.repurpose.sourceType,
          sourceLabel: body.repurpose.sourceLabel,
          sourceContent: truncate(body.repurpose.sourceContent, 5000),
          reuseOriginalMedia: Boolean(body.repurpose.reuseOriginalMedia)
        }
      : null,
    approvedExamples: (body.approvedExamples ?? []).slice(0, 5).map((example) => ({
      platform: example.platform,
      contentAngle: example.contentAngle,
      intent: example.intent,
      mediaUsed: example.mediaUsed,
      finalContent: truncate(example.finalContent, 1500)
    })),
    feedbackMemory: body.feedbackMemory?.enabled
      ? {
          topPreferences: body.feedbackMemory.topPreferences.slice(0, 8),
          platformPreferences: body.feedbackMemory.platformPreferences,
          profilePreferences: body.feedbackMemory.profilePreferences,
          confidence: body.feedbackMemory.confidence,
          eventCount: body.feedbackMemory.eventCount
        }
      : { enabled: false },
    claimLibrary: body.claimLibrary
      ? {
          approvedClaims: (body.claimLibrary.approvedClaims ?? []).slice(0, 20),
          needsReviewClaims: (body.claimLibrary.needsReviewClaims ?? []).slice(0, 20),
          doNotSayClaims: (body.claimLibrary.doNotSayClaims ?? []).slice(0, 20),
          claimDetails: (body.claimLibrary.claimDetails ?? []).slice(0, 40)
        }
      : null,
    brandVoice: body.brandVoice,
    voiceSource: body.voiceSource
      ? {
          name: body.voiceSource.name,
          type: body.voiceSource.type,
          platform: body.voiceSource.platform,
          purposes: body.voiceSource.purposes ?? [],
          urls: body.voiceSource.urls ?? "",
          urlType: body.voiceSource.urlType ?? "Other",
          syncStatus: body.voiceSource.syncStatus ?? "Manual Only",
          lastChecked: body.voiceSource.lastChecked ?? "Never",
          notes: body.voiceSource.notes ?? "",
          examples: truncate(body.voiceSource.examples),
          mockAnalysis: body.voiceSource.analysis
        }
      : null,
    sourceLibraryItems: (body.sourceLibraryItems ?? []).map((source) => ({
      name: source.name,
      category: source.category,
      platform: source.platform,
      urls: source.urls,
      urlType: source.urlType ?? "Other",
      syncStatus: source.syncStatus ?? "Manual Only",
      lastChecked: source.lastChecked ?? "Never",
      pastedContent: truncate(source.content),
      notes: source.notes,
      mockAnalysis: source.analysis
    }))
  };
}

function extractOutputText(response: unknown) {
  const maybe = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (maybe.output_text) {
    return maybe.output_text;
  }

  return (
    maybe.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text" && content.text)?.text ?? ""
  );
}

function parseStructuredJson(outputText: string) {
  const trimmed = outputText.trim();
  const attempts = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  ];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    attempts.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // Try the next cleanup strategy.
    }
  }

  throw new Error("OpenAI returned invalid JSON.");
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      fallbackReason: "missing_api_key",
      error: "OPENAI_API_KEY is missing. Mock generation can be used."
    });
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  try {
    const isRegeneration = body.mode === "regenerate" && body.regeneration;
    const isRepurpose = body.mode === "repurpose" && body.repurpose;
    const cleanPostRule =
      "postCopy must contain only the final social media post text. Do not include labels like Profile, Company Knowledge, Media used, Approved examples, Content angle, Intent, Details/raw notes, media analysis, or system instructions in postCopy. Put reasoning/context only in rationale and supporting fields.";
    const conciseOutputRule =
      "Keep every field concise. postCopy should be ready to publish, rationale should be 1-2 sentences, and supporting fields should be short.";
    const promptText = isRegeneration
      ? `Regenerate exactly one social post package from this JSON brief.\n\nHighest priority: follow the user's regeneration instruction. Then preserve the original campaign context.\n\n${conduitWritingGuide}\n\nContext priority order:\n1. Regeneration instruction\n2. Intent\n3. Details/raw notes\n4. Manual media notes/context\n5. AI media/image analysis\n6. Content angle\n7. Simple Mode style guidance, if present\n8. Posting Account\n9. Company Knowledge\n10. Claim Library approved/do-not-say guidance\n11. Recent approved examples\n12. Voice Influence\n13. Inspiration / Reference profiles\n14. Brand Voice Rules\n\nRules:\n- Return one replacement post package for the requested platform only.\n- ${cleanPostRule}\n- ${conciseOutputRule}\n- Posting Account determines perspective and who is speaking.\n- Simple Mode style chips are lightweight style guidance only; they do not change facts or who is speaking.\n- Voice Influence provides internal style/cadence examples only.\n- Inspiration / Reference profiles provide external format/style inspiration only. Never copy wording and never let them override Conduit truth.\n- Do not write in first person as Danny/Sahil/founders unless that person is the Posting Account.\n- Follow the campaign template structure when provided, but never override the user's instruction, intent, details, or media notes.\n- Improve the current content according to the instruction.\n- Prefer approved Claim Library wording when it fits. Avoid do-not-say claims and mark needs-review claims only in rationale.\n- Do not regenerate other platforms.\n- Do not invent facts not in the provided brief.\n\n${JSON.stringify(compactRequest(body), null, 2)}`
      : `${isRepurpose ? "Repurpose existing content into new platform-native social post packages." : "Generate platform-specific social post packages from this JSON brief."} For selected platforms, provide exactly 3 variants. Variant 1 should be the recommended/default draft. Variant 2 should be shorter. Variant 3 should be more founder-led or reflective.\n\n${conduitWritingGuide}\n\nInput priority order, from highest to lowest:\n1. Intent\n2. Details/raw notes\n3. Manual media notes/context\n4. AI image/media analysis\n5. Source content being repurposed, if provided\n6. Content angle\n7. Posting Account personality/content\n8. Selected Company Knowledge\n9. Claim Library approved/do-not-say guidance\n10. Recent approved examples from the Posting Account\n11. Brand Voice Rules\n12. Simple Mode style guidance, if present\n13. Internal Voice Influence style/cadence\n14. Inspiration / Reference profile patterns\n15. Campaign template\n\nHard relevance rules:\n- Every generated post must clearly communicate the current intent.\n- Every generated post must use the current details/raw notes and media notes as the grounding context.\n- Every generated post must match the selected content angle.\n- Posting Account determines perspective and who is speaking.\n- Simple Mode style chips provide lightweight style guidance only; they do not change facts, claims, or identity.\n- For Conduit posts, use company voice with founder-style clarity when founder voices are selected as Voice Influence.\n- Do not write in first person as Danny, Sahil, or any founder unless that person is the Posting Account.\n- Voice Influence provides internal style/cadence examples only; it does not change who is speaking.\n- Inspiration / Reference profiles provide external structure, format, energy, and creative pattern inspiration only.\n- Never copy external inspiration wording, claims, examples, or identity.\n- Never let external inspiration profiles override Conduit Company Knowledge or Brand Voice Rules.\n- The output should sound like Conduit or the selected Posting Account, not like the inspiration profile.\n- Follow the selected campaign template structure when provided, but intent, details/raw notes, repurpose source, and media notes are higher priority than the template.\n- ${cleanPostRule}\n- ${conciseOutputRule}\n- If repurposing, preserve the core idea of the source but do not copy the original post word-for-word.\n- If repurposing, rewrite natively for each target platform and adjust length, format, tone, and media use.\n- Details/raw notes are supporting context, not a license to drift into generic content.\n- Use approved examples only as style/cadence examples, not as facts for this campaign.\n- Prefer concrete language from Company Knowledge when it supports the current intent. Do not invent claims beyond it.\n- Prefer approved/proof-backed Claim Library claims when relevant. Avoid do-not-say claims and close rewrites. Needs-review claims must not be presented as facts in postCopy.\n- If manual media notes are present, every generated post must explicitly connect to those notes.\n- If image analysis is present, reference only what is actually visible or described by the analysis.\n- Avoid generic marketing language unless the selected content angle or campaign template is Product launch, or the user explicitly asks for marketing/product launch language.\n- Do not invent that the campaign is about marketing, content creation, social media workflow, or brand voice unless the brief says that.\n- Do not reuse default starter language or examples unless they appear in the current brief.\n- URLs are references only. Do not claim to have fetched or synced them.\n\nFor unselected platforms, return an empty array.\n\nIf image media is provided, analyze what is visible and include mediaAnalysis with description, content angles, caption ideas, and possible sensitivity warnings. If video or audio media is provided, do not invent transcript or frame details. Use only filename and manual media notes.\n\n${JSON.stringify(compactRequest(body), null, 2)}`;

    const userContent: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string }
    > = [
      {
        type: "input_text",
        text: promptText
      }
    ];

    if (body.mediaContext?.type === "image" && body.mediaContext.imageDataUrl) {
      userContent.push({
        type: "input_image",
        image_url: body.mediaContext.imageDataUrl
      });
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        instructions:
          `You generate social posts for Conduit's social command center. Return structured JSON only. postCopy must contain only final public social post text, never internal labels or prompt/context fields. Put reasoning only in rationale. Prioritize the user's intent first, then details/raw notes, media notes, media analysis, Posting Account, Company Knowledge, approved examples, and Brand Voice Rules. Posting Account determines perspective and who is speaking. Simple Mode style chips are lightweight style guidance only. Voice Influence provides internal style/cadence only. Inspiration / Reference profiles provide external format/style inspiration only; never copy their wording and never let them override Conduit Company Knowledge or Brand Voice Rules. Do not write in first person as Danny, Sahil, or founders unless that person is the Posting Account. For Conduit posts, use company voice with founder-style clarity when selected. Do not reuse stale/default campaign language. Avoid generic marketing language unless the selected angle is Product launch or the user explicitly asks for it. URLs are references only; do not claim to have fetched URLs. ${conduitWritingGuide}`,
        input: [
          {
            role: "user",
            content: userContent
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: isRegeneration
              ? "social_campaign_regeneration"
              : "social_campaign_generation",
            schema: isRegeneration ? regenerationSchema : generationSchema,
            strict: true
          }
        },
        max_output_tokens: 12000
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return NextResponse.json(
        {
          ok: false,
          error: `OpenAI API failure: ${truncate(errorText, 500)}`
        },
        { status: 502 }
      );
    }

    const responseJson = await openAiResponse.json();
    const outputText = extractOutputText(responseJson);
    if (!outputText) {
      return NextResponse.json(
        { ok: false, error: "OpenAI returned no structured output." },
        { status: 502 }
      );
    }

    try {
      const data = parseStructuredJson(outputText);
      return NextResponse.json({ ok: true, generatedBy: "AI", data });
    } catch (parseError) {
      console.error("[SCC] OpenAI returned unparsable JSON", {
        message: parseError instanceof Error ? parseError.message : String(parseError),
        preview: truncate(outputText, 1200)
      });
      return NextResponse.json(
        { ok: false, error: "OpenAI returned invalid JSON." },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "OpenAI generation failed unexpectedly."
      },
      { status: 502 }
    );
  }
}
