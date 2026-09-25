export function formatCurrency(amount, options = {}) {
  const {
    locale = "en-NG",
    currency = "NGN",
    maximumFractionDigits = 0,
  } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(amount);
}
