"use client";

import * as React from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/card";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/types";
import type { Task, TaskStatus, TaskPriority, Profile, TaskComment } from "@/lib/types";

export function TaskDialog({
  open,
  onClose,
  task,
  defaultStatus,
  projectId,
  currentUserId,
  profiles,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  defaultStatus: TaskStatus;
  projectId: string;
  currentUserId: string;
  profiles: Profile[];
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const isEdit = !!task;

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [comments, setComments] = React.useState<TaskComment[]>([]);
  const [newComment, setNewComment] = React.useState("");

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date || "");
      setAssigneeId(task.assignee_id || "");
      loadComments(task.id);
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("medium");
      setDueDate("");
      setAssigneeId("");
      setComments([]);
    }
    setError(null);
  }, [task, defaultStatus, open]);

  async function loadComments(taskId: string) {
    const { data } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at");
    setComments(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isEdit && task) {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title,
          description: description || null,
          status,
          priority,
          due_date: dueDate || null,
          assignee_id: assigneeId || null,
        })
        .eq("id", task.id)
        .select()
        .single();
      setLoading(false);
      if (error) return setError(error.message);
      onUpdated(data);
    } else {
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
      if (error) return setError(error.message);
      onCreated(data);
    }
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm("Delete this task? This cannot be undone.")) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    onDeleted(task.id);
    onClose();
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    const { data } = await supabase
      .from("task_comments")
      .insert({ task_id: task.id, author_id: currentUserId, body: newComment.trim() })
      .select()
      .single();
    if (data) setComments((prev) => [...prev, data]);
    setNewComment("");
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit task" : "New task"} className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more detail…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="assignee">Assignee</Label>
            <Select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
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

        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && (
              <Button type="button" variant="ghost" onClick={handleDelete} className="text-danger hover:bg-danger/10">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </form>

      {isEdit && (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Comments</h3>
          <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            {comments.map((c) => {
              const author = profiles.find((p) => p.id === c.author_id);
              return (
                <div key={c.id} className="flex gap-2">
                  <Avatar size="xs" name={author?.full_name} email={author?.email || ""} src={author?.avatar_url} />
                  <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{author?.full_name || author?.email}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button type="button" size="icon" variant="outline" onClick={handleAddComment} aria-label="Send comment">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
