"use client";

import { useState, useTransition } from "react";
import { addCompetency } from "./actions";
import { BLOCKS, DEPARTMENTS } from "@/lib/competencies";
import type { CompetencyWithDepartments } from "@/lib/competencies";

export default function StaffCompetencyPanel({
  competencies,
  departmentIds,
}: {
  competencies: CompetencyWithDepartments[];
  departmentIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(departmentIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (departmentIds.length === 0) return null;

  const own = competencies.filter((c) => c.department_ids.some((id) => departmentIds.includes(id)));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedDepartments.length === 0) {
      setError("Отметьте хотя бы один блок.");
      return;
    }
    const fd = new FormData();
    fd.set("name", name);
    selectedDepartments.forEach((id) => fd.append("departmentIds", id));
    startTransition(async () => {
      const result = await addCompetency(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setName("");
      setOpen(false);
    });
  }

  return (
    <div className="sheet" style={{ marginBottom: 18 }}>
      <div className="section-title" style={{ margin: "12px 16px 8px" }}>
        <h2>Компетенции моего блока</h2>
      </div>
      <div className="field-note" style={{ margin: "0 16px 8px" }}>
        Вы можете добавлять новые компетенции для самооценки директоров в свой блок:{" "}
        {departmentIds.map((id) => DEPARTMENTS[id]?.name || id).join(", ")}. Новая компетенция
        появится в листе аттестации после того, как владелец сети или CEO включит её в итоговую
        оценку.
      </div>

      {own.length > 0 && (
        <div className="sheet-scroll">
          <table>
            <thead>
              <tr>
                <th>Компетенция</th>
                <th>Блоки</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {own.map((c) => (
                <tr key={c.id}>
                  <td className="compname">{c.name}</td>
                  <td>{c.department_ids.map((id) => DEPARTMENTS[id]?.name || id).join(", ") || "—"}</td>
                  <td>
                    {c.block ? (
                      <span className="badge ok">учитывается в «{BLOCKS[c.block]?.name}»</span>
                    ) : (
                      <span className="badge none">ожидает подтверждения</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: 12 }}>
        {!open ? (
          <button className="btn small" onClick={() => setOpen(true)}>
            + Добавить компетенцию
          </button>
        ) : (
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 380 }}>
            <input
              placeholder="Название компетенции"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {departmentIds.length > 1 && (
              <>
                <div className="field-note">Блоки (можно несколько из ваших доступных)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {departmentIds.map((id) => (
                    <label key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(id)}
                        onChange={() =>
                          setSelectedDepartments((prev) =>
                            prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
                          )
                        }
                      />
                      {DEPARTMENTS[id]?.name || id}
                    </label>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn small primary" type="submit" disabled={isPending}>
                {isPending ? "Сохранение…" : "Добавить"}
              </button>
              <button className="btn ghost small" type="button" onClick={() => setOpen(false)} disabled={isPending}>
                Отмена
              </button>
            </div>
            {error && <div className="error-note">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
