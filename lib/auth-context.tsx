'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isSuperAdmin: false,
  loading: true,
});

async function checkDevMode(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'dev_mode'));
    return snap.exists() && snap.data().enabled === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      let superAdmin = false;
      try {
        if (u) {
          const token = await u.getIdTokenResult();
          superAdmin = token.claims.superadmin === true;

          // Jika tidak punya claim superadmin, cek dev mode
          if (!superAdmin) {
            superAdmin = await checkDevMode();
          }
        }
      } catch (err) {
        console.error('[AuthProvider] Gagal ambil token claims:', err);
      } finally {
        setIsSuperAdmin(superAdmin);
        setUser(u);
        setLoading(false);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isSuperAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
