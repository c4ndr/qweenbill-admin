'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { daysUntil, isExpiringSoon } from '@/lib/expiry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

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

  const statCards = [
    { label: 'Total RT/RW', value: stats.totalTenants, icon: Building2, color: 'text-blue-500' },
    { label: 'Aktif', value: stats.activeTenants, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Disuspend', value: stats.suspended, icon: XCircle, color: 'text-red-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ringkasan</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className={`size-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="size-4 text-orange-500" />
            <CardTitle className="text-sm font-medium text-orange-500">
              Akan Kadaluarsa
            </CardTitle>
            <Badge variant="secondary" className="ml-auto bg-orange-500/10 text-orange-500">
              {expiringSoon.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {expiringSoon.map((t) => (
                <li key={t.id}>
                  <Link
                    href="/dashboard/tenants"
                    className="flex items-center justify-between text-sm rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                  >
                    <span className="text-foreground">{t.nama}</span>
                    <span className="flex items-center gap-1.5 text-orange-500 whitespace-nowrap">
                      <Clock className="size-3" />
                      {t.days === 0 ? 'Hari ini' : `${t.days} hari lagi`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
