"use client";

import { useState, useTransition } from "react";
import { assignAdmin } from "./actions";
import type { Profile } from "@/lib/types";

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const ROLE_LABEL: Record<string, string> = { owner: "Руководитель сети", ceo: "CEO" };

export default function AdminUsersPanel({
  admins,
  adminEmails,
}: {
  admins: Profile[];
  adminEmails: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "ceo">("ceo");
  const [manual, setManual] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<{ email: string; password: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setEmail("");
    setFullName("");
    setRole("ceo");
    setManual(true);
    setPassword("");
    setError(null);
    setSavedPassword(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("fullName", fullName);
    fd.set("role", role);
    if (manual) fd.set("password", password);
    startTransition(async () => {
      const result = await assignAdmin(fd);
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

  return (
    <div className="sheet" style={{ marginBottom: 18 }}>
      <div className="section-title" style={{ margin: "12px 16px 8px" }}>
        <h2>Пользователи с полным доступом</h2>
      </div>

      {admins.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Роль</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name || "—"}</td>
                <td>{adminEmails[a.id] || "—"}</td>
                <td>{ROLE_LABEL[a.role] || a.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            + Добавить владельца / CEO
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 340 }}
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
            <select value={role} onChange={(e) => setRole(e.target.value as "owner" | "ceo")}>
              <option value="ceo">CEO</option>
              <option value="owner">Руководитель сети</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
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
