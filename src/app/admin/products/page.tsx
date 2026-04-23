import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { money } from "@/lib/money";
import RowActions from "@/components/admin/RowActions";

export const dynamic = "force-dynamic";

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  await connectDB();
  const filter = q ? { $text: { $search: q } } : {};
  const products = await Product.find(filter).sort({ updatedAt: -1 }).limit(200).lean();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Products ({products.length})</h1>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search title / publisher…"
            className="input max-w-xs"
          />
          <button className="btn btn-ghost">Search</button>
        </form>
        <Link href="/admin/products/new" className="btn btn-primary">+ New product</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Platform</th>
              <th>Variants</th>
              <th>Stock</th>
              <th>Min price</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => {
              const variants = Array.isArray(p.variants) ? p.variants : [];
              const stock = variants.reduce((a: number, v: any) => a + (v?.stock || 0), 0);
              const inStock = variants.filter((v: any) => (v?.stock || 0) > 0);
              const minPrice = inStock.length
                ? Math.min(...inStock.map((v: any) => v.price))
                : null;
              return (
                <tr key={p._id}>
                  <td>
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImage}
                        alt=""
                        className="w-10 h-14 object-cover rounded border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-white/5 rounded" />
                    )}
                  </td>
                  <td>
                    <Link href={`/shop/${p.slug}`} className="hover:underline" target="_blank">
                      {p.title}
                    </Link>
                    <div className="text-xs text-white/40">{p.slug}</div>
                  </td>
                  <td>{p.platform}</td>
                  <td>{variants.length}</td>
                  <td className={stock === 0 ? "text-[#ff3da6]" : ""}>{stock}</td>
                  <td>{minPrice !== null ? money(minPrice) : "—"}</td>
                  <td className="text-right pr-4">
                    <RowActions id={String(p._id)} slug={p.slug} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
