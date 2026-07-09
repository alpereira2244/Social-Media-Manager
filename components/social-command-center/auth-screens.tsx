"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sendPasswordResetEmail } from "@/lib/supabase/persistence";
import { FieldLabel } from "./field-label";

export function WorkspaceConnectionIssueScreen({
  error,
  userEmail,
  onRetry,
  onUseLocalMode
}: {
  error: string;
  userEmail: string;
  onRetry: () => void;
  onUseLocalMode: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/conduit-logo.jpg" alt="Conduit logo" className="h-12 w-12 rounded-md object-cover" />
          <div>
            <h1 className="text-xl font-bold">Conduit Social Command Center</h1>
            <p className="text-sm text-muted-foreground">Having trouble connecting to your workspace.</p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">Workspace connection needs attention</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Supabase is configured{userEmail ? ` for ${userEmail}` : ""}, but the app could not finish loading the
            shared workspace after a retry. You can retry the workspace connection or continue in local browser mode for
            development.
          </p>
          <details className="mt-3 text-sm text-amber-900">
            <summary className="cursor-pointer font-bold">Debug details</summary>
            <p className="mt-2 break-words">{error}</p>
          </details>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button onClick={onRetry}>Retry workspace connection</Button>
          <Button variant="secondary" onClick={onUseLocalMode}>
            Continue in local mode
          </Button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Local mode only uses this browser’s saved data. It does not delete, overwrite, or reset Supabase records.
        </p>
      </Card>
    </main>
  );
}

export function LoginScreen({
  onSubmit,
  missingEnv,
  onUseLocalMode
}: {
  onSubmit: (email: string, password: string, mode: "sign-in" | "sign-up") => Promise<void>;
  missingEnv: string[];
  onUseLocalMode: () => void;
}) {
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setIsSubmitting(true);
    try {
      await onSubmit(email.trim(), password, mode);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasswordReset(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setIsResetSubmitting(true);
    try {
      await sendPasswordResetEmail((resetEmail || email).trim());
      setResetMessage("If an account exists, a reset link has been sent.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not send reset email.");
    } finally {
      setIsResetSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/conduit-logo.jpg" alt="Conduit logo" className="h-12 w-12 rounded-md object-cover" />
          <div>
            <h1 className="text-xl font-bold">Conduit Social Command Center</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
          </div>
        </div>

        {!showForgotPassword ? (
          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <div>
              <FieldLabel label="Email" htmlFor="auth-email" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel label="Password" htmlFor="auth-password" />
                {mode === "sign-in" && (
                  <button
                    type="button"
                    className="text-sm font-bold text-primary"
                    onClick={() => {
                      setError("");
                      setResetMessage("");
                      setResetEmail(email);
                      setShowForgotPassword(true);
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            {missingEnv.length > 0 && (
              <p className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                Missing Supabase env vars: {missingEnv.join(", ")}. Local development fallback only works when Supabase
                is not configured.
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={submitPasswordReset}>
            <div>
              <h2 className="text-lg font-bold">Reset your password</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Enter your email and we will send a Supabase password reset link.
              </p>
            </div>
            <div>
              <FieldLabel label="Email" htmlFor="reset-email" />
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@company.com"
                required
              />
            </div>
            <Button type="submit" disabled={isResetSubmitting}>
              {isResetSubmitting ? "Sending..." : "Send reset link"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError("");
                setShowForgotPassword(false);
              }}
            >
              Back to sign in
            </Button>
          </form>
        )}

        {resetMessage && (
          <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            {resetMessage}
          </p>
        )}

        {!showForgotPassword && (
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              className="text-left text-sm font-bold text-primary"
              onClick={() => {
                setError("");
                setResetMessage("");
                setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
              }}
            >
              {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Development fallback</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use local browser mode to test the app without signing in. This does not delete or overwrite Supabase
                records.
              </p>
              <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onUseLocalMode}>
                Use local mode for this browser
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
