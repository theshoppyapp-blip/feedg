import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Store from '@/lib/models/Store';
import { ensureMvpSeedData } from '@/lib/bootstrapData';

export async function GET(request) {
  try {
    await dbConnect();
    await ensureMvpSeedData();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 100);
    const q = (searchParams.get('q') || '').trim();

    const filter = q ? { name: { $regex: q, $options: 'i' } } : {};

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Store.countDocuments(filter),
    ]);

    return NextResponse.json({
      stores: stores.map((store) => ({
        id: store._id.toString(),
        name: store.name,
        location: store.location,
        type: store.type,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}
