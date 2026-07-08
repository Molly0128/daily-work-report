export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="container" style={{ maxWidth: 460 }}>
      <section className="card grid">
        <div>
          <h1>每日工作進度回報系統</h1>
          <p className="muted">請使用公司帳號登入，開始填寫或檢視每日進度。</p>
        </div>
        {params.message ? <p className="danger card">{params.message}</p> : null}
        <form action={signIn} className="grid">
          <label>電子郵件<input name="email" type="email" required autoComplete="email" /></label>
          <label>密碼<input name="password" type="password" required autoComplete="current-password" /></label>
          <button type="submit">登入</button>
        </form>
      </section>
    </main>
  );
}
