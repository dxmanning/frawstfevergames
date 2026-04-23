import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import {
  pcProductById,
  centsToUSD,
  priceForCondition,
} from "@/lib/pricecharting";

/**
 * POST /api/admin/pricecharting/sync
 * Streams progress via SSE.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    productIds?: string[];
    applyToSellPrice?: boolean;
    markupPct?: number;
  };
  const applyToSellPrice = !!body.applyToSellPrice;
  const markup = Number(body.markupPct || 0) / 100;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "status", message: "Loading products…" });

        await connectDB();
        const filter: Record<string, unknown> = body.productIds?.length
          ? { _id: { $in: body.productIds } }
          : { priceChartingId: { $exists: true, $ne: "" } };
        const products = await Product.find(filter);

        const total = products.length;
        send({ type: "init", total });

        let processed = 0, updated = 0, skipped = 0;
        const errors: string[] = [];

        for (const p of products) {
          if (!p.priceChartingId) {
            skipped++;
            processed++;
            send({ type: "progress", processed, total, created: 0, updated, skipped, errors: errors.length, log: `Skipped "${p.title}" — no PC ID` });
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

            let variantsUpdated = 0;
            if (applyToSellPrice) {
              for (const v of p.variants) {
                const cents = priceForCondition(pc, v.conditionCode);
                const usd = centsToUSD(cents);
                if (usd !== undefined) {
                  v.price = Math.round(usd * (1 + markup) * 100) / 100;
                  variantsUpdated++;
                }
              }
            }
            await p.save();
            updated++;
            processed++;
            send({ type: "progress", processed, total, created: 0, updated, skipped, errors: errors.length, log: `Updated "${p.title}" (${p.platform})${variantsUpdated ? ` — ${variantsUpdated} variant prices` : ""}` });
          } catch (e: unknown) {
            const errMsg = `${p.title}: ${e instanceof Error ? e.message : "failed"}`;
            errors.push(errMsg);
            processed++;
            send({ type: "progress", processed, total, created: 0, updated, skipped, errors: errors.length, log: `ERROR: ${errMsg}` });
          }
        }

        send({ type: "done", processed, total, created: 0, updated, skipped, errors: errors.length });
      } catch (e: unknown) {
        send({ type: "error", message: e instanceof Error ? e.message : "Sync failed" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
