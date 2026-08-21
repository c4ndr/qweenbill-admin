'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, Check } from 'lucide-react';
import type { Tenant } from './types';

interface Props {
  target: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string;
  result: { email: string; password: string } | null;
  onConfirm: () => Promise<void>;
}

export function NetTopoResetDialog({
  target,
  open,
  onOpenChange,
  saving,
  error,
  result,
  onConfirm,
}: Props) {
  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            Reset Password NetTopo Admin &quot;{target.nama}&quot;?
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <>
            <p className="text-sm text-muted-foreground">
              Password login NetTopo akun admin tenant ini akan diganti dengan password baru random.
              Password lama tidak bisa dipakai lagi.
            </p>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button disabled={saving} onClick={onConfirm}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? 'Mereset...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
              <Check className="size-4 mt-0.5 shrink-0" />
              Password berhasil direset. Tampilkan HANYA sekali ini — bagikan ke tenant lewat
              WA/Telegram:
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <p>
                Email: <span className="font-mono text-foreground">{result.email}</span>
              </p>
              <p>
                Password:{' '}
                <span className="font-mono text-foreground">{result.password}</span>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Selesai</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
