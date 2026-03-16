'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      setError(data.error || 'Could not create your account');
      return;
    }

    const result = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
      <form onSubmit={handleSubmit} className="card w-full rounded-3xl p-8">
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-slate-300">This uses the same signup + welcome-email pattern as your main project.</p>
        <div className="mt-6 space-y-4">
          <input type="text" placeholder="Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" required />
          <input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" required />
          <input type="password" placeholder="Password (8+ chars)" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" minLength={8} required />
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-violet-500 px-4 py-3 font-medium text-white hover:bg-violet-400 disabled:opacity-60">
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="mt-4 text-sm text-slate-300">
          Already have an account? <Link href="/auth/signin" className="text-cyan-300 hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
