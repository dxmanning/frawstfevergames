import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import {
  pcProductById,
  centsToUSD,
  priceForCondition,
} from "@/lib/pricecharting";

/**
 * POST /api/admin/pricecharting/sync
 * Body: { productIds?: string[], applyToSellPrice?: boolean, markupPct?: number }
 *
 * Loops over products with a `priceChartingId` (or the provided list), fetches
 * current PriceCharting prices, and updates:
 *   - referencePrice   (displayed as "market reference" on the listing)
 *   - pcLoose / pcCIB / pcNew snapshot fields
 *   - lastPriceSyncAt
 *
 * If `applyToSellPrice` is true, each variant's selling price is also updated
 * to the PriceCharting price for its condition, multiplied by (1 + markupPct/100).
 * Otherwise only reference prices change — safe default.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      productIds?: string[];
      applyToSellPrice?: boolean;
      markupPct?: number;
    };
    const applyToSellPrice = !!body.applyToSellPrice;
    const markup = Number(body.markupPct || 0) / 100;

    await connectDB();
    const filter: Record<string, unknown> = body.productIds?.length
      ? { _id: { $in: body.productIds } }
      : { priceChartingId: { $exists: true, $ne: "" } };
    const products = await Product.find(filter);

    const report = {
      total: products.length,
      updated: 0,
      skipped: 0,
      variantsUpdated: 0,
      errors: [] as string[],
    };

    for (const p of products) {
      if (!p.priceChartingId) {
        report.skipped++;
        continue;
      }
      try {
        const pc = await pcProductById(p.priceChartingId);
        const loose = centsToUSD(pc["loose-price"]);
        const cib = centsToUSD(pc["cib-price"]);
        const neu = centsToUSD(pc["new-price"]);
        p.pcLoose = loose;
        p.pcCIB = cib;
        p.pcNew = neu;
        p.referencePrice = loose ?? cib ?? neu ?? p.referencePrice;
        p.lastPriceSyncAt = new Date();

        if (applyToSellPrice) {
          for (const v of p.variants) {
            const cents = priceForCondition(pc, v.conditionCode);
            const usd = centsToUSD(cents);
            if (usd !== undefined) {
              v.price = Math.round(usd * (1 + markup) * 100) / 100;
              report.variantsUpdated++;
            }
          }
        }
        await p.save();
        report.updated++;
      } catch (e: unknown) {
        report.errors.push(`${p.title}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }

    return NextResponse.json(report);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
