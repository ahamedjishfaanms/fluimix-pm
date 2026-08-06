import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "@/components/tasks/tasks-client";

export default async function TasksPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tasks }, { data: profiles }, { data: projects }] = await Promise.all([
    supabase.from("tasks").select("*").eq("assignee_id", user!.id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("*"),
    supabase.from("projects").select("id, name"),
  ]);

  const projectNames = (projects || []).reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every task assigned to you, across every project.</p>
      </div>
      <TasksClient initialTasks={tasks || []} profiles={profiles || []} projectNames={projectNames} currentUserId={user!.id} />
    </div>
  );
}
