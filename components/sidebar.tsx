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
  { href: '/dashboard/activity', label: 'Riwayat Aktivitas', icon: '📜' },
];

function SidebarContent({ devMode, onNavigate, onLogout }: {
  devMode: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
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
            onClick={onNavigate}
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
          onClick={onLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span>→</span> Keluar
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [devMode, setDevMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    isDevModeEnabled().then(setDevMode);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <>
      {/* Top bar mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div>
          <p className="text-white font-bold text-base leading-none">QweenBill</p>
          <p className="text-gray-500 text-xs mt-0.5">Superadmin</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          className="text-white text-2xl leading-none p-1"
        >
          ☰
        </button>
      </div>

      {/* Sidebar tetap, desktop */}
      <aside className="hidden md:flex w-56 shrink-0 min-h-screen bg-gray-900 flex-col border-r border-gray-800">
        <SidebarContent devMode={devMode} onLogout={handleLogout} />
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 max-w-[80vw] bg-gray-900 flex flex-col border-r border-gray-800">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
              className="self-end text-gray-400 text-xl p-3"
            >
              ✕
            </button>
            <SidebarContent devMode={devMode} onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}
    </>
  );
}
