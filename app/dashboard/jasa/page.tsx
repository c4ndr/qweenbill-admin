'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, setDoc, getDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Plus, Pencil, Trash2, Power } from 'lucide-react';

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
        <h1 className="text-2xl font-bold tracking-tight">Jasa ZasaQu</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pilih RT/RW yang ada di coverage area ZasaQu dan aktifkan link untuk pelanggannya.
        </p>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-sm text-center">Belum ada tenant aktif.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => {
            const jasa = jasaMap[t.id];
            const isEditing = editing === t.id;

            return (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{t.nama}</p>
                      {jasa && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <ExternalLink className="size-3 text-muted-foreground" />
                          <p className="text-muted-foreground text-xs truncate max-w-xs">{jasa.url}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {jasa ? (
                        <>
                          <Badge variant={jasa.aktif ? 'default' : 'secondary'}>
                            {jasa.aktif ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(t.id, !jasa.aktif)}
                          >
                            <Power className="size-3" />
                            {jasa.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(t.id)}
                          >
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(t.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                            Hapus
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startEdit(t.id)}
                        >
                          <Plus className="size-3" />
                          Tambah ZasaQu
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">URL ZasaQu</Label>
                          <Input
                            value={editForm.url}
                            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                            placeholder="https://zasaqu.uk/area/sukamaju"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Label Tombol</Label>
                          <Input
                            value={editForm.label}
                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                            placeholder="Pesan via ZasaQu"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSave(t.id)}
                            disabled={saving}
                          >
                            {saving ? 'Menyimpan...' : 'Simpan'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditing(null)}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
