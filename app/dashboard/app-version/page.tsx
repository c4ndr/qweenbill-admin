'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, CheckCircle, Smartphone } from 'lucide-react';

interface AppConfig {
  minBuildNumber: string;
  updateUrl: string;
  pesan: string;
}

const APPS: { id: string; label: string; defaultUpdateUrl: string }[] = [
  { id: 'qween_teknisi', label: 'QweenBill Teknisi', defaultUpdateUrl: 'https://saas.qbill.uk/download' },
  { id: 'qween_bill', label: 'QweenBill Admin (RT/RW)', defaultUpdateUrl: 'https://saas.qbill.uk/download' },
  {
    id: 'qween_customer',
    label: 'QweenBill Customer',
    defaultUpdateUrl: 'https://play.google.com/store/apps/details?id=com.qweenbill.customer',
  },
];

const emptyConfig: AppConfig = { minBuildNumber: '', updateUrl: '', pesan: '' };

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
          if (!snap.exists()) return [app.id, { ...emptyConfig, updateUrl: app.defaultUpdateUrl }] as const;
          const d = snap.data();
          return [app.id, {
            minBuildNumber: d.minBuildNumber != null ? String(d.minBuildNumber) : '',
            updateUrl: d.updateUrl || app.defaultUpdateUrl,
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
    const defaultUrl = APPS.find((a) => a.id === appId)?.defaultUpdateUrl ?? '';
    setSavingId(appId);
    setSavedId(null);
    try {
      await setDoc(doc(db, 'app_config', appId), {
        minBuildNumber: cfg.minBuildNumber.trim() === '' ? 0 : Number(cfg.minBuildNumber),
        updateUrl: cfg.updateUrl.trim() || defaultUrl,
        pesan: cfg.pesan.trim(),
      });
      setSavedId(appId);
      setTimeout(() => setSavedId(null), 2000);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Versi Aplikasi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paksa pengguna dengan app usang untuk update sebelum bisa lanjut pakai app. Cek dijalankan
          di splash screen, sebelum login — kosongkan &quot;Build Minimal&quot; untuk menonaktifkan paksaan.
        </p>
      </div>

      <div className="space-y-4">
        {APPS.map((app) => {
          const cfg = configs[app.id] ?? emptyConfig;
          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">{app.label}</CardTitle>
                </div>
                <CardDescription>{app.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Build Minimal (versionCode, kosongkan = nonaktif)
                    </Label>
                    <Input
                      type="number"
                      value={cfg.minBuildNumber}
                      onChange={(e) => update(app.id, 'minBuildNumber', e.target.value)}
                      placeholder="Contoh: 2004"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Link Download</Label>
                    <Input
                      type="text"
                      value={cfg.updateUrl}
                      onChange={(e) => update(app.id, 'updateUrl', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pesan (opsional)</Label>
                  <Input
                    type="text"
                    value={cfg.pesan}
                    onChange={(e) => update(app.id, 'pesan', e.target.value)}
                    placeholder="Versi aplikasi ini sudah usang. Silakan update ke versi terbaru untuk melanjutkan."
                  />
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleSave(app.id)}
                    disabled={savingId === app.id}
                  >
                    {savingId === app.id ? (
                      'Menyimpan...'
                    ) : (
                      <>
                        <Save className="size-4" />
                        Simpan
                      </>
                    )}
                  </Button>
                  {savedId === app.id && (
                    <span className="flex items-center gap-1.5 text-sm text-green-500">
                      <CheckCircle className="size-4" />
                      Tersimpan
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
