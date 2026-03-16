'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
    >
      Sign out
    </button>
  );
}
