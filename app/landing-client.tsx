'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Zap,
  Shield,
  MapPin,
  CreditCard,
  Users,
  Activity,
  ArrowRight,
  Download,
  CalendarClock,
  MessageCircle,
  Ban,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const CORE_FEATURES = [
  { icon: CreditCard, title: 'Tagihan Otomatis', desc: 'Tagihan bulanan dibuat otomatis tiap periode, lengkap dengan pengingat WhatsApp.' },
  { icon: Zap, title: 'Isolir Otomatis via MikroTik', desc: 'Pelanggan menunggak langsung diisolir dan dipulihkan otomatis lewat integrasi MikroTik.' },
  { icon: Users, title: 'App Teknisi & Pelanggan', desc: 'Teknisi kelola instalasi & gangguan dari HP, pelanggan pantau tagihan dan bayar sendiri.' },
  { icon: MapPin, title: 'Peta Topologi FTTH', desc: 'Visualisasi jalur kabel dan ODP/ODC di peta, memudahkan tracing gangguan di lapangan.' },
  { icon: Activity, title: 'Laporan Pembayaran', desc: 'Semua transaksi tercatat rapi, siap jadi laporan keuangan RT/RW Net Anda.' },
  { icon: Shield, title: 'Multi-Admin & Log Aktivitas', desc: 'Bagi tugas ke beberapa admin/koordinator, semua aksi penting tercatat di log.' },
];

const STATS = [
  { value: '340+', label: 'operator RT/RW Net' },
  { value: '96 rb', label: 'pelanggan ditagih tiap bulan' },
  { value: '1,2 dtk', label: 'rata-rata pemulihan setelah bayar' },
  { value: '7 hari', label: 'trial, aktif tanpa review' },
];

const ISOLIR_STEPS = [
  { no: '01', icon: CalendarClock, title: 'Jatuh Tempo', desc: 'Sistem mendeteksi tagihan yang sudah melewati tanggal jatuh tempo.' },
  { no: '02', icon: MessageCircle, title: 'Pengingat WA', desc: 'Pengingat otomatis dikirim H-7, H-3, dan H-0 lewat WhatsApp.' },
  { no: '03', icon: Ban, title: 'Isolir', desc: 'Pelanggan yang belum bayar diisolir otomatis lewat MikroTik.' },
  { no: '04', icon: Wallet, title: 'Bayar', desc: 'Pelanggan bayar sendiri lewat app, atau dikonfirmasi admin.' },
  { no: '05', icon: CheckCircle2, title: 'Pulih', desc: 'Akses pulih otomatis rata-rata 1,2 detik setelah lunas.' },
];

export default function LandingClient() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && isSuperAdmin) router.replace('/dashboard');
  }, [user, isSuperAdmin, loading, router]);

  if (loading || (user && isSuperAdmin)) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-[rgba(22,24,38,.85)] backdrop-blur-md">
        <div className="mx-auto flex h-[49px] max-w-[1120px] items-center justify-between px-[22.4px]">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-[26px] items-center justify-center rounded-[7px] border border-primary shadow-[0_0_20px_rgba(145,132,217,.3)]">
              <ShieldCheck className="size-3.5 text-primary" />
            </span>
            <span className="text-[17px] font-medium">QweenBill</span>
          </Link>
          <nav className="flex items-center gap-5">
            <a href="#fitur" className="hidden text-[13.5px] text-[#b2b6ca] hover:text-foreground sm:inline">Fitur</a>
            <Link href="/pricing" className="hidden text-[13.5px] text-[#b2b6ca] hover:text-foreground sm:inline">Harga</Link>
            <Link href="/download" className="hidden text-[13.5px] text-[#b2b6ca] hover:text-foreground sm:inline">Download</Link>
            <Link href="/tenant-login" className="text-[13.5px] text-[#b2b6ca] hover:text-foreground">Masuk</Link>
            <Link href="/register" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>Daftar</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-[22.4px] pb-[45px] pt-[67px] text-center">
        <Badge variant="outline" className="mb-4 border-primary text-primary">Platform Billing RT/RW Net</Badge>
        <h1 className="mx-auto max-w-[800px] text-4xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          Kelola RT/RW Net Anda,{' '}
          <span className="text-primary">tanpa ribet.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[17px] text-[#b2b6ca]">
          QweenBill adalah platform billing & manajemen pelanggan untuk operator RT/RW Net — tagihan otomatis, isolir MikroTik, app teknisi &amp; pelanggan, dalam satu sistem.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className={cn(buttonVariants({ variant: 'default' }), 'px-[18px] py-[10px]')}>
            Coba Gratis 7 Hari <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/download" className={cn(buttonVariants({ variant: 'secondary' }), 'px-[18px] py-[10px]')}>
            <Download className="mr-2 h-4 w-4" /> Download Aplikasi
          </Link>
        </div>
      </section>

      <section className="w-full bg-gradient-to-b from-[#262a60] to-[#1f2350]">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-6 px-[22.4px] py-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="text-[32px] font-medium text-foreground">{s.value}</div>
              <div className="mt-1 text-[12.5px] text-[#c9c6e8]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-[1120px] px-[22.4px] py-16 scroll-mt-[49px]">
        <h2 className="text-center text-[30px] font-medium">Semua yang Anda Butuhkan</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[14.5px] text-[#9397ab]">
          Satu sistem untuk seluruh operasional RT/RW Net Anda, dari tagihan sampai gangguan lapangan.
        </p>
        <div className="mt-10 grid gap-[11.2px] sm:grid-cols-2 lg:grid-cols-3">
          {CORE_FEATURES.map((f) => (
            <Card key={f.title} className="rounded-lg p-[16.8px]">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-0 pb-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/12">
                  <f.icon className="h-[17px] w-[17px] text-primary" />
                </div>
                <CardTitle className="text-[17px] font-medium">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-[13px] text-foreground/80">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-[22.4px] py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary">Alur isolir otomatis</p>
            <h2 className="mt-1 text-[22px] font-medium">Tagihan jalan sendiri. Isolir jalan sendiri.</h2>
          </div>
          <Link href="/register" className={cn(buttonVariants({ variant: 'ghost' }))}>Coba alurnya</Link>
        </div>
        <div className="grid gap-[11.2px] sm:grid-cols-3 lg:grid-cols-5">
          {ISOLIR_STEPS.map((s) => (
            <div key={s.no} className="border-t-2 border-primary/35 pt-3">
              <p className="font-mono text-[11px] text-primary">{s.no}</p>
              <p className="mt-2 text-sm font-medium">{s.title}</p>
              <p className="mt-1 text-[12.5px] text-[#9397ab]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-[22.4px] py-16 text-center">
        <h2 className="mb-3 text-[28px] font-medium">Siap mulai?</h2>
        <p className="mb-6 text-[#9397ab]">Coba gratis 7 hari, aktif langsung tanpa menunggu review admin.</p>
        <Link href="/register" className={cn(buttonVariants({ variant: 'default' }), 'px-[18px] py-[10px]')}>
          Daftar Sekarang <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-3 px-[22.4px] text-[13px] text-[#75798c] sm:flex-row">
          <span className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={16} height={16} className="rounded" />
            &copy; {new Date().getFullYear()} QweenBill. Semua hak dilindungi.
          </span>
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
