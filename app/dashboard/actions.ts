"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addBranch(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const brandsRaw = String(formData.get("brands") || "");
  if (!name) return;

  const brands = brandsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = await createClient();
  await supabase.from("branches").insert({ name, brands });
  revalidatePath("/dashboard");
}

export async function createCycle(formData: FormData) {
  const label = String(formData.get("label") || "").trim();
  if (!label) return;

  const supabase = await createClient();
  await supabase.from("cycles").update({ is_current: false }).eq("is_current", true);
  await supabase
    .from("cycles")
    .upsert({ label, is_current: true }, { onConflict: "label" });
  revalidatePath("/dashboard");
  revalidatePath("/branch", "layout");
}

export async function setCurrentCycle(formData: FormData) {
  const label = String(formData.get("label") || "").trim();
  if (!label) return;

  const supabase = await createClient();
  await supabase.from("cycles").update({ is_current: false }).eq("is_current", true);
  await supabase.from("cycles").update({ is_current: true }).eq("label", label);
  revalidatePath("/dashboard");
  revalidatePath("/branch", "layout");
}
