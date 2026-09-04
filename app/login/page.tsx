"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  "no-profile":
    "Для этого аккаунта не найден профиль в таблице profiles. Обратитесь к владельцу сети.",
  "no-branch":
    "Профиль директора не привязан к филиалу (branch_id пуст). Обратитесь к владельцу сети.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_MESSAGES[urlError] || null : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Неверный email или пароль.");
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
      <p className="lead">Войдите, чтобы продолжить.</p>

      <form className="gate-card" onSubmit={handleSubmit}>
        <h2>Вход</h2>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Входим…" : "Войти →"}
        </button>
        {error && <div className="error-note">{error}</div>}
      </form>

      <div className="gate-note">
        Доступ выдаёт владелец сети через Supabase (Authentication → Invite
        user), затем привязывает роль и филиал в таблице profiles. Директор
        видит только свой филиал — это гарантируется правилами Row Level
        Security на стороне базы данных, а не настройками интерфейса.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading">Загрузка…</div>}>
      <LoginForm />
    </Suspense>
  );
}
