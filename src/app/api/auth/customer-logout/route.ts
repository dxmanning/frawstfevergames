import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const store = await cookies();
  store.delete("rr_user");
  store.delete("rr_admin");
  return NextResponse.json({ ok: true });
}
