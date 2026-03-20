import { OrderQueryForm } from "@/components/shop/order-query-form";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";

export const dynamic = "force-dynamic";

export default function QueryPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="fade-in">
          <div className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Order Query
          </div>
          <h1 className="section-title text-5xl font-semibold">自助查询已支付订单</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted)]">
            使用下单时填写的联系方式和查询密码，直接查看订单状态与最终交付内容。手动发货的订单会先显示为“已支付，等待人工发货”。
          </p>
        </section>
        <OrderQueryForm />
      </main>
      <SiteFooter />
    </>
  );
}
