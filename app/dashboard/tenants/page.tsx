'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, updateDoc, doc, Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/audit-log';
import { daysUntil, isExpiringSoon } from '@/lib/expiry';
import { recordPayment, PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/payments';

interface Plan {
  id: string;
  nama: string;
  active: boolean;
  customerLimit: number | null;
  priceperYear: number;
  routerLimit: number;
  features: Record<string, boolean>;
}

interface Tenant {
  id: string;
  nama: string;
  alamat: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  gradeId: string;
  customerLimit: number | null;
  pricePerYearAtPurchase?: number;
  pelangganCount: number;
  activationCode: string;
  subscriptionExpiresAt?: Timestamp;
}

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Suspend',
  pending: 'Menunggu Aktivasi',
  expired: 'Kadaluarsa',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-900 text-green-300',
  suspended: 'bg-red-900 text-red-300',
  pending: 'bg-yellow-900 text-yellow-300',
  expired: 'bg-orange-900 text-orange-300',
};

const DURATION_OPTIONS = [
  { label: '1 Hari', days: 1 },
  { label: '3 Hari', days: 3 },
  { label: '1 Minggu', days: 7 },
  { label: '1 Bulan', days: 30 },
  { label: '2 Bulan', days: 60 },
  { label: '3 Bulan', days: 90 },
  { label: '1 Tahun', days: 365 },
];

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', alamat: '', email: '', gradeId: '', durationDays: 365 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newActivation, setNewActivation] = useState<{ nama: string; code: string; nettopoEmail?: string; nettopoPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [editCodeValue, setEditCodeValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [gradeChangeTarget, setGradeChangeTarget] = useState<Tenant | null>(null);
  const [gradeChangeNewId, setGradeChangeNewId] = useState('');
  const [gradeChangeSaving, setGradeChangeSaving] = useState(false);
  const [gradeChangeError, setGradeChangeError] = useState('');
  const [renewTarget, setRenewTarget] = useState<Tenant | null>(null);
  const [renewDays, setRenewDays] = useState(365);
  const [renewAmount, setRenewAmount] = useState('');
  const [renewMethod, setRenewMethod] = useState<PaymentMethod>('transfer');
  const [renewNote, setRenewNote] = useState('');
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState('');

  async function loadAll() {
    setLoading(true);
    try {
      const [tenantSnap, planSnap] = await Promise.all([
        getDocs(collection(db, 'tenants')),
        getDocs(collection(db, 'plans')),
      ]);
      setTenants(tenantSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tenant)));
      const planList = planSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
      const activePlans = planList.filter((p) => p.active !== false);
      setPlans(activePlans);
      setForm((f) => (f.gradeId ? f : { ...f, gradeId: activePlans[0]?.id ?? '' }));
    } catch (err) {
      console.error('[TenantsPage] Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.gradeId) {
      setError('Belum ada grade tersedia — buat dulu di halaman Paket/Grade.');
      return;
    }
    setSaving(true);
    try {
      const provisionTenant = httpsCallable(functions, 'provisionTenant');
      const res = await provisionTenant({
        nama: form.nama,
        alamat: form.alamat,
        email: form.email,
        gradeId: form.gradeId,
        durationDays: form.durationDays,
      });
      const data = res.data as { tenantId: string; activationCode: string; nettopoEmail?: string; nettopoPassword?: string };
      if (user) {
        logActivity(user, 'tenant.create', data.tenantId, form.nama, {
          gradeId: form.gradeId,
          durationDays: form.durationDays,
        });
      }
      setNewActivation({
        nama: form.nama,
        code: data.activationCode,
        nettopoEmail: data.nettopoEmail ?? undefined,
        nettopoPassword: data.nettopoPassword ?? undefined,
      });
      setCopied(false);
      setForm({ nama: '', alamat: '', email: '', gradeId: plans[0]?.id ?? '', durationDays: 365 });
      setShowForm(false);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat tenant');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: 'active' | 'suspended') {
    const t = tenants.find((x) => x.id === id);
    await updateDoc(doc(db, 'tenants', id), { status });
    setTenants((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    if (user && t) {
      logActivity(user, status === 'active' ? 'tenant.activate' : 'tenant.suspend', id, t.nama, {
        from: t.status,
        to: status,
      });
    }
  }

  async function renewSubscription(t: Tenant, days: number) {
    const now = new Date();
    const currentExpiry = t.subscriptionExpiresAt?.toDate();
    const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const next = new Date(base);
    next.setDate(next.getDate() + days);

    await updateDoc(doc(db, 'tenants', t.id), {
      subscriptionExpiresAt: next,
      status: 'active',
    });
    if (user) {
      logActivity(user, 'tenant.renew', t.id, t.nama, { days, newExpiry: next.toISOString() });
    }
    await loadAll();
  }

  function suggestedAmount(t: Tenant, days: number): number {
    if (!t.pricePerYearAtPurchase) return 0;
    return Math.round(((t.pricePerYearAtPurchase / 365) * days) / 1000) * 1000;
  }

  function openRenew(t: Tenant) {
    setRenewTarget(t);
    setRenewDays(365);
    setRenewAmount(String(suggestedAmount(t, 365)));
    setRenewMethod('transfer');
    setRenewNote('');
    setRenewError('');
  }

  async function confirmRenew() {
    if (!renewTarget) return;
    setRenewSaving(true);
    setRenewError('');
    try {
      await renewSubscription(renewTarget, renewDays);
      if (user) {
        await recordPayment(user, {
          tenantId: renewTarget.id,
          tenantNama: renewTarget.nama,
          amount: Number(renewAmount) || 0,
          method: renewMethod,
          note: renewNote.trim(),
          days: renewDays,
        });
      }
      setRenewTarget(null);
    } catch (err: unknown) {
      setRenewError(err instanceof Error ? err.message : 'Gagal memperpanjang / mencatat pembayaran');
    } finally {
      setRenewSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const deleteTenant = httpsCallable(functions, 'deleteTenant');
      await deleteTenant({ tenantId: deleteTarget.id });
      if (user) {
        logActivity(user, 'tenant.delete', deleteTarget.id, deleteTarget.nama, {
          pelangganCount: deleteTarget.pelangganCount,
          gradeId: deleteTarget.gradeId,
        });
      }
      setTenants((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmText('');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus tenant');
    } finally {
      setDeleting(false);
    }
  }

  function openGradeChange(t: Tenant, newGradeId: string) {
    setGradeChangeTarget(t);
    setGradeChangeNewId(newGradeId);
    setGradeChangeError('');
  }

  async function confirmGradeChange() {
    if (!gradeChangeTarget) return;
    const newPlan = plans.find((p) => p.id === gradeChangeNewId);
    if (!newPlan) return;
    setGradeChangeSaving(true);
    setGradeChangeError('');
    try {
      await updateDoc(doc(db, 'tenants', gradeChangeTarget.id), {
        gradeId: newPlan.id,
        customerLimit: newPlan.customerLimit,
        routerLimit: newPlan.routerLimit,
        features: newPlan.features || {},
        pricePerYearAtPurchase: newPlan.priceperYear,
      });
      if (user) {
        logActivity(user, 'tenant.grade_change', gradeChangeTarget.id, gradeChangeTarget.nama, {
          from: gradeChangeTarget.gradeId,
          to: newPlan.id,
        });
      }
      setGradeChangeTarget(null);
      await loadAll();
    } catch (err: unknown) {
      setGradeChangeError(err instanceof Error ? err.message : 'Gagal mengubah grade');
    } finally {
      setGradeChangeSaving(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startEditCode(t: Tenant) {
    setEditingCodeId(t.id);
    setEditCodeValue(t.activationCode ?? '');
  }

  async function saveEditCode(id: string) {
    const code = editCodeValue.trim().toUpperCase();
    if (!code) return;
    const t = tenants.find((x) => x.id === id);
    await updateDoc(doc(db, 'tenants', id), { activationCode: code });
    setTenants((prev) => prev.map((x) => (x.id === id ? { ...x, activationCode: code } : x)));
    setEditingCodeId(null);
    if (user && t) {
      logActivity(user, 'tenant.activation_code_edit', id, t.nama, { from: t.activationCode, to: code });
    }
  }

  function fmtDate(ts?: Timestamp) {
    if (!ts) return '-';
    return ts.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function gradeName(gradeId: string) {
    return plans.find((p) => p.id === gradeId)?.nama ?? gradeId;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-white text-xl font-semibold">Kelola RT/RW</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Tambah Tenant
        </button>
      </div>

      {newActivation && (
        <div className="bg-green-950 border border-green-800 rounded-xl p-5 mb-6">
          <p className="text-green-300 text-sm font-medium mb-2">
            Tenant &quot;{newActivation.nama}&quot; berhasil dibuat. Bagikan kode aktivasi ini ke tenant
            (lewat WA/Telegram bareng link APK) — dipakai sekali saat pertama kali buka aplikasi bill/teknisi/customer:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="bg-gray-900 text-white text-lg font-mono px-4 py-2 rounded-lg tracking-wider break-all">
              {newActivation.code}
            </code>
            <button
              onClick={() => copyCode(newActivation.code)}
              className="text-sm text-green-400 hover:text-green-300"
            >
              {copied ? '✓ Tersalin' : 'Salin'}
            </button>
            <button
              onClick={() => setNewActivation(null)}
              className="text-sm text-gray-500 hover:text-gray-400 ml-auto"
            >
              Tutup
            </button>
          </div>
          {newActivation.nettopoEmail && (
            <div className="mt-4 pt-4 border-t border-green-800">
              <p className="text-green-300 text-sm font-medium mb-2">
                Login Peta Topologi (NetTopo):
              </p>
              <div className="text-sm text-green-200 space-y-1">
                <p>Email: <span className="text-white font-mono">{newActivation.nettopoEmail}</span></p>
                <p>Password: <span className="text-white font-mono">{newActivation.nettopoPassword}</span></p>
                <p className="text-green-400/70 text-xs mt-1">
                  Akses via menu &quot;Peta Topologi Jaringan&quot; di aplikasi bill.
                  Ganti password setelah login pertama.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-white font-medium text-sm">Tambah RT/RW Baru</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nama RT/RW</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RT 01 RW 05 Sukamaju"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email Admin</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@rtwilayah.com"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Alamat</label>
              <input
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jl. Contoh No. 1, Bandung"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Grade</label>
              <select
                value={form.gradeId}
                onChange={(e) => setForm({ ...form, gradeId: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {plans.length === 0 && <option value="">Belum ada grade — buat di halaman Paket/Grade</option>}
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Durasi Awal (setelah aktivasi)</label>
              <select
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.days} value={d.days}>{d.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Pilih durasi pendek (Hari/Minggu) untuk tenant demo.</p>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : tenants.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada tenant terdaftar.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Nama RT/RW</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Grade</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Pelanggan</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Kadaluarsa</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Kode Aktivasi</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const expiringSoon = isExpiringSoon(t.status, t.subscriptionExpiresAt);
                const daysLeft = daysUntil(t.subscriptionExpiresAt);
                return (
                <tr key={t.id} className={`border-b border-gray-800 last:border-0 ${expiringSoon ? 'bg-orange-950/40' : ''}`}>
                  <td className="px-4 py-3 text-white">
                    {t.nama}
                    <p className="text-xs text-gray-500">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{gradeName(t.gradeId)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {t.pelangganCount ?? 0}{t.customerLimit == null ? '' : ` / ${t.customerLimit}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {fmtDate(t.subscriptionExpiresAt)}
                    {expiringSoon && (
                      <span className="block text-orange-400 text-xs font-medium mt-0.5">
                        {daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingCodeId === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editCodeValue}
                          onChange={(e) => setEditCodeValue(e.target.value.toUpperCase())}
                          className="bg-gray-800 text-white text-xs font-mono rounded px-2 py-1 w-28 outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button onClick={() => saveEditCode(t.id)} className="text-xs text-green-400 hover:text-green-300">
                          Simpan
                        </button>
                        <button onClick={() => setEditingCodeId(null)} className="text-xs text-gray-500 hover:text-gray-400">
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-400 font-mono">{t.activationCode}</code>
                        <button onClick={() => copyCode(t.activationCode)} className="text-xs text-blue-400 hover:text-blue-300">
                          Salin
                        </button>
                        <button onClick={() => startEditCode(t)} className="text-xs text-yellow-400 hover:text-yellow-300">
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {t.status !== 'active' && (
                        <button
                          onClick={() => setStatus(t.id, 'active')}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Aktifkan
                        </button>
                      )}
                      {t.status !== 'suspended' && (
                        <button
                          onClick={() => setStatus(t.id, 'suspended')}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => openRenew(t)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Perpanjang...
                      </button>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const newGradeId = e.target.value;
                          if (newGradeId) openGradeChange(t, newGradeId);
                          e.target.value = '';
                        }}
                        className="text-xs bg-gray-800 text-purple-400 border border-gray-700 rounded px-1.5 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>Ubah Grade...</option>
                        {plans.filter((p) => p.id !== t.gradeId).map((p) => (
                          <option key={p.id} value={p.id}>{p.nama}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { setDeleteTarget(t); setDeleteConfirmText(''); setDeleteError(''); }}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {renewTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-white font-semibold text-base mb-4">Perpanjang &quot;{renewTarget.nama}&quot;</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Durasi</label>
                <select
                  value={renewDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    setRenewDays(days);
                    setRenewAmount(String(suggestedAmount(renewTarget, days)));
                  }}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.days} value={d.days}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Jumlah Dibayar (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Metode Pembayaran</label>
                <select
                  value={renewMethod}
                  onChange={(e) => setRenewMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Catatan (opsional)</label>
                <input
                  value={renewNote}
                  onChange={(e) => setRenewNote(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No. referensi transfer, dll"
                />
              </div>
            </div>
            {renewError && (
              <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2 mt-3">{renewError}</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={renewSaving}
                onClick={confirmRenew}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {renewSaving ? 'Menyimpan...' : 'Konfirmasi & Catat Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {gradeChangeTarget && (() => {
        const newPlan = plans.find((p) => p.id === gradeChangeNewId);
        if (!newPlan) return null;
        const isDowngrade = (newPlan.customerLimit ?? Infinity) < (gradeChangeTarget.customerLimit ?? Infinity);
        const overQuota = newPlan.customerLimit != null && gradeChangeTarget.pelangganCount > newPlan.customerLimit;
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
              <h2 className="text-white font-semibold text-base mb-2">
                {isDowngrade ? 'Downgrade' : 'Upgrade'} Grade &quot;{gradeChangeTarget.nama}&quot;?
              </h2>
              <p className="text-gray-400 text-sm mb-3">
                {gradeName(gradeChangeTarget.gradeId)} → <span className="text-white">{newPlan.nama}</span>
              </p>
              <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 space-y-1 mb-3">
                <p>
                  Kuota pelanggan:{' '}
                  {gradeChangeTarget.customerLimit == null ? 'Tanpa batas' : gradeChangeTarget.customerLimit}
                  {' → '}
                  {newPlan.customerLimit == null ? 'Tanpa batas' : newPlan.customerLimit}
                </p>
                <p>Harga/tahun: {currency.format(newPlan.priceperYear)}</p>
              </div>
              {overQuota && (
                <p className="text-yellow-400 text-sm bg-yellow-950 rounded-lg px-3 py-2 mb-3">
                  Pelanggan aktif tenant ini ({gradeChangeTarget.pelangganCount}) sudah melebihi kuota grade baru
                  ({newPlan.customerLimit}). Tenant tetap bisa jalan, tapi tidak bisa tambah pelanggan baru sampai
                  di bawah kuota lagi.
                </p>
              )}
              {gradeChangeError && (
                <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2 mb-3">{gradeChangeError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setGradeChangeTarget(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={gradeChangeSaving}
                  onClick={confirmGradeChange}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {gradeChangeSaving ? 'Menyimpan...' : 'Konfirmasi'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-900 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-white font-semibold text-base mb-2">Hapus Tenant &quot;{deleteTarget.nama}&quot;?</h2>
            <p className="text-gray-400 text-sm mb-1">
              Ini akan menghapus PERMANEN seluruh data tenant ini: pelanggan
              ({deleteTarget.pelangganCount ?? 0}), tagihan, teknisi, paket,
              pengaduan, inventaris, voucher, dan semua pengaturan lainnya.
            </p>
            <p className="text-red-400 text-sm font-medium mb-4">
              Tindakan ini TIDAK BISA dibatalkan.
            </p>
            <label className="text-xs text-gray-400 mb-1 block">
              Ketik <span className="text-white font-mono">{deleteTarget.nama}</span> untuk konfirmasi:
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 mb-3"
              autoFocus
            />
            {deleteError && (
              <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); setDeleteError(''); }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting || deleteConfirmText !== deleteTarget.nama}
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
