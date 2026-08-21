'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  ArrowRight,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function translateError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'Email ini sudah terdaftar. Coba login.';
  if (msg.includes('weak-password')) return 'Password minimal 6 karakter.';
  if (msg.includes('invalid-email')) return 'Format email tidak valid.';
  if (msg.includes('resource-exhausted')) return 'Terlalu banyak percobaan. Coba lagi sebentar.';
  if (msg.includes('deadline-exceeded')) return 'Kode OTP kedaluwarsa, minta kode baru.';
  if (msg.includes('permission-denied')) return 'Kode OTP salah.';
  return msg;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get('plan') || null;
  const [form, setForm] = useState({
    namaUsaha: '',
    namaPemilik: '',
    email: '',
    whatsapp: '',
    alamat: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [daftarType, setDaftarType] = useState<'trial' | 'berbayar'>('berbayar');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'whatsapp' && otpVerified) {
      setOtpVerified(false);
      setOtpSent(false);
    }
  }

  async function handleSendOtp() {
    setOtpError('');
    if (!form.whatsapp.trim()) {
      setOtpError('Isi nomor WhatsApp dulu');
      return;
    }
    setOtpSending(true);
    try {
      const sendOtp = httpsCallable(functions, 'sendRegistrationOtp');
      await sendOtp({ whatsapp: form.whatsapp });
      setOtpSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim kode OTP';
      setOtpError(translateError(msg));
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpError('');
    if (!otpCode.trim()) {
      setOtpError('Isi kode OTP dulu');
      return;
    }
    setOtpVerifying(true);
    try {
      const verifyOtp = httpsCallable(functions, 'verifyRegistrationOtp');
      await verifyOtp({ whatsapp: form.whatsapp, code: otpCode.trim() });
      setOtpVerified(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kode OTP salah';
      setOtpError(translateError(msg));
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (daftarType === 'trial' && !otpVerified) {
      setError('Verifikasi nomor WhatsApp dulu untuk daftar trial.');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.namaPemilik });

      await setDoc(doc(db, 'tenant_applications', cred.user.uid), {
        namaUsaha: form.namaUsaha,
        namaPemilik: form.namaPemilik,
        email: form.email,
        whatsapp: form.whatsapp,
        alamat: form.alamat,
        status: 'pending',
        requestedPlan,
        createdAt: serverTimestamp(),
      });

      if (daftarType === 'trial') {
        const autoProvisionTrial = httpsCallable(functions, 'autoProvisionTrial');
        await autoProvisionTrial({
          uid: cred.user.uid,
          namaUsaha: form.namaUsaha,
          namaPemilik: form.namaPemilik,
          email: form.email,
          whatsapp: form.whatsapp,
          alamat: form.alamat,
        });
        router.push('/onboarding');
      } else {
        router.push('/tenant-login?registered=1');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftar';
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-4"
      style={{ backgroundImage: 'radial-gradient(900px 420px at 50% -10%, rgba(145,132,217,.12), transparent)' }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/12">
            <Shield className="h-[22px] w-[22px] text-primary" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">QweenBill</h1>
          <p className="text-sm text-muted-foreground">Daftar Jadi Mitra Operator RT/RW Net</p>
          {requestedPlan && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Paket dipilih: {requestedPlan}
            </Badge>
          )}
        </div>

        <Card className="border-border/50 bg-card shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium">Buat Akun Baru</CardTitle>
            <CardDescription>Isi data diri Anda untuk mendaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setDaftarType('trial')}
                  className={cn(
                    'text-sm font-medium rounded-md py-2 transition-colors',
                    daftarType === 'trial'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Trial Gratis 7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setDaftarType('berbayar')}
                  className={cn(
                    'text-sm font-medium rounded-md py-2 transition-colors',
                    daftarType === 'berbayar'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Paket Berbayar
                </button>
              </div>
              {daftarType === 'trial' ? (
                <p className="text-xs text-muted-foreground -mt-1">
                  Langsung aktif setelah verifikasi nomor WhatsApp, tanpa perlu menunggu admin.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground -mt-1">
                  Pendaftaran akan ditinjau admin, biasanya dalam 1x24 jam.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="namaUsaha" className="text-sm font-medium">
                  Nama Usaha / ISP
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="namaUsaha"
                    type="text"
                    value={form.namaUsaha}
                    onChange={(e) => update('namaUsaha', e.target.value)}
                    className="pl-9"
                    placeholder="Nama RT/RW Net Anda"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="namaPemilik" className="text-sm font-medium">
                  Nama Pemilik
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="namaPemilik"
                    type="text"
                    value={form.namaPemilik}
                    onChange={(e) => update('namaPemilik', e.target.value)}
                    className="pl-9"
                    placeholder="Nama lengkap Anda"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="pl-9"
                    placeholder="email@anda.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  Nomor WhatsApp
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="whatsapp"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => update('whatsapp', e.target.value)}
                      className="pl-9"
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </div>
                  {daftarType === 'trial' && !otpVerified && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="default"
                      onClick={handleSendOtp}
                      disabled={otpSending || !form.whatsapp.trim()}
                      className="shrink-0"
                    >
                      {otpSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : otpSent ? (
                        'Kirim Ulang'
                      ) : (
                        'Kirim OTP'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {daftarType === 'trial' && otpSent && !otpVerified && (
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium">
                    Kode OTP (dikirim ke WhatsApp Anda)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="tracking-widest font-mono"
                      placeholder="123456"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || !otpCode.trim()}
                      className="shrink-0"
                    >
                      {otpVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verifikasi'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {daftarType === 'trial' && otpVerified && (
                <div className="rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <p className="text-sm text-green-500">Nomor WhatsApp terverifikasi.</p>
                </div>
              )}

              {otpError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{otpError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="alamat" className="text-sm font-medium">
                  Alamat
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="alamat"
                    type="text"
                    value={form.alamat}
                    onChange={(e) => update('alamat', e.target.value)}
                    className="pl-9"
                    placeholder="Alamat usaha"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="pl-9 pr-9"
                    placeholder="Minimal 6 karakter"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Konfirmasi Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    className="pl-9 pr-9"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (daftarType === 'trial' && !otpVerified)}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  <>
                    Daftar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Dengan mendaftar, Anda menyetujui{' '}
                <a
                  href="https://qweenbill-privacy.pages.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  Kebijakan Privasi
                </a>{' '}
                kami.
              </p>
            </form>
          </CardContent>
        </Card>

        <Separator className="bg-border/50" />

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link
            href="/tenant-login"
            className="font-medium text-primary hover:text-primary/80 underline underline-offset-4"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
