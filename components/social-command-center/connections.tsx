"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel } from "@/components/social-command-center/field-label";
import { Pill } from "@/components/social-command-center/common-ui";
import { cn } from "@/lib/utils";
import type { SocialConnection } from "@/lib/types";

const connectionCards = [
  {
    name: "LinkedIn",
    status: "Coming soon",
    today: "Draft, preview, approve, copy, publish manually, then paste the live URL.",
    later: "Schedule/publish approved posts and pull post metrics once LinkedIn API access is approved.",
    notes: "LinkedIn publishing and post syncing require approved LinkedIn API access."
  },
  {
    name: "X / Twitter",
    status: "Coming soon",
    today: "Create short posts and threads, copy manually, and track metrics by hand.",
    later: "Connect an X app for posting, metrics sync, and account learning.",
    notes: "Needs X API credentials, permissions, and rate-limit review."
  },
  {
    name: "Instagram",
    status: "Sandbox setup available",
    today: "Generate captions, overlay ideas, and media-aware previews for manual posting.",
    later: "Configure a low-risk sandbox and dry-run the Meta/Instagram Graph API payload before real publishing.",
    notes: "Use the test Instagram account manually first. Do not connect real accounts until auth, permissions, and posting workflow are confirmed."
  },
  {
    name: "TikTok",
    status: "Planned",
    today: "Generate hooks, scripts, shot lists, captions, and manual posting copy.",
    later: "Explore TikTok posting and analytics APIs after the manual workflow is proven.",
    notes: "Video/audio analysis and account publishing are not connected yet."
  },
  {
    name: "Website / Blog",
    status: "Website fetching active",
    today: "Fetch public webpages into Company Knowledge and use them as source material.",
    later: "Add recurring refreshes and deeper website/blog indexing.",
    notes: "Public website fetching is active. Social URLs still require platform APIs."
  },
  {
    name: "Analytics Sync",
    status: "Manual metrics active",
    today: "Paste live URLs and manually enter impressions, likes, comments, shares, saves, and clicks.",
    later: "Pull metrics automatically from connected accounts.",
    notes: "Manual metrics power the Analytics page today."
  },
  {
    name: "Mentions / Replies",
    status: "Planned",
    today: "No inbox, mention monitoring, or reply drafting yet.",
    later: "Monitor comments, mentions, and replies and suggest response drafts.",
    notes: "Requires account connections, approval controls, and response safety checks."
  },
  {
    name: "Trend Listening",
    status: "Planned",
    today: "No automated trend monitoring yet.",
    later: "Track relevant industry conversations and suggest post angles.",
    notes: "Should come after permissions, account scopes, and data policy are finalized."
  }
];

function connectionStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("active") || normalized.includes("manual metrics")) return "bg-teal-100 text-primary";
  if (normalized.includes("sandbox")) return "bg-blue-100 text-blue-800";
  if (normalized.includes("soon")) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export function Connections({
  instagramSandboxConnection,
  saveInstagramSandboxConnection,
  workspaceId
}: {
  instagramSandboxConnection?: SocialConnection;
  saveInstagramSandboxConnection: (connection: SocialConnection) => void;
  workspaceId: string;
}) {
  const [showInstagramSetup, setShowInstagramSetup] = useState(Boolean(instagramSandboxConnection));
  const currentWorkflow = [
    "Generate post",
    "Approve to Ready to Post",
    "Copy post manually",
    "Publish manually",
    "Paste live URL",
    "Enter metrics manually",
    "Review analytics"
  ];
  const futureWorkflow = [
    "Connect account",
    "Schedule/publish from dashboard",
    "Pull metrics automatically",
    "Monitor mentions/replies",
    "Suggest responses",
    "Learn from performance"
  ];
  const securityChecklist = [
    "Auth enabled",
    "Workspace permissions enabled",
    "Sensitive data policy reviewed",
    "Approval workflow confirmed",
    "Manual posting tested",
    "Account permissions reviewed"
  ];

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Connections roadmap</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Manual today, connected later</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Today, posts are copied and published manually. Metrics can be entered manually. Account connections will come later once the workflow is stable.
            </p>
          </div>
          <Pill>No accounts connected yet</Pill>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {connectionCards.map((card) => (
          <Card key={card.name} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold tracking-tight">{card.name}</h3>
                <span className={cn("mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-bold", connectionStatusClass(card.status))}>
                  {card.status}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Works today</p>
                <p className="mt-1 text-muted-foreground">{card.today}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Later</p>
                <p className="mt-1 text-muted-foreground">{card.later}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3 text-muted-foreground">
                {card.notes}
              </div>
              {card.name === "Instagram" && (
                <div className="space-y-2">
                  <Button size="sm" onClick={() => setShowInstagramSetup((current) => !current)}>
                    {showInstagramSetup ? "Hide sandbox setup" : "Open sandbox setup"}
                  </Button>
                  {instagramSandboxConnection && (
                    <p className="text-xs font-semibold text-primary">
                      Sandbox config saved · {instagramSandboxConnection.status}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showInstagramSetup && (
        <InstagramSandboxSetupPanel
          connection={instagramSandboxConnection}
          onSave={saveInstagramSandboxConnection}
          workspaceId={workspaceId}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <WorkflowCard title="Current workflow" items={currentWorkflow} />
        <WorkflowCard title="Future connected workflow" items={futureWorkflow} />
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-bold">Security checklist before connecting accounts</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Account connections should wait until these basics are confirmed.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {securityChecklist.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-extrabold text-primary">
                ✓
              </span>
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InstagramSandboxSetupPanel({
  connection,
  onSave,
  workspaceId
}: {
  connection?: SocialConnection;
  onSave: (connection: SocialConnection) => void;
  workspaceId: string;
}) {
  const metadata = connection?.metadata ?? {};
  const [form, setForm] = useState({
    integrationPath: connection?.integrationPath ?? metadata.integrationPath ?? "Instagram Login path",
    metaAppId: metadata.metaAppId ?? "",
    instagramUserId: connection?.instagramUserId ?? metadata.instagramUserId ?? "",
    instagramUsername: connection?.instagramUsername ?? metadata.instagramUsername ?? "",
    accountType: connection?.accountType ?? metadata.accountType ?? "Creator",
    instagramBusinessAccountId: connection?.accountId ?? "",
    facebookPageId: connection?.pageId ?? "",
    tokenStatus:
      connection?.tokenStatus ??
      metadata.tokenStatus ??
      (metadata.accessTokenAvailable || connection?.accessTokenStatus === "Use server env var"
        ? "Available server-side"
        : "Not configured"),
    tokenExpirationDate: metadata.tokenExpirationDate ?? "",
    notes: metadata.notes ?? "",
    professionalAccountReady: Boolean(metadata.professionalAccountReady ?? metadata.businessAccountReady),
    accountTypeReady: Boolean(metadata.accountTypeReady),
    instagramLoginConfigured: Boolean(metadata.instagramLoginConfigured),
    instagramUserIdAvailable: Boolean(metadata.instagramUserIdAvailable),
    facebookPageConnected: Boolean(metadata.facebookPageConnected),
    metaAppExists: Boolean(metadata.metaAppExists),
    redirectUrlConfigured: Boolean(metadata.redirectUrlConfigured),
    permissionsConfigured: Boolean(metadata.permissionsConfigured),
    pageAccessTokenAvailable: Boolean(metadata.pageAccessTokenAvailable ?? metadata.accessTokenAvailable),
    businessAccountReady: Boolean(metadata.businessAccountReady),
    testPublishingEnabled: Boolean(metadata.testPublishingEnabled)
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [dryRunMessage, setDryRunMessage] = useState("");
  const [identityMessage, setIdentityMessage] = useState("");
  const [serverIdentityStatus, setServerIdentityStatus] = useState<{
    tokenStatus?: string;
    identityCheckStatus?: string;
    instagramUserId?: string;
    instagramUsername?: string;
    lastCheckedAt?: string;
    identityCheckError?: string;
  } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCheckingIdentity, setIsCheckingIdentity] = useState(false);

  const isInstagramLoginPath = form.integrationPath === "Instagram Login path";
  const tokenConfigured = form.tokenStatus === "Available server-side";
  const checklist = isInstagramLoginPath
    ? [
        ["professionalAccountReady", "Instagram account is Professional"],
        ["accountTypeReady", "Account type is Creator or Business"],
        ["metaAppExists", "Meta Developer App exists"],
        ["instagramLoginConfigured", "Instagram Login is configured"],
        ["redirectUrlConfigured", "Redirect URL is configured"],
        ["permissionsConfigured", "Required Instagram permissions are configured"],
        ["instagramUserIdAvailable", "Instagram User ID is available"],
        ["tokenConfigured", tokenConfigured ? "Token status is available server-side" : "Token status is not configured yet"],
        ["testPublishingEnabled", "Publishing dry-run only"]
      ]
    : [
        ["professionalAccountReady", "Instagram account is Professional"],
        ["facebookPageConnected", "Instagram account connected to Facebook Page"],
        ["facebookPageIdAvailable", "Facebook Page ID available"],
        ["instagramBusinessAccountIdAvailable", "Instagram Business Account ID available"],
        ["pageAccessTokenAvailable", tokenConfigured ? "Page access token available server-side" : "Page access token not configured yet"],
        ["testPublishingEnabled", "Publishing dry-run only"]
      ];

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    let mounted = true;
    fetch("/api/integrations/instagram/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!mounted) return;
        setServerIdentityStatus({
          tokenStatus: payload?.tokenStatus,
          identityCheckStatus: payload?.identityCheckStatus,
          instagramUserId: payload?.instagramUserId,
          instagramUsername: payload?.instagramUsername,
          lastCheckedAt: payload?.lastCheckedAt,
          identityCheckError: payload?.identityCheckError
        });
        setForm((current) => ({
          ...current,
          instagramUserId: current.instagramUserId || payload?.instagramUserId || "",
          instagramUsername: current.instagramUsername || payload?.instagramUsername || "",
          tokenStatus: payload?.tokenStatus === "available_server_side"
            ? "Available server-side"
            : payload?.tokenStatus === "expired_or_invalid"
              ? "Expired"
              : current.tokenStatus
        }));
      })
      .catch(() => {
        if (mounted) {
          setServerIdentityStatus({ tokenStatus: "missing", identityCheckStatus: "unavailable" });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  function checklistChecked(field: string) {
    if (field === "tokenConfigured") return tokenConfigured;
    if (field === "facebookPageIdAvailable") return Boolean(form.facebookPageId.trim());
    if (field === "instagramBusinessAccountIdAvailable") return Boolean(form.instagramBusinessAccountId.trim());
    return Boolean(form[field as keyof typeof form]);
  }

  function updateChecklist(field: string, checked: boolean) {
    if (field === "tokenConfigured") {
      updateField("tokenStatus", checked ? "Available server-side" : "Not configured");
      return;
    }
    if (field === "facebookPageIdAvailable" || field === "instagramBusinessAccountIdAvailable") {
      return;
    }
    updateField(field as keyof typeof form, checked);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const hasTokenSignal = form.tokenStatus === "Available server-side";
    const nextConnection: SocialConnection = {
      id: connection?.id ?? "instagram-sandbox",
      provider: "instagram",
      accountLabel: "Instagram Sandbox",
      integrationPath: form.integrationPath as SocialConnection["integrationPath"],
      accountId: form.instagramBusinessAccountId.trim(),
      pageId: form.facebookPageId.trim(),
      instagramUserId: form.instagramUserId.trim(),
      instagramUsername: form.instagramUsername.trim(),
      accountType: form.accountType as SocialConnection["accountType"],
      tokenStatus: form.tokenStatus as SocialConnection["tokenStatus"],
      accessTokenStatus: hasTokenSignal ? "Use server env var" : form.tokenStatus === "Expired" ? "Placeholder only" : "Not provided",
      status:
        connection?.status === "needs_token_storage" || connection?.status === "connected_sandbox"
          ? connection.status
          : form.testPublishingEnabled ? "Test publishing enabled" : "Test publishing not enabled",
      isSandbox: true,
      connectedAt: connection?.connectedAt,
      metadata: {
        integrationPath: form.integrationPath,
        metaAppId: form.metaAppId.trim(),
        instagramUserId: form.instagramUserId.trim(),
        instagramUsername: form.instagramUsername.trim(),
        accountType: form.accountType,
        tokenStatus: form.tokenStatus,
        tokenExpirationDate: form.tokenExpirationDate,
        notes: form.notes.trim(),
        professionalAccountReady: form.professionalAccountReady,
        accountTypeReady: form.accountTypeReady,
        instagramLoginConfigured: form.instagramLoginConfigured,
        instagramUserIdAvailable: form.instagramUserIdAvailable,
        businessAccountReady: form.businessAccountReady,
        facebookPageConnected: form.facebookPageConnected,
        metaAppExists: form.metaAppExists,
        redirectUrlConfigured: form.redirectUrlConfigured,
        permissionsConfigured: form.permissionsConfigured,
        pageAccessTokenAvailable: form.pageAccessTokenAvailable,
        accessTokenAvailable: hasTokenSignal,
        serverTokenStatus: serverIdentityStatus?.tokenStatus,
        identityCheckStatus: serverIdentityStatus?.identityCheckStatus,
        lastCheckedAt: serverIdentityStatus?.lastCheckedAt,
        testPublishingEnabled: form.testPublishingEnabled
      },
      createdAt: connection?.createdAt ?? now,
      updatedAt: now
    };

    onSave(nextConnection);
    setStatusMessage("Instagram sandbox settings saved. Real publishing remains disabled.");
    window.setTimeout(() => setStatusMessage(""), 2400);
  }

  async function runDryRun() {
    setDryRunMessage("Running dry-run...");
    try {
      const response = await fetch("/api/integrations/instagram/test-publish-dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationPath: form.integrationPath,
          accountId: form.instagramBusinessAccountId,
          pageId: form.facebookPageId,
          instagramUserId: form.instagramUserId,
          instagramUsername: form.instagramUsername,
          accountType: form.accountType,
          metaAppId: form.metaAppId,
          hasAccessToken: form.tokenStatus === "Available server-side",
          postCopy: "Sandbox dry-run caption. No real post should be published.",
          mediaUrl: ""
        })
      });
      const payload = await response.json();
      setDryRunMessage(payload?.message ?? "Dry-run completed. No post was published.");
    } catch {
      setDryRunMessage("Dry-run route is unavailable. Manual publishing remains active.");
    }
  }

  async function runIdentityCheck() {
    setIsCheckingIdentity(true);
    setIdentityMessage("Checking server-side sandbox identity...");
    try {
      const response = await fetch("/api/integrations/instagram/test-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationPath: form.integrationPath,
          metaAppId: form.metaAppId,
          instagramUserId: form.instagramUserId,
          accountType: form.accountType,
          accountId: form.instagramBusinessAccountId,
          pageId: form.facebookPageId
        })
      });
      const payload = await response.json();
      setServerIdentityStatus({
        tokenStatus: payload?.tokenStatus,
        identityCheckStatus: payload?.identityCheckStatus,
        instagramUserId: payload?.instagramUserId,
        instagramUsername: payload?.instagramUsername,
        lastCheckedAt: payload?.lastCheckedAt,
        identityCheckError: payload?.identityCheckError
      });
      setForm((current) => ({
        ...current,
        instagramUserId: current.instagramUserId || payload?.instagramUserId || "",
        instagramUsername: current.instagramUsername || payload?.instagramUsername || "",
        tokenStatus: payload?.tokenStatus === "available_server_side"
          ? "Available server-side"
          : payload?.tokenStatus === "expired_or_invalid"
            ? "Expired"
            : current.tokenStatus
      }));
      setIdentityMessage(payload?.identityCheckStatus === "passed"
        ? "Identity check passed using the server-side sandbox token."
        : payload?.identityCheckError || payload?.message || "Identity check completed. Review setup details.");
    } catch {
      setIdentityMessage("Identity check route is unavailable. Manual posting remains active.");
    } finally {
      setIsCheckingIdentity(false);
    }
  }

  async function disconnectInstagramSandbox() {
    setIsDisconnecting(true);
    try {
      await fetch("/api/integrations/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId })
      });
    } catch {
      // Local UI state still reflects the disconnect.
    }

    const now = new Date().toISOString();
    onSave({
      id: connection?.id ?? "instagram-sandbox",
      provider: "instagram",
      accountLabel: "Instagram Sandbox",
      integrationPath: form.integrationPath as SocialConnection["integrationPath"],
      accountId: form.instagramBusinessAccountId.trim(),
      pageId: form.facebookPageId.trim(),
      instagramUserId: form.instagramUserId.trim(),
      instagramUsername: form.instagramUsername.trim(),
      accountType: form.accountType as SocialConnection["accountType"],
      tokenStatus: "Not configured",
      accessTokenStatus: "Not provided",
      status: "disconnected",
      isSandbox: true,
      metadata: {
        ...metadata,
        integrationPath: form.integrationPath,
        disconnectedAt: now,
        publishingEnabled: false
      },
      createdAt: connection?.createdAt ?? now,
      updatedAt: now
    });
    setStatusMessage("Instagram sandbox disconnected. Manual publishing remains available.");
    setIsDisconnecting(false);
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-blue-800">Instagram Sandbox Setup</p>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Configure a test account without enabling publishing</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Sandbox only. Do not connect real Conduit accounts yet. Manual publishing remains the production workflow for now.
          </p>
          {connection?.instagramUsername && connection.status !== "disconnected" && (
            <p className="mt-2 text-sm font-bold text-primary">
              Connected sandbox identity: @{connection.instagramUsername} · {connection.integrationPath}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>Sandbox only</Pill>
          <Pill>Dry-run only</Pill>
          <Pill>No OAuth yet</Pill>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm leading-6 text-teal-900">
            <p className="font-bold">Instagram Login OAuth skeleton</p>
            <p className="mt-1">
              Start a sandbox Instagram Login flow, fetch identity server-side, and save connection status. Publishing remains disabled until secure token storage and publish permissions are confirmed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground shadow-sm",
                  !workspaceId && "pointer-events-none opacity-50"
                )}
                href={`/api/integrations/instagram/oauth/start?workspaceId=${encodeURIComponent(workspaceId)}`}
              >
                Connect with Instagram Login
              </a>
              {connection && connection.status !== "disconnected" && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={disconnectInstagramSandbox}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>
              )}
            </div>
            {!workspaceId && (
              <p className="mt-2 text-xs font-semibold">
                Sign in to a shared workspace before starting OAuth.
              </p>
            )}
          </div>
          <h4 className="font-bold">Readiness checklist</h4>
          <div className="mt-3 grid gap-2">
            {checklist.map(([field, label]) => (
              <label key={field} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={checklistChecked(field)}
                  disabled={field === "facebookPageIdAvailable" || field === "instagramBusinessAccountIdAvailable"}
                  onChange={(event) => updateChecklist(field, event.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Token storage should be secured before using real accounts. This MVP stores token status only, not the token value.
          </p>
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-900">
            <p className="font-bold">
              {serverIdentityStatus?.tokenStatus === "available_server_side"
                ? "Token available server-side"
                : serverIdentityStatus?.tokenStatus === "expired_or_invalid"
                  ? "Server-side token needs attention"
                  : "Token not configured server-side"}
            </p>
            <p className="mt-1">
              Token not shown or stored in browser. Identity check: {serverIdentityStatus?.identityCheckStatus ?? "not checked"}.
            </p>
            {serverIdentityStatus?.instagramUsername && (
              <p className="mt-1 font-semibold">Sandbox identity: @{serverIdentityStatus.instagramUsername}</p>
            )}
            {serverIdentityStatus?.identityCheckError && (
              <p className="mt-1 font-semibold text-amber-800">{serverIdentityStatus.identityCheckError}</p>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6">
            <p className="font-bold text-blue-900">Test publish readiness</p>
            <p className="mt-1 text-blue-900">
              Manual posting is the current production flow. Sandbox publishing is not enabled yet. The readiness check only validates whether an Instagram Ready to Post item would be eligible for a future API test.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <FieldLabel label="Integration path" htmlFor="instagram-integration-path" />
            <select
              id="instagram-integration-path"
              value={form.integrationPath}
              onChange={(event) => updateField("integrationPath", event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option>Instagram Login path</option>
              <option>Facebook Page / Graph API path</option>
            </select>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isInstagramLoginPath
                ? "Instagram Login path is intended for Instagram Professional accounts and may avoid the Facebook Page-centered setup. Real publishing is still disabled."
                : "Facebook Page / Graph API path uses the classic Page plus Instagram Business Account setup. Real publishing is still disabled."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Meta App ID" htmlFor="instagram-meta-app-id" />
              <input
                id="instagram-meta-app-id"
                value={form.metaAppId}
                onChange={(event) => updateField("metaAppId", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="1234567890"
              />
            </div>
            {isInstagramLoginPath ? (
              <>
                <div>
                  <FieldLabel label="Instagram User ID" htmlFor="instagram-user-id" />
                  <input
                    id="instagram-user-id"
                    value={form.instagramUserId}
                    onChange={(event) => updateField("instagramUserId", event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Instagram user ID"
                  />
                </div>
                <div>
                  <FieldLabel label="Instagram Username" htmlFor="instagram-username" />
                  <input
                    id="instagram-username"
                    value={form.instagramUsername}
                    onChange={(event) => updateField("instagramUsername", event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="@sandbox_creator"
                  />
                </div>
                <div>
                  <FieldLabel label="Account type" htmlFor="instagram-account-type" />
                  <select
                    id="instagram-account-type"
                    value={form.accountType}
                    onChange={(event) => updateField("accountType", event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Creator</option>
                    <option>Business</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <FieldLabel label="Instagram Business Account ID" htmlFor="instagram-business-account-id" />
                  <input
                    id="instagram-business-account-id"
                    value={form.instagramBusinessAccountId}
                    onChange={(event) => updateField("instagramBusinessAccountId", event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="1784..."
                  />
                </div>
                <div>
                  <FieldLabel label="Facebook Page ID" htmlFor="instagram-facebook-page-id" />
                  <input
                    id="instagram-facebook-page-id"
                    value={form.facebookPageId}
                    onChange={(event) => updateField("facebookPageId", event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Page ID"
                  />
                </div>
              </>
            )}
            <div>
              <FieldLabel label="Token status" htmlFor="instagram-token-status" />
              <select
                id="instagram-token-status"
                value={form.tokenStatus}
                onChange={(event) => updateField("tokenStatus", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option>Not configured</option>
                <option>Available server-side</option>
                <option>Expired</option>
              </select>
            </div>
            <div>
              <FieldLabel label="Token expiration date if known" htmlFor="instagram-token-expiration" />
              <input
                id="instagram-token-expiration"
                type="date"
                value={form.tokenExpirationDate}
                onChange={(event) => updateField("tokenExpirationDate", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 md:col-span-2">
              Do not paste real tokens into the browser. Save only token status here and keep sandbox token values server-side.
            </p>
            <div className="md:col-span-2">
              <FieldLabel label="Notes" htmlFor="instagram-sandbox-notes" />
              <textarea
                id="instagram-sandbox-notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="mt-2 min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Sandbox account name, Meta app notes, permission notes..."
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-primary">
              {statusMessage || identityMessage || dryRunMessage}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={runIdentityCheck} disabled={isCheckingIdentity}>
                {isCheckingIdentity ? "Checking..." : "Test identity"}
              </Button>
              <Button type="button" variant="secondary" onClick={runDryRun}>
                Test dry-run
              </Button>
              <Button type="submit">Save sandbox config</Button>
            </div>
          </div>
        </form>
      </div>
    </Card>
  );
}

function WorkflowCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-extrabold text-slate-600">
              {index + 1}
            </span>
            <span className="text-sm font-semibold">{item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
