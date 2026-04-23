import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe
 * Stripe sends events here. Configure this URL in the Stripe Dashboard:
 *   https://frawstfevergames.ca/api/webhooks/stripe
 *
 * Events handled:
 *   - checkout.session.completed → mark order as "paid"
 *   - checkout.session.expired   → mark order as "cancelled", restore stock
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (e: unknown) {
      console.error("[Stripe Webhook] Signature verification failed:", e);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // No webhook secret configured — parse event directly (dev mode)
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentIntent = session.payment_intent;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.status === "pending") {
          order.status = "paid";
          order.stripePaymentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
          await order.save();
          console.log(`[Stripe Webhook] Order ${order.orderNumber} marked as paid`);
        }
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.status === "pending") {
          // Restore stock
          const { Product } = await import("@/models/Product");
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId, "variants._id": item.variantId },
              { $inc: { "variants.$.stock": item.qty } }
            );
          }
          order.status = "cancelled";
          await order.save();
          console.log(`[Stripe Webhook] Order ${order.orderNumber} expired — stock restored`);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      console.log(`[Stripe Webhook] Payment failed: ${intent.id} — ${intent.last_payment_error?.message || "unknown error"}`);
      break;
    }

    default:
      // Unhandled event type — just acknowledge
      break;
  }

  return NextResponse.json({ received: true });
}
