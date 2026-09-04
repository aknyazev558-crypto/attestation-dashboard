import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/app/components/Topbar";
import BranchDetailClient from "./BranchDetailClient";
import { isOwnerLevel } from "@/lib/types";
import type { Cycle } from "@/lib/types";

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

  let staffBlockIds: string[] = [];
  if (isStaff) {
    const { data: access } = await supabase
      .from("staff_block_access")
      .select("block_id")
      .eq("user_id", user.id);
    staffBlockIds = (access || []).map((a) => a.block_id);
  }

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
          isOwner={isOwner}
          isCeo={isCeo}
          isStaff={isStaff}
          staffBlockIds={staffBlockIds}
          isOwnDirector={isOwnDirector}
          directorFullName={isOwnDirector ? profile.full_name : null}
        />
      </div>
    </>
  );
}
