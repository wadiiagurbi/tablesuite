export const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return priceFormatter.format(n);
}
