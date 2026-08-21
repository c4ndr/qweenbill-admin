'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/audit-log';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { DURATION_OPTIONS, type Plan } from './types';

interface Props {
  plans: Plan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  onShowActivation: (data: {
    nama: string;
    code: string;
    nettopoEmail?: string;
    nettopoPassword?: string;
  }) => void;
}

export function AddTenantForm({ plans, open, onOpenChange, onCreated, onShowActivation }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nama: '',
    alamat: '',
    email: '',
    gradeId: '',
    durationDays: 365,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError('');
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
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
      const data = res.data as {
        tenantId: string;
        activationCode: string;
        nettopoEmail?: string;
        nettopoPassword?: string;
      };
      if (user) {
        logActivity(user, 'tenant.create', data.tenantId, form.nama, {
          gradeId: form.gradeId,
          durationDays: form.durationDays,
        });
      }
      onShowActivation({
        nama: form.nama,
        code: data.activationCode,
        nettopoEmail: data.nettopoEmail ?? undefined,
        nettopoPassword: data.nettopoPassword ?? undefined,
      });
      setForm({ nama: '', alamat: '', email: '', gradeId: plans[0]?.id ?? '', durationDays: 365 });
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat tenant');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Tambah RT/RW Baru
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama RT/RW</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="RT 01 RW 05 Sukamaju"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Admin</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@rtwilayah.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alamat">Alamat</Label>
              <Input
                id="alamat"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Jl. Contoh No. 1, Bandung"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select
                value={form.gradeId || undefined}
                onValueChange={(val) => {
                  if (val) setForm({ ...form, gradeId: val });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih grade" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Durasi Awal (setelah aktivasi)</Label>
              <Select
                value={String(form.durationDays)}
                onValueChange={(val) => {
                  if (val) setForm({ ...form, durationDays: Number(val) });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.days} value={String(d.days)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pilih durasi pendek (Hari/Minggu) untuk tenant demo.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
