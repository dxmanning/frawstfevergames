import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  await clearSessionCookie();
  // Also clear the customer cookie so the Nav updates correctly
  const store = await cookies();
  store.delete("rr_user");
  return NextResponse.json({ ok: true });
}
