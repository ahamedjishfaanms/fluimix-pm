"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, LayoutGrid, List as ListIcon, Plus, BookOpen } from "lucide-react";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskList } from "@/components/tasks/task-list";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDueDate } from "@/lib/utils";
import type { Task, TaskStatus, Profile, Project } from "@/lib/types";

type Tab = "board" | "list" | "subprojects" | "docs";

export function ProjectView({
  project,
  parentProject,
  subProjects,
  initialTasks,
  profiles,
  docs,
  currentUserId,
}: {
  project: Project;
  parentProject: { id: string; name: string } | null;
  subProjects: Project[];
  initialTasks: Task[];
  profiles: Profile[];
  docs: { id: string; title: string; updated_at: string }[];
  currentUserId: string;
}) {
  const [tab, setTab] = React.useState<Tab>("board");
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>("todo");

  function openNew(status: TaskStatus) {
    setEditingTask(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }
  function openEdit(task: Task) {
    setEditingTask(task);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        {parentProject && (
          <Link
            href={`/projects/${parentProject.id}`}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {parentProject.name} <ChevronRight className="h-3 w-3" /> {project.name}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: project.color }}
            >
              <FolderKanban className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground sm:text-2xl">{project.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{project.key}</Badge>
                <Badge variant={project.status === "active" ? "success" : "default"}>
                  {project.status.replace("_", " ")}
                </Badge>
                {project.due_date && <Badge variant="outline">Due {formatDueDate(project.due_date)}</Badge>}
              </div>
            </div>
          </div>
          <EditProjectDialog project={project} />
        </div>
        {project.description && <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{project.description}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex gap-1">
          <TabButton active={tab === "board"} onClick={() => setTab("board")} icon={LayoutGrid} label="Board" />
          <TabButton active={tab === "list"} onClick={() => setTab("list")} icon={ListIcon} label="List" />
          <TabButton
            active={tab === "subprojects"}
            onClick={() => setTab("subprojects")}
            icon={FolderKanban}
            label={`Sub-projects (${subProjects.length})`}
          />
          <TabButton active={tab === "docs"} onClick={() => setTab("docs")} icon={BookOpen} label={`Docs (${docs.length})`} />
        </div>
        {(tab === "board" || tab === "list") && (
          <Button size="sm" onClick={() => openNew("todo")} className="mb-2">
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>

      {tab === "board" && (
        <TaskBoard tasks={tasks} setTasks={setTasks} profiles={profiles} onOpenTask={openEdit} onNewTask={openNew} />
      )}

      {tab === "list" && <TaskList tasks={tasks} profiles={profiles} onOpenTask={openEdit} />}

      {tab === "subprojects" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <NewProjectDialog parentId={project.id} />
          </div>
          {subProjects.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              No sub-projects yet. Break this project down into smaller workstreams.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subProjects.map((sp) => (
                <Link key={sp.id} href={`/projects/${sp.id}`}>
                  <Card className="h-full p-4 transition-shadow hover:shadow-panel">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sp.color }} />
                      <p className="font-medium text-foreground">{sp.name}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sp.description || "No description."}</p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline">{sp.key}</Badge>
                      <Badge variant={sp.status === "active" ? "success" : "default"}>{sp.status.replace("_", " ")}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "docs" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/projects/${project.id}/docs/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New document
              </Button>
            </Link>
          </div>
          {docs.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              No documentation yet. Capture specs, decisions and runbooks here.
            </Card>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {docs.map((d) => (
                <Link
                  key={d.id}
                  href={`/projects/${project.id}/docs/${d.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    {d.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(d.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={editingTask}
        defaultStatus={defaultStatus}
        projectId={project.id}
        currentUserId={currentUserId}
        profiles={profiles}
        onCreated={(t) => setTasks((prev) => [...prev, t])}
        onUpdated={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
        onDeleted={(id) => setTasks((prev) => prev.filter((x) => x.id !== id))}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary-700 text-foreground dark:border-accent-400"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
