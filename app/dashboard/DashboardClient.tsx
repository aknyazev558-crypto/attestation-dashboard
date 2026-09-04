"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeResult, nextQuarterLabel } from "@/lib/competencies";
import type { Attestation, Branch, Cycle, IprItem, Profile } from "@/lib/types";
import { addBranch, createCycle, deleteBranch, setCurrentCycle } from "./actions";
import AssignDirectorCell from "./AssignDirectorCell";
import BranchNameCell from "./BranchNameCell";
import AdminUsersPanel from "./AdminUsersPanel";

export default function DashboardClient({
  branches,
  cycles,
  currentCycle,
  attestations,
  iprItems,
  directorNames,
  admins,
  adminEmails,
}: {
  branches: Branch[];
  cycles: Cycle[];
  currentCycle: string | null;
  attestations: Attestation[];
  iprItems: IprItem[];
  directorNames: Record<string, string>;
  admins: Profile[];
  adminEmails: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Returning here via the browser's back/forward button can restore a
  // frozen bfcache snapshot instead of asking the server for anything —
  // so a director's submission that happened while this tab sat in
  // history can look invisible (stale status dot) until something forces
  // a refetch. Only fires for that specific case (event.persisted).
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  const attByBranch = new Map(attestations.map((a) => [a.branch_id, a]));
  const iprByBranch = new Map<string, IprItem[]>();
  iprItems.forEach((item) => {
    const list = iprByBranch.get(item.branch_id) || [];
    list.push(item);
    iprByBranch.set(item.branch_id, list);
  });

  const results = branches.map((b) => ({
    branch: b,
    rec: attByBranch.get(b.id) || null,
    result: computeResult(attByBranch.get(b.id)),
  }));

  const risky = results.filter((r) => r.result.tone === "warn" || r.result.tone === "crit").length;
  const noData = results.filter((r) => r.result.tone === "none").length;
  let iprOpen = 0;
  let iprTotal = 0;
  branches.forEach((b) => {
    const items = iprByBranch.get(b.id) || [];
    iprTotal += items.length;
    iprOpen += items.filter((i) => i.status !== "Выполнено").length;
  });

  function handleCycleChange(label: string) {
    const fd = new FormData();
    fd.set("label", label);
    startTransition(() => {
      setCurrentCycle(fd);
    });
  }

  function handleNewCycle() {
    const suggestion = nextQuarterLabel(currentCycle || "");
    const label = window.prompt("Название нового квартала (например, " + suggestion + "):", suggestion);
    if (!label) return;
    const fd = new FormData();
    fd.set("label", label);
    startTransition(() => {
      createCycle(fd);
    });
  }

  function handleDeleteBranch(branch: Branch) {
    const ok = window.confirm(
      `Удалить филиал «${branch.name}»?\n\nВся история аттестаций и пункты ИПР этого филиала будут удалены безвозвратно. Назначенный директор не удаляется — просто отвязывается от филиала.`
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("branchId", branch.id);
    startTransition(() => {
      deleteBranch(fd);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Link href="/dashboard/activity" className="btn ghost small">
          Активность входов →
        </Link>
      </div>

      <AdminUsersPanel admins={admins} adminEmails={adminEmails} />

      <div className="stats">
        <div className="stat">
          <div className="num">{branches.length}</div>
          <div className="lbl">Филиалов в программе</div>
        </div>
        <div className="stat">
          <div className={"num" + (risky > 0 ? " crit" : "")}>{risky}</div>
          <div className="lbl">В зоне риска / не соответствуют</div>
        </div>
        <div className="stat">
          <div className={"num" + (noData > 0 ? " warn" : "")}>{noData}</div>
          <div className="lbl">Без оценки за {currentCycle || "—"}</div>
        </div>
        <div className="stat">
          <div className="num">
            {iprOpen} / {iprTotal}
          </div>
          <div className="lbl">Открытых пунктов ИПР</div>
        </div>
      </div>

      <div className="section-title">
        <h2>Все филиалы — {currentCycle || "нет активного квартала"}</h2>
        <div className="cycle-ctrl">
          <span>Активный квартал:</span>
          {cycles.length > 0 && (
            <select
              className="cyc"
              value={currentCycle || ""}
              disabled={isPending}
              onChange={(e) => handleCycleChange(e.target.value)}
            >
              {cycles.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <button className="btn small" onClick={handleNewCycle} disabled={isPending}>
            + Новый квартал
          </button>
        </div>
      </div>

      <div className="sheet">
        {branches.length === 0 ? (
          <div className="empty-state">Филиалов пока нет. Добавьте первый ниже.</div>
        ) : (
          <div className="sheet-scroll">
            <table>
              <thead>
                <tr>
                  <th>Филиал</th>
                  <th>Директор</th>
                  <th>Бренды</th>
                  <th>Итог за квартал</th>
                  <th>След. аттестация</th>
                  <th>ИПР</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const items = iprByBranch.get(r.branch.id) || [];
                  const done = items.filter((i) => i.status === "Выполнено").length;
                  const director = directorNames[r.branch.id];
                  return (
                    <tr className="hoverable" key={r.branch.id}>
                      <td className="dirname">
                        <BranchNameCell branch={r.branch} />
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {director && (
                            <span
                              className={"status-dot " + (r.rec?.self_submitted ? "ok" : "crit")}
                              title={
                                r.rec?.self_submitted
                                  ? "Самооценка за квартал отправлена"
                                  : "Самооценка за квартал ещё не отправлена"
                              }
                            />
                          )}
                          <AssignDirectorCell branchId={r.branch.id} directorName={director} />
                        </div>
                      </td>
                      <td className="brands">{(r.branch.brands || []).join(", ")}</td>
                      <td>
                        <span
                          className={"badge " + r.result.tone}
                          title={r.result.score != null ? "Балл: " + r.result.score.toFixed(2) : undefined}
                        >
                          {r.result.category
                            ? r.result.category.replace(" (критичная компетенция = 1)", " ⚠")
                            : "Нет данных"}
                        </span>
                      </td>
                      <td>{r.rec?.next_date || "—"}</td>
                      <td>{items.length ? `${done} / ${items.length}` : "—"}</td>
                      <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Link className="link-open" href={`/branch/${r.branch.id}`}>
                          Открыть →
                        </Link>
                        <button
                          className="btn danger small"
                          onClick={() => handleDeleteBranch(r.branch)}
                          disabled={isPending}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form
          className="add-row-form"
          action={(formData) => {
            startTransition(() => {
              addBranch(formData);
            });
          }}
        >
          <input name="name" placeholder="Название нового филиала" required />
          <input name="brands" placeholder="Бренды через запятую" />
          <button className="btn small" type="submit" disabled={isPending}>
            + Добавить филиал
          </button>
        </form>
      </div>
    </div>
  );
}
