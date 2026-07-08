"use client";

import { useActionState } from "react";
import { createMemberAccount, updatePerson, type PeopleFormState } from "@/app/people/actions";
import type { Profile } from "@/lib/types";

const initialState: PeopleFormState = {};
export function CreateMemberForm() {
  const [state, formAction, pending] = useActionState(createMemberAccount, initialState);
  return <form action={formAction} className="card grid"><div><h2>新增成員帳號</h2><p className="muted">使用 Supabase Admin API 建立登入帳號，並同步寫入 profiles。</p></div><Message state={state} /><div className="grid grid-2"><label>姓名<input name="full_name" autoComplete="name" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label></div><div className="grid grid-3"><RoleSelect /><label>初始密碼<input name="password" type="password" minLength={6} required autoComplete="new-password" /></label><label className="checkbox"><input name="active" type="checkbox" defaultChecked /> 啟用</label></div><button type="submit" disabled={pending}>{pending ? "建立中..." : "建立帳號"}</button></form>;
}
export function PersonEditForm({ person }: { person: Profile }) {
  const [state, formAction, pending] = useActionState(updatePerson, initialState);
  return <form action={formAction} className="inline-form"><input type="hidden" name="id" value={person.id} /><input name="full_name" defaultValue={person.full_name ?? ""} placeholder="姓名" /><input name="email" type="email" defaultValue={person.email ?? ""} required /><RoleSelect defaultValue={person.role} /><label className="checkbox"><input name="active" type="checkbox" defaultChecked={person.active} /> 啟用</label><button type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存"}</button><Message state={state} /></form>;
}
function RoleSelect({ defaultValue = "member" }: { defaultValue?: string }) { return <label>角色<select name="role" defaultValue={defaultValue}><option value="instructor">instructor</option><option value="admin">admin</option><option value="member">member</option></select></label>; }
function Message({ state }: { state: PeopleFormState }) { return <>{state.error ? <p className="error-message" role="alert">{state.error}</p> : null}{state.success ? <p className="success-message" role="status">{state.success}</p> : null}</>; }
