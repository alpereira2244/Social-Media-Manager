import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-teal-800",
        variant === "secondary" &&
          "border-slate-200 bg-white text-foreground hover:border-slate-300 hover:bg-slate-50",
        variant === "ghost" &&
          "border-transparent bg-transparent text-muted-foreground hover:bg-slate-100 hover:text-foreground",
        variant === "danger" &&
          "border-destructive bg-destructive text-destructive-foreground shadow-sm hover:bg-red-700",
        size === "sm" && "h-8 px-3",
        size === "md" && "h-9 px-4",
        size === "icon" && "h-9 w-9",
        className
      )}
      {...props}
    />
  );
}
