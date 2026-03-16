import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Store from '@/lib/models/Store';
import { requireAdmin } from '@/lib/serverAuth';

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  await dbConnect();
  const stores = await Store.find().sort({ name: 1 }).lean();
  return NextResponse.json({ stores });
}

export async function POST(request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { name, location = '', type = 'supermarket' } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  await dbConnect();
  const store = await Store.create({ name, location, type });
  return NextResponse.json({ store }, { status: 201 });
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
  const store = await Store.findByIdAndUpdate(id, updates, { new: true }).lean();

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  return NextResponse.json({ store });
}
