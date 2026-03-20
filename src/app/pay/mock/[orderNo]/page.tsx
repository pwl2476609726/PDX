import { MockPaymentPanel } from "@/components/shop/mock-payment-panel";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";

export const dynamic = "force-dynamic";

export default async function MockPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ provider?: string }>;
}) {
  const { orderNo } = await params;
  const { provider = "alipay" } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <MockPaymentPanel
          orderNo={orderNo}
          provider={provider === "wechat" ? "wechat" : "alipay"}
        />
      </main>
      <SiteFooter />
    </>
  );
}
