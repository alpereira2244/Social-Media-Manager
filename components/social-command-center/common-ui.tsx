"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function AnalysisBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}

export function WarningBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm font-semibold leading-6 text-amber-900">
      {children}
    </div>
  );
}

export function SubtleNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-6 text-slate-500">
      {children}
    </p>
  );
}

export function LayerBlock({
  title,
  value,
  detail,
  description
}: {
  title: string;
  value?: string;
  detail?: string;
  description?: string;
}) {
  const body = description ?? detail ?? "";
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</p>
      {value && <p className="mt-1 font-semibold">{value}</p>}
      <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

export function BriefItem({
  label,
  value,
  children
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold leading-6 text-foreground">{children ?? value ?? "Not set"}</div>
    </div>
  );
}

export function QueueFilter({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}

export function InsightStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">{value}</p>
    </Card>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}
