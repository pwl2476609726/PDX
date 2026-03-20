import { AdminShell } from "@/components/admin/admin-shell";
import { SiteHeader } from "@/components/shell/site-header";
import { requireAdminUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getAdminOverviewData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireAdminUser();
  const data = await getAdminOverviewData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <AdminShell user={user} pathname="/admin" />
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
              <div className="text-sm text-[var(--muted)]">商品数</div>
              <div className="mt-2 text-3xl font-semibold">{data.metrics.products}</div>
            </div>
            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
              <div className="text-sm text-[var(--muted)]">订单数</div>
              <div className="mt-2 text-3xl font-semibold">{data.metrics.orders}</div>
            </div>
            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
              <div className="text-sm text-[var(--muted)]">可售库存</div>
              <div className="mt-2 text-3xl font-semibold">{data.metrics.inventory}</div>
            </div>
            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
              <div className="text-sm text-[var(--muted)]">公告数</div>
              <div className="mt-2 text-3xl font-semibold">{data.metrics.announcements}</div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">最近订单</h2>
            <div className="mt-4 space-y-3">
              {data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr]"
                >
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      {order.orderNo}
                    </div>
                    <div className="mt-1 font-medium">{order.product.name}</div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">{order.status}</div>
                  <div className="text-sm text-[var(--muted)]">{order.buyerContact}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {formatDateTime(order.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
