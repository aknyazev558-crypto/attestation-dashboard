"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // The invite/reset link puts the session in the URL hash — the
    // browser client parses it on load (detectSessionInUrl) and turns it
    // into a real cookie-backed session, which getSession() then reflects.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setInvalid(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setReady(true);
        setInvalid(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (invalid) {
    return (
      <div className="gate">
        <h1>Ссылка недействительна</h1>
        <div className="gate-note">
          Ссылка для установки пароля устарела или уже использована. Попросите
          владельца сети отправить приглашение ещё раз.
        </div>
      </div>
    );
  }

  if (!ready) {
    return <div className="loading">Загрузка…</div>;
  }

  return (
    <div className="gate">
      <h1>Аттестация директоров ДЦ</h1>
      <p className="lead">Придумайте пароль, чтобы войти в приложение.</p>

      <form className="gate-card" onSubmit={handleSubmit}>
        <h2>Новый пароль</h2>
        <div className="field">
          <label htmlFor="password">Пароль</label>
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
          {saving ? "Сохраняем…" : "Сохранить и войти →"}
        </button>
        {error && <div className="error-note">{error}</div>}
      </form>
    </div>
  );
}
