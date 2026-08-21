'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy, Check, Zap, Users, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Application {
  namaUsaha: string;
  activationCode?: string;
}

const STEPS = [
  {
    key: 'kode',
    icon: Copy,
    title: 'Salin kode aktivasi',
    desc: 'Kode di atas dipakai untuk aktivasi pertama di app QweenBill.',
    estimate: '1 mnt',
  },
  {
    key: 'router',
    icon: Zap,
    title: 'Hubungkan router MikroTik',
    desc: 'API RouterOS port 8728, siapkan profil isolir untuk pelanggan menunggak.',
    estimate: '8 mnt',
  },
  {
    key: 'pelanggan',
    icon: Users,
    title: 'Impor pelanggan pertama',
    desc: 'Lewat file CSV atau input manual satu per satu dari app.',
    estimate: '6 mnt',
  },
  {
    key: 'tagihan',
    icon: Clock,
    title: 'Atur siklus tagihan & pengingat WA',
    desc: 'Jadwal pengingat otomatis H-7, H-3, dan H-0 sebelum jatuh tempo.',
    estimate: '4 mnt',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [onbDone, setOnbDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/tenant-login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setAppLoading(true);
    getDoc(doc(db, 'tenant_applications', user.uid))
      .then((snap) => {
        if (snap.exists()) setApplication(snap.data() as Application);
      })
      .finally(() => setAppLoading(false));
  }, [user]);

  function toggleStep(key: string) {
    setOnbDone((d) => ({ ...d, [key]: !d[key] }));
  }

  function handleCopy() {
    if (!application?.activationCode) return;
    navigator.clipboard.writeText(application.activationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const doneCount = STEPS.filter((s) => onbDone[s.key]).length;
  const progressPct = (doneCount / STEPS.length) * 100;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[640px] px-4 py-16">
        <Badge className="mb-4">Trial aktif · 7 hari</Badge>
        <h1 className="text-3xl font-medium tracking-tight">
          Aktifkan {application?.namaUsaha || 'RT/RW Net Anda'}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Empat langkah, sekitar 20 menit, untuk mulai menagih pelanggan lewat QweenBill.
        </p>

        <div className="mt-8 space-y-2 rounded-lg bg-[#292b31] p-[11.2px]">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-primary">Kode aktivasi</p>
          <div className="relative">
            {appLoading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat kode...
              </div>
            ) : (
              <>
                <div className="text-center font-mono text-xl tracking-[0.28em]">
                  {application?.activationCode ?? '——————'}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!application?.activationCode}
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'absolute right-0 top-1/2 -translate-y-1/2')}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Progress value={progressPct} />
          <p className="mt-2 text-[12.5px] text-muted-foreground">{doneCount} dari {STEPS.length} langkah</p>
        </div>

        <div className="mt-4 space-y-3">
          {STEPS.map((s) => {
            const done = onbDone[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleStep(s.key)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border bg-card px-[14px] py-[11.2px] text-left transition-colors',
                  done ? 'border-primary/35' : 'border-border'
                )}
              >
                <span
                  className={cn(
                    'flex size-[26px] shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-primary text-[#1a1830]' : 'bg-foreground/6 text-foreground'
                  )}
                >
                  {done ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
                </span>
                <span className="flex-1">
                  <span className="block text-[14.5px] font-medium">{s.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-[#9397ab]">{s.desc}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[#9397ab]">{s.estimate}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/download" className={cn(buttonVariants({ variant: 'default' }))}>
            Buka Dasbor
          </Link>
          <Link href="/download" className={cn(buttonVariants({ variant: 'secondary' }))}>
            Unduh Aplikasi
          </Link>
        </div>
      </div>
    </div>
  );
}
