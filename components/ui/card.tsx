import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/80 bg-white/95 text-card-foreground shadow-[0_16px_44px_rgba(15,23,42,0.06)]",
        className
      )}
      {...props}
    />
  );
}
