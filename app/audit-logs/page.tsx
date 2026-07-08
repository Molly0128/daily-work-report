export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { displayName, isManagerRole, type AuditLog, type Profile } from "@/lib/types";

export default async function AuditLogsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: me } = await supabase.from("profiles").select("id, full_name, email, role, active").eq("id", user.id).single<Profile>();
  if (!isManagerRole(me?.role)) redirect("/dashboard");
  const { data: logs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200).returns<AuditLog[]>();
  return <main className="container grid"><header className="header"><div><h1>操作紀錄</h1><p className="muted">{displayName(me)} 可查看最近 200 筆操作。</p></div><nav className="stack"><a className="button secondary" href="/dashboard">儀表板</a><a className="button secondary" href="/people">人員管理</a><a className="button secondary" href="/account">帳號設定</a></nav></header><section className="card"><div className="table-wrap"><table><thead><tr><th>時間</th><th>操作者</th><th>動作</th><th>目標</th><th>明細</th></tr></thead><tbody>{logs?.length ? logs.map((l) => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td><td>{l.actor_email ?? l.actor_user_id ?? "—"}</td><td><span className="badge">{l.action}</span></td><td>{l.target_email ?? l.target_user_id ?? "—"}</td><td><code>{JSON.stringify(l.detail ?? {})}</code></td></tr>) : <tr><td colSpan={5} className="muted">尚無操作紀錄</td></tr>}</tbody></table></div></section></main>;
}
