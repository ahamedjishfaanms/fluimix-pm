import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectView } from "@/components/projects/project-view";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: project }, { data: parent }, { data: subProjects }, { data: tasks }, { data: profiles }, { data: docs }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", params.id).single(),
      supabase.from("projects").select("id, name, parent_id").eq("id", params.id).single(),
      supabase.from("projects").select("*").eq("parent_id", params.id).order("created_at"),
      supabase.from("tasks").select("*").eq("project_id", params.id).order("position"),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("documents").select("id, title, updated_at").eq("project_id", params.id).order("updated_at", { ascending: false }),
    ]);

  if (!project) notFound();

  let parentProject = null;
  if (project.parent_id) {
    const { data } = await supabase.from("projects").select("id, name").eq("id", project.parent_id).single();
    parentProject = data;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProjectView
      project={project}
      parentProject={parentProject}
      subProjects={subProjects || []}
      initialTasks={tasks || []}
      profiles={profiles || []}
      docs={docs || []}
      currentUserId={user!.id}
    />
  );
}
