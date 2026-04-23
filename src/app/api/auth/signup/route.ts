import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { generateVerifyCode, sendVerificationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      // If exists but not verified, allow re-registration with new code
      if (!existing.emailVerified) {
        const code = generateVerifyCode();
        existing.name = name;
        existing.passwordHash = await bcrypt.hash(password, 12);
        existing.verifyToken = code;
        existing.verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await existing.save();

        await sendVerificationEmail(existing.email, name, code);
        return NextResponse.json({ ok: true, message: "Verification code sent to your email." });
      }
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateVerifyCode();

    await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      verifyToken: code,
      verifyTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });

    await sendVerificationEmail(email.toLowerCase().trim(), name, code);

    return NextResponse.json({ ok: true, message: "Verification code sent to your email." });
  } catch (e: unknown) {
    console.error("[Signup]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Signup failed" },
      { status: 500 }
    );
  }
}
