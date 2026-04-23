import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/resend";

/** GET /api/admin/users — list with pagination & search */
export async function GET(req: NextRequest) {
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize")) || 25));
  const role = sp.get("role") || "";

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }
  if (role) filter.role = role;

  const total = await User.countDocuments(filter);
  const totalPages = Math.ceil(total / pageSize);
  const items = await User.find(filter)
    .select("-passwordHash -verifyToken -verifyTokenExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return NextResponse.json({ items, total, page, pageSize, totalPages });
}

/** POST /api/admin/users — admin creates a new user */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, skipVerification } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = skipVerification ? undefined : crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = skipVerification ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      emailVerified: !!skipVerification,
      verifyToken,
      verifyTokenExpires,
      role: role === "admin" ? "admin" : "customer",
    });

    if (!skipVerification && verifyToken) {
      try {
        await sendVerificationEmail(user.email, name, verifyToken);
      } catch (e) {
        console.error("[Admin Create User] Failed to send verification email:", e);
      }
    }

    return NextResponse.json({ id: String(user._id), email: user.email });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
