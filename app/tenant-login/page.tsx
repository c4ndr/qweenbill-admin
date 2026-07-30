'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

interface Application {
  namaUsaha: string;
  namaPemilik: string;
  status: 'pending' | 'approved' | 'rejected';
  tenantId?: string;
  activationCode?: string;
  rejectionReason?: string;
}

const STATUS_LABEL: Record<Application['status'], string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

const STATUS_COLOR: Record<Application['status'], string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  approved: 'bg-green-900 text-green-300',
  rejected: 'bg-red-900 text-red-300',
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    );
  }

  // ── Belum login: tampilkan form login ──────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">QweenBill</h1>
            <p className="text-gray-400 text-sm mt-1">Login Mitra Operator</p>
          </div>

          {justRegistered && (
            <p className="text-green-400 text-sm bg-green-950 rounded-lg px-3 py-2 mb-4">
              Pendaftaran berhasil dikirim. Silakan login untuk memantau status persetujuan.
            </p>
          )}

          <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@anda.com"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-4">
            Belum punya akun?{' '}
            <a href="/register" className="text-blue-400 hover:text-blue-300">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Sudah login: tampilkan status pendaftaran ──────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">QweenBill</h1>
          <p className="text-gray-400 text-sm mt-1">Status Pendaftaran</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          {appLoading && <p className="text-gray-400 text-sm">Memuat status...</p>}

          {!appLoading && appNotFound && (
            <p className="text-gray-400 text-sm">
              Tidak ada data pendaftaran untuk akun ini. Kalau ini akun baru, silakan{' '}
              <a href="/register" className="text-blue-400 hover:text-blue-300">daftar</a> dulu.
            </p>
          )}

          {!appLoading && application && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">{application.namaUsaha}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[application.status]}`}>
                  {STATUS_LABEL[application.status]}
                </span>
              </div>

              {application.status === 'pending' && (
                <p className="text-gray-400 text-sm">
                  Pendaftaran Anda sedang ditinjau. Kami akan menghubungi Anda lewat WhatsApp begitu disetujui.
                </p>
              )}

              {application.status === 'approved' && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">
                    Selamat! Pendaftaran disetujui. Gunakan kode aktivasi berikut saat membuka aplikasi QweenBill pertama kali:
                  </p>
                  <p className="text-center text-lg font-mono font-bold text-white bg-gray-800 rounded-lg py-3 tracking-widest">
                    {application.activationCode}
                  </p>
                </div>
              )}

              {application.status === 'rejected' && (
                <p className="text-gray-400 text-sm">
                  Maaf, pendaftaran Anda belum bisa diproses.
                  {application.rejectionReason ? ` Alasan: ${application.rejectionReason}` : ''}
                </p>
              )}
            </>
          )}

          <button
            onClick={handleLogout}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
