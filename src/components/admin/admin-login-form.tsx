"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/admin/actions";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">管理员邮箱</label>
        <input className="field" type="email" name="email" placeholder="admin@example.com" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">密码</label>
        <input className="field" type="password" name="password" placeholder="请输入密码" />
      </div>
      {state?.error ? (
        <p className="rounded-2xl bg-[rgba(182,60,49,0.09)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="btn-primary w-full px-4 py-3 text-sm font-medium">
        {pending ? "登录中..." : "登录后台"}
      </button>
    </form>
  );
}
