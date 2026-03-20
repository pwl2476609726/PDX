"use client";

import { useState } from "react";

export function MockPaymentPanel({
  orderNo,
  provider,
}: {
  orderNo: string;
  provider: "alipay" | "wechat";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo, provider }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "模拟支付失败。");
      }

      window.location.href = `/order/${orderNo}`;
    } catch (mockError) {
      setError(mockError instanceof Error ? mockError.message : "模拟支付失败。");
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
      <div className="mb-4 text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
        Mock Payment
      </div>
      <h1 className="section-title text-4xl font-semibold">模拟完成支付</h1>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
        当前环境启用了 mock 支付模式。点击按钮后会直接触发支付成功回调；手动发货商品会进入“已支付，等待人工发货”状态，自动库存商品则会继续自动交付。
      </p>
      <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4 text-sm">
        <div>订单号：{orderNo}</div>
        <div className="mt-1">支付渠道：{provider === "alipay" ? "支付宝" : "微信支付"}</div>
      </div>
      {error ? (
        <div className="mt-4 rounded-[1.5rem] bg-[rgba(182,60,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
      <button
        onClick={handleComplete}
        disabled={pending}
        className="btn-primary mt-5 w-full px-5 py-3 text-sm font-medium"
      >
        {pending ? "处理中..." : "模拟支付成功"}
      </button>
    </div>
  );
}
