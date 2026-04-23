import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

/** GET /api/admin/users/:id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const user = await User.findById(id)
    .select("-passwordHash -verifyToken -verifyTokenExpires")
    .lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

/** PATCH /api/admin/users/:id */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.name !== undefined) user.name = body.name;
  if (body.email !== undefined) user.email = body.email.toLowerCase().trim();
  if (body.role !== undefined) user.role = body.role;
  if (body.emailVerified !== undefined) user.emailVerified = body.emailVerified;
  if (body.password && body.password.length >= 8) {
    user.passwordHash = await bcrypt.hash(body.password, 12);
  }

  await user.save();
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/users/:id */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const result = await User.findByIdAndDelete(id);
  if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
