"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/types";
import type { TaskStatus, TaskPriority, Profile } from "@/lib/types";

export interface ProjectOption {
  id: string;
  name: string;
  key: string;
  parent_id: string | null;
}

export function GlobalNewTaskDialog({
  projects,
  profiles,
  currentUserId,
}: {
  projects: ProjectOption[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = React.useState(false);

  const [projectId, setProjectId] = React.useState(projects[0]?.id || "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus>("todo");
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function projectLabel(p: ProjectOption) {
    const parent = p.parent_id ? projects.find((x) => x.id === p.parent_id) : null;
    return parent ? `${parent.key} / ${p.key} — ${p.name}` : `${p.key} — ${p.name}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!projectId) {
      setError("Choose a project for this task.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        status,
        priority,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
        reporter_id: currentUserId,
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssigneeId("");
    router.push(`/projects/${projectId}?task=${data.id}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add task
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="New task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-project">Project</Label>
            <Select id="task-project" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.length === 0 && <option value="">No projects yet</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {projectLabel(p)}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick which project or sub-project this task belongs to by its key.
            </p>
          </div>

          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          </div>
          <div>
            <Label htmlFor="task-desc">Description</Label>
            <Textarea id="task-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more detail…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-status">Status</Label>
              <Select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !projectId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create task
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
