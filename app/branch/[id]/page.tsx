import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/app/components/Topbar";
import BranchDetailClient from "./BranchDetailClient";
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
    .select("role, branch_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=no-profile");

  const isOwner = profile.role === "owner";
  const isOwnDirector = profile.role === "director" && profile.branch_id === id;

  if (!isOwner && !isOwnDirector) {
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

  const roleLabel = isOwner
    ? "Руководитель сети"
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
          isOwnDirector={isOwnDirector}
          directorFullName={isOwnDirector ? profile.full_name : null}
        />
      </div>
    </>
  );
}
