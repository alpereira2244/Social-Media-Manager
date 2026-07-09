import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/70 bg-white text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}
