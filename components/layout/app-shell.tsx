"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BookOpen,
  User as UserIcon,
  Menu,
  X,
  Droplets,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GlobalSearch } from "@/components/search/global-search";
import { Avatar } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/docs", label: "Documentation", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-surface lg:flex lg:flex-col">
        <SidebarContent pathname={pathname} profile={profile} onSignOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800 text-white">
            <Droplets className="h-4 w-4" />
          </span>
          Fluimix PM
        </Link>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <ThemeToggle />
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-primary-950/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-surface shadow-panel">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold">Menu</span>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              profile={profile}
              onSignOut={signOut}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        {/* Desktop top bar */}
        <div className="hidden items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 lg:flex">
          <GlobalSearch className="w-72" />
          <ThemeToggle />
        </div>
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-30 flex items-center justify-around border-t border-border bg-surface py-1.5 lg:hidden">
          {NAV.slice(0, 5).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px]",
                  active ? "text-primary-700 dark:text-accent-400" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label === "My Tasks" ? "Tasks" : item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  profile,
  onSignOut,
  onNavigate,
}: {
  pathname: string;
  profile: Profile;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5 font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800 text-white">
          <Droplets className="h-4 w-4" />
        </span>
        Fluimix PM
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-800 text-white dark:bg-primary-600 dark:text-primary-950"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <Avatar name={profile.full_name} email={profile.email} src={profile.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {profile.full_name || profile.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
