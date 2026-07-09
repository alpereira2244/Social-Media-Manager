import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const socialHosts = [
  "linkedin.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be"
];

const privateHostPrefixes = [
  "localhost",
  "127.",
  "10.",
  "192.168.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "0."
];

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

type PublicLinkAnalysisRequest = {
  url?: string;
  title?: string;
  profileName?: string;
  profileType?: string;
  sourceType?: string;
  patternOnly?: boolean;
  notes?: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a public source URL.");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public http/https URLs are supported.");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (privateHostPrefixes.some((prefix) => host.startsWith(prefix))) {
    throw new Error("Only public URLs can be analyzed.");
  }
  return url;
}

function platformFromUrl(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "X";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be" || host.endsWith(".youtu.be")) return "YouTube";
  return "Website";
}

function isSocialUrl(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return socialHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isLinkedInCompanyPostsUrl(url: URL) {
  return platformFromUrl(url) === "LinkedIn" && /\/company\/[^/]+\/posts\/?/i.test(url.pathname);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractMetaContent(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"))?.[1] ??
    ""
  );
}

function extractTitle(html: string) {
  const title =
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    "";
  return decodeHtmlEntities(title.replace(/\s+/g, " ").trim());
}

function extractDescription(html: string) {
  const description =
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "twitter:description") ||
    extractMetaContent(html, "description") ||
    "";
  return decodeHtmlEntities(description.replace(/\s+/g, " ").trim());
}

function extractReadableText(html: string) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeHtmlEntities(text);
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
      // Try another cleanup path.
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

function fallbackAnalysis(input: {
  content: string;
  platform: string;
  sourceType?: string;
  patternOnly?: boolean;
}) {
  const lines = compactLines(input.content);
  const wordCount = input.content.split(/\s+/).filter(Boolean).length;
  const external =
    input.patternOnly ||
    input.sourceType === "inspiration/reference" ||
    input.sourceType === "competitor/market watch";
  return {
    toneTraits: [
      external ? "pattern-only reference" : "public voice reference",
      /factory|robot|hardware|automation|workflow|operations/i.test(input.content)
        ? "grounded in operational detail"
        : "direct and practical"
    ],
    sentenceStyle: lines.some((line) => line.length < 90)
      ? ["short, scannable lines"]
      : ["concise explanatory paragraphs"],
    hookPatterns: lines.slice(0, 3),
    commonTopics: lines.filter((line) => /build|factory|robot|customer|workflow|team|market|product|launch/i.test(line)).slice(0, 6),
    repeatedPhrases: Array.from(new Set(input.content.toLowerCase().match(/\b[a-z][a-z-]{5,}\b/g) ?? [])).slice(0, 8),
    phrasesToAvoid: ["Do not copy exact wording", "Do not import facts or claims from external pages"],
    formattingHabits: [input.content.includes("\n\n") ? "paragraph breaks" : "compact formatting"],
    postStructures: ["specific hook", "supporting detail", "clear takeaway"],
    imitate: external
      ? ["structure", "pacing", "hook shape", "format"]
      : ["cadence", "tone", "sentence rhythm", "hook style"],
    doNotCopy: ["exact wording", "identity", "external facts", "unsupported claims"],
    platformPatterns: [`${input.platform}: adapt visible patterns natively`],
    confidenceLevel: wordCount > 800 ? "High" : wordCount > 180 ? "Medium" : "Low",
    influenceType: external ? "external pattern-only inspiration" : "internal voice"
  };
}

async function analyzePublicContent(input: {
  content: string;
  platform: string;
  sourceType?: string;
  patternOnly?: boolean;
  title?: string;
  profileName?: string;
  notes?: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { generatedBy: "Fallback", analysis: fallbackAnalysis(input) };
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
          "Analyze best-effort public page content for a Profile Voice Source. Return structured JSON only. Extract tone traits, hook patterns, sentence style, formatting habits, common topics, repeated phrases, what to imitate, what not to copy, platform-specific patterns, confidence level, and whether this is internal voice or external pattern-only inspiration. Never treat external inspiration as facts or claims. Never copy wording directly.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(input, null, 2) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "public_profile_source_analysis",
            schema: sourceAnalysisSchema,
            strict: true
          }
        },
        max_output_tokens: 1300
      })
    });

    if (!response.ok) {
      return { generatedBy: "Fallback", analysis: fallbackAnalysis(input) };
    }
    return { generatedBy: "AI", analysis: parseJson(extractOutputText(await response.json())) };
  } catch {
    return { generatedBy: "Fallback", analysis: fallbackAnalysis(input) };
  }
}

function blockedResult(url: URL, reason: string, status = 200) {
  const platform = platformFromUrl(url);
  const social = isSocialUrl(url);
  const linkedInHelper = isLinkedInCompanyPostsUrl(url)
    ? " LinkedIn pages often block automated fetching. If this fails, add screenshots or pasted posts, or use approved API access later."
    : "";
  const message = social
    ? `This platform blocked public fetching. The link is saved, but the app could not analyze the page automatically.${linkedInHelper}`
    : "This public page could not be fetched or did not expose enough readable text. The link is saved, but the app could not analyze it automatically.";
  return NextResponse.json(
    {
      ok: true,
      analyzed: false,
      blocked: true,
      platform,
      syncStatus: "fetch blocked",
      sourceState: "Saved link, fetch blocked",
      reason,
      message,
      nextActions: ["Upload screenshot", "Paste example posts", "Add notes", "Use official API later"],
      fetchedAt: new Date().toISOString()
    },
    { status }
  );
}

export async function POST(request: Request) {
  let body: PublicLinkAnalysisRequest;
  try {
    body = (await request.json()) as PublicLinkAnalysisRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid public link analysis request." }, { status: 400 });
  }

  let url: URL;
  try {
    url = normalizeUrl(body.url ?? "");
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid URL." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const platform = platformFromUrl(url);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ConduitSocialCommandCenter/1.0; +https://conduit.inc)",
        accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      return blockedResult(url, `The public page returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return blockedResult(url, "The URL did not return readable HTML.");
    }

    const html = await response.text();
    const title = extractTitle(html) || body.title || url.hostname;
    const description = extractDescription(html);
    const readableText = extractReadableText(html);
    const content = [title, description, readableText].filter(Boolean).join("\n\n").slice(0, 50000);
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (wordCount < (isSocialUrl(url) ? 25 : 40)) {
      return blockedResult(url, "The public page did not expose enough readable text to analyze.");
    }

    const { generatedBy, analysis } = await analyzePublicContent({
      content,
      platform,
      sourceType: body.sourceType,
      patternOnly: body.patternOnly,
      title,
      profileName: body.profileName,
      notes: body.notes
    });

    return NextResponse.json({
      ok: true,
      analyzed: true,
      blocked: false,
      platform,
      title,
      content,
      metadata: {
        description,
        wordCount,
        sourceUrl: url.toString(),
        fetchedAt: new Date().toISOString(),
        bestEffort: true,
        socialUrl: isSocialUrl(url)
      },
      analysis,
      generatedBy,
      syncStatus: "public page analyzed",
      sourceState: "Public page analyzed",
      message: "Public page analyzed. This is a best-effort one-time analysis, not recurring social sync.",
      warnings: [
        isSocialUrl(url) ? "This is not official platform sync. Use official API access later for reliable social account learning." : "",
        body.patternOnly ? "Pattern-only source. It should influence structure/style only, not facts or claims." : ""
      ].filter(Boolean)
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "The public page took too long to respond."
        : "The public page could not be fetched automatically.";
    return blockedResult(url, reason);
  } finally {
    clearTimeout(timeout);
  }
}
