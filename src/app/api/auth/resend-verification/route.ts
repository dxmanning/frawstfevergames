import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateVerifyCode, sendVerificationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({ ok: true, message: "If an account exists, a verification code has been sent." });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    const code = generateVerifyCode();
    user.verifyToken = code;
    user.verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    await sendVerificationEmail(user.email, user.name, code);

    return NextResponse.json({ ok: true, message: "New verification code sent." });
  } catch (e: unknown) {
    console.error("[Resend Verification]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resend" },
      { status: 500 }
    );
  }
}
