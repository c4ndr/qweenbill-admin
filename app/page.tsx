'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

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
  {
    title: 'Tagihan Otomatis',
    desc: 'Tagihan bulanan dibuat otomatis tiap periode, lengkap dengan pengingat WhatsApp ke pelanggan.',
  },
  {
    title: 'Isolir Otomatis via MikroTik',
    desc: 'Pelanggan menunggak langsung diisolir dan dipulihkan otomatis lewat integrasi MikroTik, tanpa kerja manual.',
  },
  {
    title: 'App Teknisi & Pelanggan',
    desc: 'Teknisi kelola instalasi & gangguan dari HP, pelanggan pantau tagihan dan bayar sendiri lewat app.',
  },
  {
    title: 'Peta Topologi FTTH',
    desc: 'Visualisasi jalur kabel dan ODP/ODC di peta, memudahkan tracing gangguan di lapangan.',
  },
  {
    title: 'Riwayat & Laporan Pembayaran',
    desc: 'Semua transaksi tercatat rapi, siap jadi laporan keuangan RT/RW Net Anda.',
  },
  {
    title: 'Multi-Admin & Log Aktivitas',
    desc: 'Bagi tugas ke beberapa admin/koordinator, semua aksi penting tercatat di log aktivitas.',
  },
];

export default function LandingPage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    if (!loading && user && isSuperAdmin) {
      router.replace('/dashboard');
    }
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

  if (loading || (user && isSuperAdmin)) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={32} height={32} className="rounded-lg" />
            <span className="text-white font-bold">QweenBill</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/download" className="text-gray-400 hover:text-white text-sm hidden sm:inline">
              Download
            </Link>
            <Link href="/tenant-login" className="text-gray-400 hover:text-white text-sm">
              Masuk
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              Daftar
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
          Kelola RT/RW Net Anda,
          <br />
          <span className="text-blue-500">Tanpa Ribet.</span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg mt-5 max-w-2xl mx-auto">
          QweenBill adalah platform billing & manajemen pelanggan untuk operator RT/RW Net —
          tagihan otomatis, isolir MikroTik, app teknisi &amp; pelanggan, dalam satu sistem.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3"
          >
            Coba Gratis 7 Hari
          </Link>
          <Link
            href="/download"
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg px-6 py-3"
          >
            Download Aplikasi
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Semua yang Anda Butuhkan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CORE_FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-medium mb-1.5">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Pilih Paket Anda</h2>
        <p className="text-gray-400 text-center mb-10">Harga per tahun, bisa ganti paket kapan saja.</p>

        {plansLoading && <p className="text-gray-500 text-sm text-center">Memuat paket...</p>}

        {!plansLoading && plans.length === 0 && (
          <p className="text-gray-500 text-sm text-center">Belum ada paket tersedia saat ini.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => {
            const activeFeatures = Object.entries(p.features ?? {}).filter(([, v]) => v);
            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
                <h3 className="text-white font-bold text-lg">{p.nama}</h3>
                <p className="text-3xl font-bold text-white mt-3">
                  {currency.format(p.priceperYear)}
                  <span className="text-sm text-gray-500 font-normal"> /tahun</span>
                </p>
                <ul className="text-gray-400 text-sm mt-5 space-y-2 flex-1">
                  <li>
                    {p.customerLimit == null ? 'Pelanggan tanpa batas' : `Hingga ${p.customerLimit} pelanggan`}
                  </li>
                  <li>{p.routerLimit} Router MikroTik</li>
                  {activeFeatures.map(([key]) => (
                    <li key={key}>{FEATURE_LABEL[key] ?? key}</li>
                  ))}
                </ul>
                <Link
                  href={`/register?plan=${p.id}`}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg px-4 py-2.5 text-sm"
                >
                  Pilih {p.nama}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Siap Mulai?</h2>
        <p className="text-gray-400 mb-6">Coba gratis 7 hari, aktif langsung tanpa menunggu review admin.</p>
        <Link
          href="/register"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3 inline-block"
        >
          Daftar Sekarang
        </Link>
      </section>

      <footer className="border-t border-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-500 text-sm">
          <span>© {new Date().getFullYear()} QweenBill. Semua hak dilindungi.</span>
          <div className="flex gap-4">
            <Link href="/download" className="hover:text-white">Download</Link>
            <Link href="/tenant-login" className="hover:text-white">Masuk</Link>
            <Link href="/register" className="hover:text-white">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
