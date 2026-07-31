import Link from 'next/link';
import Image from 'next/image';

interface AppInfo {
  title: string;
  desc: string;
  arm64: string;
  arm32: string;
}

const APPS: AppInfo[] = [
  {
    title: 'QweenBill Admin',
    desc: 'Kelola pelanggan, tagihan, router MikroTik, dan operasional harian RT/RW Net Anda dari HP.',
    arm64: '/apk/qween-bill-admin-arm64.apk',
    arm32: '/apk/qween-bill-admin-arm32.apk',
  },
  {
    title: 'QweenBill Teknisi',
    desc: 'App untuk teknisi lapangan: instalasi baru, tiket gangguan, dan update status kerja secara real-time.',
    arm64: '/apk/qween-teknisi-arm64.apk',
    arm32: '/apk/qween-teknisi-arm32.apk',
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={32} height={32} className="rounded-lg" />
            <span className="text-white font-bold">QweenBill</span>
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">
            Kembali
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white text-center">Download Aplikasi</h1>
        <p className="text-gray-400 text-center mt-3">
          Pilih arsitektur yang sesuai dengan HP Anda. Kebanyakan HP keluaran 2018 ke atas memakai{' '}
          <span className="text-gray-300">arm64</span>. Jika ragu, coba arm64 dulu.
        </p>

        <div className="mt-10 space-y-5">
          {APPS.map((app) => (
            <div key={app.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg">{app.title}</h2>
              <p className="text-gray-400 text-sm mt-1.5">{app.desc}</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <a
                  href={app.arm64}
                  download
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg px-4 py-2.5 text-sm"
                >
                  Download (arm64)
                </a>
                <a
                  href={app.arm32}
                  download
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-center font-medium rounded-lg px-4 py-2.5 text-sm"
                >
                  Download (arm32)
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mt-8">
          <h3 className="text-white font-medium mb-1.5">Cara Install</h3>
          <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
            <li>Download file APK sesuai arsitektur HP Anda.</li>
            <li>Buka file APK yang sudah terunduh dari notifikasi atau folder Download.</li>
            <li>Jika muncul peringatan "sumber tidak dikenal", izinkan install dari sumber ini.</li>
            <li>Ikuti instruksi instalasi hingga selesai.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
