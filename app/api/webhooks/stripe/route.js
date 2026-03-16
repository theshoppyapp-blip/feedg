import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { sendOrderConfirmationEmail } from '@/lib/email';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { getStripe } from '@/lib/stripe';

export async function POST(request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return new NextResponse('Missing Stripe signature', { status: 400 });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    await dbConnect();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (!orderId) break;

        const order = await Order.findById(orderId);
        if (!order) break;

        order.status = 'paid';
        order.paymentStatus = 'completed';
        order.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        await order.save();

        const user = await User.findOne({ email: order.userEmail });
        sendOrderConfirmationEmail({
          to: order.userEmail,
          name: user?.name || order.userEmail,
          itemName: order.itemName,
          amount: order.amount,
        }).catch((error) => console.error('Order confirmation email failed:', error));
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        if (!orderId) break;

        const order = await Order.findById(orderId);
        if (!order) break;

        order.status = 'failed';
        order.paymentStatus = 'failed';
        order.stripePaymentIntentId = paymentIntent.id;
        await order.save();
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }
}
