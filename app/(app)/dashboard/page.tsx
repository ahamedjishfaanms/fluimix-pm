import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/card";
import { formatDueDate, isOverdue } from "@/lib/utils";
import { TASK_PRIORITIES } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Clock, FolderKanban } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: myTasks }, { data: projects }, { data: allOpenTasks }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(name, key, color)")
      .eq("assignee_id", user!.id)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("projects").select("*").is("parent_id", null).order("created_at", { ascending: false }).limit(6),
    supabase.from("tasks").select("id, status").neq("status", "done"),
  ]);

  const overdue = (myTasks || []).filter((t: any) => isOverdue(t.due_date, t.status));
  const dueSoon = (myTasks || []).filter((t: any) => {
    if (!t.due_date || isOverdue(t.due_date, t.status)) return false;
    const days = (new Date(t.due_date).getTime() - Date.now()) / 86400000;
    return days <= 7;
  });

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user!.id).single();
  const firstName = profile?.full_name?.split(" ")[0] || profile?.email?.split("@")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="My open tasks" value={myTasks?.length || 0} />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdue.length} tone="danger" />
        <StatCard icon={Clock} label="Due this week" value={dueSoon.length} tone="warning" />
        <StatCard icon={FolderKanban} label="Open tasks (all)" value={allOpenTasks?.length || 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-foreground">My assigned tasks</h2>
          {!myTasks || myTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up — no open tasks assigned to you.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {myTasks.slice(0, 8).map((t: any) => {
                const priority = TASK_PRIORITIES.find((p) => p.value === t.priority);
                const late = isOverdue(t.due_date, t.status);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${t.project_id}?task=${t.id}`}
                        className="truncate text-sm font-medium text-foreground hover:underline"
                      >
                        {t.title}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.projects?.key} · {t.projects?.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge style={{ backgroundColor: `${priority?.color}20`, color: priority?.color }}>
                        {priority?.label}
                      </Badge>
                      {t.due_date && (
                        <Badge variant={late ? "danger" : "outline"}>{formatDueDate(t.due_date)}</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Main projects</h2>
            <Link href="/projects" className="text-xs font-medium text-primary-700 hover:underline dark:text-primary-300">
              View all
            </Link>
          </div>
          {!projects || projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.key}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClasses = {
    default: "bg-primary-800 text-white dark:bg-primary-600 dark:text-primary-950",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
  } as const;
  return (
    <Card className="p-4">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
