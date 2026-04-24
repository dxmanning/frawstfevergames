import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSettings } from "@/models/Settings";
import { getStallionRates, pickBestRate } from "@/lib/stallion";
import { quoteShipping } from "@/lib/shipping";

/**
 * POST /api/shipping/rates
 * Body: { weightGrams, postalCode, province?, city?, country? }
 * Returns the best live Stallion rate; falls back to static estimate if API fails
 * or required origin/destination info is missing.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const weightGrams = Number(body.weightGrams) || 0;
  const destPostal = String(body.postalCode || "").trim();
  const destProvince = String(body.province || "").trim().toUpperCase();
  const destCity = String(body.city || "").trim();
  const destCountry = String(body.country || "CA").trim().toUpperCase();

  // Load store origin from Settings
  let originAddress1 = "";
  let originCity = "";
  let originPostal = "";
  let originProvince = "ON";
  try {
    await connectDB();
    const s = await getSettings();
    originAddress1 = s.pickupAddress?.trim() || "";
    originCity = s.pickupCity?.trim() || "";
    // Admin can configure a split "City, ST" value — split once
    const m = originCity.match(/^(.+?),\s*([A-Za-z]{2})$/);
    if (m) {
      originCity = m[1].trim();
      originProvince = m[2].toUpperCase();
    }
    // Try to pull postal + province from the pickupAddress if separated by |
    const addrMatch = originAddress1.match(/^(.+?)\s*\|\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)\s*\|?\s*([A-Z]{2})?$/i);
    if (addrMatch) {
      originAddress1 = addrMatch[1].trim();
      originPostal = addrMatch[2].toUpperCase().replace(/\s+/g, "");
      if (addrMatch[3]) originProvince = addrMatch[3].toUpperCase();
    }
  } catch { /* fall through to estimate */ }

  const hasOrigin = !!(originAddress1 && originCity && originPostal);
  const hasDest = !!(destPostal && destCountry === "CA");

  if (hasOrigin && hasDest && weightGrams > 0 && process.env.STALLION_API_TOKEN) {
    try {
      const rates = await getStallionRates({
        from_address: {
          name: "Frawst Fever Games",
          address1: originAddress1,
          city: originCity,
          province_code: originProvince,
          postal_code: originPostal,
          country_code: "CA",
        },
        to_address: {
          name: "Customer",
          address1: "—", // not required for rate quote but some endpoints want it
          city: destCity || "—",
          province_code: destProvince || "ON",
          postal_code: destPostal.toUpperCase().replace(/\s+/g, ""),
          country_code: destCountry,
        },
        weight: weightGrams,
        weight_unit: "g",
      });
      const best = pickBestRate(rates);
      if (best) {
        return NextResponse.json({
          source: "stallion",
          amount: Math.round(best.rate * 100) / 100,
          label: `${best.carrier} ${best.service}${best.delivery_days ? ` · ${best.delivery_days}` : ""}`,
          rates, // all options in case UI wants to let user pick
        });
      }
    } catch (e) {
      console.warn("[Shipping] Stallion fallback:", e instanceof Error ? e.message : e);
    }
  }

  // Fallback to static estimate
  const q = quoteShipping(weightGrams, destCountry, false);
  return NextResponse.json({
    source: "estimate",
    amount: q.amount,
    label: q.label,
    rates: [],
  });
}
