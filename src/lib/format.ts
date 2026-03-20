const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function formatDateTime(input: Date | string | null | undefined) {
  if (!input) {
    return "未记录";
  }

  return dateTimeFormatter.format(new Date(input));
}

export function pluralizeInventory(count: number) {
  return `${count} 条可售库存`;
}
