export type UserRole = "instructor" | "admin" | "member";
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
  progress: number | null;
  tomorrow_plan: string | null;
  issue: string | null;
  status: ReportStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export const managerRoles: UserRole[] = ["instructor", "admin"];
export function isManagerRole(role?: string | null): role is "instructor" | "admin" {
  return role === "instructor" || role === "admin";
}
export function displayName(p?: Pick<Profile, "full_name" | "email"> | null) {
  return p?.full_name?.trim() || p?.email || "未命名成員";
}
