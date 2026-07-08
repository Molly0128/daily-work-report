"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { getTaiwanTodayDateString } from "@/lib/date";
import type { DailyReport, ReportStatus } from "@/lib/types";

const statuses: ReportStatus[] = ["進行中", "已完成", "延期", "需協助"];
export type ReportFormState = { error?: string; success?: string };
function toText(value: FormDataEntryValue | null) { return String(value ?? "").trim(); }
function friendlySupabaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied")) return "目前帳號沒有儲存這筆回報的權限，請重新登入後再試，或聯絡管理員。";
  if (lower.includes("duplicate key") || lower.includes("unique")) return "同一天回報已存在，系統更新時發生衝突，請重新整理後再試。";
  return `儲存回報失敗：${message}`;
}

export async function upsertTodayReport(_prevState: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return { error: "無法確認登入狀態，請重新登入後再試。" };
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("active").eq("id", user.id).single<{active:boolean}>();
  if (!profile?.active) return { error: "此帳號已停用，請聯絡管理者" };

  const status = toText(formData.get("status")) as ReportStatus;
  const progressInput = Number(formData.get("progress") ?? 0);
  const progress = Number.isFinite(progressInput) ? progressInput : -1;
  const workItems = toText(formData.get("work_items"));
  const completedContent = toText(formData.get("completed_content"));
  if (!workItems) return { error: "請填寫今日工作項目。" };
  if (!completedContent) return { error: "請填寫今日完成內容。" };
  if (progress < 0 || progress > 100) return { error: "進度百分比必須介於 0 到 100。" };
  if (!statuses.includes(status)) return { error: "請選擇合法的狀態。" };

  const report = {
    user_id: user.id,
    report_date: toText(formData.get("report_date")) || getTaiwanTodayDateString(),
    work_items: workItems,
    completed_content: completedContent,
    progress,
    tomorrow_plan: toText(formData.get("tomorrow_plan")),
    issue: toText(formData.get("issue")),
    status,
    notes: toText(formData.get("notes"))
  } satisfies Omit<DailyReport, "id" | "created_at" | "updated_at" | "profiles">;

  const { error } = await supabase.from("daily_reports").upsert(report, { onConflict: "user_id,report_date" });
  if (error) return { error: friendlySupabaseError(error.message) };
  revalidatePath("/dashboard");
  return { success: "回報已成功儲存。" };
}
