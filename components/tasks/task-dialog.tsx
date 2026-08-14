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
  const [mentionedIds, setMentionedIds] = React.useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const commentInputRef = React.useRef<HTMLInputElement>(null);

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
    setMentionedIds([]);
    setMentionQuery(null);
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
    if (data) {
      setComments((prev) => [...prev, data]);
      const uniqueMentions = Array.from(new Set(mentionedIds)).filter((id) => id !== currentUserId);
      if (uniqueMentions.length > 0) {
        await supabase.from("comment_mentions").insert(uniqueMentions.map((user_id) => ({ comment_id: data.id, user_id })));
      }
    }
    setNewComment("");
    setMentionedIds([]);
    setMentionQuery(null);
  }

  function handleCommentChange(value: string) {
    setNewComment(value);
    const caret = commentInputRef.current?.selectionStart ?? value.length;
    const beforeCaret = value.slice(0, caret);
    const match = beforeCaret.match(/(?:^|\s)@([a-zA-Z][\w.-]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(person: Profile) {
    const value = newComment;
    const caret = commentInputRef.current?.selectionStart ?? value.length;
    const beforeCaret = value.slice(0, caret);
    const afterCaret = value.slice(caret);
    const replaced = beforeCaret.replace(/(?:^|\s)@([a-zA-Z][\w.-]*)$/, (m) => (m.startsWith(" ") ? " " : "") + `@${person.full_name || person.email.split("@")[0]} `);
    setNewComment(replaced + afterCaret);
    setMentionedIds((prev) => Array.from(new Set([...prev, person.id])));
    setMentionQuery(null);
    setTimeout(() => commentInputRef.current?.focus(), 0);
  }

  const mentionMatches = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return profiles
      .filter((p) => (p.full_name || p.email).toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, profiles]);

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
                        {new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="relative mt-3 flex gap-2">
            <Input
              ref={commentInputRef}
              value={newComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Write a comment… use @ to mention someone"
              onKeyDown={(e) => {
                if (e.key === "Enter" && mentionMatches.length === 0) {
                  e.preventDefault();
                  handleAddComment();
                }
                if (e.key === "Escape") setMentionQuery(null);
              }}
            />
            <Button type="button" size="icon" variant="outline" onClick={handleAddComment} aria-label="Send comment">
              <Send className="h-4 w-4" />
            </Button>

            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1.5 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
                {mentionMatches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectMention(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Avatar size="xs" name={p.full_name} email={p.email} src={p.avatar_url} />
                    <span className="truncate">
                      <span className="font-medium text-foreground">{p.full_name || p.email.split("@")[0]}</span>{" "}
                      <span className="text-xs text-muted-foreground">{p.email}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
