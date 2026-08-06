"use client";

import * as React from "react";
import { Avatar, Badge } from "@/components/ui/card";
import { formatDueDate, isOverdue, cn } from "@/lib/utils";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/types";
import type { Task, Profile } from "@/lib/types";

export function TaskList({
  tasks,
  profiles,
  onOpenTask,
  showProject = false,
  projectNames,
}: {
  tasks: Task[];
  profiles: Profile[];
  onOpenTask: (task: Task) => void;
  showProject?: boolean;
  projectNames?: Record<string, string>;
}) {
  if (tasks.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No tasks match this view.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Task</th>
            {showProject && <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Project</th>}
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">Priority</th>
            <th className="px-4 py-2.5 font-medium">Due</th>
            <th className="px-4 py-2.5 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {tasks.map((t) => {
            const assignee = profiles.find((p) => p.id === t.assignee_id);
            const priority = TASK_PRIORITIES.find((p) => p.value === t.priority)!;
            const statusLabel = TASK_STATUSES.find((s) => s.value === t.status)!.label;
            const late = isOverdue(t.due_date, t.status);
            return (
              <tr
                key={t.id}
                onClick={() => onOpenTask(t)}
                className="cursor-pointer hover:bg-muted"
              >
                <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-foreground">{t.title}</td>
                {showProject && (
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                    {projectNames?.[t.project_id] || "—"}
                  </td>
                )}
                <td className="hidden px-4 py-2.5 sm:table-cell">
                  <Badge variant="outline">{statusLabel}</Badge>
                </td>
                <td className="hidden px-4 py-2.5 md:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
                    {priority.label}
                  </span>
                </td>
                <td className={cn("px-4 py-2.5", late ? "text-danger" : "text-muted-foreground")}>
                  {formatDueDate(t.due_date) || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {assignee ? (
                    <Avatar size="xs" name={assignee.full_name} email={assignee.email} src={assignee.avatar_url} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
