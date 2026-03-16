import { auth } from '@/auth';

export async function getSessionOrNull() {
  return auth();
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (session.user.role !== 'admin') {
    return { error: 'Forbidden', status: 403 };
  }

  return { session };
}
