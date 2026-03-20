"use client";

import { useState } from "react";

import { formatCurrency, formatDateTime } from "@/lib/format";

type OrderResult = {
  orderNo: string;
  statusLabel: string;
  amountCents: number;
  unitPriceCents: number;
  quantity: number;
  productName: string;
  productOptionLabel: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  deliveredItems: string[];
};

export function OrderQueryForm() {
  const [buyerContact, setBuyerContact] = useState("");
  const [queryPassword, setQueryPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OrderResult[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerContact, queryPassword }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "查询失败。");
      }

      setResults(payload.orders);
    } catch (queryError) {
      setResults([]);
      setError(queryError instanceof Error ? queryError.message : "查询失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
        <div className="mb-5">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            Order Lookup
          </div>
          <h2 className="section-title text-3xl font-semibold">查询已支付订单</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">联系方式</label>
            <input
              className="field"
              value={buyerContact}
              onChange={(event) => setBuyerContact(event.target.value)}
              placeholder="下单时填写的联系方式"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">查询密码</label>
            <input
              className="field"
              type="password"
              value={queryPassword}
              onChange={(event) => setQueryPassword(event.target.value)}
              placeholder="下单时设置的查询密码"
            />
          </div>
          {error ? (
            <div className="rounded-[1.5rem] bg-[rgba(182,60,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}
          <button className="btn-primary w-full px-5 py-3 text-sm font-medium">
            {pending ? "查询中..." : "立即查询"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6 text-sm leading-7 text-[var(--muted)]">
            查询结果会在这里显示。付款成功后，发货内容会和订单状态一起返回。
          </div>
        ) : (
          results.map((order) => (
            <article
              key={order.orderNo}
              className="glass-panel rounded-[2rem] border border-[var(--line)] p-6"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    {order.orderNo}
                  </div>
                  <h3 className="section-title text-2xl font-semibold">{order.productName}</h3>
                  <div className="mt-1 text-sm text-[var(--muted)]">{order.productOptionLabel}</div>
                </div>
                <span className="rounded-full bg-[rgba(30,123,82,0.12)] px-3 py-1 text-xs font-medium text-[var(--success)]">
                  {order.statusLabel}
                </span>
              </div>
              <div className="grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
                <div>金额：{formatCurrency(order.amountCents)}</div>
                <div>数量：{order.quantity}</div>
                <div>支付时间：{formatDateTime(order.paidAt)}</div>
              </div>
              <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4">
                <div className="mb-2 text-sm font-medium">发货内容</div>
                {order.deliveredItems.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    当前订单已支付，但还在等待人工发货。店主录入交付内容后，你可以在这里再次查询。
                  </p>
                ) : (
                  <div className="space-y-2 text-sm leading-7">
                    {order.deliveredItems.map((item) => (
                      <pre
                        key={item}
                        className="overflow-x-auto rounded-2xl bg-[rgba(36,23,20,0.06)] p-3 text-xs"
                      >
                        {item}
                      </pre>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
