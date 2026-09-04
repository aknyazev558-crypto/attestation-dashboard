import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/app/components/Topbar";
import DashboardClient from "./DashboardClient";
import type { Attestation, Branch, Cycle, IprItem } from "@/lib/types";

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

  if (!profile || profile.role !== "owner") {
    redirect("/");
  }

  const [{ data: branches }, { data: cycles }, { data: directors }, { data: iprItems }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("cycles").select("*").order("label"),
      supabase.from("profiles").select("branch_id, full_name").eq("role", "director"),
      supabase.from("ipr_items").select("*"),
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

  return (
    <>
      <Topbar roleLabel="Руководитель сети" />
      <div className="wrap">
        <DashboardClient
          branches={(branches as Branch[]) || []}
          cycles={cycleList}
          currentCycle={currentCycle}
          attestations={attestations}
          iprItems={(iprItems as IprItem[]) || []}
          directorNames={directorNames}
        />
      </div>
    </>
  );
}
