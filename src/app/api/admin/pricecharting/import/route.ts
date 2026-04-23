import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { parseCSV } from "@/lib/csv";
import {
  pcDownloadCustomCSV,
  mapConsoleToPlatform,
  parseFlexPrice,
} from "@/lib/pricecharting";
import { slugify, randomSuffix } from "@/lib/slug";

/**
 * POST /api/admin/pricecharting/import
 * Body: { dryRun?: boolean, limit?: number, defaultStock?: number, overwrite?: boolean }
 *
 * Fetches your PriceCharting custom price guide CSV, parses it, and creates
 * Product documents for each row. Each product gets up to 3 variants created
 * automatically — one per condition we have a PC price for (New / CIB / Loose).
 *
 * - dryRun:     true → returns the plan without inserting (preview first)
 * - limit:      cap how many rows to process (default 250)
 * - defaultStock: stock to set on the created variants (default 0)
 * - overwrite:  if a product with the same priceChartingId exists, update it instead of skipping
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      dryRun?: boolean;
      limit?: number;
      defaultStock?: number;
      overwrite?: boolean;
    };
    const dryRun = !!body.dryRun;
    const limit = Math.max(1, Math.min(5000, Number(body.limit) || 250));
    const defaultStock = Math.max(0, Math.floor(Number(body.defaultStock) || 0));
    const overwrite = !!body.overwrite;

    const csv = await pcDownloadCustomCSV();
    const rows = parseCSV(csv);
    if (rows.length === 0)
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });

    await connectDB();

    const report = {
      csvRows: rows.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      dryRun,
      sample: [] as any[],
      errors: [] as string[],
    };

    const slice = rows.slice(0, limit);
    for (const r of slice) {
      const id = (r.id || r["product-id"] || "").trim();
      const title = (r["product-name"] || r.name || "").trim();
      const consoleName = (r["console-name"] || r.console || "").trim();
      if (!id || !title) {
        report.skipped++;
        continue;
      }
      const platform = mapConsoleToPlatform(consoleName);
      const loose = parseFlexPrice(r["loose-price"]);
      const cib = parseFlexPrice(r["cib-price"]);
      const neu = parseFlexPrice(r["new-price"]);
      const boxOnly = parseFlexPrice(r["box-only-price"]);
      const manualOnly = parseFlexPrice(r["manual-only-price"]);

      const variants: any[] = [];
      if (neu !== undefined)
        variants.push({
          conditionCode: "NEW",
          sku: `${slugify(title).slice(0, 20)}-NEW-${randomSuffix(3)}`.toUpperCase(),
          price: neu,
          stock: defaultStock,
          hasBox: true,
          hasManual: true,
          hasDisc: true,
        });
      if (cib !== undefined)
        variants.push({
          conditionCode: "CIB",
          sku: `${slugify(title).slice(0, 20)}-CIB-${randomSuffix(3)}`.toUpperCase(),
          price: cib,
          stock: defaultStock,
          hasBox: true,
          hasManual: true,
          hasDisc: true,
        });
      if (loose !== undefined)
        variants.push({
          conditionCode: "DO",
          sku: `${slugify(title).slice(0, 20)}-DO-${randomSuffix(3)}`.toUpperCase(),
          price: loose,
          stock: defaultStock,
          notes: "Disc/cart only (loose)",
          hasBox: false,
          hasManual: false,
          hasDisc: true,
        });
      if (boxOnly !== undefined)
        variants.push({
          conditionCode: "BOX",
          sku: `${slugify(title).slice(0, 20)}-BOX-${randomSuffix(3)}`.toUpperCase(),
          price: boxOnly,
          stock: defaultStock,
          hasBox: true,
          hasManual: false,
          hasDisc: false,
        });
      if (manualOnly !== undefined)
        variants.push({
          conditionCode: "MAN",
          sku: `${slugify(title).slice(0, 20)}-MAN-${randomSuffix(3)}`.toUpperCase(),
          price: manualOnly,
          stock: defaultStock,
          hasBox: false,
          hasManual: true,
          hasDisc: false,
        });

      if (variants.length === 0) {
        report.skipped++;
        continue;
      }

      const referencePrice = loose ?? cib ?? neu;

      const planned = {
        priceChartingId: id,
        title,
        platform,
        variants: variants.length,
        referencePrice,
      };
      if (report.sample.length < 10) report.sample.push(planned);

      if (dryRun) {
        report.processed++;
        continue;
      }

      try {
        const existing = await Product.findOne({ priceChartingId: id });
        if (existing) {
          if (!overwrite) {
            report.skipped++;
            continue;
          }
          existing.title = title;
          existing.platform = platform;
          existing.pcLoose = loose;
          existing.pcCIB = cib;
          existing.pcNew = neu;
          existing.referencePrice = referencePrice ?? existing.referencePrice;
          existing.lastPriceSyncAt = new Date();
          await existing.save();
          report.updated++;
        } else {
          let base = slugify(`${title}-${platform}`);
          let slug = base;
          while (await Product.exists({ slug })) slug = `${base}-${randomSuffix(3)}`;

          await Product.create({
            slug,
            title,
            platform,
            priceChartingId: id,
            coverImage: "",
            images: [],
            description: "",
            genre: r.genre ? [r.genre] : [],
            releaseYear: r["release-date"]
              ? Number(String(r["release-date"]).slice(0, 4)) || undefined
              : undefined,
            weightGrams: 180,
            localPickupAvailable: true,
            variants,
            pcLoose: loose,
            pcCIB: cib,
            pcNew: neu,
            referencePrice,
            lastPriceSyncAt: new Date(),
            featured: false,
          });
          report.created++;
        }
        report.processed++;
      } catch (e: unknown) {
        report.errors.push(
          `${title} (${id}): ${e instanceof Error ? e.message : "save failed"}`
        );
      }
    }

    return NextResponse.json(report);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
