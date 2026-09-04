import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerLevel } from "@/lib/types";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, branch_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  if (isOwnerLevel(profile.role) || profile.role === "staff") {
    redirect("/dashboard");
  }

  if (profile.branch_id) {
    redirect(`/branch/${profile.branch_id}`);
  }

  redirect("/login?error=no-branch");
}
