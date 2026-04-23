import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, signSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  await connectDB();

  // Look up admin user in DB
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: "admin" });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });
  }

  const token = await signSession(user.email);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
