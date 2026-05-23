import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = String(
    body.accountId ?? process.env.INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID ?? ""
  ).trim();
  const pageId = String(body.pageId ?? process.env.INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID ?? "").trim();
  const metaAppId = String(body.metaAppId ?? process.env.INSTAGRAM_SANDBOX_META_APP_ID ?? "").trim();
  const postCopy = String(body.postCopy ?? "").trim();
  const mediaUrl = String(body.mediaUrl ?? "").trim();
  const hasAccessToken = Boolean(body.hasAccessToken || process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN);

  const missing = [
    !metaAppId && "Meta App ID",
    !accountId && "Instagram Business Account ID",
    !pageId && "Facebook Page ID",
    !hasAccessToken && "Access token availability",
    !postCopy && "caption/post copy"
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        dryRunOnly: true,
        message: `Dry-run incomplete. Missing: ${missing.join(", ")}.`,
        missing
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    dryRunOnly: true,
    message: "Instagram sandbox dry-run passed. No post was published.",
    wouldSend: {
      provider: "instagram",
      disabledEndpoint: "Instagram Graph API media container + publish flow",
      instagramBusinessAccountId: accountId,
      facebookPageId: pageId,
      captionLength: postCopy.length,
      mediaAttached: Boolean(mediaUrl),
      publishingEnabled: false
    },
    warnings: [
      "This is validation only.",
      "Manual publishing remains the production workflow.",
      "Real Meta API calls should be enabled only after permissions, token storage, and approval workflow are confirmed."
    ]
  });
}
