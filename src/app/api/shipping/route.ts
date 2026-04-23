import { NextRequest, NextResponse } from "next/server";
import { quoteShipping } from "@/lib/shipping";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const weight = Number(url.searchParams.get("weight") || 0);
  const country = url.searchParams.get("country") || "US";
  const pickup = url.searchParams.get("pickup") === "1";
  return NextResponse.json(quoteShipping(weight, country, pickup));
}
