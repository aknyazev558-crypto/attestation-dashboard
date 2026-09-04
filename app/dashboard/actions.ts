"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { isOwnerLevel } from "@/lib/types";
import type { Role } from "@/lib/types";
import { BLOCK_ORDER, DEPARTMENT_ORDER } from "@/lib/competencies";

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

export async function renameBranch(formData: FormData) {
  const branchId = String(formData.get("branchId") || "");
  const name = String(formData.get("name") || "").trim();
  const brandsRaw = String(formData.get("brands") || "");
  if (!branchId || !name) {
    return { error: "Укажите название филиала." };
  }

  const brands = brandsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({ name, brands })
    .eq("id", branchId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/branch/${branchId}`);
  return { ok: true };
}

export async function deleteBranch(formData: FormData) {
  const branchId = String(formData.get("branchId") || "");
  if (!branchId) {
    return { error: "Филиал не указан." };
  }

  // Explicit gate rather than relying on RLS alone: with RLS blocking a
  // non-owner-level caller, these calls would just silently affect 0 rows
  // and this action would report success without actually doing anything.
  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может удалять филиалы." };
  }

  const supabase = await createClient();

  // Branches has no ON DELETE CASCADE from attestations/ipr_items/profiles,
  // so clear those out first — otherwise the delete below fails on a
  // foreign key violation. Directors keep their account, just lose the
  // branch link; attestation/ИПР history for the branch is gone for good.
  await supabase.from("profiles").update({ branch_id: null }).eq("branch_id", branchId);
  await supabase.from("ipr_items").delete().eq("branch_id", branchId);
  await supabase.from("attestations").delete().eq("branch_id", branchId);

  const { error } = await supabase.from("branches").delete().eq("id", branchId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
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

async function requireOwnerLevel() {
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
  return isOwnerLevel(profile?.role) ? user : null;
}

type ProvisionResult = { id: string; error?: undefined } | { id?: undefined; error: string };

/**
 * Finds-or-invites-or-creates the auth user for `email`. With a manual
 * `password` it bypasses email entirely (createUser/updateUserById,
 * tagged must_change_password) — used when invite-link delivery has
 * proven unreliable (rate limits, corporate mail scanners). Without one
 * it sends a normal Supabase invite to `redirectPath`.
 */
async function provisionUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
  redirectPath: string
): Promise<ProvisionResult> {
  if (password) {
    const { data: existingList, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) return { error: listError.message };
    const existingUser = existingList.users.find(
      (u) => (u.email || "").toLowerCase() === email
    );

    if (existingUser) {
      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true, user_metadata: { must_change_password: true } }
      );
      if (updateError || !updated?.user) {
        return { error: updateError?.message || "Не удалось задать пароль." };
      }
      return { id: updated.user.id };
    }
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });
    if (createError || !created?.user) {
      return { error: createError?.message || "Не удалось создать пользователя." };
    }
    return { id: created.user.id };
  }

  // Email invite: for a brand-new email this creates the user and sends
  // the invite; for an email invited before but never confirmed, Supabase
  // is supposed to resend a fresh link. It only fails outright once the
  // account is already confirmed — in that case we look them up and just
  // reassign, no email expected.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getSiteUrl()}${redirectPath}`,
  });

  if (invited?.user) return { id: invited.user.id };

  const { data: existingList, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) return { error: listError.message };
  const existingUser = existingList.users.find(
    (u) => (u.email || "").toLowerCase() === email
  );
  if (!existingUser) {
    return { error: inviteError?.message || "Не удалось пригласить пользователя." };
  }

  if (!existingUser.email_confirmed_at) {
    // Still pending, never set a password — the invite call above failed
    // for some other reason (most commonly Supabase's built-in email
    // sender rate limit, a few emails/hour on the free tier). Surface
    // that instead of quietly reassigning with no email sent.
    return {
      error:
        (inviteError?.message ? `Письмо не отправлено: ${inviteError.message}. ` : "Письмо не отправлено. ") +
        "Часто причина — лимит писем встроенного email-сервиса Supabase (несколько писем в час на бесплатном плане). Подождите немного и попробуйте ещё раз, либо подключите свой SMTP (Supabase → Authentication → Emails → SMTP Settings), либо задайте пароль вручную ниже.",
    };
  }
  return { id: existingUser.id };
}

export async function assignDirector(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") || "").trim();
  const branchId = String(formData.get("branchId") || "");
  const password = String(formData.get("password") || "").trim();

  if (!email || !branchId) {
    return { error: "Укажите email и филиал." };
  }
  if (password && password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов." };
  }

  // Server Actions are callable directly (not just from the button that
  // triggers them), so the owner-level check can't live only in the UI.
  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может назначать директоров." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "На сервере не настроен SUPABASE_SERVICE_ROLE_KEY — назначение директоров через приложение недоступно.",
    };
  }

  const admin = createAdminClient();
  const result = await provisionUser(admin, email, password, "/auth/set-password");
  if (!result.id) {
    return { error: result.error || "Не удалось создать пользователя." };
  }

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: result.id,
    full_name: fullName || null,
    role: "director",
    branch_id: branchId,
  });
  if (upsertError) {
    return { error: upsertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/branch/${branchId}`);
  return { ok: true, passwordSet: !!password };
}

export async function assignAdmin(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") || "").trim();
  const role = String(formData.get("role") || "") as Role;
  const password = String(formData.get("password") || "").trim();

  if (!email || (role !== "owner" && role !== "ceo")) {
    return { error: "Укажите email и роль (владелец или CEO)." };
  }
  if (password && password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов." };
  }

  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может добавлять таких пользователей." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "На сервере не настроен SUPABASE_SERVICE_ROLE_KEY — добавление пользователей через приложение недоступно.",
    };
  }

  const admin = createAdminClient();
  const result = await provisionUser(admin, email, password, "/auth/set-password");
  if (!result.id) {
    return { error: result.error || "Не удалось создать пользователя." };
  }

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: result.id,
    full_name: fullName || null,
    role,
    branch_id: null,
  });
  if (upsertError) {
    return { error: upsertError.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, passwordSet: !!password };
}

export async function assignStaff(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") || "").trim();
  const position = String(formData.get("position") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const blockIds = formData.getAll("blockIds").map((v) => String(v));

  if (!email) {
    return { error: "Укажите email." };
  }
  if (password && password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов." };
  }

  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может добавлять сотрудников." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "На сервере не настроен SUPABASE_SERVICE_ROLE_KEY — добавление сотрудников через приложение недоступно.",
    };
  }

  const admin = createAdminClient();
  const result = await provisionUser(admin, email, password, "/auth/set-password");
  if (!result.id) {
    return { error: result.error || "Не удалось создать пользователя." };
  }

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: result.id,
    full_name: fullName || null,
    role: "staff",
    branch_id: null,
    position: position || null,
  });
  if (upsertError) {
    return { error: upsertError.message };
  }

  // Replace this person's block grants wholesale with whatever was checked.
  await admin.from("staff_block_access").delete().eq("user_id", result.id);
  if (blockIds.length) {
    const { error: accessError } = await admin
      .from("staff_block_access")
      .insert(blockIds.map((block_id) => ({ user_id: result.id!, block_id })));
    if (accessError) {
      return { error: accessError.message };
    }
  }

  revalidatePath("/dashboard");
  return { ok: true, passwordSet: !!password };
}

export async function removeStaff(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  if (!userId) {
    return { error: "Сотрудник не указан." };
  }

  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может удалять сотрудников." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
    .eq("role", "staff");
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Owner/CEO add any competency straight into any department/scoring block.
 * A staff member can also add one, but only within a department they've
 * been granted (checked here and, redundantly, by RLS) — it's always
 * created with no scoring block (`block: null`), i.e. not yet counted in
 * the weighted total, until owner/CEO assign one from the manager panel.
 */
export async function addCompetency(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const departmentId = String(formData.get("departmentId") || "").trim();
  const blockRaw = String(formData.get("block") || "").trim();

  if (!name || !departmentId || !DEPARTMENT_ORDER.includes(departmentId)) {
    return { error: "Укажите название компетенции и блок." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const owner = isOwnerLevel(profile?.role);
  const staffMember = profile?.role === "staff";
  if (!owner && !staffMember) {
    return { error: "Недостаточно прав для добавления компетенций." };
  }

  if (staffMember) {
    const { data: access } = await supabase
      .from("staff_block_access")
      .select("block_id")
      .eq("user_id", user.id)
      .eq("block_id", departmentId)
      .maybeSingle();
    if (!access) {
      return { error: "У вас нет доступа к этому блоку компетенций." };
    }
  }

  const { error } = await supabase.from("competencies").insert({
    name,
    department_id: departmentId,
    block: owner && BLOCK_ORDER.includes(blockRaw) ? blockRaw : null,
    is_custom: true,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/branch", "layout");
  return { ok: true };
}

export async function updateCompetency(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const block = String(formData.get("block") || "").trim();
  const departmentId = String(formData.get("departmentId") || "").trim();
  if (!id || !name) {
    return { error: "Укажите название компетенции." };
  }

  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может изменять компетенции." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("competencies")
    .update({
      name,
      block: BLOCK_ORDER.includes(block) ? block : null,
      department_id: DEPARTMENT_ORDER.includes(departmentId) ? departmentId : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/branch", "layout");
  return { ok: true };
}

export async function deleteCompetency(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    return { error: "Компетенция не указана." };
  }

  const requester = await requireOwnerLevel();
  if (!requester) {
    return { error: "Только владелец сети или CEO может удалять компетенции." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("competencies").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/branch", "layout");
  return { ok: true };
}
