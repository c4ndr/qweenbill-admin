'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, orderBy, query, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityAction } from '@/lib/audit-log';

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

const ACTION_COLOR: Record<ActivityAction, string> = {
  'tenant.create': 'bg-blue-900 text-blue-300',
  'tenant.activate': 'bg-green-900 text-green-300',
  'tenant.suspend': 'bg-red-900 text-red-300',
  'tenant.renew': 'bg-cyan-900 text-cyan-300',
  'tenant.grade_change': 'bg-purple-900 text-purple-300',
  'tenant.activation_code_edit': 'bg-yellow-900 text-yellow-300',
  'tenant.delete': 'bg-red-950 text-red-400',
  'tenant.nettopo_admin_reset': 'bg-indigo-900 text-indigo-300',
  'tenant.nettopo_teknisi_reset': 'bg-indigo-900 text-indigo-300',
  'tenant.admin_pin_reset': 'bg-orange-900 text-orange-300',
  'application.approve': 'bg-green-900 text-green-300',
  'application.reject': 'bg-red-900 text-red-300',
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Riwayat Aktivitas</h1>
        <p className="text-gray-500 text-sm mt-1">
          100 aksi superadmin terbaru terhadap tenant (suspend, hapus, ubah grade, dst). Log ini tidak bisa diubah/dihapus.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada aktivitas tercatat.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Waktu</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Admin</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Aksi</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Tenant</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-400">{log.actorEmail || log.actorUid}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${ACTION_COLOR[log.action] ?? 'bg-gray-800 text-gray-400'}`}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">{log.tenantNama}</td>
                  <td className="px-4 py-3 text-gray-400">{describeDetail(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
