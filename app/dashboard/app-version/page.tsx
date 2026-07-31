'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AppConfig {
  minBuildNumber: string;
  updateUrl: string;
  pesan: string;
}

const APPS: { id: string; label: string }[] = [
  { id: 'qween_teknisi', label: 'QweenBill Teknisi' },
  { id: 'qween_bill', label: 'QweenBill Admin (RT/RW)' },
  { id: 'qween_customer', label: 'QweenBill Customer' },
];

const emptyConfig: AppConfig = { minBuildNumber: '', updateUrl: 'https://saas.qbill.uk/download', pesan: '' };

export default function AppVersionPage() {
  const [configs, setConfigs] = useState<Record<string, AppConfig>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        APPS.map(async (app) => {
          const snap = await getDoc(doc(db, 'app_config', app.id));
          if (!snap.exists()) return [app.id, emptyConfig] as const;
          const d = snap.data();
          return [app.id, {
            minBuildNumber: d.minBuildNumber != null ? String(d.minBuildNumber) : '',
            updateUrl: d.updateUrl || emptyConfig.updateUrl,
            pesan: d.pesan || '',
          }] as const;
        })
      );
      setConfigs(Object.fromEntries(entries));
      setLoading(false);
    })();
  }, []);

  function update(appId: string, field: keyof AppConfig, value: string) {
    setConfigs((c) => ({ ...c, [appId]: { ...(c[appId] ?? emptyConfig), [field]: value } }));
  }

  async function handleSave(appId: string) {
    const cfg = configs[appId] ?? emptyConfig;
    setSavingId(appId);
    setSavedId(null);
    try {
      await setDoc(doc(db, 'app_config', appId), {
        minBuildNumber: cfg.minBuildNumber.trim() === '' ? 0 : Number(cfg.minBuildNumber),
        updateUrl: cfg.updateUrl.trim() || emptyConfig.updateUrl,
        pesan: cfg.pesan.trim(),
      });
      setSavedId(appId);
      setTimeout(() => setSavedId(null), 2000);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Memuat...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Versi Aplikasi</h1>
      <p className="text-gray-500 text-sm mb-6">
        Paksa pengguna dengan app usang untuk update sebelum bisa lanjut pakai app. Cek dijalankan
        di splash screen, sebelum login — kosongkan "Build Minimal" untuk menonaktifkan paksaan.
      </p>

      <div className="space-y-4">
        {APPS.map((app) => {
          const cfg = configs[app.id] ?? emptyConfig;
          return (
            <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">{app.label}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Build Minimal (versionCode, kosongkan = nonaktif)
                  </label>
                  <input
                    type="number"
                    value={cfg.minBuildNumber}
                    onChange={(e) => update(app.id, 'minBuildNumber', e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: 2004"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Link Download</label>
                  <input
                    type="text"
                    value={cfg.updateUrl}
                    onChange={(e) => update(app.id, 'updateUrl', e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-400 mb-1 block">Pesan (opsional)</label>
                <input
                  type="text"
                  value={cfg.pesan}
                  onChange={(e) => update(app.id, 'pesan', e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Versi aplikasi ini sudah usang. Silakan update ke versi terbaru untuk melanjutkan."
                />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => handleSave(app.id)}
                  disabled={savingId === app.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                >
                  {savingId === app.id ? 'Menyimpan...' : 'Simpan'}
                </button>
                {savedId === app.id && <span className="text-green-400 text-sm">Tersimpan</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
