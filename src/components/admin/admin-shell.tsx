import Link from "next/link";

import type { AdminUser } from "@prisma/client";

import { logoutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "总览" },
  { href: "/admin/products", label: "商品" },
  { href: "/admin/inventory", label: "库存" },
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/announcements", label: "公告" },
];

export function AdminShell({
  user,
  pathname,
}: {
  user: AdminUser;
  pathname: string;
}) {
  return (
    <aside className="glass-panel h-fit rounded-[2rem] border border-[var(--line)] p-5">
      <div className="mb-6 space-y-1">
        <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Admin Panel
        </div>
        <div className="section-title text-2xl font-semibold">{user.name}</div>
        <p className="text-sm text-[var(--muted)]">{user.email}</p>
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
      <form action={logoutAction} className="mt-6">
        <button className="btn-secondary w-full px-4 py-3 text-sm font-medium">
          退出登录
        </button>
      </form>
    </aside>
  );
}
