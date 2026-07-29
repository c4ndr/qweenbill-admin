'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { isDevModeEnabled, setDevMode } from '@/lib/dev-mode';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevModeState] = useState(false);
  const [devModeLoading, setDevModeLoading] = useState(true);

  useEffect(() => {
    isDevModeEnabled().then((enabled) => {
      setDevModeState(enabled);
      setDevModeLoading(false);
    });
  }, []);

  async function toggleDevMode() {
    const next = !devMode;
    setDevModeLoading(true);
    try {
      await setDevMode(next);
      setDevModeState(next);
    } catch {
      setError('Gagal mengubah dev mode. Pastikan sudah login atau hubungi Firebase Console.');
    } finally {
      setDevModeLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Set superadmin claim jika belum ada
      const claimSuperAdmin = httpsCallable(functions, 'claimSuperAdmin');
      await claimSuperAdmin({}).catch(() => {
        // Abaikan error jika sudah punya claim atau bukan superadmin
      });

      // Refresh token agar claim terbaru terbaca
      await auth.currentUser?.getIdToken(true);
      const tokenResult = await auth.currentUser?.getIdTokenResult();

      // Jika dev mode aktif, izinkan akses meski tanpa claim superadmin
      if (tokenResult?.claims.superadmin !== true) {
        const devModeActive = await isDevModeEnabled();
        if (!devModeActive) {
          await auth.signOut();
          setError('Akses ditolak. Anda bukan superadmin. Aktifkan "Dev Mode" di bawah jika ini lingkungan development.');
          return;
        }
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal';
      setError(msg.includes('invalid-credential') ? 'Email atau password salah' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">QweenBill</h1>
          <p className="text-gray-400 text-sm mt-1">Superadmin Panel</p>
        </div>

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

        {process.env.NODE_ENV !== 'production' && !devModeLoading && (
          <div className="mt-4 bg-gray-900 rounded-2xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-white text-sm font-medium">Dev Mode</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {devMode
                    ? 'Firestore rules bypass aktif — semua user login bisa baca/tulis'
                    : 'Nonaktif — custom claims diperlukan'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleDevMode}
                disabled={devModeLoading}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  devMode ? 'bg-green-500' : 'bg-gray-700'
                } ${devModeLoading ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    devMode ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
