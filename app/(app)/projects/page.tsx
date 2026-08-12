import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/card";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { GlobalNewTaskDialog } from "@/components/tasks/global-new-task-dialog";
import { ImportExcelDialog } from "@/components/projects/import-excel-dialog";
import { FolderKanban, ChevronRight } from "lucide-react";
import { formatDueDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const supabase = createClient();

  const [{ data: mainProjects }, { data: allProjects }, { data: profiles }, { data: subProjects }] = await Promise.all([
    supabase.from("projects").select("*").is("parent_id", null).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name, key, parent_id").order("key"),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("projects").select("id, parent_id"),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subCounts = (subProjects || []).reduce<Record<string, number>>((acc, p) => {
    if (p.parent_id) acc[p.parent_id] = (acc[p.parent_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Main programs and their sub-projects, all in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportExcelDialog currentUserId={user!.id} />
          <GlobalNewTaskDialog projects={allProjects || []} profiles={profiles || []} currentUserId={user!.id} />
          <NewProjectDialog />
        </div>
      </div>

      {!mainProjects || mainProjects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <FolderKanban className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground">Create your first main project to get started.</p>
          </div>
          <NewProjectDialog />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mainProjects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="group h-full p-5 transition-shadow hover:shadow-panel">
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    <FolderKanban className="h-5 w-5" />
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {p.description || "No description yet."}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{p.key}</Badge>
                  <Badge variant={p.status === "active" ? "success" : "default"}>
                    {p.status.replace("_", " ")}
                  </Badge>
                  {subCounts[p.id] && <Badge variant="accent">{subCounts[p.id]} sub-projects</Badge>}
                  {p.due_date && <Badge variant="outline">Due {formatDueDate(p.due_date)}</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
