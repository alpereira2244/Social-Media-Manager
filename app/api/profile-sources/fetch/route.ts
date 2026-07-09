import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const socialHosts = [
  "x.com",
  "twitter.com",
  "linkedin.com",
  "instagram.com",
  "tiktok.com"
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

type ProfileSourceFetchRequest = {
  source?: {
    url?: string;
    sourceType?: string;
    platform?: string;
  };
  ownership?: string;
  profileType?: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a source URL.");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public http/https URLs are supported.");
  }
  return url;
}

function sourceCategory(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const isSocial = socialHosts.find((domain) => host === domain || host.endsWith(`.${domain}`));
  if (!isSocial) return "Website/blog/doc URL";

  const path = url.pathname.toLowerCase();
  if (isSocial === "x.com" || isSocial === "twitter.com") {
    return /\/status\/|\/statuses\//.test(path) ? "X post URL" : "X profile URL";
  }
  if (isSocial === "linkedin.com") {
    return /\/posts\/|\/feed\/update\//.test(path) ? "LinkedIn post URL" : "LinkedIn profile URL";
  }
  if (isSocial === "instagram.com") {
    return /\/p\/|\/reel\//.test(path) ? "Instagram post URL" : "Instagram profile URL";
  }
  if (isSocial === "tiktok.com") {
    return /\/video\//.test(path) ? "TikTok post URL" : "TikTok profile URL";
  }
  return "Other";
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

function extractTitle(html: string) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1];
  const title = ogTitle ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return decodeHtmlEntities(title.replace(/\s+/g, " ").trim());
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

function socialMessage(kind: string, ownership: string) {
  if (ownership === "inspiration/reference") {
    return "Saved as an inspiration source. The app will learn patterns only when examples, screenshots, public pages, or future supported sync are available.";
  }
  if (ownership === "competitor/market watch") {
    return "Saved for future monitoring. No scraping or analysis has been performed.";
  }
  return "Saved as an owned voice source. Official API sync can be connected later.";
}

function nextActionsForSocialSource(ownership: string) {
  if (ownership === "inspiration/reference") {
    return ["Add screenshot", "Paste example text", "Add notes about what we like", "Add a public website/blog page if available"];
  }
  if (ownership === "competitor/market watch") {
    return ["Save for monitoring later", "Add notes", "Paste public examples if approved"];
  }
  return ["Add screenshot", "Paste examples", "Add notes", "Connect official API later"];
}

export async function POST(request: Request) {
  let body: ProfileSourceFetchRequest;
  try {
    body = (await request.json()) as ProfileSourceFetchRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid source fetch request." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = normalizeUrl(body.source?.url ?? "");
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid URL." },
      { status: 400 }
    );
  }

  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const category = sourceCategory(parsedUrl);
  const ownership = body.ownership ?? body.source?.sourceType ?? "internal voice";

  if (socialHosts.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return NextResponse.json({
      ok: true,
      fetched: false,
      sourceCategory: category,
      syncStatus:
        ownership === "competitor/market watch"
          ? "stored only"
          : ownership === "inspiration/reference"
            ? "needs screenshot/text"
            : "API sync available later",
      futureSyncBadge:
        ownership === "inspiration/reference"
          ? "Saved as pattern-only inspiration"
          : ownership === "competitor/market watch"
            ? "Saved for future monitoring"
            : "Saved for future owned-account sync",
      message: socialMessage(category, ownership),
      nextActions: nextActionsForSocialSource(ownership)
    });
  }

  if (privateHostPrefixes.some((prefix) => host.startsWith(prefix))) {
    return NextResponse.json({ ok: false, error: "Only public website/blog/doc URLs can be fetched." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(parsedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ConduitSocialCommandCenter/1.0; +https://conduit.inc)",
        accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Could not fetch this page. The website returned ${response.status}.` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { ok: false, error: "This URL did not return readable HTML." },
        { status: 415 }
      );
    }

    const html = await response.text();
    const title = extractTitle(html) || parsedUrl.hostname;
    const content = extractReadableText(html).slice(0, 50000);
    if (content.split(/\s+/).filter(Boolean).length < 40) {
      return NextResponse.json(
        { ok: false, error: "Fetched the page, but it did not contain enough readable text." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      fetched: true,
      sourceCategory: category,
      futureSyncBadge: "Fetched, ready to analyze",
      syncStatus: "fetched, ready to analyze",
      title,
      content,
      sourceUrl: parsedUrl.toString(),
      fetchedAt: new Date().toISOString(),
      message: "Website/blog/doc content fetched. You can analyze this source now.",
      nextActions: ["Analyze source", "Review fetched text", "Mark as pattern-only if this is external inspiration"]
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "The page took too long to respond."
        : "Could not fetch this website. It may block automated requests.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
