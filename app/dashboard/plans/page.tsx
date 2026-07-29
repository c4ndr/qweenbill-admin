'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, setDoc, doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Plan {
  id: string; // gradeId — dipakai sebagai referensi dari dokumen tenant
  nama: string;
  customerLimit: number | null; // null = tanpa batas
  priceperYear: number;
  routerLimit: number;
  features: Record<string, boolean>;
  active: boolean;
}

// Daftar feature flag yang dikenal aplikasi mobile (qween_bill/teknisi/customer).
// Menambah flag baru di sini butuh kode pengecekan yang sepadan di app mobile
// sebelum benar-benar berpengaruh — lihat catatan di README migrasi.
const FEATURE_FLAGS: { key: string; label: string }[] = [
  { key: 'router2', label: '2 Router MikroTik' },
  { key: 'bubbleChat', label: 'Bubble Chat Teknisi↔Pelanggan' },
  { key: 'hotspotFilterLanjutan', label: 'Filter Hotspot Lanjutan' },
  { key: 'petaTopologi', label: 'Peta Topologi Geografis' },
  { key: 'multiAdmin', label: 'Multi-Admin/Koordinator' },
];

const emptyForm = {
  gradeId: '',
  nama: '',
  customerLimit: '' as string, // string kosong = unlimited di form
  priceperYear: '',
  routerLimit: '1',
  active: true,
  features: Object.fromEntries(FEATURE_FLAGS.map((f) => [f.key, false])) as Record<string, boolean>,
};

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null=tidak ada form, 'new'=tambah baru
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadPlans() {
    setLoading(true);
    const snap = await getDocs(collection(db, 'plans'));
    setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan)));
    setLoading(false);
  }

  useEffect(() => { loadPlans(); }, []);

  function openNew() {
    setForm(emptyForm);
    setError('');
    setEditingId('new');
  }

  function openEdit(p: Plan) {
    setForm({
      gradeId: p.id,
      nama: p.nama,
      customerLimit: p.customerLimit == null ? '' : String(p.customerLimit),
      priceperYear: String(p.priceperYear),
      routerLimit: String(p.routerLimit),
      active: p.active,
      features: { ...Object.fromEntries(FEATURE_FLAGS.map((f) => [f.key, false])), ...p.features },
    });
    setError('');
    setEditingId(p.id);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const gradeId = form.gradeId.trim().toLowerCase();
    if (!gradeId || !/^[a-z0-9_-]+$/.test(gradeId)) {
      setError('ID grade wajib diisi, huruf kecil/angka/strip saja (contoh: basic, pro, enterprise)');
      return;
    }
    if (!form.nama.trim()) {
      setError('Nama paket wajib diisi');
      return;
    }
    const priceperYear = Number(form.priceperYear);
    if (!Number.isFinite(priceperYear) || priceperYear < 0) {
      setError('Harga per tahun tidak valid');
      return;
    }
    const customerLimit = form.customerLimit.trim() === '' ? null : Number(form.customerLimit);
    if (customerLimit !== null && (!Number.isFinite(customerLimit) || customerLimit < 1)) {
      setError('Batas pelanggan tidak valid (kosongkan untuk tanpa batas)');
      return;
    }
    const routerLimit = Number(form.routerLimit);
    if (!Number.isFinite(routerLimit) || routerLimit < 1) {
      setError('Batas router tidak valid');
      return;
    }

    setSaving(true);
    try {
      // setDoc (bukan addDoc) — gradeId adalah ID dokumen yang kita tentukan sendiri,
      // dan dipakai merge:true supaya edit plan yang sudah ada tidak menghapus field lain.
      await setDoc(doc(db, 'plans', gradeId), {
        nama: form.nama.trim(),
        customerLimit,
        priceperYear,
        routerLimit,
        active: form.active,
        features: form.features,
        updatedAt: new Date(),
      }, { merge: true });
      setEditingId(null);
      await loadPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-xl font-semibold">Paket / Grade</h1>
          <p className="text-gray-500 text-sm mt-1">
            Definisi grade langganan tenant. Perubahan di sini hanya berlaku untuk tenant baru
            atau saat perpanjangan — tenant yang sudah aktif entitlement-nya sudah tersalin (snapshot)
            ke dokumen tenant masing-masing.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0 self-start"
        >
          + Tambah Grade
        </button>
      </div>

      {editingId && (
        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="text-white font-medium text-sm">
            {editingId === 'new' ? 'Tambah Grade Baru' : `Edit Grade: ${editingId}`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">ID Grade (slug, tidak bisa diubah setelah dibuat)</label>
              <input
                value={form.gradeId}
                onChange={(e) => setForm({ ...form, gradeId: e.target.value })}
                disabled={editingId !== 'new'}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="basic"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nama Tampilan</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Basic"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Batas Pelanggan (kosongkan = tanpa batas)</label>
              <input
                type="number"
                min={1}
                value={form.customerLimit}
                onChange={(e) => setForm({ ...form, customerLimit: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Harga per Tahun (Rp)</label>
              <input
                type="number"
                min={0}
                value={form.priceperYear}
                onChange={(e) => setForm({ ...form, priceperYear: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="300000"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Batas Router MikroTik</label>
              <input
                type="number"
                min={1}
                value={form.routerLimit}
                onChange={(e) => setForm({ ...form, routerLimit: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="active" className="text-sm text-gray-300">
                Aktif (tampil sebagai pilihan grade tenant baru)
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">Fitur yang diaktifkan</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEATURE_FLAGS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.features[f.key] ?? false}
                    onChange={(e) => setForm({
                      ...form,
                      features: { ...form.features, [f.key]: e.target.checked },
                    })}
                    className="w-4 h-4"
                  />
                  {f.label}
                </label>
              ))}
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
              onClick={() => setEditingId(null)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : plans.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada grade. Tambahkan Basic/Pro/Enterprise dulu.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-semibold">{p.nama}</h3>
                  <p className="text-xs text-gray-500">{p.id}</p>
                </div>
                {!p.active && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">Nonaktif</span>
                )}
              </div>
              <p className="text-2xl font-bold text-white mb-1">{currency.format(p.priceperYear)}<span className="text-sm font-normal text-gray-500">/tahun</span></p>
              <p className="text-sm text-gray-400 mb-3">
                {p.customerLimit == null ? 'Tanpa batas pelanggan' : `Maks ${p.customerLimit} pelanggan`}
                {' · '}{p.routerLimit} router
              </p>
              <ul className="space-y-1 mb-4">
                {FEATURE_FLAGS.map((f) => (
                  <li key={f.key} className="text-xs flex items-center gap-2">
                    <span className={p.features?.[f.key] ? 'text-green-400' : 'text-gray-600'}>
                      {p.features?.[f.key] ? '✓' : '✕'}
                    </span>
                    <span className={p.features?.[f.key] ? 'text-gray-300' : 'text-gray-600'}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openEdit(p)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
