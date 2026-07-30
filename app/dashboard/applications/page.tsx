'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/audit-log';

interface Plan {
  id: string;
  nama: string;
  active: boolean;
  customerLimit: number | null;
}

interface Application {
  id: string;
  namaUsaha: string;
  namaPemilik: string;
  email: string;
  whatsapp: string;
  alamat: string;
  status: 'pending' | 'approved' | 'rejected';
  tenantId?: string;
  activationCode?: string;
  rejectionReason?: string;
  autoApproved?: boolean;
  createdAt?: Timestamp;
}

// Normalisasi ringan supaya "0812..." dan "+62812..." dianggap nomor yang
// sama saat dicek duplikat — bukan validasi penuh, cukup untuk sinyal triase.
function normalizeWhatsapp(raw: string): string {
  let s = (raw || '').replace(/[\s-]/g, '');
  if (s.startsWith('+62')) s = `0${s.slice(3)}`;
  else if (s.startsWith('62') && s.length > 9) s = `0${s.slice(2)}`;
  return s;
}

const STATUS_LABEL: Record<Application['status'], string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

const STATUS_COLOR: Record<Application['status'], string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  approved: 'bg-green-900 text-green-300',
  rejected: 'bg-red-900 text-red-300',
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const [approveTarget, setApproveTarget] = useState<Application | null>(null);
  const [approveGradeId, setApproveGradeId] = useState('');
  const [approveDurationDays, setApproveDurationDays] = useState(365);
  const [approveSaving, setApproveSaving] = useState(false);
  const [approveError, setApproveError] = useState('');

  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState('');

  async function loadAll() {
    setLoading(true);
    try {
      const [appSnap, planSnap] = await Promise.all([
        getDocs(collection(db, 'tenant_applications')),
        getDocs(collection(db, 'plans')),
      ]);
      setApplications(appSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Application)));
      setPlans(planSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan)).filter((p) => p.active !== false));
    } catch (err) {
      console.error('[ApplicationsPage] Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function openApprove(a: Application) {
    setApproveTarget(a);
    setApproveGradeId(plans[0]?.id ?? '');
    setApproveDurationDays(365);
    setApproveError('');
  }

  async function confirmApprove() {
    if (!approveTarget || !approveGradeId) return;
    setApproveSaving(true);
    setApproveError('');
    try {
      const provisionTenant = httpsCallable(functions, 'provisionTenant');
      const res = await provisionTenant({
        nama: approveTarget.namaUsaha,
        alamat: approveTarget.alamat,
        email: approveTarget.email,
        gradeId: approveGradeId,
        durationDays: approveDurationDays,
      });
      const data = res.data as { tenantId: string; activationCode: string };

      await updateDoc(doc(db, 'tenant_applications', approveTarget.id), {
        status: 'approved',
        tenantId: data.tenantId,
        activationCode: data.activationCode,
        reviewedAt: serverTimestamp(),
      });

      if (user) {
        logActivity(user, 'application.approve', data.tenantId, approveTarget.namaUsaha, {
          gradeId: approveGradeId,
          durationDays: approveDurationDays,
        });
      }

      setApproveTarget(null);
      await loadAll();
    } catch (err: unknown) {
      setApproveError(err instanceof Error ? err.message : 'Gagal menyetujui pendaftaran');
    } finally {
      setApproveSaving(false);
    }
  }

  function openReject(a: Application) {
    setRejectTarget(a);
    setRejectReason('');
    setRejectError('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setRejectSaving(true);
    setRejectError('');
    try {
      await updateDoc(doc(db, 'tenant_applications', rejectTarget.id), {
        status: 'rejected',
        rejectionReason: rejectReason.trim(),
        reviewedAt: serverTimestamp(),
      });
      if (user) {
        logActivity(user, 'application.reject', rejectTarget.id, rejectTarget.namaUsaha, {
          reason: rejectReason.trim(),
        });
      }
      setRejectTarget(null);
      await loadAll();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Gagal menolak pendaftaran');
    } finally {
      setRejectSaving(false);
    }
  }

  // Sinyal triase: tandai nomor WA yang dipakai >1 pendaftaran (typo/duplikat/spam),
  // supaya superadmin bisa lebih waspada sebelum klik "Setujui" pada paket berbayar.
  const duplicateWhatsapp = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      const key = normalizeWhatsapp(a.whatsapp);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [applications]);

  const visible = applications
    .filter((a) => (filter === 'all' ? true : a.status === 'pending'))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Pendaftaran Tenant</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`text-xs px-3 py-1.5 rounded-lg ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Menunggu
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Semua
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}

      {!loading && visible.length === 0 && (
        <p className="text-gray-500 text-sm">Tidak ada pendaftaran{filter === 'pending' ? ' yang menunggu' : ''}.</p>
      )}

      <div className="space-y-3">
        {visible.map((a) => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-medium">{a.namaUsaha}</p>
                <p className="text-gray-400 text-sm">{a.namaPemilik} · {a.email} · {a.whatsapp}</p>
                <p className="text-gray-500 text-xs mt-1">{a.alamat}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLOR[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
                {a.autoApproved && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300 whitespace-nowrap">
                    Auto-approved (trial)
                  </span>
                )}
                {(duplicateWhatsapp.get(normalizeWhatsapp(a.whatsapp)) ?? 0) > 1 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 whitespace-nowrap">
                    Nomor WA dipakai berulang
                  </span>
                )}
              </div>
            </div>

            {a.status === 'approved' && (
              <p className="text-green-400 text-xs mt-2 font-mono">Kode aktivasi: {a.activationCode}</p>
            )}
            {a.status === 'rejected' && a.rejectionReason && (
              <p className="text-red-400 text-xs mt-2">Alasan: {a.rejectionReason}</p>
            )}

            {a.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openApprove(a)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg px-3 py-1.5"
                >
                  Setujui
                </button>
                <button
                  onClick={() => openReject(a)}
                  className="bg-red-900 hover:bg-red-800 text-red-200 text-xs font-medium rounded-lg px-3 py-1.5"
                >
                  Tolak
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {approveTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 w-full max-w-sm space-y-3">
            <h2 className="text-white font-bold">Setujui {approveTarget.namaUsaha}</h2>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Grade/Paket</label>
              <select
                value={approveGradeId}
                onChange={(e) => setApproveGradeId(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Durasi Awal (hari)</label>
              <input
                type="number"
                value={approveDurationDays}
                onChange={(e) => setApproveDurationDays(Number(e.target.value))}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none"
                min={1}
              />
            </div>

            {approveError && (
              <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">{approveError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setApproveTarget(null)}
                className="flex-1 bg-gray-800 text-white text-sm rounded-lg py-2"
              >
                Batal
              </button>
              <button
                onClick={confirmApprove}
                disabled={approveSaving || !approveGradeId}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg py-2"
              >
                {approveSaving ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 w-full max-w-sm space-y-3">
            <h2 className="text-white font-bold">Tolak {rejectTarget.namaUsaha}</h2>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Alasan (opsional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none"
                rows={3}
              />
            </div>

            {rejectError && (
              <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">{rejectError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 bg-gray-800 text-white text-sm rounded-lg py-2"
              >
                Batal
              </button>
              <button
                onClick={confirmReject}
                disabled={rejectSaving}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg py-2"
              >
                {rejectSaving ? 'Memproses...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
