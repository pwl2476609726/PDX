import Link from "next/link";

import { formatCurrency } from "@/lib/format";

type ProductCardProps = {
  product: {
    slug: string;
    name: string;
    summary: string;
    badge: string | null;
    categoryName: string;
    startingPriceCents: number;
    optionCount: number;
    stockCount: number | null;
    fulfillmentMode: "MANUAL" | "AUTO_STOCK";
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const isManual = product.fulfillmentMode === "MANUAL";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group fade-in glass-panel flex h-full flex-col justify-between rounded-[2rem] border border-[var(--line)] p-5 hover:-translate-y-1"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-[rgba(143,48,40,0.09)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
              {product.categoryName}
            </span>
            <h3 className="section-title text-2xl font-semibold leading-tight">
              {product.name}
            </h3>
          </div>
          {product.badge ? (
            <span className="rounded-full bg-[rgba(209,168,107,0.22)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
              {product.badge}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-7 text-[var(--muted)]">{product.summary}</p>
      </div>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {product.optionCount > 1 ? "起价" : "现价"}
          </div>
          <div className="text-2xl font-semibold text-[var(--primary-strong)]">
            {formatCurrency(product.startingPriceCents)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {product.optionCount > 1 ? `${product.optionCount} 档规格可选` : "单规格商品"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {isManual ? "交付" : "库存"}
          </div>
          <div className="text-lg font-medium">
            {isManual ? "人工发货" : product.stockCount}
          </div>
        </div>
      </div>
    </Link>
  );
}
