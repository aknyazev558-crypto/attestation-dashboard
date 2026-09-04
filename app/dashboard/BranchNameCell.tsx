"use client";

import { useState, useTransition } from "react";
import { renameBranch } from "./actions";
import type { Branch } from "@/lib/types";

export default function BranchNameCell({ branch }: { branch: Branch }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(branch.name);
  const [brands, setBrands] = useState((branch.brands || []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div>
        {branch.name}{" "}
        <button
          className="btn ghost small"
          onClick={() => {
            setName(branch.name);
            setBrands((branch.brands || []).join(", "));
            setError(null);
            setOpen(true);
          }}
        >
          Изменить
        </button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("branchId", branch.id);
    fd.set("name", name);
    fd.set("brands", brands);
    startTransition(async () => {
      const result = await renameBranch(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
      <input
        placeholder="Название филиала"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Бренды через запятую"
        value={brands}
        onChange={(e) => setBrands(e.target.value)}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn small primary" type="submit" disabled={isPending}>
          {isPending ? "Сохранение…" : "Сохранить"}
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
