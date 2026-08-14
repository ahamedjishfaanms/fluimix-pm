"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TaskCard } from "./task-card";
import { TASK_STATUSES } from "@/lib/types";
import type { Task, TaskStatus, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskBoard({
  tasks,
  setTasks,
  profiles,
  onOpenTask,
  onNewTask,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  profiles: Profile[];
  onOpenTask: (task: Task) => void;
  onNewTask: (status: TaskStatus) => void;
}) {
  const supabase = createClient();
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const boardScrollRef = React.useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = React.useState(0);
  const syncingRef = React.useRef<"top" | "board" | null>(null);

  React.useEffect(() => {
    function measure() {
      if (boardScrollRef.current) setContentWidth(boardScrollRef.current.scrollWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tasks]);

  function handleTopScroll() {
    if (syncingRef.current === "board") return;
    syncingRef.current = "top";
    if (boardScrollRef.current && topScrollRef.current) {
      boardScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    syncingRef.current = null;
  }

  function handleBoardScroll() {
    if (syncingRef.current === "top") return;
    syncingRef.current = "board";
    if (boardScrollRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = boardScrollRef.current.scrollLeft;
    }
    syncingRef.current = null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overIsColumn = TASK_STATUSES.some((s) => s.value === over.id);
    const newStatus = (overIsColumn ? over.id : tasks.find((t) => t.id === over.id)?.status) as TaskStatus;

    if (!newStatus || newStatus === activeTask.status) return;

    setTasks((prev) => prev.map((t) => (t.id === activeTask.id ? { ...t, status: newStatus } : t)));

    await supabase.from("tasks").update({ status: newStatus }).eq("id", activeTask.id);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Top scrollbar — mirrors the board below so you don't have to reach past a tall column to scroll sideways */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="mb-1.5 overflow-x-auto overflow-y-hidden"
        style={{ height: 14 }}
        aria-hidden
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>

      <div ref={boardScrollRef} onScroll={handleBoardScroll} className="kanban-scroll flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((col) => (
          <Column
            key={col.value}
            id={col.value}
            title={col.label}
            tasks={tasks.filter((t) => t.status === col.value)}
            profiles={profiles}
            onOpenTask={onOpenTask}
            onNewTask={() => onNewTask(col.value)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} assignee={profiles.find((p) => p.id === activeTask.assignee_id)} onClick={() => {}} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  title,
  tasks,
  profiles,
  onOpenTask,
  onNewTask,
}: {
  id: string;
  title: string;
  tasks: Task[];
  profiles: Profile[];
  onOpenTask: (t: Task) => void;
  onNewTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="w-72 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} <span className="text-muted-foreground/70">({tasks.length})</span>
        </h3>
        <button
          onClick={onNewTask}
          aria-label={`Add task to ${title}`}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex max-h-[calc(100vh-330px)] min-h-[140px] flex-col gap-2 overflow-y-auto rounded-xl border border-dashed border-border bg-surface-muted/60 p-2 transition-colors",
          isOver && "border-primary-400 bg-primary-50 dark:bg-primary-900/20"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assignee={profiles.find((p) => p.id === task.assignee_id)}
              onClick={() => onOpenTask(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <button
            onClick={onNewTask}
            className="rounded-lg border border-dashed border-border/0 py-6 text-xs text-muted-foreground hover:text-foreground"
          >
            Drop tasks here or click + to add one
          </button>
        )}
      </div>
    </div>
  );
}
