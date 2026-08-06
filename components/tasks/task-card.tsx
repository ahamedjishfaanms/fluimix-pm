"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Badge } from "@/components/ui/card";
import { formatDueDate, isOverdue, cn } from "@/lib/utils";
import { TASK_PRIORITIES } from "@/lib/types";
import type { Task, Profile } from "@/lib/types";
import { CalendarDays } from "lucide-react";

export function TaskCard({
  task,
  assignee,
  onClick,
}: {
  task: Task;
  assignee?: Profile;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)!;
  const late = isOverdue(task.due_date, task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-panel active:cursor-grabbing"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: priority.color }}
          title={`${priority.label} priority`}
        />
        {task.due_date && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              late ? "text-danger" : "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {formatDueDate(task.due_date)}
          </span>
        )}
      </div>
      <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {task.id.slice(0, 4).toUpperCase()}
        </Badge>
        {assignee && <Avatar size="xs" name={assignee.full_name} email={assignee.email} src={assignee.avatar_url} />}
      </div>
    </div>
  );
}
