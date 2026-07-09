"use client";

import dynamic from "next/dynamic";

const SocialCommandCenter = dynamic(
  () => import("@/components/social-command-center").then((module) => module.SocialCommandCenter),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200/70 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold">Conduit Social Command Center</h1>
          <p className="mt-2 text-sm text-slate-500">Loading command center...</p>
        </div>
      </main>
    )
  }
);

export function HomeClient() {
  return <SocialCommandCenter />;
}
