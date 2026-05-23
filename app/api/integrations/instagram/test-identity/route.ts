import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const metaAppId = String(body.metaAppId ?? process.env.INSTAGRAM_SANDBOX_META_APP_ID ?? "").trim();
  const accountId = String(
    body.accountId ?? process.env.INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID ?? ""
  ).trim();
  const pageId = String(body.pageId ?? process.env.INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID ?? "").trim();
  const hasAccessToken = Boolean(body.hasAccessToken || process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN);

  const missing = [
    !metaAppId && "Meta App ID",
    !accountId && "Instagram Business Account ID",
    !pageId && "Facebook Page ID",
    !hasAccessToken && "Access token availability"
  ].filter(Boolean);

  return NextResponse.json({
    ok: missing.length === 0,
    dryRunOnly: true,
    provider: "instagram",
    mode: "sandbox",
    message:
      missing.length === 0
        ? "Sandbox identity fields look ready for a future Meta API test. No external request was made."
        : `Missing sandbox setup fields: ${missing.join(", ")}.`,
    checks: {
      metaAppId: Boolean(metaAppId),
      instagramBusinessAccountId: Boolean(accountId),
      facebookPageId: Boolean(pageId),
      accessTokenAvailable: hasAccessToken
    },
    warnings: [
      "No real Instagram identity lookup was performed.",
      "Do not use real Conduit account tokens until token storage and permissions are finalized."
    ]
  });
}
