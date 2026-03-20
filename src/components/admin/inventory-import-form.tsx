"use client";

import { useState } from "react";

type ProductOption = {
  id: string;
  name: string;
  category: { name: string };
};

export function InventoryImportForm({
  products,
}: {
  products: ProductOption[];
}) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [rawItems, setRawItems] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rawItems }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "导入失败。");
      }

      setRawItems("");
      setMessage(`导入成功，共写入 ${payload.imported} 条库存。`);
      window.location.reload();
    } catch (importError) {
      setMessage(importError instanceof Error ? importError.message : "导入失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          Batch Import
        </div>
        <h2 className="section-title text-3xl font-semibold">批量导入库存</h2>
      </div>
      {products.length === 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4 text-sm leading-7 text-[var(--muted)]">
          当前没有启用中的自动库存商品。你这批商品现在按人工发货处理，所以这里暂时无需导入库存。
        </div>
      ) : null}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">目标商品</label>
          <select
            className="field"
            value={productId}
            disabled={products.length === 0}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                [{product.category.name}] {product.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">库存内容</label>
          <textarea
            className="field min-h-52"
            value={rawItems}
            onChange={(event) => setRawItems(event.target.value)}
            placeholder="每行一条卡密、账号、兑换码或交付内容"
          />
        </div>
        {message ? (
          <div className="rounded-[1.5rem] bg-[rgba(143,48,40,0.08)] px-4 py-3 text-sm text-[var(--primary-strong)]">
            {message}
          </div>
        ) : null}
        <button
          disabled={products.length === 0}
          className="btn-primary w-full px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "导入中..." : "开始导入"}
        </button>
      </div>
    </form>
  );
}
