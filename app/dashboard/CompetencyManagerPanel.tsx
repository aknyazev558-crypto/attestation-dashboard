"use client";

import { useState, useTransition } from "react";
import { addCompetency, deleteCompetency, updateCompetency } from "./actions";
import { BLOCKS, BLOCK_ORDER, DEPARTMENTS, DEPARTMENT_ORDER } from "@/lib/competencies";
import type { CompetencyWithDepartments } from "@/lib/competencies";

export default function CompetencyManagerPanel({
  competencies,
}: {
  competencies: CompetencyWithDepartments[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [block, setBlock] = useState("");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (departmentIds.length === 0) {
      setError("Отметьте хотя бы один блок компетенций.");
      return;
    }
    const fd = new FormData();
    fd.set("name", name);
    fd.set("block", block);
    departmentIds.forEach((id) => fd.append("departmentIds", id));
    startTransition(async () => {
      const result = await addCompetency(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setName("");
      setBlock("");
      setDepartmentIds([]);
      setOpen(false);
    });
  }

  function handleRename(comp: CompetencyWithDepartments) {
    const next = window.prompt("Название компетенции:", comp.name);
    if (!next || !next.trim() || next.trim() === comp.name) return;
    saveRow(comp.id, next.trim(), comp.block, comp.department_ids);
  }

  function toggleRowDepartment(comp: CompetencyWithDepartments, id: string) {
    const next = comp.department_ids.includes(id)
      ? comp.department_ids.filter((d) => d !== id)
      : [...comp.department_ids, id];
    saveRow(comp.id, comp.name, comp.block, next);
  }

  function handleBlockChange(comp: CompetencyWithDepartments, value: string) {
    saveRow(comp.id, comp.name, value, comp.department_ids);
  }

  function saveRow(id: string, name: string, block: string | null, departmentIds: string[]) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("name", name);
    fd.set("block", block || "");
    departmentIds.forEach((d) => fd.append("departmentIds", d));
    startTransition(() => {
      updateCompetency(fd);
    });
  }

  function handleDelete(comp: CompetencyWithDepartments) {
    const ok = window.confirm(
      `Удалить компетенцию «${comp.name}»? Её оценки за все кварталы пропадут из истории.`
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", comp.id);
    startTransition(() => {
      deleteCompetency(fd);
    });
  }

  return (
    <div className="sheet" style={{ marginBottom: 18 }}>
      <div className="section-title" style={{ margin: "12px 16px 8px" }}>
        <h2>Компетенции</h2>
      </div>
      <div className="field-note" style={{ margin: "0 16px 8px" }}>
        Распределение всех компетенций по блокам (Продажи, ППО, HR, Маркетинг, КЦ, CQ, FinDep — можно
        отметить сразу несколько) и по весовым блокам итоговой оценки (Бизнес-результат и т.д.).
        Компетенция без весового блока («—») не попадает в итоговый балл и не отображается в листе
        аттестации, пока вы её не назначите.
      </div>

      {competencies.length > 0 && (
        <div className="sheet-scroll">
          <table>
            <thead>
              <tr>
                <th>Компетенция</th>
                <th>Весовой блок (итог)</th>
                <th>Блоки компетенций</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {competencies.map((c) => (
                <tr key={c.id}>
                  <td className="compname">
                    {c.name}{" "}
                    <button className="btn ghost small" onClick={() => handleRename(c)} disabled={isPending}>
                      Изменить
                    </button>
                    {c.is_custom && <span className="badge none"> добавлено сотрудником</span>}
                  </td>
                  <td>
                    <select
                      value={c.block || ""}
                      disabled={isPending}
                      onChange={(e) => handleBlockChange(c, e.target.value)}
                    >
                      <option value="">— не в итоге —</option>
                      {BLOCK_ORDER.map((id) => (
                        <option key={id} value={id}>
                          {BLOCKS[id].name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {DEPARTMENT_ORDER.map((id) => (
                        <label
                          key={id}
                          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5 }}
                        >
                          <input
                            type="checkbox"
                            checked={c.department_ids.includes(id)}
                            disabled={isPending}
                            onChange={() => toggleRowDepartment(c, id)}
                          />
                          {DEPARTMENTS[id].name}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="btn danger small" onClick={() => handleDelete(c)} disabled={isPending}>
                      Удалить
                    </button>
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
            <label className="field-note">Весовой блок (итоговая оценка)</label>
            <select value={block} onChange={(e) => setBlock(e.target.value)}>
              <option value="">— не в итоге —</option>
              {BLOCK_ORDER.map((id) => (
                <option key={id} value={id}>
                  {BLOCKS[id].name}
                </option>
              ))}
            </select>
            <label className="field-note">Блоки компетенций (можно несколько)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DEPARTMENT_ORDER.map((id) => (
                <label key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={departmentIds.includes(id)}
                    onChange={() =>
                      setDepartmentIds((prev) =>
                        prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
                      )
                    }
                  />
                  {DEPARTMENTS[id].name}
                </label>
              ))}
            </div>
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
