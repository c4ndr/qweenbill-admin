'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      router.push('/login');
    }
  }, [user, isSuperAdmin, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    );
  }

  if (!user || !isSuperAdmin) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-auto">{children}</main>
    </div>
  );
}
