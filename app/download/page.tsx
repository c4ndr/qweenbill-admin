import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Download, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
    arm64: 'https://storage.googleapis.com/queen-bill.firebasestorage.app/download/app-arm64-v8a-release.apk',
    arm32: 'https://storage.googleapis.com/queen-bill.firebasestorage.app/download/app-armeabi-v7a-release.apk',
  },
  {
    title: 'QweenBill Teknisi',
    desc: 'App untuk teknisi lapangan: instalasi baru, tiket gangguan, dan update status kerja secara real-time.',
    arm64: 'https://storage.googleapis.com/queen-bill.firebasestorage.app/download/app-arm64-v8a-release.apk',
    arm32: 'https://storage.googleapis.com/queen-bill.firebasestorage.app/download/app-armeabi-v7a-release.apk',
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={32} height={32} className="rounded-lg" />
            <span className="font-bold">QweenBill</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
              Kembali
            </Button>
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            <Smartphone className="size-3" />
            Android
          </Badge>
          <h1 className="text-3xl font-bold">Download Aplikasi</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Pilih arsitektur yang sesuai dengan HP Anda. Kebanyakan HP keluaran 2018 ke atas memakai{' '}
            <span className="text-foreground font-medium">arm64</span>. Jika ragu, coba arm64 dulu.
          </p>
        </div>

        <div className="space-y-4">
          {APPS.map((app) => (
            <Card key={app.title}>
              <CardHeader>
                <CardTitle>{app.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">{app.desc}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={app.arm64}
                    download
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-primary/80"
                  >
                    <Download className="size-4" />
                    Download (arm64)
                  </a>
                  <a
                    href={app.arm32}
                    download
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Download className="size-4" />
                    Download (arm32)
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Cara Install</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground text-sm space-y-1.5 list-decimal list-inside">
              <li>Download file APK sesuai arsitektur HP Anda.</li>
              <li>Buka file APK yang sudah terunduh dari notifikasi atau folder Download.</li>
              <li>Jika muncul peringatan &quot;sumber tidak dikenal&quot;, izinkan install dari sumber ini.</li>
              <li>Ikuti instruksi instalasi hingga selesai.</li>
            </ol>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
