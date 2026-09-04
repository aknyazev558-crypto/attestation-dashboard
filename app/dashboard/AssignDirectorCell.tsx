"use client";

import { useState, useTransition } from "react";
import { assignDirector } from "./actions";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    startTransition(async () => {
      const result = await assignDirector(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setEmail("");
      setFullName("");
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
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
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn small primary" type="submit" disabled={isPending}>
          {isPending ? "Сохранение…" : "Пригласить"}
        </button>
        <button
          className="btn ghost small"
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Отмена
        </button>
      </div>
      {error && <div className="error-note">{error}</div>}
    </form>
  );
}
