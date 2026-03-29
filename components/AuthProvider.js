'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Client-side provider for NextAuth session management.
 * Must be a client component to use React context.
 */
export function AuthProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
