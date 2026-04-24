import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSettings } from "@/models/Settings";
import { getStallionRates, pickBestRate } from "@/lib/stallion";
import { quoteShipping } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanPostal(p: string): string {
  return p.toUpperCase().replace(/\s+/g, "");
}
function validCanadianPostal(p: string): boolean {
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanPostal(p));
}

/**
 * POST /api/shipping/rates
 * Body: { weightGrams, postalCode, province?, city?, country? }
 * Returns the best live Stallion rate; falls back to static estimate if API fails
 * or required origin/destination info is missing.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const weightGrams = Number(body.weightGrams) || 0;
  const destPostalRaw = String(body.postalCode || "").trim();
  const destPostal = cleanPostal(destPostalRaw);
  const destProvince = String(body.province || "").trim().toUpperCase();
  const destCity = String(body.city || "").trim();
  const destCountry = String(body.country || "CA").trim().toUpperCase();

  // Load origin from Settings
  let origin = { line1: "", city: "", postal: "", province: "", country: "CA" };
  const debug: string[] = [];

  try {
    await connectDB();
    const s = await getSettings();

    // Prefer the new structured fields
    origin = {
      line1: (s.pickupLine1 || s.pickupAddress || "").trim(),
      city: (s.pickupCity || "").replace(/,\s*[A-Z]{2}\s*$/i, "").trim(),
      postal: cleanPostal(s.pickupPostalCode || ""),
      province: (s.pickupProvince || "").trim().toUpperCase()
        || (s.pickupCity?.match(/,\s*([A-Z]{2})\s*$/i)?.[1]?.toUpperCase() || ""),
      country: (s.pickupCountry || "CA").trim().toUpperCase(),
    };

    // Fallback parse of legacy combined pickupAddress: "Street | Postal | Province"
    if (!origin.postal || !origin.province) {
      const m = (s.pickupAddress || "").match(/^(.+?)\s*\|\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)\s*\|?\s*([A-Z]{2})?$/i);
      if (m) {
        if (!origin.line1) origin.line1 = m[1].trim();
        if (!origin.postal) origin.postal = cleanPostal(m[2]);
        if (!origin.province && m[3]) origin.province = m[3].toUpperCase();
      }
    }
  } catch (e) {
    debug.push(`Settings load failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Validate origin completeness + postal format
  if (!origin.line1) debug.push("Origin address line is empty (Admin → Settings → Store info → Pickup address line 1).");
  if (!origin.city) debug.push("Origin city is empty (Admin → Settings → Store info → Pickup city).");
  if (!origin.postal) debug.push("Origin postal code is empty (Admin → Settings → Store info → Pickup postal code).");
  else if (!validCanadianPostal(origin.postal)) debug.push(`Origin postal "${origin.postal}" is not a valid Canadian postal code (expected format: A1A1A1).`);
  if (!origin.province) debug.push("Origin province is empty (Admin → Settings → Store info → Pickup province).");

  // Validate destination
  if (!destPostal) debug.push("Destination postal code is missing.");
  else if (destCountry === "CA" && !validCanadianPostal(destPostal)) debug.push(`Destination postal "${destPostalRaw}" is not a valid Canadian postal code.`);
  if (weightGrams <= 0) debug.push("Weight is zero — product weights might not be set.");

  if (!process.env.STALLION_API_TOKEN) debug.push("STALLION_API_TOKEN is not set.");

  const hasOrigin = !!(origin.line1 && origin.city && validCanadianPostal(origin.postal) && origin.province);
  const hasDest = !!(destPostal && destCountry === "CA" && validCanadianPostal(destPostal));

  if (hasOrigin && hasDest && weightGrams > 0 && process.env.STALLION_API_TOKEN) {
    try {
      const rates = await getStallionRates({
        from_address: {
          name: "Frawst Fever Games",
          address1: origin.line1,
          city: origin.city,
          province_code: origin.province,
          postal_code: origin.postal,
          country_code: origin.country || "CA",
        },
        to_address: {
          name: "Customer",
          address1: "—",
          city: destCity || "—",
          province_code: destProvince || "ON",
          postal_code: destPostal,
          country_code: destCountry,
        },
        weight: weightGrams,
        weight_unit: "g",
      });
      debug.push(`Stallion returned ${rates.length} rate${rates.length === 1 ? "" : "s"}.`);
      const best = pickBestRate(rates);
      if (best) {
        return NextResponse.json({
          source: "stallion",
          amount: Math.round(best.rate * 100) / 100,
          label: `${best.carrier} ${best.service}${best.delivery_days ? ` · ${best.delivery_days}` : ""}`,
          rates,
          debug,
        });
      }
      debug.push("Stallion returned no usable rates.");
    } catch (e) {
      debug.push(`Stallion API call failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Fallback to static estimate
  const q = quoteShipping(weightGrams, destCountry, false);
  return NextResponse.json({
    source: "estimate",
    amount: q.amount,
    label: q.label,
    rates: [],
    debug,
  });
}
