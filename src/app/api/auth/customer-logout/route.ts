import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const store = await cookies();
  store.delete("rr_user");
  return NextResponse.json({ ok: true });
}
