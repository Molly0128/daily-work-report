"use client";

import { useActionState } from "react";
import { createMemberAccount, type PeopleFormState } from "@/app/people/actions";

const initialState: PeopleFormState = {};

export function CreateMemberForm() {
  const [state, formAction, pending] = useActionState(createMemberAccount, initialState);
  return (
    <form action={formAction} className="card grid">
      <div><h2>新增成員帳號</h2><p className="muted">使用 Supabase Admin API 建立登入帳號，並同步寫入 profiles。</p></div>
      {state.error ? <p className="error-message" role="alert">{state.error}</p> : null}
      {state.success ? <p className="success-message" role="status">{state.success}</p> : null}
      <div className="grid grid-2">
        <label>姓名<input name="full_name" autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      </div>
      <div className="grid grid-3">
        <label>角色<select name="role" defaultValue="member"><option value="member">member</option><option value="admin">admin</option></select></label>
        <label>初始密碼<input name="password" type="password" minLength={6} required autoComplete="new-password" /></label>
        <label className="checkbox"><input name="active" type="checkbox" defaultChecked /> 啟用</label>
      </div>
      <button type="submit" disabled={pending}>{pending ? "建立中..." : "建立帳號"}</button>
    </form>
  );
}
