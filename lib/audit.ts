import { createAdminSupabaseClient } from "@/lib/supabase";

export async function writeAuditLog(input: {
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_user_id?: string | null;
  target_email?: string | null;
  detail?: Record<string, unknown> | null;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("audit_logs").insert({
    actor_user_id: input.actor_user_id ?? null,
    actor_email: input.actor_email ?? null,
    action: input.action,
    target_user_id: input.target_user_id ?? null,
    target_email: input.target_email ?? null,
    detail: input.detail ?? null
  });
}
