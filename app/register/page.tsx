'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebase';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Trial: auto-approve tanpa review admin, tapi digerbangi verifikasi OTP
  // WhatsApp (lihat autoProvisionTrial di Cloud Functions). Paket berbayar
  // tetap masuk antrian manual seperti sebelumnya.
  const [daftarType, setDaftarType] = useState<'trial' | 'berbayar'>('berbayar');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Nomor WA berubah setelah verifikasi — OTP lama tidak lagi berlaku untuk nomor baru.
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
        // Auto-approve trial — server-side (Cloud Function) yang menulis
        // status jadi 'approved' + kode aktivasi, lihat autoProvisionTrial.
        const autoProvisionTrial = httpsCallable(functions, 'autoProvisionTrial');
        await autoProvisionTrial({
          uid: cred.user.uid,
          namaUsaha: form.namaUsaha,
          namaPemilik: form.namaPemilik,
          email: form.email,
          whatsapp: form.whatsapp,
          alamat: form.alamat,
        });
        router.push('/tenant-login?registered=1&auto=1');
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">QweenBill</h1>
          <p className="text-gray-400 text-sm mt-1">Daftar Jadi Mitra Operator RT/RW Net</p>
          {requestedPlan && (
            <p className="text-blue-400 text-xs mt-2 bg-blue-950 inline-block rounded-full px-3 py-1">
              Paket dipilih: {requestedPlan}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-gray-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setDaftarType('trial')}
              className={`text-sm font-medium rounded-md py-2 transition-colors ${
                daftarType === 'trial' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              Trial Gratis 7 Hari
            </button>
            <button
              type="button"
              onClick={() => setDaftarType('berbayar')}
              className={`text-sm font-medium rounded-md py-2 transition-colors ${
                daftarType === 'berbayar' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              Paket Berbayar
            </button>
          </div>
          {daftarType === 'trial' ? (
            <p className="text-xs text-gray-500 -mt-2">
              Langsung aktif setelah verifikasi nomor WhatsApp, tanpa perlu menunggu admin.
            </p>
          ) : (
            <p className="text-xs text-gray-500 -mt-2">
              Pendaftaran akan ditinjau admin, biasanya dalam 1x24 jam.
            </p>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nama Usaha / ISP</label>
            <input
              type="text"
              value={form.namaUsaha}
              onChange={(e) => update('namaUsaha', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama RT/RW Net Anda"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nama Pemilik</label>
            <input
              type="text"
              value={form.namaPemilik}
              onChange={(e) => update('namaPemilik', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama lengkap Anda"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@anda.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nomor WhatsApp</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="08xxxxxxxxxx"
                required
              />
              {daftarType === 'trial' && !otpVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || !form.whatsapp.trim()}
                  className="shrink-0 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3"
                >
                  {otpSending ? 'Mengirim...' : otpSent ? 'Kirim Ulang' : 'Kirim OTP'}
                </button>
              )}
            </div>
          </div>

          {daftarType === 'trial' && otpSent && !otpVerified && (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Kode OTP (dikirim ke WhatsApp Anda)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || !otpCode.trim()}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3"
                >
                  {otpVerifying ? 'Memeriksa...' : 'Verifikasi'}
                </button>
              </div>
            </div>
          )}

          {daftarType === 'trial' && otpVerified && (
            <p className="text-green-400 text-xs bg-green-950 rounded-lg px-3 py-2">
              Nomor WhatsApp terverifikasi.
            </p>
          )}

          {otpError && (
            <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">{otpError}</p>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Alamat</label>
            <input
              type="text"
              value={form.alamat}
              onChange={(e) => update('alamat', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alamat usaha"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Konfirmasi Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (daftarType === 'trial' && !otpVerified)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-4">
          Sudah punya akun?{' '}
          <Link href="/tenant-login" className="text-blue-400 hover:text-blue-300">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
