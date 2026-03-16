import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Price from '@/lib/models/Price';
import Product from '@/lib/models/Product';
import Store from '@/lib/models/Store';
import UserSubmittedPrice from '@/lib/models/UserSubmittedPrice';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeId, productId, price } = await request.json();

    if (!storeId || !productId || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      return NextResponse.json({ error: 'storeId, productId and a valid price are required' }, { status: 400 });
    }

    await dbConnect();

    const [store, product] = await Promise.all([
      Store.findById(storeId).lean(),
      Product.findById(productId).lean(),
    ]);

    if (!store || !product) {
      return NextResponse.json({ error: 'Store or product not found' }, { status: 404 });
    }

    const submitted = await UserSubmittedPrice.create({
      userId: session.user.id,
      storeId,
      productId,
      price: Number(price),
    });

    await Price.create({
      storeId,
      productId,
      price: Number(price),
      source: 'user',
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: 'Price submitted successfully',
      submission: {
        id: submitted._id.toString(),
        storeId: submitted.storeId.toString(),
        productId: submitted.productId.toString(),
        price: submitted.price,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Submit price error:', error);
    return NextResponse.json({ error: 'Failed to submit price' }, { status: 500 });
  }
}
