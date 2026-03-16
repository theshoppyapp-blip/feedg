import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { requireAdmin } from '@/lib/serverAuth';

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  await dbConnect();
  const products = await Product.find().sort({ name: 1 }).lean();
  return NextResponse.json({ products });
}

export async function POST(request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { name, category, unit = 'unit' } = await request.json();
  if (!name || !category) {
    return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
  }

  await dbConnect();
  const product = await Product.create({ name, category, unit });
  return NextResponse.json({ product }, { status: 201 });
}

export async function PATCH(request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id, ...updates } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await dbConnect();
  const product = await Product.findByIdAndUpdate(id, updates, { new: true }).lean();

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ product });
}
