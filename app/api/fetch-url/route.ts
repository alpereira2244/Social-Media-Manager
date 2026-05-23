import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const blockedSocialHosts = [
  "linkedin.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "fb.com",
  "youtube.com",
  "youtu.be"
];

const blockedPrivateHosts = [
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

type FetchUrlRequest = {
  url?: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Enter a website URL to fetch.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only normal public website URLs are supported.");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (blockedSocialHosts.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    const error = new Error(
      "Social URLs require platform API access. Paste content manually for now."
    );
    error.name = "UnsupportedSocialUrl";
    throw error;
  }

  if (blockedPrivateHosts.some((prefix) => host.startsWith(prefix))) {
    throw new Error("Only public website URLs can be fetched.");
  }

  return url;
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

export async function POST(request: Request) {
  let parsedUrl: URL;

  try {
    const body = (await request.json()) as FetchUrlRequest;
    parsedUrl = normalizeUrl(body.url ?? "");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL.";
    const status = error instanceof Error && error.name === "UnsupportedSocialUrl" ? 422 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(parsedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ConduitSocialCommandCenter/1.0; +https://conduit.inc)",
        accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch this page. The website returned ${response.status}.` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "This URL did not return a readable HTML webpage." },
        { status: 415 }
      );
    }

    const html = await response.text();
    const title = extractTitle(html) || parsedUrl.hostname;
    const content = extractReadableText(html).slice(0, 50000);

    if (content.split(/\s+/).filter(Boolean).length < 40) {
      return NextResponse.json(
        { error: "Fetched the page, but it did not contain enough readable text." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title,
      content,
      sourceUrl: parsedUrl.toString(),
      fetched_at: new Date().toISOString()
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "The page took too long to respond."
        : "Could not fetch this website. It may block automated requests.";

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
