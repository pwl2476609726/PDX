import { AnnouncementStrip } from "@/components/shop/announcement-strip";
import { ProductCard } from "@/components/shop/product-card";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { formatCurrency } from "@/lib/format";
import { getStorefrontData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getStorefrontData();
  const minimumPrice = data.products.length
    ? Math.min(...data.products.map((item) => item.startingPriceCents))
    : 0;
  const manualCount = data.products.filter(
    (product) => product.fulfillmentMode === "MANUAL",
  ).length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="fade-in grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel rounded-[2.5rem] border border-[var(--line)] px-6 py-8 sm:px-8">
            <div className="mb-4 inline-flex rounded-full bg-[rgba(143,48,40,0.1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--primary)]">
              Service Commerce
            </div>
            <h1 className="section-title max-w-3xl text-5xl font-semibold leading-[1.08] sm:text-6xl">
              先让你自己能打开，再让别人通过域名正常访问。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              当前版本已经适合先本地自测，再部署到公网服务器。首期商品按手动发货建模，支持规格切换、游客下单、支付回调、订单查询和后台人工录入交付内容。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#catalog" className="btn-primary inline-flex px-5 py-3 text-sm font-medium">
                浏览商品
              </a>
              <a href="/query" className="btn-secondary inline-flex px-5 py-3 text-sm font-medium">
                查询订单
              </a>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">模式</div>
              <div className="section-title mt-2 text-3xl font-semibold">手动交付优先</div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                付款成功后先进入待人工发货状态，后台录入内容后买家可在订单查询页查看。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
                <div className="text-sm text-[var(--muted)]">人工发货商品</div>
                <div className="mt-2 text-3xl font-semibold">{manualCount}</div>
              </div>
              <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-5">
                <div className="text-sm text-[var(--muted)]">在售商品</div>
                <div className="mt-2 text-3xl font-semibold">{data.products.length}</div>
              </div>
            </div>
          </div>
        </section>

        <AnnouncementStrip announcements={data.announcements} />

        <section className="fade-in glass-panel rounded-[2rem] border border-[var(--line)] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Category</div>
              <h2 className="section-title text-3xl font-semibold">快速导航</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">按分类整理当前可售商品。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-2 text-sm"
              >
                {category.name} · {category.productCount}
              </span>
            ))}
          </div>
        </section>

        <section id="catalog" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Catalog</div>
              <h2 className="section-title text-4xl font-semibold">商品列表</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              当前最低起售价 {data.products.length ? formatCurrency(minimumPrice) : "--"}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
