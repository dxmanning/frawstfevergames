import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          <Link href="/admin" className="btn btn-ghost">Dashboard</Link>
          <Link href="/admin/products" className="btn btn-ghost">Products</Link>
          <Link href="/admin/products/new" className="btn btn-ghost">+ New</Link>
          <Link href="/admin/orders" className="btn btn-ghost">Orders</Link>
          <Link href="/admin/users" className="btn btn-ghost">Users</Link>
          <Link href="/admin/pricing" className="btn btn-ghost">Price sync</Link>
        </nav>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
