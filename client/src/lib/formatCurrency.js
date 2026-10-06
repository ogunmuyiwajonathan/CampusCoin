// Naira amounts are shown with the kobo only when there is some: 2,500.50 keeps
// its decimals, 2,500 does not pick up a meaningless ".00". Anything that reaches
// here is rounded to two places first so a float wobble cannot print 2,500.4999.
export function formatCurrency(amount, options = {}) {
  const {
    locale = "en-NG",
    currency = "NGN",
    minimumFractionDigits,
    maximumFractionDigits,
    ...rest
  } = options;
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric : 0;
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded - Math.trunc(rounded)) > 0;
  // Whole naira amounts do not pick up a meaningless ".00" unless the caller
  // asks for fixed digits (Rix shows every draft with two).
  const digits = hasCents ? 2 : 0;
  const minDigits = minimumFractionDigits ?? digits;
  const maxDigits = Math.max(maximumFractionDigits ?? digits, minDigits);

  return new Intl.NumberFormat(locale, {
    ...rest,
    style: "currency",
    currency,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(rounded);
}
