import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DocEditor } from "@/components/docs/doc-editor";

export default function NewDocPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/projects/${params.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>
      <DocEditor projectId={params.id} doc={null} />
    </div>
  );
}
