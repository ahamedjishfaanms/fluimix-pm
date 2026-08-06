import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-soft",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "outline" | "success" | "warning" | "danger";
}) {
  const variants: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    accent: "bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200",
    outline: "border border-border text-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Avatar({
  name,
  email,
  src,
  size = "sm",
  className,
}: {
  name?: string | null;
  email?: string;
  src?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const sizes = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm" };
  const source = (name && name.trim()) || email?.split("@")[0] || "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const label = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : source.slice(0, 2).toUpperCase();

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name || email || "avatar"} className={cn("rounded-full object-cover", sizes[size], className)} />;
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary-800 font-semibold text-white dark:bg-primary-600",
        sizes[size],
        className
      )}
      title={name || email}
    >
      {label}
    </div>
  );
}
