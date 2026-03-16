import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const orders = await Order.find({ userEmail: session.user.email }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        id: order._id.toString(),
        _id: order._id.toString(),
      })),
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemName, amount, currency = 'nzd' } = await request.json();

    if (!itemName || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'A valid item name and amount are required' }, { status: 400 });
    }

    await dbConnect();

    const order = await Order.create({
      userId: session.user.id,
      userEmail: session.user.email,
      itemName,
      amount: Number(amount),
      currency,
      status: 'pending',
      paymentStatus: 'pending',
    });

    return NextResponse.json({
      message: 'Order created',
      order: {
        ...order.toObject(),
        id: order._id.toString(),
        _id: order._id.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
