'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isDevModeEnabled } from '@/lib/dev-mode';

const navItems = [
  { href: '/dashboard', label: 'Ringkasan', icon: '⊞' },
  { href: '/dashboard/tenants', label: 'Kelola RT/RW', icon: '🏘' },
  { href: '/dashboard/plans', label: 'Paket/Grade', icon: '💳' },
  { href: '/dashboard/jasa', label: 'Jasa ZasaQu', icon: '🛵' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    isDevModeEnabled().then(setDevMode);
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 flex flex-col border-r border-gray-800">
      <div className="p-5 border-b border-gray-800">
        <p className="text-white font-bold text-lg">QweenBill</p>
        <p className="text-gray-500 text-xs">Superadmin</p>
        {devMode && (
          <p className="text-green-400 text-xs font-medium mt-1">Dev Mode AKTIF</p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span>→</span> Keluar
        </button>
      </div>
    </aside>
  );
}
