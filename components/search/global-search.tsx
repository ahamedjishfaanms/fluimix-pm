"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge } from "@/components/ui/card";
import { cn, formatDueDate, isOverdue } from "@/lib/utils";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/types";
import type { Task, Profile } from "@/lib/types";

type TaskWithProject = Task & { projects: { name: string; key: string; color: string } | null };

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [allTasks, setAllTasks] = React.useState<TaskWithProject[]>([]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!loaded) loadData();
    }
  }, [open]);

  async function loadData() {
    setLoading(true);
    const [{ data: tasks }, { data: profs }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, projects(name, key, color)")
        .order("updated_at", { ascending: false })
        .limit(400),
      supabase.from("profiles").select("*"),
    ]);
    setAllTasks((tasks as TaskWithProject[]) || []);
    setProfiles(profs || []);
    setLoading(false);
    setLoaded(true);
  }

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTasks.slice(0, 15);
    return allTasks
      .filter((t) => {
        const idPrefix = t.id.slice(0, 4).toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          idPrefix.includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.projects?.key || "").toLowerCase().includes(q) ||
          (t.projects?.name || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [query, allTasks]);

  function openTask(task: TaskWithProject) {
    setOpen(false);
    setQuery("");
    router.push(`/projects/${task.project_id}?task=${task.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search tasks"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search tasks…</span>
        <kbd className="ml-1 hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-16 sm:pt-24">
          <div className="fixed inset-0 bg-primary-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search tasks"
            className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-panel"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, description, ID, or project…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!loading && loaded && results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No tasks match &ldquo;{query}&rdquo;.
                </p>
              )}
              {results.map((t) => {
                const assignee = profiles.find((p) => p.id === t.assignee_id);
                const priority = TASK_PRIORITIES.find((p) => p.value === t.priority)!;
                const statusLabel = TASK_STATUSES.find((s) => s.value === t.status)!.label;
                const late = isOverdue(t.due_date, t.status);
                return (
                  <button
                    key={t.id}
                    onClick={() => openTask(t)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                      style={{ backgroundColor: t.projects?.color || "#153a67" }}
                    >
                      {t.projects?.key?.slice(0, 3) || "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.projects?.name} · {t.id.slice(0, 4).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {statusLabel}
                      </Badge>
                      {t.due_date && (
                        <span className={cn("text-[10px]", late ? "text-danger" : "text-muted-foreground")}>
                          {formatDueDate(t.due_date)}
                        </span>
                      )}
                    </div>
                    {assignee && (
                      <Avatar size="xs" name={assignee.full_name} email={assignee.email} src={assignee.avatar_url} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
