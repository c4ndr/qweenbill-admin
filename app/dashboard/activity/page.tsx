'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, orderBy, query, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityAction } from '@/lib/audit-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: ActivityAction;
  tenantId: string;
  tenantNama: string;
  detail: Record<string, unknown>;
  createdAt?: Timestamp;
}

const ACTION_LABEL: Record<ActivityAction, string> = {
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

const ACTION_VARIANT: Record<ActivityAction, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'tenant.create': 'default',
  'tenant.activate': 'secondary',
  'tenant.suspend': 'destructive',
  'tenant.renew': 'default',
  'tenant.grade_change': 'outline',
  'tenant.activation_code_edit': 'outline',
  'tenant.delete': 'destructive',
  'tenant.nettopo_admin_reset': 'outline',
  'tenant.nettopo_teknisi_reset': 'outline',
  'tenant.admin_pin_reset': 'outline',
  'application.approve': 'secondary',
  'application.reject': 'destructive',
};

function describeDetail(log: ActivityLog): string {
  const d = log.detail || {};
  switch (log.action) {
    case 'tenant.create':
      return `Grade ${d.gradeId ?? '-'}, durasi awal ${d.durationDays ?? '-'} hari`;
    case 'tenant.activate':
    case 'tenant.suspend':
      return `Status: ${d.from ?? '-'} → ${d.to ?? '-'}`;
    case 'tenant.renew':
      return `+${d.days ?? '-'} hari`;
    case 'tenant.grade_change':
      return `Grade: ${d.from ?? '-'} → ${d.to ?? '-'}`;
    case 'tenant.activation_code_edit':
      return `Kode: ${d.from ?? '-'} → ${d.to ?? '-'}`;
    case 'tenant.delete':
      return `${d.pelangganCount ?? 0} pelanggan, grade ${d.gradeId ?? '-'}`;
    case 'tenant.nettopo_admin_reset':
      return `Email: ${d.email ?? '-'}`;
    case 'tenant.nettopo_teknisi_reset':
      return `${d.teknisiNama ?? '-'} (${d.email ?? '-'})`;
    case 'tenant.admin_pin_reset':
      return `Tier: Admin ${d.tier ?? '-'}`;
    default:
      return '';
  }
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'activity_log'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog)));
      } catch (err) {
        console.error('[ActivityPage] Gagal memuat log:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function fmtDateTime(ts?: Timestamp) {
    if (!ts) return '-';
    return ts.toDate().toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Aktivitas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          100 aksi superadmin terbaru terhadap tenant (suspend, hapus, ubah grade, dst). Log ini tidak bisa diubah/dihapus.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Log</CardTitle>
            <History className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aksi Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l) => {
                const d = l.createdAt?.toDate();
                const now = new Date();
                return d && d.toDateString() === now.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tenant Unik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map((l) => l.tenantId)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-sm text-center">Belum ada aktivitas tercatat.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">{fmtDateTime(log.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{log.actorEmail || log.actorUid}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[log.action] ?? 'outline'}>
                        {ACTION_LABEL[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.tenantNama}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">{describeDetail(log)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
