import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { quoteShipping } from "@/lib/shipping";
import { randomSuffix } from "@/lib/slug";
import { getCustomerSession } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fulfillment, contact, items, notes } = body as {
      fulfillment: "ship" | "pickup";
      contact: {
        name: string;
        email: string;
        phone?: string;
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      items: { productId: string; variantId: string; qty: number }[];
      notes?: string;
    };

    if (!items?.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    if (!contact?.name || !contact?.email)
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    if (fulfillment === "ship" && (!contact.line1 || !contact.city || !contact.postalCode))
      return NextResponse.json({ error: "Shipping address incomplete" }, { status: 400 });

    await connectDB();

    // Attach logged-in user if available
    const session = await getCustomerSession();

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await Product.find({ _id: { $in: productIds } });

    const resolved = [] as Array<{
      productId: string;
      variantId: string;
      title: string;
      platform: string;
      conditionCode: string;
      sku: string;
      price: number;
      qty: number;
      image?: string;
      weightGrams: number;
      localPickupOK: boolean;
    }>;

    for (const it of items) {
      const p = products.find((p) => String(p._id) === it.productId);
      if (!p) return NextResponse.json({ error: "Product not found" }, { status: 400 });
      const v = p.variants.find((v) => String(v._id) === it.variantId);
      if (!v) return NextResponse.json({ error: "Variant not found" }, { status: 400 });
      if (v.stock < it.qty)
        return NextResponse.json(
          { error: `Insufficient stock for ${p.title} (${v.sku})` },
          { status: 400 }
        );
      resolved.push({
        productId: String(p._id),
        variantId: String(v._id),
        title: p.title,
        platform: p.platform,
        conditionCode: v.conditionCode,
        sku: v.sku,
        price: v.price,
        qty: it.qty,
        image: p.coverImage,
        weightGrams: p.weightGrams || 180,
        localPickupOK: !!p.localPickupAvailable,
      });
    }

    if (fulfillment === "pickup" && !resolved.every((r) => r.localPickupOK))
      return NextResponse.json({ error: "One or more items are ship-only" }, { status: 400 });

    const subtotal = resolved.reduce((a, r) => a + r.price * r.qty, 0);
    const weight = resolved.reduce((a, r) => a + r.weightGrams * r.qty, 0);
    const ship = quoteShipping(weight, contact.country || "US", fulfillment === "pickup");
    const total = subtotal + ship.amount;

    // Decrement stock atomically
    for (const r of resolved) {
      const res = await Product.updateOne(
        { _id: r.productId, "variants._id": r.variantId, "variants.stock": { $gte: r.qty } },
        { $inc: { "variants.$.stock": -r.qty } }
      );
      if (res.modifiedCount !== 1) {
        return NextResponse.json(
          { error: `Stock changed for ${r.title}, please retry.` },
          { status: 409 }
        );
      }
    }

    const orderNumber = `RR-${Date.now().toString(36).toUpperCase()}-${randomSuffix(3).toUpperCase()}`;
    const order = await Order.create({
      orderNumber,
      userId: session?.userId || undefined,
      items: resolved.map((r) => ({
        productId: r.productId,
        variantId: r.variantId,
        title: r.title,
        platform: r.platform,
        conditionCode: r.conditionCode,
        sku: r.sku,
        price: r.price,
        qty: r.qty,
        image: r.image,
      })),
      subtotal,
      shipping: ship.amount,
      tax: 0,
      total,
      fulfillment,
      contact,
      status: "pending",
      notes,
    });

    return NextResponse.json({ orderNumber: order.orderNumber, id: String(order._id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Order failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
