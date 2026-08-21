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
import { Loader2, Users, Check } from 'lucide-react';
import type { Tenant, TeknisiRow } from './types';

interface Props {
  target: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeknisiDialog({ target, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [list, setList] = useState<TeknisiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSavingId, setResetSavingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{
    teknisiNama: string;
    email: string;
    password: string;
  } | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && target) {
      setList([]);
      setError('');
      setResetResult(null);
      setLoading(true);
      (async () => {
        try {
          const listFn = httpsCallable(functions, 'listTeknisiForSuperadmin');
          const res = await listFn({ tenantId: target.id });
          const data = res.data as { teknisi: TeknisiRow[] };
          setList(data.teknisi);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Gagal memuat daftar teknisi');
        } finally {
          setLoading(false);
        }
      })();
    }
    onOpenChange(nextOpen);
  }

  async function resetPassword(teknisi: TeknisiRow) {
    if (!target) return;
    setResetSavingId(teknisi.id);
    setError('');
    try {
      const resetFn = httpsCallable(functions, 'resetNetTopoTeknisiPassword');
      const res = await resetFn({ tenantId: target.id, teknisiId: teknisi.id });
      const data = res.data as { email: string; password: string };
      setResetResult({ teknisiNama: teknisi.nama, email: data.email, password: data.password });
      if (user) {
        logActivity(user, 'tenant.nettopo_teknisi_reset', target.id, target.nama, {
          teknisiNama: teknisi.nama,
          email: data.email,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mereset password NetTopo teknisi');
    } finally {
      setResetSavingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Kelola Teknisi &quot;{target?.nama}&quot;
          </DialogTitle>
        </DialogHeader>

        {resetResult && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
            <p className="text-green-600 dark:text-green-400 font-medium mb-2 flex items-center gap-1.5">
              <Check className="size-3.5" />
              Password NetTopo &quot;{resetResult.teknisiNama}&quot; berhasil direset — tampilkan
              HANYA sekali ini:
            </p>
            <div className="space-y-1">
              <p>
                Email: <span className="font-mono text-foreground">{resetResult.email}</span>
              </p>
              <p>
                Password:{' '}
                <span className="font-mono text-foreground">{resetResult.password}</span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Memuat data...
          </p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tenant ini belum punya teknisi.</p>
        ) : (
          <div className="space-y-2">
            {list.map((tk) => (
              <div
                key={tk.id}
                className="bg-muted rounded-lg p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {tk.nama}{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({tk.role}
                      {tk.aktif ? '' : ', nonaktif'})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{tk.noHp}</p>
                  {tk.nettopoAccess ? (
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                      NetTopo: {tk.nettopoEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Belum ada akses NetTopo</p>
                  )}
                </div>
                {tk.nettopoAccess && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={resetSavingId === tk.id}
                    onClick={() => resetPassword(tk)}
                    className="shrink-0"
                  >
                    {resetSavingId === tk.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                    {resetSavingId === tk.id ? 'Mereset...' : 'Reset Password'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
