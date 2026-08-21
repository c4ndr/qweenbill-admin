'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Zap, Shield, MapPin, CreditCard, Users, Activity, ArrowRight, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  nama: string;
  customerLimit: number | null;
  priceperYear: number;
  routerLimit: number;
  features: Record<string, boolean>;
  active: boolean;
  isTrial?: boolean;
}

const FEATURE_LABEL: Record<string, string> = {
  router2: '2 Router MikroTik',
  bubbleChat: 'Bubble Chat Teknisi ↔ Pelanggan',
  hotspotFilterLanjutan: 'Filter Hotspot Lanjutan',
  petaTopologi: 'Peta Topologi Geografis',
  multiAdmin: 'Multi-Admin/Koordinator',
};

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const CORE_FEATURES = [
  { icon: CreditCard, title: 'Tagihan Otomatis', desc: 'Tagihan bulanan dibuat otomatis tiap periode, lengkap dengan pengingat WhatsApp.' },
  { icon: Zap, title: 'Isolir Otomatis via MikroTik', desc: 'Pelanggan menunggak langsung diisolir dan dipulihkan otomatis lewat integrasi MikroTik.' },
  { icon: Users, title: 'App Teknisi & Pelanggan', desc: 'Teknisi kelola instalasi & gangguan dari HP, pelanggan pantau tagihan dan bayar sendiri.' },
  { icon: MapPin, title: 'Peta Topologi FTTH', desc: 'Visualisasi jalur kabel dan ODP/ODC di peta, memudahkan tracing gangguan di lapangan.' },
  { icon: Activity, title: 'Laporan Pembayaran', desc: 'Semua transaksi tercatat rapi, siap jadi laporan keuangan RT/RW Net Anda.' },
  { icon: Shield, title: 'Multi-Admin & Log Aktivitas', desc: 'Bagi tugas ke beberapa admin/koordinator, semua aksi penting tercatat di log.' },
];

export default function LandingClient() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    if (!loading && user && isSuperAdmin) router.replace('/dashboard');
  }, [user, isSuperAdmin, loading, router]);

  useEffect(() => {
    getDocs(collection(db, 'plans'))
      .then((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
        setPlans(all.filter((p) => p.active && !p.isTrial).sort((a, b) => a.priceperYear - b.priceperYear));
      })
      .catch((err) => console.error('[LandingPage] Gagal memuat plans:', err))
      .finally(() => setPlansLoading(false));
  }, []);

  if (loading || (user && isSuperAdmin)) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold">QweenBill</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/download" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">Download</Link>
            <Link href="/tenant-login" className="text-sm text-muted-foreground hover:text-foreground">Masuk</Link>
            <Link href="/register" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>Daftar</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center">
        <Badge variant="secondary" className="mb-4">Platform Billing RT/RW Net</Badge>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          Kelola RT/RW Net Anda,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">Tanpa Ribet.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          QweenBill adalah platform billing & manajemen pelanggan untuk operator RT/RW Net — tagihan otomatis, isolir MikroTik, app teknisi &amp; pelanggan, dalam satu sistem.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}>
            Coba Gratis 7 Hari <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/download" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            <Download className="mr-2 h-4 w-4" /> Download Aplikasi
          </Link>
        </div>
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold">Semua yang Anda Butuhkan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_FEATURES.map((f) => (
            <Card key={f.title} className="bg-card/50">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div className="rounded-md bg-primary/10 p-2"><f.icon className="h-5 w-5 text-primary" /></div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold">Pilih Paket Anda</h2>
        <p className="mb-10 text-center text-muted-foreground">Harga per tahun, bisa ganti paket kapan saja.</p>
        {plansLoading && <p className="text-center text-sm text-muted-foreground">Memuat paket...</p>}
        {!plansLoading && plans.length === 0 && <p className="text-center text-sm text-muted-foreground">Belum ada paket tersedia saat ini.</p>}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const activeFeatures = Object.entries(p.features ?? {}).filter(([, v]) => v);
            return (
              <Card key={p.id} className="relative flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{p.nama}</CardTitle>
                    {p.priceperYear < 500000 && <Badge>Populer</Badge>}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{currency.format(p.priceperYear)}</span>
                    <span className="text-sm text-muted-foreground"> /tahun</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {p.customerLimit == null ? 'Pelanggan tanpa batas' : `Hingga ${p.customerLimit} pelanggan`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />{p.routerLimit} Router MikroTik
                    </li>
                    {activeFeatures.map(([key]) => (
                      <li key={key} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />{FEATURE_LABEL[key] ?? key}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${p.id}`} className={cn(buttonVariants({ variant: 'default' }), 'mt-6 w-full justify-center')}>
                    Pilih {p.nama}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold">Siap Mulai?</h2>
        <p className="mb-6 text-muted-foreground">Coba gratis 7 hari, aktif langsung tanpa menunggu review admin.</p>
        <Link href="/register" className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}>
          Daftar Sekarang <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} QweenBill. Semua hak dilindungi.</span>
          <div className="flex gap-4">
            <Link href="/download" className="hover:text-foreground">Download</Link>
            <Link href="/tenant-login" className="hover:text-foreground">Masuk</Link>
            <Link href="/register" className="hover:text-foreground">Daftar</Link>
            <a href="https://qweenbill-privacy.pages.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
