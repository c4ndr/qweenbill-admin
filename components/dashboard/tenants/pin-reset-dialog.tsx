'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Check } from 'lucide-react';
import type { Tenant } from './types';

interface Props {
  target: { tenant: Tenant; tier: 1 | 2 } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string;
  done: boolean;
  onConfirm: () => Promise<void>;
}

export function PinResetDialog({ target, open, onOpenChange, saving, error, done, onConfirm }: Props) {
  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Reset PIN Admin{target.tier} &quot;{target.tenant.nama}&quot;?
          </DialogTitle>
        </DialogHeader>

        {!done ? (
          <>
            <p className="text-sm text-muted-foreground">
              PIN {target.tier === 1 ? 'Admin 1' : 'Admin 2'} tenant ini akan dihapus dari server.
              {target.tier === 1
                ? ' Tenant akan diminta setup PIN baru dari awal saat app dibuka lagi.'
                : ' Admin 1 tenant ini perlu set ulang PIN Admin 2 dari menu Pengaturan.'}
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
                {saving ? 'Mereset...' : 'Reset PIN'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="size-4" />
              PIN Admin{target.tier} berhasil direset.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
