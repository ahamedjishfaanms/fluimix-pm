"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Avatar, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = React.useState(profile.full_name || "");
  const [title, setTitle] = React.useState(profile.title || "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url || "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await supabase
      .from("profiles")
      .update({ full_name: fullName, title, avatar_url: avatarUrl || null })
      .eq("id", profile.id);

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Avatar size="md" name={fullName} email={profile.email} src={avatarUrl} className="h-16 w-16 text-lg" />
        <div>
          <p className="font-semibold text-foreground">{fullName || profile.email}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <Badge variant="accent" className="mt-1">
            {profile.role === "admin" ? "Admin" : "Member"}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="title">Job title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Field Engineer" />
        </div>
        <div>
          <Label htmlFor="avatar">Avatar URL</Label>
          <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
          {saved && <span className="text-sm text-success">Saved</span>}
        </div>
      </form>
    </Card>
  );
}
