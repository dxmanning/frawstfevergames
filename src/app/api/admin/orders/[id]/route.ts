import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

const ALLOWED = new Set(["pending", "paid", "ready_pickup", "shipped", "completed", "cancelled"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, notes } = await req.json();
  if (status && !ALLOWED.has(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  await connectDB();
  const patch: Record<string, unknown> = {};
  if (status) patch.status = status;
  if (typeof notes === "string") patch.notes = notes;
  const doc = await Order.findByIdAndUpdate(id, patch, { new: true });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: doc.status });
}
