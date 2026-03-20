import Link from "next/link";

import {
  deleteCategoryAction,
  deleteProductAction,
  saveCategoryAction,
  saveProductAction,
} from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SiteHeader } from "@/components/shell/site-header";
import { requireAdminUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getAdminProductsPageData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { edit, message } = await searchParams;
  const data = await getAdminProductsPageData(edit);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <AdminShell user={user} pathname="/admin/products" />
        <section className="space-y-6">
          {message ? (
            <div className="rounded-[1.5rem] bg-[rgba(182,60,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {message}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <form action={saveCategoryAction} className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
              <input type="hidden" name="id" value={data.editingCategory?.id || ""} />
              <div className="mb-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Category
                </div>
                <h2 className="section-title text-3xl font-semibold">
                  {data.editingCategory ? "编辑分类" : "新建分类"}
                </h2>
              </div>
              <div className="space-y-3">
                <input className="field" name="name" placeholder="分类名称" defaultValue={data.editingCategory?.name} />
                <input className="field" name="slug" placeholder="分类 slug（可选）" defaultValue={data.editingCategory?.slug} />
                <textarea
                  className="field min-h-28"
                  name="description"
                  placeholder="分类说明"
                  defaultValue={data.editingCategory?.description || ""}
                />
                <input
                  className="field"
                  name="sortOrder"
                  type="number"
                  defaultValue={data.editingCategory?.sortOrder || 0}
                />
                <button className="btn-primary w-full px-5 py-3 text-sm font-medium">
                  保存分类
                </button>
              </div>
            </form>

            <form action={saveProductAction} className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
              <input type="hidden" name="id" value={data.editingProduct?.id || ""} />
              <div className="mb-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Product
                </div>
                <h2 className="section-title text-3xl font-semibold">
                  {data.editingProduct ? "编辑商品" : "新建商品"}
                </h2>
              </div>
              <div className="space-y-3">
                <select
                  className="field"
                  name="categoryId"
                  defaultValue={data.editingProduct?.categoryId || data.categories[0]?.id}
                >
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input className="field" name="name" placeholder="商品名称" defaultValue={data.editingProduct?.name} />
                <input className="field" name="slug" placeholder="商品 slug（可选）" defaultValue={data.editingProduct?.slug} />
                <input className="field" name="summary" placeholder="一句话摘要" defaultValue={data.editingProduct?.summary} />
                <input className="field" name="badge" placeholder="角标，如 自动发货" defaultValue={data.editingProduct?.badge || ""} />
                <select
                  className="field"
                  name="fulfillmentMode"
                  defaultValue={data.editingProduct?.fulfillmentMode || "MANUAL"}
                >
                  <option value="MANUAL">手动发货</option>
                  <option value="AUTO_STOCK">自动库存发货</option>
                </select>
                <textarea className="field min-h-28" name="description" placeholder="商品说明" defaultValue={data.editingProduct?.description} />
                <textarea className="field min-h-28" name="supportPolicy" placeholder="售后说明" defaultValue={data.editingProduct?.supportPolicy} />
                <textarea className="field min-h-28" name="deliveryFormat" placeholder="发货格式说明" defaultValue={data.editingProduct?.deliveryFormat} />
                <textarea
                  className="field min-h-32"
                  name="optionsText"
                  placeholder={"规格配置，每行一条，格式：规格名称|价格\n例如：1个月有效期|50\n4个月有效期|88"}
                  defaultValue={data.editingProduct?.optionsText || ""}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input className="field" name="sortOrder" type="number" defaultValue={data.editingProduct?.sortOrder || 0} />
                  <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm">
                    <input type="checkbox" name="isActive" defaultChecked={data.editingProduct?.isActive ?? true} />
                    启用
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm">
                    <input type="checkbox" name="isFeatured" defaultChecked={data.editingProduct?.isFeatured ?? false} />
                    推荐
                  </label>
                </div>
                <button className="btn-primary w-full px-5 py-3 text-sm font-medium">
                  保存商品
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
              <h2 className="section-title text-3xl font-semibold">分类列表</h2>
              <div className="mt-4 space-y-3">
                {data.categories.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-[var(--muted)]">{category.slug}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          关联商品：{category.products.length}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/products?edit=${category.id}`} className="btn-secondary px-3 py-2 text-sm">
                          编辑
                        </Link>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <button className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-2 text-sm text-[var(--danger)]">
                            删除
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
              <h2 className="section-title text-3xl font-semibold">商品列表</h2>
              <div className="mt-4 space-y-3">
                {data.products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-[var(--muted)]">{product.category.name}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {product.fulfillmentMode === "MANUAL" ? "人工发货" : "自动库存发货"} · 规格 {product.options.length} 档
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {product.options.length > 0
                            ? `起价 ${formatCurrency(
                                Math.min(...product.options.map((option) => option.priceCents)),
                              )}`
                            : "未配置规格"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/products?edit=${product.id}`} className="btn-secondary px-3 py-2 text-sm">
                          编辑
                        </Link>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-2 text-sm text-[var(--danger)]">
                            删除/下架
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
