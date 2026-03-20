import { AdminShell } from "@/components/admin/admin-shell";
import { InventoryImportForm } from "@/components/admin/inventory-import-form";
import { SiteHeader } from "@/components/shell/site-header";
import { requireAdminUser } from "@/lib/auth";
import { getAdminInventoryPageData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const user = await requireAdminUser();
  const data = await getAdminInventoryPageData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <AdminShell user={user} pathname="/admin/inventory" />
        <section className="space-y-6">
          <InventoryImportForm products={data.importableProducts} />
          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">库存概览</h2>
            <div className="mt-4 space-y-3">
              {data.products.map((product) => (
                <div
                  key={product.id}
                  className="grid gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]"
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-[var(--muted)]">{product.category.name}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {product.fulfillmentMode === "MANUAL" ? "手动发货" : "自动库存发货"}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">可售：{product.counts.AVAILABLE}</div>
                  <div className="text-sm text-[var(--muted)]">预留：{product.counts.RESERVED}</div>
                  <div className="text-sm text-[var(--muted)]">已发：{product.counts.DELIVERED}</div>
                  <div className="text-sm text-[var(--muted)]">停用：{product.counts.DISABLED}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
