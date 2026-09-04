"use client";

import { useState, useTransition } from "react";
import { addCompetency, deleteCompetency, updateCompetency } from "./actions";
import { BLOCKS, BLOCK_ORDER, DEPARTMENTS, DEPARTMENT_ORDER } from "@/lib/competencies";
import type { Competency } from "@/lib/types";

export default function CompetencyManagerPanel({ competencies }: { competencies: Competency[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [block, setBlock] = useState("");
  const [departmentId, setDepartmentId] = useState(DEPARTMENT_ORDER[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("block", block);
    fd.set("departmentId", departmentId);
    startTransition(async () => {
      const result = await addCompetency(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setName("");
      setBlock("");
      setOpen(false);
    });
  }

  function handleRename(comp: Competency) {
    const next = window.prompt("Название компетенции:", comp.name);
    if (!next || !next.trim() || next.trim() === comp.name) return;
    const fd = new FormData();
    fd.set("id", comp.id);
    fd.set("name", next.trim());
    fd.set("block", comp.block || "");
    fd.set("departmentId", comp.department_id || "");
    startTransition(() => {
      updateCompetency(fd);
    });
  }

  function handleFieldChange(comp: Competency, field: "block" | "departmentId", value: string) {
    const fd = new FormData();
    fd.set("id", comp.id);
    fd.set("name", comp.name);
    fd.set("block", field === "block" ? value : comp.block || "");
    fd.set("departmentId", field === "departmentId" ? value : comp.department_id || "");
    startTransition(() => {
      updateCompetency(fd);
    });
  }

  function handleDelete(comp: Competency) {
    const ok = window.confirm(`Удалить компетенцию «${comp.name}»? Её оценки за все кварталы пропадут из истории.`);
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
        Распределение всех компетенций по блокам (Продажи, ППО, HR, Маркетинг, КЦ, CQ, FinDep) и по
        весовым блокам итоговой оценки (Бизнес-результат и т.д.). Компетенция без весового блока
        («—») не попадает в итоговый балл и не отображается в листе аттестации, пока вы её не
        назначите.
      </div>

      {competencies.length > 0 && (
        <div className="sheet-scroll">
          <table>
            <thead>
              <tr>
                <th>Компетенция</th>
                <th>Весовой блок (итог)</th>
                <th>Блок компетенций</th>
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
                      onChange={(e) => handleFieldChange(c, "block", e.target.value)}
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
                    <select
                      value={c.department_id || ""}
                      disabled={isPending}
                      onChange={(e) => handleFieldChange(c, "departmentId", e.target.value)}
                    >
                      <option value="">— не назначен —</option>
                      {DEPARTMENT_ORDER.map((id) => (
                        <option key={id} value={id}>
                          {DEPARTMENTS[id].name}
                        </option>
                      ))}
                    </select>
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
            <label className="field-note">Блок компетенций</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {DEPARTMENT_ORDER.map((id) => (
                <option key={id} value={id}>
                  {DEPARTMENTS[id].name}
                </option>
              ))}
            </select>
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
