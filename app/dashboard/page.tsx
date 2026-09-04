import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Topbar from "@/app/components/Topbar";
import DashboardClient from "./DashboardClient";
import { isOwnerLevel } from "@/lib/types";
import type { Attestation, Branch, Cycle, IprItem, Profile } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isOwnerLevel(profile.role)) {
    redirect("/");
  }

  const [{ data: branches }, { data: cycles }, { data: directors }, { data: iprItems }, { data: admins }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("cycles").select("*").order("label"),
      supabase.from("profiles").select("branch_id, full_name").eq("role", "director"),
      supabase.from("ipr_items").select("*"),
      supabase.from("profiles").select("*").in("role", ["owner", "ceo"]),
    ]);

  const cycleList = (cycles as Cycle[]) || [];
  const currentCycle = cycleList.find((c) => c.is_current)?.label || null;

  let attestations: Attestation[] = [];
  if (currentCycle) {
    const { data } = await supabase
      .from("attestations")
      .select("*")
      .eq("cycle", currentCycle);
    attestations = (data as Attestation[]) || [];
  }

  const directorNames: Record<string, string> = {};
  (directors || []).forEach((d) => {
    if (d.branch_id && d.full_name) directorNames[d.branch_id] = d.full_name;
  });

  const adminEmails: Record<string, string> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && admins?.length) {
    const admin = createAdminClient();
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    (userList?.users || []).forEach((u) => {
      if (u.email) adminEmails[u.id] = u.email;
    });
  }

  const roleLabel = profile.role === "ceo" ? "CEO" : "Руководитель сети";

  return (
    <>
      <Topbar roleLabel={roleLabel} />
      <div className="wrap">
        <DashboardClient
          branches={(branches as Branch[]) || []}
          cycles={cycleList}
          currentCycle={currentCycle}
          attestations={attestations}
          iprItems={(iprItems as IprItem[]) || []}
          directorNames={directorNames}
          admins={(admins as Profile[]) || []}
          adminEmails={adminEmails}
        />
      </div>
    </>
  );
}
