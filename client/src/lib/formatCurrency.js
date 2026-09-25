/**
 * Shared Naira currency formatting (single source of truth - SRS reports and
 * dashboard must render amounts identically). Configurable for other locales.
 */
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
