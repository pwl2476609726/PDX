import Link from "next/link";

import type { AdminUser } from "@prisma/client";

import { logoutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "总览" },
  { href: "/admin/site-content", label: "静态站内容" },
  { href: "/admin/products", label: "商品" },
  { href: "/admin/inventory", label: "库存" },
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/announcements", label: "公告" },
];

export function AdminShell({
  user,
  pathname,
}: {
  user: AdminUser | null;
  pathname: string;
}) {
  return (
    <aside className="glass-panel h-fit rounded-[2rem] border border-[var(--line)] p-5">
      <div className="mb-6 space-y-1">
        <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          {user ? "Admin Panel" : "Local Editor"}
        </div>
        <div className="section-title text-2xl font-semibold">
          {user ? user.name : "静态站内容编辑"}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {user ? user.email : "仅本地开发环境可用，保存后同步到 docs/ 目录"}
        </p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-2xl px-4 py-3 text-sm",
              pathname === item.href
                ? "bg-[var(--primary)] text-white"
                : "bg-[rgba(255,255,255,0.62)] text-[var(--foreground)] hover:bg-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {user ? (
        <form action={logoutAction} className="mt-6">
          <button className="btn-secondary w-full px-4 py-3 text-sm font-medium">
            退出登录
          </button>
        </form>
      ) : null}
    </aside>
  );
}
