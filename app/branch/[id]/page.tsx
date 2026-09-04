import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/app/components/Topbar";
import BranchDetailClient from "./BranchDetailClient";
import { isOwnerLevel } from "@/lib/types";
import type { Competency, CompetencyDepartment, Cycle, ScoringBlock } from "@/lib/types";
import { attachDepartments } from "@/lib/competencies";
import type { StaffMember } from "@/lib/competencies";

export default async function BranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, branch_id, full_name, position")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=no-profile");

  const isOwner = isOwnerLevel(profile.role);
  const isCeo = profile.role === "ceo";
  const isStaff = profile.role === "staff";
  const isOwnDirector = profile.role === "director" && profile.branch_id === id;

  if (!isOwner && !isStaff && !isOwnDirector) {
    return (
      <>
        <Topbar roleLabel="Директор" />
        <div className="wrap">
          <div className="empty-state">
            У вас нет доступа к этому филиалу. Вы можете видеть только свой
            филиал — это ограничение проверяется на уровне базы данных
            (Row Level Security), а не только в интерфейсе.
          </div>
        </div>
      </>
    );
  }

  const [{ data: staffProfiles }, { data: blockAccess }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "staff"),
    supabase.from("staff_block_access").select("*"),
  ]);

  const departmentsByStaff: Record<string, string[]> = {};
  (blockAccess || []).forEach((row) => {
    const list = departmentsByStaff[row.user_id] || [];
    list.push(row.block_id);
    departmentsByStaff[row.user_id] = list;
  });

  // Only staff who actually have some department access get a column —
  // an added-but-not-yet-granted staff member wouldn't be able to score
  // anything anyway.
  const staffList: StaffMember[] = (staffProfiles || [])
    .map((p) => ({ id: p.id, full_name: p.full_name, departmentIds: departmentsByStaff[p.id] || [] }))
    .filter((s) => s.departmentIds.length > 0);

  const { data: branch } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .single();

  if (!branch) notFound();

  const { data: cycles } = await supabase
    .from("cycles")
    .select("*")
    .order("label");

  const { data: competencies } = await supabase
    .from("competencies")
    .select("*")
    .order("sort_order");

  const { data: competencyDepartments } = await supabase
    .from("competency_departments")
    .select("*");

  const { data: scoringBlocks } = await supabase
    .from("scoring_blocks")
    .select("*")
    .order("sort_order");

  const cycleList = (cycles as Cycle[]) || [];
  const currentCycle = cycleList.find((c) => c.is_current)?.label || null;

  const roleLabel = isCeo
    ? "CEO"
    : isOwner
    ? "Руководитель сети"
    : isStaff
    ? profile.position || "Сотрудник"
    : `Директор — ${branch.name}`;

  return (
    <>
      <Topbar roleLabel={roleLabel} />
      <div className="wrap">
        <BranchDetailClient
          branch={branch}
          cycles={cycleList}
          currentCycle={currentCycle}
          competencies={attachDepartments(
            (competencies as Competency[]) || [],
            (competencyDepartments as CompetencyDepartment[]) || []
          )}
          scoringBlocks={(scoringBlocks as ScoringBlock[]) || []}
          staffList={staffList}
          viewerId={user.id}
          isOwner={isOwner}
          isCeo={isCeo}
          isStaff={isStaff}
          isOwnDirector={isOwnDirector}
          directorFullName={isOwnDirector ? profile.full_name : null}
        />
      </div>
    </>
  );
}
