import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyPanel } from "@/components/shop/buy-panel";
import { ProductCard } from "@/components/shop/product-card";
import { AnnouncementStrip } from "@/components/shop/announcement-strip";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { formatCurrency } from "@/lib/format";
import { AppError } from "@/lib/errors";
import { getProductPageData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductPageData(slug).catch((error) => {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <AnnouncementStrip announcements={data.announcements} />
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="glass-panel rounded-[2.5rem] border border-[var(--line)] p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[rgba(143,48,40,0.09)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
                  {data.product.categoryName}
                </span>
                {data.product.badge ? (
                  <span className="rounded-full bg-[rgba(209,168,107,0.22)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
                    {data.product.badge}
                  </span>
                ) : null}
              </div>
              <h1 className="section-title text-5xl font-semibold leading-tight">
                {data.product.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
                {data.product.summary}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    {data.product.optionCount > 1 ? "起售价" : "价格"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--primary-strong)]">
                    {formatCurrency(data.product.startingPriceCents)}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    规格
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{data.product.optionCount} 档</div>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    发货
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {data.product.fulfillmentMode === "MANUAL" ? "人工发货" : "自动发货"}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
              <h2 className="section-title text-3xl font-semibold">商品说明</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[var(--muted)]">
                {data.product.description}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
                <h2 className="section-title text-3xl font-semibold">售后与规则</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[var(--muted)]">
                  {data.product.supportPolicy}
                </p>
              </div>
              <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
                <h2 className="section-title text-3xl font-semibold">发货格式</h2>
                <p className="mt-4 whitespace-pre-wrap rounded-[1.5rem] bg-[rgba(255,255,255,0.58)] p-4 font-mono text-sm leading-8 text-[var(--foreground)]">
                  {data.product.deliveryFormat}
                </p>
              </div>
            </div>
          </div>

          <BuyPanel
            productName={data.product.name}
            options={data.product.options}
            fulfillmentMode={data.product.fulfillmentMode}
            stockCount={data.product.stockCount}
          />
        </section>

        {data.relatedProducts.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  More
                </div>
                <h2 className="section-title text-4xl font-semibold">其他商品</h2>
              </div>
              <Link href="/" className="btn-secondary px-4 py-2 text-sm font-medium">
                返回首页
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {data.relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
