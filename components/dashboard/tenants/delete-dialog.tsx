'use client';

import { useState } from 'react';
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
import { Loader2, Trash2 } from 'lucide-react';
import type { Tenant } from './types';

interface Props {
  target: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  error: string;
  onConfirm: () => Promise<void>;
}

export function DeleteDialog({ target, open, onOpenChange, deleting, error, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setConfirmText('');
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md border-destructive/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" />
            Hapus Tenant &quot;{target?.nama}&quot;?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ini akan menghapus PERMANEN seluruh data tenant ini: pelanggan (
            {target?.pelangganCount ?? 0}), tagihan, teknisi, paket, pengaduan, inventaris, voucher,
            dan semua pengaturan lainnya.
          </p>
          <p className="text-sm text-destructive font-medium">
            Tindakan ini TIDAK BISA dibatalkan.
          </p>
          <div className="space-y-1.5">
            <Label>
              Ketik <span className="font-mono text-foreground">{target?.nama}</span> untuk
              konfirmasi:
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={deleting || confirmText !== target?.nama}
            onClick={onConfirm}
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            {deleting ? 'Menghapus...' : 'Hapus Permanen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
