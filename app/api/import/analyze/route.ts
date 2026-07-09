import { NextResponse } from "next/server";

const platforms = ["LinkedIn", "X", "Instagram", "TikTok", "Website", "Other"] as const;
const sourceTypes = [
  "Conduit company post",
  "Founder post",
  "Inspiration/reference post",
  "Competitor/market watch",
  "Customer/audience language",
  "Past performance data",
  "Other"
] as const;
const destinations = [
  "Content Library",
  "Profile Voice Source",
  "Approved examples",
  "Company Knowledge",
  "Feedback Memory",
  "Manual review"
] as const;
const influences = [
  "facts / claims",
  "voice / style",
  "pattern-only inspiration",
  "performance history",
  "manual review"
] as const;

const importAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          detectedPlatform: { type: "string", enum: platforms },
          likelySourceType: { type: "string", enum: sourceTypes },
          recommendedDestination: { type: "string", enum: destinations },
          influence: { type: "string", enum: influences },
          toneTraits: { type: "array", items: { type: "string" } },
          hookPatterns: { type: "array", items: { type: "string" } },
          contentAngle: { type: "string" },
          claimRiskNotes: { type: "array", items: { type: "string" } },
          suggestedProfile: { type: "string" },
          suggestedTags: { type: "array", items: { type: "string" } },
          shouldSaveAsApprovedExample: { type: "boolean" },
          engagementRate: { type: "number" },
          confidence: { type: "string", enum: ["Low", "Medium", "High"] }
        },
        required: [
          "id",
          "detectedPlatform",
          "likelySourceType",
          "recommendedDestination",
          "influence",
          "toneTraits",
          "hookPatterns",
          "contentAngle",
          "claimRiskNotes",
          "suggestedProfile",
          "suggestedTags",
          "shouldSaveAsApprovedExample",
          "engagementRate",
          "confidence"
        ]
      }
    },
    topPerformingItemIds: { type: "array", items: { type: "string" } },
    overallNotes: { type: "array", items: { type: "string" } }
  },
  required: ["items", "topPerformingItemIds", "overallNotes"]
};

type ImportItem = {
  id?: string;
  platform?: string;
  postCopy?: string;
  author?: string;
  postingAccount?: string;
  notes?: string;
  url?: string;
  sourceType?: string;
  metrics?: Record<string, unknown>;
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
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function normalizePlatform(value = "", text = ""): (typeof platforms)[number] {
  const haystack = `${value} ${text}`.toLowerCase();
  if (haystack.includes("instagram")) return "Instagram";
  if (haystack.includes("tiktok")) return "TikTok";
  if (haystack.includes("x.com") || haystack.includes("twitter") || /\bx\b/.test(haystack)) return "X";
  if (haystack.includes("linkedin")) return "LinkedIn";
  if (haystack.includes("http")) return "Website";
  return "Other";
}

function metricNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function engagementRate(metrics: Record<string, unknown> = {}) {
  const impressions = metricNumber(metrics.impressions);
  const interactions =
    metricNumber(metrics.likes) +
    metricNumber(metrics.comments) +
    metricNumber(metrics.shares) +
    metricNumber(metrics.saves) +
    metricNumber(metrics.clicks);
  if (impressions <= 0) return interactions;
  return Number((interactions / impressions).toFixed(4));
}

function inferSourceType(item: ImportItem): (typeof sourceTypes)[number] {
  const text = `${item.sourceType ?? ""} ${item.author ?? ""} ${item.postingAccount ?? ""} ${item.notes ?? ""} ${item.url ?? ""} ${item.postCopy ?? ""}`.toLowerCase();
  if (/confidential|private|nda|password|credential/.test(text)) return "Other";
  if (/competitor|market watch/.test(text)) return "Competitor/market watch";
  if (/inspiration|reference|creator|brand we like/.test(text)) return "Inspiration/reference post";
  if (/customer|audience|buyer|persona/.test(text)) return "Customer/audience language";
  if (/danny|sahil|founder/.test(text)) return "Founder post";
  if (/impression|likes|comments|shares|metrics|performance/.test(text) || engagementRate(item.metrics) > 0) return "Past performance data";
  return "Conduit company post";
}

function destinationFor(sourceType: (typeof sourceTypes)[number], risky: boolean): (typeof destinations)[number] {
  if (risky) return "Manual review";
  if (sourceType === "Founder post" || sourceType === "Inspiration/reference post" || sourceType === "Competitor/market watch" || sourceType === "Customer/audience language") {
    return "Profile Voice Source";
  }
  if (sourceType === "Past performance data") return "Content Library";
  return "Content Library";
}

function influenceFor(sourceType: (typeof sourceTypes)[number], risky: boolean): (typeof influences)[number] {
  if (risky) return "manual review";
  if (sourceType === "Inspiration/reference post" || sourceType === "Competitor/market watch") return "pattern-only inspiration";
  if (sourceType === "Founder post" || sourceType === "Customer/audience language") return "voice / style";
  if (sourceType === "Past performance data") return "performance history";
  return "facts / claims";
}

function compactLines(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 8);
}

function fallbackItem(item: ImportItem, index: number) {
  const postCopy = String(item.postCopy ?? "");
  const lines = compactLines(postCopy);
  const sourceType = inferSourceType(item);
  const risky = /confidential|private|nda|password|credential|secret|customer name/i.test(`${postCopy} ${item.notes ?? ""}`);
  const metricsRate = engagementRate(item.metrics);
  const hasMetrics = metricsRate > 0;
  const detectedPlatform = normalizePlatform(item.platform, `${item.url ?? ""} ${postCopy}`);
  return {
    id: String(item.id ?? `import-${index}`),
    detectedPlatform,
    likelySourceType: sourceType,
    recommendedDestination: hasMetrics ? "Content Library" : destinationFor(sourceType, risky),
    influence: hasMetrics ? "performance history" : influenceFor(sourceType, risky),
    toneTraits: [
      /factory|robot|hardware|automation|operations/i.test(postCopy) ? "operational and specific" : "direct and practical",
      sourceType === "Founder post" ? "founder-led" : sourceType === "Inspiration/reference post" ? "pattern-focused" : "company-ready"
    ],
    hookPatterns: lines.slice(0, 3).length > 0 ? lines.slice(0, 3) : ["Lead with a specific observation."],
    contentAngle: /customer|proof|result/i.test(postCopy)
      ? "Customer proof"
      : /robot|factory|automation|hardware/i.test(postCopy)
        ? "Factory operations"
        : /hiring|team|founder/i.test(postCopy)
          ? "Founder/team voice"
          : "Imported content history",
    claimRiskNotes: [
      ...(risky ? ["Sensitive content detected. Route to Manual Review before using in generation."] : []),
      ...(/guarantee|eliminate|replace|automate every|one day/i.test(postCopy) ? ["Strong claim may need review before reuse."] : [])
    ],
    suggestedProfile: sourceType === "Founder post"
      ? (item.author || "Imported founder voice")
      : sourceType === "Inspiration/reference post"
        ? (item.author || item.postingAccount || "Imported inspiration profile")
        : sourceType === "Competitor/market watch"
          ? (item.author || item.postingAccount || "Imported competitor profile")
          : item.postingAccount || item.author || "",
    suggestedTags: [
      detectedPlatform.toLowerCase(),
      sourceType.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ...(hasMetrics ? ["metrics"] : []),
      ...(risky ? ["needs-review"] : [])
    ].filter(Boolean).slice(0, 6),
    shouldSaveAsApprovedExample: sourceType === "Conduit company post" && !risky,
    engagementRate: metricsRate,
    confidence: postCopy.split(/\s+/).filter(Boolean).length > 80 || hasMetrics ? "High" : postCopy.length > 80 ? "Medium" : "Low"
  };
}

function fallbackAnalysis(items: ImportItem[]) {
  const analyzedItems = items.map(fallbackItem);
  const topPerformingItemIds = analyzedItems
    .filter((item) => item.engagementRate > 0)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 3)
    .map((item) => item.id);
  return {
    items: analyzedItems,
    topPerformingItemIds,
    overallNotes: [
      "Deterministic import suggestions were used.",
      "External inspiration and competitor content should stay pattern-only.",
      "Review risky claims before using imported content in generation."
    ]
  };
}

export async function POST(request: Request) {
  let body: { items?: ImportItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, generatedBy: "Fallback", analysis: fallbackAnalysis([]) }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No import items were provided.", generatedBy: "Fallback", analysis: fallbackAnalysis([]) },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallbackAnalysis(items) });
  }

  const fallback = fallbackAnalysis(items);
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
          "Analyze manually imported past social content for Conduit Social Command Center. Return structured JSON only. Do not scrape or claim social sync. Classify each imported item for routing: Content Library, Profile Voice Source, Approved examples, Company Knowledge, Feedback Memory, or Manual review. Company Knowledge is the truth layer. Founder/company posts may teach voice and become approved examples. Past Conduit posts may suggest reusable claims but risky claims must need review. Inspiration and competitor imports are pattern-only and must never become facts or claims. Metrics imports should calculate engagement rate and suggest Analytics/Content Library. Flag sensitive customer/account/confidential content and route it to Manual review.",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify({ items }, null, 2) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "bulk_import_analysis",
            schema: importAnalysisSchema,
            strict: true
          }
        },
        max_output_tokens: 2500
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallback });
    }

    const parsed = parseJson(extractOutputText(await response.json()));
    if (!parsed || !Array.isArray((parsed as { items?: unknown[] }).items)) {
      return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallback });
    }
    return NextResponse.json({ ok: true, generatedBy: "AI", analysis: parsed });
  } catch {
    return NextResponse.json({ ok: true, generatedBy: "Fallback", analysis: fallback });
  }
}
