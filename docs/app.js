let storeConfig = null;
let selectedOptions = {};
let currentQuery = "";

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

function ensureSelectedOptions() {
  const nextSelectedOptions = {};

  for (const product of storeConfig.products) {
    const selectedIndex = selectedOptions[product.id] ?? 0;
    const maxIndex = Math.max(product.options.length - 1, 0);
    nextSelectedOptions[product.id] = Math.min(selectedIndex, maxIndex);
  }

  selectedOptions = nextSelectedOptions;
}

function getSelectedOption(product) {
  const optionIndex = selectedOptions[product.id] ?? 0;
  return product.options[optionIndex] || product.options[0];
}

function createCoverMarkup(product) {
  if (product.image) {
    return `
      <div class="product-cover cover-theme-image">
        <img class="product-cover-image" src="${product.image}" alt="${product.name}" loading="lazy" />
      </div>
    `;
  }

  if (product.coverTheme === "router") {
    return `
      <div class="product-cover cover-theme-router">
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

function createOptionMarkup(product, option, optionIndex) {
  const isSelected = (selectedOptions[product.id] ?? 0) === optionIndex;
  return `
    <button
      class="option-card option-card-selectable ${isSelected ? "is-selected" : ""}"
      type="button"
      data-select-option
      data-product-id="${product.id}"
      data-option-index="${optionIndex}"
      aria-pressed="${isSelected ? "true" : "false"}"
    >
      <div class="option-meta">
        <span class="option-name">${option.label}</span>
        <span class="option-price">${formatCurrency(option.priceCents)}</span>
      </div>
      <div class="option-foot">
        <span>${isSelected ? "已选中" : "点击选择该规格"}</span>
        <span>库存：${product.stock}</span>
      </div>
    </button>
  `;
}

function createProductPaymentMarkup(product) {
  const soldOut = !product.isActive || product.stock <= 0;
  const selectedOption = getSelectedOption(product);

  return `
    <div class="product-payment-shell">
      <div class="product-payment-summary">
        <div class="product-payment-copy">
          <span class="product-payment-label">当前规格</span>
          <strong class="product-payment-name">${selectedOption.label}</strong>
        </div>
        <span class="product-payment-price">${formatCurrency(selectedOption.priceCents)}</span>
      </div>
      <div class="product-payment-actions">
        <button
          class="pay-button pay-button-alipay"
          type="button"
          ${soldOut ? "disabled" : "data-open-payment"}
          data-product-id="${product.id}"
          data-channel="alipay"
        >
          支付宝付款
        </button>
        <button
          class="pay-button pay-button-wechat"
          type="button"
          ${soldOut ? "disabled" : "data-open-payment"}
          data-product-id="${product.id}"
          data-channel="wechat"
        >
          微信付款
        </button>
      </div>
      <div class="product-payment-foot">
        <span>库存：${product.stock}</span>
        <span>${soldOut ? "状态：已售罄" : "交付：联系客服"}</span>
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
  currentQuery = query;
  ensureSelectedOptions();
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
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="option-list">
              ${product.options
                .map((option, optionIndex) =>
                  createOptionMarkup(product, option, optionIndex),
                )
                .join("")}
            </div>
            ${createProductPaymentMarkup(product)}
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
    "请发送：购买商品、规格、支付渠道、支付时间。客服确认收款后会继续处理并完成交付。";

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

  const optionButton = target.closest("[data-select-option]");
  if (optionButton instanceof HTMLElement) {
    selectedOptions[optionButton.dataset.productId] = Number(
      optionButton.dataset.optionIndex || 0,
    );
    renderProducts(currentQuery);
    return;
  }

  const paymentButton = target.closest("[data-open-payment]");
  if (paymentButton instanceof HTMLElement) {
    const product = storeConfig.products.find(
      (item) => item.id === paymentButton.dataset.productId,
    );
    const selectedOption = product ? getSelectedOption(product) : null;
    if (!product || !selectedOption) {
      return;
    }
    openModal(
      product.id,
      selectedOption.label,
      selectedOption.priceCents,
      paymentButton.dataset.channel,
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

async function loadConfig() {
  const response = await fetch("./data/store-config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("加载商品配置失败。");
  }

  storeConfig = await response.json();
  ensureSelectedOptions();
  setBrand();
  renderAnnouncements();
  renderContacts();
  renderProducts();
}

loadConfig().catch((error) => {
  console.error(error);
  catalogSummary.textContent = "配置加载失败，请检查 docs/data/store-config.json";
  emptyState.hidden = false;
  emptyState.innerHTML = `
    <h2>商品配置加载失败</h2>
    <p>请检查 docs/data/store-config.json 是否存在且格式正确。</p>
  `;
});
