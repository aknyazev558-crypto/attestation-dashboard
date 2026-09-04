"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Topbar({
  roleLabel,
}: {
  roleLabel: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="topbar">
      <div className="wrap">
        <div className="topbar-row">
          <div className="brand">
            <h1>Аттестация директоров ДЦ</h1>
          </div>
          <div className="who">
            <b>{roleLabel}</b>
            <button className="btn ghost small" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
