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
    .select("role, position")
    .eq("id", user.id)
    .single();

  const canManage = isOwnerLevel(profile?.role);
  const isStaffViewer = profile?.role === "staff";

  if (!profile || (!canManage && !isStaffViewer)) {
    redirect("/");
  }

  const [
    { data: branches },
    { data: cycles },
    { data: directors },
    { data: iprItems },
    { data: admins },
    { data: staff },
    { data: blockAccess },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("cycles").select("*").order("label"),
    supabase.from("profiles").select("branch_id, full_name").eq("role", "director"),
    supabase.from("ipr_items").select("*"),
    supabase.from("profiles").select("*").in("role", ["owner", "ceo"]),
    supabase.from("profiles").select("*").eq("role", "staff"),
    supabase.from("staff_block_access").select("*"),
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

  const staffBlocks: Record<string, string[]> = {};
  (blockAccess || []).forEach((row) => {
    const list = staffBlocks[row.user_id] || [];
    list.push(row.block_id);
    staffBlocks[row.user_id] = list;
  });

  const userEmails: Record<string, string> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && (admins?.length || staff?.length)) {
    const admin = createAdminClient();
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    (userList?.users || []).forEach((u) => {
      if (u.email) userEmails[u.id] = u.email;
    });
  }

  const roleLabel =
    profile.role === "ceo"
      ? "CEO"
      : profile.role === "staff"
      ? profile.position || "Сотрудник"
      : "Руководитель сети";

  return (
    <>
      <Topbar roleLabel={roleLabel} />
      <div className="wrap">
        <DashboardClient
          canManage={canManage}
          branches={(branches as Branch[]) || []}
          cycles={cycleList}
          currentCycle={currentCycle}
          attestations={attestations}
          iprItems={(iprItems as IprItem[]) || []}
          directorNames={directorNames}
          admins={(admins as Profile[]) || []}
          adminEmails={userEmails}
          staff={(staff as Profile[]) || []}
          staffEmails={userEmails}
          staffBlocks={staffBlocks}
        />
      </div>
    </>
  );
}
