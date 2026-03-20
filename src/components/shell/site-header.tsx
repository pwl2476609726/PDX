import Link from "next/link";

import { env } from "@/lib/env";

export function SiteHeader() {
  return (
    <header className="fade-in sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(251,246,239,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-bold text-white shadow-lg shadow-[rgba(111,35,28,0.18)]">
            PW
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
              Auto Delivery Commerce
            </div>
            <div className="section-title text-xl font-semibold">{env.APP_NAME}</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] sm:flex">
          <Link href="/">商品</Link>
          <Link href="/query">订单查询</Link>
          <Link href="/admin">后台</Link>
        </nav>
      </div>
    </header>
  );
}
