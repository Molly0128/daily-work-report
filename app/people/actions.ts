"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

export type PeopleFormState = { error?: string; success?: string };

function text(value: FormDataEntryValue | null) { return String(value ?? "").trim(); }

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (profile?.role !== "admin") redirect("/dashboard");
}

export async function createMemberAccount(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAdmin();
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  const fullName = text(formData.get("full_name"));
  const role = text(formData.get("role")) === "admin" ? "admin" : "member";
  const active = formData.get("active") === "on";

  if (!email || !password) return { error: "請輸入 email 與初始密碼。" };
  if (password.length < 6) return { error: "初始密碼至少需要 6 個字元。" };

  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (error) return { error: `建立帳號失敗：${error.message}` };
    if (!data.user) return { error: "建立帳號失敗：Supabase 未回傳使用者資料。" };

    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName || null,
      role,
      active
    }, { onConflict: "id" });

    if (profileError) return { error: `帳號已建立，但同步人員資料失敗：${profileError.message}` };
  } catch (error) {
    return { error: error instanceof Error ? `建立帳號失敗：${error.message}` : "建立帳號失敗，請稍後再試。" };
  }

  revalidatePath("/people");
  revalidatePath("/dashboard");
  return { success: "成員帳號已建立。" };
}
