import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const workspaceId = String(body.workspaceId ?? "").trim();
  if (!workspaceId) {
    return NextResponse.json(
      { ok: false, message: "Missing workspace id." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase service role is not configured." },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("social_connections")
    .update({
      status: "disconnected",
      token_status: "Not configured",
      access_token_encrypted_or_placeholder: "not_stored",
      metadata_json: {
        disconnectedAt: now,
        publishingEnabled: false
      },
      updated_at: now
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", "instagram")
    .eq("is_sandbox", true);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Instagram sandbox disconnected. Manual publishing remains available."
  });
}
