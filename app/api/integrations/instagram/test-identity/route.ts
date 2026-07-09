import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ServerTokenStatus = "available_server_side" | "missing" | "expired_or_invalid";

async function checkIdentity(explicitUserId: string) {
  const token = process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN;
  const envUserId = process.env.INSTAGRAM_SANDBOX_USER_ID;
  const envUsername = process.env.INSTAGRAM_SANDBOX_USERNAME;
  const instagramUserId = explicitUserId || envUserId || "";

  if (!token) {
    return {
      tokenStatus: "missing" as ServerTokenStatus,
      identityCheckStatus: "missing_token",
      instagramUserId,
      instagramUsername: envUsername ?? "",
      accountType: ""
    };
  }
  if (!instagramUserId) {
    return {
      tokenStatus: "available_server_side" as ServerTokenStatus,
      identityCheckStatus: "missing_user_id",
      instagramUserId,
      instagramUsername: envUsername ?? "",
      accountType: ""
    };
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        tokenStatus: "expired_or_invalid" as ServerTokenStatus,
        identityCheckStatus: "failed",
        instagramUserId,
        instagramUsername: envUsername ?? "",
        accountType: "",
        error: typeof data?.error?.message === "string" ? data.error.message : "Instagram identity check failed."
      };
    }
    return {
      tokenStatus: "available_server_side" as ServerTokenStatus,
      identityCheckStatus: "passed",
      instagramUserId: String(data?.id ?? instagramUserId),
      instagramUsername: String(data?.username ?? envUsername ?? ""),
      accountType: String(data?.account_type ?? "")
    };
  } catch {
    return {
      tokenStatus: "expired_or_invalid" as ServerTokenStatus,
      identityCheckStatus: "failed",
      instagramUserId,
      instagramUsername: envUsername ?? "",
      accountType: "",
      error: "Instagram identity check could not be completed."
    };
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const integrationPath =
    String(body.integrationPath ?? "Instagram Login path") === "Facebook Page / Graph API path"
      ? "Facebook Page / Graph API path"
      : "Instagram Login path";
  const metaAppId = String(body.metaAppId ?? process.env.INSTAGRAM_SANDBOX_META_APP_ID ?? "").trim();
  const instagramUserId = String(body.instagramUserId ?? process.env.INSTAGRAM_SANDBOX_USER_ID ?? "").trim();
  const accountType = String(body.accountType ?? "").trim();
  const accountId = String(
    body.accountId ?? process.env.INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID ?? ""
  ).trim();
  const pageId = String(body.pageId ?? process.env.INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID ?? "").trim();
  const identity = await checkIdentity(instagramUserId);
  const hasAccessToken = identity.tokenStatus === "available_server_side";
  const isInstagramLoginPath = integrationPath === "Instagram Login path";

  const missing = [
    !metaAppId && "Meta App ID",
    isInstagramLoginPath && !instagramUserId && "Instagram User ID",
    isInstagramLoginPath && accountType !== "Creator" && accountType !== "Business" && "Creator or Business account type",
    !isInstagramLoginPath && !accountId && "Instagram Business Account ID",
    !isInstagramLoginPath && !pageId && "Facebook Page ID",
    !hasAccessToken && "Access token availability"
  ].filter(Boolean);

  return NextResponse.json({
    ok: missing.length === 0,
    dryRunOnly: true,
    provider: "instagram",
    mode: "sandbox",
    integrationPath,
    message:
      missing.length === 0
        ? "Sandbox identity fields look ready for a future Meta API test. No external request was made."
        : `Missing sandbox setup fields: ${missing.join(", ")}.`,
    checks: {
      metaAppId: Boolean(metaAppId),
      instagramUserId: Boolean(identity.instagramUserId || instagramUserId),
      accountType: accountType === "Creator" || accountType === "Business",
      instagramBusinessAccountId: Boolean(accountId),
      facebookPageId: Boolean(pageId),
      accessTokenAvailable: hasAccessToken
    },
    tokenStatus: identity.tokenStatus,
    instagramUserId: identity.instagramUserId,
    instagramUsername: identity.instagramUsername,
    lastCheckedAt: new Date().toISOString(),
    identityCheckStatus: identity.identityCheckStatus,
    identityCheckError: identity.error,
    warnings: [
      hasAccessToken ? "Instagram identity check used a server-side token and did not expose it to the browser." : "No token was available server-side.",
      "Do not use real Conduit account tokens until token storage and permissions are finalized."
    ]
  });
}
