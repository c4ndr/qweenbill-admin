'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, setDoc, doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface Plan {
  id: string; // gradeId — dipakai sebagai referensi dari dokumen tenant
  nama: string;
  customerLimit: number | null; // null = tanpa batas
  priceperYear: number;
  routerLimit: number;
  features: Record<string, boolean>;
  active: boolean;
  isTrial?: boolean;
  trialDurationDays?: number;
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
  isTrial: false,
  trialDurationDays: '7',
  features: Object.fromEntries(FEATURE_FLAGS.map((f) => [f.key, false])) as Record<string, boolean>,
};

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const inputClass = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary disabled:opacity-50';
const labelClass = 'mb-1 block text-xs text-muted-foreground';

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
      isTrial: p.isTrial ?? false,
      trialDurationDays: String(p.trialDurationDays ?? 7),
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
    const trialDurationDays = Number(form.trialDurationDays);
    if (form.isTrial && (!Number.isFinite(trialDurationDays) || trialDurationDays < 1 || trialDurationDays > 7)) {
      setError('Durasi trial harus antara 1-7 hari (auto-approve dibatasi maks 7 hari di Cloud Function)');
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
        isTrial: form.isTrial,
        trialDurationDays: form.isTrial ? trialDurationDays : null,
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
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-medium text-foreground">Paket / Grade</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Definisi grade langganan tenant. Perubahan di sini hanya berlaku untuk tenant baru
            atau saat perpanjangan — tenant yang sudah aktif entitlement-nya sudah tersalin (snapshot)
            ke dokumen tenant masing-masing.
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0 self-start">+ Tambah Grade</Button>
      </div>

      {editingId && (
        <form onSubmit={handleSave} className="mb-6 space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground">
            {editingId === 'new' ? 'Tambah Grade Baru' : `Edit Grade: ${editingId}`}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>ID Grade (slug, tidak bisa diubah setelah dibuat)</label>
              <input
                value={form.gradeId}
                onChange={(e) => setForm({ ...form, gradeId: e.target.value })}
                disabled={editingId !== 'new'}
                className={inputClass}
                placeholder="basic"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nama Tampilan</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className={inputClass}
                placeholder="Basic"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Batas Pelanggan (kosongkan = tanpa batas)</label>
              <input
                type="number"
                min={1}
                value={form.customerLimit}
                onChange={(e) => setForm({ ...form, customerLimit: e.target.value })}
                className={inputClass}
                placeholder="200"
              />
            </div>
            <div>
              <label className={labelClass}>Harga per Tahun (Rp)</label>
              <input
                type="number"
                min={0}
                value={form.priceperYear}
                onChange={(e) => setForm({ ...form, priceperYear: e.target.value })}
                className={inputClass}
                placeholder="300000"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Batas Router MikroTik</label>
              <input
                type="number"
                min={1}
                value={form.routerLimit}
                onChange={(e) => setForm({ ...form, routerLimit: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="size-4 accent-primary"
              />
              <label htmlFor="active" className="text-sm text-foreground/80">
                Aktif (tampil sebagai pilihan grade tenant baru)
              </label>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isTrial"
                checked={form.isTrial}
                onChange={(e) => setForm({ ...form, isTrial: e.target.checked })}
                className="size-4 accent-primary"
              />
              <label htmlFor="isTrial" className="text-sm text-foreground/80">
                Plan trial (bisa auto-approve dari halaman /register, wajib id &quot;trial&quot;)
              </label>
            </div>
            {form.isTrial && (
              <div>
                <label className={labelClass}>Durasi Trial (hari, maks 7)</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={form.trialDurationDays}
                  onChange={(e) => setForm({ ...form, trialDurationDays: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Fitur yang diaktifkan</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURE_FLAGS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={form.features[f.key] ?? false}
                    onChange={(e) => setForm({
                      ...form,
                      features: { ...form.features, [f.key]: e.target.checked },
                    })}
                    className="size-4 accent-primary"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat data...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada grade. Tambahkan Basic/Pro/Enterprise dulu.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{p.nama}</h3>
                  <p className="font-mono text-xs text-[#75798c]">{p.id}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!p.active && <Badge variant="secondary">Nonaktif</Badge>}
                  {p.isTrial && (
                    <Badge className="whitespace-nowrap">Trial {p.trialDurationDays ?? 7}h</Badge>
                  )}
                </div>
              </div>
              <p className="mb-1 text-2xl font-medium text-foreground">
                {currency.format(p.priceperYear)}
                <span className="text-sm font-normal text-muted-foreground">/tahun</span>
              </p>
              <p className="mb-3 text-sm text-muted-foreground">
                {p.customerLimit == null ? 'Tanpa batas pelanggan' : `Maks ${p.customerLimit} pelanggan`}
                {' · '}{p.routerLimit} router
              </p>
              <ul className="mb-4 space-y-1">
                {FEATURE_FLAGS.map((f) => {
                  const active = p.features?.[f.key];
                  return (
                    <li key={f.key} className="flex items-center gap-2 text-xs">
                      {active ? (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <X className="size-3.5 shrink-0 text-[#595d6c]" />
                      )}
                      <span className={active ? 'text-foreground/80' : 'text-[#595d6c]'}>{f.label}</span>
                    </li>
                  );
                })}
              </ul>
              <button onClick={() => openEdit(p)} className="text-xs text-primary hover:underline">
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
