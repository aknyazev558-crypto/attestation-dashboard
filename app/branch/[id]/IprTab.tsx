"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IPR_STATUSES } from "@/lib/types";
import type { IprItem, IprStatus } from "@/lib/types";

export default function IprTab({
  branchId,
  isOwner,
  isOwnDirector,
}: {
  branchId: string;
  isOwner: boolean;
  isOwnDirector: boolean;
}) {
  const [items, setItems] = useState<IprItem[] | null>(null);
  const [form, setForm] = useState({ zone: "", action: "", metric: "", curator: "" });
  const supabase = createClient();

  const canEditPlan = isOwner;
  const canEditProgress = isOwner || isOwnDirector;

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("ipr_items")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at")
      .then(({ data }) => {
        if (!cancelled) setItems((data as IprItem[]) || []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function updateItem(id: string, patch: Partial<IprItem>) {
    setItems((prev) => prev && prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from("ipr_items").update(patch).eq("id", id);
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev && prev.filter((i) => i.id !== id));
    await supabase.from("ipr_items").delete().eq("id", id);
  }

  async function addItem() {
    if (!form.zone.trim() && !form.action.trim()) return;
    const { data } = await supabase
      .from("ipr_items")
      .insert({
        branch_id: branchId,
        zone: form.zone.trim(),
        action: form.action.trim(),
        metric: form.metric.trim(),
        curator: form.curator.trim(),
        status: "Не начат",
      })
      .select()
      .single();
    if (data) setItems((prev) => [...(prev || []), data as IprItem]);
    setForm({ zone: "", action: "", metric: "", curator: "" });
  }

  if (items === null) {
    return <div className="loading">Загрузка…</div>;
  }

  return (
    <div className="sheet">
      {items.length === 0 ? (
        <div className="empty-state">
          Пунктов ИПР пока нет.{isOwner ? " Добавьте первый ниже." : ""}
        </div>
      ) : (
        <div className="sheet-scroll">
          <table>
            <thead>
              <tr>
                <th>Зона роста</th>
                <th>Действие</th>
                <th>Срок</th>
                <th>Метрика успеха</th>
                <th>Куратор</th>
                <th>Статус</th>
                <th>Заметка директора</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="ipr-input"
                      defaultValue={item.zone || ""}
                      disabled={!canEditPlan}
                      onBlur={(e) => updateItem(item.id, { zone: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ipr-input"
                      defaultValue={item.action || ""}
                      disabled={!canEditPlan}
                      onBlur={(e) => updateItem(item.id, { action: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ipr-input"
                      type="date"
                      defaultValue={item.deadline || ""}
                      disabled={!canEditPlan}
                      onChange={(e) => updateItem(item.id, { deadline: e.target.value || null })}
                    />
                  </td>
                  <td>
                    <input
                      className="ipr-input"
                      defaultValue={item.metric || ""}
                      disabled={!canEditPlan}
                      onBlur={(e) => updateItem(item.id, { metric: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ipr-input"
                      defaultValue={item.curator || ""}
                      disabled={!canEditPlan}
                      onBlur={(e) => updateItem(item.id, { curator: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="status"
                      value={item.status}
                      disabled={!canEditProgress}
                      onChange={(e) =>
                        updateItem(item.id, { status: e.target.value as IprStatus })
                      }
                    >
                      {IPR_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="ipr-input"
                      defaultValue={item.note || ""}
                      placeholder="Комментарий о ходе выполнения"
                      disabled={!canEditProgress}
                      onBlur={(e) => updateItem(item.id, { note: e.target.value })}
                    />
                  </td>
                  {isOwner && (
                    <td>
                      <button className="btn danger small" onClick={() => deleteItem(item.id)}>
                        Удалить
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOwner && (
        <div className="ipr-add">
          <div className="add-row-form">
            <input
              placeholder="Зона роста"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
            />
            <input
              placeholder="Действие"
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
            />
            <input
              placeholder="Метрика успеха"
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
            />
            <input
              placeholder="Куратор"
              value={form.curator}
              onChange={(e) => setForm({ ...form, curator: e.target.value })}
            />
            <button className="btn small" onClick={addItem}>
              + Добавить пункт ИПР
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
