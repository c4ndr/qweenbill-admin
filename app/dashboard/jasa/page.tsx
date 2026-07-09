'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, setDoc, getDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Tenant {
  id: string;
  nama: string;
  status: string;
}

interface JasaConfig {
  aktif: boolean;
  url: string;
  label: string;
}

export default function JasaPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [jasaMap, setJasaMap] = useState<Record<string, JasaConfig>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ url: '', label: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Tenant))
          .filter((t) => t.status === 'active');
        setTenants(list);

        const configs: Record<string, JasaConfig> = {};
        await Promise.all(
          list.map(async (t) => {
            const ref = doc(db, 'tenants', t.id, 'superadmin_config', 'jasa');
            const snap = await getDoc(ref);
            if (snap.exists()) {
              configs[t.id] = snap.data() as JasaConfig;
            }
          })
        );
        setJasaMap(configs);
      } catch (err) {
        console.error('[JasaPage] Gagal memuat data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(tenantId: string) {
    if (!editForm.url.trim()) return;
    setSaving(true);
    const ref = doc(db, 'tenants', tenantId, 'superadmin_config', 'jasa');
    const config: JasaConfig = {
      aktif: true,
      url: editForm.url.trim(),
      label: editForm.label.trim() || 'Pesan via ZasaQu',
    };
    await setDoc(ref, config);
    setJasaMap((prev) => ({ ...prev, [tenantId]: config }));
    setEditing(null);
    setSaving(false);
  }

  async function handleToggle(tenantId: string, aktif: boolean) {
    const ref = doc(db, 'tenants', tenantId, 'superadmin_config', 'jasa');
    const current = jasaMap[tenantId];
    await setDoc(ref, { ...current, aktif });
    setJasaMap((prev) => ({ ...prev, [tenantId]: { ...current, aktif } }));
  }

  async function handleRemove(tenantId: string) {
    const ref = doc(db, 'tenants', tenantId, 'superadmin_config', 'jasa');
    await deleteDoc(ref);
    setJasaMap((prev) => {
      const next = { ...prev };
      delete next[tenantId];
      return next;
    });
  }

  function startEdit(tenantId: string) {
    const existing = jasaMap[tenantId];
    setEditForm({
      url: existing?.url ?? '',
      label: existing?.label ?? 'Pesan via ZasaQu',
    });
    setEditing(tenantId);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Jasa ZasaQu</h1>
        <p className="text-gray-400 text-sm mt-1">
          Pilih RT/RW yang ada di coverage area ZasaQu dan aktifkan link untuk pelanggannya.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : tenants.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada tenant aktif.</p>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => {
            const jasa = jasaMap[t.id];
            const isEditing = editing === t.id;

            return (
              <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{t.nama}</p>
                    {jasa && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{jasa.url}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {jasa ? (
                      <>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${jasa.aktif ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                          {jasa.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <button
                          onClick={() => handleToggle(t.id, !jasa.aktif)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {jasa.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => startEdit(t.id)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(t.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(t.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        + Tambah ZasaQu
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">URL ZasaQu</label>
                      <input
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://zasaqu.uk/area/sukamaju"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Label Tombol</label>
                      <input
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Pesan via ZasaQu"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(t.id)}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
