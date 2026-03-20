export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-[rgba(255,249,241,0.6)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
        <p>
          用于数字商品、家庭组资格、授权码与服务交付场景。正式上线前请确保售卖内容与支付接入符合当地法规和平台规则。
        </p>
        <p>支持游客下单、支付回调、人工发货、订单查询和基础后台运营。</p>
      </div>
    </footer>
  );
}
