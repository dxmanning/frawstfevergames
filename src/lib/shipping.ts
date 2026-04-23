export type ShippingZone = "domestic" | "international" | "pickup";

export interface ShippingQuote {
  zone: ShippingZone;
  weightGrams: number;
  amount: number;
  label: string;
}

const DOMESTIC_TABLE: Array<{ maxG: number; price: number }> = [
  { maxG: 250, price: 5 },
  { maxG: 500, price: 7 },
  { maxG: 1000, price: 10 },
  { maxG: 2000, price: 14 },
  { maxG: 5000, price: 22 },
];

export function quoteShipping(
  totalWeightGrams: number,
  country = "US",
  pickup = false
): ShippingQuote {
  if (pickup) {
    return { zone: "pickup", weightGrams: totalWeightGrams, amount: 0, label: "Local pickup — Free" };
  }
  if (country && country.toUpperCase() !== "US") {
    // Simple international approximation
    const kg = Math.max(0.25, totalWeightGrams / 1000);
    const amount = Math.round((18 + kg * 12) * 100) / 100;
    return { zone: "international", weightGrams: totalWeightGrams, amount, label: "International (est.)" };
  }
  const row = DOMESTIC_TABLE.find((r) => totalWeightGrams <= r.maxG);
  if (row) {
    return { zone: "domestic", weightGrams: totalWeightGrams, amount: row.price, label: "USPS / Ground (est.)" };
  }
  const extraKg = Math.ceil((totalWeightGrams - 5000) / 1000);
  return {
    zone: "domestic",
    weightGrams: totalWeightGrams,
    amount: 22 + extraKg * 3,
    label: "USPS / Ground (est., heavy)",
  };
}
