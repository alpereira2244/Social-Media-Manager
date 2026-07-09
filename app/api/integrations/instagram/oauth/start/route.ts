import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ||
    `${url.origin}/api/integrations/instagram/oauth/callback`;
  const workspaceId = url.searchParams.get("workspaceId") ?? "";

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/?instagram_oauth=missing_client_id", url.origin)
    );
  }

  const csrf = randomUUID();
  const state = Buffer.from(
    JSON.stringify({
      csrf,
      workspaceId,
      integrationPath: "instagram_login",
      createdAt: Date.now()
    })
  ).toString("base64url");

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "instagram_business_basic");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("scc_instagram_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 10 * 60
  });

  return response;
}
