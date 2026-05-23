"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appUsesSupabase, updateSupabasePassword } from "@/lib/supabase/persistence";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSupabasePassword(password);
      setMessage("Password updated. Sending you back to the app...");
      window.setTimeout(() => router.push("/"), 1200);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not update your password. Open the latest reset link and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/conduit-logo.jpg"
            alt="Conduit logo"
            className="h-12 w-12 rounded-md border border-slate-200 object-cover shadow-sm"
          />
          <div>
            <h1 className="text-xl font-extrabold">Reset password</h1>
            <p className="text-sm text-muted-foreground">Set a new password for your workspace.</p>
          </div>
        </div>

        {!appUsesSupabase() ? (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Supabase is not configured, so password reset is unavailable in local-only mode.
          </p>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <div>
              <label className="text-sm font-bold text-slate-600" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            </div>
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
                {message}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/")}>
              Back to app
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
