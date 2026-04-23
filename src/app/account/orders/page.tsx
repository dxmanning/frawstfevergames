"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/money";

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/orders")
      .then(async (r) => {
        if (r.status === 401) { router.push("/login"); return []; }
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const statusColors: Record<string, string> = {
    pending: "text-yellow-400",
    paid: "text-blue-400",
    ready_pickup: "text-cyan-400",
    shipped: "text-purple-400",
    completed: "text-green-400",
    cancelled: "text-red-400",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link href="/account" className="btn btn-ghost text-sm">Account</Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-white/50" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-white/50 mb-4">You haven't placed any orders yet.</p>
          <Link href="/shop" className="btn btn-primary">Browse games</Link>
        </div>
      )}

      {!loading && orders.map((o: any) => (
        <div key={o._id} className="card p-5 mb-4 space-y-3">
          {/* Order header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono font-bold">{o.orderNumber}</span>
              <span className="text-white/40 text-xs ml-3">
                {new Date(o.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-semibold text-sm ${statusColors[o.status] || ""}`}>
                {o.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="chip">
                {o.fulfillment === "pickup" ? "Pickup" : "Ship"}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {o.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {item.image ? (
                  <img src={item.image} alt="" className="w-10 h-14 object-cover rounded border border-white/10" />
                ) : (
                  <div className="w-10 h-14 bg-white/5 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.title}</div>
                  <div className="text-xs text-white/50">
                    {item.platform} · {item.conditionCode} · {item.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div>{money(item.price)}</div>
                  <div className="text-xs text-white/50">x{item.qty}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
            <div className="text-white/50">
              Subtotal: {money(o.subtotal)}
              {o.shipping > 0 && <span> + Shipping: {money(o.shipping)}</span>}
            </div>
            <div className="font-bold text-lg">{money(o.total)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
