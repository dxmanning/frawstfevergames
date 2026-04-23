import Link from "next/link";

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl">🎮</div>
      <h1 className="mt-3 text-3xl font-bold">Order received!</h1>
      <p className="text-white/70 mt-2">
        Your order <span className="font-mono text-white">{n || ""}</span> is in.
        We'll email you shortly with payment instructions.
      </p>
      <Link href="/shop" className="btn btn-primary mt-8">Keep shopping</Link>
    </div>
  );
}
