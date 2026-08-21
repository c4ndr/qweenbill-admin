'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { currency, type Plan, type Tenant } from './types';

interface Props {
  target: Tenant | null;
  newGradeId: string;
  plans: Plan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string;
  onConfirm: () => Promise<void>;
  onGradeName: (gradeId: string) => string;
}

export function GradeChangeDialog({
  target,
  newGradeId,
  plans,
  open,
  onOpenChange,
  saving,
  error,
  onConfirm,
  onGradeName,
}: Props) {
  if (!target) return null;

  const newPlan = plans.find((p) => p.id === newGradeId);
  if (!newPlan) return null;

  const isDowngrade =
    (newPlan.customerLimit ?? Infinity) < (target.customerLimit ?? Infinity);
  const overQuota =
    newPlan.customerLimit != null && target.pelangganCount > newPlan.customerLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDowngrade ? 'Downgrade' : 'Upgrade'} Grade &quot;{target.nama}&quot;?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {onGradeName(target.gradeId)} → <span className="text-foreground">{newPlan.nama}</span>
        </p>

        <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
          <p>
            Kuota pelanggan:{' '}
            {target.customerLimit == null ? 'Tanpa batas' : target.customerLimit}
            {' → '}
            {newPlan.customerLimit == null ? 'Tanpa batas' : newPlan.customerLimit}
          </p>
          <p>Harga/tahun: {currency.format(newPlan.priceperYear)}</p>
        </div>

        {overQuota && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
            Pelanggan aktif tenant ini ({target.pelangganCount}) sudah melebihi kuota grade baru (
            {newPlan.customerLimit}). Tenant tetap bisa jalan, tapi tidak bisa tambah pelanggan baru
            sampai di bawah kuota lagi.
          </p>
        )}

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
            {saving ? 'Menyimpan...' : 'Konfirmasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
