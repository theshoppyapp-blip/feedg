import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Resend } from 'resend';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(amount);
}

function getHtml(emailType, data) {
  if (emailType === 'welcome') {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1>Welcome, ${data.name}!</h1>
        <p>Your new app starter is ready to build on.</p>
        <p>Next steps: connect your product flows, customize the UI, and ship.</p>
      </div>
    `;
  }

  if (emailType === 'order-confirmation') {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1>Payment confirmed</h1>
        <p>Hi ${data.name},</p>
        <p>Your payment for <strong>${data.itemName}</strong> was successful.</p>
        <p>Total: <strong>${formatCurrency(data.amount)}</strong></p>
      </div>
    `;
  }

  return '<p>Unsupported email type</p>';
}

export async function POST(request) {
  try {
    const internalApiKey = request.headers.get('x-internal-api-key');
    const session = await auth();
    const isInternalRequest = internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY;

    if (!session?.user && !isInternalRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 });
    }

    const { to, emailType, data } = await request.json();
    if (!to || !emailType) {
      return NextResponse.json({ error: 'Recipient and email type are required' }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject = emailType === 'welcome' ? 'Welcome to your new app' : 'Payment confirmed';

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Starter Template <onboarding@resend.dev>',
      to,
      subject,
      html: getHtml(emailType, data || {}),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
