import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const envKeys = {
  metaAppId: "INSTAGRAM_SANDBOX_META_APP_ID",
  businessAccountId: "INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID",
  facebookPageId: "INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID",
  accessToken: "INSTAGRAM_SANDBOX_ACCESS_TOKEN"
};

export async function GET() {
  const env = Object.fromEntries(
    Object.entries(envKeys).map(([label, key]) => [label, Boolean(process.env[key])])
  );

  return NextResponse.json({
    provider: "instagram",
    mode: "sandbox",
    status: "Sandbox setup available",
    publishingEnabled: false,
    dryRunOnly: true,
    env,
    warnings: [
      "Sandbox only. Do not connect real Conduit accounts yet.",
      "Manual publishing remains the production workflow for now.",
      "This route reports whether env vars exist and never returns secret values."
    ]
  });
}
