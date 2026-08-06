"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const COLORS = ["#153a67", "#c9932a", "#1f9d64", "#d64545", "#5b8dd6", "#7e57c2"];

export function NewProjectDialog({
  parentId,
  trigger,
}: {
  parentId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [key, setKey] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!key || key === autoKey(name)) {
      setKey(autoKey(v));
    }
  }

  function autoKey(v: string) {
    return v
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 5);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        key: key || autoKey(name),
        description: description || null,
        due_date: dueDate || null,
        color,
        owner_id: user!.id,
        parent_id: parentId || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    await supabase.from("project_members").insert({ project_id: data.id, user_id: user!.id });

    setOpen(false);
    setName("");
    setKey("");
    setDescription("");
    setDueDate("");
    router.refresh();
    router.push(`/projects/${data.id}`);
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {parentId ? "New sub-project" : "New project"}
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={parentId ? "New sub-project" : "New main project"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Power Mix Rollout" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="key">Key</Label>
              <Input id="key" required maxLength={6} value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="PMR" />
            </div>
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full ring-offset-2 ring-offset-card"
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
