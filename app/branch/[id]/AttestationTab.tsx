"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BLOCKS,
  BLOCK_ORDER,
  COMPETENCIES,
  computeResult,
  nextQuarterLabel,
} from "@/lib/competencies";
import type { Attestation, Cycle } from "@/lib/types";
import { createCycle } from "@/app/dashboard/actions";

function blankRecord(branchId: string, cycle: string): Attestation {
  return {
    id: "",
    branch_id: branchId,
    cycle,
    self_scores: {},
    manager_scores: {},
    self_submitted: false,
    achievement_1: "",
    achievement_2: "",
    achievement_3: "",
    growth_areas: "",
    discussion: "",
    decision: "",
    ceo_comment: "",
    next_date: null,
    updated_at: "",
  };
}

export default function AttestationTab({
  branchId,
  cycles,
  currentCycle,
  isOwner,
  isCeo,
  staffBlockIds,
  isOwnDirector,
}: {
  branchId: string;
  cycles: Cycle[];
  currentCycle: string | null;
  isOwner: boolean;
  isCeo: boolean;
  staffBlockIds: string[];
  isOwnDirector: boolean;
}) {
  const [selectedCycle, setSelectedCycle] = useState<string | null>(currentCycle);
  const [record, setRecord] = useState<Attestation | null>(null);
  const [loadedCycle, setLoadedCycle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loading = selectedCycle != null && loadedCycle !== selectedCycle;
  const supabase = createClient();

  useEffect(() => {
    if (!selectedCycle) return;
    let cancelled = false;
    supabase
      .from("attestations")
      .select("*")
      .eq("branch_id", branchId)
      .eq("cycle", selectedCycle)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRecord((data as Attestation) || blankRecord(branchId, selectedCycle));
        setLoadedCycle(selectedCycle);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, selectedCycle]);

  const isCurrentCycle = selectedCycle === currentCycle;
  const mgrEditable = isOwner && isCurrentCycle;
  const ceoEditable = isCeo && isCurrentCycle;
  const canEditBlock = (blockId: string) =>
    isCurrentCycle && (isOwner || staffBlockIds.includes(blockId));

  async function saveRecord(patch: Partial<Attestation>) {
    if (!record || !selectedCycle) return false;
    const previous = record;
    const next = { ...record, ...patch };
    setRecord(next);
    setSaving(true);
    const { data, error } = await supabase
      .from("attestations")
      .upsert(
        {
          branch_id: branchId,
          cycle: selectedCycle,
          self_scores: next.self_scores,
          manager_scores: next.manager_scores,
          self_submitted: next.self_submitted,
          achievement_1: next.achievement_1,
          achievement_2: next.achievement_2,
          achievement_3: next.achievement_3,
          growth_areas: next.growth_areas,
          discussion: next.discussion,
          decision: next.decision,
          ceo_comment: next.ceo_comment,
          next_date: next.next_date,
        },
        { onConflict: "branch_id,cycle" }
      )
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      // Roll back the optimistic update — without this, a failed save
      // (network hiccup, RLS denial, a column the DB migration hasn't
      // added yet) would leave the screen showing "saved" state — e.g.
      // the self-assessment "submitted and locked" banner — that was
      // never actually written, with nothing on screen to say so.
      setRecord(previous);
      setSubmitError(
        "Не удалось сохранить: " + (error?.message || "неизвестная ошибка") + ". Попробуйте ещё раз."
      );
      return false;
    }
    setRecord(data as Attestation);
    return true;
  }

  function handleNewCycle() {
    const suggestion = nextQuarterLabel(currentCycle || "");
    const label = window.prompt(
      "Название нового квартала (например, " + suggestion + "):",
      suggestion
    );
    if (!label) return;
    const fd = new FormData();
    fd.set("label", label);
    startTransition(async () => {
      await createCycle(fd);
      window.location.reload();
    });
  }

  if (loading) {
    return <div className="loading">Загрузка…</div>;
  }

  const rec = record || blankRecord(branchId, selectedCycle || "");
  const result = computeResult(rec);
  const selfEditable = isOwnDirector && isCurrentCycle && !rec.self_submitted;

  async function submitSelfAssessment() {
    const missing =
      !(rec.achievement_1 || "").trim() ||
      !(rec.achievement_2 || "").trim() ||
      !(rec.achievement_3 || "").trim();
    if (missing) {
      setSubmitError("Заполните все три ключевых достижения перед отправкой самооценки.");
      return;
    }
    setSubmitError(null);
    await saveRecord({ self_submitted: true });
  }

  return (
    <div>
      <div className="cycle-ctrl" style={{ marginBottom: 14 }}>
        <span>Квартал:</span>
        <select
          className="cyc"
          value={selectedCycle || ""}
          onChange={(e) => setSelectedCycle(e.target.value || null)}
        >
          {cycles.length === 0 && <option value="">нет кварталов</option>}
          {cycles.map((c) => (
            <option key={c.label} value={c.label}>
              {c.label}
              {c.label === currentCycle ? " (активный)" : ""}
            </option>
          ))}
        </select>
        {isOwner && (
          <button className="btn small" onClick={handleNewCycle} disabled={isPending}>
            + Новый квартал
          </button>
        )}
        {saving && <span className="saving-hint">Сохранение…</span>}
      </div>

      {!selectedCycle ? (
        <div className="empty-state">
          Кварталы аттестации ещё не созданы.{" "}
          {isOwner ? "Создайте первый кнопкой выше." : ""}
        </div>
      ) : (
        <>
          {!isCurrentCycle && (
            <div className="locked-note">
              Это архивный квартал — только просмотр. Редактировать можно
              активный квартал: {currentCycle}.
            </div>
          )}

          {isCurrentCycle && rec.self_submitted && (
            <div className="locked-note">
              Самооценка за этот квартал отправлена директором и заблокирована
              для изменений.
              {(isOwner || isCeo) && (
                <>
                  {" "}
                  <button
                    className="btn ghost small"
                    onClick={() => {
                      setSubmitError(null);
                      saveRecord({ self_submitted: false });
                    }}
                  >
                    Разблокировать
                  </button>
                </>
              )}
            </div>
          )}

          {submitError && !selfEditable && (
            <div className="error-note">{submitError}</div>
          )}

          <div className="sheet">
            <div className="sheet-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Компетенция</th>
                    <th>Самооценка</th>
                    <th>Оценка руководителя</th>
                  </tr>
                </thead>
                <tbody>
                  {BLOCK_ORDER.map((bid) => (
                    <BlockRows
                      key={bid}
                      bid={bid}
                      rec={rec}
                      selfEditable={selfEditable}
                      mgrEditable={canEditBlock(bid)}
                      onSelfChange={(compId, v) =>
                        saveRecord({ self_scores: { ...rec.self_scores, [compId]: v } })
                      }
                      onMgrChange={(compId, v) =>
                        saveRecord({ manager_scores: { ...rec.manager_scores, [compId]: v } })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="result-box">
            <div className="result-score">
              {result.score != null ? result.score.toFixed(2) : "—"}
              <span className="of5"> / 5.0</span>
            </div>
            <span className={"badge " + result.tone}>{result.label}</span>
            <div className="result-note">
              Взвешенный балл считается по заполненным блокам (35% / 25% /
              20% / 20%). Оценка «1» в блоках «Бизнес-результат» или
              «Операционное управление» автоматически переводит в «Зону
              риска».
            </div>
          </div>

          <div className="field-block">
            <label>Ключевые достижения за квартал (минимум 3)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              <AchievementInput
                index={1}
                value={rec.achievement_1}
                editable={selfEditable}
                onSave={(v) => saveRecord({ achievement_1: v })}
              />
              <AchievementInput
                index={2}
                value={rec.achievement_2}
                editable={selfEditable}
                onSave={(v) => saveRecord({ achievement_2: v })}
              />
              <AchievementInput
                index={3}
                value={rec.achievement_3}
                editable={selfEditable}
                onSave={(v) => saveRecord({ achievement_3: v })}
              />
            </div>
          </div>

          {selfEditable && (
            <div style={{ marginTop: 10 }}>
              <button className="btn primary small" onClick={submitSelfAssessment}>
                Отправить самооценку
              </button>
              <div className="field-note">
                После отправки самооценка и достижения будут заблокированы для
                редактирования.
              </div>
              {submitError && <div className="error-note">{submitError}</div>}
            </div>
          )}

          <TextField
            label="Ключевые зоны роста"
            value={rec.growth_areas}
            editable={mgrEditable}
            onSave={(v) => saveRecord({ growth_areas: v })}
          />
          <TextField
            label="Обсуждение расхождений в оценках"
            value={rec.discussion}
            editable={mgrEditable}
            onSave={(v) => saveRecord({ discussion: v })}
          />
          <TextField
            label="Решение по итогам аттестации"
            value={rec.decision}
            editable={mgrEditable}
            onSave={(v) => saveRecord({ decision: v })}
          />
          <TextField
            label="Комментарий/рекомендации от CEO"
            value={rec.ceo_comment}
            editable={ceoEditable}
            onSave={(v) => saveRecord({ ceo_comment: v })}
          />

          <div className="field-block">
            <label>Дата следующей аттестации</label>
            <input
              type="date"
              defaultValue={rec.next_date || ""}
              disabled={!mgrEditable}
              onChange={(e) => saveRecord({ next_date: e.target.value || null })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function BlockRows({
  bid,
  rec,
  selfEditable,
  mgrEditable,
  onSelfChange,
  onMgrChange,
}: {
  bid: string;
  rec: Attestation;
  selfEditable: boolean;
  mgrEditable: boolean;
  onSelfChange: (compId: string, v: number | null) => void;
  onMgrChange: (compId: string, v: number | null) => void;
}) {
  const block = BLOCKS[bid];
  const comps = COMPETENCIES.filter((c) => c.block === bid);
  return (
    <>
      <tr className="block-hdr">
        <td colSpan={3}>
          {block.name} <span className="w">(вес {Math.round(block.weight * 100)}%)</span>
        </td>
      </tr>
      {comps.map((c) => (
        <tr key={c.id}>
          <td className="compname">{c.name}</td>
          <td className="center">
            <ScoreSelect
              value={rec.self_scores[c.id] ?? null}
              editable={selfEditable}
              onChange={(v) => onSelfChange(c.id, v)}
            />
          </td>
          <td className="center">
            <ScoreSelect
              value={rec.manager_scores[c.id] ?? null}
              editable={mgrEditable}
              onChange={(v) => onMgrChange(c.id, v)}
            />
          </td>
        </tr>
      ))}
    </>
  );
}

function ScoreSelect({
  value,
  editable,
  onChange,
}: {
  value: number | null;
  editable: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <select
      className="score"
      value={value == null ? "" : String(value)}
      disabled={!editable}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    >
      <option value="">—</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

function AchievementInput({
  index,
  value,
  editable,
  onSave,
}: {
  index: number;
  value: string | null;
  editable: boolean;
  onSave: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        className="badge none"
        style={{ flex: "none", width: 22, height: 22, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {index}
      </span>
      <input
        key={value ?? ""}
        className="ipr-input"
        style={{ border: "1px solid var(--line)", padding: "7px 9px" }}
        defaultValue={value || ""}
        disabled={!editable}
        placeholder={editable ? `Достижение ${index}` : "Не заполнено"}
        onBlur={(e) => {
          if (e.target.value !== (value || "")) onSave(e.target.value);
        }}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  editable,
  onSave,
}: {
  label: string;
  value: string | null;
  editable: boolean;
  onSave: (v: string) => void;
}) {
  return (
    <div className="field-block">
      <label>{label}</label>
      <textarea
        key={value ?? ""}
        defaultValue={value || ""}
        disabled={!editable}
        placeholder={editable ? "" : "Пока не заполнено"}
        onBlur={(e) => {
          if (e.target.value !== (value || "")) onSave(e.target.value);
        }}
      />
    </div>
  );
}
