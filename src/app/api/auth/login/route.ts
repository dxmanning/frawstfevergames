import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }
  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signSession(email);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
