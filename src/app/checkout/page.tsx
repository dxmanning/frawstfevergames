"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/money";
import { quoteShipping } from "@/lib/shipping";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, totalWeight, allowsPickup, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Auto-fill from logged-in user profile
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.name) return;
        setForm((f) => ({
          ...f,
          name: f.name || data.name,
          email: f.email || data.email,
          phone: f.phone || data.phone || "",
          line1: f.line1 || data.address?.line1 || "",
          line2: f.line2 || data.address?.line2 || "",
          city: f.city || data.address?.city || "",
          state: f.state || data.address?.state || "",
          postalCode: f.postalCode || data.address?.postalCode || "",
        }));
        if (data.address?.country) setCountry((c) => c || data.address.country);
      })
      .catch(() => {});
  }, []);

  const canPickup = allowsPickup();
  const [fulfillment, setFulfillment] = useState<"ship" | "pickup">(canPickup ? "pickup" : "ship");
  const [country, setCountry] = useState("US");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ship = useMemo(
    () => quoteShipping(totalWeight(), country, fulfillment === "pickup"),
    [totalWeight, country, fulfillment]
  );

  const sub = subtotal();
  const total = sub + ship.amount;

  if (!mounted) return null;
  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Nothing to check out</h1>
        <Link href="/shop" className="btn btn-primary mt-6">Browse games →</Link>
      </div>
    );
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          contact: { ...form, country },
          notes,
          items: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clear();
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/checkout/success?n=${encodeURIComponent(data.orderNumber)}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-[1fr_22rem] gap-6">
      <form className="card p-6 space-y-5" onSubmit={placeOrder}>
        <h1 className="text-2xl font-bold">Checkout</h1>

        <div>
          <div className="label">Fulfillment</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFulfillment("ship")}
              className={`btn ${fulfillment === "ship" ? "btn-primary" : "btn-ghost"} justify-center`}
            >
              🚚 Ship to me
            </button>
            <button
              type="button"
              disabled={!canPickup}
              onClick={() => setFulfillment("pickup")}
              className={`btn ${fulfillment === "pickup" ? "btn-primary" : "btn-ghost"} justify-center disabled:opacity-40`}
              title={canPickup ? "" : "One or more items are ship-only"}
            >
              📍 Local pickup
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Full name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {fulfillment === "ship" && (
            <div>
              <label className="label">Country</label>
              <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other (international)</option>
              </select>
            </div>
          )}
        </div>

        {fulfillment === "ship" && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="label">Address line 1</label>
              <input required className="input" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address line 2 (optional)</label>
              <input className="input" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input required className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="label">State / Region</label>
              <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="label">Postal code</label>
              <input required className="input" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Order notes (optional)</label>
          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Pickup time preference, special requests…"
          />
        </div>

        {error && <div className="text-[#ff3da6] text-sm">{error}</div>}

        <button type="submit" disabled={submitting} className="btn btn-primary w-full justify-center">
          {submitting ? "Placing order…" : `Place order · ${money(total)}`}
        </button>
        <p className="text-xs text-white/60">
          We'll email you a payment link to complete this order. Stock is reserved for 24 hours.
        </p>
      </form>

      <aside className="card p-5 h-fit sticky top-20 space-y-3">
        <div className="font-semibold">Order summary</div>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.variantId} className="flex justify-between text-sm">
              <div className="min-w-0 pr-2">
                <div className="truncate">{l.title}</div>
                <div className="text-xs text-white/50">
                  {l.platform} · {l.conditionLabel} × {l.qty}
                </div>
              </div>
              <div>{money(l.price * l.qty)}</div>
            </div>
          ))}
        </div>
        <hr className="border-white/10" />
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Subtotal</span>
          <span>{money(sub)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/70">{ship.label}</span>
          <span>{ship.amount === 0 ? "Free" : money(ship.amount)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/10">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </aside>
    </div>
  );
}
