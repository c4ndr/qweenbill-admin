'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { daysUntil, isExpiringSoon } from '@/lib/expiry';

interface Stats {
  totalTenants: number;
  activeTenants: number;
  suspended: number;
}

interface ExpiringTenant {
  id: string;
  nama: string;
  days: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalTenants: 0, activeTenants: 0, suspended: 0 });
  const [expiringSoon, setExpiringSoon] = useState<ExpiringTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as {
          id: string; nama: string; status: string; subscriptionExpiresAt?: Timestamp;
        }));
        setStats({
          totalTenants: all.length,
          activeTenants: all.filter((t) => t.status === 'active').length,
          suspended: all.filter((t) => t.status === 'suspended').length,
        });
        setExpiringSoon(
          all
            .filter((t) => isExpiringSoon(t.status, t.subscriptionExpiresAt))
            .map((t) => ({ id: t.id, nama: t.nama, days: daysUntil(t.subscriptionExpiresAt) ?? 0 }))
            .sort((a, b) => a.days - b.days)
        );
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {cards.map((c) => (
              <div key={c.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm mb-1">{c.label}</p>
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {expiringSoon.length > 0 && (
            <div className="bg-orange-950 border border-orange-800 rounded-xl p-5">
              <p className="text-orange-300 text-sm font-medium mb-3">
                ⚠ Akan Kadaluarsa ({expiringSoon.length})
              </p>
              <ul className="space-y-2">
                {expiringSoon.map((t) => (
                  <li key={t.id}>
                    <Link
                      href="/dashboard/tenants"
                      className="flex items-center justify-between text-sm hover:underline"
                    >
                      <span className="text-white">{t.nama}</span>
                      <span className="text-orange-300 whitespace-nowrap ml-3">
                        {t.days === 0 ? 'Hari ini' : `${t.days} hari lagi`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
