"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { Project, ProjectStatus } from "@/lib/types";

const COLORS = ["#153a67", "#c9932a", "#1f9d64", "#d64545", "#5b8dd6", "#7e57c2"];

export function EditProjectDialog({ project }: { project: Project }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = React.useState(false);

  const [name, setName] = React.useState(project.name);
  const [key, setKey] = React.useState(project.key);
  const [description, setDescription] = React.useState(project.description || "");
  const [status, setStatus] = React.useState<ProjectStatus>(project.status);
  const [dueDate, setDueDate] = React.useState(project.due_date || "");
  const [color, setColor] = React.useState(project.color);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error } = await supabase
      .from("projects")
      .update({
        name,
        key,
        description: description || null,
        status,
        due_date: dueDate || null,
        color,
      })
      .eq("id", project.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    const warning = project.parent_id
      ? "Delete this sub-project and all of its tasks and documents? This cannot be undone."
      : "Delete this project, all its sub-projects, tasks and documents? This cannot be undone.";
    if (!confirm(warning)) return;

    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    setDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    router.push(project.parent_id ? `/projects/${project.parent_id}` : "/projects");
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Edit project">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-key">Key</Label>
              <Input id="edit-key" required maxLength={6} value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label htmlFor="edit-due">Due date</Label>
              <Input id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-status">Status</Label>
            <Select id="edit-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full"
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-danger hover:bg-danger/10"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete project
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
