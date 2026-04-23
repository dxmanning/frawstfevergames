export function money(
  n: number,
  currency = process.env.NEXT_PUBLIC_STORE_CURRENCY || process.env.STORE_CURRENCY || "USD"
) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
