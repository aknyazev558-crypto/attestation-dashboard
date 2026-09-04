import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Topbar from "@/app/components/Topbar";
import { isOwnerLevel } from "@/lib/types";
import type { Branch, LoginEvent, Profile } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  owner: "Руководитель сети",
  ceo: "CEO",
  director: "Директор",
};

export default async function ActivityPage() {
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

  const roleLabel = profile.role === "ceo" ? "CEO" : "Руководитель сети";

  const [{ data: events }, { data: profiles }, { data: branches }] = await Promise.all([
    supabase
      .from("login_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("profiles").select("*"),
    supabase.from("branches").select("*"),
  ]);

  const profileById = new Map((profiles as Profile[] | null || []).map((p) => [p.id, p]));
  const branchById = new Map((branches as Branch[] | null || []).map((b) => [b.id, b]));

  const emailById: Record<string, string> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    (userList?.users || []).forEach((u) => {
      if (u.email) emailById[u.id] = u.email;
    });
  }

  const rows = ((events as LoginEvent[] | null) || []).map((e) => {
    const p = profileById.get(e.user_id);
    const branch = p?.branch_id ? branchById.get(p.branch_id) : null;
    return {
      id: e.id,
      createdAt: e.created_at,
      fullName: p?.full_name || "—",
      email: emailById[e.user_id] || "—",
      role: p ? ROLE_LABEL[p.role] || p.role : "—",
      branchName: branch?.name || (p?.role === "director" ? "не назначен" : "—"),
    };
  });

  return (
    <>
      <Topbar roleLabel={roleLabel} />
      <div className="wrap">
        <Link
          href="/dashboard"
          className="btn ghost small"
          style={{ marginBottom: 10, display: "inline-block" }}
        >
          ← К обзору
        </Link>

        <div className="section-title">
          <h2>Активность входов</h2>
        </div>

        <div className="sheet">
          {rows.length === 0 ? (
            <div className="empty-state">
              Пока никто не входил в приложение с момента включения этого
              журнала — записи появляются с новых входов.
            </div>
          ) : (
            <div className="sheet-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Когда</th>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Филиал</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr className="hoverable" key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(r.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="dirname">{r.fullName}</td>
                      <td className="brands">{r.email}</td>
                      <td>{r.role}</td>
                      <td className="brands">{r.branchName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="field-note" style={{ marginTop: 10 }}>
          Показаны последние {rows.length} входов. Журнал ведётся с момента
          включения этой функции — более ранние входы в него не попали.
        </div>
      </div>
    </>
  );
}
