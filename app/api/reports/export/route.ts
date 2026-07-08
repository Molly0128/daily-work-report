import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { displayName, isManagerRole, type DailyReport, type Profile } from "@/lib/types";
import { writeAuditLog } from "@/lib/audit";

function cell(v: unknown) { return `"${String(v ?? "").replaceAll('"', '""')}"`; }
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("id, full_name, email, role, active").eq("id", user.id).single<Profile>();
  if (!isManagerRole(me?.role)) return new NextResponse("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const userId = url.searchParams.get("user") || "";
  const status = url.searchParams.get("status") || "";
  let q = supabase.from("daily_reports").select("*, profiles(full_name, email)").order("report_date", { ascending: false });
  if (date) q = q.eq("report_date", date);
  if (userId) q = q.eq("user_id", userId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.returns<DailyReport[]>();
  if (error) return new NextResponse("Export failed", { status: 500 });
  const header = ["日期", "姓名", "Email", "狀態", "進度", "今日工作項目", "今日完成內容", "明日預計工作", "遇到問題", "備註", "建立時間", "更新時間"];
  const rows = (data ?? []).map((r) => [r.report_date, displayName(r.profiles), r.profiles?.email ?? "", r.status, `${r.progress ?? 0}%`, r.work_items, r.completed_content, r.tomorrow_plan, r.issue, r.notes, r.created_at, r.updated_at]);
  await writeAuditLog({ actor_user_id: user.id, actor_email: me?.email ?? user.email, action: "export_csv", detail: { date, user: userId, status, count: rows.length } });
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="daily-reports-${date || "all"}.csv"` } });
}
