import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        skipped: true,
        reason:
          "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required for the authenticated workspace smoke test."
      },
      null,
      2
    )
  );
  process.exit(0);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const suffix = `${Date.now()}`;
const smokeEmail = `scc-smoke-${suffix}@example.com`;
const smokePassword = `Smoke-${suffix}!`;
const workspaceId = `scc-smoke-workspace-${suffix}`;
const memberId = `scc-smoke-member-${suffix}`;
const profileId = `scc-smoke-profile-${suffix}`;
const knowledgeId = `scc-smoke-knowledge-${suffix}`;
const campaignId = `scc-smoke-campaign-${suffix}`;
const postId = `scc-smoke-post-${suffix}`;
const approvedId = `scc-smoke-approved-${suffix}`;
const rejectedId = `scc-smoke-rejected-${suffix}`;
const queueId = `scc-smoke-queue-${suffix}`;
const mediaAssetId = `scc-smoke-media-${suffix}`;
let smokeUserId = "";

const steps = [];

async function runStep(name, fn) {
  const { error, data } = await fn();
  steps.push({
    name,
    ok: !error,
    error: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint
  });
  if (error) {
    throw error;
  }
  return data;
}

async function cleanup() {
  await admin.from("post_queue").delete().eq("id", queueId);
  await admin.from("approved_posts").delete().eq("id", approvedId);
  await admin.from("rejected_posts").delete().eq("id", rejectedId);
  await admin.from("generated_posts").delete().eq("id", postId);
  await admin.from("campaigns").delete().eq("id", campaignId);
  await admin.from("media_library").delete().eq("id", mediaAssetId);
  await admin.from("knowledge_base_items").delete().eq("id", knowledgeId);
  await admin.from("profiles").delete().eq("id", profileId);
  await admin.from("workspace_members").delete().eq("id", memberId);
  await admin.from("workspaces").delete().eq("id", workspaceId);
  if (smokeUserId) {
    await admin.auth.admin.deleteUser(smokeUserId);
  }
}

try {
  const createdUser = await runStep("create auth user", () =>
    admin.auth.admin.createUser({
      email: smokeEmail,
      password: smokePassword,
      email_confirm: true
    })
  );
  smokeUserId = createdUser.user.id;

  await runStep("sign in auth user", () =>
    supabase.auth.signInWithPassword({
      email: smokeEmail,
      password: smokePassword
    })
  );

  await runStep("insert workspace", () =>
    supabase.from("workspaces").insert({
      id: workspaceId,
      name: "Conduit Smoke Workspace",
      owner_user_id: smokeUserId
    })
  );

  await runStep("insert workspace member", () =>
    supabase.from("workspace_members").insert({
      id: memberId,
      workspace_id: workspaceId,
      user_id: smokeUserId,
      role: "owner"
    })
  );

  await runStep("insert profile", () =>
    supabase.from("profiles").insert({
      id: profileId,
      workspace_id: workspaceId,
      name: "SCC Smoke Profile",
      type: "Company Account",
      role_title: "Test",
      bio: "Temporary RLS write-path test.",
      pasted_content: "Temporary approved example.",
      sync_status: "Manual Only",
      last_checked: "Never",
      personality_json: {
        voiceTraits: "Temporary"
      }
    })
  );

  await runStep("insert knowledge_base_item", () =>
    supabase.from("knowledge_base_items").insert({
      id: knowledgeId,
      workspace_id: workspaceId,
      name: "SCC Smoke Knowledge",
      category: "Other",
      material_type: "Mixed",
      pasted_content: "Temporary proof point.",
      sync_status: "Manual Only",
      last_checked: "Never",
      analysis_json: {
        proofPoints: "Temporary"
      }
    })
  );

  await runStep("upsert brand_rules", () =>
    supabase.from("brand_rules").upsert({
      id: `brand-${workspaceId}`,
      workspace_id: workspaceId,
      tone: "Direct",
      style: "Plainspoken",
      audience: "Internal smoke test",
      avoid: "Generic claims",
      updated_at: new Date().toISOString()
    })
  );

  await runStep("insert campaign", () =>
    supabase.from("campaigns").insert({
      id: campaignId,
      workspace_id: workspaceId,
      title: "SCC Smoke Campaign",
      raw_idea: "Verify Supabase writes work.",
      selected_profile_id: profileId,
      selected_knowledge_base_ids: [knowledgeId],
      selected_platforms: ["LinkedIn"],
      media_metadata_json: {
        intent: "Validate persistence",
        contentAngle: "Company update"
      },
      generation_source: "Mock"
    })
  );

  await runStep("insert generated_post", () =>
    supabase.from("generated_posts").insert({
      id: postId,
      workspace_id: workspaceId,
      campaign_id: campaignId,
      platform: "LinkedIn",
      option_label: "Option 1: Recommended",
      variant_number: 1,
      content_json: {
        postCopy: "Temporary post copy for Supabase smoke test.",
        content: "Temporary post copy for Supabase smoke test.",
        generatedBy: "Mock"
      },
      status: "draft"
    })
  );

  await runStep("update generated_post status", () =>
    supabase
      .from("generated_posts")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", postId)
  );

  await runStep("insert approved_post", () =>
    supabase.from("approved_posts").insert({
      id: approvedId,
      workspace_id: workspaceId,
      profile_id: profileId,
      campaign_id: campaignId,
      generated_post_id: postId,
      platform: "LinkedIn",
      final_content: "Temporary approved post copy.",
      content_angle: "Company update",
      intent: "Validate persistence",
      media_used: false
    })
  );

  await runStep("insert rejected_post", () =>
    supabase.from("rejected_posts").insert({
      id: rejectedId,
      workspace_id: workspaceId,
      profile_id: profileId,
      campaign_id: campaignId,
      generated_post_id: postId,
      platform: "LinkedIn",
      rejected_content: "Temporary rejected post copy.",
      content_angle: "Company update",
      intent: "Validate persistence"
    })
  );

  await runStep("insert post_queue", () =>
    supabase.from("post_queue").insert({
      id: queueId,
      workspace_id: workspaceId,
      profile_id: profileId,
      profile_name: "SCC Smoke Profile",
      campaign_id: campaignId,
      campaign_name: "SCC Smoke Campaign",
      generated_post_id: postId,
      platform: "LinkedIn",
      content_angle: "Company update",
      intent: "Validate persistence",
      content: "Temporary queued post copy.",
      supporting_json: {
        postCopy: "Temporary queued post copy."
      },
      media_used: false,
      status: "Ready"
    })
  );

  await runStep("insert media_library", () =>
    supabase.from("media_library").insert({
      id: mediaAssetId,
      workspace_id: workspaceId,
      filename: "scc-smoke-media.png",
      file_type: "image/png",
      media_type: "image",
      description: "Temporary media library smoke test asset.",
      suggested_angles: ["Validate reusable media"],
      overlay_text: "Smoke test",
      sensitivity_warnings: [],
      alt_text: "Temporary test image metadata.",
      tags: ["smoke-test"],
      notes: "Temporary row; no file upload."
    })
  );

  await runStep("verify workspace-scoped read", () =>
    supabase.from("profiles").select("id, workspace_id").eq("workspace_id", workspaceId).eq("id", profileId).single()
  );

  await runStep("update post_queue", () =>
    supabase
      .from("post_queue")
      .update({
        status: "Scheduled",
        planned_at: new Date(Date.now() + 3600000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", queueId)
  );

  await runStep("insert post_feedback", () =>
    supabase.from("post_feedback").insert({
      workspace_id: workspaceId,
      generated_post_id: postId,
      action: "approved",
      before_content: "draft",
      after_content: "approved"
    })
  );

  await cleanup();

  console.log(
    JSON.stringify(
      {
        ok: true,
        message:
          "Authenticated workspace-scoped Supabase smoke test passed. Temporary rows and user were cleaned up.",
        steps
      },
      null,
      2
    )
  );
} catch (error) {
  await cleanup();
  console.log(
    JSON.stringify(
      {
        ok: false,
        message:
          "Authenticated workspace-scoped Supabase smoke test failed. Run supabase/schema.sql in the SQL editor, then retry.",
        error: error?.message ?? String(error),
        steps
      },
      null,
      2
    )
  );
  process.exit(1);
}
