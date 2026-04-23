import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { slugify, randomSuffix } from "@/lib/slug";

export async function GET() {
  await connectDB();
  const items = await Product.find({}).sort({ updatedAt: -1 }).limit(500).lean();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await connectDB();

  let slug = body.slug || slugify(`${body.title}-${body.platform}`);
  while (await Product.exists({ slug })) {
    slug = `${slugify(body.title)}-${randomSuffix()}`;
  }

  const doc = await Product.create({
    ...body,
    slug,
  });
  return NextResponse.json({ id: String(doc._id), slug: doc.slug });
}
