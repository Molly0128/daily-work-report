"use server";

import { createServerSupabaseClient } from "@/lib/supabase";

export type PasswordFormState = { error?: string; success?: string };

export async function updatePassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (password.length < 6) return { error: "新密碼至少需要 6 個字元。" };
  if (password !== confirm) return { error: "兩次輸入的新密碼不一致。" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "登入狀態已失效，請重新登入後再試。" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `修改密碼失敗：${error.message}` };
  return { success: "密碼已成功更新。" };
}
