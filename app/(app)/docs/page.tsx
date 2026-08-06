import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default async function DocsIndexPage() {
  const supabase = createClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, updated_at, project_id, projects(name, key, color)")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Specs, decisions and runbooks from every project, in one searchable flow.
        </p>
      </div>

      {!docs || docs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">No documentation yet</p>
          <p className="text-sm text-muted-foreground">
            Open a project and add a document from its Docs tab.
          </p>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {docs.map((d: any) => (
            <Link
              key={d.id}
              href={`/projects/${d.project_id}/docs/${d.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: d.projects?.color || "#153a67" }}
                >
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{d.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.projects?.key} · {d.projects?.name}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(d.updated_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
