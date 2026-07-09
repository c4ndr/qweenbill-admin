'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && isSuperAdmin) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [user, isSuperAdmin, loading, router]);

  return null;
}
