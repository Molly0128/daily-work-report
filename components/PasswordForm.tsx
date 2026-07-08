"use client";

import { useActionState } from "react";
import { updatePassword, type PasswordFormState } from "@/app/account/actions";

const initialState: PasswordFormState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  return <form action={formAction} className="card grid">
    <div><h2>修改密碼</h2><p className="muted">請輸入新密碼並再次確認。</p></div>
    {state.error ? <p className="error-message" role="alert">{state.error}</p> : null}
    {state.success ? <p className="success-message" role="status">{state.success}</p> : null}
    <label>新密碼<input name="password" type="password" minLength={6} required autoComplete="new-password" /></label>
    <label>確認新密碼<input name="confirm_password" type="password" minLength={6} required autoComplete="new-password" /></label>
    <button type="submit" disabled={pending}>{pending ? "更新中..." : "更新密碼"}</button>
  </form>;
}
