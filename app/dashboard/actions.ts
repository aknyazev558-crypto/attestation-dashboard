"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "owner" ? user : null;
}

export async function assignDirector(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") || "").trim();
  const branchId = String(formData.get("branchId") || "");

  if (!email || !branchId) {
    return { error: "Укажите email и филиал." };
  }

  // Server Actions are callable directly (not just from the button that
  // triggers them), so the owner check can't live only in the UI.
  const owner = await requireOwner();
  if (!owner) {
    return { error: "Только владелец сети может назначать директоров." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "На сервере не настроен SUPABASE_SERVICE_ROLE_KEY — назначение директоров через приложение недоступно.",
    };
  }

  const admin = createAdminClient();

  let targetId: string | null = null;
  const { data: existingList, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    return { error: listError.message };
  }
  const existingUser = existingList.users.find(
    (u) => (u.email || "").toLowerCase() === email
  );

  if (existingUser) {
    targetId = existingUser.id;
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email
    );
    if (inviteError || !invited?.user) {
      return { error: inviteError?.message || "Не удалось пригласить пользователя." };
    }
    targetId = invited.user.id;
  }

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: targetId,
    full_name: fullName || null,
    role: "director",
    branch_id: branchId,
  });
  if (upsertError) {
    return { error: upsertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/branch/${branchId}`);
  return { ok: true };
}
