'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { daysUntil, isExpiringSoon } from '@/lib/expiry';
import { currency } from '@/lib/plans';
import type { Tenant } from '@/components/dashboard/tenants/types';
import type { ActivityAction } from '@/lib/audit-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle, XCircle, AlertTriangle, Clock, Users } from 'lucide-react';

interface ExpiringTenant {
  id: string;
  nama: string;
  days: number;
}

interface Payment {
  amount: number;
  createdAt?: Timestamp;
}

interface ActivityLog {
  id: string;
  actorEmail: string;
  action: ActivityAction;
  tenantNama: string;
  createdAt?: Timestamp;
}

const ACTION_LABEL: Record<string, string> = {
  'tenant.create': 'Tambah Tenant',
  'tenant.activate': 'Aktifkan Tenant',
  'tenant.suspend': 'Suspend Tenant',
  'tenant.renew': 'Perpanjang Langganan',
  'tenant.grade_change': 'Ubah Grade',
  'tenant.activation_code_edit': 'Edit Kode Aktivasi',
  'tenant.delete': 'Hapus Tenant',
  'tenant.nettopo_admin_reset': 'Reset Password NetTopo Admin',
  'tenant.nettopo_teknisi_reset': 'Reset Password NetTopo Teknisi',
  'tenant.admin_pin_reset': 'Reset PIN Admin App',
  'application.approve': 'Setujui Pendaftaran',
  'application.reject': 'Tolak Pendaftaran',
};

const CHART_W = 620;
const CHART_H = 190;

function buildMonthlyRevenue(payments: Payment[]) {
  const now = new Date();
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      total: 0,
    });
  }
  for (const p of payments) {
    const d = p.createdAt?.toDate();
    if (!d) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.total += p.amount || 0;
  }
  return months;
}

function RevenueChart({ months }: { months: { label: string; total: number }[] }) {
  const max = Math.max(...months.map((m) => m.total), 1);
  const stepX = CHART_W / (months.length - 1);
  const points = months.map((m, i) => {
    const x = i * stepX;
    const y = CHART_H - (m.total / max) * (CHART_H - 20) - 4;
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const last = points[points.length - 1];
  const totalRupiah = months.reduce((s, m) => s + m.total, 0);

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" preserveAspectRatio="none" style={{ height: 190 }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={CHART_W} y1={CHART_H * f} y2={CHART_H * f} stroke="rgba(233,233,237,.07)" strokeWidth={1} />
        ))}
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9184d9" stopOpacity={0.33} />
            <stop offset="100%" stopColor="#9184d9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#revenueFill)" />
        <path d={linePath} fill="none" stroke="#9184d9" strokeWidth={2} />
        {last && <circle cx={last.x} cy={last.y} r={4} fill="#9184d9" />}
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] text-[#75798c]">
        {months.map((m) => (
          <span key={m.label}>{m.label}</span>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-[#9397ab]">
        {currency.format(totalRupiah)} · 12 bulan
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tenantsSnap, paymentsSnap, logsSnap] = await Promise.all([
          getDocs(collection(db, 'tenants')),
          getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(200))),
          getDocs(query(collection(db, 'activity_log'), orderBy('createdAt', 'desc'), limit(5))),
        ]);
        setTenants(tenantsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tenant)));
        setPayments(paymentsSnap.docs.map((d) => d.data() as Payment));
        setLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog)));
      } catch (err) {
        console.error('[Dashboard] Gagal muat data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalPelanggan = tenants.reduce((sum, t) => sum + (t.pelangganCount || 0), 0);
  const expiringSoon: ExpiringTenant[] = tenants
    .filter((t) => isExpiringSoon(t.status, t.subscriptionExpiresAt))
    .map((t) => ({ id: t.id, nama: t.nama, days: daysUntil(t.subscriptionExpiresAt) ?? 0 }))
    .sort((a, b) => a.days - b.days);

  const statCards = [
    { label: 'Total RT/RW', value: tenants.length, icon: Building2 },
    { label: 'Aktif', value: tenants.filter((t) => t.status === 'active').length, icon: CheckCircle },
    { label: 'Disuspend', value: tenants.filter((t) => t.status === 'suspended').length, icon: XCircle },
    { label: 'Pelanggan Akhir', value: totalPelanggan, icon: Users },
  ];

  function fmtLogTime(ts?: Timestamp) {
    if (!ts) return '-';
    return ts.toDate().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Ringkasan</h1>

      <div className="grid grid-cols-2 gap-[11.2px] lg:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label} className="rounded-lg">
            <CardHeader className="flex flex-row items-center gap-1.5 space-y-0 pb-1">
              <c.icon className="size-3.5 text-primary" />
              <CardTitle className="text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-medium">{c.value.toLocaleString('id-ID')}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-[11.2px] lg:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#9397ab]">
              Pendapatan Langganan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart months={buildMonthlyRevenue(payments)} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <AlertTriangle className="size-4 text-primary" />
            <CardTitle className="text-sm font-medium">Akan Kadaluarsa</CardTitle>
            {expiringSoon.length > 0 && <Badge className="ml-auto">{expiringSoon.length}</Badge>}
          </CardHeader>
          <CardContent>
            {expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada yang akan kadaluarsa dalam 7 hari.</p>
            ) : (
              <ul className="space-y-1">
                {expiringSoon.map((t) => (
                  <li key={t.id}>
                    <Link
                      href="/dashboard/tenants"
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-primary/8"
                    >
                      <span>{t.nama}</span>
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-primary">
                        <Clock className="size-3" />
                        {t.days === 0 ? 'Hari ini' : `${t.days} hari lagi`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] text-[#9397ab]">
              Pengingat WhatsApp terkirim otomatis H-7, H-3, dan H-0.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#9397ab]">
            Log Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-4">
                  <span className="w-24 shrink-0 text-[#595d6c]">{fmtLogTime(log.createdAt)}</span>
                  <span className="w-44 shrink-0 text-[#d2cefd]">{ACTION_LABEL[log.action] ?? log.action}</span>
                  <span className="truncate text-muted-foreground">{log.tenantNama}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
