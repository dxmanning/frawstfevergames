import { NextResponse } from "next/server";
import { getUsdToCadRate } from "@/lib/forex";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public endpoint — the storefront currency toggle reads this to convert displayed prices.
// Safe to expose (rate is public info).
export async function GET() {
  const r = await getUsdToCadRate();
  return NextResponse.json({
    rate: r.rate,
    source: r.source,
    asOf: r.asOf,
  });
}
