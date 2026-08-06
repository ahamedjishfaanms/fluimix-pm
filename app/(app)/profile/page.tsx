import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Keep your details up to date for the team.</p>
      </div>
      <ProfileForm profile={profile!} />
    </div>
  );
}
