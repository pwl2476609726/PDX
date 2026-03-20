const storeConfig = {
  site: {
    brand: {
      title: "Gemini Ai 服务收款页",
      subtitle: "静态公开页 · 人工处理",
    },
    nav: {
      shopping: "购物",
    },
  },
  paymentChannels: {
    alipay: {
      label: "支付宝付款",
      image: "./assets/pay/支付宝付款码.jpg",
      helper: "请使用支付宝扫码付款。",
    },
    wechat: {
      label: "微信付款",
      image: "./assets/pay/微信付款码.jpg",
      helper: "请使用微信扫码付款。",
    },
  },
  announcements: [
    {
      contactLabel: "客服联系方式",
      contactText: "TG号：https://t.me/pandaxia1227",
      contactHref: "https://t.me/pandaxia1227",
      divider: "购买须知",
      rules: [
        "服务说明：本页仅用于商品展示和人工收款，付款后请联系客服人工确认。",
        "测试建议：如有具体使用要求，请先沟通商品适用范围，再完成付款。",
        "安全提醒：收货后请及时完成你需要的安全设置或资料补全。",
        "售后说明：请优先说明购买规格、支付渠道、支付时间与联系方式，方便客服核单。",
        "合规警告：请在合法合规范围内使用购买内容，因不当使用导致的问题需自行承担。",
      ],
      warning:
        "付款完成后请立即联系客服，说明购买商品、规格、支付渠道和支付时间。",
    },
  ],
  contact: [
    {
      label: "QQ 客服",
      value: "QQ：2476609726",
      description: "下单后可通过 QQ 联系核单与后续处理。",
    },
    {
      label: "微信客服",
      value: "微信：PDX2476609726",
      description: "推荐使用微信联系，方便确认付款与跟进处理。",
    },
    {
      label: "Telegram",
      value: "TG：@pandaxia1227",
      description: "也可以通过 Telegram 联系，适合外网环境下沟通。",
    },
  ],
  products: [
    {
      id: "gemini-pro-family",
      coverTheme: "gemini",
      name: "Gemini Pro家庭组（20XX年XX月XX日到期）",
      status: "人工处理",
      description:
        "首期按照人工处理流程交付。付款后请联系客服，并说明购买商品与支付时间。",
      keywords: ["gemini", "家庭组", "pro", "谷歌", "到期"],
      options: [
        {
          label: "标准版",
          priceCents: 1000,
        },
      ],
    },
    {
      id: "anyrouter-api-token",
      coverTheme: "router",
      name: "AnyRouter API令牌",
      status: "人工处理",
      description:
        "价格说明：12r = 100刀。付款后请联系客服，人工确认后继续处理。",
      keywords: ["anyrouter", "api", "令牌", "100刀", "额度"],
      options: [
        {
          label: "100刀额度",
          priceCents: 1200,
        },
      ],
    },
    {
      id: "antigravity-pro-family",
      coverTheme: "antigravity",
      name: "Antigravity Pro家庭组",
      status: "人工处理",
      description:
        "纯现场手搓 1 主号 + 5 副号的 Pro 家庭组。获取账号、Pro 充值、拉家庭组、手机号验证等中间过程全包。",
      keywords: ["antigravity", "pro", "家庭组", "1个月", "4个月", "1年"],
      options: [
        {
          label: "1个月有效期",
          priceCents: 5000,
        },
        {
          label: "4个月有效期",
          priceCents: 8800,
        },
        {
          label: "1年有效期",
          priceCents: 15000,
        },
      ],
    },
  ],
};

const brandTitle = document.getElementById("brand-title");
const brandSubtitle = document.getElementById("brand-subtitle");
const navShopping = document.getElementById("nav-shopping");
const searchInput = document.getElementById("search-input");
const announcementList = document.getElementById("announcement-list");
const productList = document.getElementById("product-list");
const contactList = document.getElementById("contact-list");
const catalogSummary = document.getElementById("catalog-summary");
const emptyState = document.getElementById("empty-state");
const modal = document.getElementById("payment-modal");
const modalProductName = document.getElementById("modal-product-name");
const modalOptionLabel = document.getElementById("modal-option-label");
const modalPrice = document.getElementById("modal-price");
const modalQrImage = document.getElementById("modal-qr-image");
const modalChannelLabel = document.getElementById("modal-channel-label");
const modalHelper = document.getElementById("modal-helper");
const modalContactNote = document.getElementById("modal-contact-note");
const toast = document.getElementById("toast");

let toastTimer = null;

function formatCurrency(cents) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function setBrand() {
  brandTitle.textContent = storeConfig.site.brand.title;
  brandSubtitle.textContent = storeConfig.site.brand.subtitle;
  navShopping.textContent = storeConfig.site.nav.shopping;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function createCoverMarkup(product) {
  if (product.coverTheme === "router") {
    return `
      <div class="product-cover cover-theme-router">
        <span class="cover-badge">${product.status}</span>
        <div class="cover-body">
          <div class="router-chip-row">
            <span class="router-chip">API</span>
            <span class="router-chip">TOKEN</span>
            <span class="router-chip">额度</span>
          </div>
          <div class="router-title">AnyRouter</div>
          <div class="cover-mark-small">令牌 · 调用额度</div>
        </div>
      </div>
    `;
  }

  if (product.coverTheme === "antigravity") {
    return `
      <div class="product-cover cover-theme-antigravity">
        <span class="cover-badge">${product.status}</span>
        <div class="cover-body">
          <div class="ring-stack" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="ant-title">Antigravity</div>
          <div class="cover-mark-small">Pro 家庭组</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="product-cover cover-theme-gemini">
      <span class="cover-badge">${product.status}</span>
      <div class="cover-body">
        <div class="cover-mark">
          <span class="gem-star" aria-hidden="true">✦</span>
          <span class="gem-wordmark">Gemini</span>
        </div>
        <div class="cover-mark-small">家庭组资格</div>
      </div>
    </div>
  `;
}

function createOptionMarkup(product, option) {
  return `
    <div class="option-card">
      <div class="option-meta">
        <span class="option-name">${option.label}</span>
        <span class="option-price">${formatCurrency(option.priceCents)}</span>
      </div>
      <div class="option-actions">
        <button
          class="pay-button pay-button-alipay"
          type="button"
          data-open-payment
          data-product-id="${product.id}"
          data-option-label="${option.label}"
          data-price-cents="${option.priceCents}"
          data-channel="alipay"
        >
          支付宝付款
        </button>
        <button
          class="pay-button pay-button-wechat"
          type="button"
          data-open-payment
          data-product-id="${product.id}"
          data-option-label="${option.label}"
          data-price-cents="${option.priceCents}"
          data-channel="wechat"
        >
          微信付款
        </button>
      </div>
      <div class="option-foot">
        <span>处理：人工确认</span>
        <span>交付：联系客服</span>
      </div>
    </div>
  `;
}

function renderAnnouncements() {
  announcementList.innerHTML = storeConfig.announcements
    .map(
      (announcement) => `
        <article class="announcement-card">
          <div class="announcement-topline">
            <span class="announcement-contact-label">${announcement.contactLabel}</span>
            <a class="announcement-contact-link" href="${announcement.contactHref}" target="_blank" rel="noreferrer">
              ${announcement.contactText}
            </a>
          </div>
          <div class="announcement-divider">${announcement.divider}</div>
          <ul class="rule-list">
            ${announcement.rules
              .map(
                (rule, index) => `
                  <li class="rule-item">
                    <span class="rule-index">${index + 1}</span>
                    <span>${rule}</span>
                  </li>
                `,
              )
              .join("")}
          </ul>
          <div class="warning-copy">${announcement.warning}</div>
        </article>
      `,
    )
    .join("");
}

function renderContacts() {
  contactList.innerHTML = storeConfig.contact
    .map(
      (item) => `
        <article class="contact-card">
          <div class="contact-label">${item.label}</div>
          <div class="contact-value">${item.value}</div>
          <div class="contact-desc">${item.description}</div>
        </article>
      `,
    )
    .join("");
}

function getSearchText(product) {
  return [
    product.name,
    product.description,
    ...(product.keywords || []),
    ...product.options.map((option) => option.label),
  ]
    .join(" ")
    .toLowerCase();
}

function renderProducts(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = storeConfig.products.filter((product) => {
    if (!normalizedQuery) {
      return true;
    }

    return getSearchText(product).includes(normalizedQuery);
  });

  catalogSummary.textContent = normalizedQuery
    ? `搜索 “${query}” 共找到 ${filteredProducts.length} 个商品`
    : `当前显示全部 ${storeConfig.products.length} 个商品`;

  emptyState.hidden = filteredProducts.length > 0;
  productList.hidden = filteredProducts.length === 0;

  productList.innerHTML = filteredProducts
    .map(
      (product) => `
        <article class="product-card">
          ${createCoverMarkup(product)}
          <div class="product-body">
            <span class="status-pill">${product.status}</span>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="option-list">
              ${product.options.map((option) => createOptionMarkup(product, option)).join("")}
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function openModal(productId, optionLabel, priceCents, channelId) {
  const product = storeConfig.products.find((item) => item.id === productId);
  const channel = storeConfig.paymentChannels[channelId];

  if (!product || !channel) {
    return;
  }

  modalProductName.textContent = product.name;
  modalOptionLabel.textContent = `所选规格：${optionLabel}`;
  modalPrice.textContent = formatCurrency(Number(priceCents));
  modalQrImage.src = channel.image;
  modalQrImage.alt = `${channel.label}收款码`;
  modalChannelLabel.textContent = channel.label;
  modalHelper.textContent = `${channel.helper} 付款后请联系客服，并说明购买商品、规格、支付渠道和支付时间。`;
  modalContactNote.textContent =
    "请发送：购买商品、规格、支付渠道、支付时间。客服确认收款后会继续人工处理。";

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.matches("[data-open-payment]")) {
    openModal(
      target.dataset.productId,
      target.dataset.optionLabel,
      target.dataset.priceCents,
      target.dataset.channel,
    );
  }

  if (target.matches("[data-close-modal]")) {
    closeModal();
  }

});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }
});

searchInput.addEventListener("input", (event) => {
  renderProducts(event.target.value);
});

setBrand();
renderAnnouncements();
renderContacts();
renderProducts();
