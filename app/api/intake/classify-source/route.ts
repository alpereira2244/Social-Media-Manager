import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

type IntakeBody = {
  title?: string;
  inputType?: string;
  url?: string;
  text?: string;
  notes?: string;
  filename?: string;
  fileType?: string;
  tags?: string;
};

const socialHosts = ["x.com", "twitter.com", "linkedin.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be"];

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sourceKind: { type: "string" },
    recommendedDestination: {
      type: "string",
      enum: [
        "Company Knowledge",
        "Opportunity Inbox",
        "Profile Voice Source",
        "Inspiration / Reference Profile",
        "Competitor / Market Watch",
        "Audience Persona",
        "Media Library",
        "Create Post / Content Brief",
        "Manual review only"
      ]
    },
    secondaryDestination: {
      type: "string",
      enum: [
        "Company Knowledge",
        "Opportunity Inbox",
        "Profile Voice Source",
        "Inspiration / Reference Profile",
        "Competitor / Market Watch",
        "Audience Persona",
        "Media Library",
        "Create Post / Content Brief",
        "Manual review only"
      ]
    },
    confidence: { type: "string", enum: ["Low", "Medium", "High"] },
    why: { type: "string" },
    useAs: { type: "string", enum: ["facts", "voice", "pattern-only", "media", "post idea", "reply opportunity", "manual review"] },
    influence: {
      type: "array",
      items: {
        type: "string",
        enum: ["facts / claims", "voice / style", "pattern-only inspiration", "media asset", "post idea", "reply opportunity", "manual review"]
      }
    },
    recommendedNextAction: { type: "string" },
    whyNotOthers: {
      type: "array",
      items: { type: "string" }
    },
    sensitiveRisk: {
      type: "object",
      additionalProperties: false,
      properties: {
        hasRisk: { type: "boolean" },
        notes: { type: "array", items: { type: "string" } }
      },
      required: ["hasRisk", "notes"]
    },
    status: {
      type: "string",
      enum: ["Classified", "Saved", "Needs review", "Could not classify", "Saved link only", "Fetched and analyzed"]
    },
    detectedPlatform: { type: "string" },
    isSocial: { type: "boolean" },
    canFetchWebsite: { type: "boolean" }
  },
  required: ["sourceKind", "recommendedDestination", "secondaryDestination", "confidence", "why", "useAs", "influence", "recommendedNextAction", "whyNotOthers", "sensitiveRisk", "status", "detectedPlatform", "isSocial", "canFetchWebsite"]
};

function normalizeUrl(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return undefined;
  }
}

function platformFromUrl(url?: URL) {
  if (!url) return "Text";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "X";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "YouTube";
  return "Website";
}

function sourceKindFromUrl(url?: URL) {
  if (!url) return "";
  const platform = platformFromUrl(url);
  const path = url.pathname.toLowerCase();
  if (platform === "X") return /\/status\/|\/statuses\//.test(path) ? "X post URL" : "X profile URL";
  if (platform === "LinkedIn") return /\/posts\/|\/feed\/update\//.test(path) ? "LinkedIn post URL" : "LinkedIn profile URL";
  if (platform === "Instagram") return /\/p\/|\/reel\//.test(path) ? "Instagram post URL" : "Instagram profile URL";
  if (platform === "TikTok") return /\/video\//.test(path) ? "TikTok post URL" : "TikTok profile URL";
  if (platform === "YouTube") return "YouTube URL";
  return "website/blog/doc URL";
}

function isSocialUrl(url?: URL) {
  if (!url) return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return socialHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function deterministicClassify(body: IntakeBody) {
  const url = normalizeUrl(body.url);
  const text = `${body.text ?? ""}\n${body.notes ?? ""}`.toLowerCase();
  const fileType = body.fileType ?? "";
  const filename = body.filename ?? "";
  const inputType = body.inputType ?? "Pasted text";
  const platform = platformFromUrl(url);
  const social = isSocialUrl(url);

  if (inputType === "Media" || fileType.startsWith("image/") || fileType.startsWith("video/") || fileType.startsWith("audio/")) {
    return {
      sourceKind: "media asset",
      recommendedDestination: "Media Library",
      confidence: "High",
      why: "The upload is visual/audio media that can become a reusable social asset.",
      useAs: "media",
      status: "Classified",
      detectedPlatform: "Media",
      isSocial: false,
      canFetchWebsite: false
    };
  }

  if (inputType === "Raw post idea") {
    return {
      sourceKind: "raw post idea",
      recommendedDestination: "Create Post / Content Brief",
      confidence: "High",
      why: "This reads like a draftable content brief rather than source material.",
      useAs: "post idea",
      status: "Classified",
      detectedPlatform: "Text",
      isSocial: false,
      canFetchWebsite: false
    };
  }

  if (url) {
    if (social) {
      const kind = sourceKindFromUrl(url);
      const isPost = kind.toLowerCase().includes("post");
      const isCompetitor = /\bcompetitor|market watch|palantir|anduril|ramp\b/i.test(`${body.title ?? ""} ${body.text ?? ""} ${body.notes ?? ""}`);
      const destination = isPost
        ? "Opportunity Inbox"
        : isCompetitor
          ? "Competitor / Market Watch"
          : platform === "LinkedIn" || platform === "X" || platform === "Instagram" || platform === "TikTok"
            ? "Profile Voice Source"
            : "Inspiration / Reference Profile";
      return {
        sourceKind: kind,
        recommendedDestination: destination,
        confidence: "Medium",
        why: isPost
          ? "This is a social post URL. Treat it as a potential action or reply opportunity; the app will not scrape the platform automatically."
          : "This is a social profile URL. It should be saved as a source link; social content is not scraped.",
        useAs: isPost ? "reply opportunity" : destination === "Profile Voice Source" ? "voice" : "pattern-only",
        status: "Saved link only",
        detectedPlatform: platform,
        isSocial: true,
        canFetchWebsite: false
      };
    }

    return {
      sourceKind: "website/blog/doc URL",
      recommendedDestination: "Company Knowledge",
      confidence: "High",
      why: "Public website/blog pages can be fetched and used as Conduit source-of-truth material after review.",
      useAs: "facts",
      status: "Classified",
      detectedPlatform: "Website",
      isSocial: false,
      canFetchWebsite: true
    };
  }

  if (inputType === "Document" || /\.(pdf|txt|md|markdown|docx|transcript)$/i.test(filename)) {
    return {
      sourceKind: "document upload",
      recommendedDestination: "Company Knowledge",
      confidence: "High",
      why: "Documents, transcripts, and notes should feed the Conduit Brain after review.",
      useAs: "facts",
      status: "Needs review",
      detectedPlatform: "Document",
      isSocial: false,
      canFetchWebsite: false
    };
  }

  if (/transcript|meeting|granola|speaker|call notes|founder notes/.test(text)) {
    return {
      sourceKind: "transcript/meeting notes",
      recommendedDestination: "Company Knowledge",
      confidence: "High",
      why: "Meeting notes and transcripts can teach product framing, customer pain, and founder language after review.",
      useAs: "facts",
      status: "Needs review",
      detectedPlatform: "Text",
      isSocial: false,
      canFetchWebsite: false
    };
  }

  if (/hook|format|style|we like|inspiration|creator|competitor|pattern/.test(text)) {
    return {
      sourceKind: "pattern/inspiration notes",
      recommendedDestination: "Inspiration / Reference Profile",
      confidence: "Medium",
      why: "This appears to describe style or format inspiration, not Conduit facts.",
      useAs: "pattern-only",
      status: "Classified",
      detectedPlatform: "Text",
      isSocial: false,
      canFetchWebsite: false
    };
  }

  return {
    sourceKind: "pasted source text",
    recommendedDestination: "Company Knowledge",
    confidence: "Medium",
    why: "Pasted text is most useful as reviewed Company Knowledge unless you choose a profile destination.",
    useAs: "facts",
    status: "Needs review",
    detectedPlatform: "Text",
    isSocial: false,
    canFetchWebsite: false
  };
}

function sensitiveRiskFromBody(body: IntakeBody) {
  const text = `${body.title ?? ""}\n${body.url ?? ""}\n${body.text ?? ""}\n${body.notes ?? ""}\n${body.filename ?? ""}`;
  const notes: string[] = [];
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) notes.push("May include a private email address.");
  if (/\b(customer|client|account|confidential|private|nda|secret|internal only)\b/i.test(text)) notes.push("May include customer, account, or confidential details.");
  if (/\b(guarantee|always|eliminate|prove|only|never fails|100%)\b/i.test(text)) notes.push("May include an unsupported or absolute claim.");
  if (body.inputType === "Screenshot") notes.push("Screenshot may contain sensitive visible information.");
  return {
    hasRisk: notes.length > 0,
    notes
  };
}

function enrichClassification(classification: ReturnType<typeof deterministicClassify>, body: IntakeBody) {
  const sensitiveRisk = sensitiveRiskFromBody(body);
  const isReplyLike = /\b(reply|comment|mention|question|shoutout)\b/i.test(`${body.title ?? ""} ${body.text ?? ""} ${body.notes ?? ""}`);
  const isOpportunityLike = /\b(trend|news|competitor|mentioned|shoutout|founder thought|customer moment|reply|comment)\b/i.test(`${body.title ?? ""} ${body.text ?? ""} ${body.notes ?? ""}`);
  const secondaryDestination =
    classification.recommendedDestination === "Company Knowledge" && isOpportunityLike
      ? "Opportunity Inbox"
      : classification.recommendedDestination === "Profile Voice Source" && isReplyLike
        ? "Opportunity Inbox"
        : classification.recommendedDestination === "Opportunity Inbox"
          ? "Company Knowledge"
          : "Manual review only";
  const influence = (() => {
    if (classification.useAs === "facts") return ["facts / claims"] as const;
    if (classification.useAs === "voice") return ["voice / style"] as const;
    if (classification.useAs === "pattern-only") return ["pattern-only inspiration"] as const;
    if (classification.useAs === "media") return ["media asset"] as const;
    if (classification.useAs === "post idea") return ["post idea"] as const;
    if (classification.useAs === "reply opportunity") return ["reply opportunity"] as const;
    return ["manual review"] as const;
  })();
  const socialMessage = classification.isSocial
    ? "Social content will not be scraped automatically. Add a screenshot, pasted text, or use future API sync to analyze it."
    : "";
  return {
    ...classification,
    secondaryDestination,
    influence: isReplyLike ? [...influence, "reply opportunity"] : [...influence],
    recommendedNextAction: classification.canFetchWebsite
      ? "Fetch the website, review the text, then save it to the right destination."
      : classification.recommendedDestination === "Media Library"
        ? "Save this as a reusable media asset."
        : classification.recommendedDestination === "Create Post / Content Brief"
          ? "Start a new post brief from this idea."
          : classification.recommendedDestination === "Manual review only" || sensitiveRisk.hasRisk
            ? "Review for sensitivity before using it in generation."
            : socialMessage || "Save it to the recommended destination, then review before generation.",
    whyNotOthers: [
      classification.recommendedDestination !== "Company Knowledge"
        ? "Not Company Knowledge unless it contains Conduit facts, claims, docs, product information, or proof points."
        : "",
      classification.recommendedDestination !== "Opportunity Inbox"
        ? "Not Opportunity Inbox unless it is a trend, mention, reply, news item, competitor post, founder thought, or customer moment to act on."
        : "",
      classification.recommendedDestination !== "Profile Voice Source" && classification.recommendedDestination !== "Inspiration / Reference Profile"
        ? "Not Profiles unless it represents a reusable voice, persona, inspiration brand, competitor, or style/pattern source."
        : "",
      classification.recommendedDestination !== "Media Library"
        ? "Not Media Library unless it is a reusable image, video, audio file, or screenshot."
        : ""
    ].filter(Boolean),
    sensitiveRisk
  };
}

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
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const slice = first >= 0 && last > first ? text.slice(first, last + 1) : text;
  try {
    return JSON.parse(slice);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  let body: IntakeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid source intake request." }, { status: 400 });
  }

  const fallback = enrichClassification(deterministicClassify(body), body);
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", classification: fallback });
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
          "Classify source material for Conduit Social Command Center. Recommend a primary destination and secondary destination when useful. Never recommend scraping social platforms. Social links should be saved as links only unless pasted content/screenshot exists. Company Knowledge is Conduit facts/truth. Opportunity Inbox is for trends, mentions, replies, news, competitor posts, founder thoughts, and customer moments that may become action. Profiles are reusable voices, personas, inspiration brands, competitors, and style/pattern sources. Media Library is reusable image/video/audio/screenshot assets. Manual Review is for unclear, sensitive, or risky material. Return JSON only.",
        input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(body, null, 2) }] }],
        text: {
          format: {
            type: "json_schema",
            name: "source_intake_classification",
            schema: classificationSchema,
            strict: true
          }
        },
        max_output_tokens: 900
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", classification: fallback });
    }

    const parsed = parseJson(extractOutputText(await response.json()));
    return NextResponse.json({ ok: true, generatedBy: "AI", classification: parsed ?? fallback });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", classification: fallback });
  }
}
