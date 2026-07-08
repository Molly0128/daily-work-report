export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { CreateMemberForm, PersonEditForm } from "@/components/CreateMemberForm";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

const displayName = (p: Pick<Profile, "full_name" | "email">) => p.full_name || p.email || "未命名成員";

export default async function PeoplePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: me } = await supabase.from("profiles").select("id, full_name, email, role, active, created_at").eq("id", user.id).single<Profile>();
  if (me?.role !== "admin" && me?.role !== "instructor") redirect("/dashboard");

  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active, created_at")
    .order("full_name", { ascending: true, nullsFirst: false })
    .order("email", { ascending: true })
    .returns<Profile[]>();

  return (
    <main className="container grid">
      <header className="header">
        <div><h1>人員管理</h1><p className="muted">instructor / admin 可以新增與維護人員帳號。</p></div>
        <nav className="stack"><a className="button secondary" href="/dashboard">回儀表板</a><a className="button secondary" href="/account">帳號設定</a></nav>
      </header>
      <CreateMemberForm />
      <section className="card grid">
        <h2>人員列表</h2>
        <div className="table-wrap"><table><thead><tr><th>顯示名稱</th><th>Email</th><th>角色</th><th>啟用</th><th>建立時間</th><th>編輯</th></tr></thead><tbody>{people?.length ? people.map((p) => <tr key={p.id}><td>{displayName(p)}</td><td>{p.email}</td><td><span className="badge">{p.role}</span></td><td>{p.active ? "是" : "否"}</td><td>{p.created_at ? new Date(p.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "—"}</td><td><PersonEditForm person={p} /></td></tr>) : <tr><td colSpan={6} className="muted">尚無人員資料</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}
