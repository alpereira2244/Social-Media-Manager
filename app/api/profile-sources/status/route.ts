import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "stored_only",
    message: "Profile sources are saved now. API sync is optional future work; screenshots, pasted text, and fetched website content can be analyzed now.",
    platforms: {
      X: "needs API",
      LinkedIn: "needs API",
      Instagram: "needs API",
      TikTok: "needs API",
      Website: "fetch or paste text now; profile-source sync later",
      "Website/blog": "fetch or paste text now; profile-source sync later",
      "Other URL": "stored only"
    }
  });
}
