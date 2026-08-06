import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DocEditor } from "@/components/docs/doc-editor";

export default async function DocPage({ params }: { params: { id: string; docId: string } }) {
  const supabase = createClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", params.docId).single();

  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/projects/${params.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>
      <DocEditor projectId={params.id} doc={doc} />
    </div>
  );
}
