import Link from "next/link";

import { ManualFulfillForm } from "@/components/admin/manual-fulfill-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { SiteHeader } from "@/components/shell/site-header";
import { requireAdminUser } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getAdminOrdersPageData } from "@/lib/orders";

export const dynamic = "force-dynamic";

function getStatusLabel(status: string, fulfillmentMode: string) {
  if (status === "PAID" && fulfillmentMode === "MANUAL") {
    return "已支付，等待人工发货";
  }

  if (status === "FULFILLED") {
    return "已发货";
  }

  if (status === "PENDING") {
    return "待支付";
  }

  return status;
}

export default async function AdminOrdersPage() {
  const user = await requireAdminUser();
  const orders = await getAdminOrdersPageData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <AdminShell user={user} pathname="/admin/orders" />
        <section className="space-y-6">
          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Orders
                </div>
                <h1 className="section-title text-4xl font-semibold">订单与发货记录</h1>
              </div>
              <Link href="/" className="btn-secondary px-4 py-2 text-sm font-medium">
                查看前台
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1fr]">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                        {order.orderNo}
                      </div>
                      <div className="mt-1 font-medium">{order.product.name}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{order.productOptionLabel}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{order.buyerContact}</div>
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      <div>状态：{getStatusLabel(order.status, order.fulfillmentMode)}</div>
                      <div className="mt-1">发货模式：{order.fulfillmentMode === "MANUAL" ? "人工发货" : "自动发货"}</div>
                      <div className="mt-1">渠道：{order.paymentProvider}</div>
                      <div className="mt-1">数量：{order.quantity}</div>
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      <div>金额：{formatCurrency(order.amountCents)}</div>
                      <div className="mt-1">支付：{formatDateTime(order.paidAt)}</div>
                      <div className="mt-1">发货：{formatDateTime(order.fulfilledAt)}</div>
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      <div>流水号：{order.providerTransaction || "未记录"}</div>
                      <div className="mt-1">回调记录：{order.paymentRecords.length}</div>
                      <div className="mt-1">
                        发货条数：{order.fulfillmentRecord?.deliveredCount || 0}
                      </div>
                    </div>
                  </div>
                  {order.fulfillmentMode === "MANUAL" && order.status === "PAID" ? (
                    <ManualFulfillForm orderId={order.id} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
