import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { money } from "@/lib/money";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";

export const dynamic = "force-dynamic";

export default async function OrdersAdmin() {
  await connectDB();
  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(200).lean();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders ({orders.length})</h1>
      <div className="space-y-3">
        {orders.map((o: any) => (
          <div key={o._id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm">{o.orderNumber}</div>
                <div className="text-xs text-white/60">
                  {new Date(o.createdAt).toLocaleString()}
                </div>
                <div className="mt-1">
                  <b>{o.contact?.name}</b> · {o.contact?.email}
                  {o.contact?.phone ? ` · ${o.contact.phone}` : ""}
                </div>
                <div className="text-xs text-white/70">
                  {o.fulfillment === "pickup" ? (
                    "📍 Local pickup"
                  ) : (
                    <>
                      🚚 {o.contact?.line1}, {o.contact?.city}, {o.contact?.state}{" "}
                      {o.contact?.postalCode}, {o.contact?.country}
                    </>
                  )}
                </div>
                {o.notes && <div className="text-xs text-white/60 mt-1 italic">“{o.notes}”</div>}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{money(o.total)}</div>
                <div className="text-xs text-white/60">
                  Sub {money(o.subtotal)} · Ship {money(o.shipping)}
                </div>
                <div className="mt-2">
                  <OrderStatusSelect id={String(o._id)} status={o.status} />
                </div>
              </div>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-2">
              {o.items.map((it: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm border-t border-white/10 pt-2">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" className="w-10 h-14 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <div>
                      {it.title} <span className="text-white/50">({it.platform})</span>
                    </div>
                    <div className="text-xs text-white/60">
                      {it.conditionCode} · SKU {it.sku} · Qty {it.qty}
                    </div>
                  </div>
                  <div className="font-semibold">{money(it.price * it.qty)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
