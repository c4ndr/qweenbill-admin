'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FEATURE_LABEL, currency, fetchActivePlans, type Plan } from '@/lib/plans';

const FEATURE_KEYS = Object.keys(FEATURE_LABEL);

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePlans()
      .then(setPlans)
      .catch((err) => console.error('[PricingPage] Gagal memuat plans:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-[49px] max-w-[1120px] items-center justify-between px-[22.4px]">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={26} height={26} className="rounded-lg" />
            <span className="text-[17px] font-medium">QweenBill</span>
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-[22.4px] py-16">
        <h1 className="text-center text-[38px] font-medium">Pilih paket Anda</h1>
        <p className="mx-auto mt-2 max-w-md text-center text-[14.5px] text-[#9397ab]">
          Semua paket bisa dicoba gratis 7 hari sebelum berlangganan tahunan.
        </p>

        {loading && <p className="mt-10 text-center text-sm text-[#9397ab]">Memuat paket...</p>}
        {!loading && plans.length === 0 && (
          <p className="mt-10 text-center text-sm text-[#9397ab]">Belum ada paket tersedia saat ini.</p>
        )}

        <div className="mt-10 grid gap-[11.2px] sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isPopular = p.id === 'pro';
            return (
              <div
                key={p.id}
                className={cn(
                  'flex flex-col gap-4 rounded-lg bg-card p-[16.8px] shadow-[0_0_0_1px_#3f424d]',
                  isPopular && 'shadow-[0_0_0_1px_#9184d9]'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[19px] font-medium">{p.nama}</span>
                    {isPopular && <Badge>Populer</Badge>}
                  </div>
                  <span className="font-mono text-[11px] text-[#75798c]">{p.id}</span>
                </div>

                <div>
                  <span className="text-[30px] font-medium">{currency.format(p.priceperYear)}</span>
                  <span className="text-[12.5px] text-[#9397ab]"> /tahun</span>
                </div>

                <ul className="flex-1 space-y-2 text-[13px]">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {p.customerLimit == null ? 'Pelanggan tanpa batas' : `Hingga ${p.customerLimit} pelanggan`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {p.routerLimit} Router MikroTik
                  </li>
                  {FEATURE_KEYS.map((key) => {
                    const active = p.features?.[key];
                    return (
                      <li key={key} className={cn('flex items-center gap-2', !active && 'text-[#595d6c]')}>
                        {active ? (
                          <Check className="size-4 shrink-0 text-primary" />
                        ) : (
                          <X className="size-4 shrink-0 text-[#595d6c]" />
                        )}
                        {FEATURE_LABEL[key]}
                      </li>
                    );
                  })}
                </ul>

                <Link href={`/register?plan=${p.id}`} className={cn(buttonVariants({ variant: 'default' }), 'w-full justify-center')}>
                  Pilih {p.nama}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] text-[#9397ab]">
          Semua paket termasuk app pelanggan, app teknisi, pengingat WhatsApp, dan log aktivitas.
          Trial 7 hari = 1 router, 20 pelanggan.
        </p>
      </section>
    </div>
  );
}
