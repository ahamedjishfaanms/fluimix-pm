"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Eye, Loader2, Pencil, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Document } from "@/lib/types";

export function DocEditor({
  projectId,
  doc,
}: {
  projectId: string;
  doc: Document | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = React.useState(doc?.title || "");
  const [content, setContent] = React.useState(doc?.content || "");
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (doc) {
      const { error } = await supabase.from("documents").update({ title, content }).eq("id", doc.id);
      setSaving(false);
      if (error) return setError(error.message);
      router.refresh();
    } else {
      const { data, error } = await supabase
        .from("documents")
        .insert({ project_id: projectId, title, content, author_id: user!.id })
        .select()
        .single();
      setSaving(false);
      if (error) return setError(error.message);
      router.push(`/projects/${projectId}/docs/${data.id}`);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!doc) return;
    if (!confirm("Delete this document?")) return;
    await supabase.from("documents").delete().eq("id", doc.id);
    router.push(`/projects/${projectId}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        className="h-12 text-lg font-semibold"
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              mode === "edit" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              mode === "preview" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>
        <div className="flex gap-2">
          {doc && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {mode === "edit" ? (
        <div>
          <Label>Content (Markdown supported)</Label>
          <Textarea
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"## Overview\n\nDescribe the plan, decision, or process here…"}
            className="font-mono text-sm"
          />
        </div>
      ) : (
        <div className="prose-doc rounded-xl border border-border bg-card p-6">
          {content.trim() ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
