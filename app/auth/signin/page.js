'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense, useState } from 'react';

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16" />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push(searchParams.get('callbackUrl') || '/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
      <form onSubmit={handleSubmit} className="card w-full rounded-3xl p-8">
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-300">Use your email and password to access the starter dashboard.</p>
        <div className="mt-6 space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" required />
          <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" required />
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-violet-500 px-4 py-3 font-medium text-white hover:bg-violet-400 disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-4 text-sm text-slate-300">
          Need an account? <Link href="/auth/signup" className="text-cyan-300 hover:underline">Create one</Link>
        </p>
      </form>
    </main>
  );
}
