"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Download, Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadImportTemplate, parseImportFile, type ParsedProjectRow, type ParsedTaskRow } from "@/lib/excel-import";

interface ImportSummary {
  projectsCreated: number;
  projectsSkipped: string[];
  tasksCreated: number;
  tasksSkipped: string[];
  parseErrors: string[];
}

export function ImportExcelDialog({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setSummary(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setImporting(true);
    setSummary(null);

    try {
      const { projects, tasks, errors: parseErrors } = await parseImportFile(file);
      const result = await importData(projects, tasks);
      setSummary({ ...result, parseErrors });
      router.refresh();
    } catch (err: any) {
      setSummary({
        projectsCreated: 0,
        projectsSkipped: [],
        tasksCreated: 0,
        tasksSkipped: [],
        parseErrors: [`Could not read this file: ${err?.message || "unknown error"}. Make sure it's a .xlsx file exported from the template.`],
      });
    } finally {
      setImporting(false);
    }
  }

  async function importData(projectRows: ParsedProjectRow[], taskRows: ParsedTaskRow[]) {
    const projectsSkipped: string[] = [];
    const tasksSkipped: string[] = [];
    let projectsCreated = 0;
    let tasksCreated = 0;

    // Existing state to resolve keys / emails against
    const { data: existingProjects } = await supabase.from("projects").select("id, key");
    const { data: existingProfiles } = await supabase.from("profiles").select("id, email");

    const keyToId = new Map<string, string>();
    (existingProjects || []).forEach((p) => keyToId.set(p.key.toUpperCase(), p.id));
    const emailToId = new Map<string, string>();
    (existingProfiles || []).forEach((p) => emailToId.set(p.email.toLowerCase(), p.id));

    // Create projects in passes so sub-projects can resolve parents created earlier in the same file
    let remaining = [...projectRows];
    let progress = true;
    while (remaining.length > 0 && progress) {
      progress = false;
      const stillRemaining: ParsedProjectRow[] = [];

      for (const row of remaining) {
        if (keyToId.has(row.key)) {
          projectsSkipped.push(`Row ${row.rowNumber}: key "${row.key}" already exists — skipped.`);
          continue;
        }

        if (row.type === "sub") {
          if (!row.parentKey) {
            projectsSkipped.push(`Row ${row.rowNumber}: sub-project "${row.key}" has no Parent Key.`);
            continue;
          }
          const parentId = keyToId.get(row.parentKey);
          if (!parentId) {
            // parent not resolved yet — try again next pass
            stillRemaining.push(row);
            continue;
          }
          const { data, error } = await supabase
            .from("projects")
            .insert({
              name: row.name,
              key: row.key,
              description: row.description,
              status: row.status,
              due_date: row.dueDate,
              color: row.color || "#153a67",
              parent_id: parentId,
              owner_id: currentUserId,
            })
            .select()
            .single();
          if (error) {
            projectsSkipped.push(`Row ${row.rowNumber}: ${error.message}`);
            continue;
          }
          keyToId.set(row.key, data.id);
          await supabase.from("project_members").insert({ project_id: data.id, user_id: currentUserId });
          projectsCreated++;
          progress = true;
        } else {
          const { data, error } = await supabase
            .from("projects")
            .insert({
              name: row.name,
              key: row.key,
              description: row.description,
              status: row.status,
              due_date: row.dueDate,
              color: row.color || "#153a67",
              parent_id: null,
              owner_id: currentUserId,
            })
            .select()
            .single();
          if (error) {
            projectsSkipped.push(`Row ${row.rowNumber}: ${error.message}`);
            continue;
          }
          keyToId.set(row.key, data.id);
          await supabase.from("project_members").insert({ project_id: data.id, user_id: currentUserId });
          projectsCreated++;
          progress = true;
        }
      }
      remaining = stillRemaining;
    }
    remaining.forEach((row) =>
      projectsSkipped.push(`Row ${row.rowNumber}: could not resolve parent key "${row.parentKey}" for "${row.key}".`)
    );

    // Create tasks, resolving project key + assignee email
    for (const row of taskRows) {
      const projectId = keyToId.get(row.projectKey);
      if (!projectId) {
        tasksSkipped.push(`Row ${row.rowNumber}: unknown Project Key "${row.projectKey}".`);
        continue;
      }
      const assigneeId = row.assigneeEmail ? emailToId.get(row.assigneeEmail) || null : null;
      if (row.assigneeEmail && !assigneeId) {
        tasksSkipped.push(`Row ${row.rowNumber}: "${row.assigneeEmail}" hasn't signed up yet — task created unassigned.`);
      }

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        due_date: row.dueDate,
        assignee_id: assigneeId,
        reporter_id: currentUserId,
      });
      if (error) {
        tasksSkipped.push(`Row ${row.rowNumber}: ${error.message}`);
        continue;
      }
      tasksCreated++;
    }

    return { projectsCreated, projectsSkipped, tasksCreated, tasksSkipped };
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="h-4 w-4" />
        Import from Excel
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Import projects & tasks from Excel"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-border bg-surface-muted/60 p-4">
            <p className="text-sm font-medium text-foreground">1. Get the template</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Download the spreadsheet, fill in the <strong>Projects</strong> and <strong>Tasks</strong> sheets, then
              upload it below.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => downloadImportTemplate()}>
              <Download className="h-4 w-4" />
              Download template (.xlsx)
            </Button>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-sm font-medium text-foreground">2. Upload your filled-in file</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects are created first, then tasks are matched to them by Project Key.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Importing…" : "Choose file"}
              </Button>
              {fileName && !importing && <span className="text-xs text-muted-foreground">{fileName}</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </div>

          {summary && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {summary.parseErrors.length === 0 && summary.projectsSkipped.length === 0 && summary.tasksSkipped.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                )}
                Import finished
              </div>
              <p className="text-sm text-muted-foreground">
                {summary.projectsCreated} project{summary.projectsCreated === 1 ? "" : "s"} created,{" "}
                {summary.tasksCreated} task{summary.tasksCreated === 1 ? "" : "s"} created.
              </p>

              {(summary.parseErrors.length > 0 || summary.projectsSkipped.length > 0 || summary.tasksSkipped.length > 0) && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-muted p-2.5">
                  {[...summary.parseErrors, ...summary.projectsSkipped, ...summary.tasksSkipped].map((msg, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {msg}
                    </p>
                  ))}
                </div>
              )}

              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Import another file
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
