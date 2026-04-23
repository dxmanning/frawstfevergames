"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { useEffect, useState } from "react";

export default function Nav() {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Retro Rack";

  return (
    <header className="sticky top-0 z-30 backdrop-blur-lg bg-[rgba(11,4,20,0.65)] border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block w-8 h-8 rounded-md bg-gradient-to-br from-[#9b5cff] via-[#ff3da6] to-[#00e5ff]" />
          <span className="text-lg tracking-wider glow">{storeName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          <Link href="/shop" className="nav-link">Shop</Link>
          <Link href="/shop?platform=PS5" className="nav-link">PS5</Link>
          <Link href="/shop?platform=Switch" className="nav-link">Switch</Link>
          <Link href="/shop?platform=Xbox Series" className="nav-link">Xbox</Link>
          <Link href="/about" className="nav-link">About</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/cart" className="btn btn-ghost relative">
            <span>Cart</span>
            {mounted && count > 0 && (
              <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-[#ff3da6] rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
