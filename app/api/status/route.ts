import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const appTables = [
  "profiles",
  "knowledge_base_items",
  "brand_rules",
  "campaigns",
  "generated_posts",
  "approved_posts",
  "rejected_posts",
  "post_queue",
  "media_files",
  "media_library",
  "post_feedback"
];

export async function GET() {
  const requiredClientVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ];
  const serverVars = ["SUPABASE_SERVICE_ROLE_KEY"];
  const missingClient = requiredClientVars.filter((key) => !process.env[key]);
  const missingServer = serverVars.filter((key) => !process.env[key]);

  const tableChecks: Array<{
    table: string;
    reachable: boolean;
    error?: string;
  }> = [];
  let storageReachable = false;
  let storageError = "";

  if (missingClient.length === 0) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const results = await Promise.all(
      appTables.map(async (table) => {
        const { error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        return {
          table,
          reachable: !error,
          error: error?.message
        };
      })
    );
    tableChecks.push(...results);

    const { error } = await supabase.storage.getBucket("campaign-media");
    storageReachable = !error;
    storageError = error?.message ?? "";
  }

  const missingTables = tableChecks
    .filter((item) => !item.reachable)
    .map((item) => item.table);

  return NextResponse.json({
    supabase: {
      connected: missingClient.length === 0,
      missingClient,
      missingServer,
      serviceRoleConfigured: missingServer.length === 0,
      tablesReachable: tableChecks.length > 0 && missingTables.length === 0,
      missingTables,
      tableChecks,
      storage: {
        bucket: "campaign-media",
        reachable: storageReachable,
        error: storageError || undefined
      },
      writesLikelyConfigured:
        missingClient.length === 0 &&
        tableChecks.length > 0 &&
        missingTables.length === 0 &&
        storageReachable
    }
  });
}
