"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

import type { PendingUploadPayload } from "@/lib/site-content";
import type { StoreConfig } from "@/lib/site-content-schema";

const DRAFT_KEY = "pwl-site-content-draft-v2";

type PaymentChannel = "alipay" | "wechat";
type DraftPayload = {
  config: StoreConfig;
  pendingPaymentImages: Partial<Record<PaymentChannel, PendingUploadPayload>>;
  pendingProductImages: Record<string, PendingUploadPayload>;
};
type PriceDraftMap = Record<string, string>;

function createProductId() {
  return `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyProduct() {
  return {
    id: createProductId(),
    name: "新商品",
    description: "请填写商品简介。",
    image: "",
    coverTheme: "gemini" as const,
    stock: 10,
    statusLabel: "人工处理",
    isActive: true,
    sortOrder: 999,
    keywords: [],
    options: [{ label: "标准版", priceCents: 1000 }],
  };
}

function toAssetPreview(path: string) {
  return path ? `/api/admin/site-content/asset?path=${encodeURIComponent(path)}` : "";
}

function formatPriceInput(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

function createOptionDraftKey(productId: string, optionIndex: number) {
  return `${productId}:${optionIndex}`;
}

function buildPriceDrafts(config: StoreConfig) {
  const drafts: PriceDraftMap = {};

  for (const product of config.products) {
    product.options.forEach((option, optionIndex) => {
      drafts[createOptionDraftKey(product.id, optionIndex)] = formatPriceInput(
        option.priceCents,
      );
    });
  }

  return drafts;
}

function parsePriceInput(
  priceInput: string,
  productName: string,
  optionLabel: string,
) {
  const trimmed = priceInput.trim();

  if (trimmed === "") {
    throw new Error(`商品“${productName}”的规格“${optionLabel}”价格不能为空。`);
  }

  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    throw new Error(`商品“${productName}”的规格“${optionLabel}”价格格式不正确。`);
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`商品“${productName}”的规格“${optionLabel}”价格必须大于等于 0。`);
  }

  return Math.round(amount * 100);
}

function normalizeConfig(config: StoreConfig): StoreConfig {
  return {
    ...config,
    contact: config.contact.map((item) => ({
      ...item,
      label: item.label.trim(),
      value: item.value.trim(),
      description: item.description.trim(),
    })),
    announcements: config.announcements.map((item) => ({
      ...item,
      contactLabel: item.contactLabel.trim(),
      contactText: item.contactText.trim(),
      contactHref: item.contactHref.trim(),
      divider: item.divider.trim(),
      rules: item.rules.map((rule) => rule.trim()).filter(Boolean),
      warning: item.warning.trim(),
    })),
    products: config.products.map((product, index) => ({
      ...product,
      id: product.id.trim() || createProductId(),
      name: product.name.trim(),
      description: product.description.trim(),
      image: product.image.trim(),
      statusLabel: product.statusLabel.trim(),
      sortOrder: index + 1,
      keywords: product.keywords.map((keyword) => keyword.trim()).filter(Boolean),
      options: product.options.map((option) => ({
        label: option.label.trim(),
        priceCents: Number(option.priceCents),
      })),
    })),
  };
}

function readDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DraftPayload;
  } catch {
    window.localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<PendingUploadPayload>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("读取图片失败。"));
        return;
      }
      resolve({ name: file.name, type: file.type, dataUrl: result });
    };
    reader.onerror = () => reject(new Error("读取图片失败。"));
    reader.readAsDataURL(file);
  });
}

export function SiteContentEditor({ initialConfig }: { initialConfig: StoreConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [priceDrafts, setPriceDrafts] = useState<PriceDraftMap>(() =>
    buildPriceDrafts(initialConfig),
  );
  const [pendingPaymentImages, setPendingPaymentImages] = useState<
    Partial<Record<PaymentChannel, PendingUploadPayload>>
  >({});
  const [pendingProductImages, setPendingProductImages] = useState<Record<string, PendingUploadPayload>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const persistRef = useRef<number | null>(null);

  const announcement = config.announcements[0];

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setConfig(draft.config);
      setPriceDrafts(buildPriceDrafts(draft.config));
      setPendingPaymentImages(draft.pendingPaymentImages || {});
      setPendingProductImages(draft.pendingProductImages || {});
      setDirty(true);
      setDraftRecovered(true);
      setMessage("已恢复上次未保存的本地草稿。");
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (persistRef.current) window.clearTimeout(persistRef.current);
    if (!dirty) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }

    persistRef.current = window.setTimeout(() => {
      const payload: DraftPayload = { config, pendingPaymentImages, pendingProductImages };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }, 250);

    return () => {
      if (persistRef.current) window.clearTimeout(persistRef.current);
    };
  }, [config, pendingPaymentImages, pendingProductImages, dirty]);

  function mutateConfig(
    mutator: (current: StoreConfig) => StoreConfig,
    after?: (next: StoreConfig) => void,
  ) {
    setDirty(true);
    setMessage(null);
    setConfig((current) => {
      const next = mutator(current);
      after?.(next);
      return next;
    });
  }

  async function selectPaymentImage(channel: PaymentChannel, file: File | null) {
    if (!file) return;
    try {
      setBusyKey(channel);
      setError(null);
      const pending = await readFileAsDataUrl(file);
      setPendingPaymentImages((current) => ({ ...current, [channel]: pending }));
      setDirty(true);
      setMessage(`${channel === "alipay" ? "支付宝" : "微信"}收款码已加入草稿，保存后才会写入本地文件。`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "读取图片失败。");
    } finally {
      setBusyKey(null);
    }
  }

  async function selectProductImage(productId: string, file: File | null) {
    if (!file) return;
    try {
      setBusyKey(productId);
      setError(null);
      const pending = await readFileAsDataUrl(file);
      setPendingProductImages((current) => ({ ...current, [productId]: pending }));
      setDirty(true);
      setMessage("商品图片已加入草稿，保存后才会写入本地文件。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "读取图片失败。");
    } finally {
      setBusyKey(null);
    }
  }

  function getPaymentPreview(channel: PaymentChannel) {
    return pendingPaymentImages[channel]?.dataUrl || toAssetPreview(config.paymentChannels[channel].image);
  }

  function getProductPreview(product: StoreConfig["products"][number]) {
    return pendingProductImages[product.id]?.dataUrl || (product.image ? toAssetPreview(product.image) : "");
  }

  function addProduct() {
    setDirty(true);
    setMessage(null);
    setConfig((current) => {
      const product = createEmptyProduct();
      setPriceDrafts((existing) => ({
        ...existing,
        [createOptionDraftKey(product.id, 0)]: "10.00",
      }));
      return {
        ...current,
        products: [...current.products, product],
      };
    });
  }

  function removeProduct(index: number) {
    const productId = config.products[index]?.id;
    setDirty(true);
    setMessage(null);
    if (productId) {
      setPendingProductImages((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      setPriceDrafts((current) => {
        const next = { ...current };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${productId}:`)) {
            delete next[key];
          }
        });
        return next;
      });
    }
    setConfig((current) => ({
      ...current,
      products: current.products.filter((_, productIndex) => productIndex !== index),
    }));
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setDirty(true);
    setMessage(null);
    setConfig((current) => {
      const next = [...current.products];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return {
        ...current,
        products: next,
      };
    });
  }

  async function reloadFromDisk() {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/admin/site-content/config", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "重新加载失败。");
      setConfig(payload.config);
      setPriceDrafts(buildPriceDrafts(payload.config));
      setPendingPaymentImages({});
      setPendingProductImages({});
      setDirty(false);
      setDraftRecovered(false);
      window.localStorage.removeItem(DRAFT_KEY);
      setMessage("已重新载入本地文件内容。");
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : "重新加载失败。");
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const response = await fetch("/api/admin/site-content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: normalizeConfig({
            ...config,
            products: config.products.map((product) => ({
              ...product,
              options: product.options.map((option, optionIndex) => ({
                ...option,
                priceCents: parsePriceInput(
                  priceDrafts[createOptionDraftKey(product.id, optionIndex)] ?? "",
                  product.name,
                  option.label,
                ),
              })),
            })),
          }),
          pendingPaymentImages,
          pendingProductImages,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "保存失败。");

      setConfig(payload.config);
      setPriceDrafts(buildPriceDrafts(payload.config));
      setPendingPaymentImages({});
      setPendingProductImages({});
      setDirty(false);
      setDraftRecovered(false);
      window.localStorage.removeItem(DRAFT_KEY);
      setMessage("本地文件已更新。接下来执行 git push 即可同步到 GitHub Pages。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Static Site Editor</div>
            <h1 className="section-title text-4xl font-semibold">静态站内容管理</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              编辑时只保存在本地草稿里，点击保存时才会一次性写入 <code>docs/</code> 目录。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-2 text-sm text-[var(--muted)]">
              状态：{saving ? "保存中" : dirty ? "未保存" : "已同步"}
            </div>
            <button type="button" onClick={reloadFromDisk} disabled={saving} className="btn-secondary px-5 py-3 text-sm font-medium disabled:opacity-60">
              放弃草稿并重载
            </button>
            <button type="button" onClick={saveConfig} disabled={saving} className="btn-primary px-5 py-3 text-sm font-medium disabled:opacity-60">
              {saving ? "保存中..." : "保存到本地文件"}
            </button>
          </div>
        </div>
        {draftRecovered ? (
          <div className="mt-4 rounded-[1.5rem] bg-[rgba(111,92,231,0.1)] px-4 py-3 text-sm text-[var(--primary)]">
            已恢复上次未保存的本地草稿。
          </div>
        ) : null}
        {message ? <div className="mt-4 rounded-[1.5rem] bg-[rgba(31,123,82,0.1)] px-4 py-3 text-sm text-[var(--success)]">{message}</div> : null}
        {error ? <div className="mt-4 rounded-[1.5rem] bg-[rgba(182,60,49,0.09)] px-4 py-3 text-sm text-[var(--danger)]">{error}</div> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">站点与客服</h2>
            <div className="mt-4 space-y-3">
              <input className="field" value={config.site.brand.title} onChange={(event) => mutateConfig((current) => ({ ...current, site: { ...current.site, brand: { ...current.site.brand, title: event.target.value } } }))} placeholder="站点标题" />
              <input className="field" value={config.site.brand.subtitle} onChange={(event) => mutateConfig((current) => ({ ...current, site: { ...current.site, brand: { ...current.site.brand, subtitle: event.target.value } } }))} placeholder="站点副标题" />
              <input className="field" value={config.site.nav.shopping} onChange={(event) => mutateConfig((current) => ({ ...current, site: { ...current.site, nav: { ...current.site.nav, shopping: event.target.value } } }))} placeholder="导航购物文案" />
            </div>

            <div className="mt-6 space-y-4">
              {config.contact.map((item, index) => (
                <div key={`${item.label}-${index}`} className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">联系方式 {index + 1}</div>
                    <button type="button" onClick={() => mutateConfig((current) => ({ ...current, contact: current.contact.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-1 text-sm text-[var(--danger)]">删除</button>
                  </div>
                  <div className="space-y-3">
                    <input className="field" value={item.label} onChange={(event) => mutateConfig((current) => ({ ...current, contact: current.contact.map((contact, itemIndex) => itemIndex === index ? { ...contact, label: event.target.value } : contact) }))} placeholder="标签" />
                    <input className="field" value={item.value} onChange={(event) => mutateConfig((current) => ({ ...current, contact: current.contact.map((contact, itemIndex) => itemIndex === index ? { ...contact, value: event.target.value } : contact) }))} placeholder="展示值" />
                    <textarea className="field min-h-24" value={item.description} onChange={(event) => mutateConfig((current) => ({ ...current, contact: current.contact.map((contact, itemIndex) => itemIndex === index ? { ...contact, description: event.target.value } : contact) }))} placeholder="说明" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => mutateConfig((current) => ({ ...current, contact: [...current.contact, { label: "新联系方式", value: "请填写", description: "请填写说明。" }] }))} className="btn-secondary px-4 py-2 text-sm font-medium">新增联系方式</button>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">公告区与购买须知</h2>
            <div className="mt-4 space-y-3">
              <input className="field" value={announcement.contactLabel} onChange={(event) => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, contactLabel: event.target.value } : item) }))} placeholder="客服标签" />
              <input className="field" value={announcement.contactText} onChange={(event) => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, contactText: event.target.value } : item) }))} placeholder="客服显示文本" />
              <input className="field" value={announcement.contactHref} onChange={(event) => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, contactHref: event.target.value } : item) }))} placeholder="客服链接" />
              <input className="field" value={announcement.divider} onChange={(event) => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, divider: event.target.value } : item) }))} placeholder="分隔标题" />
              <textarea className="field min-h-28" value={announcement.warning} onChange={(event) => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, warning: event.target.value } : item) }))} placeholder="橙色强调警示文案" />
            </div>

            <div className="mt-5 space-y-3">
              {announcement.rules.map((rule, index) => (
                <div key={`rule-${index}`} className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">购买须知 {index + 1}</div>
                    <button type="button" onClick={() => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, rules: item.rules.filter((_, ruleIndex) => ruleIndex !== index) } : item) }))} className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-1 text-sm text-[var(--danger)]">删除</button>
                  </div>
                  <textarea className="field min-h-24" value={rule} onChange={(event) => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, rules: item.rules.map((currentRule, ruleIndex) => ruleIndex === index ? event.target.value : currentRule) } : item) }))} placeholder="购买须知内容" />
                </div>
              ))}
              <button type="button" onClick={() => mutateConfig((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === 0 ? { ...item, rules: [...item.rules, "请填写新的购买须知"] } : item) }))} className="btn-secondary px-4 py-2 text-sm font-medium">新增购买须知</button>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">支付收款码</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(["alipay", "wechat"] as const).map((channel) => (
                <div key={channel} className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4">
                  <div className="mb-3 text-sm font-medium">{channel === "alipay" ? "支付宝" : "微信"}收款码</div>
                  <div className="overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-white">
                    <img className="h-56 w-full object-contain" src={getPaymentPreview(channel)} alt={`${channel} 收款码预览`} />
                  </div>
                  <div className="mt-3 space-y-3">
                    <input className="field" value={config.paymentChannels[channel].label} onChange={(event) => mutateConfig((current) => ({ ...current, paymentChannels: { ...current.paymentChannels, [channel]: { ...current.paymentChannels[channel], label: event.target.value } } }))} placeholder="付款按钮文案" />
                    <textarea className="field min-h-24" value={config.paymentChannels[channel].helper} onChange={(event) => mutateConfig((current) => ({ ...current, paymentChannels: { ...current.paymentChannels, [channel]: { ...current.paymentChannels[channel], helper: event.target.value } } }))} placeholder="付款说明" />
                    <div className="text-xs text-[var(--muted)]">当前文件：{config.paymentChannels[channel].image}</div>
                    <label className="btn-secondary inline-flex cursor-pointer px-4 py-2 text-sm font-medium">
                      {busyKey === channel ? "读取中..." : "选择新图片"}
                      <input type="file" accept="image/*" hidden onChange={(event) => selectPaymentImage(channel, event.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">发布提示</h2>
            <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4 text-sm leading-7 text-[var(--muted)]">
              <p>保存只会更新本地文件，不会自动推送到 GitHub Pages。</p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-[rgba(36,23,20,0.06)] p-3 text-xs text-[var(--foreground)]">{`git status
git add .
git commit -m "update site content"
git push`}</pre>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="section-title text-3xl font-semibold">商品管理</h2>
              <button type="button" onClick={addProduct} className="btn-secondary px-4 py-2 text-sm font-medium">新增商品</button>
            </div>
            <div className="space-y-5">
              {config.products.map((product, index) => (
                <div key={product.id} className="rounded-[1.75rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">ID：{product.id}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => moveProduct(index, -1)} disabled={index === 0} className="btn-secondary px-3 py-2 text-sm disabled:opacity-50">上移</button>
                      <button type="button" onClick={() => moveProduct(index, 1)} disabled={index === config.products.length - 1} className="btn-secondary px-3 py-2 text-sm disabled:opacity-50">下移</button>
                      <button type="button" onClick={() => removeProduct(index)} className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-2 text-sm text-[var(--danger)]">删除</button>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-white">
                        {getProductPreview(product) ? <img className="h-56 w-full object-cover" src={getProductPreview(product)} alt={`${product.name} 图片预览`} /> : <div className="grid h-56 place-items-center text-sm text-[var(--muted)]">当前无商品图，将回退到主题封面</div>}
                      </div>
                      <div className="text-xs text-[var(--muted)]">当前文件：{product.image || "未上传"}</div>
                      <div className="flex flex-wrap gap-2">
                        <label className="btn-secondary inline-flex cursor-pointer px-4 py-2 text-sm font-medium">
                          {busyKey === product.id ? "读取中..." : "选择新图片"}
                          <input type="file" accept="image/*" hidden onChange={(event) => selectProductImage(product.id, event.target.files?.[0] || null)} />
                        </label>
                        <button type="button" onClick={() => { setDirty(true); setPendingProductImages((current) => { const next = { ...current }; delete next[product.id]; return next; }); mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, image: "" } : item) })); }} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">清空图片</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input className="field" value={product.name} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="商品名称" />
                      <textarea className="field min-h-28" value={product.description} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) }))} placeholder="商品简介" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className="field" type="number" min={0} value={product.stock} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, stock: Number(event.target.value || 0) } : item) }))} placeholder="商品库存" />
                        <input className="field" value={product.statusLabel} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, statusLabel: event.target.value } : item) }))} placeholder="状态标签" />
                      </div>
                      <select className="field" value={product.coverTheme} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, coverTheme: event.target.value as StoreConfig["products"][number]["coverTheme"] } : item) }))}>
                        <option value="gemini">Gemini 主题封面</option>
                        <option value="router">AnyRouter 主题封面</option>
                        <option value="antigravity">Antigravity 主题封面</option>
                      </select>
                      <input className="field" value={product.keywords.join(", ")} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, keywords: event.target.value.split(",").map((keyword) => keyword.trim()).filter(Boolean) } : item) }))} placeholder="关键词，逗号分隔" />
                      <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm">
                        <input type="checkbox" checked={product.isActive} onChange={(event) => mutateConfig((current) => ({ ...current, products: current.products.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked } : item) }))} />
                        启用商品
                      </label>

                      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] p-4">
                        <div className="mb-3 text-sm font-medium">规格与价格</div>
                        <div className="space-y-3">
                          {product.options.map((option, optionIndex) => {
                            const priceKey = createOptionDraftKey(product.id, optionIndex);
                            const priceInput =
                              priceDrafts[priceKey] ?? formatPriceInput(option.priceCents);

                            return (
                              <div key={`${product.id}-${optionIndex}`} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                                <input
                                  className="field"
                                  value={option.label}
                                  onChange={(event) =>
                                    mutateConfig((current) => ({
                                      ...current,
                                      products: current.products.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              options: item.options.map((currentOption, currentOptionIndex) =>
                                                currentOptionIndex === optionIndex
                                                  ? { ...currentOption, label: event.target.value }
                                                  : currentOption,
                                              ),
                                            }
                                          : item,
                                      ),
                                    }))
                                  }
                                  placeholder="规格名称"
                                />
                                <input
                                  className="field"
                                  type="text"
                                  inputMode="decimal"
                                  value={priceInput}
                                  onChange={(event) => {
                                    setDirty(true);
                                    setMessage(null);
                                    setPriceDrafts((current) => ({
                                      ...current,
                                      [priceKey]: event.target.value,
                                    }));
                                  }}
                                  placeholder="价格（元）"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const optionCount = product.options.length;
                                    const nextDrafts = { ...priceDrafts };
                                    for (let currentIndex = optionIndex; currentIndex < optionCount - 1; currentIndex += 1) {
                                      nextDrafts[createOptionDraftKey(product.id, currentIndex)] =
                                        nextDrafts[createOptionDraftKey(product.id, currentIndex + 1)] ??
                                        formatPriceInput(product.options[currentIndex + 1]?.priceCents ?? 0);
                                    }
                                    delete nextDrafts[createOptionDraftKey(product.id, optionCount - 1)];
                                    setPriceDrafts(nextDrafts);
                                    mutateConfig((current) => ({
                                      ...current,
                                      products: current.products.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              options: item.options.filter(
                                                (_, currentOptionIndex) => currentOptionIndex !== optionIndex,
                                              ),
                                            }
                                          : item,
                                      ),
                                    }));
                                  }}
                                  className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-2 text-sm text-[var(--danger)]"
                                >
                                  删除
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setPriceDrafts((current) => ({
                                ...current,
                                [createOptionDraftKey(product.id, product.options.length)]: "",
                              }));
                              mutateConfig((current) => ({
                                ...current,
                                products: current.products.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        options: [...item.options, { label: "新规格", priceCents: 1000 }],
                                      }
                                    : item,
                                ),
                              }));
                            }}
                            className="btn-secondary px-4 py-2 text-sm font-medium"
                          >
                            新增规格
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
