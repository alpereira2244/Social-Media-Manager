import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReadinessStatus =
  | "Ready for sandbox test"
  | "Needs setup"
  | "Missing media"
  | "Manual posting ready. API media URL needed for future publishing."
  | "Missing account config"
  | "Token not configured"
  | "Manual posting only";

type ServerTokenStatus = "available_server_side" | "missing";

function isSupportedMediaType(value: string) {
  const normalized = value.toLowerCase();
  return normalized === "image" || normalized === "video";
}

function isPublishableUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function checkServerSideToken() {
  const token = process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_SANDBOX_USER_ID;
  const username = process.env.INSTAGRAM_SANDBOX_USERNAME;

  if (!token) {
    return {
      tokenStatus: "missing" as ServerTokenStatus,
      identityCheckStatus: "missing_token",
      instagramUserId: userId ?? "",
      instagramUsername: username ?? ""
    };
  }
  if (!userId) {
    return {
      tokenStatus: "available_server_side" as ServerTokenStatus,
      identityCheckStatus: "missing_user_id",
      instagramUserId: "",
      instagramUsername: username ?? ""
    };
  }

  return {
    tokenStatus: "available_server_side" as ServerTokenStatus,
    identityCheckStatus: "configured_not_checked",
    instagramUserId: userId,
    instagramUsername: username ?? "",
    accountType: "",
    note: "Readiness does not call Meta automatically. Use Test identity for an explicit server-side check."
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const serverToken = checkServerSideToken();
  const platform = String(body.platform ?? "").trim();
  const postCopy = String(body.postCopy ?? "").trim();
  const mediaUrlCandidates = [
    body.mediaUrl,
    body.mediaPublicUrl,
    body.queueMediaUrl,
    body.campaignMediaUrl,
    body.mediaAssetPublicUrl,
    body.storagePublicUrl,
    body.mediaMetadata?.publicUrl,
    body.mediaMetadata?.url
  ].map((value) => String(value ?? "").trim()).filter(Boolean);
  const mediaUrl = mediaUrlCandidates.find(isPublishableUrl) ?? mediaUrlCandidates[0] ?? "";
  const mediaType = String(body.mediaType ?? "").trim();
  const queueStatus = String(body.queueStatus ?? "").trim();
  const integrationPath =
    String(body.integrationPath ?? "Instagram Login path") === "Facebook Page / Graph API path"
      ? "Facebook Page / Graph API path"
      : "Instagram Login path";
  const accountId = String(
    body.accountId ?? process.env.INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID ?? ""
  ).trim();
  const pageId = String(body.pageId ?? process.env.INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID ?? "").trim();
  const instagramUserId = String(
    body.instagramUserId ?? serverToken.instagramUserId ?? process.env.INSTAGRAM_SANDBOX_USER_ID ?? ""
  ).trim();
  const instagramUsername = String(
    body.instagramUsername ?? serverToken.instagramUsername ?? process.env.INSTAGRAM_SANDBOX_USERNAME ?? ""
  ).trim();
  const accountType = String(body.accountType ?? "").trim();
  const tokenStatus = String(body.tokenStatus ?? "").trim();
  const connectionStatus = String(body.connectionStatus ?? "").trim();
  const serverIdentityConnected =
    serverToken.tokenStatus === "available_server_side" && Boolean(serverToken.instagramUserId);
  const normalizedServerAccountType = String(serverToken.accountType ?? "").toLowerCase();
  const serverProfessionalAccount =
    normalizedServerAccountType === "creator" ||
    normalizedServerAccountType === "business" ||
    normalizedServerAccountType === "professional";
  const hasSandboxConfig = Boolean(
    body.hasSandboxConfig ||
      serverIdentityConnected ||
      process.env.INSTAGRAM_SANDBOX_USER_ID ||
      process.env.INSTAGRAM_SANDBOX_ACCESS_TOKEN
  );
  const hasAccessToken = Boolean(
    body.hasAccessToken ||
      tokenStatus === "Available server-side" ||
      serverToken.tokenStatus === "available_server_side"
  );
  const isArchived = queueStatus.toLowerCase() === "archived";
  const isInstagramLoginPath = integrationPath === "Instagram Login path";
  const manualMediaAvailable = Boolean(
    body.manualMediaAvailable ||
      body.downloadableMediaAvailable ||
      body.mediaUsed ||
      body.mediaAssetId ||
      body.mediaStoragePath ||
      body.mediaFilename ||
      body.mediaAssetName
  );
  const apiMediaUrlReady = Boolean(mediaUrl && isPublishableUrl(mediaUrl));
  const mediaTypeSupported = mediaType ? isSupportedMediaType(mediaType) : manualMediaAvailable;

  const checks = {
    platformInstagram: platform === "Instagram",
    manualMediaAvailable,
    mediaAttached: manualMediaAvailable,
    mediaTypeSupported,
    apiMediaUrlReady,
    mediaUrlReady: apiMediaUrlReady,
    captionReady: postCopy.length > 0 && postCopy.length <= 2200,
    captionLengthReasonable: postCopy.length > 0 && postCopy.length <= 2200,
    sandboxConfigReady: hasSandboxConfig,
    instagramLoginConfigReady:
      serverIdentityConnected ||
      (
        Boolean(instagramUserId) &&
        Boolean(instagramUsername || instagramUserId) &&
        (accountType === "Creator" || accountType === "Business")
      ),
    graphApiConfigReady: Boolean(accountId) && Boolean(pageId),
    accountConfigReady: isInstagramLoginPath
      ? serverIdentityConnected ||
        (
          Boolean(instagramUserId) &&
          Boolean(instagramUsername || instagramUserId) &&
          (accountType === "Creator" || accountType === "Business")
        )
      : Boolean(accountId) && Boolean(pageId),
    identityConnected: isInstagramLoginPath && (serverIdentityConnected || Boolean(instagramUserId)),
    tokenReady: hasAccessToken,
    notArchived: !isArchived
  };

  const notes = [
    !checks.platformInstagram && "This readiness check only applies to Instagram posts.",
    !checks.manualMediaAvailable && "Instagram API publishing requires a saved image or video. Select media from Media Library or upload media that persists.",
    checks.manualMediaAvailable && !checks.mediaTypeSupported && "Media must be an image or video for this sandbox check.",
    checks.manualMediaAvailable && checks.mediaTypeSupported && !checks.apiMediaUrlReady && "Media is available for manual posting, but no API-publishable media URL is available yet.",
    !postCopy && "Caption/post copy is missing.",
    postCopy.length > 2200 && "Caption is over Instagram's 2,200 character caption limit.",
    !checks.sandboxConfigReady && "Instagram sandbox config is missing in Connections.",
    checks.sandboxConfigReady && isInstagramLoginPath && !checks.instagramLoginConfigReady && "Instagram Login path requires Instagram User ID or a connected sandbox identity.",
    checks.sandboxConfigReady && !isInstagramLoginPath && !checks.graphApiConfigReady && "Facebook Page / Graph API path requires Instagram Business Account ID and Facebook Page ID.",
    checks.accountConfigReady && !checks.tokenReady && "Access token is not configured. Store real tokens server-side before future publishing.",
    isArchived && "Archived posts are manual-history only and should not be sent to publishing."
  ].filter(Boolean);

  let status: ReadinessStatus = "Ready for sandbox test";
  if (!checks.platformInstagram || isArchived) {
    status = "Manual posting only";
  } else if (!checks.manualMediaAvailable || !checks.mediaTypeSupported) {
    status = "Missing media";
  } else if (!checks.apiMediaUrlReady) {
    status = "Manual posting ready. API media URL needed for future publishing.";
  } else if (!checks.sandboxConfigReady) {
    status = "Needs setup";
  } else if (!checks.accountConfigReady) {
    status = "Missing account config";
  } else if (!checks.tokenReady) {
    status = "Token not configured";
  } else if (!checks.captionReady) {
    status = "Needs setup";
  }

  return NextResponse.json({
    ok: status === "Ready for sandbox test",
    status,
    dryRunOnly: true,
    integrationPath,
    message:
      status === "Ready for sandbox test"
        ? `This Instagram post looks eligible for a future sandbox API test via ${integrationPath}. No post was published.`
        : status === "Manual posting ready. API media URL needed for future publishing."
          ? "Media is available for manual posting, but no API-publishable media URL is available yet."
        : status === "Missing media"
          ? "Identity and token can be ready, but Instagram API publishing still requires a saved image or video. Manual posting still works."
        : "This Instagram post should stay in the manual publishing workflow for now.",
    checks,
    checklist: [
      { label: `Identity: ${checks.identityConnected ? "connected" : "missing"}`, passed: checks.identityConnected },
      { label: `Token: ${checks.tokenReady ? "server-side" : "missing"}`, passed: checks.tokenReady },
      { label: `Manual media: ${checks.manualMediaAvailable ? "ready" : "missing"}`, passed: checks.manualMediaAvailable },
      { label: `API media URL: ${checks.apiMediaUrlReady ? "ready" : "missing"}`, passed: checks.apiMediaUrlReady },
      { label: `Caption: ${checks.captionReady ? "ready" : "missing"}`, passed: checks.captionReady },
      { label: "Publishing: disabled for safety", passed: true }
    ],
    notes,
    identityConnected: checks.identityConnected,
    warnings: [
      "No post will be published. This is a dry-run validation only.",
      serverToken.tokenStatus === "available_server_side"
        ? "Server-side sandbox token detected. Token value was not exposed to the browser. Meta was not called by this readiness check."
        : "",
      checks.identityConnected && connectionStatus === "needs_token_storage"
        ? "Identity connected. Publishing still disabled because token storage is not persisted."
        : "",
      "Manual publishing remains the primary workflow.",
      "Do not connect real Conduit accounts until OAuth, permissions, and token storage are finalized."
    ].filter(Boolean),
    tokenStatus: serverToken.tokenStatus,
    instagramUserId: serverToken.instagramUserId,
    instagramUsername: serverToken.instagramUsername,
    accountType: serverToken.accountType,
    serverProfessionalAccount,
    lastCheckedAt: new Date().toISOString(),
    identityCheckStatus: serverToken.identityCheckStatus,
    identityCheckError: "",
    identityCheckNote: serverToken.note
  });
}
