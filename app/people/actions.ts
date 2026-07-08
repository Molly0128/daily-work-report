"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { isManagerRole, type UserRole } from "@/lib/types";

export type PeopleFormState = { error?: string; success?: string };
function text(value: FormDataEntryValue | null) { return String(value ?? "").trim(); }
function validRole(role: string): UserRole { return role === "instructor" || role === "admin" || role === "member" ? role : "member"; }
async function requireManager() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("id,email,role").eq("id", user.id).single<{ id:string; email:string|null; role: UserRole }>();
  if (!isManagerRole(profile?.role)) redirect("/dashboard");
  return { user, profile };
}
async function managerCount(excludeId?: string) {
  const admin = createAdminSupabaseClient();
  const q = admin.from("profiles").select("id", { count: "exact", head: true }).in("role", ["instructor", "admin"]).eq("active", true);
  const { count } = excludeId ? await q.neq("id", excludeId) : await q;
  return count ?? 0;
}

export async function createMemberAccount(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const { user, profile } = await requireManager();
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  const fullName = text(formData.get("full_name"));
  const role = validRole(text(formData.get("role")));
  const active = formData.get("active") === "on";
  if (!email || !password) return { error: "請輸入 email 與初始密碼。" };
  if (password.length < 6) return { error: "初始密碼至少需要 6 個字元。" };
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error) return { error: `建立帳號失敗：${error.message}` };
    if (!data.user) return { error: "建立帳號失敗：Supabase 未回傳使用者資料。" };
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, email, full_name: fullName || null, role, active }, { onConflict: "id" });
    if (profileError) return { error: `帳號已建立，但同步人員資料失敗：${profileError.message}` };
    await writeAuditLog({ actor_user_id: user.id, actor_email: profile?.email ?? user.email, action: "create_user", target_user_id: data.user.id, target_email: email, detail: { role, active } });
  } catch (error) { return { error: error instanceof Error ? `建立帳號失敗：${error.message}` : "建立帳號失敗，請稍後再試。" }; }
  revalidatePath("/people"); revalidatePath("/dashboard");
  return { success: "帳號已建立。" };
}

export async function updatePerson(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const { user, profile } = await requireManager();
  const id = text(formData.get("id"));
  const email = text(formData.get("email")).toLowerCase();
  const role = validRole(text(formData.get("role")));
  const active = formData.get("active") === "on";
  if (!id || !email) return { error: "缺少人員資料。" };
  const admin = createAdminSupabaseClient();
  const { data: old } = await admin.from("profiles").select("role,active,email").eq("id", id).single<{role:UserRole;active:boolean;email:string|null}>();
  if (old && isManagerRole(old.role) && (!active || !isManagerRole(role)) && await managerCount(id) === 0) return { error: "不可停用或降權最後一位 instructor/admin。" };
  const { error } = await admin.from("profiles").update({ full_name: text(formData.get("full_name")) || null, email, role, active }).eq("id", id);
  if (error) return { error: `更新失敗：${error.message}` };
  await admin.auth.admin.updateUserById(id, { email, user_metadata: { full_name: text(formData.get("full_name")) } });
  await writeAuditLog({ actor_user_id: user.id, actor_email: profile?.email ?? user.email, action: old?.role !== role ? "change_role" : active ? "edit_user" : "disable_user", target_user_id: id, target_email: email, detail: { before: old, after: { role, active } } });
  revalidatePath("/people"); revalidatePath("/dashboard");
  return { success: "人員資料已更新。" };
}
