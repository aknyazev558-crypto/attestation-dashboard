"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="gate">
      <div className="brand" style={{ marginBottom: 6 }}>
        <span className="brand-mark" aria-hidden="true" />
        <h1>Аттестация директоров ДЦ</h1>
      </div>
      <p className="lead">
        Пароль вам выдал владелец сети — из соображений безопасности его нужно
        сменить перед началом работы.
      </p>

      <form className="gate-card" onSubmit={handleSubmit}>
        <h2>Новый пароль</h2>
        <div className="field">
          <label htmlFor="password">Новый пароль</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm">Повторите пароль</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить и продолжить →"}
        </button>
        {error && <div className="error-note">{error}</div>}
      </form>
    </div>
  );
}
