import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Price from '@/lib/models/Price';
import { requireAdmin } from '@/lib/serverAuth';

export async function PATCH(request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id, price } = await request.json();
  if (!id || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return NextResponse.json({ error: 'id and valid price are required' }, { status: 400 });
  }

  await dbConnect();

  const updated = await Price.findByIdAndUpdate(id, {
    price: Number(price),
    updatedAt: new Date(),
  }, { new: true }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Price not found' }, { status: 404 });
  }

  return NextResponse.json({ price: updated });
}
