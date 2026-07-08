import { redirect } from "next/navigation";
import { ReportForm } from "@/components/ReportForm";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { DailyReport, Profile } from "@/lib/types";

const statuses = ["進行中", "已完成", "延期", "需協助"];
const today = () => new Date().toISOString().slice(0, 10);
const displayName = (p?: Pick<Profile, "full_name" | "email"> | null) => p?.full_name || p?.email || "未命名成員";

function csvHref(reports: DailyReport[]) {
  const header = ["日期", "人員", "狀態", "進度", "今日工作項目", "今日完成內容", "明日預計工作", "遇到問題", "備註"];
  const rows = reports.map((r) => [r.report_date, displayName(r.profiles), r.status, `${r.progress_percent ?? 0}%`, r.work_items ?? "", r.completed_content ?? "", r.tomorrow_plan ?? "", r.blockers ?? "", r.notes ?? ""]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csv}`)}`;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string; user?: string; status?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("id, full_name, email, role, active, created_at").eq("id", user.id).single<Profile>();
  const role = profile?.role ?? "member";
  const params = await searchParams;
  const selectedDate = params.date || today();

  if (role !== "admin") {
    const { data: report } = await supabase.from("daily_reports").select("*").eq("user_id", user.id).eq("report_date", selectedDate).maybeSingle<DailyReport>();
    const { data: myReports } = await supabase.from("daily_reports").select("*").eq("user_id", user.id).order("report_date", { ascending: false }).limit(14).returns<DailyReport[]>();

    return (
      <main className="container grid">
        <Header profile={profile} />
        <ReportForm today={selectedDate} report={report} />
        <section className="card grid">
          <h2>我的最近回報</h2>
          <ReportTable reports={myReports ?? []} />
        </section>
      </main>
    );
  }

  const { data: members } = await supabase.from("profiles").select("id, full_name, email, role, active, created_at").order("full_name", { ascending: true, nullsFirst: false }).order("email", { ascending: true }).returns<Profile[]>();
  let query = supabase.from("daily_reports").select("*, profiles(full_name, email)").eq("report_date", selectedDate).order("report_date", { ascending: false });
  if (params.user) query = query.eq("user_id", params.user);
  if (params.status) query = query.eq("status", params.status);
  const { data: reports } = await query.returns<DailyReport[]>();
  const filledIds = new Set((reports ?? []).map((r) => r.user_id));
  const teamMembers = (members ?? []).filter((m) => m.role === "member" && m.active);
  const filled = teamMembers.filter((m) => filledIds.has(m.id));
  const missing = teamMembers.filter((m) => !filledIds.has(m.id));

  return (
    <main className="container grid">
      <Header profile={profile} />
      <section className="grid grid-3">
        <Stat label="今日已填寫" value={filled.length} />
        <Stat label="今日未填寫" value={missing.length} />
        <Stat label="目前列表筆數" value={(reports ?? []).length} />
      </section>
      <section className="card grid">
        <div className="header"><div><h2>團隊回報管理</h2><p className="muted">依日期、人員與狀態篩選，並匯出目前結果。</p></div><a className="button secondary" download={`daily-reports-${selectedDate}.csv`} href={csvHref(reports ?? [])}>匯出 CSV</a></div>
        <form className="grid grid-3">
          <label>日期<input name="date" type="date" defaultValue={selectedDate} /></label>
          <label>人員<select name="user" defaultValue={params.user ?? ""}><option value="">全部</option>{teamMembers.map((m) => <option key={m.id} value={m.id}>{displayName(m)}</option>)}</select></label>
          <label>狀態<select name="status" defaultValue={params.status ?? ""}><option value="">全部</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
          <button type="submit">套用篩選</button>
        </form>
        <ReportTable reports={reports ?? []} />
      </section>
      <section className="grid grid-2">
        <PeopleList title="今日已填寫人員" people={filled} />
        <PeopleList title="今日未填寫人員" people={missing} />
      </section>
    </main>
  );
}

function Header({ profile }: { profile: Profile | null }) {
  return <header className="header"><div><h1>每日工作進度回報系統</h1><p className="muted">{displayName(profile)}・{profile?.role === "admin" ? "管理者" : "成員"}</p></div><div className="stack"><a className="button secondary" href="/account">帳號設定</a>{profile?.role === "admin" ? <a className="button secondary" href="/people">人員管理</a> : null}<form action="/auth/logout" method="post"><button className="danger" type="submit">登出</button></form></div></header>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="card"><div className="muted">{label}</div><div className="stat">{value}</div></div>; }
function PeopleList({ title, people }: { title: string; people: Profile[] }) { return <section className="card"><h3>{title}</h3><div className="stack">{people.length ? people.map((p) => <span className="badge" key={p.id}>{displayName(p)}</span>) : <span className="muted">無</span>}</div></section>; }
function ReportTable({ reports }: { reports: DailyReport[] }) { return <div className="table-wrap"><table><thead><tr><th>日期</th><th>人員</th><th>狀態</th><th>進度</th><th>今日工作項目</th><th>完成內容</th><th>明日預計</th><th>問題</th><th>備註</th></tr></thead><tbody>{reports.length ? reports.map((r) => <tr key={r.id ?? `${r.user_id}-${r.report_date}`}><td>{r.report_date}</td><td>{displayName(r.profiles)}</td><td><span className="badge">{r.status}</span></td><td>{r.progress_percent ?? 0}%</td><td>{r.work_items}</td><td>{r.completed_content}</td><td>{r.tomorrow_plan}</td><td>{r.blockers || "—"}</td><td>{r.notes || "—"}</td></tr>) : <tr><td colSpan={9} className="muted">沒有符合條件的回報</td></tr>}</tbody></table></div>; }
