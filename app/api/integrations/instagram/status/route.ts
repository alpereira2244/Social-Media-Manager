import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const envKeys = {
  metaAppId: "INSTAGRAM_SANDBOX_META_APP_ID",
  instagramUserId: "INSTAGRAM_SANDBOX_USER_ID",
  instagramUsername: "INSTAGRAM_SANDBOX_USERNAME",
  businessAccountId: "INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID",
  facebookPageId: "INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID",
  accessToken: "INSTAGRAM_SANDBOX_ACCESS_TOKEN"
};

type ServerTokenStatus = "available_server_side" | "missing" | "expired_or_invalid";

function serverTokenStatus(): ServerTokenStatus {
  return process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN ? "available_server_side" : "missing";
}

function serverIdentityStatus() {
  const envUserId = process.env.INSTAGRAM_SANDBOX_USER_ID;
  const envUsername = process.env.INSTAGRAM_SANDBOX_USERNAME;

  if (!process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN) {
    return {
      tokenStatus: serverTokenStatus(),
      identityCheckStatus: "missing_token",
      instagramUserId: envUserId ?? "",
      instagramUsername: envUsername ?? ""
    };
  }

  if (!envUserId) {
    return {
      tokenStatus: "available_server_side" as ServerTokenStatus,
      identityCheckStatus: "missing_user_id",
      instagramUserId: "",
      instagramUsername: envUsername ?? "",
      accountType: ""
    };
  }

  return {
    tokenStatus: "available_server_side" as ServerTokenStatus,
    identityCheckStatus: "not_checked",
    instagramUserId: envUserId,
    instagramUsername: envUsername ?? "",
    accountType: "",
    note: "Identity is not checked automatically. Use Test identity to call Meta explicitly."
  };
}

export async function GET() {
  const env = Object.fromEntries(
    Object.entries(envKeys).map(([label, key]) => [label, Boolean(process.env[key])])
  );
  const identity = serverIdentityStatus();

  return NextResponse.json({
    provider: "instagram",
    mode: "sandbox",
    status: "Sandbox setup available",
    publishingEnabled: false,
    dryRunOnly: true,
    supportedPaths: [
      {
        name: "Instagram Login path",
        requires: [
          "Instagram Professional account",
          "Creator or Business account type",
          "Meta Developer App",
          "Instagram Login configuration",
          "Redirect URL",
          "Instagram User ID",
          "Server-side sandbox token status"
        ],
        oauthSkeleton: {
          start: "/api/integrations/instagram/oauth/start",
          callback: "/api/integrations/instagram/oauth/callback",
          disconnect: "/api/integrations/instagram/disconnect",
          tokenStorage: "status-only; raw tokens are not persisted"
        }
      },
      {
        name: "Facebook Page / Graph API path",
        requires: [
          "Instagram Professional account",
          "Connected Facebook Page",
          "Facebook Page ID",
          "Instagram Business Account ID",
          "Server-side page access token status"
        ]
      }
    ],
    env,
    tokenStatus: identity.tokenStatus,
    instagramUserId: identity.instagramUserId,
    instagramUsername: identity.instagramUsername,
    accountType: identity.accountType,
    lastCheckedAt: new Date().toISOString(),
    identityCheckStatus: identity.identityCheckStatus,
    identityCheckError: "",
    identityCheckNote: identity.note,
    warnings: [
      "Sandbox only. Do not connect real Conduit accounts yet.",
      "Manual publishing remains the production workflow for now.",
      "This route reports whether env vars exist and never returns secret values.",
      "This status route does not call Meta automatically. Use Test identity for an explicit server-side check."
    ]
  });
}
