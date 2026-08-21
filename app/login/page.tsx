'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { isDevModeEnabled, setDevMode } from '@/lib/dev-mode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, ArrowRight, Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      const claimSuperAdmin = httpsCallable(functions, 'claimSuperAdmin');
      await claimSuperAdmin({}).catch(() => {});

      await auth.currentUser?.getIdToken(true);
      const tokenResult = await auth.currentUser?.getIdTokenResult();

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">QweenBill</h1>
          <p className="text-sm text-muted-foreground">Superadmin Panel</p>
        </div>

        <Card className="border-border/50 bg-card shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Masuk</CardTitle>
            <CardDescription>Masukkan kredensial Anda untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    placeholder="••••••••"
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

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {process.env.NODE_ENV !== 'production' && !devModeLoading && (
          <>
            <Separator className="bg-border/50" />
            <Card className="border-border/50 bg-card shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Dev Mode</p>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          devMode
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {devMode ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {devMode
                        ? 'Firestore rules bypass aktif — semua user login bisa baca/tulis'
                        : 'Nonaktif — custom claims diperlukan'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDevMode}
                    disabled={devModeLoading}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      devMode ? 'bg-primary' : 'bg-input',
                      devModeLoading && 'opacity-50'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                        devMode ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
