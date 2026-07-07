"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { DailyReport, ReportStatus } from "@/lib/types";

const statuses: ReportStatus[] = ["進行中", "已完成", "延期", "需協助"];

export type ReportFormState = {
  error?: string;
};

function toText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function todayInUtc() {
  return new Date().toISOString().slice(0, 10);
}

function friendlySupabaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("violates row-level security")) {
    return "目前帳號沒有儲存這筆回報的權限，請重新登入後再試，或聯絡管理員檢查 Supabase RLS 設定。";
  }
  if (lower.includes("duplicate key") || lower.includes("unique")) {
    return "今天的回報已存在，但更新時發生衝突。請重新整理頁面後再送出一次。";
  }
  return `儲存回報失敗：${message}`;
}

export async function upsertTodayReport(_prevState: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return { error: "無法確認登入狀態，請重新登入後再試。" };
  if (!user) redirect("/auth/login");

  const status = toText(formData.get("status")) as ReportStatus;
  const progress = Number(formData.get("progress_percent") ?? 0);
  const reportDate = toText(formData.get("report_date")) || todayInUtc();

  const report = {
    user_id: user.id,
    report_date: reportDate,
    work_items: toText(formData.get("work_items")),
    completed_content: toText(formData.get("completed_content")),
    progress_percent: Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0)),
    tomorrow_plan: toText(formData.get("tomorrow_plan")),
    blockers: toText(formData.get("blockers")),
    status: statuses.includes(status) ? status : "進行中",
    notes: toText(formData.get("notes"))
  } satisfies Omit<DailyReport, "id" | "created_at" | "updated_at" | "profiles">;

  const updateResult = await supabase
    .from("daily_reports")
    .update(report, { count: "exact" })
    .eq("user_id", user.id)
    .eq("report_date", report.report_date);

  if (updateResult.error) return { error: friendlySupabaseError(updateResult.error.message) };

  if ((updateResult.count ?? 0) === 0) {
    const insertResult = await supabase.from("daily_reports").insert(report);

    if (insertResult.error) {
      const retryUpdateResult = await supabase
        .from("daily_reports")
        .update(report, { count: "exact" })
        .eq("user_id", user.id)
        .eq("report_date", report.report_date);

      if (retryUpdateResult.error || (retryUpdateResult.count ?? 0) === 0) {
        return { error: friendlySupabaseError(insertResult.error.message) };
      }
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${encodeURIComponent(report.report_date)}`);
}
