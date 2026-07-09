"use client";

import type { ReactNode } from "react";

export function FieldLabel({ children, label, htmlFor }: { children?: ReactNode; label: string; htmlFor?: string }) {
  return (
    <label className="text-sm font-bold text-slate-600" htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}
