"use client";

import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/format";

type PaymentResult = {
  mode: "redirect" | "qr";
  checkoutUrl?: string;
  qrCodeText?: string;
  deepLink?: string;
  displayName: string;
  expiresAt: string;
};

type ProductOption = {
  id: string;
  label: string;
  priceCents: number;
};

export function BuyPanel({
  productName,
  options,
  fulfillmentMode,
  stockCount,
}: {
  productName: string;
  options: ProductOption[];
  fulfillmentMode: "MANUAL" | "AUTO_STOCK";
  stockCount: number | null;
}) {
  const [buyerContact, setBuyerContact] = useState("");
  const [queryPassword, setQueryPassword] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [provider, setProvider] = useState<"ALIPAY" | "WECHAT">("ALIPAY");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedOptionId) ?? options[0],
    [options, selectedOptionId],
  );

  const total = useMemo(
    () => formatCurrency((selectedOption?.priceCents || 0) * quantity),
    [quantity, selectedOption],
  );

  const isManual = fulfillmentMode === "MANUAL";
  const isSoldOut = !isManual && (stockCount ?? 0) <= 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setPaymentResult(null);

    try {
      if (!selectedOption) {
        throw new Error("当前商品没有可用规格。");
      }

      const orderResponse = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productOptionId: selectedOption.id,
          quantity,
          buyerContact,
          queryPassword,
          paymentProvider: provider,
        }),
      });

      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderPayload.message || "创建订单失败。");
      }

      setOrderNo(orderPayload.orderNo);

      const providerSlug = provider === "ALIPAY" ? "alipay" : "wechat";
      const paymentResponse = await fetch(`/api/payments/${providerSlug}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: orderPayload.orderNo }),
      });

      const paymentPayload = await paymentResponse.json();
      if (!paymentResponse.ok) {
        throw new Error(paymentPayload.message || "创建支付单失败。");
      }

      setPaymentResult(paymentPayload);

      if (paymentPayload.mode === "redirect" && paymentPayload.checkoutUrl) {
        window.location.href = paymentPayload.checkoutUrl;
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "提交失败，请稍后重试。",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            自助下单
          </div>
          <h3 className="section-title text-3xl font-semibold">购买并创建订单</h3>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            交付方式
          </div>
          <div className="text-lg font-semibold">{isManual ? "人工发货" : "自动发货"}</div>
        </div>
      </div>

      <div className="mb-5 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4 text-sm leading-7 text-[var(--muted)]">
        {isManual
          ? `${productName} 当前为人工交付商品。付款成功后，订单会进入“已支付，等待人工发货”状态，店主在后台录入交付内容后，你可在订单查询页查看。`
          : `当前商品会在支付成功后自动从库存池发货。`}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">选择规格</label>
          <div className="grid gap-3">
            {options.map((option) => {
              const selected = option.id === selectedOption?.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`rounded-[1.25rem] border px-4 py-4 text-left ${
                    selected
                      ? "border-[rgba(143,48,40,0.5)] bg-[rgba(143,48,40,0.08)]"
                      : "border-[var(--line)] bg-[rgba(255,255,255,0.5)]"
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {formatCurrency(option.priceCents)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">联系方式</label>
          <input
            className="field"
            value={buyerContact}
            onChange={(event) => setBuyerContact(event.target.value)}
            placeholder="QQ / 微信 / 邮箱 / 手机"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">查询密码</label>
          <input
            className="field"
            type="password"
            value={queryPassword}
            onChange={(event) => setQueryPassword(event.target.value)}
            placeholder="用于之后自主查询订单"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">购买数量</label>
            <input
              className="field"
              type="number"
              min={1}
              max={isManual ? 20 : Math.max(stockCount ?? 1, 1)}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value || 1))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">支付方式</label>
            <select
              className="field"
              value={provider}
              onChange={(event) => setProvider(event.target.value as "ALIPAY" | "WECHAT")}
            >
              <option value="ALIPAY">支付宝</option>
              <option value="WECHAT">微信支付</option>
            </select>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            <span>合计金额</span>
            <span className="text-xl font-semibold text-[var(--primary-strong)]">{total}</span>
          </div>
          {selectedOption ? (
            <div className="mt-2 text-xs text-[var(--muted)]">
              当前规格：{selectedOption.label}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-[1.5rem] bg-[rgba(182,60,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <button
          disabled={pending || isSoldOut}
          className="btn-primary w-full px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "创建订单中..." : isSoldOut ? "暂时缺货" : "立即支付"}
        </button>
      </form>

      {paymentResult?.mode === "qr" && paymentResult.qrCodeText ? (
        <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4">
          <div className="mb-2 text-sm font-medium">
            {paymentResult.displayName} 桌面端扫码支付
          </div>
          <p className="mb-3 text-sm text-[var(--muted)]">
            当前环境未内置二维码渲染库，先展示支付链接文本。正式接入时建议换成 SVG/Canvas 二维码组件。
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-[rgba(36,23,20,0.06)] p-3 text-xs leading-6">
            {paymentResult.qrCodeText}
          </pre>
          {paymentResult.deepLink ? (
            <a
              href={paymentResult.deepLink}
              className="btn-secondary mt-3 inline-flex px-4 py-2 text-sm"
            >
              打开支付链接
            </a>
          ) : null}
          {orderNo ? (
            <p className="mt-3 text-xs text-[var(--muted)]">订单号：{orderNo}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
