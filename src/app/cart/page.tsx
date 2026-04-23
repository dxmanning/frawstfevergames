"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/money";
import { useEffect, useState } from "react";

export default function CartPage() {
  const { lines, setQty, remove, subtotal, totalWeight } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <p className="text-white/70 mt-2">Time to grab some classics.</p>
        <Link href="/shop" className="btn btn-primary mt-6">Browse games →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-[1fr_20rem] gap-6">
      <div>
        <h1 className="text-3xl font-bold mb-5">Cart</h1>
        <div className="card divide-y divide-white/10">
          {lines.map((l) => (
            <div key={l.variantId} className="p-4 flex gap-4 items-center">
              <div className="w-16 h-20 rounded-md bg-black/40 overflow-hidden flex-shrink-0">
                {l.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/shop/${l.slug}`} className="font-semibold hover:underline">
                  {l.title}
                </Link>
                <div className="text-xs text-white/60 mt-0.5">
                  {l.platform} · {l.conditionLabel}
                </div>
                <div className="text-xs text-white/40">SKU {l.sku}</div>
              </div>
              <input
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) => setQty(l.variantId, Number(e.target.value))}
                className="input w-16 text-center"
              />
              <div className="w-24 text-right font-semibold">{money(l.price * l.qty)}</div>
              <button
                onClick={() => remove(l.variantId)}
                className="text-white/40 hover:text-[#ff3da6] text-xl leading-none px-1"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <aside className="card p-5 h-fit sticky top-20">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Subtotal</span>
          <span>{money(subtotal())}</span>
        </div>
        <div className="flex justify-between text-xs text-white/50 mt-1">
          <span>Estimated weight</span>
          <span>{(totalWeight() / 1000).toFixed(2)} kg</span>
        </div>
        <div className="text-xs text-white/50 mt-2">Shipping &amp; taxes calculated at checkout.</div>
        <Link href="/checkout" className="btn btn-primary w-full justify-center mt-4">
          Checkout →
        </Link>
        <Link href="/shop" className="btn btn-ghost w-full justify-center mt-2">
          Keep shopping
        </Link>
      </aside>
    </div>
  );
}
