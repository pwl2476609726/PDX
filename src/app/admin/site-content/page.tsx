import { notFound } from "next/navigation";
import Link from "next/link";

import { SiteContentEditor } from "@/components/admin/site-content-editor";
import { SiteHeader } from "@/components/shell/site-header";
import { readStoreConfig } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const editorNavItems = [
  { href: "/admin", label: "总览" },
  { href: "/admin/site-content", label: "静态站内容" },
  { href: "/admin/products", label: "商品" },
  { href: "/admin/inventory", label: "库存" },
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/announcements", label: "公告" },
];

export default async function SiteContentPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const config = await readStoreConfig();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 xl:px-8">
        <div className="glass-panel mb-6 rounded-[2rem] border border-[var(--line)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                Local Editor
              </div>
              <div className="section-title text-2xl font-semibold">静态站内容编辑</div>
              <p className="text-sm text-[var(--muted)]">
                本地宽屏编辑模式，优先用于维护商品、规格与收款页内容。
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {editorNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.href === "/admin/site-content"
                      ? "rounded-full bg-[var(--primary)] px-4 py-2 text-sm text-white"
                      : "rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.62)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-white"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <SiteContentEditor initialConfig={config} />
      </main>
    </>
  );
}
