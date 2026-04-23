"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; role?: string } | null>(null);
  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.name) setUser(data); })
      .catch(() => {});
  }, []);
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Retro Rack";

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-lg border-b"
      style={{ background: "var(--bg-nav)", borderColor: "var(--border)" }}
    >
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {mounted && user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin" className="btn btn-ghost text-sm">
                  Admin
                </Link>
              )}
              <Link href="/account" className="btn btn-ghost text-sm">
                {user.name}
              </Link>
            </>
          ) : mounted ? (
            <Link href="/login" className="btn btn-ghost text-sm">
              Sign in
            </Link>
          ) : null}
          <Link href="/cart" className="btn btn-ghost relative">
            <span>Cart</span>
            {mounted && count > 0 && (
              <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-[#ff3da6] rounded-full w-5 h-5 flex items-center justify-center text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
