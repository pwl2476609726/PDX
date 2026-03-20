import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { AppError } from "@/lib/errors";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getOrderPageData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no } = await params;
  const order = await getOrderPageData(no).catch((error) => {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="glass-panel rounded-[2.5rem] border border-[var(--line)] p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                {order.orderNo}
              </div>
              <h1 className="section-title text-5xl font-semibold">{order.productName}</h1>
              <div className="mt-2 text-sm text-[var(--muted)]">{order.productOptionLabel}</div>
            </div>
            <span className="rounded-full bg-[rgba(30,123,82,0.12)] px-4 py-2 text-sm font-medium text-[var(--success)]">
              {order.statusLabel}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">金额</div>
              <div className="mt-2 text-xl font-semibold">{formatCurrency(order.amountCents)}</div>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">数量</div>
              <div className="mt-2 text-xl font-semibold">{order.quantity}</div>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">支付时间</div>
              <div className="mt-2 text-sm font-medium">{formatDateTime(order.paidAt)}</div>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">发货时间</div>
              <div className="mt-2 text-sm font-medium">{formatDateTime(order.fulfilledAt)}</div>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
          <h2 className="section-title text-3xl font-semibold">发货内容</h2>
          {order.deliveredItems.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              当前订单已经支付成功，但还在等待人工发货。店主在后台录入交付内容后，你可以刷新本页或到订单查询页再次查看。
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {order.deliveredItems.map((item) => (
                <pre
                  key={item}
                  className="overflow-x-auto rounded-[1.5rem] bg-[rgba(255,255,255,0.58)] p-4 text-xs leading-7"
                >
                  {item}
                </pre>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/query" className="btn-primary px-5 py-3 text-sm font-medium">
            去订单查询页
          </Link>
          <Link href="/" className="btn-secondary px-5 py-3 text-sm font-medium">
            返回首页
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
