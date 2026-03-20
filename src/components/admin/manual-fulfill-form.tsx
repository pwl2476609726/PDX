"use client";

import { useState } from "react";

export function ManualFulfillForm({
  orderId,
}: {
  orderId: string;
}) {
  const [deliveryContent, setDeliveryContent] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryContent }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "人工发货失败。");
      }

      setDeliveryContent("");
      setMessage("已完成人工发货，页面即将刷新。");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "人工发货失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4">
      <div className="text-sm font-medium">人工录入交付内容</div>
      <textarea
        className="field min-h-28"
        value={deliveryContent}
        onChange={(event) => setDeliveryContent(event.target.value)}
        placeholder="每行一条交付内容，例如账号、密码、说明链接或注意事项"
      />
      {message ? (
        <div className="rounded-[1rem] bg-[rgba(143,48,40,0.08)] px-4 py-3 text-sm text-[var(--primary-strong)]">
          {message}
        </div>
      ) : null}
      <button className="btn-primary px-4 py-2 text-sm font-medium">
        {pending ? "提交中..." : "完成发货"}
      </button>
    </form>
  );
}
