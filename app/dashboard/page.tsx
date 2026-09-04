import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Topbar from "@/app/components/Topbar";
import DashboardClient from "./DashboardClient";
import { isOwnerLevel } from "@/lib/types";
import type {
  Attestation,
  Branch,
  Competency,
  CompetencyDepartment,
  Cycle,
  IprItem,
  Profile,
  ScoringBlock,
} from "@/lib/types";
import { attachDepartments } from "@/lib/competencies";

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
    { data: competencies },
    { data: competencyDepartments },
    { data: scoringBlocks },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("cycles").select("*").order("label"),
    supabase.from("profiles").select("branch_id, full_name").eq("role", "director"),
    supabase.from("ipr_items").select("*"),
    supabase.from("profiles").select("*").in("role", ["owner", "ceo"]),
    supabase.from("profiles").select("*").eq("role", "staff"),
    supabase.from("staff_block_access").select("*"),
    supabase.from("competencies").select("*").order("sort_order"),
    supabase.from("competency_departments").select("*"),
    supabase.from("scoring_blocks").select("*").order("sort_order"),
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

  // RLS on staff_block_access lets a staff viewer read only their own
  // grants, so `blockAccess` above already came back scoped to them —
  // reuse it instead of an extra query.
  const viewerDepartmentIds = isStaffViewer
    ? (blockAccess || []).filter((row) => row.user_id === user.id).map((row) => row.block_id)
    : [];

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
          isStaffViewer={isStaffViewer}
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
          competencies={attachDepartments(
            (competencies as Competency[]) || [],
            (competencyDepartments as CompetencyDepartment[]) || []
          )}
          scoringBlocks={(scoringBlocks as ScoringBlock[]) || []}
          viewerDepartmentIds={viewerDepartmentIds}
        />
      </div>
    </>
  );
}
