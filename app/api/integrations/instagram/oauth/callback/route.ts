import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InstagramState = {
  csrf?: string;
  workspaceId?: string;
  integrationPath?: string;
  createdAt?: number;
};

function decodeState(value: string): InstagramState {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

async function exchangeCodeForToken(code: string, redirectUri: string) {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Instagram client env vars are missing.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error_message ?? "Instagram token exchange failed.");
  }
  return payload as { access_token?: string; user_id?: string };
}

async function fetchInstagramIdentity(accessToken: string) {
  const fields = "user_id,username,account_type";
  const response = await fetch(
    `https://graph.instagram.com/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Instagram identity fetch failed.");
  }
  return payload as {
    id?: string;
    user_id?: string;
    username?: string;
    account_type?: string;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state") ?? "";
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("scc_instagram_oauth_state="))
    ?.split("=")[1];

  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ||
    `${origin}/api/integrations/instagram/oauth/callback`;

  if (!code || !returnedState || !cookieState || returnedState !== cookieState) {
    return NextResponse.redirect(new URL("/?instagram_oauth=invalid_state", origin));
  }

  const state = decodeState(returnedState);
  if (!state.workspaceId) {
    return NextResponse.redirect(new URL("/?instagram_oauth=missing_workspace", origin));
  }

  try {
    const tokenPayload = await exchangeCodeForToken(code, redirectUri);
    const accessToken = tokenPayload.access_token;
    if (!accessToken) throw new Error("Instagram did not return an access token.");

    const identity = await fetchInstagramIdentity(accessToken);
    const now = new Date().toISOString();
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      throw new Error("Supabase service role is not configured.");
    }

    // TODO: Add encrypted token storage before enabling real publishing.
    // For now, the raw access token is used only during this callback request
    // and is intentionally not persisted.
    const { error } = await supabase.from("social_connections").upsert({
      id: "instagram-sandbox",
      workspace_id: state.workspaceId,
      provider: "instagram",
      account_label: identity.username
        ? `Instagram Sandbox - @${identity.username}`
        : "Instagram Sandbox",
      integration_path: "Instagram Login path",
      instagram_user_id: identity.user_id ?? identity.id ?? tokenPayload.user_id ?? null,
      instagram_username: identity.username ?? null,
      account_type:
        identity.account_type === "BUSINESS"
          ? "Business"
          : identity.account_type === "CREATOR"
            ? "Creator"
            : null,
      token_status: "Available server-side",
      access_token_encrypted_or_placeholder: "not_persisted",
      status: "needs_token_storage",
      is_sandbox: true,
      connected_at: now,
      metadata_json: {
        integrationPath: "Instagram Login path",
        instagramUserId: identity.user_id ?? identity.id ?? tokenPayload.user_id ?? "",
        instagramUsername: identity.username ?? "",
        accountType:
          identity.account_type === "BUSINESS"
            ? "Business"
            : identity.account_type === "CREATOR"
              ? "Creator"
              : "",
        tokenStatus: "Available server-side",
        tokenStorage: "not_persisted",
        connectedAt: now,
        publishingEnabled: false,
        warning: "Raw token was not persisted. Add encrypted token storage before publishing."
      },
      created_at: now,
      updated_at: now
    });
    if (error) throw new Error(error.message);

    const response = NextResponse.redirect(new URL("/?instagram_oauth=connected", origin));
    response.cookies.delete("scc_instagram_oauth_state");
    return response;
  } catch (error) {
    console.error("[SCC] Instagram OAuth callback failed", error);
    return NextResponse.redirect(new URL("/?instagram_oauth=failed", origin));
  }
}
