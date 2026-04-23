export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-white/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          © {year} {process.env.NEXT_PUBLIC_STORE_NAME || "Retro Rack"}. Ship nationwide · Local pickup available.
        </div>
        <div className="flex gap-4">
          <a className="nav-link" href="/shop">Shop</a>
          <a className="nav-link" href="/cart">Cart</a>
          <a className="nav-link" href="/admin">Admin</a>
        </div>
      </div>
    </footer>
  );
}
