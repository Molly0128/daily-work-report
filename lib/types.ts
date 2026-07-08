export type UserRole = "admin" | "member";
export type ReportStatus = "進行中" | "已完成" | "延期" | "需協助";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
  created_at?: string;
};

export type DailyReport = {
  id: string;
  user_id: string;
  report_date: string;
  work_items: string | null;
  completed_content: string | null;
  progress_percent: number | null;
  tomorrow_plan: string | null;
  blockers: string | null;
  status: ReportStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};
