"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function signIn(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth/login?message=${encodeURIComponent("登入失敗，請確認帳號密碼。")}`);
  redirect("/dashboard");
}
