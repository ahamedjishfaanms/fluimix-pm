"use client";

import * as React from "react";
import { TaskList } from "./task-list";
import { TaskDialog } from "./task-dialog";
import { cn } from "@/lib/utils";
import { TASK_STATUSES } from "@/lib/types";
import type { Task, Profile, TaskStatus } from "@/lib/types";

export function TasksClient({
  initialTasks,
  profiles,
  projectNames,
  currentUserId,
}: {
  initialTasks: Task[];
  profiles: Profile[];
  projectNames: Record<string, string>;
  currentUserId: string;
}) {
  const [tasks, setTasks] = React.useState(initialTasks);
  const [filter, setFilter] = React.useState<TaskStatus | "all">("all");
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All (${tasks.length})`} />
        {TASK_STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            label={`${s.label} (${tasks.filter((t) => t.status === s.value).length})`}
          />
        ))}
      </div>

      <TaskList
        tasks={filtered}
        profiles={profiles}
        showProject
        projectNames={projectNames}
        onOpenTask={(t) => {
          setEditingTask(t);
          setDialogOpen(true);
        }}
      />

      {editingTask && (
        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          task={editingTask}
          defaultStatus="todo"
          projectId={editingTask.project_id}
          currentUserId={currentUserId}
          profiles={profiles}
          onCreated={() => {}}
          onUpdated={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
          onDeleted={(id) => setTasks((prev) => prev.filter((x) => x.id !== id))}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary-700 bg-primary-800 text-white dark:border-accent-400 dark:bg-accent-500 dark:text-accent-950"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
