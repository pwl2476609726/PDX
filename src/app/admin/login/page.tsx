import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getAdminUser();
  if (user) {
    redirect("/admin");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6">
        <section className="glass-panel rounded-[2.5rem] border border-[var(--line)] p-6 sm:p-8">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Operator Login
            </div>
            <h1 className="section-title text-5xl font-semibold">进入后台</h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">
              首次启动后请先执行 Prisma migrate 与 seed。默认管理员账号会从
              <code className="mx-1 rounded bg-[rgba(36,23,20,0.06)] px-2 py-1 text-sm">
                .env
              </code>
              中读取。
            </p>
          </div>
          <AdminLoginForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
