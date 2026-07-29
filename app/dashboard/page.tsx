'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Stats {
  totalTenants: number;
  activeTenants: number;
  suspended: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalTenants: 0, activeTenants: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        const all = snap.docs.map((d) => d.data());
        setStats({
          totalTenants: all.length,
          activeTenants: all.filter((t) => t.status === 'active').length,
          suspended: all.filter((t) => t.status === 'suspended').length,
        });
      } catch (err) {
        console.error('[Dashboard] Gagal muat tenants:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: 'Total RT/RW', value: stats.totalTenants, color: 'text-blue-400' },
    { label: 'Aktif', value: stats.activeTenants, color: 'text-green-400' },
    { label: 'Disuspend', value: stats.suspended, color: 'text-red-400' },
  ];

  return (
    <div>
      <h1 className="text-white text-xl font-semibold mb-6">Ringkasan</h1>

      {loading ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
