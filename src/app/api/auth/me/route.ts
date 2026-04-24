import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Fetch fresh data from DB so avatar updates reflect immediately
  await connectDB();
  const user = await User.findById(session.userId).select("name email role avatarUrl").lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const u = user as { name: string; email: string; role: string; avatarUrl?: string };
  return NextResponse.json({
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl || "",
  });
}
