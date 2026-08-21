'use client';

import { useState } from 'react';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/payments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2 } from 'lucide-react';
import { DURATION_OPTIONS, suggestedAmount, type Tenant } from './types';

interface Props {
  target: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string;
  onConfirm: (days: number, amount: string, method: PaymentMethod, note: string) => Promise<void>;
}

export function RenewDialog({ target, open, onOpenChange, saving, error, onConfirm }: Props) {
  const [days, setDays] = useState(365);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && target) {
      const d = 365;
      setDays(d);
      setAmount(String(suggestedAmount(target, d)));
      setMethod('transfer');
      setNote('');
    }
    onOpenChange(nextOpen);
  }

  function handleDaysChange(val: string | null) {
    if (!val) return;
    const d = Number(val);
    setDays(d);
    if (target) setAmount(String(suggestedAmount(target, d)));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perpanjang &quot;{target?.nama}&quot;</DialogTitle>
          <DialogDescription>
            Perpanjang masa aktif dan catat pembayaran.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Durasi</Label>
            <Select value={String(days)} onValueChange={handleDaysChange}>
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
          </div>
          <div className="space-y-1.5">
            <Label>Jumlah Dibayar (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Metode Pembayaran</Label>
              <Select value={method} onValueChange={(val) => { if (val) setMethod(val as PaymentMethod); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="No. referensi transfer, dll"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={saving} onClick={() => onConfirm(days, amount, method, note)}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? 'Menyimpan...' : 'Konfirmasi & Catat Pembayaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
