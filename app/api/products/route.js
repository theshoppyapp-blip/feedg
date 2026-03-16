import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { ensureMvpSeedData } from '@/lib/bootstrapData';

export async function GET(request) {
  try {
    await dbConnect();
    await ensureMvpSeedData();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 100);
    const category = (searchParams.get('category') || '').trim();
    const q = (searchParams.get('q') || '').trim();

    const filter = {};
    if (category) {
      filter.category = category;
    }
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      products: products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        category: product.category,
        unit: product.unit,
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
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
