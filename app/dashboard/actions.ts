"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ReportStatus } from "@/lib/types";

const statuses: ReportStatus[] = ["進行中", "已完成", "延期", "需協助"];

export async function upsertTodayReport(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const status = String(formData.get("status") ?? "進行中") as ReportStatus;
  const progress = Number(formData.get("progress_percent") ?? 0);
  const report = {
    user_id: user.id,
    report_date: String(formData.get("report_date")),
    work_items: String(formData.get("work_items") ?? ""),
    completed_content: String(formData.get("completed_content") ?? ""),
    progress_percent: Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0)),
    tomorrow_plan: String(formData.get("tomorrow_plan") ?? ""),
    blockers: String(formData.get("blockers") ?? ""),
    status: statuses.includes(status) ? status : "進行中",
    notes: String(formData.get("notes") ?? "")
  };

  const { error } = await supabase.from("daily_reports").upsert(report, { onConflict: "user_id,report_date" });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
