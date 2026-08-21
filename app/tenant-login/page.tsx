'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Loader2, CheckCircle, XCircle, Clock, Copy, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Application {
  namaUsaha: string;
  namaPemilik: string;
  status: 'pending' | 'approved' | 'rejected';
  tenantId?: string;
  activationCode?: string;
  rejectionReason?: string;
}

const STATUS_CONFIG: Record<
  Application['status'],
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  pending: {
    label: 'Menunggu Persetujuan',
    icon: <Clock className="size-4" />,
    badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
  approved: {
    label: 'Disetujui',
    icon: <CheckCircle className="size-4" />,
    badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Ditolak',
    icon: <XCircle className="size-4" />,
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

function translateError(msg: string): string {
  if (msg.includes('invalid-credential') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
    return 'Email atau password salah.';
  }
  return msg;
}

export default function TenantLoginPage() {
  return (
    <Suspense fallback={null}>
      <TenantLoginInner />
    </Suspense>
  );
}

function TenantLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [application, setApplication] = useState<Application | null>(null);
  const [appLoading, setAppLoading] = useState(false);
  const [appNotFound, setAppNotFound] = useState(false);

  useEffect(() => {
    if (!user) {
      setApplication(null);
      setAppNotFound(false);
      return;
    }
    setAppLoading(true);
    getDoc(doc(db, 'tenant_applications', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          setApplication(snap.data() as Application);
        } else {
          setAppNotFound(true);
        }
      })
      .finally(() => setAppLoading(false));
  }, [user]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal';
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.push('/tenant-login');
  }

  function handleCopyCode() {
    if (application?.activationCode) {
      navigator.clipboard.writeText(application.activationCode);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background p-4"
        style={{ backgroundImage: 'radial-gradient(900px 420px at 50% -10%, rgba(145,132,217,.12), transparent)' }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/12">
              <ShieldCheck className="h-[22px] w-[22px] text-primary" />
            </div>
            <h1 className="text-2xl font-medium">QweenBill</h1>
            <p className="text-muted-foreground text-sm mt-1">Login mitra operator</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {justRegistered && (
                <div className="flex items-start gap-2 text-sm bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg px-3 py-2.5 mb-4">
                  <CheckCircle className="size-4 mt-0.5 shrink-0" />
                  Pendaftaran berhasil dikirim. Silakan login untuk memantau status persetujuan.
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      placeholder="email@anda.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-2.5">
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? 'Masuk...' : 'Masuk'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-muted-foreground text-sm mt-4">
            Belum punya akun?{' '}
            <a href="/register" className="text-primary hover:underline">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = application ? STATUS_CONFIG[application.status] : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-4"
      style={{ backgroundImage: 'radial-gradient(900px 420px at 50% -10%, rgba(145,132,217,.12), transparent)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/12">
            <ShieldCheck className="h-[22px] w-[22px] text-primary" />
          </div>
          <h1 className="text-2xl font-medium">QweenBill</h1>
          <p className="text-muted-foreground text-sm mt-1">Status Pendaftaran</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {appLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Memuat status...
              </div>
            )}

            {!appLoading && appNotFound && (
              <p className="text-muted-foreground text-sm">
                Tidak ada data pendaftaran untuk akun ini. Kalau ini akun baru, silakan{' '}
                <a href="/register" className="text-primary hover:underline">daftar</a> dulu.
              </p>
            )}

            {!appLoading && application && statusConfig && (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{application.namaUsaha}</p>
                  <Badge variant="outline" className={statusConfig.badgeClass}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </Badge>
                </div>

                {application.status === 'pending' && (
                  <p className="text-muted-foreground text-sm">
                    Pendaftaran Anda sedang ditinjau. Kami akan menghubungi Anda lewat WhatsApp begitu disetujui.
                  </p>
                )}

                {application.status === 'approved' && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Selamat! Pendaftaran disetujui. Gunakan kode aktivasi berikut saat membuka aplikasi QweenBill pertama kali:
                    </p>
                    <div className="relative group">
                      <div className="text-center text-lg font-mono font-bold bg-muted rounded-lg py-3 tracking-widest">
                        {application.activationCode}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleCopyCode}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {application.status === 'rejected' && (
                  <p className="text-muted-foreground text-sm">
                    Maaf, pendaftaran Anda belum bisa diproses.
                    {application.rejectionReason ? ` Alasan: ${application.rejectionReason}` : ''}
                  </p>
                )}
              </>
            )}

            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
