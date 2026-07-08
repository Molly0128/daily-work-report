export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/PasswordForm";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

const displayName = (p?: Pick<Profile, "full_name" | "email"> | null) => p?.full_name || p?.email || "未命名成員";

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("id, full_name, email, role, active, created_at").eq("id", user.id).single<Profile>();

  return <main className="container grid">
    <header className="header">
      <div><h1>帳號設定</h1><p className="muted">查看個人資料並更新登入密碼。</p></div>
      <nav className="stack"><a className="button secondary" href="/dashboard">回儀表板</a>{profile?.role === "admin" || profile?.role === "instructor" ? <a className="button secondary" href="/people">人員管理</a> : null}</nav>
    </header>
    <section className="card grid">
      <h2>個人資料</h2>
      <div className="grid grid-3"><label>姓名<input value={displayName(profile)} readOnly /></label><label>Email<input value={profile?.email ?? user.email ?? ""} readOnly /></label><label>角色<input value={profile?.role ?? "member"} readOnly /></label></div>
    </section>
    <PasswordForm />
  </main>;
}
