import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'An account already exists for that email' }, { status: 409 });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    sendWelcomeEmail({ email: user.email, name: user.name }).catch((error) => {
      console.error('Welcome email failed:', error);
    });

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
  }
}
