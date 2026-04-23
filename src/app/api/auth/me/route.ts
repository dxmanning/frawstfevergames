import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.json({
    name: session.name,
    email: session.email,
    role: session.role,
  });
}
