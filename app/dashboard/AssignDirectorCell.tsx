"use client";

import { useState, useTransition } from "react";
import { assignDirector } from "./actions";

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AssignDirectorCell({
  branchId,
  directorName,
}: {
  branchId: string;
  directorName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [manual, setManual] = useState(false);
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
    setManual(false);
    setPassword("");
    setError(null);
    setSavedPassword(null);
  }

  if (savedPassword) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
        <div className="field-note">
          Пароль для <b>{savedPassword.email}</b> — сообщите его директору сами (по телефону,
          в мессенджере и т.п.), письмо не отправлялось:
        </div>
        <code style={{ userSelect: "all" }}>{savedPassword.password}</code>
        <button className="btn small" onClick={reset}>
          Готово
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div>
        {directorName ? (
          directorName
        ) : (
          <span className="dirname empty">Директор не назначен</span>
        )}{" "}
        <button
          className="btn ghost small"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
        >
          {directorName ? "Изменить" : "Назначить"}
        </button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("fullName", fullName);
    fd.set("branchId", branchId);
    if (manual) fd.set("password", password);
    startTransition(async () => {
      const result = await assignDirector(fd);
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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
      <input
        type="email"
        placeholder="Email директора"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="ФИО"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
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
  );
}
