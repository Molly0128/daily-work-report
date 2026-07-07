"use client";

import { useActionState } from "react";
import { upsertTodayReport, type ReportFormState } from "@/app/dashboard/actions";
import type { DailyReport, ReportStatus } from "@/lib/types";

const statusOptions: ReportStatus[] = ["進行中", "已完成", "延期", "需協助"];
const initialState: ReportFormState = {};

export function ReportForm({ today, report }: { today: string; report?: DailyReport | null }) {
  const [state, formAction, pending] = useActionState(upsertTodayReport, initialState);

  return (
    <form action={formAction} className="card grid">
      <div>
        <h2>今日工作回報</h2>
        <p className="muted">今天已填可直接更新；系統會依日期覆蓋同一天的回報。</p>
      </div>
      {state.error ? <p className="error-message" role="alert">{state.error}</p> : null}
      <div className="grid grid-2">
        <label>日期<input name="report_date" type="date" defaultValue={report?.report_date ?? today} required /></label>
        <label>狀態<select name="status" defaultValue={report?.status ?? "進行中"}>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label>今日工作項目<textarea name="work_items" required defaultValue={report?.work_items ?? ""} /></label>
      <label>今日完成內容<textarea name="completed_content" required defaultValue={report?.completed_content ?? ""} /></label>
      <div className="grid grid-2">
        <label>進度百分比<input name="progress_percent" type="number" min="0" max="100" defaultValue={report?.progress_percent ?? 0} required /></label>
        <label>明日預計工作<textarea name="tomorrow_plan" defaultValue={report?.tomorrow_plan ?? ""} /></label>
      </div>
      <label>遇到問題<textarea name="blockers" placeholder="沒有問題可留空" defaultValue={report?.blockers ?? ""} /></label>
      <label>備註<textarea name="notes" defaultValue={report?.notes ?? ""} /></label>
      <button type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存今日回報"}</button>
    </form>
  );
}
