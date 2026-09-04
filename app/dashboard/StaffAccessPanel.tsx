"use client";

import { useState, useTransition } from "react";
import { assignStaff, removeStaff, updateStaffAccess } from "./actions";
import { DEPARTMENTS, DEPARTMENT_ORDER } from "@/lib/competencies";
import type { Profile } from "@/lib/types";

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function EditStaffRow({
  staffMember,
  email,
  blockIds: initialBlockIds,
  onDone,
}: {
  staffMember: Profile;
  email: string;
  blockIds: string[];
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState(staffMember.full_name || "");
  const [position, setPosition] = useState(staffMember.position || "");
  const [blockIds, setBlockIds] = useState<string[]>(initialBlockIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleBlock(id: string) {
    setBlockIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  function handleSave() {
    setError(null);
    const fd = new FormData();
    fd.set("userId", staffMember.id);
    fd.set("fullName", fullName);
    fd.set("position", position);
    blockIds.forEach((id) => fd.append("blockIds", id));
    startTransition(async () => {
      const result = await updateStaffAccess(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <tr>
      <td>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ФИО" />
      </td>
      <td>
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Должность"
        />
      </td>
      <td className="brands">{email}</td>
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {DEPARTMENT_ORDER.map((id) => (
            <label key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={blockIds.includes(id)}
                onChange={() => toggleBlock(id)}
              />
              {DEPARTMENTS[id].name}
            </label>
          ))}
        </div>
        {error && <div className="error-note">{error}</div>}
      </td>
      <td style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <button className="btn small primary" onClick={handleSave} disabled={isPending}>
          {isPending ? "Сохранение…" : "Сохранить"}
        </button>
        <button className="btn ghost small" onClick={onDone} disabled={isPending}>
          Отмена
        </button>
      </td>
    </tr>
  );
}

export default function StaffAccessPanel({
  staff,
  staffEmails,
  staffBlocks,
}: {
  staff: Profile[];
  staffEmails: Record<string, string>;
  staffBlocks: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [blockIds, setBlockIds] = useState<string[]>([]);
  const [manual, setManual] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<{ email: string; password: string } | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setEmail("");
    setFullName("");
    setPosition("");
    setBlockIds([]);
    setManual(true);
    setPassword("");
    setError(null);
    setSavedPassword(null);
  }

  function toggleBlock(id: string) {
    setBlockIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("fullName", fullName);
    fd.set("position", position);
    blockIds.forEach((id) => fd.append("blockIds", id));
    if (manual) fd.set("password", password);
    startTransition(async () => {
      const result = await assignStaff(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (manual) {
        setSavedPassword({ email, password });
      } else {
        reset();
      }
    });
  }

  function handleRemove(userId: string, name: string) {
    const ok = window.confirm(`Удалить сотрудника «${name}»? Доступ в приложение будет закрыт.`);
    if (!ok) return;
    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(() => {
      removeStaff(fd);
    });
  }

  return (
    <div className="sheet" style={{ marginBottom: 18 }}>
      <div className="section-title" style={{ margin: "12px 16px 8px" }}>
        <h2>Сотрудники</h2>
      </div>

      {staff.length > 0 && (
        <div className="sheet-scroll">
          <table>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Должность</th>
                <th>Email</th>
                <th>Доступ к блокам компетенций</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) =>
                editingId === s.id ? (
                  <EditStaffRow
                    key={s.id}
                    staffMember={s}
                    email={staffEmails[s.id] || "—"}
                    blockIds={staffBlocks[s.id] || []}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={s.id}>
                    <td>{s.full_name || "—"}</td>
                    <td>{s.position || "—"}</td>
                    <td className="brands">{staffEmails[s.id] || "—"}</td>
                    <td>
                      {(staffBlocks[s.id] || []).length
                        ? (staffBlocks[s.id] || [])
                            .map((id) => DEPARTMENTS[id]?.name || id)
                            .join(", ")
                        : "нет доступа"}
                    </td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn ghost small"
                        onClick={() => setEditingId(s.id)}
                        disabled={isPending}
                      >
                        Изменить
                      </button>
                      <button
                        className="btn danger small"
                        onClick={() => handleRemove(s.id, s.full_name || staffEmails[s.id] || "")}
                        disabled={isPending}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: 12 }}>
        {savedPassword ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="field-note">
              Пароль для <b>{savedPassword.email}</b> — сообщите его лично, письмо не
              отправлялось. При первом входе будет предложено сменить пароль:
            </div>
            <code style={{ userSelect: "all" }}>{savedPassword.password}</code>
            <button className="btn small" onClick={reset}>
              Готово
            </button>
          </div>
        ) : !open ? (
          <button className="btn small" onClick={() => setOpen(true)}>
            + Добавить сотрудника
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 380 }}
          >
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="ФИО"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              placeholder="Должность"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />

            <div className="field-note" style={{ marginTop: 4 }}>
              Доступ к блокам компетенций (для оценки директоров и добавления
              новых компетенций в свой блок):
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DEPARTMENT_ORDER.map((id) => (
                <label
                  key={id}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                >
                  <input
                    type="checkbox"
                    checked={blockIds.includes(id)}
                    onChange={() => toggleBlock(id)}
                  />
                  {DEPARTMENTS[id].name}
                </label>
              ))}
            </div>

            <label
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginTop: 4 }}
            >
              <input
                type="checkbox"
                checked={manual}
                onChange={(e) => {
                  setManual(e.target.checked);
                  if (e.target.checked && !password) setPassword(randomPassword());
                }}
              />
              Задать пароль вручную (без письма)
            </label>
            {manual && (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  placeholder="Пароль"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={() => setPassword(randomPassword())}
                >
                  Сгенерировать
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn small primary" type="submit" disabled={isPending}>
                {isPending ? "Сохранение…" : manual ? "Сохранить пароль" : "Пригласить по email"}
              </button>
              <button className="btn ghost small" type="button" onClick={reset} disabled={isPending}>
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
